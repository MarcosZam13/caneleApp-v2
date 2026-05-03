// Pagination.tsx — Controles de paginación reutilizables para tablas y listados
import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface PaginationProps {
  page: number
  pageSize: number
  total: number
  basePath: string        // ej: "/pedidos"
  searchParams?: Record<string, string>  // parámetros extra a preservar en la URL
}

export function Pagination({ page, pageSize, total, basePath, searchParams = {} }: PaginationProps) {
  const totalPages = Math.ceil(total / pageSize)

  if (totalPages <= 1) return null

  // Construye la URL para una página dada, preservando otros query params
  function href(targetPage: number): string {
    const params = new URLSearchParams({ ...searchParams, page: String(targetPage) })
    return `${basePath}?${params.toString()}`
  }

  const desde = (page - 1) * pageSize + 1
  const hasta = Math.min(page * pageSize, total)

  return (
    <div className="flex items-center justify-between gap-4 pt-2">
      <p className="text-sm text-muted-foreground">
        Mostrando <span className="font-medium">{desde}–{hasta}</span> de{' '}
        <span className="font-medium">{total}</span>
      </p>

      <div className="flex items-center gap-1">
        {page > 1 ? (
          <Button variant="outline" size="sm" className="h-8 gap-1" nativeButton={false} render={<Link href={href(page - 1)} />}>
            <ChevronLeft className="h-3.5 w-3.5" />
            Anterior
          </Button>
        ) : (
          <Button variant="outline" size="sm" className="h-8 gap-1" disabled>
            <ChevronLeft className="h-3.5 w-3.5" />
            Anterior
          </Button>
        )}

        <span className="text-sm px-3 text-muted-foreground">
          {page} / {totalPages}
        </span>

        {page < totalPages ? (
          <Button variant="outline" size="sm" className="h-8 gap-1" nativeButton={false} render={<Link href={href(page + 1)} />}>
            Siguiente
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        ) : (
          <Button variant="outline" size="sm" className="h-8 gap-1" disabled>
            Siguiente
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    </div>
  )
}
