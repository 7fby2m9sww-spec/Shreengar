'use client'

import React from 'react'
import { usePathname } from 'next/navigation'
import type { LucideIcon } from 'lucide-react'
import {
  CircleUserRound,
  Package,
  Heart,
  MapPin,
  Settings,
  LogOut,
  ShieldCheck
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { Profile } from '@/lib/auth/getSession'
import { AccountNavItem } from '@/components/store/account/AccountNavItem'

interface AccountSidebarProps {
  profile: Profile
}

type AccountNavigationItem = {
  href: string
  label: string
  icon: LucideIcon
}

const accountNavigation: AccountNavigationItem[] = [
  { href: '/account', label: 'My Account', icon: CircleUserRound },
  { href: '/orders', label: 'Orders', icon: Package },
  { href: '/wishlist', label: 'Wishlist', icon: Heart },
  { href: '/addresses', label: 'Addresses', icon: MapPin },
  { href: '/settings', label: 'Settings', icon: Settings },
]

export const AccountSidebar: React.FC<AccountSidebarProps> = ({ profile }) => {
  const pathname = usePathname()
  const { logout, isLoading: isLoggingOut } = useAuth()

  const fullName = profile.full_name || 'Customer'
  const avatarLetter = fullName[0].toUpperCase()

  const handleLogout = async () => {
    await logout()
  }

  return (
    <aside className="hidden md:block w-64 xl:w-72 flex-shrink-0">
      {/* Profile Header */}
      <div className="flex items-center space-x-4 mb-6 px-3">
        <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground font-bold text-lg flex items-center justify-center shrink-0 shadow-sm">
          {avatarLetter}
        </div>
        <div>
          <h3 className="font-serif font-semibold text-base text-foreground leading-tight line-clamp-1">{fullName}</h3>
          <div className="flex items-center space-x-1.5 text-[11px] text-success font-medium mt-1">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Verified Customer</span>
          </div>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="space-y-1">
        <div className="space-y-1.5">
          {accountNavigation.map((item) => (
            <AccountNavItem
              key={item.href}
              href={item.href}
              label={item.label}
              icon={item.icon}
            />
          ))}

          <button
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="w-full flex items-center space-x-3 px-3 h-11 rounded-lg text-destructive hover:bg-destructive/10 hover:text-destructive font-medium transition-colors disabled:opacity-50 mt-4 border border-transparent"
          >
            <LogOut className="w-[18px] h-[18px]" />
            <span className="flex-1 text-left">{isLoggingOut ? 'Logging Out...' : 'Log Out'}</span>
          </button>
        </div>
      </nav>
    </aside>
  )
}
