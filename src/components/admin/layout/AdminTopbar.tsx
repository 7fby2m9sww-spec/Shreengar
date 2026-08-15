'use client'

import React, { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Bell, Search, Plus, ShieldCheck, X, Menu } from 'lucide-react'
import { AdminUser } from '@/types/admin'

interface AdminTopbarProps {
  onOpenMobileDrawer: () => void
}

export const AdminTopbar: React.FC<AdminTopbarProps> = ({ onOpenMobileDrawer }) => {
  const [currentAdmin, setCurrentAdmin] = useState<AdminUser | null>(null)
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false)

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

  return (
    <header className="h-16 bg-[#FAF8F5]/90 backdrop-blur-md border-b border-[#5C0B26]/10 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30 shadow-xs dark:bg-[#140C10] dark:border-[#5D3944]">
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

        <div className="relative w-full">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#7A6B70]" />
          <input
            type="text"
            placeholder="Search products, orders, customers... (Ctrl + K)"
            className="w-full pl-9 pr-4 py-1.5 text-xs rounded-xl border border-[#5C0B26]/15 bg-white dark:bg-[#211318] text-[#2B1A1F] dark:text-[#D7C0B5] placeholder-[#7A6B70]/60 focus:outline-none focus:ring-2 focus:ring-[#5C0B26] transition-all shadow-2xs"
          />
        </div>
      </div>

      {/* Right: Notifications & Admin Profile */}
      <div className="flex items-center space-x-3 sm:space-x-4">

        {/* Notifications Dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
            className="relative p-2 text-[#2B1A1F]/70 hover:text-[#5C0B26] hover:bg-[#5C0B26]/5 rounded-xl transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
            title="Notifications"
            aria-label="Notifications"
          >
            <Bell className="w-5 h-5" />
            <span className="absolute top-2 right-2 w-2 h-2 bg-[#D4AF37] rounded-full animate-ping" />
            <span className="absolute top-2 right-2 w-2 h-2 bg-[#D4AF37] rounded-full shadow-xs" />
          </button>

          {isNotificationsOpen && (
            <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-[#211318] rounded-2xl border border-[#5C0B26]/15 dark:border-[#5D3944] shadow-xl p-4 space-y-3 z-50 animate-in fade-in zoom-in-95">
              <div className="flex items-center justify-between pb-2 border-b border-[#5C0B26]/10">
                <span className="font-serif font-bold text-sm text-[#2B1A1F] dark:text-[#FFF4DC]">Notifications</span>
                <button
                  type="button"
                  onClick={() => setIsNotificationsOpen(false)}
                  className="text-[#7A6B70] hover:text-[#2B1A1F]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-2 text-xs">
                <div className="p-2.5 rounded-xl bg-[#FAF8F5] dark:bg-[#211318] border border-[#5C0B26]/5 dark:border-[#5D3944] space-y-1">
                  <div className="flex items-center justify-between font-semibold text-[#2B1A1F] dark:text-[#FFF4DC]">
                    <span>New Order Received</span>
                    <span className="text-[10px] text-[#7A6B70]">2m ago</span>
                  </div>
                  <p className="text-[11px] text-[#7A6B70] dark:text-[#D7C0B5]">Order #SHR-1092 placed for ₹4,999</p>
                </div>

                <div className="p-2.5 rounded-xl bg-[#FAF8F5] dark:bg-[#2A171E] border border-[#5C0B26]/5 dark:border-[#5D3944] space-y-1">
                  <div className="flex items-center justify-between font-semibold text-[#2B1A1F] dark:text-[#FFF4DC]">
                    <span>Low Stock Alert</span>
                    <span className="text-[10px] text-[#7A6B70]">1h ago</span>
                  </div>
                  <p className="text-[11px] text-[#7A6B70] dark:text-[#D7C0B5]">Silk Anarkali (Red/M) has 2 items left</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Admin User Profile */}
        <div className="flex items-center space-x-3 pl-3 border-l border-[#5C0B26]/15">
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
