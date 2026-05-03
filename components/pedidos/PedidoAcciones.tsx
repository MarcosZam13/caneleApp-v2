// PedidoAcciones.tsx — Botones de acción rápida en el detalle de un pedido
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, Wallet, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { marcarEntregado, marcarPagado } from '@/actions/pedidos.actions'

interface PedidoAccionesProps {
  idPedido: string
  entregado: boolean
  pagado: boolean
}

export function PedidoAcciones({ idPedido, entregado, pagado }: PedidoAccionesProps) {
  const router = useRouter()
  const [loadingEntregar, setLoadingEntregar] = useState(false)
  const [loadingCobrar, setLoadingCobrar] = useState(false)

  async function handleEntregar() {
    setLoadingEntregar(true)
    const result = await marcarEntregado(idPedido)
    setLoadingEntregar(false)
    if (!result.success) {
      toast.error(result.error)
    } else {
      toast.success('Pedido marcado como entregado')
      router.refresh()
    }
  }

  async function handleCobrar() {
    setLoadingCobrar(true)
    const result = await marcarPagado(idPedido)
    setLoadingCobrar(false)
    if (!result.success) {
      toast.error(result.error)
    } else {
      toast.success('Pedido marcado como pagado')
      router.refresh()
    }
  }

  // Si ya está entregado y pagado, no hay acciones disponibles
  if (entregado && pagado) return null

  return (
    <div className="flex items-center gap-2">
      {!entregado && (
        <Button
          variant="outline"
          className="gap-2"
          onClick={handleEntregar}
          disabled={loadingEntregar}
        >
          {loadingEntregar
            ? <Loader2 className="h-4 w-4 animate-spin" />
            : <CheckCircle2 className="h-4 w-4" />
          }
          Entregar
        </Button>
      )}
      {!pagado && (
        <Button
          className="gap-2 bg-green-600 hover:bg-green-700"
          onClick={handleCobrar}
          disabled={loadingCobrar}
        >
          {loadingCobrar
            ? <Loader2 className="h-4 w-4 animate-spin" />
            : <Wallet className="h-4 w-4" />
          }
          Cobrar
        </Button>
      )}
    </div>
  )
}
