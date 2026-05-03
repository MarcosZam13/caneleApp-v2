// clientes.actions.ts — Server Actions para CRUD de clientes y precios especiales
'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import type { Cliente, ClienteConBalance } from '@/types/database'

// Schema de validación para crear/editar un cliente
const clienteSchema = z.object({
  nombre: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  telefono: z.string().optional().nullable(),
  email: z.string().email('Email inválido').optional().nullable().or(z.literal('')),
  observaciones: z.string().optional().nullable(),
})

type ActionResult<T = void> =
  | { success: true; data?: T }
  | { success: false; error: string }

// Obtiene clientes paginados con búsqueda, balance de deuda y filtro opcional de morosos
export async function getClientesPaginados(page = 1, pageSize = 30, search = '', morosos = false) {
  const supabase = await createClient()
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  let query = supabase
    .from('cliente')
    .select('id_cliente, nombre, telefono, email, observaciones, created_at', { count: 'exact' })
    .order('nombre', { ascending: true })

  if (search.trim()) {
    query = query.ilike('nombre', `%${search.trim()}%`)
  }

  // Si el filtro está activo, limitar la query solo a clientes con pedidos sin pagar
  if (morosos) {
    const { data: pedidosMorosos } = await supabase
      .from('pedido')
      .select('id_cliente')
      .eq('entregado', true)
      .eq('pagado', false)
      .not('id_cliente', 'is', null)

    const morososIds = [...new Set((pedidosMorosos ?? []).map((p) => p.id_cliente!))]
    if (morososIds.length === 0) return { clientes: [] as ClienteConBalance[], total: 0 }

    query = query.in('id_cliente', morososIds)
  }

  const { data: clientes, count } = await query.range(from, to)

  if (!clientes || clientes.length === 0) {
    return { clientes: [] as ClienteConBalance[], total: count ?? 0 }
  }

  // Calcula deuda solo para los clientes de esta página
  const clienteIds = clientes.map(c => c.id_cliente)
  const { data: pedidosSinPagar } = await supabase
    .from('pedido')
    .select('id_cliente, total')
    .eq('entregado', true)
    .eq('pagado', false)
    .in('id_cliente', clienteIds)

  const deudaMap = new Map<string, { total: number; count: number }>()
  for (const p of pedidosSinPagar ?? []) {
    if (!p.id_cliente) continue
    const current = deudaMap.get(p.id_cliente) ?? { total: 0, count: 0 }
    deudaMap.set(p.id_cliente, {
      total: current.total + Number(p.total ?? 0),
      count: current.count + 1,
    })
  }

  const result: ClienteConBalance[] = clientes.map((c) => ({
    ...c,
    total_deuda: deudaMap.get(c.id_cliente)?.total ?? 0,
    pedidos_morosos: deudaMap.get(c.id_cliente)?.count ?? 0,
  }))

  return { clientes: result, total: count ?? 0 }
}

// Obtiene todos los clientes con su balance de deuda calculado
export async function getClientes(): Promise<ClienteConBalance[]> {
  const supabase = await createClient()

  const { data: clientes } = await supabase
    .from('cliente')
    .select('id_cliente, nombre, telefono, email, observaciones, created_at')
    .order('nombre', { ascending: true })

  if (!clientes) return []

  // Calcula la deuda de cada cliente: pedidos entregados pero no pagados
  const { data: morosos } = await supabase
    .from('pedido')
    .select('id_cliente, total')
    .eq('entregado', true)
    .eq('pagado', false)

  const deudaMap = new Map<string, { total: number; count: number }>()
  for (const p of morosos ?? []) {
    if (!p.id_cliente) continue
    const current = deudaMap.get(p.id_cliente) ?? { total: 0, count: 0 }
    deudaMap.set(p.id_cliente, {
      total: current.total + Number(p.total ?? 0),
      count: current.count + 1,
    })
  }

  return clientes.map((c) => ({
    ...c,
    total_deuda: deudaMap.get(c.id_cliente)?.total ?? 0,
    pedidos_morosos: deudaMap.get(c.id_cliente)?.count ?? 0,
  }))
}

