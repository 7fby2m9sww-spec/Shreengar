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
import { Plus, Shield } from 'lucide-react'
import { getRoles } from '@/services/admin'
import { Role } from '@/types/database'

export default function AdminRolesPage() {
  const [roles, setRoles] = useState<Role[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [roleName, setRoleName] = useState('')
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    async function loadRoles() {
      try {
        const data = await getRoles()
        setRoles(data)
      } catch {}
      setIsLoading(false)
    }
    loadRoles()
  }, [])

  const handleAddRole = (e: React.FormEvent) => {
    e.preventDefault()
    const newR: Role = {
      id: `role-${Date.now()}`,
      name: roleName || 'Custom Role',
      code: roleName.toLowerCase().replace(/\s+/g, '_') || 'custom_role',
      description: 'Handles custom module operations.',
      is_system: false,
      created_at: new Date().toISOString(),
    }
    setRoles([...roles, newR])
    setIsModalOpen(false)
    setRoleName('')
  }

  const columns: Column<Role>[] = [
    {
      header: 'Role Name & Identifier',
      accessor: (row) => (
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-xl bg-[#5C0B26]/10 text-[#5C0B26] border border-[#5C0B26]/20">
            <Shield className="w-4 h-4" />
          </div>
          <div>
            <h4 className="font-serif font-bold text-xs text-[#2B1A1F]">{row.name}</h4>
            <span className="font-mono text-[10px] text-[#7A6B70]">{row.code}</span>
          </div>
        </div>
      ),
    },
    {
      header: 'Description',
      accessor: (row) => <p className="text-xs text-[#7A6B70]">{row.description}</p>,
    },
    {
      header: 'System Classification',
      accessor: (row) => (
        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-900 border border-amber-500/30">
          {row.is_system ? 'System Reserved' : 'Custom Defined'}
        </span>
      ),
    },
  ]

  const filteredRoles = roles.filter(r =>
    r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.code.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Role Definitions & RBAC"
        description="Define administrative roles and bind module-level operational access privileges."
        badgeText={`${roles.length} System Roles`}
        actions={
          <Button onClick={() => setIsModalOpen(true)} variant="primary" className="bg-[#5C0B26] hover:bg-[#8C3A57] dark:bg-gradient-to-r dark:from-[#861A39] dark:to-[#611026] dark:text-[#FFF4DC] dark:border-[#D0A45C]/25">
            <Plus className="w-4 h-4 mr-1 text-[#D4AF37]" /> Create Custom Role
          </Button>
        }
      />

      <SearchAndFilterBar
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search role name or code..."
      />

      {isLoading ? (
        <TableSkeleton rows={4} />
      ) : filteredRoles.length === 0 ? (
        <EmptyState
          title="No Roles Defined"
          description="Create role definitions for granular staff access control."
          icon={Shield}
          action={
            <Button onClick={() => setIsModalOpen(true)} variant="primary" className="bg-[#5C0B26]">
              <Plus className="w-4 h-4 mr-1 text-[#D4AF37]" /> Create First Role
            </Button>
          }
        />
      ) : (
        <div className="bg-white rounded-2xl border border-[#5C0B26]/10 shadow-sm overflow-hidden p-2 dark:bg-[#211318] dark:border-[#70424E]">
          <DataTable columns={columns} data={filteredRoles} />
        </div>
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Create System Role">
        <form onSubmit={handleAddRole} className="space-y-4">
          <Input
            label="Role Name"
            value={roleName}
            onChange={e => setRoleName(e.target.value)}
            placeholder="e.g. Catalog Manager"
            required
          />
          <div className="flex justify-end space-x-2 pt-4 border-t border-[#5C0B26]/10">
            <Button variant="outline" type="button" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" className="bg-[#5C0B26]">
              Save Role
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
