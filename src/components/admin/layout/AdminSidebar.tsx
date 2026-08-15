'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { ChevronLeft, ChevronRight, Store, LogOut } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ADMIN_NAV_CONFIG } from './AdminNavConfig'
import { AdminSidebarGroup } from './AdminSidebarGroup'
import { AdminSidebarItem } from './AdminSidebarItem'
import { PermissionAwareNavItem } from './PermissionAwareNavItem'
import { logoutAction } from '@/services/auth'

interface AdminSidebarProps {
  userRole?: string
}

export const AdminSidebar: React.FC<AdminSidebarProps> = ({ userRole = 'super_admin' }) => {
  const [isCollapsed, setIsCollapsed] = useState(false)

  return (
    <aside
      className={cn(
        'hidden md:flex bg-[#5C0B26] text-[#FAF8F5] flex-col h-screen sticky top-0 border-r border-[#8C3A57]/30 shadow-2xl flex-shrink-0 transition-all duration-300 z-40 dark:bg-[#190E13] dark:text-[#FAF8F5]',
        isCollapsed ? 'w-20' : 'w-64'
      )}
    >
      {/* Brand Header */}
      <div className="p-5 border-b border-[#8C3A57]/30 flex items-center justify-between">
        <div className="flex items-center space-x-3 overflow-hidden">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#D4AF37] to-amber-600 text-[#5C0B26] font-serif font-bold text-lg flex items-center justify-center shadow-lg flex-shrink-0">
            S
          </div>
          {!isCollapsed && (
            <div className="transition-opacity duration-200 truncate">
              <h2 className="font-serif text-base font-bold tracking-wider text-[#FAF8F5]">SHREENGAR</h2>
              <span className="text-[9px] uppercase tracking-widest text-[#D4AF37] font-semibold block -mt-0.5">
                Enterprise Admin
              </span>
            </div>
          )}
        </div>

        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-1.5 rounded-lg bg-[#8C3A57]/40 hover:bg-[#8C3A57] text-[#D4AF37] transition-colors focus:outline-none focus:ring-2 focus:ring-[#D4AF37]"
          title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          aria-label={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Navigation List */}
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
                isCollapsed={isCollapsed}
              />
            ) : (
              <AdminSidebarItem
                label={item.label}
                href={item.href || '#'}
                icon={item.icon}
                isCollapsed={isCollapsed}
              />
            )}
          </PermissionAwareNavItem>
        ))}
      </nav>

      {/* Footer Actions */}
      <div className="p-3 border-t border-[#8C3A57]/30 bg-[#5C0B26]/60 dark:bg-[#190E13]/60 space-y-2">
        <Link
          href="/"
          title={isCollapsed ? 'Storefront' : undefined}
          className="flex items-center justify-center space-x-2 w-full py-2.5 px-3 min-h-[44px] bg-[#D4AF37]/10 hover:bg-[#D4AF37]/20 text-[#D4AF37] rounded-xl text-xs font-semibold transition-colors"
        >
          <Store className="w-4 h-4 flex-shrink-0" />
          {!isCollapsed && <span>View Storefront</span>}
        </Link>

        <form action={logoutAction} className="w-full">
          <button
            type="submit"
            title={isCollapsed ? 'Logout' : undefined}
            className="flex items-center justify-center space-x-2 w-full py-2.5 px-3 min-h-[44px] bg-rose-900/40 hover:bg-rose-900/80 text-rose-200 rounded-xl text-xs font-semibold transition-colors"
          >
            <LogOut className="w-4 h-4 flex-shrink-0" />
            {!isCollapsed && <span>Logout</span>}
          </button>
        </form>
      </div>
    </aside>
  )
}
