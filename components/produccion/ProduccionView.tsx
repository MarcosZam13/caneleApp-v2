// ProduccionView.tsx — Producción dividida en Horneo y Alistar por ruta
'use client'

import { useState, useTransition } from 'react'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { Flame, PackageCheck, UtensilsCrossed } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { EmptyState } from '@/components/shared/EmptyState'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { getProduccionRuta } from '@/actions/produccion.actions'
import type { ResumenProduccion } from '@/actions/produccion.actions'

type RutaOpcion = {
  id_ruta: string
  nombre: string | null
  fecha: string | null
  estado: string | null
  total_pedidos: number | null
}

interface ProduccionViewProps {
  rutas: RutaOpcion[]
  inicial: ResumenProduccion | null
}

export function ProduccionView({ rutas, inicial }: ProduccionViewProps) {
  const [resumen, setResumen] = useState<ResumenProduccion | null>(inicial)
  const [rutaSeleccionada, setRutaSeleccionada] = useState<string>(inicial?.ruta.id_ruta ?? '')
  const [isPending, startTransition] = useTransition()

  function handleRutaChange(idRuta: string) {
    setRutaSeleccionada(idRuta)
    startTransition(async () => {
      const data = await getProduccionRuta(idRuta)
      setResumen(data)
    })
  }

  const tieneItems = resumen && resumen.items.length > 0

  return (
    <div className="space-y-6">
      {/* Selector de ruta */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium mb-1.5">Seleccionar ruta</p>
              <Select value={rutaSeleccionada} onValueChange={(v) => { if (v) handleRutaChange(v) }}>
                <SelectTrigger className="w-full sm:max-w-sm">
                  {rutaSeleccionada ? (
                    <span className="capitalize truncate">
                      {rutas.find(r => r.id_ruta === rutaSeleccionada)?.nombre ?? 'Sin nombre'}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">Selecciona una ruta...</span>
                  )}
                </SelectTrigger>
                <SelectContent>
                  {rutas.map((ruta) => {
                    const fecha = ruta.fecha
                      ? format(parseISO(ruta.fecha + 'T12:00:00'), "EEEE dd 'de' MMMM", { locale: es })
                      : null
                    return (
                      <SelectItem key={ruta.id_ruta} value={ruta.id_ruta} label={ruta.nombre ?? 'Sin nombre'}>
                        <span className="font-medium capitalize">{ruta.nombre ?? 'Sin nombre'}</span>
                        {fecha && <span className="text-muted-foreground text-xs ml-2 capitalize">— {fecha}</span>}
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
            </div>
            {resumen && (
              <div className="flex items-center gap-3 shrink-0">
                <StatusBadge status={resumen.ruta.estado ?? 'pendiente'} />
                <div className="text-right">
                  <p className="text-2xl font-bold">{resumen.totalUnidades}</p>
                  <p className="text-xs text-muted-foreground">unidades</p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Contenido principal */}
      {isPending ? (
        <ProduccionSkeleton />
      ) : !tieneItems ? (
        <EmptyState
          icon={UtensilsCrossed}
          title="Sin producción"
          description="La ruta seleccionada no tiene pedidos con productos."
        />
      ) : (
        <Tabs defaultValue="horneo">
          <TabsList className="w-full sm:w-auto">
            <TabsTrigger value="horneo" className="gap-2 flex-1 sm:flex-none">
              <Flame className="h-3.5 w-3.5" />
              Horneo
            </TabsTrigger>
            <TabsTrigger value="alistar" className="gap-2 flex-1 sm:flex-none">
              <PackageCheck className="h-3.5 w-3.5" />
              Alistar
            </TabsTrigger>
          </TabsList>

          {/* ── TAB HORNEO ─────────────────────────────────── */}
          <TabsContent value="horneo" className="mt-4 space-y-4">
            <p className="text-sm text-muted-foreground">
              Solo importa la <strong>forma del molde</strong>: entero o cuadrado.
            </p>

            {/* Totales de horneo */}
            <div className="grid grid-cols-2 gap-3">
              {(() => {
                const totalEntero   = resumen.items.reduce((a, i) => a + i.hornear_entero, 0)
                const totalCuadrado = resumen.items.reduce((a, i) => a + i.hornear_cuadrado, 0)
                return (
                  <>
                    {totalEntero > 0 && (
                      <Card className="border-stone-200 bg-stone-50">
                        <CardContent className="pt-4 pb-3">
                          <p className="text-4xl font-black text-stone-700">{totalEntero}</p>
                          <Badge variant="outline" className="mt-2 bg-stone-100 text-stone-700 border-stone-300 text-xs">
                            Enteros
                          </Badge>
                        </CardContent>
                      </Card>
                    )}
                    {totalCuadrado > 0 && (
                      <Card className="border-amber-200 bg-amber-50">
                        <CardContent className="pt-4 pb-3">
                          <p className="text-4xl font-black text-amber-700">{totalCuadrado}</p>
                          <Badge variant="outline" className="mt-2 bg-amber-100 text-amber-700 border-amber-300 text-xs">
                            Cuadrados
                          </Badge>
                        </CardContent>
                      </Card>
                    )}
                  </>
                )
              })()}
            </div>

            {/* Desglose por producto */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Flame className="h-4 w-4 text-orange-500" />
                  Desglose por producto
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {resumen.items
                  .filter(i => i.hornear_entero > 0 || i.hornear_cuadrado > 0)
                  .map((item) => (
                    <div
                      key={item.id_producto}
                      className="flex items-center justify-between px-3 py-2.5 rounded-lg border bg-card"
                    >
                      <div>
                        <p className="font-medium text-sm">{item.nombre}</p>
                        {item.peso && <p className="text-xs text-muted-foreground">{item.peso}</p>}
                      </div>
                      <div className="flex items-center gap-2">
                        {item.hornear_entero > 0 && (
                          <Badge variant="outline" className="bg-stone-50 text-stone-700 border-stone-300 text-sm font-bold px-3">
                            {item.hornear_entero} entero{item.hornear_entero !== 1 ? 's' : ''}
                          </Badge>
                        )}
                        {item.hornear_cuadrado > 0 && (
                          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300 text-sm font-bold px-3">
                            {item.hornear_cuadrado} cuadrado{item.hornear_cuadrado !== 1 ? 's' : ''}
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── TAB ALISTAR ────────────────────────────────── */}
          <TabsContent value="alistar" className="mt-4 space-y-4">
            <p className="text-sm text-muted-foreground">
              Lo que hay que <strong>entregar exactamente</strong> a cada cliente.
              Incluye rebanado, cuadrado y cuadrado rebanado por separado.
            </p>

            {/* Totales de alistar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { key: 'entero'           as const, label: 'Enteros',          className: 'border-stone-200 bg-stone-50',  badgeClass: 'bg-stone-100 text-stone-700 border-stone-300',   textClass: 'text-stone-700' },
                { key: 'rebanado'         as const, label: 'Rebanados',         className: 'border-blue-200  bg-blue-50',   badgeClass: 'bg-blue-100  text-blue-700  border-blue-300',    textClass: 'text-blue-700'  },
                { key: 'cuadrado'         as const, label: 'Cuadrados',         className: 'border-amber-200 bg-amber-50',  badgeClass: 'bg-amber-100 text-amber-700 border-amber-300',   textClass: 'text-amber-700' },
                { key: 'cuadrado_rebanado'as const, label: 'Cuad. rebanados',   className: 'border-purple-200 bg-purple-50',badgeClass: 'bg-purple-100 text-purple-700 border-purple-300',textClass: 'text-purple-700'},
              ].map(({ key, label, className, badgeClass, textClass }) => {
                const total = resumen.items.reduce((a, i) => a + i[key], 0)
                if (total === 0) return null
                return (
                  <Card key={key} className={`border ${className}`}>
                    <CardContent className="pt-4 pb-3">
                      <p className={`text-4xl font-black ${textClass}`}>{total}</p>
                      <Badge variant="outline" className={`mt-2 text-xs ${badgeClass}`}>{label}</Badge>
                    </CardContent>
                  </Card>
                )
              })}
            </div>

            {/* Desglose por producto */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <PackageCheck className="h-4 w-4 text-primary" />
                  Desglose por producto
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {resumen.items.map((item) => (
                  <div
                    key={item.id_producto}
                    className="flex items-center justify-between px-3 py-2.5 rounded-lg border bg-card"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm">{item.nombre}</p>
                      {item.peso && <p className="text-xs text-muted-foreground">{item.peso}</p>}
                    </div>
                    <div className="flex flex-wrap gap-1.5 justify-end ml-3">
                      {item.entero > 0 && (
                        <Badge variant="outline" className="bg-stone-50 text-stone-700 border-stone-300 text-xs font-semibold">
                          {item.entero} entero{item.entero !== 1 ? 's' : ''}
                        </Badge>
                      )}
                      {item.rebanado > 0 && (
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300 text-xs font-semibold">
                          {item.rebanado} rebanado{item.rebanado !== 1 ? 's' : ''}
                        </Badge>
                      )}
                      {item.cuadrado > 0 && (
                        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300 text-xs font-semibold">
                          {item.cuadrado} cuadrado{item.cuadrado !== 1 ? 's' : ''}
                        </Badge>
                      )}
                      {item.cuadrado_rebanado > 0 && (
                        <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-300 text-xs font-semibold">
                          {item.cuadrado_rebanado} cuad. reb.
                        </Badge>
                      )}
                    </div>
                    <div className="flex flex-col items-center min-w-10 border-l pl-3 ml-3">
                      <span className="text-xl font-black leading-none">{item.total}</span>
                      <span className="text-[10px] text-muted-foreground">total</span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}

function ProduccionSkeleton() {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <Card><CardContent className="pt-4"><Skeleton className="h-10 w-16 mb-2" /><Skeleton className="h-5 w-20" /></CardContent></Card>
        <Card><CardContent className="pt-4"><Skeleton className="h-10 w-16 mb-2" /><Skeleton className="h-5 w-20" /></CardContent></Card>
      </div>
      <Card><CardContent className="pt-4 space-y-2">
        {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-lg" />)}
      </CardContent></Card>
    </div>
  )
}
