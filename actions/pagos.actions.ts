// pagos.actions.ts — Server Actions para el módulo de abonos y pagos de clientes
'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

type ActionResult<T = void> =
  | { success: true; data?: T }
  | { success: false; error: string }

const abonoSchema = z.object({
  id_cliente: z.string().uuid(),
  id_pedido: z.string().uuid().optional().nullable(),
  monto: z.number().min(1, 'El monto debe ser mayor a 0'),
  metodo: z.enum(['efectivo', 'sinpe', 'transferencia', 'otro']),
})

// Obtiene todos los clientes con deuda, incluyendo su historial de abonos
export async function getClientesConDeuda() {
  const supabase = await createClient()

  // Pedidos entregados y no pagados (deuda bruta)
  const { data: pedidosMorosos } = await supabase
    .from('pedido')
    .select(`
      id_pedido, total, fecha, notas,
      cliente:id_cliente (id_cliente, nombre, telefono)
    `)
    .eq('entregado', true)
    .eq('pagado', false)
    .order('fecha', { ascending: true })

  // Abonos registrados (pagos parciales)
  const { data: abonos } = await supabase
    .from('pago')
    .select('id_pago, id_pedido, id_cliente, monto, metodo, fecha')
    .order('fecha', { ascending: false })

  // Agrupa la deuda neta por cliente
  const abonosPorPedido = new Map<string, number>()
  for (const abono of abonos ?? []) {
    if (!abono.id_pedido) continue
    const current = abonosPorPedido.get(abono.id_pedido) ?? 0
    abonosPorPedido.set(abono.id_pedido, current + Number(abono.monto))
  }

  type ClienteDeuda = {
    id_cliente: string
    nombre: string
    telefono: string | null
    deuda_total: number
    pedidos_morosos: {
      id_pedido: string
      total: number
      abonado: number
      pendiente: number
      fecha: string | null
      notas: string | null
    }[]
  }

  const clienteMap = new Map<string, ClienteDeuda>()

  for (const pedido of pedidosMorosos ?? []) {
    const cliente = Array.isArray(pedido.cliente) ? pedido.cliente[0] : pedido.cliente
    if (!cliente) continue

    const abonado = abonosPorPedido.get(pedido.id_pedido) ?? 0
    const pendiente = Number(pedido.total ?? 0) - abonado

    // Solo incluye si aún tiene pendiente real
    if (pendiente <= 0) continue

    const existing: ClienteDeuda = clienteMap.get(cliente.id_cliente) ?? {
      id_cliente: cliente.id_cliente,
      nombre: cliente.nombre,
      telefono: cliente.telefono,
      deuda_total: 0,
      pedidos_morosos: [],
    }

    existing.deuda_total += pendiente
    existing.pedidos_morosos.push({
      id_pedido: pedido.id_pedido,
      total: Number(pedido.total ?? 0),
      abonado,
      pendiente,
      fecha: pedido.fecha ?? null,
      notas: pedido.notas ?? null,
    })

    clienteMap.set(cliente.id_cliente, existing)
  }

  return Array.from(clienteMap.values()).sort((a, b) => b.deuda_total - a.deuda_total)
}

// Registra un abono parcial a un pedido específico
export async function registrarAbono(formData: unknown): Promise<ActionResult> {
  const supabase = await createClient()

  const parsed = abonoSchema.safeParse(formData)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message }
  }

  const { id_cliente, id_pedido, monto, metodo } = parsed.data

  // Inserta el pago primero — si esto falla, no se toca el pedido
  const { error: insertError } = await supabase.from('pago').insert({
    id_cliente,
    id_pedido: id_pedido ?? null,
    monto,
    metodo,
  })

  if (insertError) {
    console.error('[registrarAbono] insert:', insertError)
    return { success: false, error: 'Error al registrar el abono' }
  }

  // Solo después de confirmar el insert, evalúa si el pedido quedó saldado
  if (id_pedido) {
    const { data: pedido } = await supabase
      .from('pedido')
      .select('total')
      .eq('id_pedido', id_pedido)
      .single()

    const { data: todosLosAbonos } = await supabase
      .from('pago')
      .select('monto')
      .eq('id_pedido', id_pedido)

    const totalAbonado = (todosLosAbonos ?? []).reduce((acc, a) => acc + Number(a.monto), 0)
    const totalPedido = Number(pedido?.total ?? 0)

    if (totalAbonado >= totalPedido) {
      const { error: updateError } = await supabase
        .from('pedido')
        .update({ pagado: true })
        .eq('id_pedido', id_pedido)

      if (updateError) {
        console.error('[registrarAbono] update pagado:', updateError)
        // El pago ya quedó registrado — no es un error fatal, pero lo logueamos
      }
    }
  }

  revalidatePath('/pagos')
  revalidatePath('/clientes')
  revalidatePath('/pedidos')
  return { success: true }
}

// Obtiene los abonos registrados para un pedido específico
export async function getAbonosPorPedido(idPedido: string) {
  const supabase = await createClient()

  const { data } = await supabase
    .from('pago')
    .select('id_pago, monto, metodo, fecha')
    .eq('id_pedido', idPedido)
    .order('fecha', { ascending: true })

  return data ?? []
}

// Obtiene los pedidos morosos de un cliente con sus abonos ya descontados
export async function getPedidosMorososCliente(idCliente: string) {
  const supabase = await createClient()

  const [{ data: pedidosMorosos }, { data: abonos }] = await Promise.all([
    supabase
      .from('pedido')
      .select('id_pedido, total, fecha, notas')
      .eq('id_cliente', idCliente)
      .eq('entregado', true)
      .eq('pagado', false)
      .order('fecha', { ascending: true }),
    supabase
      .from('pago')
      .select('id_pedido, monto')
      .eq('id_cliente', idCliente),
  ])

  const abonosPorPedido = new Map<string, number>()
  for (const abono of abonos ?? []) {
    if (!abono.id_pedido) continue
    const current = abonosPorPedido.get(abono.id_pedido) ?? 0
    abonosPorPedido.set(abono.id_pedido, current + Number(abono.monto))
  }

  return (pedidosMorosos ?? [])
    .map((p) => {
      const abonado = abonosPorPedido.get(p.id_pedido) ?? 0
      return {
        id_pedido: p.id_pedido,
        total: Number(p.total ?? 0),
        abonado,
        pendiente: Number(p.total ?? 0) - abonado,
        fecha: p.fecha,
        notas: p.notas,
      }
    })
    .filter((p) => p.pendiente > 0)
}

// Obtiene el historial de abonos de un cliente
export async function getAbonosPorCliente(idCliente: string) {
  const supabase = await createClient()

  const { data } = await supabase
    .from('pago')
    .select('id_pago, monto, metodo, fecha, id_pedido')
    .eq('id_cliente', idCliente)
    .order('fecha', { ascending: false })

  return data ?? []
}
