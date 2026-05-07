// MobileBottomNav.tsx — Barra de navegación inferior para móviles (< 768px)
'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard,
  MapPin,
  ShoppingBag,
  Users,
  Package,
  AlertTriangle,
  Map,
  CreditCard,
  UtensilsCrossed,
  BarChart3,
  MoreHorizontal,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu'

const primaryItems = [
  { title: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { title: 'Rutas', href: '/rutas', icon: MapPin },
  { title: 'Pedidos', href: '/pedidos', icon: ShoppingBag },
  { title: 'Clientes', href: '/clientes', icon: Users },
]

const moreItems = [
  { title: 'Productos', href: '/productos', icon: Package },
  { title: 'Faltantes', href: '/faltantes', icon: AlertTriangle },
  { title: 'Pagos', href: '/pagos', icon: CreditCard },
  { title: 'Producción', href: '/produccion', icon: UtensilsCrossed },
  { title: 'Reportes', href: '/reportes', icon: BarChart3 },
  { title: 'Mapa', href: '/mapa', icon: Map },
]

export function MobileBottomNav({ morososCount = 0 }: { morososCount?: number }) {
  const pathname = usePathname()
  const router = useRouter()

  if (pathname === '/login') return null

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-sidebar border-t border-sidebar-border/20 md:hidden">
      <div className="flex items-center justify-around h-14 px-1 pb-safe">
        {primaryItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center justify-center gap-0.5 min-w-0 flex-1 h-full transition-colors',
                isActive
                  ? 'text-sidebar-primary-foreground'
                  : 'text-sidebar-foreground/50 hover:text-sidebar-foreground/80',
              )}
            >
              <item.icon className={cn('h-4 w-4', isActive && 'text-sidebar-primary-foreground')} />
              <span className="text-[10px] font-medium leading-none truncate w-full text-center">
                {item.title}
              </span>
            </Link>
          )
        })}

        <DropdownMenu>
          <DropdownMenuTrigger className={cn(
            'flex flex-col items-center justify-center gap-0.5 min-w-0 flex-1 h-full transition-colors cursor-pointer bg-transparent border-none',
            moreItems.some(i => pathname === i.href || pathname.startsWith(i.href + '/'))
              ? 'text-sidebar-primary-foreground'
              : 'text-sidebar-foreground/50 hover:text-sidebar-foreground/80',
          )}>
            <MoreHorizontal className="h-4 w-4" />
            <span className="text-[10px] font-medium leading-none truncate w-full text-center">
              Más
            </span>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            side="top"
            sideOffset={8}
            className="min-w-40"
          >
              {moreItems.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
              return (
                <DropdownMenuItem
                  key={item.href}
                  onClick={() => router.push(item.href)}
                  className={cn('cursor-pointer', isActive && 'font-medium')}
                >
                  <div className="flex items-center gap-2 w-full">
                    <item.icon className="h-4 w-4 shrink-0" />
                    <span className="flex-1">{item.title}</span>
                    {item.title === 'Pagos' && morososCount > 0 && (
                      <span className="text-[10px] bg-destructive text-destructive-foreground rounded-full px-1.5 min-w-4 h-4 flex items-center justify-center font-medium">
                        {morososCount}
                      </span>
                    )}
                  </div>
                </DropdownMenuItem>
              )
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </nav>
  )
}
