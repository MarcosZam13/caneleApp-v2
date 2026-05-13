// pedidos.actions.ts — Server Actions para listado, creación y estados de pedidos
'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import type { Pedido } from '@/types/database'

type ActionResult<T = void> =
  | { success: true; data?: T }
  | { success: false; error: string }

const pedidoItemSchema = z.object({
  id_producto: z.string().uuid(),
  cantidad: z.number().int().min(1),
  rebanado: z.boolean().default(false),
  cuadrado: z.boolean().default(false),
  precio_unitario: z.number().min(0),
})

const crearPedidoSchema = z.object({
  id_cliente: z.string().uuid('Selecciona un cliente'),
  id_ruta: z.string().uuid('Selecciona una ruta').optional().nullable(),
  id_direccion: z.string().uuid().optional().nullable(),
  fecha: z.string().min(1),
  notas: z.string().optional().nullable(),
  prioritaria: z.boolean().default(false),
  items: z.array(pedidoItemSchema).min(1, 'Agrega al menos un producto'),
})

// Obtiene todos los pedidos con cliente y ruta, paginados y con filtros server-side
export async function getPedidos(
  page = 1,
  pageSize = 25,
  search = '',
  estado = '',     // '' | 'pendiente' | 'moroso' | 'completado'
  idRuta = '',
  fechaDesde = '',
  fechaHasta = ''
) {
  const supabase = await createClient()
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  let query = supabase
    .from('pedido')
    .select(`
      id_pedido, fecha, total, pagado, entregado, notas, created_at,
      cliente:id_cliente (nombre, telefono),
      ruta:id_ruta (nombre, fecha)
    `, { count: 'exact' })
    .order('fecha', { ascending: false })
    .order('created_at', { ascending: false })

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
      return { pedidos: [], total: 0, page, pageSize }
    }
  }

  // Filtro por estado de entrega/pago
  if (estado === 'pendiente') {
    query = query.eq('entregado', false)
  } else if (estado === 'moroso') {
    query = query.eq('entregado', true)
    query = query.eq('pagado', false)
  } else if (estado === 'completado') {
    query = query.eq('entregado', true)
    query = query.eq('pagado', true)
  }

  if (idRuta) query = query.eq('id_ruta', idRuta)
  if (fechaDesde) query = query.gte('fecha', fechaDesde)
  if (fechaHasta) query = query.lte('fecha', fechaHasta)

  const { data, count } = await query.range(from, to)
  return { pedidos: data ?? [], total: count ?? 0, page, pageSize }
}

// Obtiene un pedido completo con todos sus productos
export async function getPedidoById(id: string) {
  const supabase = await createClient()

  const { data } = await supabase
    .from('pedido')
    .select(`
      id_pedido, fecha, total, pagado, entregado, notas, created_at,
      id_cliente, id_ruta, id_direccion,
      cliente:id_cliente (id_cliente, nombre, telefono, email),
      ruta:id_ruta (id_ruta, nombre, fecha),
      direccion:id_direccion (id_direccion, direccion_texto),
      pedido_producto (
        id_pedido_producto, cantidad, rebanado, cuadrado, precio_unitario, sub_total,
        producto:id_producto (id_producto, nombre, peso, precio_base)
      )
    `)
    .eq('id_pedido', id)
    .single()

  return data
}

