// RutaDetalle.tsx — Vista detallada de una ruta: pedidos, producción e ingresos
'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { CheckCircle2, Circle, Wallet, UtensilsCrossed, TrendingUp, Package, ChevronRight, Printer } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { ExportarPDFButton } from '@/components/reportes/ExportarPDFButton'
import { ResumenRutaPDF } from '@/components/reportes/pdf/ResumenRutaPDF'
import { marcarPedidoEntregado, marcarPedidoPagado, updateRutaEstado } from '@/actions/rutas.actions'

type PedidoItem = {
  id_pedido: string
  total: number | null
  pagado: boolean | null
  entregado: boolean | null
  notas: string | null
  fecha: string | null
  cliente: { nombre: string; telefono: string | null } | null
  direccion: { direccion_texto: string | null; lat: number | null; lng: number | null } | null
  pedido_producto: {
    id_pedido_producto: string
    cantidad: number | null
    rebanado: boolean | null
    cuadrado: boolean | null
    precio_unitario: number | null
    sub_total: number | null
    producto: { id_producto: string; nombre: string; peso: string | null } | null
  }[]
}

type ProduccionItem = {
  nombre: string
  peso: string | null
  total: number
  entero: number
  rebanado: number
  cuadrado: number
  cuadrado_rebanado: number
}

interface RutaDetalleProps {
  rutaId: string
  rutaNombre: string
  rutaFecha: string
  estado: string | null
  pedidos: PedidoItem[]
  produccion: ProduccionItem[]
  ingresosCobrados: number
  ingresosPendientes: number
  totalIngresos: number
}

