// (dashboard)/layout.tsx — Layout compartido para todas las páginas protegidas
import { createClient } from '@/lib/supabase/server'
import { SidebarProvider } from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/layout/AppSidebar'
import { MobileBottomNav } from '@/components/layout/MobileBottomNav'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { count } = await supabase
    .from('vista_balance_cliente')
    .select('*', { count: 'exact', head: true })

  const morososCount = count ?? 0

  return (
    <SidebarProvider>
      <AppSidebar morososCount={morososCount} />
      <main className="flex-1 p-6 pb-20 md:pb-6 min-h-screen min-w-0">
        {children}
      </main>
      <MobileBottomNav morososCount={morososCount} />
    </SidebarProvider>
  )
}
