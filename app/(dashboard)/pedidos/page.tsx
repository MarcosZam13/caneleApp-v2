// pedidos/page.tsx — Listado paginado de pedidos con filtros server-side
import { getPedidos } from '@/actions/pedidos.actions'
import { getClientes } from '@/actions/clientes.actions'
import { getRutasParaProduccion } from '@/actions/produccion.actions'
import { PageHeader } from '@/components/shared/PageHeader'
import { PedidosTable } from '@/components/pedidos/PedidosTable'
import { NuevoPedidoSheet } from '@/components/pedidos/NuevoPedidoSheet'

export const metadata = { title: 'Pedidos — Canele' }

const PAGE_SIZE = 25

export default async function PedidosPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string
    search?: string
    estado?: string
    ruta?: string
    fechaDesde?: string
    fechaHasta?: string
  }>
}) {
  const { page: pageParam, search = '', estado = '', ruta = '', fechaDesde = '', fechaHasta = '' } = await searchParams
  const page = Math.max(1, parseInt(pageParam ?? '1') || 1)

  const [{ pedidos, total }, clientes, rutas] = await Promise.all([
    getPedidos(page, PAGE_SIZE, search, estado, ruta, fechaDesde, fechaHasta),
    getClientes(),
    getRutasParaProduccion(),
  ])

  const clientesOpt = clientes.map(c => ({ id_cliente: c.id_cliente, nombre: c.nombre }))

  // Descripción dinámica que refleja el filtro activo
  function buildDescription(): string {
    const parts: string[] = []
    if (search) parts.push(`"${search}"`)
    if (estado === 'pendiente') parts.push('sin entregar')
    else if (estado === 'moroso') parts.push('morosos')
    else if (estado === 'completado') parts.push('completados')
    if (ruta) {
      const rutaNombre = rutas.find(r => r.id_ruta === ruta)?.nombre
      if (rutaNombre) parts.push(`ruta ${rutaNombre}`)
    }
    if (fechaDesde || fechaHasta) parts.push('con filtro de fechas')
    return `${total} pedido${total !== 1 ? 's' : ''}${parts.length ? ` · ${parts.join(' · ')}` : ' en total'}`
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pedidos"
        description={buildDescription()}
        action={<NuevoPedidoSheet clientes={clientesOpt} rutas={rutas} />}
      />
      <PedidosTable
        pedidos={pedidos as Parameters<typeof PedidosTable>[0]['pedidos']}
        page={page}
        pageSize={PAGE_SIZE}
        total={total}
        search={search}
        estado={estado}
        idRuta={ruta}
        fechaDesde={fechaDesde}
        fechaHasta={fechaHasta}
        rutas={rutas.map(r => ({ id_ruta: r.id_ruta, nombre: r.nombre }))}
      />
    </div>
  )
}
