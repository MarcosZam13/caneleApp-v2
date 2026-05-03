// ClientesTable.tsx — Tabla de clientes con búsqueda server-side, filtro de morosos y paginación
'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Users, Plus, ExternalLink, Trash2, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { SearchInput } from '@/components/shared/SearchInput'
import { EmptyState } from '@/components/shared/EmptyState'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { Pagination } from '@/components/shared/Pagination'
import { ClienteFormDialog } from './ClienteFormDialog'
import { deleteCliente } from '@/actions/clientes.actions'
import type { ClienteConBalance } from '@/types/database'

interface ClientesTableProps {
  clientes: ClienteConBalance[]
  page: number
  pageSize: number
  total: number
  search: string
  morosos: boolean
}

export function ClientesTable({ clientes, page, pageSize, total, search, morosos }: ClientesTableProps) {
  const router = useRouter()
  const [localSearch, setLocalSearch] = useState(search)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [loadingDelete, setLoadingDelete] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const isFirstRender = useRef(true)

  // Búsqueda con debounce — actualiza la URL después de 400ms sin escribir
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }
    const timer = setTimeout(() => {
      const params = new URLSearchParams()
      if (localSearch.trim()) params.set('search', localSearch.trim())
      if (morosos) params.set('morosos', 'true')
      params.set('page', '1')
      router.push(`/clientes?${params.toString()}`)
    }, 400)
    return () => clearTimeout(timer)
  }, [localSearch, morosos, router])

  // Con el filtro server-side, los clientes ya vienen filtrados
  const filtered = clientes

  const morososCount = clientes.filter((c) => c.total_deuda > 0).length

  async function handleDelete() {
    if (!deletingId) return
    setLoadingDelete(true)
    const result = await deleteCliente(deletingId)
    setLoadingDelete(false)
    setDeletingId(null)
    if (result.success) {
      toast.success('Cliente eliminado')
    } else {
      toast.error(result.error)
    }
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex items-center gap-2 flex-wrap">
          <SearchInput
            value={localSearch}
            onChange={setLocalSearch}
            placeholder="Buscar por nombre..."
            className="w-72"
          />
          <Button
            variant={morosos ? 'default' : 'outline'}
            size="sm"
            onClick={() => {
              const params = new URLSearchParams()
              if (localSearch.trim()) params.set('search', localSearch.trim())
              if (!morosos) params.set('morosos', 'true')
              params.set('page', '1')
              router.push(`/clientes?${params.toString()}`)
            }}
            className="gap-2"
          >
            <AlertCircle className="h-3.5 w-3.5" />
            Morosos
            {morososCount > 0 && (
              <Badge variant="secondary" className="ml-1 text-xs">
                {morososCount}
              </Badge>
            )}
          </Button>
        </div>
        <Button onClick={() => setShowCreate(true)} className="gap-2 shrink-0">
          <Plus className="h-4 w-4" />
          Nuevo cliente
        </Button>
      </div>

      {/* Tabla */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No se encontraron clientes"
          description={localSearch ? `No hay resultados para "${localSearch}"` : 'Agrega el primer cliente para comenzar'}
          action={
            !localSearch ? (
              <Button onClick={() => setShowCreate(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                Nuevo cliente
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Nombre</TableHead>
                <TableHead>Teléfono</TableHead>
                <TableHead>Email</TableHead>
                <TableHead className="text-right">Deuda pendiente</TableHead>
                <TableHead className="w-20" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((cliente) => (
                <TableRow key={cliente.id_cliente} className="hover:bg-muted/30 group">
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{cliente.nombre}</span>
                      {cliente.total_deuda > 0 && (
                        <Badge variant="outline" className="text-xs bg-red-50 text-red-700 border-red-200">
                          moroso
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {cliente.telefono ?? '—'}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {cliente.email ?? '—'}
                  </TableCell>
                  <TableCell className="text-right">
                    {cliente.total_deuda > 0 ? (
                      <span className="font-medium text-destructive">
                        ₡{Number(cliente.total_deuda).toLocaleString('es-CR')}
                      </span>
                    ) : (
                      <span className="text-muted-foreground text-sm">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        nativeButton={false}
                        render={<Link href={`/clientes/${cliente.id_cliente}`} />}
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => setDeletingId(cliente.id_cliente)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Pagination
        page={page}
        pageSize={pageSize}
        total={total}
        basePath="/clientes"
        searchParams={{
          ...(localSearch.trim() ? { search: localSearch.trim() } : {}),
          ...(morosos ? { morosos: 'true' } : {}),
        }}
      />

      <ClienteFormDialog open={showCreate} onOpenChange={setShowCreate} />

      <ConfirmDialog
        open={!!deletingId}
        onOpenChange={(open) => !open && setDeletingId(null)}
        title="Eliminar cliente"
        description="Esta acción no se puede deshacer. ¿Estás seguro de que quieres eliminar este cliente?"
        confirmLabel="Eliminar"
        onConfirm={handleDelete}
        loading={loadingDelete}
      />
    </div>
  )
}
