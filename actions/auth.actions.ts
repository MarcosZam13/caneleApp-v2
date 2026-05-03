// auth.actions.ts — Server Actions para login y logout vía Supabase Auth
'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

// Inicia sesión con email y contraseña usando Supabase Auth
export async function login(formData: FormData): Promise<{ error?: string }> {
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  if (!email || !password) return { error: 'Completa todos los campos' }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    // Mapea errores de Supabase a mensajes amigables en español
    if (error.message.includes('Invalid login credentials')) {
      return { error: 'Email o contraseña incorrectos' }
    }
    if (error.message.includes('Email not confirmed')) {
      return { error: 'Confirma tu email antes de iniciar sesión' }
    }
    console.error('[login]', error.message)
    return { error: 'Error al iniciar sesión. Intentá de nuevo.' }
  }

  redirect('/dashboard')
}

// Cierra la sesión activa y redirige al login
export async function logout(): Promise<void> {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}
