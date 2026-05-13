// rutas.actions.ts — Server Actions para rutas: listado, detalle, producción e ingresos
'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import type { Ruta } from '@/types/database'

type ActionResult<T = void> =
  | { success: true; data?: T }
  | { success: false; error: string }

const rutaSchema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido'),
  fecha: z.string().min(1, 'La fecha es requerida'),
})

// Obtiene rutas paginadas y filtradas por estado
export async function getRutas(page = 1, pageSize = 20, estado = '') {
  const supabase = await createClient()
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  let query = supabase
    .from('ruta')
    .select('id_ruta, nombre, fecha, total_pedidos, total_venta, estado, created_at', { count: 'exact' })
    .order('fecha', { ascending: false })
    .order('created_at', { ascending: false })

  if (estado) query = query.eq('estado', estado)

  const { data, count } = await query.range(from, to)
  return { rutas: data ?? [], total: count ?? 0 }
}

// Obtiene el detalle completo de una ruta: pedidos, productos, producción e ingresos
export async function getRutaCompleta(id: string) {
  const supabase = await createClient()

  const [{ data: ruta }, { data: pedidos }, { data: orden }] = await Promise.all([
    supabase
      .from('ruta')
      .select('id_ruta, nombre, fecha, total_pedidos, total_venta, estado')
      .eq('id_ruta', id)
      .single(),
    // Trae pedidos con cliente, dirección y sus productos
    supabase
      .from('pedido')
      .select(`
        id_pedido, id_cliente, id_direccion, total, pagado, entregado, notas, fecha,
        cliente:id_cliente (nombre, telefono),
        direccion:id_direccion (direccion_texto, lat, lng),
        pedido_producto (
          id_pedido_producto, cantidad, rebanado, cuadrado, precio_unitario, sub_total,
          producto:id_producto (id_producto, nombre, peso)
        )
      `)
      .eq('id_ruta', id)
      .order('created_at', { ascending: true }),
    // Orden de entrega para saber la secuencia de la ruta
    supabase
      .from('orden_entrega')
      .select('id_orden, id_pedido, posicion')
      .eq('id_ruta', id)
      .order('posicion', { ascending: true }),
  ])

  if (!ruta) return null

  // Ordena los pedidos según la secuencia de entrega si existe
  const ordenMap = new Map(orden?.map((o) => [o.id_pedido, o.posicion]) ?? [])
  const pedidosOrdenados = (pedidos ?? []).sort((a, b) => {
    const posA = ordenMap.get(a.id_pedido) ?? 999
    const posB = ordenMap.get(b.id_pedido) ?? 999
    return posA - posB
  })

  // Calcula el resumen de producción agrupando por producto con las 4 variantes:
  // entero, rebanado, cuadrado, cuadrado-rebanado (ambos flags en true)
  const produccionMap = new Map<string, {
    nombre: string
    peso: string | null
    total: number
    entero: number
    rebanado: number
    cuadrado: number
    cuadrado_rebanado: number
  }>()

  for (const pedido of pedidosOrdenados) {
    for (const item of pedido.pedido_producto ?? []) {
      const prod = item.producto
      if (!prod) continue
      const key = prod.id_producto
      const existing = produccionMap.get(key) ?? {
        nombre: prod.nombre,
        peso: prod.peso,
        total: 0, entero: 0, rebanado: 0, cuadrado: 0, cuadrado_rebanado: 0,
      }
      const cantidad = item.cantidad ?? 0
      existing.total += cantidad

      // Determina la variante según las combinaciones de los flags
      if (item.rebanado && item.cuadrado) existing.cuadrado_rebanado += cantidad
      else if (item.rebanado) existing.rebanado += cantidad
      else if (item.cuadrado) existing.cuadrado += cantidad
      else existing.entero += cantidad

      produccionMap.set(key, existing)
    }
  }

  const produccion = Array.from(produccionMap.values()).sort((a, b) =>
    a.nombre.localeCompare(b.nombre)
  )

  // Cálculo de ingresos reales vs pendientes
  const ingresosCobrados = pedidosOrdenados
    .filter((p) => p.pagado)
    .reduce((acc, p) => acc + Number(p.total ?? 0), 0)

  const ingresosPendientes = pedidosOrdenados
    .filter((p) => !p.pagado)
    .reduce((acc, p) => acc + Number(p.total ?? 0), 0)

  return {
    ruta,
    pedidos: pedidosOrdenados,
    produccion,
    ingresosCobrados,
    ingresosPendientes,
    totalIngresos: ingresosCobrados + ingresosPendientes,
    // Orden guardado en DB para que el cliente pueda restaurarlo en el estado
    ordenGuardado: (orden ?? []).map((o) => ({ id_pedido: o.id_pedido, posicion: o.posicion })),
  }
}

export async function updateRuta(id: string, formData: unknown): Promise<ActionResult<Ruta>> {
  const supabase = await createClient()

  const parsed = rutaSchema.safeParse(formData)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message }
  }

  const { data, error } = await supabase
    .from('ruta')
    .update({ nombre: parsed.data.nombre, fecha: parsed.data.fecha })
    .eq('id_ruta', id)
    .select()
    .single()

  if (error) {
    console.error('[updateRuta]', error)
    return { success: false, error: 'Error al actualizar la ruta' }
  }

  revalidatePath('/rutas')
  revalidatePath(`/rutas/${id}`)
  return { success: true, data }
}

