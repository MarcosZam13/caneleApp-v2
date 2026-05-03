// dashboard/page.tsx — Página principal con métricas clave del negocio
import { createClient } from '@/lib/supabase/server'
import { DashboardStats } from '@/components/dashboard/DashboardStats'
import { RecentRoutes } from '@/components/dashboard/RecentRoutes'
import { SalesChart } from '@/components/dashboard/SalesChart'

export const metadata = { title: 'Dashboard — Canele' }

async function getDashboardData() {
  const supabase = await createClient()
  const today = new Date()
  const todayStr = today.toISOString().split('T')[0]
  const yesterdayStr = new Date(today.getTime() - 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  const [
    { count: totalClientes },
    { count: totalProductos },
    { data: rutasHoy },
    { data: pedidosHoy },
    { data: pedidosAyer },
    { data: morosos },
    { data: ventasPorSemana },
  ] = await Promise.all([
    supabase.from('cliente').select('*', { count: 'exact', head: true }),
    supabase.from('producto').select('*', { count: 'exact', head: true }).eq('disponible', true),
    supabase.from('ruta').select('id_ruta, nombre, total_pedidos, total_venta, estado').eq('fecha', todayStr),
    supabase.from('pedido').select('id_pedido, total, pagado, entregado').eq('fecha', todayStr)
      .returns<{ id_pedido: string; total: number | null; pagado: boolean | null; entregado: boolean | null }[]>(),
    supabase.from('pedido').select('id_pedido, total, pagado, entregado').eq('fecha', yesterdayStr)
      .returns<{ id_pedido: string; total: number | null; pagado: boolean | null; entregado: boolean | null }[]>(),
    supabase.from('pedido').select('id_pedido, total').eq('pagado', false).eq('entregado', true),
    supabase.from('ruta').select('fecha, total_venta')
      .gte('fecha', new Date(today.getTime() - 28 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
      .order('fecha', { ascending: true }),
  ])

  const totalVentaHoy = pedidosHoy?.reduce((acc, p) => acc + (Number(p.total) || 0), 0) ?? 0
  const totalVentaAyer = pedidosAyer?.reduce((acc, p) => acc + (Number(p.total) || 0), 0) ?? 0
  const pedidosNoEntregados = pedidosHoy?.filter(p => !p.entregado).length ?? 0
  const deudaTotal = morosos?.reduce((acc, p) => acc + Number(p.total ?? 0), 0) ?? 0

  return {
    totalClientes: totalClientes ?? 0,
    totalProductos: totalProductos ?? 0,
    rutasHoy: rutasHoy ?? [],
    totalVentaHoy,
    totalVentaAyer,
    pedidosHoy: pedidosHoy?.length ?? 0,
    pedidosAyer: pedidosAyer?.length ?? 0,
    pedidosNoEntregados,
    totalMorosos: morosos?.length ?? 0,
    deudaTotal,
    deudaTotalAnterior: deudaTotal,
    ventasPorSemana: ventasPorSemana ?? [],
  }
}

async function getSalesData(period: string) {
  const supabase = await createClient()
  const days = parseInt(period) || 28
  const today = new Date()
  const since = new Date(today.getTime() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  const { data } = await supabase
    .from('ruta')
    .select('fecha, total_venta')
    .gte('fecha', since)
    .order('fecha', { ascending: true })

  return data ?? []
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>
}) {
  const { period: periodParam } = await searchParams
  const period = periodParam ?? '28'

  const data = await getDashboardData()
  const ventasChart = await getSalesData(period)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Resumen de operaciones de hoy
        </p>
      </div>

      <DashboardStats data={data} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <SalesChart data={ventasChart} currentPeriod={period} />
        </div>
        <div>
          <RecentRoutes routes={data.rutasHoy} />
        </div>
      </div>
    </div>
  )
}
