// RecentRoutes.tsx — Lista de rutas activas del día con su estado e ingresos
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { MapPin } from 'lucide-react'

interface Route {
  id_ruta: string
  nombre: string | null
  total_pedidos: number | null
  total_venta: number | null
  estado: string | null
}

interface RecentRoutesProps {
  routes: Route[]
}

const estadoBadge: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  pendiente: { label: 'Pendiente', variant: 'outline' },
  en_curso: { label: 'En curso', variant: 'default' },
  completada: { label: 'Completada', variant: 'secondary' },
}

export function RecentRoutes({ routes }: RecentRoutesProps) {
  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <MapPin className="h-4 w-4 text-primary" />
          Rutas de hoy
        </CardTitle>
      </CardHeader>
      <CardContent>
        {routes.length === 0 ? (
          <div className="text-center py-8">
            <MapPin className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No hay rutas para hoy</p>
          </div>
        ) : (
          <div className="space-y-3">
            {routes.map((route) => {
              const badge = estadoBadge[route.estado ?? 'pendiente'] ?? estadoBadge.pendiente
              return (
                <div
                  key={route.id_ruta}
                  className="flex items-start justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-foreground truncate">
                      {route.nombre ?? 'Sin nombre'}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {route.total_pedidos ?? 0} pedido{route.total_pedidos !== 1 ? 's' : ''}
                      {' · '}
                      <span className="font-medium text-primary">
                        ₡{Number(route.total_venta ?? 0).toLocaleString('es-CR')}
                      </span>
                    </p>
                  </div>
                  <Badge variant={badge.variant} className="ml-2 shrink-0 text-xs">
                    {badge.label}
                  </Badge>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
