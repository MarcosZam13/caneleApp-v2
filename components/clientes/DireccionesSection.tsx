// DireccionesSection.tsx — Sección interactiva de direcciones en el detalle del cliente
'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { MapPin, Plus, Pencil, Trash2, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { DireccionFormDialog } from './DireccionFormDialog'
import { eliminarDireccion } from '@/actions/clientes.actions'

type Direccion = {
  id_direccion: string
  direccion_texto: string | null
  Provincia: string | null
  Canton: string | null
  Distrito: string | null
  hora_inicio: string | null
  hora_fin: string | null
  activa: boolean | null
}

interface DireccionesSectionProps {
  idCliente: string
  direcciones: Direccion[]
}

export function DireccionesSection({ idCliente, direcciones }: DireccionesSectionProps) {
  const [showAdd, setShowAdd] = useState(false)
  const [editing, setEditing] = useState<Direccion | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [loadingDelete, setLoadingDelete] = useState(false)

  async function handleDelete() {
    if (!deletingId) return
    setLoadingDelete(true)
    const result = await eliminarDireccion(deletingId, idCliente)
    setLoadingDelete(false)
    setDeletingId(null)

    if (result.success) {
      toast.success('Dirección eliminada')
    } else {
      toast.error(result.error)
    }
  }

  return (
    <>
      <Card className="lg:col-span-1">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <MapPin className="h-4 w-4 text-primary" />
              Direcciones ({direcciones.length})
            </CardTitle>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 gap-1 text-xs"
              onClick={() => setShowAdd(true)}
            >
              <Plus className="h-3.5 w-3.5" />
              Agregar
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {direcciones.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-sm text-muted-foreground">Sin direcciones registradas</p>
              <Button
                size="sm"
                variant="outline"
                className="mt-3 gap-1.5"
                onClick={() => setShowAdd(true)}
              >
                <Plus className="h-3.5 w-3.5" />
                Agregar dirección
              </Button>
            </div>
          ) : (
            direcciones.map((dir) => (
              <div
                key={dir.id_direccion}
                className="group p-3 rounded-lg bg-muted/50 text-sm relative"
              >
                {/* Botones de acción visibles al hacer hover */}
                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => setEditing(dir)}
                  >
                    <Pencil className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => setDeletingId(dir.id_direccion)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>

                <p className="font-medium text-foreground pr-14">{dir.direccion_texto}</p>

                {(dir.Canton || dir.Provincia) && (
                  <p className="text-muted-foreground mt-0.5">
                    {[dir.Distrito, dir.Canton, dir.Provincia].filter(Boolean).join(', ')}
                  </p>
                )}

                {(dir.hora_inicio || dir.hora_fin) && (
                  <p className="text-muted-foreground mt-1 flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {dir.hora_inicio} – {dir.hora_fin}
                  </p>
                )}

                {!dir.activa && (
                  <Badge variant="outline" className="mt-1.5 text-xs text-muted-foreground">
                    Inactiva
                  </Badge>
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Dialog para agregar */}
      <DireccionFormDialog
        open={showAdd}
        onOpenChange={setShowAdd}
        idCliente={idCliente}
      />

      {/* Dialog para editar */}
      <DireccionFormDialog
        open={!!editing}
        onOpenChange={(open) => { if (!open) setEditing(null) }}
        idCliente={idCliente}
        direccion={editing ?? undefined}
      />

      {/* Confirmación de eliminación */}
      <ConfirmDialog
        open={!!deletingId}
        onOpenChange={(open) => { if (!open) setDeletingId(null) }}
        title="Eliminar dirección"
        description="Esta acción no se puede deshacer. ¿Estás seguro de que quieres eliminar esta dirección?"
        confirmLabel="Eliminar"
        onConfirm={handleDelete}
        loading={loadingDelete}
      />
    </>
  )
}
