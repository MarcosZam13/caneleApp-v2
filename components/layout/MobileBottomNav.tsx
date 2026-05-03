// MobileBottomNav.tsx — Barra de navegación inferior para móviles (< 768px)
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  MapPin,
  ShoppingBag,
  Users,
  Package,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const bottomNavItems = [
  { title: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { title: 'Rutas', href: '/rutas', icon: MapPin },
  { title: 'Pedidos', href: '/pedidos', icon: ShoppingBag },
  { title: 'Clientes', href: '/clientes', icon: Users },
  { title: 'Más', href: '/productos', icon: Package },
]

export function MobileBottomNav() {
  const pathname = usePathname()

  // Muestra solo en las rutas principales que el usuario frecuenta
  if (pathname === '/login') return null

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-sidebar border-t border-sidebar-border/20 md:hidden">
      <div className="flex items-center justify-around h-14 px-1 pb-safe">
        {bottomNavItems.map((item) => {
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
      </div>
    </nav>
  )
}
