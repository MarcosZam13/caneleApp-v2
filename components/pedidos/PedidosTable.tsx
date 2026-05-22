// PedidosTable.tsx — Tabla de pedidos con filtros server-side, paginación y confirmación de entrega
'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { toast } from 'sonner'
import { ShoppingBag, ExternalLink, CheckCircle2, Wallet, X, Trash2, Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { SearchInput } from '@/components/shared/SearchInput'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { EmptyState } from '@/components/shared/EmptyState'
import { Pagination } from '@/components/shared/Pagination'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { marcarPagado, marcarEntregado, deletePedido } from '@/actions/pedidos.actions'
import { EditarPedidoSheet } from './EditarPedidoSheet'

type PedidoRow = {
  id_pedido: string
  fecha: string | null
  total: number | null
  pagado: boolean | null
  entregado: boolean | null
  notas: string | null
  cliente: { nombre: string; telefono: string | null } | null
  ruta: { nombre: string | null; fecha: string | null } | null
}

interface PedidosTableProps {
  pedidos: PedidoRow[]
  page: number
  pageSize: number
  total: number
  search: string
  estado: string
  idRuta: string
  fechaDesde: string
  fechaHasta: string
  rutas: { id_ruta: string; nombre: string | null }[]
  clientes: { id_cliente: string; nombre: string }[]
}

export function PedidosTable({
  pedidos, page, pageSize, total, search,
  estado, idRuta, fechaDesde, fechaHasta, rutas, clientes,
}: PedidosTableProps) {
  const router = useRouter()
  const [localSearch, setLocalSearch] = useState(search)
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [confirmEntregar, setConfirmEntregar] = useState<{ id: string; nombre: string } | null>(null)
  const [confirmPagar, setConfirmPagar] = useState<{ id: string; nombre: string } | null>(null)
  const [confirmLoading, setConfirmLoading] = useState(false)
  const [deletePedidoId, setDeletePedidoId] = useState<string | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const isFirstRender = useRef(true)

  // Construye la URL preservando todos los filtros activos más overrides
  function buildUrl(overrides: Record<string, string>) {
    const params = new URLSearchParams()
    const base: Record<string, string> = { page: '1' }
    if (localSearch.trim()) base.search = localSearch.trim()
    if (estado) base.estado = estado
    if (idRuta) base.ruta = idRuta
    if (fechaDesde) base.fechaDesde = fechaDesde
    if (fechaHasta) base.fechaHasta = fechaHasta
    const merged = { ...base, ...overrides }
    for (const [k, v] of Object.entries(merged)) {
      if (v) params.set(k, v)
    }
    return `/pedidos?${params.toString()}`
  }

  // Debounce de búsqueda — navega 400ms después de dejar de escribir
  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return }
    const timer = setTimeout(() => {
      const params = new URLSearchParams()
      if (localSearch.trim()) params.set('search', localSearch.trim())
      if (estado) params.set('estado', estado)
      if (idRuta) params.set('ruta', idRuta)
      if (fechaDesde) params.set('fechaDesde', fechaDesde)
      if (fechaHasta) params.set('fechaHasta', fechaHasta)
      params.set('page', '1')
      router.push(`/pedidos?${params.toString()}`)
    }, 400)
    return () => clearTimeout(timer)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localSearch])

  async function handleEntregado(id: string) {
    setConfirmLoading(true)
    const result = await marcarEntregado(id)
    setConfirmLoading(false)
    setConfirmEntregar(null)
    if (!result.success) toast.error(result.error)
    else toast.success('Marcado como entregado')
  }

  async function handlePagado(id: string) {
    setConfirmLoading(true)
    const result = await marcarPagado(id)
    setConfirmLoading(false)
    setConfirmPagar(null)
    if (!result.success) toast.error(result.error)
    else toast.success('Marcado como pagado')
  }

  async function handleDeletePedido(id: string) {
    setDeleteLoading(true)
    const result = await deletePedido(id)
    setDeleteLoading(false)
    setDeletePedidoId(null)
    if (!result.success) toast.error(result.error)
    else toast.success('Pedido eliminado')
  }

  function getStatus(p: PedidoRow): string {
    if (!p.entregado) return 'pendiente'
    if (!p.pagado) return 'moroso'
    return 'pagado'
  }

  const hasFilters = !!(estado || idRuta || fechaDesde || fechaHasta || localSearch.trim())

  // Parámetros que Pagination usa para preservar los filtros al paginar
  const paginationParams: Record<string, string> = {}
  if (localSearch.trim()) paginationParams.search = localSearch.trim()
  if (estado) paginationParams.estado = estado
  if (idRuta) paginationParams.ruta = idRuta
  if (fechaDesde) paginationParams.fechaDesde = fechaDesde
  if (fechaHasta) paginationParams.fechaHasta = fechaHasta

  return (
    <div className="space-y-4">
      {/* Tabs de estado — cada uno filtra server-side */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <Tabs value={estado || ''} onValueChange={(v) => router.push(buildUrl({ estado: v, page: '1' }))}>
          <TabsList>
            <TabsTrigger value="">Todos</TabsTrigger>
            <TabsTrigger value="pendiente">Sin entregar</TabsTrigger>
            <TabsTrigger value="moroso">Morosos</TabsTrigger>
            <TabsTrigger value="completado">Completados</TabsTrigger>
          </TabsList>
        </Tabs>
        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 text-muted-foreground h-8"
            onClick={() => {
              setLocalSearch('')
              router.push('/pedidos')
            }}
          >
            <X className="h-3.5 w-3.5" />
            Limpiar filtros
          </Button>
        )}
      </div>

      {/* Filtros secundarios: búsqueda, ruta, fechas */}
      <div className="flex flex-wrap gap-3">
        <SearchInput
          value={localSearch}
          onChange={setLocalSearch}
          placeholder="Buscar por cliente..."
          className="w-full sm:w-64"
        />

        <Select
          value={idRuta || 'todas'}
          onValueChange={(v) => router.push(buildUrl({ ruta: v === 'todas' ? '' : (v ?? ''), page: '1' }))}
        >
          <SelectTrigger className="w-full sm:w-52">
            <SelectValue placeholder="Todas las rutas" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas las rutas</SelectItem>
            {rutas.map((r) => (
              <SelectItem key={r.id_ruta} value={r.id_ruta ?? ''}>
                {r.nombre ?? r.id_ruta}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex items-center gap-2">
          <Input
            type="date"
            value={fechaDesde}
            onChange={(e) => router.push(buildUrl({ fechaDesde: e.target.value, page: '1' }))}
            className="w-36 text-sm"
            title="Fecha desde"
          />
          <span className="text-muted-foreground text-sm">—</span>
          <Input
            type="date"
            value={fechaHasta}
            onChange={(e) => router.push(buildUrl({ fechaHasta: e.target.value, page: '1' }))}
            className="w-36 text-sm"
            title="Fecha hasta"
          />
        </div>
      </div>

      {pedidos.length === 0 ? (
        <EmptyState
          icon={ShoppingBag}
          title="No hay pedidos"
          description={hasFilters ? 'No hay resultados para los filtros seleccionados' : 'No hay pedidos registrados'}
        />
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Cliente</TableHead>
                <TableHead className="hidden sm:table-cell">Fecha</TableHead>
                <TableHead className="hidden sm:table-cell">Ruta</TableHead>
                <TableHead className="text-right hidden sm:table-cell">Total</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="w-28" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {pedidos.map((pedido) => (
                <TableRow key={pedido.id_pedido} className="hover:bg-muted/30 group">
                  <TableCell>
                    <p className="font-medium">{pedido.cliente?.nombre ?? '—'}</p>
                    <p className="text-xs text-muted-foreground sm:hidden font-medium">
                      ₡{Number(pedido.total ?? 0).toLocaleString('es-CR')}
                    </p>
                    {pedido.notas && (
                      <p className="text-xs text-muted-foreground truncate max-w-48">{pedido.notas}</p>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm whitespace-nowrap hidden sm:table-cell">
                    {pedido.fecha
                      ? format(parseISO(pedido.fecha + 'T12:00:00'), 'dd MMM yyyy', { locale: es })
                      : '—'}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm hidden sm:table-cell">
                    {pedido.ruta?.nombre ?? <span className="italic">Sin ruta</span>}
                  </TableCell>
                  <TableCell className="text-right font-medium hidden sm:table-cell">
                    ₡{Number(pedido.total ?? 0).toLocaleString('es-CR')}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={getStatus(pedido)} />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                      {!pedido.entregado && (
                        <Button
                          size="sm" variant="outline" className="h-7 text-xs gap-1"
                          onClick={() => setConfirmEntregar({ id: pedido.id_pedido, nombre: pedido.cliente?.nombre ?? 'Cliente desconocido' })}
                          disabled={confirmLoading && confirmEntregar?.id === pedido.id_pedido}
                        >
                          <CheckCircle2 className="h-3 w-3" /> Entregar
                        </Button>
                      )}
                      {!pedido.pagado && (
                        <Button
                          size="sm" className="h-7 text-xs gap-1 bg-green-600 hover:bg-green-700"
                          onClick={() => setConfirmPagar({ id: pedido.id_pedido, nombre: pedido.cliente?.nombre ?? 'Cliente desconocido' })}
                          disabled={confirmLoading && confirmPagar?.id === pedido.id_pedido}
                        >
                          <Wallet className="h-3 w-3" /> Cobrar
                        </Button>
                      )}
                      <Button
                        variant="ghost" size="icon" className="h-7 w-7"
                        nativeButton={false}
                        render={<Link href={`/pedidos/${pedido.id_pedido}`} />}
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Button>
                      <EditarPedidoSheet
                        idPedido={pedido.id_pedido}
                        clientes={clientes}
                        rutas={rutas.map(r => ({ id_ruta: r.id_ruta, nombre: r.nombre, fecha: null }))}
                        iconOnly
                      />
                      <Button
                        variant="ghost" size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        onClick={() => setDeletePedidoId(pedido.id_pedido)}
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
        basePath="/pedidos"
        searchParams={paginationParams}
      />

      <ConfirmDialog
        open={confirmEntregar !== null}
        onOpenChange={(open) => { if (!open) setConfirmEntregar(null) }}
        title="¿Marcar como entregado?"
        description={`Confirma que el pedido de ${confirmEntregar?.nombre ?? ''} fue entregado. Una vez marcado no se puede deshacer desde aquí.`}
        confirmLabel="Sí, entregado"
        variant="default"
        onConfirm={() => { if (confirmEntregar) handleEntregado(confirmEntregar.id) }}
        loading={confirmLoading}
      />
      <ConfirmDialog
        open={confirmPagar !== null}
        onOpenChange={(open) => { if (!open) setConfirmPagar(null) }}
        title="¿Marcar como pagado?"
        description={`Confirma que ${confirmPagar?.nombre ?? ''} pagó este pedido.`}
        confirmLabel="Sí, pagado"
        variant="default"
        onConfirm={() => { if (confirmPagar) handlePagado(confirmPagar.id) }}
        loading={confirmLoading}
      />

      <ConfirmDialog
        open={deletePedidoId !== null}
        onOpenChange={(open) => { if (!open) setDeletePedidoId(null) }}
        title="¿Eliminar pedido?"
        description="Se eliminará el pedido completo, sus productos, pagos asociados y se actualizarán los contadores de la ruta. Esta acción no se puede deshacer."
        confirmLabel="Eliminar pedido"
        variant="destructive"
        onConfirm={() => { if (deletePedidoId) handleDeletePedido(deletePedidoId) }}
        loading={deleteLoading}
      />
    </div>
  )
}
