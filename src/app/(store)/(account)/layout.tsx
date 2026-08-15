import React from 'react'
import { getSession } from '@/lib/auth/getSession'
import { redirect } from 'next/navigation'
import { AccountSidebar } from '@/components/store/AccountSidebar'

export const dynamic = 'force-dynamic'

export default async function AccountGroupLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // 1. Authenticate user session server-side
  const session = await getSession()

  // 2. Fallback redirect for guests
  if (!session.authenticated) {
    redirect('/auth/login?next=/account')
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-10">
      <div className="flex flex-col md:flex-row gap-8 lg:gap-12 items-start">
        {/* Account navigation Sidebar (desktop) and Drawer (mobile) */}
        <AccountSidebar profile={session.profile} />

        {/* Content panel */}
        <main className="flex-1 w-full bg-surface sm:p-8 lg:p-10 rounded-2xl min-w-0">
          {children}
        </main>
      </div>
    </div>
  )
}
