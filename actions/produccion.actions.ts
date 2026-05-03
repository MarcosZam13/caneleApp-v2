// produccion.actions.ts — Server Actions para el módulo de producción por ruta
'use server'

import { createClient } from '@/lib/supabase/server'

export type VarianteProduccion = 'entero' | 'rebanado' | 'cuadrado' | 'cuadrado_rebanado'

export type ItemProduccion = {
  id_producto: string
  nombre: string
  peso: string | null
  // Total
  total: number
  // Sección Alistar: lo exacto que pide el cliente
  entero: number
  rebanado: number
  cuadrado: number
  cuadrado_rebanado: number
  // Sección Horneo: solo importa la forma del molde
  // hornear_entero = entero + rebanado (ambos entran al horno en forma entera)
  // hornear_cuadrado = cuadrado + cuadrado_rebanado
  hornear_entero: number
  hornear_cuadrado: number
}

export type ResumenProduccion = {
  ruta: { id_ruta: string; nombre: string | null; fecha: string | null; estado: string | null }
  items: ItemProduccion[]
  totalUnidades: number
}

// Obtiene el resumen de producción de una ruta específica
export async function getProduccionRuta(idRuta: string): Promise<ResumenProduccion | null> {
  const supabase = await createClient()

  const [{ data: ruta }, { data: pedidos }] = await Promise.all([
    supabase
      .from('ruta')
      .select('id_ruta, nombre, fecha, estado')
      .eq('id_ruta', idRuta)
      .single(),
    supabase
      .from('pedido')
      .select(`
        pedido_producto (
          cantidad, rebanado, cuadrado,
          producto:id_producto (id_producto, nombre, peso)
        )
      `)
      .eq('id_ruta', idRuta),
  ])

  if (!ruta) return null

  const map = new Map<string, ItemProduccion>()

  for (const pedido of pedidos ?? []) {
    for (const item of pedido.pedido_producto ?? []) {
      const prod = Array.isArray(item.producto) ? item.producto[0] : item.producto
      if (!prod) continue

      const existing = map.get(prod.id_producto) ?? {
        id_producto: prod.id_producto,
        nombre: prod.nombre,
        peso: prod.peso,
        total: 0,
        entero: 0, rebanado: 0, cuadrado: 0, cuadrado_rebanado: 0,
        hornear_entero: 0, hornear_cuadrado: 0,
      }

      const cantidad = item.cantidad ?? 0
      existing.total += cantidad

      // Alistar: variante exacta del pedido
      if (item.rebanado && item.cuadrado) existing.cuadrado_rebanado += cantidad
      else if (item.rebanado) existing.rebanado += cantidad
      else if (item.cuadrado) existing.cuadrado += cantidad
      else existing.entero += cantidad

      // Horneo: solo importa si es cuadrado o entero (el rebanado se hornea entero)
      if (item.cuadrado) existing.hornear_cuadrado += cantidad
      else existing.hornear_entero += cantidad

      map.set(prod.id_producto, existing)
    }
  }

  const items = Array.from(map.values()).sort((a, b) => b.total - a.total)
  const totalUnidades = items.reduce((acc, i) => acc + i.total, 0)

  return { ruta, items, totalUnidades }
}

// Obtiene todas las rutas disponibles para el selector
export async function getRutasParaProduccion() {
  const supabase = await createClient()

  const { data } = await supabase
    .from('ruta')
    .select('id_ruta, nombre, fecha, estado, total_pedidos')
    .order('fecha', { ascending: false })
    .limit(30)

  return data ?? []
}
