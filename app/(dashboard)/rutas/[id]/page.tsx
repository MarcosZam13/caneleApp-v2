// rutas/[id]/page.tsx — Detalle de una ruta con pedidos, producción e ingresos
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { ArrowLeft, Calendar } from 'lucide-react'
import { getRutaCompleta } from '@/actions/rutas.actions'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { RutaDetalle } from '@/components/rutas/RutaDetalle'
import { RutaAcciones } from '@/components/rutas/RutaAcciones'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const data = await getRutaCompleta(id)
  return { title: data?.ruta.nombre ? `${data.ruta.nombre} — Canele` : 'Ruta' }
}

export default async function RutaDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const data = await getRutaCompleta(id)

  if (!data) notFound()

  const { ruta, pedidos, produccion, ingresosCobrados, ingresosPendientes, totalIngresos } = data

  const fechaFormateada = ruta.fecha
    ? format(parseISO(ruta.fecha + 'T12:00:00'), "EEEE dd 'de' MMMM, yyyy", { locale: es })
    : null

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Navegación */}
      <Button variant="ghost" size="sm" className="-ml-2" nativeButton={false} render={<Link href="/rutas" />}>
        <ArrowLeft className="h-4 w-4 mr-1" />
        Rutas
      </Button>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{ruta.nombre ?? 'Ruta sin nombre'}</h1>
          {fechaFormateada && (
            <p className="text-sm text-muted-foreground capitalize flex items-center gap-1.5 mt-1">
              <Calendar className="h-3.5 w-3.5" />
              {fechaFormateada}
            </p>
          )}
          <div className="mt-2">
            <StatusBadge status={ruta.estado ?? 'pendiente'} className="text-sm px-3 py-1" />
          </div>
        </div>
        <RutaAcciones
          rutaId={ruta.id_ruta}
          rutaNombre={ruta.nombre ?? null}
          rutaFecha={ruta.fecha ?? null}
        />
      </div>

      <RutaDetalle
        rutaId={ruta.id_ruta}
        rutaNombre={ruta.nombre ?? 'Ruta sin nombre'}
        rutaFecha={ruta.fecha ?? ''}
        estado={ruta.estado}
        pedidos={pedidos as Parameters<typeof RutaDetalle>[0]['pedidos']}
        produccion={produccion}
        ingresosCobrados={ingresosCobrados}
        ingresosPendientes={ingresosPendientes}
        totalIngresos={totalIngresos}
      />
    </div>
  )
}
