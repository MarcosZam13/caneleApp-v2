// FaltantesTable.tsx — Tabla de pedidos faltantes con tabs, badges de urgencia y acción de entrega
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { format, parseISO, isBefore, startOfDay } from 'date-fns'
import { es } from 'date-fns/locale'
import { toast } from 'sonner'
import { Package, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { EmptyState } from '@/components/shared/EmptyState'
import { Pagination } from '@/components/shared/Pagination'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { marcarEntregado } from '@/actions/pedidos.actions'
import type { FiltroFaltantes } from '@/actions/faltantes.actions'

// Tipo local para la fila de la tabla, incluye prioritaria y ruta además de PedidoConCliente
type FaltantesRow = {
  id_pedido: string
  fecha: string | null
  total: number | null
  pagado: boolean | null
  entregado: boolean | null
  prioritaria: boolean | null
  notas: string | null
  id_ruta: string | null
  cliente: { nombre: string; telefono: string | null } | null
  direccion: { direccion_texto: string | null; lat: number | null; lng: number | null } | null
  ruta: { nombre: string | null } | null
}

interface FaltantesTableProps {
  pedidos: FaltantesRow[]
  total: number
  page: number
  pageSize: number
  currentFiltro: FiltroFaltantes
  idRuta: string
  rutas: { id_ruta: string; nombre: string | null }[]
}

const filtroLabels: Record<FiltroFaltantes, string> = {
  pendientes: 'Pendientes',
  retrasados: 'Retrasados',
  historial: 'Historial',
}

export function FaltantesTable({
  pedidos,
  total,
  page,
  pageSize,
  currentFiltro,
  idRuta,
  rutas,
}: FaltantesTableProps) {
  const router = useRouter()
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [confirmEntregarId, setConfirmEntregarId] = useState<string | null>(null)
  const [confirmLoading, setConfirmLoading] = useState(false)

  // Construye la URL preservando el filtro activo y la ruta
  function buildUrl(overrides: { filtro?: string; idRuta?: string; page?: string }) {
    const params = new URLSearchParams()
    const merged = {
      filtro: currentFiltro,
      idRuta: idRuta || '',
      page: '1',
      ...overrides,
    }
    for (const [k, v] of Object.entries(merged)) {
      if (v) params.set(k, v)
    }
    return `/faltantes?${params.toString()}`
  }

  // Parámetros que se preservan al paginar
  const paginationParams: Record<string, string> = { filtro: currentFiltro }
  if (idRuta) paginationParams.idRuta = idRuta

  // Marcar un pedido como entregado con confirmación previa
  async function handleEntregado(id: string) {
    setConfirmLoading(true)
    const result = await marcarEntregado(id)
    setConfirmLoading(false)
    setConfirmEntregarId(null)
    if (!result.success) {
      toast.error(result.error)
    } else {
      toast.success('Pedido marcado como entregado')
      router.refresh() // Revalida la página porque marcarEntregado no incluye /faltantes
    }
  }

  // Determina si un pedido está retrasado (fecha anterior a hoy)
  function isRetrasado(fecha: string | null): boolean {
    if (!fecha) return false
    try {
      const fechaDate = startOfDay(parseISO(fecha + 'T12:00:00'))
      const hoy = startOfDay(new Date())
      return isBefore(fechaDate, hoy)
    } catch {
      return false
    }
  }

  // Texto descriptivo según el filtro activo
  const filtroDescription: Record<FiltroFaltantes, string> = {
    pendientes: 'Pedidos sin entregar, ordenados por fecha más próxima',
    retrasados: 'Pedidos con fecha de entrega vencida',
    historial: 'Últimos 50 pedidos entregados',
  }

  const pedidosRetrasadosCount = pedidos.filter(p => isRetrasado(p.fecha)).length

  return (
    <div className="space-y-4">
      {/* Tabs de filtro — cada uno navega server-side */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <Tabs
          value={currentFiltro}
          onValueChange={(v) => router.push(buildUrl({ filtro: v, idRuta: v === 'pendientes' ? idRuta : '', page: '1' }))}
        >
          <TabsList>
            {(['pendientes', 'retrasados', 'historial'] as FiltroFaltantes[]).map((f) => (
              <TabsTrigger key={f} value={f}>
                {filtroLabels[f]}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {currentFiltro === 'pendientes' && (
          <div className="flex items-center gap-2">
            <Select
              value={idRuta || 'todas'}
              onValueChange={(v) => router.push(buildUrl({ idRuta: v === 'todas' ? '' : v, page: '1' }))}
            >
              <SelectTrigger className="w-full sm:w-52">
                <SelectValue placeholder="Todas las rutas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas las rutas</SelectItem>
                {rutas.map((r) => (
                  <SelectItem key={r.id_ruta} value={r.id_ruta}>
                    {r.nombre ?? r.id_ruta}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Texto descriptivo del filtro activo */}
      <p className="text-sm text-muted-foreground">
        {filtroDescription[currentFiltro]}
        {currentFiltro === 'pendientes' && pedidosRetrasadosCount > 0 && (
          <span className="text-amber-600 font-medium">
            {' · '}{pedidosRetrasadosCount} con fecha vencida
          </span>
        )}
      </p>

      {pedidos.length === 0 ? (
        <EmptyState
          icon={Package}
          title={`No hay pedidos ${filtroLabels[currentFiltro].toLowerCase()}`}
          description={
            currentFiltro === 'pendientes'
              ? 'Todos los pedidos han sido entregados'
              : currentFiltro === 'retrasados'
                ? 'No hay pedidos con fecha de entrega vencida'
                : 'No hay pedidos en el historial de entregas'
          }
        />
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Cliente</TableHead>
                <TableHead>Dirección</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Ruta</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Prioridad</TableHead>
                <TableHead className="w-24" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {pedidos.map((pedido) => (
                <TableRow key={pedido.id_pedido} className="hover:bg-muted/30 group">
                  <TableCell>
                    <p className="font-medium">{pedido.cliente?.nombre ?? '—'}</p>
                    {pedido.notas && (
                      <p className="text-xs text-muted-foreground truncate max-w-48">{pedido.notas}</p>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm max-w-48 truncate">
                    {pedido.direccion?.direccion_texto ?? '—'}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm whitespace-nowrap">
                    {pedido.fecha
                      ? format(parseISO(pedido.fecha + 'T12:00:00'), 'dd MMM yyyy', { locale: es })
                      : '—'}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {pedido.ruta?.nombre ?? <span className="italic">Sin ruta</span>}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    ₡{Number(pedido.total ?? 0).toLocaleString('es-CR')}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      {pedido.prioritaria && (
                        <Badge className="bg-red-100 text-red-800 border-red-200 text-xs font-medium">
                          Urgente
                        </Badge>
                      )}
                      {isRetrasado(pedido.fecha) && (
                        <Badge className="bg-amber-100 text-amber-800 border-amber-200 text-xs font-medium">
                          Retrasado
                        </Badge>
                      )}
                      {!pedido.prioritaria && !isRetrasado(pedido.fecha) && (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs gap-1"
                        onClick={() => setConfirmEntregarId(pedido.id_pedido)}
                        disabled={loadingId === pedido.id_pedido}
                      >
                        {loadingId === pedido.id_pedido ? (
                          <>Procesando...</>
                        ) : (
                          <>
                            <CheckCircle2 className="h-3 w-3" /> Entregar
                          </>
                        )}
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
        basePath="/faltantes"
        searchParams={paginationParams}
      />

      <ConfirmDialog
        open={confirmEntregarId !== null}
        onOpenChange={(open) => { if (!open) setConfirmEntregarId(null) }}
        title="¿Marcar como entregado?"
        description="Confirma que este pedido fue entregado al cliente. Una vez marcado, el pedido pasará al historial."
        confirmLabel="Sí, entregado"
        variant="default"
        onConfirm={() => { if (confirmEntregarId) handleEntregado(confirmEntregarId) }}
        loading={confirmLoading}
      />
    </div>
  )
}
