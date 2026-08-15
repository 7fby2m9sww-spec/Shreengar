'use client'

import React, { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { ChevronDown, LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { AdminSidebarItem } from './AdminSidebarItem'
import { NavChildItem } from './AdminNavConfig'


interface AdminSidebarGroupProps {
  id: string
  label: string
  icon: LucideIcon
  subItems: NavChildItem[]
  isCollapsed?: boolean
  onSelectChild?: () => void
}

export const AdminSidebarGroup: React.FC<AdminSidebarGroupProps> = ({
  id,
  label,
  icon: Icon,
  subItems,
  isCollapsed = false,
  onSelectChild,
}) => {
  const pathname = usePathname()

  // Check if any child route is active
  const isAnyChildActive = subItems.some(
    child =>
      !child.comingSoon &&
      child.href !== '#' &&
      (pathname === child.href || (child.href !== '/admin' && pathname.startsWith(child.href.split('?')[0])))
  )

  const [isOpen, setIsOpen] = useState(isAnyChildActive)

  // Expand automatically if route matches any child
  useEffect(() => {
    if (isAnyChildActive) {
      setIsOpen(true)
    }
  }, [pathname, isAnyChildActive])

  const [unreadSupportCount, setUnreadSupportCount] = useState(0)

  useEffect(() => {
    const SUPPORT_UNREAD_COUNT_ENABLED = false
    if (!SUPPORT_UNREAD_COUNT_ENABLED) return

    const hasSupport = subItems.some(item => item.href === '/admin/support')
    if (!hasSupport) return

    let isMounted = true
    let errorLogged = false
    let isFetching = false
    let intervalId: NodeJS.Timeout | null = null
    const abortController = new AbortController()

    const fetchUnreadCount = async () => {
      if (isFetching) return
      isFetching = true
      try {
        const res = await fetch('/api/admin/support/unread-count', {
          cache: 'no-store',
          signal: abortController.signal
        })

        if (!isMounted) return

        if (res.ok) {
          const data = await res.json()
          if (data.success) {
            setUnreadSupportCount(data.count)
          } else {
            setUnreadSupportCount(0)
            if (!errorLogged) {
              console.error('Failed to fetch unread support count:', data.error || 'Unknown error')
              errorLogged = true
            }
          }
        } else {
          setUnreadSupportCount(0)
          if (res.status === 401 || res.status === 403) {
            if (!errorLogged) {
              console.error(`Admin support count fetch stopped: Session status ${res.status}`)
              errorLogged = true
            }
            if (intervalId) {
              clearInterval(intervalId)
            }
            return
          }

          if (!errorLogged) {
            console.error('Failed to fetch unread support count status:', res.status)
            errorLogged = true
          }
        }
      } catch (err: any) {
        if (err.name === 'AbortError') return
        if (!isMounted) return
        setUnreadSupportCount(0)
        if (!errorLogged) {
          console.error('Failed to fetch unread support count:', err)
          errorLogged = true
        }
      } finally {
        isFetching = false
      }
    }

    fetchUnreadCount()

    intervalId = setInterval(fetchUnreadCount, 60000)

    return () => {
      isMounted = false
      abortController.abort()
      if (intervalId) {
        clearInterval(intervalId)
      }
    }
  }, [subItems])

  return (
    <div className="space-y-1">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-controls={`subgroup-${id}`}
        title={isCollapsed ? label : undefined}
        className={cn(
          'w-full flex items-center justify-between min-h-[44px] px-3 py-2.5 rounded-xl text-xs font-semibold transition-all group focus:outline-none focus:ring-2 focus:ring-[#D4AF37]',
          isAnyChildActive
            ? 'bg-[#8C3A57]/60 text-[#D4AF37] border-l-4 border-[#D4AF37]'
            : 'text-[#FAF8F5]/90 hover:bg-[#8C3A57]/30 hover:text-[#FFF4DC]'
        )}
      >
        <div className="flex items-center space-x-3 truncate">
          <Icon
            className={cn(
              'w-4 h-4 flex-shrink-0 transition-transform group-hover:scale-110',
              isAnyChildActive ? 'text-[#D4AF37]' : 'text-[#FAF8F5]/70'
            )}
          />
          {!isCollapsed && <span className="truncate">{label}</span>}
        </div>

        {!isCollapsed && (
          <ChevronDown
            className={cn(
              'w-3.5 h-3.5 text-[#FAF8F5]/60 transition-transform duration-200 ml-2 flex-shrink-0',
              isOpen && 'rotate-180 text-[#D4AF37]'
            )}
          />
        )}
      </button>

      {/* Expanded Child Items */}
      {!isCollapsed && isOpen && (
        <div id={`subgroup-${id}`} className="space-y-0.5 pt-0.5 transition-all duration-200">
          {subItems.map(child => {
            let childBadge: React.ReactNode = undefined
            if (child.href === '/admin/support' && unreadSupportCount > 0) {
              childBadge = (
                <span className="bg-amber-500 text-[#5C0B26] font-bold text-[9px] px-1.5 py-0.5 rounded-full ml-auto">
                  {unreadSupportCount}
                </span>
              )
            }
            return (
              <AdminSidebarItem
                key={child.label + child.href}
                label={child.label}
                href={child.href}
                comingSoon={child.comingSoon}
                isChild
                onSelect={onSelectChild}
                badge={childBadge}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}