export function RutaDetalle({
  rutaId,
  rutaNombre,
  rutaFecha,
  estado,
  pedidos,
  produccion,
  ingresosCobrados,
  ingresosPendientes,
  totalIngresos,
}: RutaDetalleProps) {
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [confirmEntregar, setConfirmEntregar] = useState<{ id: string; nombre: string } | null>(null)
  const [confirmPagar, setConfirmPagar] = useState<{ id: string; nombre: string } | null>(null)
  const [confirmLoading, setConfirmLoading] = useState(false)

  const entregados = pedidos.filter(p => p.entregado).length
  const progreso = pedidos.length > 0 ? Math.round((entregados / pedidos.length) * 100) : 0

  const resumenData = pedidos.map((p, idx) => ({
    cliente_nombre: p.cliente?.nombre ?? 'Cliente desconocido',
    direccion: p.direccion?.direccion_texto ?? 'Sin dirección',
    total: Number(p.total ?? 0),
    items: p.pedido_producto.map(item => `${item.cantidad}x ${item.producto?.nombre ?? '—'}`),
    notas: p.notas,
  }))

  // Índice del estado actual para el indicador de ciclo de vida
  const estadosPasos = ['pendiente', 'en_curso', 'completada']
  const estadoIdx = estadosPasos.indexOf(estado ?? 'pendiente')

  async function handleEntregado(idPedido: string) {
    setConfirmLoading(true)
    const result = await marcarPedidoEntregado(idPedido, rutaId)
    setConfirmLoading(false)
    setConfirmEntregar(null)
    if (!result.success) toast.error(result.error)
    else toast.success('Marcado como entregado')
  }

  async function handlePagado(idPedido: string) {
    setConfirmLoading(true)
    const result = await marcarPedidoPagado(idPedido, rutaId)
    setConfirmLoading(false)
    setConfirmPagar(null)
    if (!result.success) toast.error(result.error)
    else toast.success('Marcado como pagado')
  }

  async function handleCambiarEstado(nuevoEstado: string) {
    const result = await updateRutaEstado(rutaId, nuevoEstado)
    if (!result.success) toast.error(result.error)
    else toast.success(`Ruta marcada como ${nuevoEstado}`)
  }

  return (
    <div className="space-y-6">
      {/* Resumen de ingresos + progreso */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">{rutaNombre}</h2>
        <ExportarPDFButton
          pdfDocument={
            <ResumenRutaPDF
              ruta={{ nombre: rutaNombre, fecha: rutaFecha }}
              pedidos={resumenData}
              totalIngresos={totalIngresos}
            />
          }
          fileName={`ruta-${rutaNombre.toLowerCase().replace(/\s+/g, '-')}.pdf`}
        />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Total de la ruta</p>
            <p className="text-2xl font-bold text-foreground mt-1">
              ₡{totalIngresos.toLocaleString('es-CR')}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Cobrado</p>
            <p className="text-2xl font-bold text-green-600 mt-1">
              ₡{ingresosCobrados.toLocaleString('es-CR')}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Pendiente de cobro</p>
            <p className={`text-2xl font-bold mt-1 ${ingresosPendientes > 0 ? 'text-amber-600' : 'text-muted-foreground'}`}>
              ₡{ingresosPendientes.toLocaleString('es-CR')}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Progreso de entregas + ciclo de vida */}
      <Card>
        <CardContent className="pt-4 space-y-3">
          {/* Indicador visual de ciclo de vida */}
          <div className="flex items-center gap-1.5 text-xs">
            {[
              { key: 'pendiente', label: 'Pendiente' },
              { key: 'en_curso', label: 'En camino' },
              { key: 'completada', label: 'Completada' },
            ].map((paso, idx, arr) => (
              <span key={paso.key} className="flex items-center gap-1.5">
                <span className={`px-2.5 py-1 rounded-full font-medium ${
                  idx === estadoIdx
                    ? 'bg-primary text-primary-foreground'
                    : idx < estadoIdx
                    ? 'bg-green-100 text-green-700'
                    : 'bg-muted text-muted-foreground'
                }`}>
                  {paso.label}
                </span>
                {idx < arr.length - 1 && (
                  <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0" />
                )}
              </span>
            ))}
          </div>

          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Progreso de entregas</span>
            <span className="font-medium">{entregados} / {pedidos.length} entregados</span>
          </div>
          <Progress value={progreso} className="h-2" />
          <div className="flex items-center justify-between pt-1">
            <span className="text-xs text-muted-foreground">{progreso}% completado</span>
            <div className="flex gap-2">
              {estado !== 'en_curso' && estado !== 'completada' && (
                <Button size="sm" variant="outline" onClick={() => handleCambiarEstado('en_curso')}>
                  Salir a repartir
                </Button>
              )}
              {estado === 'en_curso' && (
                <Button
                  size="sm"
                  variant={progreso === 100 ? 'default' : 'outline'}
                  onClick={() => handleCambiarEstado('completada')}
                >
                  Completar ruta
                  {progreso < 100 && (
                    <span className="ml-1.5 text-xs opacity-70">({progreso}%)</span>
                  )}
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs: Pedidos / Producción */}
      <Tabs defaultValue="pedidos">
        <TabsList>
          <TabsTrigger value="pedidos" className="gap-2">
            <Wallet className="h-3.5 w-3.5" />
            Pedidos ({pedidos.length})
          </TabsTrigger>
          <TabsTrigger value="produccion" className="gap-2">
            <UtensilsCrossed className="h-3.5 w-3.5" />
            Producción ({produccion.length} productos)
          </TabsTrigger>
        </TabsList>

        {/* Lista de pedidos */}
        <TabsContent value="pedidos" className="mt-4 space-y-3">
          {pedidos.map((pedido, idx) => (
            <Card key={pedido.id_pedido} className={pedido.entregado ? 'opacity-75' : ''}>
              <CardContent className="pt-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    {/* Número de posición */}
                    <span className="shrink-0 w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground">
                      {idx + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="font-medium truncate">
                        {pedido.cliente?.nombre ?? 'Cliente desconocido'}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {pedido.direccion?.direccion_texto ?? 'Sin dirección'}
                      </p>
                      {pedido.notas && (
                        <p className="text-xs text-amber-700 bg-amber-50 px-2 py-0.5 rounded mt-1 inline-block">
                          📝 {pedido.notas}
                        </p>
                      )}
                      {/* Productos del pedido */}
                      <div className="flex flex-wrap gap-1 mt-2">
                        {pedido.pedido_producto.map((item) => (
                          <span
                            key={item.id_pedido_producto}
                            className="text-xs bg-muted px-2 py-0.5 rounded-full"
                          >
                            {item.cantidad}x {item.producto?.nombre}
                            {item.rebanado && item.cuadrado && ' · cuad. reb.'}
                            {item.rebanado && !item.cuadrado && ' · reb.'}
                            {item.cuadrado && !item.rebanado && ' · cuad.'}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Acciones y total */}
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <p className="font-bold text-base">
                      ₡{Number(pedido.total ?? 0).toLocaleString('es-CR')}
                    </p>
                    <div className="flex flex-col items-end gap-1.5">
                      <StatusBadge
                        status={!pedido.entregado ? 'pendiente' : pedido.pagado ? 'pagado' : 'moroso'}
                      />
                      <div className="flex gap-1">
                        {/* Botón entregar: abre confirmación antes de ejecutar */}
                        {!pedido.entregado && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs"
                            onClick={() => setConfirmEntregar({ id: pedido.id_pedido, nombre: pedido.cliente?.nombre ?? 'Cliente desconocido' })}
                            disabled={confirmLoading && confirmEntregar?.id === pedido.id_pedido}
                          >
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Entregar
                          </Button>
                        )}
                        {/* Botón cobrar: visible siempre que no esté pagado */}
                        {!pedido.pagado && (
                          <Button
                            size="sm"
                            className="h-7 text-xs bg-green-600 hover:bg-green-700"
                            onClick={() => setConfirmPagar({ id: pedido.id_pedido, nombre: pedido.cliente?.nombre ?? 'Cliente desconocido' })}
                            disabled={confirmLoading && confirmPagar?.id === pedido.id_pedido}
                          >
                            <Wallet className="h-3 w-3 mr-1" />
                            Cobrar
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* Resumen de producción */}
        <TabsContent value="produccion" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Package className="h-4 w-4 text-primary" />
                Qué hay que preparar para esta ruta
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {produccion.map((item) => (
                  <div
                    key={item.nombre}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                  >
                    <div>
                      <p className="font-medium text-sm">{item.nombre}</p>
                      {item.peso && (
                        <p className="text-xs text-muted-foreground">{item.peso}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      {/* Total del producto con número destacado */}
                      <div className="flex flex-col items-center min-w-10">
                        <span className="font-bold text-xl leading-none">{item.total}</span>
                        <span className="text-[10px] text-muted-foreground">total</span>
                      </div>
                      {/* Etiquetas de las 4 variantes posibles */}
                      <div className="flex flex-wrap gap-1.5">
                        {item.entero > 0 && (
                          <Badge variant="outline" className="text-xs font-medium bg-stone-50 text-stone-700 border-stone-300">
                            {item.entero} entero{item.entero !== 1 ? 's' : ''}
                          </Badge>
                        )}
                        {item.rebanado > 0 && (
                          <Badge variant="outline" className="text-xs font-medium bg-blue-50 text-blue-700 border-blue-300">
                            {item.rebanado} rebanado{item.rebanado !== 1 ? 's' : ''}
                          </Badge>
                        )}
                        {item.cuadrado > 0 && (
                          <Badge variant="outline" className="text-xs font-medium bg-amber-50 text-amber-700 border-amber-300">
                            {item.cuadrado} cuadrado{item.cuadrado !== 1 ? 's' : ''}
                          </Badge>
                        )}
                        {item.cuadrado_rebanado > 0 && (
                          <Badge variant="outline" className="text-xs font-medium bg-purple-50 text-purple-700 border-purple-300">
                            {item.cuadrado_rebanado} cuad. reb.
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <ConfirmDialog
        open={confirmEntregar !== null}
        onOpenChange={(open) => { if (!open) setConfirmEntregar(null) }}
        title="¿Marcar como entregado?"
        description={`Confirma que el pedido de ${confirmEntregar?.nombre ?? ''} fue entregado.`}
        confirmLabel="Sí, entregado"
        variant="default"
        onConfirm={() => { if (confirmEntregar) handleEntregado(confirmEntregar.id) }}
        loading={confirmLoading}
      />
      <ConfirmDialog
        open={confirmPagar !== null}
        onOpenChange={(open) => { if (!open) setConfirmPagar(null) }}
        title="¿Marcar como pagado?"
        description={`Confirma que ${confirmPagar?.nombre ?? ''} pagó este pedido.`}
        confirmLabel="Sí, pagado"
        variant="default"
        onConfirm={() => { if (confirmPagar) handlePagado(confirmPagar.id) }}
        loading={confirmLoading}
      />
    </div>
  )
}
