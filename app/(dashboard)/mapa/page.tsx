// mapa/page.tsx — Vista de mapa de entrega para una ruta seleccionada
import { getRutas } from '@/actions/rutas.actions'
import { PageHeader } from '@/components/shared/PageHeader'
import { MapaView } from '@/components/mapa/MapaView'

export const metadata = { title: 'Mapa de entregas — Canele' }

export default async function MapaPage() {
  // Carga solo rutas recientes (pendientes y en curso) para el selector
  const { rutas } = await getRutas(1, 50, '')

  return (
    <div className="space-y-4 h-full">
      <PageHeader
        title="Mapa de entregas"
        description="Visualiza las paradas de una ruta en el mapa"
      />
      <MapaView rutas={rutas} apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? ''} />
    </div>
  )
}
