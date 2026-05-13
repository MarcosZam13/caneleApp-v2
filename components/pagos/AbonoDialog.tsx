// AbonoDialog.tsx — Sheet para registrar un abono a un pedido moroso
'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from '@/components/ui/sheet'
import { registrarAbono } from '@/actions/pagos.actions'

interface PedidoMoroso {
  id_pedido: string
  total: number
  abonado: number
  pendiente: number
  fecha: string | null
  notas: string | null
}

interface AbonoDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  idCliente: string
  nombreCliente: string
  pedidos: PedidoMoroso[]
}

export function AbonoDialog({ open, onOpenChange, idCliente, nombreCliente, pedidos }: AbonoDialogProps) {
  const [idPedido, setIdPedido] = useState<string>(pedidos[0]?.id_pedido ?? '')
  const [monto, setMonto] = useState('')
  const [metodo, setMetodo] = useState<'efectivo' | 'sinpe' | 'transferencia' | 'otro'>('efectivo')
  const [loading, setLoading] = useState(false)

  // Resetea el formulario cada vez que el sheet se abre
  useEffect(() => {
    if (open) {
      setIdPedido(pedidos[0]?.id_pedido ?? '')
      setMonto('')
      setMetodo('efectivo')
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const pedidoSeleccionado = pedidos.find(p => p.id_pedido === idPedido)
  const montoNum = monto === '' ? 0 : Number(monto)
  // Redondea a 2 decimales para evitar falsos positivos por floating-point
  const pendienteRedondeado = pedidoSeleccionado ? Math.round(pedidoSeleccionado.pendiente * 100) / 100 : 0
  const montoRedondeado = Math.round(montoNum * 100) / 100
  const excedePendiente = pedidoSeleccionado && montoNum > 0 && montoRedondeado > pendienteRedondeado
  const cubriTotal = pedidoSeleccionado && montoNum > 0 && montoRedondeado >= pendienteRedondeado

  function handlePagarTotal() {
    if (pedidoSeleccionado) setMonto(String(pedidoSeleccionado.pendiente))
  }

  function formatFecha(fecha: string | null): string {
    if (!fecha) return 'Sin fecha'
    try {
      return format(parseISO(fecha + 'T12:00:00'), 'dd MMM yyyy', { locale: es })
    } catch {
      return fecha
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!idPedido) {
      toast.error('Selecciona un pedido')
      return
    }

    // Campo vacío = pagar el total pendiente automáticamente
    const montoFinal = (!monto || montoNum <= 0)
      ? pendienteRedondeado
      : montoRedondeado

    if (montoFinal <= 0) {
      toast.error('El monto debe ser mayor a 0')
      return
    }

    if (pedidoSeleccionado && montoFinal > pendienteRedondeado) {
      toast.error(`El monto no puede superar el pendiente de ₡${pendienteRedondeado.toLocaleString('es-CR')}`)
      return
    }

    setLoading(true)
    const result = await registrarAbono({
      id_cliente: idCliente,
      id_pedido: idPedido,
      monto: montoFinal,
      metodo,
    })
    setLoading(false)

    if (result.success) {
      const esPagoCompleto = !monto || montoFinal >= pendienteRedondeado
      const msg = esPagoCompleto
        ? 'Pago completo registrado — pedido marcado como pagado'
        : `Abono de ₡${montoFinal.toLocaleString('es-CR')} registrado correctamente`
      toast.success(msg)
      onOpenChange(false)
    } else {
      toast.error(result.error)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Registrar pago</SheetTitle>
          <SheetDescription>
            Pago parcial o total de <strong>{nombreCliente}</strong>
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="space-y-4 px-4 mt-4">
          {/* Selector de pedido — siempre visible para que se entienda a qué pedido aplica */}
          <div className="space-y-2">
            <Label>Pedido</Label>
            {pedidos.length === 1 ? (
              <div className="bg-muted/50 rounded-lg px-3 py-2 text-sm text-muted-foreground">
                {formatFecha(pedidos[0].fecha)} — ₡{pedidos[0].pendiente.toLocaleString('es-CR')} pendiente
              </div>
            ) : (
              <Select value={idPedido} onValueChange={(v) => { if (v) { setIdPedido(v); setMonto('') } }}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Seleccionar pedido">
                    {pedidoSeleccionado
                      ? `${formatFecha(pedidoSeleccionado.fecha)} — ₡${pedidoSeleccionado.pendiente.toLocaleString('es-CR')} pendiente`
                      : 'Seleccionar pedido'}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {pedidos.map((p) => (
                    <SelectItem key={p.id_pedido} value={p.id_pedido}>
                      {formatFecha(p.fecha)} — ₡{p.pendiente.toLocaleString('es-CR')} pendiente
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Resumen del pedido seleccionado */}
          {pedidoSeleccionado && (
            <div className="bg-muted/50 rounded-lg p-3 text-sm space-y-1.5">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total del pedido</span>
                <span className="font-medium">₡{pedidoSeleccionado.total.toLocaleString('es-CR')}</span>
              </div>
              {pedidoSeleccionado.abonado > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Ya abonado</span>
                  <span className="font-medium text-green-600">
                    ₡{pedidoSeleccionado.abonado.toLocaleString('es-CR')}
                  </span>
                </div>
              )}
              <div className="flex justify-between border-t pt-1.5">
                <span className="font-medium">Pendiente</span>
                <span className="font-bold text-destructive">
                  ₡{pedidoSeleccionado.pendiente.toLocaleString('es-CR')}
                </span>
              </div>
              {pedidoSeleccionado.notas && (
                <p className="text-xs text-muted-foreground italic border-t pt-1.5">
                  📝 {pedidoSeleccionado.notas}
                </p>
              )}
            </div>
          )}

          {/* Monto con botón "Pagar total" */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="monto">Monto (₡) *</Label>
              {pedidoSeleccionado && (
                <button
                  type="button"
                  onClick={handlePagarTotal}
                  className="text-xs text-primary hover:underline"
                >
                  Pagar total (₡{pedidoSeleccionado.pendiente.toLocaleString('es-CR')})
                </button>
              )}
            </div>
            <Input
              id="monto"
              type="number"
              min="0"
              step="100"
              value={monto}
              onChange={(e) => setMonto(e.target.value)}
              placeholder={
                pedidoSeleccionado
                  ? `Dejar vacío para pagar todo (₡${pendienteRedondeado.toLocaleString('es-CR')})`
                  : '0'
              }
              className={excedePendiente ? 'border-destructive' : ''}
            />
            {!monto && pedidoSeleccionado && (
              <p className="text-xs text-muted-foreground">
                Vacío = se pagará el total pendiente de ₡{pendienteRedondeado.toLocaleString('es-CR')}.
              </p>
            )}
            {cubriTotal && !excedePendiente && (
              <p className="text-xs text-green-600 font-medium">
                ✓ Cubre la deuda completa — el pedido quedará como pagado.
              </p>
            )}
            {excedePendiente && (
              <p className="text-xs text-destructive font-medium">
                El monto supera la deuda pendiente de ₡{pendienteRedondeado.toLocaleString('es-CR')}.
              </p>
            )}
          </div>

          {/* Método de pago */}
          <div className="space-y-2">
            <Label>Método de pago</Label>
            <Select value={metodo} onValueChange={(v) => setMetodo(v as typeof metodo)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="efectivo">Efectivo</SelectItem>
                <SelectItem value="sinpe">SINPE Móvil</SelectItem>
                <SelectItem value="transferencia">Transferencia</SelectItem>
                <SelectItem value="otro">Otro</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <SheetFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading || excedePendiente || !pedidoSeleccionado}>
              {loading ? 'Registrando...' : (cubriTotal || !monto) ? 'Registrar pago total' : 'Registrar abono'}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  )
}
