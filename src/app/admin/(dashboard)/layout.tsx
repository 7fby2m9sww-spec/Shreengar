export const dynamic = "force-dynamic";
import React from 'react'
import { AdminShell } from '@/components/admin/layout/AdminShell'
import { requireAdmin } from '@/services/auth'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Ensure request is from active Admin
  const admin = await requireAdmin()

  return (
    <AdminShell userRole={admin?.role || 'super_admin'}>
      {children}
    </AdminShell>
  )
}
