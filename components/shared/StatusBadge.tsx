// StatusBadge.tsx — Badge de estado reutilizable para pedidos, rutas y pagos
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

type StatusVariant = 'pagado' | 'pendiente' | 'entregado' | 'moroso' | 'en_curso' | 'completada' | 'activo' | 'inactivo'

const statusConfig: Record<StatusVariant, { label: string; className: string }> = {
  pagado:     { label: 'Pagado',     className: 'bg-green-100 text-green-800 border-green-200' },
  pendiente:  { label: 'Pendiente',  className: 'bg-amber-100 text-amber-800 border-amber-200' },
  entregado:  { label: 'Entregado',  className: 'bg-blue-100  text-blue-800  border-blue-200'  },
  moroso:     { label: 'Moroso',     className: 'bg-red-100   text-red-800   border-red-200'   },
  en_curso:   { label: 'En curso',   className: 'bg-primary/10 text-primary  border-primary/20'},
  completada: { label: 'Completada', className: 'bg-green-100 text-green-800 border-green-200' },
  activo:     { label: 'Activo',     className: 'bg-green-100 text-green-800 border-green-200' },
  inactivo:   { label: 'Inactivo',   className: 'bg-muted     text-muted-foreground border'    },
}

interface StatusBadgeProps {
  status: StatusVariant | string
  className?: string
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status as StatusVariant] ?? {
    label: status,
    className: 'bg-muted text-muted-foreground',
  }

  return (
    <Badge
      variant="outline"
      className={cn('text-xs font-medium', config.className, className)}
    >
      {config.label}
    </Badge>
  )
}
