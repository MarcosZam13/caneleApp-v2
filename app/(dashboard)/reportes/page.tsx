// reportes/page.tsx — Reportes operativos: morosos, ventas por ruta, productos top, clientes frecuentes
import {
  getReporteMorosos,
  getReporteVentasPorRuta,
  getReporteProductosTop,
  getReporteClientesFrecuentes,
} from '@/actions/reportes.actions'
import { PageHeader } from '@/components/shared/PageHeader'
import { ReporteMorosos } from '@/components/reportes/ReporteMorosos'
import { ReporteVentas } from '@/components/reportes/ReporteVentas'
import { ReporteProductos } from '@/components/reportes/ReporteProductos'
import { ReporteClientes } from '@/components/reportes/ReporteClientes'

export const metadata = { title: 'Reportes — Canele' }

export default async function ReportesPage() {
  const [morosos, ventasPorRuta, productosTop, clientesFrecuentes] = await Promise.all([
    getReporteMorosos(),
    getReporteVentasPorRuta(),
    getReporteProductosTop(),
    getReporteClientesFrecuentes(),
  ])

  return (
    <div className="space-y-8">
      <PageHeader
        title="Reportes"
        description="Análisis operativo del negocio"
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ReporteMorosos morosos={morosos as Parameters<typeof ReporteMorosos>[0]['morosos']} />
        <ReporteVentas rutas={ventasPorRuta} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ReporteProductos productos={productosTop} />
        <ReporteClientes clientes={clientesFrecuentes} />
      </div>
    </div>
  )
}
