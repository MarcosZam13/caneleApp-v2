// ClienteFormDialog.tsx — Formulario de creación/edición de clientes en un Sheet lateral
'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter,
} from '@/components/ui/sheet'
import { createCliente, updateCliente } from '@/actions/clientes.actions'
import type { Cliente } from '@/types/database'

interface ClienteFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  cliente?: Cliente
}

const emptyForm = { nombre: '', telefono: '', email: '', observaciones: '' }

export function ClienteFormDialog({ open, onOpenChange, cliente }: ClienteFormDialogProps) {
  const isEdit = !!cliente
  const [form, setForm] = useState({
    nombre: cliente?.nombre ?? '',
    telefono: cliente?.telefono ?? '',
    email: cliente?.email ?? '',
    observaciones: cliente?.observaciones ?? '',
  })
  const [loading, setLoading] = useState(false)

  // Sincroniza el formulario cuando cambia el cliente o se abre el dialog
  useEffect(() => {
    setForm({
      nombre: cliente?.nombre ?? '',
      telefono: cliente?.telefono ?? '',
      email: cliente?.email ?? '',
      observaciones: cliente?.observaciones ?? '',
    })
  }, [cliente, open])

  function handleChange(field: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    const result = isEdit
      ? await updateCliente(cliente.id_cliente, form)
      : await createCliente(form)

    setLoading(false)

    if (result.success) {
      toast.success(isEdit ? 'Cliente actualizado' : 'Cliente creado correctamente')
      onOpenChange(false)
      if (!isEdit) setForm(emptyForm)
    } else {
      toast.error(result.error)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{isEdit ? 'Editar cliente' : 'Nuevo cliente'}</SheetTitle>
          <SheetDescription>
            {isEdit ? 'Modifica los datos del cliente.' : 'Completa los datos para registrar el cliente.'}
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-6">
          <div className="space-y-2">
            <Label htmlFor="nombre">Nombre *</Label>
            <Input
              id="nombre"
              value={form.nombre}
              onChange={(e) => handleChange('nombre', e.target.value)}
              placeholder="Nombre del cliente o negocio"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="telefono">Teléfono</Label>
            <Input
              id="telefono"
              value={form.telefono}
              onChange={(e) => handleChange('telefono', e.target.value)}
              placeholder="6000-0000"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={form.email}
              onChange={(e) => handleChange('email', e.target.value)}
              placeholder="correo@ejemplo.com"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="observaciones">Observaciones</Label>
            <textarea
              id="observaciones"
              value={form.observaciones}
              onChange={(e) => handleChange('observaciones', e.target.value)}
              placeholder="Notas sobre el cliente, preferencias de entrega, etc."
              rows={3}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
            />
          </div>

          <SheetFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Crear cliente'}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  )
}
