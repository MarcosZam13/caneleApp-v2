// RutaAcciones.tsx — Botones de editar y eliminar en el detalle de una ruta
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Pencil, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { RutaFormDialog } from './RutaFormDialog'
import { deleteRuta } from '@/actions/rutas.actions'

interface RutaAccionesProps {
  rutaId: string
  rutaNombre: string | null
  rutaFecha: string | null
}

export function RutaAcciones({ rutaId, rutaNombre, rutaFecha }: RutaAccionesProps) {
  const router = useRouter()
  const [showEdit, setShowEdit] = useState(false)
  const [showDelete, setShowDelete] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)

  async function handleDelete() {
    setDeleteLoading(true)
    const result = await deleteRuta(rutaId)
    setDeleteLoading(false)
    if (!result.success) {
      toast.error(result.error)
    } else {
      toast.success('Ruta eliminada')
      router.push('/rutas')
    }
  }

  return (
    <>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" className="gap-2" onClick={() => setShowEdit(true)}>
          <Pencil className="h-4 w-4" />
          Editar
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="gap-2 text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30"
          onClick={() => setShowDelete(true)}
        >
          <Trash2 className="h-4 w-4" />
          Eliminar
        </Button>
      </div>

      <RutaFormDialog
        open={showEdit}
        onOpenChange={setShowEdit}
        ruta={{ id_ruta: rutaId, nombre: rutaNombre, fecha: rutaFecha }}
      />

      <ConfirmDialog
        open={showDelete}
        onOpenChange={setShowDelete}
        title="¿Eliminar ruta?"
        description="Se eliminará la ruta. Los pedidos asignados quedarán sin ruta. Esta acción no se puede deshacer."
        confirmLabel="Eliminar ruta"
        variant="destructive"
        onConfirm={handleDelete}
        loading={deleteLoading}
      />
    </>
  )
}
