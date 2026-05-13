// RutaFormDialog.tsx — Sheet para crear o editar una ruta
'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from '@/components/ui/sheet'
import { createRuta, updateRuta } from '@/actions/rutas.actions'

interface RutaFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  ruta?: { id_ruta: string; nombre: string | null; fecha: string | null }
}

export function RutaFormDialog({ open, onOpenChange, ruta }: RutaFormDialogProps) {
  const today = new Date().toISOString().split('T')[0]
  const [form, setForm] = useState({ nombre: '', fecha: today })
  const [loading, setLoading] = useState(false)

  const isEditing = !!ruta

  useEffect(() => {
    if (open) {
      setForm({
        nombre: ruta?.nombre ?? '',
        fecha: ruta?.fecha ?? today,
      })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    const result = isEditing
      ? await updateRuta(ruta!.id_ruta, form)
      : await createRuta(form)

    setLoading(false)

    if (result.success) {
      toast.success(isEditing ? 'Ruta actualizada' : 'Ruta creada correctamente')
      onOpenChange(false)
    } else {
      toast.error(result.error)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{isEditing ? 'Editar ruta' : 'Nueva ruta'}</SheetTitle>
          <SheetDescription>
            {isEditing ? 'Modifica el nombre o la fecha de la ruta.' : 'Crea una ruta de entrega para asignar pedidos.'}
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-6">
          <div className="space-y-2">
            <Label htmlFor="nombre">Nombre de la ruta *</Label>
            <Input
              id="nombre"
              value={form.nombre}
              onChange={(e) => setForm(p => ({ ...p, nombre: e.target.value }))}
              placeholder="Ej: Ruta Centro, Ruta Norte..."
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="fecha">Fecha *</Label>
            <Input
              id="fecha"
              type="date"
              value={form.fecha}
              onChange={(e) => setForm(p => ({ ...p, fecha: e.target.value }))}
              required
            />
          </div>

          <SheetFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (isEditing ? 'Guardando...' : 'Creando...') : (isEditing ? 'Guardar cambios' : 'Crear ruta')}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  )
}
