// (dashboard)/layout.tsx — Layout compartido para todas las páginas protegidas
import { SidebarProvider } from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/layout/AppSidebar'
import { MobileBottomNav } from '@/components/layout/MobileBottomNav'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <SidebarProvider>
      <AppSidebar />
      {/* El trigger vive dentro del sidebar — sin header separado ni línea */}
      <main className="flex-1 p-6 pb-20 md:pb-6 min-h-screen min-w-0">
        {children}
      </main>
      <MobileBottomNav />
    </SidebarProvider>
  )
}
