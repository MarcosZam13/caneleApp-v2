// ReporteProductos.tsx — Top 10 productos más pedidos con barra de progreso visual
import { Package } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'

type ProductoTop = {
  nombre: string
  peso: string | null
  total: number
  pedidos: number
}

interface ReporteProductosProps {
  productos: ProductoTop[]
}

export function ReporteProductos({ productos }: ReporteProductosProps) {
  const maxTotal = productos[0]?.total ?? 1

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Package className="h-4 w-4 text-primary" />
          Productos más pedidos (top 10)
        </CardTitle>
      </CardHeader>
      <CardContent>
        {productos.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">Sin datos</p>
        ) : (
          <div className="space-y-3">
            {productos.map((p, i) => (
              <div key={p.nombre} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-5 text-xs text-muted-foreground font-mono shrink-0">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <div className="min-w-0">
                      <span className="font-medium truncate block">{p.nombre}</span>
                      {p.peso && <span className="text-xs text-muted-foreground">{p.peso}</span>}
                    </div>
                  </div>
                  <div className="text-right shrink-0 ml-3">
                    <span className="font-bold">{p.total}</span>
                    <span className="text-xs text-muted-foreground ml-1">uds.</span>
                  </div>
                </div>
                <Progress value={(p.total / maxTotal) * 100} className="h-1.5" />
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
