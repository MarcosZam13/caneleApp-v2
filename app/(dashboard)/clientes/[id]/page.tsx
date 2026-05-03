// clientes/[id]/page.tsx — Detalle de un cliente con sus direcciones, pedidos y balance
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { ArrowLeft, Phone, Mail, ShoppingBag, AlertCircle, Wallet } from 'lucide-react'
import { getClienteById } from '@/actions/clientes.actions'
import { getProductosConPrecio } from '@/actions/productos.actions'
import { getPedidosMorososCliente, getAbonosPorCliente } from '@/actions/pagos.actions'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { ClienteAcciones } from '@/components/clientes/ClienteAcciones'
import { DireccionesSection } from '@/components/clientes/DireccionesSection'
import { PreciosEspecialesSection } from '@/components/clientes/PreciosEspecialesSection'
import { ClienteAbonoButton } from '@/components/clientes/ClienteAbonoButton'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { cliente } = await getClienteById(id)
  return { title: cliente ? `${cliente.nombre} — Canele` : 'Cliente' }
}

export default async function ClienteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [{ cliente, direcciones, pedidos }, productos, pedidosMorosos, abonos] = await Promise.all([
    getClienteById(id),
    getProductosConPrecio(id),
    getPedidosMorososCliente(id),
    getAbonosPorCliente(id),
  ])

  if (!cliente) notFound()

  // Calcula el balance del cliente a partir de los pedidos cargados
  const deuda = pedidos
    .filter((p) => p.entregado && !p.pagado)
    .reduce((acc, p) => acc + Number(p.total ?? 0), 0)

  const totalComprado = pedidos.reduce((acc, p) => acc + Number(p.total ?? 0), 0)

  const diasAtrasoMax = pedidosMorosos.reduce((max, p) => {
    if (!p.fecha) return max
    const dias = Math.floor((Date.now() - new Date(p.fecha + 'T12:00:00').getTime()) / (1000 * 60 * 60 * 24))
    return Math.max(max, dias)
  }, 0)

  function getDeudaVariant(dias: number) {
    if (dias <= 7) return 'bg-amber-50 border-amber-200 text-amber-800'
    if (dias <= 30) return 'bg-orange-50 border-orange-300 text-orange-800'
    return 'bg-red-50 border-red-300 text-red-800'
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Navegación */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" className="-ml-2" nativeButton={false} render={<Link href="/clientes" />}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          Clientes
        </Button>
      </div>

      {/* Header del cliente */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{cliente.nombre}</h1>
          <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground flex-wrap">
            {cliente.telefono && (
              <span className="flex items-center gap-1">
                <Phone className="h-3.5 w-3.5" />
                {cliente.telefono}
              </span>
            )}
            {cliente.email && (
              <span className="flex items-center gap-1">
                <Mail className="h-3.5 w-3.5" />
                {cliente.email}
              </span>
            )}
          </div>
          {cliente.observaciones && (
            <p className="text-sm text-muted-foreground mt-2 italic">{cliente.observaciones}</p>
          )}
        </div>

        {/* Acciones: editar cliente y alerta de deuda */}
        <div className="flex items-center gap-3 shrink-0">
          {deuda > 0 && (
            <div className={`flex flex-col items-start gap-0.5 border rounded-lg px-4 py-2 text-sm font-medium ${getDeudaVariant(diasAtrasoMax)}`}>
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                Deuda: ₡{deuda.toLocaleString('es-CR')}
              </div>
              {diasAtrasoMax > 30 && (
                <span className="text-xs font-bold px-1.5 py-0.5 rounded bg-red-600 text-white">
                  Recordatorio: {diasAtrasoMax} días
                </span>
              )}
              {diasAtrasoMax > 0 && diasAtrasoMax <= 30 && (
                <span className="text-xs opacity-70">{diasAtrasoMax} días de atraso</span>
              )}
            </div>
          )}
          <ClienteAbonoButton
            idCliente={cliente.id_cliente}
            nombreCliente={cliente.nombre}
            pedidos={pedidosMorosos}
          />
          <ClienteAcciones cliente={cliente} />
        </div>
      </div>

      {/* Estadísticas rápidas */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total pedidos', value: pedidos.length },
          { label: 'Total comprado', value: `₡${totalComprado.toLocaleString('es-CR')}` },
          { label: 'Pedidos pagados', value: pedidos.filter(p => p.pagado).length },
          { label: 'Direcciones', value: direcciones.length },
        ].map((stat) => (
          <Card key={stat.label} className="border">
            <CardContent className="pt-4 pb-3">
              <p className="text-xs text-muted-foreground">{stat.label}</p>
              <p className="text-xl font-bold mt-0.5">{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sección de direcciones con CRUD completo */}
        <DireccionesSection idCliente={cliente.id_cliente} direcciones={direcciones} />

        {/* Historial de pedidos — ocupa las 2 columnas restantes */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <ShoppingBag className="h-4 w-4 text-primary" />
              Últimos pedidos (20)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {pedidos.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin pedidos registrados</p>
            ) : (
              <div className="space-y-1">
                {pedidos.map((pedido) => {
                  const status = !pedido.entregado
                    ? 'pendiente'
                    : pedido.pagado
                    ? 'pagado'
                    : 'moroso'

                  return (
                    <div
                      key={pedido.id_pedido}
                      className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-muted/40 transition-colors"
                    >
                      <div>
                        <p className="text-sm font-medium">
                          {pedido.fecha
                            ? format(new Date(pedido.fecha + 'T12:00:00'), 'dd MMM yyyy', { locale: es })
                            : '—'}
                        </p>
                        {pedido.notas && (
                          <p className="text-xs text-muted-foreground truncate max-w-xs">{pedido.notas}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium">
                          ₡{Number(pedido.total ?? 0).toLocaleString('es-CR')}
                        </span>
                        <StatusBadge status={status} />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Historial de pagos — solo visible si hay abonos registrados */}
      {abonos.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Wallet className="h-4 w-4 text-green-600" />
              Historial de pagos ({abonos.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {abonos.map((abono) => (
                <div
                  key={abono.id_pago}
                  className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-muted/40"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground capitalize">
                      {abono.metodo ?? 'efectivo'}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {abono.fecha
                        ? format(new Date(abono.fecha), 'dd MMM yyyy', { locale: es })
                        : '—'}
                    </span>
                  </div>
                  <span className="text-sm font-semibold text-green-700">
                    +₡{Number(abono.monto).toLocaleString('es-CR')}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Precios especiales — sección colapsable al final */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <PreciosEspecialesSection idCliente={cliente.id_cliente} productos={productos} />
      </div>
    </div>
  )
}
