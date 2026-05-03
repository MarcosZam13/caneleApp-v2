// pagos/page.tsx — Módulo de abonos: clientes con deuda y registro de pagos parciales
import { getClientesConDeuda } from '@/actions/pagos.actions'
import { PageHeader } from '@/components/shared/PageHeader'
import { PagosView } from '@/components/pagos/PagosView'

export const metadata = { title: 'Pagos — Canele' }

export default async function PagosPage() {
  const clientes = await getClientesConDeuda()
  const totalDeuda = clientes.reduce((acc, c) => acc + c.deuda_total, 0)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pagos y abonos"
        description={`${clientes.length} cliente${clientes.length !== 1 ? 's' : ''} con deuda pendiente`}
      />
      <PagosView clientes={clientes} totalDeuda={totalDeuda} />
    </div>
  )
}
