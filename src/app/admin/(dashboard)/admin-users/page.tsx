'use client'

import React, { useEffect, useState } from 'react'
import {
  AdminPageHeader,
  EmptyState,
  SearchAndFilterBar,
  TableSkeleton,
  StatusBadge,
} from '@/components/admin/AdminUI'
import { DataTable, Column } from '@/components/ui/DataTable'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Plus, ShieldAlert, UserCheck, ShieldCheck } from 'lucide-react'
import { getAdminUsers } from '@/services/admin'
import { createAdminUserAction } from '@/services/auth'
import { AdminUser } from '@/types/database'

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [roleCode, setRoleCode] = useState('admin')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    async function loadAdminUsers() {
      try {
        const data = await getAdminUsers()
        setUsers(data)
      } catch {}
      setIsLoading(false)
    }
    loadAdminUsers()
  }, [])

  const handleCreateStaff = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSubmitting(true)
    setErrorMsg(null)

    const formData = new FormData()
    formData.append('fullName', name)
    formData.append('email', email)
    formData.append('password', password)
    formData.append('roleCode', roleCode)

    const result = await createAdminUserAction(formData)

    if (result?.error) {
      setErrorMsg(result.error)
      setIsSubmitting(false)
    } else {
      setIsSubmitting(false)
      setIsModalOpen(false)
      setName('')
      setEmail('')
      setPassword('')
      const refreshed = await getAdminUsers()
      setUsers(refreshed)
    }
  }

  const columns: Column<AdminUser>[] = [
    {
      header: 'Staff Member',
      accessor: (row) => (
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-full bg-[#5C0B26] text-[#D4AF37] font-serif font-bold text-xs flex items-center justify-center border border-[#D4AF37]">
            {row.full_name ? row.full_name[0].toUpperCase() : 'A'}
          </div>
          <div>
            <h4 className="font-serif font-bold text-xs text-[#2B1A1F] dark:text-[#FFF4DC] flex items-center space-x-1">
              <span>{row.full_name || 'Admin User'}</span>
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 inline" />
            </h4>
            <span className="text-[10px] text-[#7A6B70] font-mono">{row.email}</span>
          </div>
        </div>
      ),
    },
    {
      header: 'Assigned System Role',
      accessor: (row) => (
        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-900 border border-amber-500/30">
          {row.role?.name || 'Super Admin'}
        </span>
      ),
    },
    {
      header: 'Status',
      accessor: (row) => <StatusBadge status={row.is_active ? 'active' : 'inactive'} />,
    },
  ]

  const filteredUsers = users.filter(u =>
    (u.full_name && u.full_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
    u.email.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Staff & Admin Directory"
        description="Manage administrative staff accounts, assign system roles, and audit access credentials."
        badgeText={`${users.length} Authorized Staff`}
        actions={
          <Button onClick={() => setIsModalOpen(true)} variant="primary" className="bg-[#5C0B26] hover:bg-[#8C3A57] dark:bg-gradient-to-r dark:from-[#861A39] dark:to-[#611026] dark:text-[#FFF4DC] dark:border-[#D0A45C]/25">
            <Plus className="w-4 h-4 mr-1 text-[#D4AF37]" /> Create Staff Member
          </Button>
        }
      />

      <SearchAndFilterBar
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search staff member by name or email..."
      />

      {isLoading ? (
        <TableSkeleton rows={4} />
      ) : filteredUsers.length === 0 ? (
        <EmptyState
          title="No Staff Accounts Found"
          description="Create a new administrative staff member account or run super admin setup."
          icon={UserCheck}
          action={
            <Button onClick={() => setIsModalOpen(true)} variant="primary" className="bg-[#5C0B26]">
              <Plus className="w-4 h-4 mr-1 text-[#D4AF37]" /> Create Staff Account
            </Button>
          }
        />
      ) : (
        <div className="bg-white rounded-2xl border border-[#5C0B26]/10 shadow-sm overflow-hidden p-2 dark:bg-[#211318] dark:border-[#70424E]">
          <DataTable
            columns={columns}
            data={filteredUsers}
          />
        </div>
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Create Authorized Staff Account">
        <form onSubmit={handleCreateStaff} className="space-y-4">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-300 text-rose-900 text-xs rounded-xl font-medium flex items-center space-x-2">
              <ShieldAlert className="w-4 h-4 text-rose-600 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <Input
            label="Staff Full Name"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. Ananya Roy"
            required
          />
          <Input
            label="Email Address"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="ananya@shreengar.com"
            required
          />
          <Input
            label="Account Password"
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            minLength={6}
          />

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#2B1A1F]/80 dark:text-[#D7C0B5]">
              RBAC Role Assignment
            </label>
            <select
              value={roleCode}
              onChange={e => setRoleCode(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-md border border-[#5C0B26]/20 dark:border-[#5D3944] bg-[#FAF8F5]/60 dark:bg-[#140C10] text-[#2B1A1F] dark:text-[#FFF4DC] focus:outline-none focus:ring-2 focus:ring-[#5C0B26]"
            >
              <option value="super_admin">Super Admin (Full Unrestricted Access)</option>
              <option value="admin">Admin (Manage Catalog, Orders, Banners)</option>
              <option value="manager">Manager (Manage Orders & Content)</option>
              <option value="staff">Staff (Fulfillment & Support Only)</option>
            </select>
          </div>

          <div className="flex justify-end space-x-2 pt-4 border-t border-[#5C0B26]/10">
            <Button variant="outline" type="button" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" className="bg-[#5C0B26] dark:bg-gradient-to-r dark:from-[#861A39] dark:to-[#611026] dark:text-[#FFF4DC] dark:border dark:border-[#D0A45C]/25" isLoading={isSubmitting}>
              Save Staff Member
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