// Obtiene un cliente por ID con sus direcciones y últimos pedidos
export async function getClienteById(id: string) {
  const supabase = await createClient()

  const [{ data: cliente }, { data: direcciones }, { data: pedidos }] = await Promise.all([
    supabase
      .from('cliente')
      .select('id_cliente, nombre, telefono, email, observaciones, created_at')
      .eq('id_cliente', id)
      .single(),
    supabase
      .from('direccion')
      .select('id_direccion, direccion_texto, lat, lng, activa, hora_inicio, hora_fin, Provincia, Canton, Distrito')
      .eq('id_cliente', id)
      .order('activa', { ascending: false }),
    supabase
      .from('pedido')
      .select('id_pedido, fecha, total, pagado, entregado, notas')
      .eq('id_cliente', id)
      .order('fecha', { ascending: false })
      .limit(20),
  ])

  return { cliente, direcciones: direcciones ?? [], pedidos: pedidos ?? [] }
}

export async function createCliente(formData: unknown): Promise<ActionResult<Cliente>> {
  const supabase = await createClient()

  const parsed = clienteSchema.safeParse(formData)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message }
  }

  const { nombre, telefono, email, observaciones } = parsed.data

  const { data, error } = await supabase
    .from('cliente')
    .insert({ nombre, telefono: telefono || null, email: email || null, observaciones: observaciones || null })
    .select()
    .single()

  if (error) {
    console.error('[createCliente]', error)
    return { success: false, error: 'Error al crear el cliente' }
  }

  revalidatePath('/clientes')
  return { success: true, data }
}

export async function updateCliente(id: string, formData: unknown): Promise<ActionResult> {
  const supabase = await createClient()

  const parsed = clienteSchema.safeParse(formData)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message }
  }

  const { nombre, telefono, email, observaciones } = parsed.data

  const { error } = await supabase
    .from('cliente')
    .update({ nombre, telefono: telefono || null, email: email || null, observaciones: observaciones || null })
    .eq('id_cliente', id)

  if (error) {
    console.error('[updateCliente]', error)
    return { success: false, error: 'Error al actualizar el cliente' }
  }

  revalidatePath('/clientes')
  revalidatePath(`/clientes/${id}`)
  return { success: true }
}

// Obtiene solo las direcciones de un cliente (para formularios de pedido)
export async function getDireccionesPorCliente(idCliente: string) {
  const supabase = await createClient()

  const { data } = await supabase
    .from('direccion')
    .select('id_direccion, direccion_texto')
    .eq('id_cliente', idCliente)
    .order('activa', { ascending: false })

  return data ?? []
}

export async function deleteCliente(id: string): Promise<ActionResult> {
  const supabase = await createClient()

  // Verifica que no tenga pedidos activos antes de eliminar
  const { count } = await supabase
    .from('pedido')
    .select('*', { count: 'exact', head: true })
    .eq('id_cliente', id)

  if ((count ?? 0) > 0) {
    return { success: false, error: `No se puede eliminar: el cliente tiene ${count} pedido(s) registrado(s)` }
  }

  const { error } = await supabase.from('cliente').delete().eq('id_cliente', id)

  if (error) {
    console.error('[deleteCliente]', error)
    return { success: false, error: 'Error al eliminar el cliente' }
  }

  revalidatePath('/clientes')
  return { success: true }
}

// ─── DIRECCIONES ──────────────────────────────────────────────────────────────

const direccionSchema = z.object({
  direccion_texto: z.string().min(1, 'La dirección es requerida'),
  Provincia: z.string().optional().nullable(),
  Canton: z.string().optional().nullable(),
  Distrito: z.string().optional().nullable(),
  hora_inicio: z.string().optional().nullable(),
  hora_fin: z.string().optional().nullable(),
  activa: z.boolean().default(true),
  lat: z.number().optional().nullable(),
  lng: z.number().optional().nullable(),
})

