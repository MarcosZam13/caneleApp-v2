// ProductoFormDialog.tsx — Sheet para crear y editar productos del catálogo
'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from '@/components/ui/sheet'
import { createProducto, updateProducto } from '@/actions/productos.actions'
import type { Producto } from '@/types/database'

interface ProductoFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  producto?: Producto
}

const emptyForm = { nombre: '', peso: '', precio_base: '' }

export function ProductoFormDialog({ open, onOpenChange, producto }: ProductoFormDialogProps) {
  const isEdit = !!producto
  const [form, setForm] = useState({
    nombre: producto?.nombre ?? '',
    peso: producto?.peso ?? '',
    precio_base: producto?.precio_base?.toString() ?? '',
  })
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    const data = {
      nombre: form.nombre,
      peso: form.peso || null,
      precio_base: form.precio_base ? Number(form.precio_base) : null,
      disponible: true,
    }

    const result = isEdit
      ? await updateProducto(producto.id_producto, data)
      : await createProducto(data)

    setLoading(false)

    if (result.success) {
      toast.success(isEdit ? 'Producto actualizado' : 'Producto creado')
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
          <SheetTitle>{isEdit ? 'Editar producto' : 'Nuevo producto'}</SheetTitle>
          <SheetDescription>
            {isEdit ? 'Modifica los datos del producto.' : 'Completa los datos del producto.'}
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-6">
          <div className="space-y-2">
            <Label htmlFor="nombre">Nombre *</Label>
            <Input
              id="nombre"
              value={form.nombre}
              onChange={(e) => setForm(p => ({ ...p, nombre: e.target.value }))}
              placeholder="Ej: Pan de canela, Bollo..."
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="peso">Peso / Descripción</Label>
            <Input
              id="peso"
              value={form.peso}
              onChange={(e) => setForm(p => ({ ...p, peso: e.target.value }))}
              placeholder="Ej: 500g, Grande, 12 unidades..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="precio_base">Precio base (₡)</Label>
            <Input
              id="precio_base"
              type="number"
              min="0"
              step="50"
              value={form.precio_base}
              onChange={(e) => setForm(p => ({ ...p, precio_base: e.target.value }))}
              placeholder="0"
            />
            <p className="text-xs text-muted-foreground">
              Los clientes pueden tener precios especiales distintos a este.
            </p>
          </div>

          <SheetFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Crear producto'}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  )
}
