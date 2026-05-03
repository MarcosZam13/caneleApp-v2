// ReporteVentas.tsx — Ventas por ruta: tabla con totales y estado
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { TrendingUp } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { ExportarPDFButton } from '@/components/reportes/ExportarPDFButton'
import { ExportarCSVButton } from '@/components/reportes/ExportarCSVButton'
import { ReporteVentasPDF } from '@/components/reportes/pdf/ReporteVentasPDF'

type Ruta = {
  id_ruta: string
  nombre: string | null
  fecha: string | null
  total_pedidos: number | null
  total_venta: number | null
  estado: string | null
}

interface ReporteVentasProps {
  rutas: Ruta[]
}

export function ReporteVentas({ rutas }: ReporteVentasProps) {
  const totalGeneral = rutas.reduce((acc, r) => acc + Number(r.total_venta ?? 0), 0)
  const rutasCompletadas = rutas.filter(r => r.estado === 'completada')
  const promedioVenta = rutasCompletadas.length > 0
    ? rutasCompletadas.reduce((acc, r) => acc + Number(r.total_venta ?? 0), 0) / rutasCompletadas.length
    : 0

  const pdfData = rutas.map(r => ({
    nombre: r.nombre ?? '—',
    fecha: r.fecha ?? '',
    total_pedidos: r.total_pedidos ?? 0,
    total_venta: Number(r.total_venta ?? 0),
    estado: r.estado ?? 'pendiente',
  }))

  const csvHeaders = [
    { key: 'nombre', label: 'Ruta' },
    { key: 'fecha', label: 'Fecha' },
    { key: 'total_pedidos', label: 'Pedidos' },
    { key: 'total_venta', label: 'Ventas' },
    { key: 'estado', label: 'Estado' },
  ]

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            Ventas por ruta (últimas 20)
          </CardTitle>
        </div>
        <div className="flex gap-4 mt-2 text-sm">
          <div>
            <span className="text-muted-foreground">Total:</span>
            <span className="font-bold text-primary ml-1">₡{totalGeneral.toLocaleString('es-CR')}</span>
          </div>
          {promedioVenta > 0 && (
            <div>
              <span className="text-muted-foreground">Promedio:</span>
              <span className="font-medium ml-1">₡{Math.round(promedioVenta).toLocaleString('es-CR')}</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 mt-2">
          <ExportarPDFButton
            pdfDocument={<ReporteVentasPDF rutas={pdfData} />}
            fileName="reporte-ventas.pdf"
          />
          <ExportarCSVButton
            data={pdfData}
            fileName="reporte-ventas"
            headers={csvHeaders}
          />
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-lg border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Ruta</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead className="text-center">Pedidos</TableHead>
                <TableHead className="text-right">Ventas</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rutas.map((ruta) => (
                <TableRow key={ruta.id_ruta}>
                  <TableCell className="font-medium text-sm">{ruta.nombre ?? '—'}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {ruta.fecha
                      ? format(parseISO(ruta.fecha + 'T12:00:00'), 'dd MMM', { locale: es })
                      : '—'}
                  </TableCell>
                  <TableCell className="text-center text-sm">{ruta.total_pedidos ?? 0}</TableCell>
                  <TableCell className="text-right font-medium text-sm text-primary">
                    ₡{Number(ruta.total_venta ?? 0).toLocaleString('es-CR')}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={ruta.estado ?? 'pendiente'} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