export async function crearDireccion(idCliente: string, formData: unknown): Promise<ActionResult> {
  const supabase = await createClient()

  const parsed = direccionSchema.safeParse(formData)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message }
  }

  const { error } = await supabase
    .from('direccion')
    .insert({ id_cliente: idCliente, ...parsed.data })

  if (error) {
    console.error('[crearDireccion]', error)
    return { success: false, error: 'Error al crear la dirección' }
  }

  revalidatePath(`/clientes/${idCliente}`)
  return { success: true }
}

export async function actualizarDireccion(id: string, idCliente: string, formData: unknown): Promise<ActionResult> {
  const supabase = await createClient()

  const parsed = direccionSchema.safeParse(formData)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message }
  }

  const { error } = await supabase
    .from('direccion')
    .update(parsed.data)
    .eq('id_direccion', id)

  if (error) {
    console.error('[actualizarDireccion]', error)
    return { success: false, error: 'Error al actualizar la dirección' }
  }

  revalidatePath(`/clientes/${idCliente}`)
  return { success: true }
}

export async function eliminarDireccion(id: string, idCliente: string): Promise<ActionResult> {
  const supabase = await createClient()

  const { error } = await supabase.from('direccion').delete().eq('id_direccion', id)

  if (error) {
    console.error('[eliminarDireccion]', error)
    return { success: false, error: 'Error al eliminar la dirección' }
  }

  revalidatePath(`/clientes/${idCliente}`)
  return { success: true }
}

// Guarda solo lat/lng de una dirección existente (usado desde el mapa)
export async function actualizarCoordenadas(
  idDireccion: string,
  idCliente: string,
  lat: number,
  lng: number
): Promise<ActionResult> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('direccion')
    .update({ lat, lng })
    .eq('id_direccion', idDireccion)

  if (error) {
    console.error('[actualizarCoordenadas]', error)
    return { success: false, error: 'Error al guardar las coordenadas' }
  }

  revalidatePath(`/clientes/${idCliente}`)
  return { success: true }
}

// Recibe un link de Google Maps (directo o acortado) o "lat,lng" y extrae las coordenadas.
// Para links acortados (goo.gl / maps.app.goo.gl) sigue la redirección en el servidor.
export async function resolveGoogleMapsLink(
  input: string
): Promise<ActionResult<{ lat: number; lng: number }>> {
  const trimmed = input.trim()

  // Formato "lat,lng" directo — sin URL
  const directMatch = trimmed.match(/^(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)$/)
  if (directMatch) {
    return { success: true, data: { lat: parseFloat(directMatch[1]), lng: parseFloat(directMatch[2]) } }
  }

  // Intentar parsear la URL tal como viene antes de seguir redirects
  const coordPatterns = [
    /@(-?\d+\.?\d+),(-?\d+\.?\d+)/,
    /[?&]q=(-?\d+\.?\d+),(-?\d+\.?\d+)/,
    /[?&]ll=(-?\d+\.?\d+),(-?\d+\.?\d+)/,
    /\/(-?\d+\.?\d+),(-?\d+\.?\d+),\d+z/,
  ]

  function extractFromUrl(url: string): { lat: number; lng: number } | null {
    for (const pattern of coordPatterns) {
      const m = url.match(pattern)
      if (m) return { lat: parseFloat(m[1]), lng: parseFloat(m[2]) }
    }
    return null
  }

  const direct = extractFromUrl(trimmed)
  if (direct) return { success: true, data: direct }

  // Si es un link acortado, seguir la redirección para obtener el URL completo
  try {
    const res = await fetch(trimmed, { redirect: 'follow', method: 'HEAD' })
    const finalUrl = res.url
    const fromRedirect = extractFromUrl(finalUrl)
    if (fromRedirect) return { success: true, data: fromRedirect }
  } catch {
    // Ignorar errores de red — el mensaje de error genérico se envía abajo
  }

  return { success: false, error: 'No se pudo extraer coordenadas de ese enlace. Intenta pegar directamente "lat,lng".' }
}
