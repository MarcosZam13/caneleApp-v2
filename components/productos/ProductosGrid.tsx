// ProductosGrid.tsx — Grid de tarjetas de productos con toggle de disponibilidad y edición
'use client'

import { useState, useMemo } from 'react'
import { toast } from 'sonner'
import { Package, Plus, Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { SearchInput } from '@/components/shared/SearchInput'
import { EmptyState } from '@/components/shared/EmptyState'
import { ProductoFormDialog } from './ProductoFormDialog'
import { toggleProductoDisponible } from '@/actions/productos.actions'
import type { Producto } from '@/types/database'

interface ProductosGridProps {
  productos: Producto[]
}

export function ProductosGrid({ productos }: ProductosGridProps) {
  const [search, setSearch] = useState('')
  const [editando, setEditando] = useState<Producto | null>(null)
  const [showCreate, setShowCreate] = useState(false)

  const filtered = useMemo(() => {
    if (!search.trim()) return productos
    const q = search.toLowerCase()
    return productos.filter(p =>
      p.nombre.toLowerCase().includes(q) ||
      p.peso?.toLowerCase().includes(q)
    )
  }, [productos, search])

  async function handleToggle(id: string, disponible: boolean) {
    const result = await toggleProductoDisponible(id, disponible)
    if (!result.success) toast.error(result.error)
    else toast.success(disponible ? 'Producto activado' : 'Producto desactivado')
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Buscar producto..."
          className="w-72"
        />
        <Button onClick={() => setShowCreate(true)} className="gap-2 shrink-0">
          <Plus className="h-4 w-4" />
          Nuevo producto
        </Button>
      </div>

      <p className="text-sm text-muted-foreground">
        {filtered.length} de {productos.length} producto{productos.length !== 1 ? 's' : ''}
      </p>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Package}
          title="No hay productos"
          description={search ? `No hay resultados para "${search}"` : 'Agrega productos al catálogo'}
          action={
            !search ? (
              <Button onClick={() => setShowCreate(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                Nuevo producto
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((producto) => (
            <Card
              key={producto.id_producto}
              className={`border transition-opacity ${!producto.disponible ? 'opacity-60' : ''}`}
            >
              <CardContent className="pt-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{producto.nombre}</p>
                    {producto.peso && (
                      <p className="text-xs text-muted-foreground">{producto.peso}</p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0"
                    onClick={() => setEditando(producto)}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    {producto.precio_base ? (
                      <span className="text-base font-bold text-primary">
                        ₡{Number(producto.precio_base).toLocaleString('es-CR')}
                      </span>
                    ) : (
                      <span className="text-sm text-muted-foreground italic">Sin precio base</span>
                    )}
                  </div>
                  <Badge
                    variant="outline"
                    className={producto.disponible
                      ? 'bg-green-50 text-green-700 border-green-200 text-xs'
                      : 'bg-muted text-muted-foreground text-xs'
                    }
                  >
                    {producto.disponible ? 'Disponible' : 'No disponible'}
                  </Badge>
                </div>

                <div className="flex items-center justify-between pt-1 border-t">
                  <span className="text-xs text-muted-foreground">Disponible para pedidos</span>
                  <Switch
                    checked={producto.disponible ?? false}
                    onCheckedChange={(v) => handleToggle(producto.id_producto, v)}
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <ProductoFormDialog
        open={showCreate}
        onOpenChange={setShowCreate}
      />
      {editando && (
        <ProductoFormDialog
          open={!!editando}
          onOpenChange={(open) => !open && setEditando(null)}
          producto={editando}
        />
      )}
    </div>
  )
}
