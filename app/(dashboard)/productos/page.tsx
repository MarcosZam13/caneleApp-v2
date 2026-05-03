// productos/page.tsx — Catálogo de productos con disponibilidad y precios
import { getProductos } from '@/actions/productos.actions'
import { PageHeader } from '@/components/shared/PageHeader'
import { ProductosGrid } from '@/components/productos/ProductosGrid'

export const metadata = { title: 'Productos — Canele' }

export default async function ProductosPage() {
  const productos = await getProductos()
  const disponibles = productos.filter(p => p.disponible).length

  return (
    <div className="space-y-6">
      <PageHeader
        title="Productos"
        description={`${disponibles} disponibles de ${productos.length} en el catálogo`}
      />
      <ProductosGrid productos={productos} />
    </div>
  )
}
