'use client'

import React, { useEffect, useRef } from 'react'
import Link from 'next/link'
import { X, Store, LogOut } from 'lucide-react'
import { ADMIN_NAV_CONFIG } from './AdminNavConfig'
import { AdminSidebarGroup } from './AdminSidebarGroup'
import { AdminSidebarItem } from './AdminSidebarItem'
import { PermissionAwareNavItem } from './PermissionAwareNavItem'
import { logoutAction } from '@/services/auth'
import { ShreengarLogo } from '@/components/store/ShreengarLogo'

interface AdminMobileDrawerProps {
  isOpen: boolean
  onClose: () => void
  userRole?: string
}

export const AdminMobileDrawer: React.FC<AdminMobileDrawerProps> = ({
  isOpen,
  onClose,
  userRole = 'super_admin',
}) => {
  const drawerRef = useRef<HTMLDivElement>(null)

  // Handle Escape key to close drawer & trap focus
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }

    if (isOpen) {
      document.body.style.overflow = 'hidden'
      window.addEventListener('keydown', handleKeyDown)
    } else {
      document.body.style.overflow = ''
    }

    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex md:hidden"
      role="dialog"
      aria-modal="true"
      aria-label="Admin Navigation Menu"
    >
      {/* Dark Overlay Backdrop */}
      <div
        className="fixed inset-0 bg-[#140C10]/80 backdrop-blur-xs transition-opacity animate-in fade-in"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Slide-Over Drawer Container */}
      <div
        ref={drawerRef}
        className="relative flex-1 flex flex-col max-w-xs w-full bg-[#5C0B26] dark:bg-[#190E13] text-[#FAF8F5] shadow-2xl z-10 animate-in slide-in-from-left duration-300 border-r border-[#8C3A57]/30"
      >
        {/* Drawer Header */}
        <div className="p-4 border-b border-[#8C3A57]/30 flex items-center justify-between">
          <div className="flex flex-col space-y-1 overflow-hidden">
            <ShreengarLogo href="/admin" variant="dark" />
            <span className="text-[9px] uppercase tracking-widest text-[#D4AF37] font-semibold block pl-1">
              Enterprise Admin
            </span>
          </div>

          <button
            onClick={onClose}
            className="p-2.5 rounded-xl bg-[#8C3A57]/40 hover:bg-[#8C3A57] text-[#D4AF37] transition-colors focus:outline-none focus:ring-2 focus:ring-[#D4AF37]"
            aria-label="Close navigation menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Drawer Scrollable Navigation */}
        <nav className="flex-1 py-4 px-3 space-y-2 overflow-y-auto custom-scrollbar">
          {ADMIN_NAV_CONFIG.map(item => (
            <PermissionAwareNavItem
              key={item.id}
              requiredPermission={item.requiredPermission}
              userRole={userRole}
            >
              {item.children && item.children.length > 0 ? (
                <AdminSidebarGroup
                  id={item.id}
                  label={item.label}
                  icon={item.icon}
                  subItems={item.children}
                  onSelectChild={onClose}
                />
              ) : (
                <AdminSidebarItem
                  label={item.label}
                  href={item.href || '#'}
                  icon={item.icon}
                  onSelect={onClose}
                />
              )}
            </PermissionAwareNavItem>
          ))}
        </nav>

        {/* Drawer Footer Actions */}
        <div className="p-4 border-t border-[#8C3A57]/30 bg-[#5C0B26]/60 dark:bg-[#190E13]/60 space-y-2">
          <Link
            href="/"
            onClick={onClose}
            className="flex items-center justify-center space-x-2 min-h-[44px] w-full py-2.5 px-3 bg-[#D4AF37]/10 hover:bg-[#D4AF37]/20 text-[#D4AF37] rounded-xl text-xs font-semibold transition-colors"
          >
            <Store className="w-4 h-4 flex-shrink-0" />
            <span>View Storefront</span>
          </Link>

          <form action={logoutAction} className="w-full">
            <button
              type="submit"
              className="flex items-center justify-center space-x-2 min-h-[44px] w-full py-2.5 px-3 bg-rose-900/40 hover:bg-rose-900/80 text-rose-200 rounded-xl text-xs font-semibold transition-colors"
            >
              <LogOut className="w-4 h-4 flex-shrink-0" />
              <span>Logout</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
