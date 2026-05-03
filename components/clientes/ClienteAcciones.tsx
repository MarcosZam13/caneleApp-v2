// ClienteAcciones.tsx — Botón de edición del cliente en su página de detalle
'use client'

import { useState } from 'react'
import { Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ClienteFormDialog } from './ClienteFormDialog'
import type { Cliente } from '@/types/database'

interface ClienteAccionesProps {
  cliente: Cliente
}

export function ClienteAcciones({ cliente }: ClienteAccionesProps) {
  const [showEdit, setShowEdit] = useState(false)

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="gap-2 shrink-0"
        onClick={() => setShowEdit(true)}
      >
        <Pencil className="h-3.5 w-3.5" />
        Editar cliente
      </Button>

      <ClienteFormDialog
        open={showEdit}
        onOpenChange={setShowEdit}
        cliente={cliente}
      />
    </>
  )
}