// Crea un pedido completo con sus items en una sola transacción lógica
export async function crearPedido(formData: unknown): Promise<ActionResult<Pedido>> {
  const supabase = await createClient()

  const parsed = crearPedidoSchema.safeParse(formData)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message }
  }

  const { id_cliente, id_ruta, id_direccion, fecha, notas, prioritaria, items } = parsed.data

  // Calcula el total del pedido sumando sub_totales
  const total = items.reduce((acc, item) => acc + item.cantidad * item.precio_unitario, 0)

  // Inserta el pedido cabecera
  const { data: pedido, error: pedidoError } = await supabase
    .from('pedido')
    .insert({
      id_cliente,
      id_ruta: id_ruta ?? null,
      id_direccion: id_direccion ?? null,
      fecha,
      notas: notas ?? null,
      total,
      pagado: false,
      entregado: false,
      prioritaria: prioritaria ?? false,
    })
    .select()
    .single()

  if (pedidoError || !pedido) {
    console.error('[crearPedido] Error al crear pedido:', pedidoError)
    return { success: false, error: 'Error al crear el pedido' }
  }

  // Inserta los items del pedido
  const itemsToInsert = items.map((item) => ({
    id_pedido: pedido.id_pedido,
    id_producto: item.id_producto,
    cantidad: item.cantidad,
    rebanado: item.rebanado,
    cuadrado: item.cuadrado,
    precio_unitario: item.precio_unitario,
    sub_total: item.cantidad * item.precio_unitario,
  }))

  const { error: itemsError } = await supabase
    .from('pedido_producto')
    .insert(itemsToInsert)

  if (itemsError) {
    // Si fallan los items, elimina el pedido cabecera para evitar registros huérfanos
    await supabase.from('pedido').delete().eq('id_pedido', pedido.id_pedido)
    console.error('[crearPedido] Error al crear items:', itemsError)
    return { success: false, error: 'Error al registrar los productos del pedido' }
  }

  // Actualiza el contador de pedidos en la ruta si fue asignado
  if (id_ruta) {
    const { data: rutaActual } = await supabase
      .from('ruta')
      .select('total_pedidos, total_venta')
      .eq('id_ruta', id_ruta)
      .single()

    await supabase
      .from('ruta')
      .update({
        total_pedidos: (rutaActual?.total_pedidos ?? 0) + 1,
        total_venta: (Number(rutaActual?.total_venta ?? 0)) + total,
      })
      .eq('id_ruta', id_ruta)
  }

  revalidatePath('/pedidos')
  revalidatePath('/rutas')
  revalidatePath('/dashboard')
  return { success: true, data: pedido }
}

// Actualiza un pedido existente: cabecera + items + contadores de ruta
export async function updatePedido(id: string, formData: unknown): Promise<ActionResult<Pedido>> {
  const supabase = await createClient()

  const parsed = crearPedidoSchema.safeParse(formData)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message }
  }

  const { id_cliente, id_ruta, id_direccion, fecha, notas, prioritaria, items } = parsed.data

  // Obtener datos previos para actualizar contadores de ruta
  const { data: pedidoAnterior } = await supabase
    .from('pedido')
    .select('id_ruta, total')
    .eq('id_pedido', id)
    .single()

  if (!pedidoAnterior) return { success: false, error: 'Pedido no encontrado' }

  const nuevoTotal = items.reduce((acc, item) => acc + item.cantidad * item.precio_unitario, 0)
  const totalAnterior = Number(pedidoAnterior.total ?? 0)
  const rutaAnterior = pedidoAnterior.id_ruta

  // Actualizar cabecera del pedido
  const { data: pedido, error: pedidoError } = await supabase
    .from('pedido')
    .update({
      id_cliente,
      id_ruta: id_ruta ?? null,
      id_direccion: id_direccion ?? null,
      fecha,
      notas: notas ?? null,
      prioritaria,
      total: nuevoTotal,
    })
    .eq('id_pedido', id)
    .select()
    .single()

  if (pedidoError || !pedido) {
    console.error('[updatePedido] header:', pedidoError)
    return { success: false, error: 'Error al actualizar el pedido' }
  }

  // Reemplazar items: eliminar los anteriores e insertar los nuevos
  await supabase.from('pedido_producto').delete().eq('id_pedido', id)

  const itemsToInsert = items.map((item) => ({
    id_pedido: id,
    id_producto: item.id_producto,
    cantidad: item.cantidad,
    rebanado: item.rebanado,
    cuadrado: item.cuadrado,
    precio_unitario: item.precio_unitario,
    sub_total: item.cantidad * item.precio_unitario,
  }))

  const { error: itemsError } = await supabase.from('pedido_producto').insert(itemsToInsert)
  if (itemsError) {
    console.error('[updatePedido] items:', itemsError)
    return { success: false, error: 'Error al actualizar los productos del pedido' }
  }

  // Actualizar contadores de ruta
  if (rutaAnterior !== id_ruta) {
    // Ruta cambió: decrementar la anterior, incrementar la nueva
    if (rutaAnterior) {
      const { data: rutaOld } = await supabase.from('ruta').select('total_pedidos, total_venta').eq('id_ruta', rutaAnterior).single()
      if (rutaOld) {
        await supabase.from('ruta').update({
          total_pedidos: Math.max(0, (rutaOld.total_pedidos ?? 1) - 1),
          total_venta: Math.max(0, Number(rutaOld.total_venta ?? 0) - totalAnterior),
        }).eq('id_ruta', rutaAnterior)
      }
    }
    if (id_ruta) {
      const { data: rutaNew } = await supabase.from('ruta').select('total_pedidos, total_venta').eq('id_ruta', id_ruta).single()
      if (rutaNew) {
        await supabase.from('ruta').update({
          total_pedidos: (rutaNew.total_pedidos ?? 0) + 1,
          total_venta: Number(rutaNew.total_venta ?? 0) + nuevoTotal,
        }).eq('id_ruta', id_ruta)
      }
    }
  } else if (id_ruta && totalAnterior !== nuevoTotal) {
    // Misma ruta pero total cambió: solo ajustar total_venta
    const { data: ruta } = await supabase.from('ruta').select('total_venta').eq('id_ruta', id_ruta).single()
    if (ruta) {
      await supabase.from('ruta').update({
        total_venta: Math.max(0, Number(ruta.total_venta ?? 0) - totalAnterior + nuevoTotal),
      }).eq('id_ruta', id_ruta)
    }
  }

  revalidatePath('/pedidos')
  revalidatePath(`/pedidos/${id}`)
  revalidatePath('/rutas')
  revalidatePath('/dashboard')
  return { success: true, data: pedido }
}

