// rutas/page.tsx — Grid de rutas paginado con filtro por estado server-side
import { getRutas } from '@/actions/rutas.actions'
import { PageHeader } from '@/components/shared/PageHeader'
import { RutasGrid } from '@/components/rutas/RutasGrid'

export const metadata = { title: 'Rutas — Canele' }

const PAGE_SIZE = 20

export default async function RutasPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; estado?: string }>
}) {
  const { page: pageParam, estado = '' } = await searchParams
  const page = Math.max(1, parseInt(pageParam ?? '1') || 1)

  const { rutas, total } = await getRutas(page, PAGE_SIZE, estado)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Rutas"
        description={`${total} ruta${total !== 1 ? 's' : ''}${estado ? ` con estado "${estado}"` : ' registradas'}`}
      />
      <RutasGrid
        rutas={rutas}
        page={page}
        pageSize={PAGE_SIZE}
        total={total}
        estadoActivo={estado}
      />
    </div>
  )
}
