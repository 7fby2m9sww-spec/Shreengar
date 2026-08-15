'use client'

import React, { useState } from 'react'
import { AdminSidebar } from './AdminSidebar'
import { AdminTopbar } from './AdminTopbar'
import { AdminMobileDrawer } from './AdminMobileDrawer'

interface AdminShellProps {
  children: React.ReactNode
  userRole?: string
}

export const AdminShell: React.FC<AdminShellProps> = ({ children, userRole = 'super_admin' }) => {
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false)

  return (
    <div className="flex h-screen bg-[#FAF8F5] text-[#2B1A1F] dark:bg-[#140C10] dark:text-[#F7EFD9] overflow-hidden font-sans">
      {/* Desktop & Tablet Fixed Sidebar */}
      <AdminSidebar userRole={userRole} />

      {/* Mobile Slide-Over Drawer */}
      <AdminMobileDrawer
        isOpen={isMobileDrawerOpen}
        onClose={() => setIsMobileDrawerOpen(false)}
        userRole={userRole}
      />

      {/* Main App Layout Container */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto custom-scrollbar">
        <AdminTopbar onOpenMobileDrawer={() => setIsMobileDrawerOpen(true)} />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1600px] w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
