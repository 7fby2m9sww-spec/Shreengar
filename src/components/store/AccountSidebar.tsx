'use client'

import React from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
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
  Sun,
  Moon
} from 'lucide-react'
import { useTheme } from '@teispace/next-themes'
import { useAuth } from '@/context/AuthContext'
import { Profile } from '@/lib/auth/getSession'
import { AccountNavItem } from '@/components/store/account/AccountNavItem'
import { getAccountNavigation } from '@/lib/auth/accountNavigation'

interface AccountSidebarProps {
  profile: Profile
}

export const AccountSidebar: React.FC<AccountSidebarProps> = ({ profile }) => {
  const pathname = usePathname()
  const { logout, isLoading: isLoggingOut } = useAuth()
  const { theme, setTheme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)
 
  React.useEffect(() => {
    setMounted(true)
  }, [])

  const fullName = profile.full_name || (profile.role === 'admin' ? 'Admin' : 'Customer')
  const avatarLetter = fullName[0].toUpperCase()

  const handleLogout = async () => {
    await logout()
  }

  const accountNavigation = getAccountNavigation(profile.role)

  const navLinks = (
    <div className="space-y-1.5 font-sans">
      {accountNavigation.map((item) => (
        <AccountNavItem
          key={item.href}
          href={item.href}
          label={item.label}
          icon={item.icon}
        />
      ))}

      {mounted && (
        <div className="flex items-center justify-between px-3 py-2 bg-surface-muted/50 rounded-xl border border-border-warm/50 my-3 font-sans">
          <span className="text-xs font-bold text-foreground uppercase tracking-wider select-none">Appearance</span>
          <div className="flex items-center space-x-1 bg-surface-muted rounded-full p-0.5 border border-border/40">
            <button
              onClick={() => setTheme('light')}
              className={`p-2 rounded-full transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center cursor-pointer ${resolvedTheme === 'light' ? 'bg-surface text-accent shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
              aria-label="Light mode"
            >
              <Sun className="w-4 h-4" />
            </button>
            <button
              onClick={() => setTheme('dark')}
              className={`p-2 rounded-full transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center cursor-pointer ${resolvedTheme === 'dark' ? 'bg-surface text-accent shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
              aria-label="Dark mode"
            >
              <Moon className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
 
      <button
        onClick={handleLogout}
        disabled={isLoggingOut}
        className="w-full flex items-center space-x-3 px-3 h-11 rounded-lg text-destructive hover:bg-destructive/10 hover:text-destructive font-medium transition-colors disabled:opacity-50 mt-4 border border-transparent cursor-pointer transition-transform active:scale-98 duration-150"
      >
        <LogOut className="w-[18px] h-[18px]" />
        <span className="flex-1 text-left">{isLoggingOut ? 'Logging Out...' : 'Log Out'}</span>
      </button>
    </div>
  )

  return (
    <>
      {/* Mobile Drawer Trigger Bar */}
      <div className="md:hidden flex items-center justify-between p-3.5 bg-surface rounded-xl border border-border shadow-xs mb-3 w-full">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-full bg-[#5C0B26] text-amber-200 font-serif font-bold text-xs flex items-center justify-center shadow-sm border border-gold/15">
            {avatarLetter}
          </div>
          <div>
            <h4 className="text-xs font-bold text-foreground font-serif leading-none">{fullName}</h4>
          </div>
        </div>
        
        <button
          onClick={() => window.dispatchEvent(new CustomEvent('open-account-drawer'))}
          className="p-2 rounded-lg border border-border text-foreground bg-surface-muted/50 hover:bg-surface-muted min-w-[44px] min-h-[44px] flex items-center justify-center cursor-pointer transition-transform active:scale-90 duration-150"
          aria-label="Open Account Directory"
        >
          <Menu className="w-4 h-4" />
        </button>
      </div>

      {/* Mobile breadcrumb / navigation row */}
      <div className="md:hidden flex items-center space-x-1.5 text-[11px] sm:text-xs text-muted-foreground px-1 mb-4 font-sans select-none">
        <Link href="/" className="hover:text-gold transition-colors font-medium active:opacity-75 duration-150">
          Home
        </Link>
        <span className="text-muted-foreground/60">&rsaquo;</span>
        {pathname === '/account' ? (
          <span className="text-foreground font-semibold">My Account</span>
        ) : (
          <>
            <Link href="/account" className="hover:text-gold transition-colors font-medium active:opacity-75 duration-150">
              My Account
            </Link>
            <span className="text-muted-foreground/60">&rsaquo;</span>
            <span className="text-foreground font-semibold capitalize">
              {pathname.replace('/', '')}
            </span>
          </>
        )}
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
              <span>{profile.role === 'admin' ? 'Verified Admin' : 'Verified Customer'}</span>
            </div>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="space-y-1">
          {navLinks}
        </nav>
      </aside>
    </>
  )
}
