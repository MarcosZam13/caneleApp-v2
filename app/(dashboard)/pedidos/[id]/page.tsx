// pedidos/[id]/page.tsx — Vista detallada de un pedido: productos, cliente, pagos y acciones
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { ArrowLeft, User, Phone, Mail, MapPin, Route, FileText, CreditCard } from 'lucide-react'
import { getPedidoById } from '@/actions/pedidos.actions'
import { getAbonosPorPedido } from '@/actions/pagos.actions'
import { getClientes } from '@/actions/clientes.actions'
import { getRutasParaProduccion } from '@/actions/produccion.actions'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { PedidoAcciones } from '@/components/pedidos/PedidoAcciones'
import { EditarPedidoSheet } from '@/components/pedidos/EditarPedidoSheet'

// Determina el estado del pedido para el badge
function getEstado(entregado: boolean | null, pagado: boolean | null): string {
  if (!entregado) return 'pendiente'
  if (!pagado) return 'moroso'
  return 'pagado'
}

// Convierte las flags de variante a texto legible
function getVariante(rebanado: boolean | null, cuadrado: boolean | null): string {
  if (cuadrado && rebanado) return 'Cuadrado rebanado'
  if (cuadrado) return 'Cuadrado'
  if (rebanado) return 'Rebanado'
  return 'Entero'
}

// Colores para cada variante de pan
function getVarianteBadgeClass(rebanado: boolean | null, cuadrado: boolean | null): string {
  if (cuadrado && rebanado) return 'bg-purple-50 text-purple-700 border-purple-200'
  if (cuadrado) return 'bg-blue-50 text-blue-700 border-blue-200'
  if (rebanado) return 'bg-amber-50 text-amber-700 border-amber-200'
  return 'bg-stone-50 text-stone-700 border-stone-200'
}

// Nombres legibles para el método de pago
const METODO_LABEL: Record<string, string> = {
  efectivo: 'Efectivo',
  sinpe: 'SINPE',
  transferencia: 'Transferencia',
  otro: 'Otro',
}

