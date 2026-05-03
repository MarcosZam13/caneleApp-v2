// faltantes/page.tsx — Módulo de faltantes de entrega: pendientes, retrasados e historial
import { Suspense } from 'react'
import { getFaltantes, type FiltroFaltantes } from '@/actions/faltantes.actions'
import { PageHeader } from '@/components/shared/PageHeader'
import { FaltantesTable } from '@/components/faltantes/FaltantesTable'
import { TableSkeleton } from '@/components/shared/TableSkeleton'

export const metadata = { title: 'Faltantes de Entrega — Canele' }

const PAGE_SIZE = 25

// Valida que el filtro sea uno de los valores permitidos
function parseFiltro(raw: string | undefined): FiltroFaltantes {
  const validos: FiltroFaltantes[] = ['pendientes', 'retrasados', 'historial']
  return validos.includes(raw as FiltroFaltantes) ? (raw as FiltroFaltantes) : 'pendientes'
}

export default async function FaltantesPage({
  searchParams,
}: {
  searchParams: Promise<{
    filtro?: string
    idRuta?: string
    page?: string
  }>
}) {
  const { filtro: filtroRaw, idRuta = '', page: pageParam } = await searchParams
  const filtro = parseFiltro(filtroRaw)
  const page = Math.max(1, parseInt(pageParam ?? '1') || 1)

  const result = await getFaltantes(filtro, idRuta || undefined, page, PAGE_SIZE)

  if (!result.success) {
    return (
      <div className="space-y-6">
        <PageHeader title="Faltantes de Entrega" description="Error al cargar los datos" />
        <p className="text-destructive text-sm">{result.error}</p>
      </div>
    )
  }

  const { pedidos, total } = result.data!

  // Descripción dinámica del encabezado según el filtro activo
  function buildDescription(): string {
    const base = `${total} pedido${total !== 1 ? 's' : ''}`
    switch (filtro) {
      case 'pendientes':
        return `${base} · Pendientes de entrega`
      case 'retrasados':
        return `${base} · Con fecha de entrega vencida`
      case 'historial':
        return `${base} · Últimas entregas realizadas`
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Faltantes de Entrega"
        description={buildDescription()}
      />

      <Suspense fallback={<TableSkeleton rows={8} cols={6} />}>
        <FaltantesTable
          pedidos={pedidos as Parameters<typeof FaltantesTable>[0]['pedidos']}
          total={total}
          page={page}
          pageSize={PAGE_SIZE}
          currentFiltro={filtro}
          idRuta={idRuta}
        />
      </Suspense>
    </div>
  )
}
