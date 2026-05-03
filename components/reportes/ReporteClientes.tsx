// ReporteClientes.tsx — Top 15 clientes por volumen de compra
import { Users } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'

type ClienteFrecuente = {
  nombre: string
  telefono: string | null
  total_pedidos: number
  total_comprado: number
  total_pendiente: number
}

interface ReporteClientesProps {
  clientes: ClienteFrecuente[]
}

export function ReporteClientes({ clientes }: ReporteClientesProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Users className="h-4 w-4 text-primary" />
          Clientes frecuentes (top 15)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="rounded-lg border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>#</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead className="text-center">Pedidos</TableHead>
                <TableHead className="text-right">Total comprado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clientes.map((c, i) => (
                <TableRow key={c.nombre}>
                  <TableCell className="text-muted-foreground font-mono text-xs w-8">
                    {String(i + 1).padStart(2, '0')}
                  </TableCell>
                  <TableCell>
                    <p className="font-medium text-sm">{c.nombre}</p>
                    {c.total_pendiente > 0 && (
                      <Badge variant="outline" className="text-xs bg-red-50 text-red-700 border-red-200 mt-0.5">
                        ₡{c.total_pendiente.toLocaleString('es-CR')} pendiente
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-center text-sm">{c.total_pedidos}</TableCell>
                  <TableCell className="text-right font-bold text-sm text-primary">
                    ₡{c.total_comprado.toLocaleString('es-CR')}
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