export default async function PedidoDetallePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const [pedido, abonos, clientes, rutas] = await Promise.all([
    getPedidoById(id),
    getAbonosPorPedido(id),
    getClientes(),
    getRutasParaProduccion(),
  ])

  if (!pedido) notFound()

  const total = Number(pedido.total ?? 0)
  const totalAbonado = abonos.reduce((acc, a) => acc + Number(a.monto), 0)
  const pendiente = total - totalAbonado
  const porcentajePagado = total > 0 ? Math.min(100, (totalAbonado / total) * 100) : 0

  const fechaFormateada = pedido.fecha
    ? format(parseISO(pedido.fecha + 'T12:00:00'), "EEEE d 'de' MMMM yyyy", { locale: es })
    : 'Sin fecha'

  return (
    <div className="space-y-6">
      {/* Encabezado con navegación y acciones */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <Link
            href="/pedidos"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-1"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Volver a pedidos
          </Link>
          <h1 className="text-2xl font-semibold capitalize">{fechaFormateada}</h1>
          <div className="flex items-center gap-2">
            <StatusBadge status={getEstado(pedido.entregado, pedido.pagado)} />
            {abonos.length > 0 && !pedido.pagado && (
              <Badge variant="outline" className="text-xs text-blue-600 border-blue-200 bg-blue-50">
                {abonos.length} abono{abonos.length !== 1 ? 's' : ''} registrado{abonos.length !== 1 ? 's' : ''}
              </Badge>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <EditarPedidoSheet
            idPedido={pedido.id_pedido}
            clientes={clientes.map(c => ({ id_cliente: c.id_cliente, nombre: c.nombre }))}
            rutas={rutas.map(r => ({ id_ruta: r.id_ruta, nombre: r.nombre, fecha: r.fecha ?? null }))}
          />
          <PedidoAcciones
            idPedido={pedido.id_pedido}
            entregado={pedido.entregado ?? false}
            pagado={pedido.pagado ?? false}
          />
        </div>
      </div>

      {/* Contenido principal */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Columna izquierda: productos */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Productos</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y">
                {pedido.pedido_producto.map((item) => {
                  const subFinal = item.sub_total
                    ? Number(item.sub_total)
                    : (item.cantidad ?? 0) * Number(item.precio_unitario ?? 0)

                  return (
                    <div key={item.id_pedido_producto} className="flex items-center gap-4 px-6 py-4">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">
                          {item.producto?.nombre ?? 'Producto eliminado'}
                        </p>
                        {item.producto?.peso && (
                          <p className="text-xs text-muted-foreground">{item.producto.peso}</p>
                        )}
                      </div>
                      <Badge
                        variant="outline"
                        className={`text-xs shrink-0 ${getVarianteBadgeClass(item.rebanado, item.cuadrado)}`}
                      >
                        {getVariante(item.rebanado, item.cuadrado)}
                      </Badge>
                      <div className="text-right shrink-0 w-20">
                        <p className="text-sm font-medium">{item.cantidad ?? 0} u.</p>
                        <p className="text-xs text-muted-foreground">
                          ₡{Number(item.precio_unitario ?? 0).toLocaleString('es-CR')} c/u
                        </p>
                      </div>
                      <div className="text-right shrink-0 w-24">
                        <p className="font-semibold">
                          ₡{subFinal.toLocaleString('es-CR')}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Total */}
              <div className="px-6 py-4 bg-muted/40 border-t flex items-center justify-between">
                <span className="font-medium">Total del pedido</span>
                <span className="text-xl font-black">₡{total.toLocaleString('es-CR')}</span>
              </div>
            </CardContent>
          </Card>

          {/* Abonos — solo si hay pagos parciales registrados */}
          {abonos.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-muted-foreground" />
                  Pagos registrados
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Barra de progreso */}
                {!pedido.pagado && (
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Abonado</span>
                      <span className="font-medium">
                        ₡{totalAbonado.toLocaleString('es-CR')} de ₡{total.toLocaleString('es-CR')}
                      </span>
                    </div>
                    <Progress value={porcentajePagado} className="h-2" />
                    <p className="text-xs text-muted-foreground text-right">
                      Pendiente: ₡{pendiente.toLocaleString('es-CR')}
                    </p>
                  </div>
                )}

                {/* Lista de abonos */}
                <div className="divide-y rounded-md border overflow-hidden">
                  {abonos.map((abono) => (
                    <div key={abono.id_pago} className="flex items-center justify-between px-4 py-3">
                      <div>
                        <p className="text-sm font-medium">
                          {METODO_LABEL[abono.metodo ?? ''] ?? abono.metodo}
                        </p>
                        {abono.fecha && (
                          <p className="text-xs text-muted-foreground">
                            {format(parseISO(abono.fecha + 'T12:00:00'), 'dd MMM yyyy', { locale: es })}
                          </p>
                        )}
                      </div>
                      <span className="font-semibold text-green-700">
                        +₡{Number(abono.monto).toLocaleString('es-CR')}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Columna derecha: info del cliente y contexto */}
        <div className="space-y-4">
          {/* Cliente */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Cliente</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-start gap-3">
                <User className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium leading-tight">
                    {pedido.cliente?.nombre ?? '—'}
                  </p>
                  <Link
                    href={`/clientes/${pedido.id_cliente}`}
                    className="text-xs text-primary hover:underline"
                  >
                    Ver ficha del cliente
                  </Link>
                </div>
              </div>

              {pedido.cliente?.telefono && (
                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                  <a
                    href={`tel:${pedido.cliente.telefono}`}
                    className="text-sm hover:text-primary transition-colors"
                  >
                    {pedido.cliente.telefono}
                  </a>
                </div>
              )}

              {pedido.cliente?.email && (
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                  <a
                    href={`mailto:${pedido.cliente.email}`}
                    className="text-sm truncate hover:text-primary transition-colors"
                  >
                    {pedido.cliente.email}
                  </a>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Ruta y dirección */}
          {(pedido.ruta ?? pedido.direccion) && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Entrega</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {pedido.ruta && (
                  <div className="flex items-start gap-3">
                    <Route className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm font-medium">{pedido.ruta.nombre ?? 'Sin nombre'}</p>
                      {pedido.ruta.fecha && (
                        <p className="text-xs text-muted-foreground">
                          {format(parseISO(pedido.ruta.fecha + 'T12:00:00'), 'dd MMM yyyy', { locale: es })}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {pedido.ruta && pedido.direccion && <Separator />}

                {pedido.direccion && (
                  <div className="flex items-start gap-3">
                    <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                    <p className="text-sm">
                      {pedido.direccion.direccion_texto ?? 'Sin descripción'}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Notas */}
          {pedido.notas && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  Notas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground leading-relaxed">{pedido.notas}</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
