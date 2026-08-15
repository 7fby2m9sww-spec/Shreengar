'use client'

import React, { useEffect, useState } from 'react'
import {
  AdminPageHeader,
  EmptyState,
  SearchAndFilterBar,
  TableSkeleton,
} from '@/components/admin/AdminUI'
import { DataTable, Column } from '@/components/ui/DataTable'
import { KeyRound } from 'lucide-react'
import { getPermissions } from '@/services/admin'
import { Permission } from '@/types/database'

export default function AdminPermissionsPage() {
  const [permissions, setPermissions] = useState<Permission[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    async function loadPermissions() {
      try {
        const data = await getPermissions()
        setPermissions(data)
      } catch {}
      setIsLoading(false)
    }
    loadPermissions()
  }, [])

  const columns: Column<Permission>[] = [
    {
      header: 'Permission Scope',
      accessor: (row) => (
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-xl bg-amber-500/10 text-amber-900 border border-amber-500/30">
            <KeyRound className="w-4 h-4 text-[#D4AF37]" />
          </div>
          <div>
            <h4 className="font-serif font-bold text-xs text-[#2B1A1F]">{row.name}</h4>
            <span className="font-mono text-[10px] text-[#7A6B70]">{row.name}</span>
          </div>
        </div>
      ),
    },
    {
      header: 'System Module Tag',
      accessor: (row) => (
        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#5C0B26]/10 text-[#5C0B26] border border-[#5C0B26]/20">
          {row.module.toUpperCase()}
        </span>
      ),
    },
    {
      header: 'Description',
      accessor: (row) => <p className="text-xs text-[#7A6B70]">{row.description}</p>,
    },
  ]

  const filteredPermissions = permissions.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Granular Permissions Catalog"
        description="System-defined security scopes for Role-Based Access Control (RBAC) governance."
        badgeText={`${permissions.length} Scopes`}
      />

      <SearchAndFilterBar
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search permission scope or name..."
      />

      {isLoading ? (
        <TableSkeleton rows={4} />
      ) : filteredPermissions.length === 0 ? (
        <EmptyState
          title="No Permissions Scopes Found"
          description="System permission scopes will be listed here."
          icon={KeyRound}
        />
      ) : (
        <div className="bg-white rounded-2xl border border-[#5C0B26]/10 shadow-sm overflow-hidden p-2 dark:bg-[#1A0E12] dark:border-[#4A2D35]">
          <DataTable columns={columns} data={filteredPermissions} />
        </div>
      )}
    </div>
  )
}
