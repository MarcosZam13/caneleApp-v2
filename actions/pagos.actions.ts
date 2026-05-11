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

// Obtiene todos los clientes con deuda usando la vista de balance, incluyendo sus pedidos morosos
export async function getClientesConDeuda() {
  const supabase = await createClient()

  const [{ data: balances }, { data: morosos }] = await Promise.all([
    supabase
      .from('vista_balance_cliente')
      .select('id_cliente, nombre, balance')
      .gt('balance', 0)
      .order('balance', { ascending: false }),
    supabase
      .from('vista_morosos')
      .select('id_pedido, id_cliente, total, total_abonado, deuda_restante, fecha')
      .order('dias_atraso', { ascending: false }),
  ])

  const morososPorCliente = new Map<string, NonNullable<typeof morosos>>()
  for (const m of morosos ?? []) {
    if (!m.id_cliente) continue
    if (!morososPorCliente.has(m.id_cliente)) morososPorCliente.set(m.id_cliente, [])
    morososPorCliente.get(m.id_cliente)!.push(m)
  }

  return (balances ?? []).map(b => ({
    id_cliente: b.id_cliente,
    nombre: b.nombre,
    telefono: null as string | null,
    deuda_total: Number(b.balance),
    pedidos_morosos: (morososPorCliente.get(b.id_cliente) ?? []).map(m => ({
      id_pedido: m.id_pedido,
      total: Number(m.total),
      abonado: Number(m.total_abonado),
      pendiente: Number(m.deuda_restante),
      fecha: m.fecha,
      notas: null as string | null,
    })),
  }))
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

// Obtiene los pedidos morosos de un cliente usando la vista optimizada
export async function getPedidosMorososCliente(idCliente: string) {
  const supabase = await createClient()

  const { data } = await supabase
    .from('vista_morosos')
    .select('*')
    .eq('id_cliente', idCliente)
    .order('dias_atraso', { ascending: false })

  return (data ?? []).map((m) => ({
    id_pedido: m.id_pedido,
    total: Number(m.total),
    abonado: Number(m.total_abonado),
    pendiente: Number(m.deuda_restante),
    fecha: m.fecha,
    notas: null as string | null,
  }))
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
