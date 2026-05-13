// RutasGrid.tsx — Grid de tarjetas de rutas con filtro server-side y paginación
'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { MapPin, Plus, ChevronRight, TrendingUp, ShoppingBag, Trash2, Pencil } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { EmptyState } from '@/components/shared/EmptyState'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Pagination } from '@/components/shared/Pagination'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { RutaFormDialog } from './RutaFormDialog'
import { deleteRuta } from '@/actions/rutas.actions'
import type { Ruta } from '@/types/database'

interface RutasGridProps {
  rutas: Ruta[]
  page: number
  pageSize: number
  total: number
  estadoActivo: string
}

export function RutasGrid({ rutas, page, pageSize, total, estadoActivo }: RutasGridProps) {
  const router = useRouter()
  const [showCreate, setShowCreate] = useState(false)
  const [editRuta, setEditRuta] = useState<Ruta | null>(null)
  const [deleteRutaId, setDeleteRutaId] = useState<string | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  async function handleDeleteRuta(id: string) {
    setDeleteLoading(true)
    const result = await deleteRuta(id)
    setDeleteLoading(false)
    setDeleteRutaId(null)
    if (!result.success) toast.error(result.error)
    else toast.success('Ruta eliminada')
  }

  function handleEstadoChange(nuevoEstado: string) {
    const params = new URLSearchParams()
    if (nuevoEstado) params.set('estado', nuevoEstado)
    params.set('page', '1')
    router.push(`/rutas?${params.toString()}`)
  }

  const tabValue = estadoActivo || 'todas'

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <Tabs value={tabValue} onValueChange={(v) => handleEstadoChange(v === 'todas' ? '' : v)}>
          <TabsList>
            <TabsTrigger value="todas">Todas</TabsTrigger>
            <TabsTrigger value="pendiente">Pendiente</TabsTrigger>
            <TabsTrigger value="en_curso">En curso</TabsTrigger>
            <TabsTrigger value="completada">Completada</TabsTrigger>
          </TabsList>
        </Tabs>
        <Button onClick={() => setShowCreate(true)} className="gap-2 shrink-0">
          <Plus className="h-4 w-4" />
          Nueva ruta
        </Button>
      </div>

      {/* Grid de rutas */}
      {rutas.length === 0 ? (
        <EmptyState
          icon={MapPin}
          title="No hay rutas"
          description={estadoActivo ? `No hay rutas con estado "${estadoActivo}"` : 'Crea la primera ruta para comenzar'}
          action={
            !estadoActivo ? (
              <Button onClick={() => setShowCreate(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                Nueva ruta
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {rutas.map((ruta) => (
            <RutaCard key={ruta.id_ruta} ruta={ruta} onDelete={(id) => setDeleteRutaId(id)} onEdit={(r) => setEditRuta(r)} />
          ))}
        </div>
      )}

      <Pagination
        page={page}
        pageSize={pageSize}
        total={total}
        basePath="/rutas"
        searchParams={estadoActivo ? { estado: estadoActivo } : {}}
      />

      <RutaFormDialog open={showCreate} onOpenChange={setShowCreate} />
      <RutaFormDialog
        open={!!editRuta}
        onOpenChange={(open) => { if (!open) setEditRuta(null) }}
        ruta={editRuta ?? undefined}
      />

      <ConfirmDialog
        open={deleteRutaId !== null}
        onOpenChange={(open) => { if (!open) setDeleteRutaId(null) }}
        title="¿Eliminar ruta?"
        description="Se eliminará la ruta. Los pedidos asignados quedarán sin ruta. Esta acción no se puede deshacer."
        confirmLabel="Eliminar ruta"
        variant="destructive"
        onConfirm={() => { if (deleteRutaId) handleDeleteRuta(deleteRutaId) }}
        loading={deleteLoading}
      />
    </div>
  )
}

function RutaCard({ ruta, onDelete, onEdit }: { ruta: Ruta; onDelete: (id: string) => void; onEdit: (ruta: Ruta) => void }) {
  const fecha = ruta.fecha
    ? format(parseISO(ruta.fecha + 'T12:00:00'), "EEEE dd 'de' MMMM", { locale: es })
    : '—'

  return (
    <div className="relative group/card">
      <Link href={`/rutas/${ruta.id_ruta}`}>
        <Card className="hover:shadow-md transition-all hover:-translate-y-0.5 cursor-pointer border">
          <CardHeader className="pb-2 flex flex-row items-start justify-between">
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-foreground truncate">{ruta.nombre ?? 'Sin nombre'}</p>
              <p className="text-xs text-muted-foreground capitalize mt-0.5">{fecha}</p>
            </div>
            <StatusBadge status={ruta.estado ?? 'pendiente'} className="shrink-0 ml-2" />
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-2 mt-1">
              <div className="flex flex-col items-center p-2 rounded-lg bg-sky-100 dark:bg-sky-900/40">
                <ShoppingBag className="h-3.5 w-3.5 text-sky-600 dark:text-sky-400 mb-1" />
                <span className="text-base font-bold text-sky-700 dark:text-sky-300">{ruta.total_pedidos ?? 0}</span>
                <span className="text-[10px] text-sky-600 dark:text-sky-400">pedidos</span>
              </div>
              <div className="flex flex-col items-center p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/40">
                <TrendingUp className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 mb-1" />
                <span className="text-base font-bold text-emerald-700 dark:text-emerald-300">
                  ₡{((Number(ruta.total_venta ?? 0)) / 1000).toFixed(0)}k
                </span>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400">ventas</span>
              </div>
              <div className="flex flex-col items-center p-2 rounded-lg bg-muted justify-center">
                <ChevronRight className="h-4 w-4 text-muted-foreground group-hover/card:text-foreground transition-colors" />
              </div>
            </div>
          </CardContent>
        </Card>
      </Link>
      <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover/card:opacity-100 transition-all z-10">
        <button
          type="button"
          className="p-1.5 rounded-md bg-background/80 hover:bg-accent text-muted-foreground hover:text-foreground"
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); onEdit(ruta) }}
          title="Editar ruta"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          className="p-1.5 rounded-md bg-background/80 hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDelete(ruta.id_ruta) }}
          title="Eliminar ruta"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
}