export async function createRuta(formData: unknown): Promise<ActionResult<Ruta>> {
  const supabase = await createClient()

  const parsed = rutaSchema.safeParse(formData)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message }
  }

  const { data, error } = await supabase
    .from('ruta')
    .insert({ nombre: parsed.data.nombre, fecha: parsed.data.fecha, estado: 'pendiente' })
    .select()
    .single()

  if (error) {
    console.error('[createRuta]', error)
    return { success: false, error: 'Error al crear la ruta' }
  }

  revalidatePath('/rutas')
  return { success: true, data }
}

export async function updateRutaEstado(id: string, estado: string): Promise<ActionResult> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('ruta')
    .update({ estado })
    .eq('id_ruta', id)

  if (error) {
    console.error('[updateRutaEstado]', error)
    return { success: false, error: 'Error al actualizar el estado' }
  }

  revalidatePath('/rutas')
  revalidatePath(`/rutas/${id}`)
  return { success: true }
}

// Schema para validar el array de orden de entrega
const ordenEntregaSchema = z.array(
  z.object({
    id_pedido: z.string().uuid(),
    posicion: z.number().int().positive(),
  })
)

// Guarda (reemplaza) el orden de entrega de una ruta
export async function saveOrdenEntrega(
  idRuta: string,
  orden: { id_pedido: string; posicion: number }[]
): Promise<ActionResult> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'No autenticado' }

  const parsed = ordenEntregaSchema.safeParse(orden)
  if (!parsed.success) return { success: false, error: 'Datos de orden inválidos' }

  // Reemplaza el orden completo: elimina el anterior e inserta el nuevo
  const { error: deleteError } = await supabase
    .from('orden_entrega')
    .delete()
    .eq('id_ruta', idRuta)

  if (deleteError) {
    console.error('[saveOrdenEntrega] delete:', deleteError)
    return { success: false, error: 'Error al guardar el orden' }
  }

  if (parsed.data.length > 0) {
    const { error: insertError } = await supabase
      .from('orden_entrega')
      .insert(parsed.data.map(o => ({ id_ruta: idRuta, id_pedido: o.id_pedido, posicion: o.posicion })))

    if (insertError) {
      console.error('[saveOrdenEntrega] insert:', insertError)
      return { success: false, error: 'Error al guardar el orden' }
    }
  }

  revalidatePath(`/rutas/${idRuta}`)
  revalidatePath('/mapa')
  return { success: true }
}

// Elimina el orden de entrega guardado para una ruta
export async function clearOrdenEntrega(idRuta: string): Promise<ActionResult> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'No autenticado' }

  const { error } = await supabase
    .from('orden_entrega')
    .delete()
    .eq('id_ruta', idRuta)

  if (error) {
    console.error('[clearOrdenEntrega]', error)
    return { success: false, error: 'Error al limpiar el orden' }
  }

  revalidatePath(`/rutas/${idRuta}`)
  revalidatePath('/mapa')
  return { success: true }
}

export async function marcarPedidoEntregado(idPedido: string, idRuta: string): Promise<ActionResult> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('pedido')
    .update({ entregado: true })
    .eq('id_pedido', idPedido)

  if (error) {
    console.error('[marcarPedidoEntregado]', error)
    return { success: false, error: 'Error al marcar como entregado' }
  }

  revalidatePath(`/rutas/${idRuta}`)
  return { success: true }
}

export async function marcarPedidoPagado(idPedido: string, idRuta: string): Promise<ActionResult> {
  const supabase = await createClient()

  const { data: pedido } = await supabase
    .from('pedido')
    .select('total, id_cliente')
    .eq('id_pedido', idPedido)
    .single()

  if (!pedido) return { success: false, error: 'Pedido no encontrado' }

  const { data: abonos } = await supabase
    .from('pago')
    .select('monto')
    .eq('id_pedido', idPedido)

  const totalAbonado = (abonos ?? []).reduce((acc, a) => acc + Number(a.monto), 0)
  const pendiente = Number(pedido.total ?? 0) - totalAbonado

  if (pendiente > 0) {
    await supabase.from('pago').insert({
      id_pedido: idPedido,
      id_cliente: pedido.id_cliente,
      monto: pendiente,
      metodo: 'efectivo',
    })
  }

  const { error } = await supabase
    .from('pedido')
    .update({ pagado: true })
    .eq('id_pedido', idPedido)

  if (error) {
    console.error('[marcarPedidoPagado]', error)
    return { success: false, error: 'Error al marcar como pagado' }
  }

  revalidatePath(`/rutas/${idRuta}`)
  revalidatePath('/pagos')
  revalidatePath('/clientes')
  return { success: true }
}

export async function deleteRuta(id: string): Promise<ActionResult> {
  const supabase = await createClient()

  // Verificar que la ruta existe
  const { data: ruta } = await supabase
    .from('ruta')
    .select('id_ruta, total_pedidos')
    .eq('id_ruta', id)
    .single()

  if (!ruta) return { success: false, error: 'Ruta no encontrada' }

  // Desasignar pedidos de esta ruta (id_ruta = null)
  await supabase
    .from('pedido')
    .update({ id_ruta: null })
    .eq('id_ruta', id)

  // Eliminar orden de entrega y la ruta
  await supabase.from('orden_entrega').delete().eq('id_ruta', id)

  const { error } = await supabase.from('ruta').delete().eq('id_ruta', id)
  if (error) {
    console.error('[deleteRuta]', error)
    return { success: false, error: 'Error al eliminar la ruta' }
  }

  revalidatePath('/rutas')
  revalidatePath('/dashboard')
  revalidatePath('/pedidos')
  return { success: true }
}
