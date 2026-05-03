// ReporteMorosos.tsx — Tabla de clientes con deuda ordenada por antigüedad
import { format, parseISO, differenceInDays } from 'date-fns'
import { es } from 'date-fns/locale'
import { AlertCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ExportarPDFButton } from '@/components/reportes/ExportarPDFButton'
import { ExportarCSVButton } from '@/components/reportes/ExportarCSVButton'
import { ReporteMorososPDF } from '@/components/reportes/pdf/ReporteMorososPDF'

type Moroso = {
  id_pedido: string
  total: number | null
  fecha: string | null
  notas: string | null
  cliente: { id_cliente: string; nombre: string; telefono: string | null } | null
  dias_atraso?: number
  deuda_restante?: number
}

interface ReporteMorososProps {
  morosos: Moroso[]
}

export function ReporteMorosos({ morosos }: ReporteMorososProps) {
  const totalDeuda = morosos.reduce((acc, m) => acc + Number(m.total ?? 0), 0)

  function getDiasVencido(fecha: string | null): number {
    if (!fecha) return 0
    return differenceInDays(new Date(), parseISO(fecha + 'T12:00:00'))
  }

  function getUrgencia(dias: number): 'bg-green-50 text-green-700 border-green-200' | 'bg-amber-50 text-amber-700 border-amber-200' | 'bg-red-50 text-red-700 border-red-200' {
    if (dias <= 7) return 'bg-green-50 text-green-700 border-green-200'
    if (dias <= 30) return 'bg-amber-50 text-amber-700 border-amber-200'
    return 'bg-red-50 text-red-700 border-red-200'
  }

  const pdfData = morosos.map(m => ({
    id_pedido: m.id_pedido,
    cliente_nombre: m.cliente?.nombre ?? '—',
    total: Number(m.total ?? 0),
    fecha: m.fecha ?? '',
    dias_atraso: m.dias_atraso ?? getDiasVencido(m.fecha),
  }))

  const csvHeaders = [
    { key: 'cliente_nombre', label: 'Cliente' },
    { key: 'total', label: 'Monto' },
    { key: 'fecha', label: 'Fecha' },
    { key: 'dias_atraso', label: 'Días atraso' },
  ]

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-destructive" />
            Morosos ({morosos.length})
          </CardTitle>
          {totalDeuda > 0 && (
            <span className="text-sm font-bold text-destructive">
              ₡{totalDeuda.toLocaleString('es-CR')} total
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-2">
          <ExportarPDFButton
            pdfDocument={<ReporteMorososPDF morosos={pdfData} />}
            fileName="reporte-morosos.pdf"
          />
          <ExportarCSVButton
            data={pdfData}
            fileName="reporte-morosos"
            headers={csvHeaders}
          />
        </div>
      </CardHeader>
      <CardContent>
        {morosos.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            ✓ Sin deudas pendientes
          </p>
        ) : (
          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Cliente</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead className="text-right">Monto</TableHead>
                  <TableHead>Antigüedad</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {morosos.map((m) => {
                  const dias = getDiasVencido(m.fecha)
                  return (
                    <TableRow key={m.id_pedido}>
                      <TableCell>
                        <p className="font-medium text-sm">{m.cliente?.nombre ?? '—'}</p>
                        {m.notas && <p className="text-xs text-muted-foreground truncate max-w-32">{m.notas}</p>}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {m.fecha ? format(parseISO(m.fecha + 'T12:00:00'), 'dd MMM', { locale: es }) : '—'}
                      </TableCell>
                      <TableCell className="text-right font-medium text-sm">
                        ₡{Number(m.total ?? 0).toLocaleString('es-CR')}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-xs ${getUrgencia(dias)}`}>
                          {dias}d
                        </Badge>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
