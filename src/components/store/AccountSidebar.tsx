'use client'

import React, { useState } from 'react'
import { usePathname } from 'next/navigation'
import type { LucideIcon } from 'lucide-react'
import {
  CircleUserRound,
  Package,
  Heart,
  MapPin,
  Settings,
  LogOut,
  ShieldCheck,
  Menu,
  X
} from 'lucide-react'
import { cn } from '@/lib/utils'
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
  const [isOpen, setIsOpen] = useState(false)
  const { logout, isLoading: isLoggingOut } = useAuth()

  const fullName = profile.full_name || 'Customer'
  const email = profile.email
  const avatarLetter = fullName[0].toUpperCase()

  const handleLogout = async () => {
    await logout()
  }

  const navLinks = (
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
  )

  return (
    <>
      {/* Mobile Drawer Trigger Bar */}
      <div className="md:hidden flex items-center justify-between p-3.5 bg-surface rounded-xl border border-border shadow-xs mb-4">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground font-serif font-bold text-xs flex items-center justify-center shadow-sm">
            {avatarLetter}
          </div>
          <div>
            <h4 className="text-xs font-bold text-foreground font-serif leading-none">{fullName}</h4>
          </div>
        </div>
        
        <button
          onClick={() => setIsOpen(true)}
          className="p-1.5 rounded-lg border border-border text-foreground bg-surface-muted/50 hover:bg-surface-muted"
        >
          <Menu className="w-4 h-4" />
        </button>
      </div>

      {/* Desktop Sidebar */}
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
          {navLinks}
        </nav>
      </aside>

      {/* Mobile Drawer Slide-over Overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/30 dark:bg-black/60 transition-opacity duration-300"
            onClick={() => setIsOpen(false)}
          />

          {/* Drawer Content */}
          <div className="relative w-72 max-w-xs bg-surface-muted h-full p-6 shadow-2xl flex flex-col justify-between border-r border-border animate-in slide-in-from-left duration-300">
            <div className="space-y-6">
              {/* Close Button */}
              <div className="flex items-center justify-between border-b border-border pb-3">
                <span className="font-serif font-bold text-foreground">Account Directory</span>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 rounded-lg text-foreground hover:bg-rose-900/10"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Profile Card Mini */}
              <div className="flex items-center space-x-3 pb-3 border-b border-border">
                <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground font-serif font-bold text-base flex items-center justify-center shadow-sm">
                  {avatarLetter}
                </div>
                <div>
                  <h3 className="font-serif font-bold text-sm text-foreground leading-none">{fullName}</h3>
                  <span className="text-[10px] text-muted-foreground font-mono block break-all leading-tight mt-0.5">{email}</span>
                </div>
              </div>

              {/* Links */}
              <nav className="space-y-1">
                {navLinks}
              </nav>
            </div>

            <div className="text-[10px] text-center text-muted-foreground font-serif">
              SHREENGAR Royal Couture © 2026
            </div>
          </div>
        </div>
      )}
    </>
  )
}
