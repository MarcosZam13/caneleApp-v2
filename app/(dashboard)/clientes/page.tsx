// clientes/page.tsx — Listado paginado de clientes con búsqueda server-side
import { getClientesPaginados } from '@/actions/clientes.actions'
import { PageHeader } from '@/components/shared/PageHeader'
import { ClientesTable } from '@/components/clientes/ClientesTable'

export const metadata = { title: 'Clientes — Canele' }

const PAGE_SIZE = 30

export default async function ClientesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; search?: string; morosos?: string }>
}) {
  const { page: pageParam, search = '', morosos: morososParam } = await searchParams
  const page = Math.max(1, parseInt(pageParam ?? '1') || 1)
  const morosos = morososParam === 'true'

  const { clientes, total } = await getClientesPaginados(page, PAGE_SIZE, search, morosos)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Clientes"
        description={`${total} cliente${total !== 1 ? 's' : ''}${morosos ? ' con deuda pendiente' : search ? ` para "${search}"` : ' registrados'}`}
      />
      <ClientesTable
        clientes={clientes}
        page={page}
        pageSize={PAGE_SIZE}
        total={total}
        search={search}
        morosos={morosos}
      />
    </div>
  )
}
