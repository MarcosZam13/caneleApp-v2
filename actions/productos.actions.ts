// productos.actions.ts — Server Actions para gestión del catálogo de productos
'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import type { Producto } from '@/types/database'

type ActionResult<T = void> =
  | { success: true; data?: T }
  | { success: false; error: string }

const productoSchema = z.object({
  nombre: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  peso: z.string().optional().nullable(),
  precio_base: z.number().min(0, 'El precio no puede ser negativo').nullable(),
  disponible: z.boolean().default(true),
})

export async function getProductos() {
  const supabase = await createClient()

  const { data } = await supabase
    .from('producto')
    .select('id_producto, nombre, peso, precio_base, disponible, imagen, created_at')
    .order('nombre', { ascending: true })

  return data ?? []
}

// Obtiene productos con sus precios especiales para un cliente específico
export async function getProductosConPrecio(idCliente: string) {
  const supabase = await createClient()

  const [{ data: productos }, { data: precios }] = await Promise.all([
    supabase
      .from('producto')
      .select('id_producto, nombre, peso, precio_base, disponible')
      .eq('disponible', true)
      .order('nombre', { ascending: true }),
    supabase
      .from('precio_producto')
      .select('id_producto, precio')
      .eq('id_cliente', idCliente),
  ])

  // Aplica el precio especial del cliente si existe, si no usa precio_base
  const precioMap = new Map(precios?.map(p => [p.id_producto, p.precio]) ?? [])

  return (productos ?? []).map((p) => ({
    ...p,
    precio_efectivo: precioMap.get(p.id_producto) ?? p.precio_base ?? 0,
    tiene_precio_especial: precioMap.has(p.id_producto),
  }))
}

export async function createProducto(formData: unknown): Promise<ActionResult<Producto>> {
  const supabase = await createClient()

  const parsed = productoSchema.safeParse(formData)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message }
  }

  const { data, error } = await supabase
    .from('producto')
    .insert(parsed.data)
    .select()
    .single()

  if (error) {
    console.error('[createProducto]', error)
    if (error.code === '23505') return { success: false, error: 'Ya existe un producto con ese nombre' }
    return { success: false, error: 'Error al crear el producto' }
  }

  revalidatePath('/productos')
  return { success: true, data }
}

export async function updateProducto(id: string, formData: unknown): Promise<ActionResult> {
  const supabase = await createClient()

  const parsed = productoSchema.safeParse(formData)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message }
  }

  const { error } = await supabase
    .from('producto')
    .update(parsed.data)
    .eq('id_producto', id)

  if (error) {
    console.error('[updateProducto]', error)
    return { success: false, error: 'Error al actualizar el producto' }
  }

  revalidatePath('/productos')
  return { success: true }
}

export async function toggleProductoDisponible(id: string, disponible: boolean): Promise<ActionResult> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('producto')
    .update({ disponible })
    .eq('id_producto', id)

  if (error) return { success: false, error: 'Error al actualizar disponibilidad' }

  revalidatePath('/productos')
  return { success: true }
}

// Guarda o actualiza un precio especial para un cliente-producto específico
export async function setPrecioEspecial(
  idCliente: string,
  idProducto: string,
  precio: number,
): Promise<ActionResult> {
  const supabase = await createClient()

  // Verifica que el precio sea positivo antes de guardar
  if (precio <= 0) return { success: false, error: 'El precio debe ser mayor a 0' }

  // Elimina cualquier precio especial previo para este par cliente-producto
  await supabase
    .from('precio_producto')
    .delete()
    .eq('id_cliente', idCliente)
    .eq('id_producto', idProducto)

  // Inserta el nuevo precio especial
  const { error } = await supabase
    .from('precio_producto')
    .insert({ id_cliente: idCliente, id_producto: idProducto, precio })

  if (error) {
    console.error('[setPrecioEspecial]', error)
    return { success: false, error: 'Error al guardar el precio especial' }
  }

  revalidatePath(`/clientes/${idCliente}`)
  return { success: true }
}

// Elimina el precio especial, el producto vuelve a usar precio_base
export async function eliminarPrecioEspecial(
  idCliente: string,
  idProducto: string,
): Promise<ActionResult> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('precio_producto')
    .delete()
    .eq('id_cliente', idCliente)
    .eq('id_producto', idProducto)

  if (error) {
    console.error('[eliminarPrecioEspecial]', error)
    return { success: false, error: 'Error al eliminar el precio especial' }
  }

  revalidatePath(`/clientes/${idCliente}`)
  return { success: true }
}
