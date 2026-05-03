// DashboardStats.tsx — Tarjetas de métricas clave del dashboard, clickeables con indicadores de tendencia
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, Package, MapPin, TrendingUp, TrendingDown, ShoppingBag, AlertTriangle, Wallet } from 'lucide-react'

interface DashboardData {
  totalClientes: number
  totalProductos: number
  rutasHoy: { id_ruta: string; nombre: string | null; total_pedidos: number | null; total_venta: number | null; estado: string | null }[]
  totalVentaHoy: number
  pedidosHoy: number
  pedidosNoEntregados: number
  totalMorosos: number
  deudaTotal: number
  ventasPorSemana: { fecha: string | null; total_venta: number | null }[]
  // Datos de comparación con el período anterior
  totalVentaAyer: number
  pedidosAyer: number
  deudaTotalAnterior: number
}

interface DashboardStatsProps {
  data: DashboardData
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('es-CR', {
    style: 'currency',
    currency: 'CRC',
    minimumFractionDigits: 0,
  }).format(value)
}

function formatCompact(value: number): string {
  if (value >= 1000000) return `₡${(value / 1000000).toFixed(1)}M`
  if (value >= 1000) return `₡${(value / 1000).toFixed(0)}k`
  return `₡${value}`
}

function TrendIndicator({ current, previous, inverse }: { current: number; previous: number; inverse?: boolean }) {
  if (previous === 0) return null
  const diff = current - previous
  const pct = Math.round((Math.abs(diff) / previous) * 100)
  const isUp = diff > 0
  const isPositive = inverse ? !isUp : isUp

  if (diff === 0) return <span className="text-xs text-muted-foreground">— 0%</span>

  return (
    <span className={`text-xs font-medium flex items-center gap-0.5 ${isPositive ? 'text-green-600' : 'text-destructive'}`}>
      {isUp ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      {pct}% {isUp ? 'más' : 'menos'}
    </span>
  )
}

const stats = (data: DashboardData) => [
  {
    title: 'Ventas hoy',
    value: formatCurrency(data.totalVentaHoy),
    description: `${data.pedidosHoy} pedido${data.pedidosHoy !== 1 ? 's' : ''}`,
    icon: TrendingUp,
    color: 'text-primary',
    bg: 'bg-primary/10',
    href: '/pedidos',
    trend: <TrendIndicator current={data.totalVentaHoy} previous={data.totalVentaAyer} />,
  },
  {
    title: 'Rutas activas hoy',
    value: data.rutasHoy.length.toString(),
    description: data.rutasHoy.length > 0 ? data.rutasHoy.map(r => r.nombre).join(', ') : 'Sin rutas programadas',
    icon: MapPin,
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    href: '/rutas',
  },
  {
    title: 'Pedidos pendientes',
    value: data.pedidosNoEntregados.toString(),
    description: 'Sin entregar hoy',
    icon: ShoppingBag,
    color: data.pedidosNoEntregados > 0 ? 'text-amber-600' : 'text-green-600',
    bg: data.pedidosNoEntregados > 0 ? 'bg-amber-50' : 'bg-green-50',
    href: '/pedidos?estado=pendiente',
    trend: <TrendIndicator current={data.pedidosHoy} previous={data.pedidosAyer} />,
  },
  {
    title: 'Pedidos por cobrar',
    value: data.totalMorosos.toString(),
    description: 'Entregados sin pagar',
    icon: AlertTriangle,
    color: data.totalMorosos > 0 ? 'text-destructive' : 'text-green-600',
    bg: data.totalMorosos > 0 ? 'bg-destructive/10' : 'bg-green-50',
    href: '/pagos',
  },
  {
    title: 'Deuda total',
    value: formatCompact(data.deudaTotal),
    description: 'En pedidos entregados',
    icon: Wallet,
    color: data.deudaTotal > 0 ? 'text-orange-600' : 'text-green-600',
    bg: data.deudaTotal > 0 ? 'bg-orange-50' : 'bg-green-50',
    href: '/pagos',
    trend: data.deudaTotalAnterior > 0 ? <TrendIndicator current={data.deudaTotal} previous={data.deudaTotalAnterior} inverse /> : null,
  },
  {
    title: 'Total clientes',
    value: data.totalClientes.toString(),
    description: 'Clientes registrados',
    icon: Users,
    color: 'text-purple-600',
    bg: 'bg-purple-50',
    href: '/clientes',
  },
  {
    title: 'Productos activos',
    value: data.totalProductos.toString(),
    description: 'Disponibles para pedido',
    icon: Package,
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
    href: '/productos',
  },
]

export function DashboardStats({ data }: DashboardStatsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {stats(data).map((stat) => (
        <Link key={stat.title} href={stat.href}>
          <Card className="border shadow-sm hover:shadow-md hover:border-primary/20 hover:scale-[1.02] transition-all cursor-pointer group h-full">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">
                {stat.title}
              </CardTitle>
              <div className={`p-2 rounded-lg ${stat.bg}`}>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline justify-between gap-2">
                <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                {stat.trend}
              </div>
              <p className="text-xs text-muted-foreground mt-1 truncate">{stat.description}</p>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  )
}