export async function marcarPagado(id: string): Promise<ActionResult> {
  const supabase = await createClient()

  const { data: pedido } = await supabase
    .from('pedido')
    .select('total, id_cliente')
    .eq('id_pedido', id)
    .single()

  if (!pedido) return { success: false, error: 'Pedido no encontrado' }

  const { data: abonos } = await supabase
    .from('pago')
    .select('monto')
    .eq('id_pedido', id)

  const totalAbonado = (abonos ?? []).reduce((acc, a) => acc + Number(a.monto), 0)
  const pendiente = Number(pedido.total ?? 0) - totalAbonado

  if (pendiente > 0) {
    await supabase.from('pago').insert({
      id_pedido: id,
      id_cliente: pedido.id_cliente,
      monto: pendiente,
      metodo: 'efectivo',
    })
  }

  const { error } = await supabase.from('pedido').update({ pagado: true }).eq('id_pedido', id)
  if (error) return { success: false, error: 'Error al marcar como pagado' }

  revalidatePath('/pedidos')
  revalidatePath('/pagos')
  revalidatePath('/clientes')
  return { success: true }
}

export async function marcarEntregado(id: string): Promise<ActionResult> {
  const supabase = await createClient()
  const { error } = await supabase.from('pedido').update({ entregado: true }).eq('id_pedido', id)
  if (error) return { success: false, error: 'Error al marcar como entregado' }
  revalidatePath('/pedidos')
  revalidatePath('/faltantes')
  return { success: true }
}

export async function deletePedido(id: string): Promise<ActionResult> {
  const supabase = await createClient()

  // Obtener info del pedido para actualizar contadores de ruta
  const { data: pedido } = await supabase
    .from('pedido')
    .select('id_pedido, id_ruta, total')
    .eq('id_pedido', id)
    .single()

  if (!pedido) return { success: false, error: 'Pedido no encontrado' }

  // Eliminar dependencias en orden: items, pagos, orden_entrega, luego el pedido
  await Promise.all([
    supabase.from('pedido_producto').delete().eq('id_pedido', id),
    supabase.from('pago').delete().eq('id_pedido', id),
    supabase.from('orden_entrega').delete().eq('id_pedido', id),
  ])

  const { error } = await supabase.from('pedido').delete().eq('id_pedido', id)
  if (error) {
    console.error('[deletePedido]', error)
    return { success: false, error: 'Error al eliminar el pedido' }
  }

  // Actualizar contadores de la ruta si estaba asignado
  if (pedido.id_ruta) {
    const { data: ruta } = await supabase
      .from('ruta')
      .select('total_pedidos, total_venta')
      .eq('id_ruta', pedido.id_ruta)
      .single()

    if (ruta) {
      await supabase
        .from('ruta')
        .update({
          total_pedidos: Math.max(0, (ruta.total_pedidos ?? 1) - 1),
          total_venta: Math.max(0, Number(ruta.total_venta ?? 0) - Number(pedido.total ?? 0)),
        })
        .eq('id_ruta', pedido.id_ruta)
    }
  }

  revalidatePath('/pedidos')
  revalidatePath('/rutas')
  revalidatePath('/dashboard')
  revalidatePath('/pagos')
  return { success: true }
}
