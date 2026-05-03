// loading.tsx — Estado de carga global para páginas del dashboard
import { Skeleton } from '@/components/ui/skeleton'

export default function DashboardLoading() {
  return (
    <div className="space-y-6 animate-in fade-in">
      {/* Page header skeleton */}
      <div className="space-y-2">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-4 w-64" />
      </div>

      {/* Content skeleton */}
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex gap-4 items-center p-4 border rounded-lg">
            {Array.from({ length: 4 }).map((_, j) => (
              <Skeleton
                key={j}
                className="h-4 flex-1"
                style={{ opacity: 1 - i * 0.12 }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
