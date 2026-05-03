// PagosView.tsx — Vista de clientes con deuda pendiente y gestión de abonos
'use client'

import { useState, useMemo } from 'react'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { CreditCard, AlertCircle, Plus, ChevronDown, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { SearchInput } from '@/components/shared/SearchInput'
import { EmptyState } from '@/components/shared/EmptyState'
import { AbonoDialog } from './AbonoDialog'

type ClienteDeuda = {
  id_cliente: string
  nombre: string
  telefono: string | null
  deuda_total: number
  pedidos_morosos: {
    id_pedido: string
    total: number
    abonado: number
    pendiente: number
    fecha: string | null
    notas: string | null
  }[]
}

interface PagosViewProps {
  clientes: ClienteDeuda[]
  totalDeuda: number
}

export function PagosView({ clientes, totalDeuda }: PagosViewProps) {
  const [search, setSearch] = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [abonar, setAbonar] = useState<ClienteDeuda | null>(null)

  const filtered = useMemo(() => {
    if (!search.trim()) return clientes
    const q = search.toLowerCase()
    return clientes.filter(c =>
      c.nombre.toLowerCase().includes(q) ||
      c.telefono?.includes(q)
    )
  }, [clientes, search])

  return (
    <div className="space-y-6">
      {/* Resumen total de deuda */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="sm:col-span-2 border-destructive/20 bg-destructive/5">
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">Total en deuda (todos los clientes)</p>
            <p className="text-3xl font-bold text-destructive mt-1">
              ₡{totalDeuda.toLocaleString('es-CR')}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">Clientes con deuda</p>
            <p className="text-3xl font-bold mt-1">{clientes.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Toolbar */}
      <SearchInput
        value={search}
        onChange={setSearch}
        placeholder="Buscar cliente..."
        className="w-72"
      />

      {/* Lista de clientes con deuda */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={CreditCard}
          title={search ? 'No hay resultados' : 'Sin deudas pendientes'}
          description={search ? `No hay clientes con "${search}"` : 'Todos los clientes están al día'}
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((cliente) => {
            const isExpanded = expanded === cliente.id_cliente
            return (
              <Card key={cliente.id_cliente} className="border">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between gap-3">
                    <button
                      onClick={() => setExpanded(isExpanded ? null : cliente.id_cliente)}
                      className="flex items-center gap-2 flex-1 min-w-0 text-left"
                    >
                      {isExpanded
                        ? <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                        : <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                      }
                      <div className="min-w-0">
                        <p className="font-semibold truncate">{cliente.nombre}</p>
                        {cliente.telefono && (
                          <p className="text-xs text-muted-foreground">{cliente.telefono}</p>
                        )}
                      </div>
                    </button>
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">Deuda total</p>
                        <p className="font-bold text-destructive">
                          ₡{cliente.deuda_total.toLocaleString('es-CR')}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        className="gap-1.5"
                        onClick={() => setAbonar(cliente)}
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Abonar
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                {/* Detalle de pedidos expandido */}
                {isExpanded && (
                  <CardContent className="pt-0 space-y-2 border-t">
                    <p className="text-xs text-muted-foreground pt-3 pb-1 font-medium uppercase tracking-wide">
                      Pedidos con deuda
                    </p>
                    {cliente.pedidos_morosos.map((pedido) => {
                      const porcentajeAbonado = (pedido.abonado / pedido.total) * 100
                      return (
                        <div key={pedido.id_pedido} className="bg-muted/40 rounded-lg p-3 space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">
                              {pedido.fecha
                                ? format(parseISO(pedido.fecha + 'T12:00:00'), 'dd MMM yyyy', { locale: es })
                                : 'Sin fecha'}
                            </span>
                            <span className="font-medium">
                              ₡{pedido.total.toLocaleString('es-CR')}
                            </span>
                          </div>
                          {pedido.notas && (
                            <p className="text-xs text-muted-foreground italic">{pedido.notas}</p>
                          )}
                          {pedido.abonado > 0 && (
                            <>
                              <Progress value={porcentajeAbonado} className="h-1.5" />
                              <div className="flex justify-between text-xs">
                                <span className="text-green-600">
                                  Abonado: ₡{pedido.abonado.toLocaleString('es-CR')}
                                </span>
                                <span className="text-destructive font-medium">
                                  Pendiente: ₡{pedido.pendiente.toLocaleString('es-CR')}
                                </span>
                              </div>
                            </>
                          )}
                          {pedido.abonado === 0 && (
                            <Badge variant="outline" className="text-xs bg-red-50 text-red-700 border-red-200">
                              <AlertCircle className="h-3 w-3 mr-1" />
                              Sin abonos
                            </Badge>
                          )}
                        </div>
                      )
                    })}
                  </CardContent>
                )}
              </Card>
            )
          })}
        </div>
      )}

      {abonar && (
        <AbonoDialog
          open={!!abonar}
          onOpenChange={(open) => !open && setAbonar(null)}
          idCliente={abonar.id_cliente}
          nombreCliente={abonar.nombre}
          pedidos={abonar.pedidos_morosos}
        />
      )}
    </div>
  )
}
