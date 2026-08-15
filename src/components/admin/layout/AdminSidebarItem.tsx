'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface AdminSidebarItemProps {
  label: string
  href: string
  icon?: LucideIcon
  isChild?: boolean
  comingSoon?: boolean
  isCollapsed?: boolean
  onSelect?: () => void
  badge?: React.ReactNode
}

export const AdminSidebarItem: React.FC<AdminSidebarItemProps> = ({
  label,
  href,
  icon: Icon,
  isChild = false,
  comingSoon = false,
  isCollapsed = false,
  onSelect,
  badge,
}) => {
  const pathname = usePathname()

  const isActive =
    !comingSoon &&
    href !== '#' &&
    (pathname === href || (href !== '/admin' && pathname.startsWith(href)))

  if (comingSoon) {
    return (
      <div
        className={cn(
          'flex items-center space-x-3 min-h-[44px] px-3 py-2.5 rounded-xl text-xs font-medium text-[#FAF8F5]/40 cursor-not-allowed select-none',
          isChild && 'pl-9'
        )}
        title={`${label} (Coming Soon)`}
      >
        {Icon && <Icon className="w-4 h-4 flex-shrink-0 opacity-40" />}
        {!isCollapsed && (
          <div className="flex items-center justify-between w-full">
            <span className="truncate">{label}</span>
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-[#D4AF37] border border-[#D4AF37]/30">
              Soon
            </span>
          </div>
        )}
      </div>
    )
  }

  return (
    <Link
      href={href}
      onClick={onSelect}
      title={isCollapsed ? label : undefined}
      className={cn(
        'flex items-center space-x-3 min-h-[44px] px-3 py-2.5 rounded-xl text-xs font-medium transition-all group relative focus:outline-none focus:ring-2 focus:ring-[#D4AF37]',
        isChild && 'pl-9',
        isActive
          ? 'bg-gradient-to-r from-[#8C3A57]/90 to-[#5C0B26] text-[#D4AF37] font-bold shadow-md border-l-4 border-[#D4AF37] dark:bg-[#5C0B26] dark:text-[#FFF4DC]'
          : 'text-[#FAF8F5]/90 hover:bg-[#8C3A57]/40 hover:text-[#FFF4DC] dark:text-[#FFF4DC] dark:hover:bg-[#211318]'
      )}
    >
      {Icon && (
        <Icon
          className={cn(
            'w-4 h-4 flex-shrink-0 transition-transform group-hover:scale-110',
            isActive ? 'text-[#D4AF37]' : 'text-[#FAF8F5]/70'
          )}
        />
      )}
      {!isCollapsed && <span className="truncate flex-1">{label}</span>}
      {!isCollapsed && badge}

      {isActive && !isCollapsed && !badge && (
        <span className="w-1.5 h-1.5 rounded-full bg-[#D4AF37] shadow-glow ml-auto" />
      )}
    </Link>
  )
}
