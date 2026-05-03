// faltantes.actions.ts — Server Actions para el módulo de faltantes de entrega
'use server'

import { createClient } from '@/lib/supabase/server'
import type { PedidoConCliente } from '@/types/database'

type ActionResult<T = void> =
  | { success: true; data?: T }
  | { success: false; error: string }

export type FiltroFaltantes = 'pendientes' | 'retrasados' | 'historial'

type FaltantesResult = {
  pedidos: PedidoConCliente[]
  total: number
  page: number
  pageSize: number
}

// Obtiene pedidos faltantes de entrega, paginados y filtrados por tipo
export async function getFaltantes(
  filtro: FiltroFaltantes = 'pendientes',
  idRuta?: string,
  page = 1,
  pageSize = 25,
  search = '',
): Promise<ActionResult<FaltantesResult>> {
  const supabase = await createClient()
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  let query = supabase
    .from('pedido')
    .select(`
      id_pedido, fecha, total, pagado, entregado, prioritaria, notas, id_ruta,
      cliente:id_cliente (nombre, telefono),
      direccion:id_direccion (direccion_texto, lat, lng),
      ruta:id_ruta (nombre)
    `, { count: 'exact' })

  // Búsqueda por nombre de cliente: primero busca IDs, luego filtra pedidos
  if (search.trim()) {
    const { data: clientesMatch } = await supabase
      .from('cliente')
      .select('id_cliente')
      .ilike('nombre', `%${search.trim()}%`)

    const ids = clientesMatch?.map(c => c.id_cliente) ?? []

    if (ids.length > 0) {
      query = query.in('id_cliente', ids)
    } else {
      return { success: true, data: { pedidos: [], total: 0, page, pageSize } }
    }
  }

  // Filtro por ruta
  if (idRuta) query = query.eq('id_ruta', idRuta)

  // Filtro de estado de entrega y ordenamiento según tipo
  if (filtro === 'pendientes') {
    // Pendientes de entregar: no entregados, los más próximos primero, prioritarios al frente
    query = query
      .eq('entregado', false)
      .order('fecha', { ascending: true })
      .order('prioritaria', { ascending: false })
  } else if (filtro === 'retrasados') {
    // Retrasados: no entregados con fecha anterior a hoy
    const hoy = new Date().toISOString().split('T')[0] // YYYY-MM-DD en UTC
    query = query
      .eq('entregado', false)
      .lt('fecha', hoy)
      .order('fecha', { ascending: true })
      .order('prioritaria', { ascending: false })
  } else if (filtro === 'historial') {
    // Historial: ya entregados, los más recientes primero, limitado a 50
    query = query
      .eq('entregado', true)
      .order('fecha', { ascending: false })
      .limit(50)
  }

  const { data, count, error } = await query.range(from, to)

  if (error) {
    console.error('[getFaltantes] Error:', error)
    return { success: false, error: 'Error al obtener los faltantes de entrega' }
  }

  return {
    success: true,
    data: {
      pedidos: (data ?? []) as unknown as PedidoConCliente[],
      total: count ?? 0,
      page,
      pageSize,
    },
  }
}
