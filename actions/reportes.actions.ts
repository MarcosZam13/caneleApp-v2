// reportes.actions.ts — Server Actions para reportes operativos y de negocio
'use server'

import { createClient } from '@/lib/supabase/server'

// Reporte de morosos: clientes con deuda agrupados por antigüedad
export async function getReporteMorosos() {
  const supabase = await createClient()

  const { data } = await supabase
    .from('pedido')
    .select(`
      id_pedido, total, fecha, notas,
      cliente:id_cliente (id_cliente, nombre, telefono)
    `)
    .eq('entregado', true)
    .eq('pagado', false)
    .order('fecha', { ascending: true })

  return data ?? []
}

// Reporte de ventas por ruta (últimas N rutas completadas)
export async function getReporteVentasPorRuta(limit = 20) {
  const supabase = await createClient()

  const { data } = await supabase
    .from('ruta')
    .select('id_ruta, nombre, fecha, total_pedidos, total_venta, estado')
    .order('fecha', { ascending: false })
    .limit(limit)

  return data ?? []
}

// Reporte de productos más pedidos
export async function getReporteProductosTop() {
  const supabase = await createClient()

  const { data } = await supabase
    .from('pedido_producto')
    .select(`
      cantidad,
      producto:id_producto (id_producto, nombre, peso)
    `)

  if (!data) return []

  // Agrupa y suma por producto
  const map = new Map<string, { nombre: string; peso: string | null; total: number; pedidos: number }>()

  for (const item of data) {
    const prod = Array.isArray(item.producto) ? item.producto[0] : item.producto
    if (!prod) continue
    const existing = map.get(prod.id_producto) ?? { nombre: prod.nombre, peso: prod.peso, total: 0, pedidos: 0 }
    existing.total += item.cantidad ?? 0
    existing.pedidos += 1
    map.set(prod.id_producto, existing)
  }

  return Array.from(map.values())
    .sort((a, b) => b.total - a.total)
    .slice(0, 10)
}

// Reporte de clientes más frecuentes
export async function getReporteClientesFrecuentes() {
  const supabase = await createClient()

  const { data } = await supabase
    .from('pedido')
    .select(`
      id_cliente, total, pagado,
      cliente:id_cliente (id_cliente, nombre, telefono)
    `)

  if (!data) return []

  const map = new Map<string, {
    nombre: string
    telefono: string | null
    total_pedidos: number
    total_comprado: number
    total_pendiente: number
  }>()

  for (const pedido of data) {
    const cliente = Array.isArray(pedido.cliente) ? pedido.cliente[0] : pedido.cliente
    if (!pedido.id_cliente || !cliente) continue

    const existing = map.get(pedido.id_cliente) ?? {
      nombre: cliente.nombre,
      telefono: cliente.telefono,
      total_pedidos: 0,
      total_comprado: 0,
      total_pendiente: 0,
    }

    existing.total_pedidos += 1
    existing.total_comprado += Number(pedido.total ?? 0)
    if (!pedido.pagado) existing.total_pendiente += Number(pedido.total ?? 0)

    map.set(pedido.id_cliente, existing)
  }

  return Array.from(map.values())
    .sort((a, b) => b.total_comprado - a.total_comprado)
    .slice(0, 15)
}
