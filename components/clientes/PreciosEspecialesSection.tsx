// PreciosEspecialesSection.tsx — Gestión de precios especiales por cliente
'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Tag, Pencil, X, Check, ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { setPrecioEspecial, eliminarPrecioEspecial } from '@/actions/productos.actions'

type ProductoConPrecio = {
  id_producto: string
  nombre: string
  peso: string | null
  precio_base: number | null
  precio_efectivo: number
  tiene_precio_especial: boolean
}

interface PreciosEspecialesSectionProps {
  idCliente: string
  productos: ProductoConPrecio[]
}

export function PreciosEspecialesSection({ idCliente, productos }: PreciosEspecialesSectionProps) {
  const [collapsed, setCollapsed] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [loadingId, setLoadingId] = useState<string | null>(null)

  function startEdit(producto: ProductoConPrecio) {
    setEditingId(producto.id_producto)
    // Precarga el precio especial actual o el precio base para editar desde ahí
    setEditValue(String(producto.precio_efectivo))
  }

  function cancelEdit() {
    setEditingId(null)
    setEditValue('')
  }

  async function handleSave(idProducto: string) {
    const precio = parseFloat(editValue)
    if (isNaN(precio) || precio <= 0) {
      toast.error('Ingresa un precio válido mayor a 0')
      return
    }

    setLoadingId(idProducto)
    const result = await setPrecioEspecial(idCliente, idProducto, precio)
    setLoadingId(null)

    if (result.success) {
      toast.success('Precio especial guardado')
      cancelEdit()
    } else {
      toast.error(result.error)
    }
  }

  async function handleRemove(idProducto: string) {
    setLoadingId(idProducto)
    const result = await eliminarPrecioEspecial(idCliente, idProducto)
    setLoadingId(null)

    if (result.success) {
      toast.success('Precio especial eliminado')
    } else {
      toast.error(result.error)
    }
  }

  const especiales = productos.filter((p) => p.tiene_precio_especial)

  return (
    <Card className="lg:col-span-3">
      <CardHeader className="pb-3">
        <button
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center justify-between w-full text-left"
        >
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Tag className="h-4 w-4 text-primary" />
            Precios especiales
            {especiales.length > 0 && (
              <Badge variant="secondary" className="text-xs">
                {especiales.length} activo{especiales.length !== 1 ? 's' : ''}
              </Badge>
            )}
          </CardTitle>
          {collapsed ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          )}
        </button>
      </CardHeader>

      {!collapsed && (
        <CardContent>
          {productos.length === 0 ? (
            <p className="text-sm text-muted-foreground">No hay productos disponibles</p>
          ) : (
            <div className="rounded-lg border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/50 border-b">
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground">Producto</th>
                    <th className="text-right px-3 py-2 font-medium text-muted-foreground">Precio base</th>
                    <th className="text-right px-3 py-2 font-medium text-muted-foreground">Precio especial</th>
                    <th className="w-20" />
                  </tr>
                </thead>
                <tbody>
                  {productos.map((producto) => (
                    <tr key={producto.id_producto} className="border-b last:border-0 hover:bg-muted/30 group">
                      <td className="px-3 py-2.5">
                        <span className="font-medium">{producto.nombre}</span>
                        {producto.peso && (
                          <span className="text-muted-foreground ml-1 text-xs">({producto.peso})</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-right text-muted-foreground">
                        ₡{Number(producto.precio_base ?? 0).toLocaleString('es-CR')}
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        {editingId === producto.id_producto ? (
                          // Campo de edición inline
                          <div className="flex items-center justify-end gap-1.5">
                            <span className="text-muted-foreground text-xs">₡</span>
                            <Input
                              type="number"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              className="w-28 h-7 text-right text-sm"
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSave(producto.id_producto)
                                if (e.key === 'Escape') cancelEdit()
                              }}
                            />
                          </div>
                        ) : producto.tiene_precio_especial ? (
                          <span className="font-semibold text-primary">
                            ₡{Number(producto.precio_efectivo).toLocaleString('es-CR')}
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-xs italic">Sin precio especial</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center justify-end gap-1">
                          {editingId === producto.id_producto ? (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-green-600 hover:text-green-700 hover:bg-green-50"
                                onClick={() => handleSave(producto.id_producto)}
                                disabled={loadingId === producto.id_producto}
                              >
                                <Check className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={cancelEdit}
                              >
                                <X className="h-3.5 w-3.5" />
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={() => startEdit(producto)}
                                disabled={loadingId === producto.id_producto}
                                title="Editar precio especial"
                              >
                                <Pencil className="h-3 w-3" />
                              </Button>
                              {producto.tiene_precio_especial && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive hover:bg-destructive/10"
                                  onClick={() => handleRemove(producto.id_producto)}
                                  disabled={loadingId === producto.id_producto}
                                  title="Quitar precio especial"
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  )
}
