// produccion/page.tsx — Módulo de producción: qué hay que hornear, rebanar y alistar por ruta
import { getRutasParaProduccion, getProduccionRuta } from '@/actions/produccion.actions'
import { PageHeader } from '@/components/shared/PageHeader'
import { ProduccionView } from '@/components/produccion/ProduccionView'

export const metadata = { title: 'Producción — Canele' }

export default async function ProduccionPage() {
  const rutas = await getRutasParaProduccion()

  // Carga automáticamente la primera ruta disponible (la más reciente)
  const primeraRuta = rutas[0]
  const inicial = primeraRuta ? await getProduccionRuta(primeraRuta.id_ruta) : null

  return (
    <div className="space-y-6">
      <PageHeader
        title="Producción"
        description="Resumen de qué preparar para cada ruta"
      />
      <ProduccionView rutas={rutas} inicial={inicial} />
    </div>
  )
}
