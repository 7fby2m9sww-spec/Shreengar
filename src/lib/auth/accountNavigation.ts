import {
  CircleUserRound,
  Package,
  Heart,
  MapPin,
  Settings,
  LayoutDashboard
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export interface NavItem {
  href: string
  label: string
  icon: LucideIcon
}

export function getAccountNavigation(role: 'admin' | 'customer' | string | undefined): NavItem[] {
  if (role === 'admin' || role === 'super_admin' || role === 'manager' || role === 'inventory_manager' || role === 'customer_support') {
    return [
      { href: '/admin/dashboard', label: 'Admin Panel', icon: LayoutDashboard },
      { href: '/settings', label: 'Settings', icon: Settings },
    ]
  }

  // Default to customer navigation
  return [
    { href: '/account', label: 'My Account', icon: CircleUserRound },
    { href: '/orders', label: 'My Orders', icon: Package },
    { href: '/wishlist', label: 'Wishlist', icon: Heart },
    { href: '/addresses', label: 'Addresses', icon: MapPin },
    { href: '/settings', label: 'Settings', icon: Settings },
  ]
}
