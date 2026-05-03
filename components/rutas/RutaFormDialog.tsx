// RutaFormDialog.tsx — Sheet para crear una nueva ruta
'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from '@/components/ui/sheet'
import { createRuta } from '@/actions/rutas.actions'

interface RutaFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function RutaFormDialog({ open, onOpenChange }: RutaFormDialogProps) {
  const today = new Date().toISOString().split('T')[0]
  const [form, setForm] = useState({ nombre: '', fecha: today })
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const result = await createRuta(form)
    setLoading(false)

    if (result.success) {
      toast.success('Ruta creada correctamente')
      onOpenChange(false)
      setForm({ nombre: '', fecha: today })
    } else {
      toast.error(result.error)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Nueva ruta</SheetTitle>
          <SheetDescription>Crea una ruta de entrega para asignar pedidos.</SheetDescription>
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
              {loading ? 'Creando...' : 'Crear ruta'}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  )
}
