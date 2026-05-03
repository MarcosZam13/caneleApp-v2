// ClienteAbonoButton.tsx — Botón client-side para registrar un pago desde la ficha del cliente
'use client'

import { useState } from 'react'
import { Wallet } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AbonoDialog } from '@/components/pagos/AbonoDialog'

interface PedidoMoroso {
  id_pedido: string
  total: number
  abonado: number
  pendiente: number
  fecha: string | null
  notas: string | null
}

interface ClienteAbonoButtonProps {
  idCliente: string
  nombreCliente: string
  pedidos: PedidoMoroso[]
}

export function ClienteAbonoButton({ idCliente, nombreCliente, pedidos }: ClienteAbonoButtonProps) {
  const [open, setOpen] = useState(false)

  if (pedidos.length === 0) return null

  return (
    <>
      <Button onClick={() => setOpen(true)} variant="outline" size="sm" className="gap-2">
        <Wallet className="h-4 w-4" />
        Registrar pago
      </Button>
      <AbonoDialog
        open={open}
        onOpenChange={setOpen}
        idCliente={idCliente}
        nombreCliente={nombreCliente}
        pedidos={pedidos}
      />
    </>
  )
}
