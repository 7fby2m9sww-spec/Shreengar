'use client'

import React, { useEffect, useState, useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Bell,
  Search,
  ShieldCheck,
  X,
  Menu,
  ShoppingBag,
  UserPlus,
  Ticket,
  CheckCheck,
  ChevronRight,
  Sparkles
} from 'lucide-react'
import { AdminUser } from '@/types/admin'
import { createClient } from '@/lib/supabase/client'
import { getAdminLiveNotificationsAction, AdminNotificationItem } from '@/actions/admin/adminNotificationActions'

interface AdminTopbarProps {
  onOpenMobileDrawer: () => void
}

export const AdminTopbar: React.FC<AdminTopbarProps> = ({ onOpenMobileDrawer }) => {
  const router = useRouter()
  const dropdownRef = useRef<HTMLDivElement>(null)
  const [currentAdmin, setCurrentAdmin] = useState<AdminUser | null>(null)
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false)

  const [notifications, setNotifications] = useState<AdminNotificationItem[]>([])
  const [readIds, setReadIds] = useState<Set<string>>(new Set())
  const [filterTab, setFilterTab] = useState<'all' | 'unread'>('all')
  const [searchPlaceholder, setSearchPlaceholder] = useState('Search...')

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 640) {
        setSearchPlaceholder('Search...')
      } else {
        setSearchPlaceholder('Search products, orders, customers... (Ctrl + K)')
      }
    }
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Load Admin User Status
  useEffect(() => {
    async function loadAdmin() {
      try {
        const res = await fetch('/api/admin/status')
        const data = await res.json()
        if (data.isAdmin && data.admin) {
          setCurrentAdmin({
            id: data.admin.id,
            email: data.admin.email,
            full_name: data.admin.full_name,
            role: { code: data.admin.role?.code || 'super_admin', name: 'Admin' }
          })
        } else {
          setCurrentAdmin(null)
        }
      } catch (e) {
        console.error('Failed to load admin status', e)
        setCurrentAdmin(null)
      }
    }
    loadAdmin()
  }, [])

  // Load Read Notification IDs from LocalStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('shreengar_admin_read_notifications')
      if (stored) {
        const parsed = JSON.parse(stored)
        if (Array.isArray(parsed)) {
          setReadIds(new Set(parsed))
        }
      }
    } catch {}
  }, [])

  // Fetch Live Notifications from Server Action & Set Up Realtime Subscription
  const fetchLiveNotifications = async () => {
    try {
      const res = await getAdminLiveNotificationsAction()
      if (res.success && res.data) {
        setNotifications(res.data)
      }
    } catch (err) {
      console.error('Failed to load live admin notifications:', err)
    }
  }

  useEffect(() => {
    fetchLiveNotifications()

    // Realtime Postgres listener on orders, profiles, and coupons
    const supabase = createClient()
    const channel = supabase
      .channel('admin_topbar_notifications_realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, () => {
        fetchLiveNotifications()
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'profiles' }, () => {
        fetchLiveNotifications()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'coupons' }, () => {
        fetchLiveNotifications()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  // Outside Click Listener to Close Popover
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsNotificationsOpen(false)
      }
    }
    if (isNotificationsOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isNotificationsOpen])

  // Compute Unread Notifications
  const unreadNotifications = notifications.filter(n => !readIds.has(n.id))
  const unreadCount = unreadNotifications.length

  const visibleNotifications = filterTab === 'unread' ? unreadNotifications : notifications

  // Actions
  const markAsRead = (id: string) => {
    const nextRead = new Set(readIds)
    nextRead.add(id)
    setReadIds(nextRead)
    try {
      localStorage.setItem('shreengar_admin_read_notifications', JSON.stringify(Array.from(nextRead)))
    } catch {}
  }

  const markAllAsRead = () => {
    const allIds = new Set([...Array.from(readIds), ...notifications.map(n => n.id)])
    setReadIds(allIds)
    try {
      localStorage.setItem('shreengar_admin_read_notifications', JSON.stringify(Array.from(allIds)))
    } catch {}
  }

  const handleNotificationClick = (item: AdminNotificationItem) => {
    markAsRead(item.id)
    setIsNotificationsOpen(false)
    if (item.link) {
      router.push(item.link)
    }
  }

  const getNotificationIcon = (type: AdminNotificationItem['type']) => {
    switch (type) {
      case 'order':
        return (
          <div className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-[#5C0B26] border border-[#5C0B26]/10 shrink-0">
            <ShoppingBag className="w-4 h-4 text-[#5C0B26] dark:text-rose-300" />
          </div>
        )
      case 'customer':
        return (
          <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 border border-emerald-500/20 shrink-0">
            <UserPlus className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
        )
      case 'coupon':
        return (
          <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-800 border border-amber-500/20 shrink-0">
            <Ticket className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          </div>
        )
      default:
        return (
          <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-800 border border-purple-500/20 shrink-0">
            <ShieldCheck className="w-4 h-4 text-purple-600 dark:text-purple-400" />
          </div>
        )
    }
  }

  return (
    <header className="h-16 bg-[#FAF8F5]/90 backdrop-blur-md border-b border-[#5C0B26]/10 px-3 sm:px-6 flex items-center justify-between sticky top-0 z-30 shadow-xs dark:bg-[#140C10] dark:border-[#5D3944]">
      {/* Left: Mobile Menu Trigger & Quick Search */}
      <div className="flex items-center space-x-3 flex-1 max-w-md">
        <button
          type="button"
          onClick={onOpenMobileDrawer}
          className="md:hidden p-2 text-[#2B1A1F] hover:text-[#5C0B26] hover:bg-[#5C0B26]/5 rounded-xl transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
          aria-label="Open navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="relative w-full max-w-[110px] min-[360px]:max-w-[150px] xs:max-w-xs sm:max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#7A6B70]" />
          <input
            type="text"
            placeholder={searchPlaceholder}
            className="w-full pl-9 pr-4 py-1.5 text-xs rounded-xl border border-[#5C0B26]/15 bg-white dark:bg-[#211318] text-[#2B1A1F] dark:text-[#D7C0B5] placeholder-[#7A6B70]/60 focus:outline-none focus:ring-2 focus:ring-[#5C0B26] transition-all shadow-2xs"
          />
        </div>
      </div>

      {/* Right: Notifications & Admin Profile */}
      <div className="flex items-center space-x-2 sm:space-x-4">

        {/* Notifications Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
            className="relative p-2 text-[#2B1A1F]/70 hover:text-[#5C0B26] hover:bg-[#5C0B26]/5 rounded-xl transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
            title="Notifications"
            aria-label="Notifications"
          >
            <Bell className="w-5 h-5" />

            {/* Unread Counter Badge & Gold Dot */}
            {unreadCount > 0 && (
              <>
                <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-[#D4AF37] rounded-full animate-ping" />
                <span className="absolute -top-1 -right-1 bg-[#5C0B26] text-[#D4AF37] border border-[#D4AF37]/50 text-[10px] font-bold px-1.5 py-0.2 rounded-full min-w-[18px] text-center shadow-xs">
                  {unreadCount}
                </span>
              </>
            )}
          </button>

          {isNotificationsOpen && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-[#211318] rounded-2xl border border-[#5C0B26]/15 dark:border-[#5D3944] shadow-2xl z-50 animate-in fade-in zoom-in-95 overflow-hidden">
              {/* Popover Header */}
              <div className="p-3.5 bg-[#FAF8F5] dark:bg-[#1A0E13] border-b border-[#5C0B26]/10 dark:border-[#5D3944] flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="font-serif font-bold text-sm text-[#2B1A1F] dark:text-[#FFF4DC]">Notifications</span>
                  {unreadCount > 0 && (
                    <span className="bg-[#5C0B26]/10 dark:bg-rose-950/60 text-[#5C0B26] dark:text-rose-200 text-[10px] font-bold px-2 py-0.5 rounded-full border border-[#5C0B26]/20">
                      {unreadCount} unread
                    </span>
                  )}
                </div>
                <div className="flex items-center space-x-2">
                  {unreadCount > 0 && (
                    <button
                      type="button"
                      onClick={markAllAsRead}
                      className="text-[11px] font-semibold text-[#8C3A57] dark:text-rose-300 hover:underline flex items-center space-x-1 cursor-pointer"
                      title="Mark all notifications as read"
                    >
                      <CheckCheck className="w-3.5 h-3.5" />
                      <span>Mark all read</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setIsNotificationsOpen(false)}
                    className="text-[#7A6B70] hover:text-[#2B1A1F] p-1 rounded-lg hover:bg-black/5 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Filter Tabs */}
              <div className="px-3 py-2 bg-white dark:bg-[#211318] border-b border-[#5C0B26]/5 flex items-center space-x-2 text-xs">
                <button
                  type="button"
                  onClick={() => setFilterTab('all')}
                  className={`px-3 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                    filterTab === 'all'
                      ? 'bg-[#5C0B26] text-white font-semibold shadow-xs'
                      : 'text-[#7A6B70] hover:bg-[#5C0B26]/5'
                  }`}
                >
                  All ({notifications.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterTab('unread')}
                  className={`px-3 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                    filterTab === 'unread'
                      ? 'bg-[#5C0B26] text-white font-semibold shadow-xs'
                      : 'text-[#7A6B70] hover:bg-[#5C0B26]/5'
                  }`}
                >
                  Unread ({unreadCount})
                </button>
              </div>

              {/* Notification List Container */}
              <div className="max-h-88 overflow-y-auto p-2 space-y-1.5">
                {visibleNotifications.length === 0 ? (
                  <div className="py-8 text-center space-y-2">
                    <Sparkles className="w-8 h-8 text-[#D4AF37] mx-auto opacity-70" />
                    <p className="text-xs font-medium text-[#7A6B70] dark:text-[#D7C0B5]">
                      {filterTab === 'unread' ? 'No unread notifications' : 'No notifications found'}
                    </p>
                  </div>
                ) : (
                  visibleNotifications.map(item => {
                    const isUnread = !readIds.has(item.id)
                    return (
                      <div
                        key={item.id}
                        onClick={() => handleNotificationClick(item)}
                        className={`p-3 rounded-xl border transition-all cursor-pointer flex items-start space-x-3 group ${
                          isUnread
                            ? 'bg-[#5C0B26]/5 dark:bg-[#2A171E] border-[#5C0B26]/20 dark:border-[#5D3944]'
                            : 'bg-white dark:bg-[#211318] border-transparent hover:bg-[#FAF8F5] dark:hover:bg-[#26161D]'
                        }`}
                      >
                        {getNotificationIcon(item.type)}

                        <div className="flex-1 min-w-0 space-y-0.5">
                          <div className="flex items-center justify-between">
                            <span className={`text-xs font-bold truncate ${isUnread ? 'text-[#5C0B26] dark:text-[#FFF4DC]' : 'text-[#2B1A1F] dark:text-[#D7C0B5]'}`}>
                              {item.title}
                            </span>
                            <span className="text-[10px] text-[#7A6B70] font-medium shrink-0 pl-2">
                              {item.time}
                            </span>
                          </div>
                          <p className="text-[11px] text-[#7A6B70] dark:text-[#D7C0B5] line-clamp-2 leading-snug">
                            {item.message}
                          </p>
                        </div>

                        {isUnread && (
                          <span className="w-2 h-2 rounded-full bg-[#D4AF37] shrink-0 mt-1.5 shadow-xs" title="Unread" />
                        )}
                      </div>
                    )
                  })
                )}
              </div>

              {/* Popover Footer Action */}
              <div className="p-2.5 bg-[#FAF8F5] dark:bg-[#1A0E13] border-t border-[#5C0B26]/10 dark:border-[#5D3944] text-center">
                <Link
                  href="/admin/orders"
                  onClick={() => setIsNotificationsOpen(false)}
                  className="text-xs font-semibold text-[#5C0B26] dark:text-rose-300 hover:text-[#8C3A57] flex items-center justify-center space-x-1"
                >
                  <span>View All System Orders</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Admin User Profile */}
        <div className="flex items-center space-x-2 sm:space-x-3 pl-2 sm:pl-3 border-l border-[#5C0B26]/15">
          {currentAdmin?.avatar_url ? (
            <Image
              src={currentAdmin.avatar_url}
              alt={currentAdmin.full_name || 'Admin User'}
              width={34}
              height={34}
              className="w-8.5 h-8.5 rounded-full object-cover border-2 border-[#D4AF37] shadow-xs"
            />
          ) : (
            <div className="w-8.5 h-8.5 rounded-full bg-[#5C0B26] text-[#D4AF37] font-bold text-xs flex items-center justify-center border-2 border-[#D4AF37]">
              AD
            </div>
          )}
          <div className="hidden sm:flex flex-col">
            <span className="text-xs font-semibold text-[#2B1A1F] dark:text-[#D7C0B5] leading-tight flex items-center space-x-1">
              <span>{currentAdmin?.full_name || 'Store Administrator'}</span>
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 inline" />
            </span>
            <span className="text-[10px] text-[#8C3A57] font-bold uppercase tracking-wider">
              {currentAdmin?.role?.code ? currentAdmin.role.code.replace('_', ' ') : 'Super Admin'}
            </span>
          </div>
        </div>
      </div>
    </header>
  )
}
