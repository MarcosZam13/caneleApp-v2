// AppSidebar.tsx — Sidebar principal de navegación con todos los módulos de la app
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Users,
  MapPin,
  ShoppingBag,
  Package,
  UtensilsCrossed,
  BarChart3,
  CreditCard,
  Map,
  ChevronRight,
  LogOut,
  AlertTriangle,
} from 'lucide-react'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
} from '@/components/ui/sidebar'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { logout } from '@/actions/auth.actions'

const navItems = [
  {
    label: 'Principal',
    items: [
      { title: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    ],
  },
  {
    label: 'Operaciones',
    items: [
      { title: 'Rutas', href: '/rutas', icon: MapPin },
      { title: 'Pedidos', href: '/pedidos', icon: ShoppingBag },
      { title: 'Faltantes', href: '/faltantes', icon: AlertTriangle },
      { title: 'Mapa', href: '/mapa', icon: Map },
    ],
  },
  {
    label: 'Gestión',
    items: [
      { title: 'Clientes', href: '/clientes', icon: Users },
      { title: 'Productos', href: '/productos', icon: Package },
      { title: 'Pagos', href: '/pagos', icon: CreditCard },
    ],
  },
  {
    label: 'Producción',
    items: [
      { title: 'Producción', href: '/produccion', icon: UtensilsCrossed },
      { title: 'Reportes', href: '/reportes', icon: BarChart3 },
    ],
  },
]

export function AppSidebar({ morososCount = 0 }: { morososCount?: number }) {
  const pathname = usePathname()

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="px-3 py-3">
        {/* Sidebar expandido: logo + nombre + botón de colapsar a la derecha */}
        <div className="flex items-center justify-between gap-2 group-data-[collapsible=icon]:hidden">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-sidebar-primary flex items-center justify-center flex-shrink-0">
              <span className="text-sidebar-primary-foreground font-bold text-sm">C</span>
            </div>
            <div className="flex flex-col leading-none min-w-0">
              <span className="font-semibold text-sidebar-foreground text-sm">Canele</span>
              <span className="text-xs text-sidebar-foreground/60">Gestión de rutas</span>
            </div>
          </div>
          <SidebarTrigger className="text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent rounded-md transition-colors flex-shrink-0" />
        </div>
        {/* Sidebar colapsado: solo el trigger como único elemento visible */}
        <div className="hidden group-data-[collapsible=icon]:flex justify-center">
          <SidebarTrigger className="text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent rounded-md transition-colors" />
        </div>
      </SidebarHeader>

      <SidebarContent>
        {navItems.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel className="text-sidebar-foreground/40 uppercase text-[10px] font-semibold tracking-wider">
              {group.label}
            </SidebarGroupLabel>
            <SidebarMenu>
              {group.items.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      isActive={isActive}
                      tooltip={item.title}
                      className={cn(
                        'text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent',
                        isActive && 'bg-sidebar-accent text-sidebar-foreground font-medium'
                      )}
                      render={
                        <Link href={item.href}>
                          <item.icon className="shrink-0" />
                          <span>{item.title}</span>
                          {item.title === 'Pagos' && morososCount > 0 && (
                            <Badge variant="destructive" className="ml-auto text-[10px] h-4 px-1 min-w-5 flex items-center justify-center group-data-[collapsible=icon]:hidden">
                              {morososCount}
                            </Badge>
                          )}
                          {isActive && item.title !== 'Pagos' && (
                            <ChevronRight className="ml-auto h-3 w-3 opacity-50 group-data-[collapsible=icon]:hidden" />
                          )}
                        </Link>
                      }
                    />
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="p-3">
        <SidebarMenu>
          <SidebarMenuItem>
            {/* Botón de cerrar sesión — llama el server action directamente */}
            <SidebarMenuButton
              tooltip="Cerrar sesión"
              className="text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent"
              render={
                <button type="button" onClick={() => logout()}>
                  <LogOut className="shrink-0" />
                  <span>Cerrar sesión</span>
                </button>
              }
            />
          </SidebarMenuItem>
        </SidebarMenu>
        <p className="text-[11px] text-sidebar-foreground/30 text-center mt-2 group-data-[collapsible=icon]:hidden">
          Canele App v2.0
        </p>
      </SidebarFooter>
    </Sidebar>
  )
}
