'use client'

import React, { useEffect, useState } from 'react'
import {
  AdminPageHeader,
  EmptyState,
  SearchAndFilterBar,
  TableSkeleton,
} from '@/components/admin/AdminUI'
import { DataTable, Column } from '@/components/ui/DataTable'
import { Button } from '@/components/ui/Button'
import { getAllCustomersAction, AdminCustomerListItem } from '@/actions/customers/actions'
import { formatINR, formatDate } from '@/lib/utils'
import { Users, Mail, Calendar, Phone, ArrowUpRight } from 'lucide-react'
import Link from 'next/link'

export default function AdminCustomersPage() {
  const [customers, setCustomers] = useState<AdminCustomerListItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  useEffect(() => {
    async function loadCustomers() {
      try {
        const res = await getAllCustomersAction()
        if (res.success && res.data) {
          setCustomers(res.data)
        } else {
          setErrorMsg(res.error || 'Unable to load customers. Please try again.')
        }
      } catch {
        setErrorMsg('Unable to load customers. Please try again.')
      }
      setIsLoading(false)
    }
    loadCustomers()
  }, [])

  const columns: Column<AdminCustomerListItem>[] = [
    {
      header: 'Customer Info',
      accessor: (row) => (
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-full bg-[#5C0B26] text-[#D4AF37] font-serif font-bold text-sm flex items-center justify-center border-2 border-[#D4AF37] flex-shrink-0 shadow-2xs">
            {row.full_name ? row.full_name[0].toUpperCase() : 'C'}
          </div>
          <div>
            <h4 className="font-serif font-bold text-xs text-[#2B1A1F] dark:text-[#FFF4DC]">
              {row.full_name || 'Customer User'}
            </h4>
            <span className="text-xs text-[#7A6B70] dark:text-[#D7C0B5] flex items-center space-x-1">
              <Mail className="w-3 h-3 text-[#8C3A57]" />
              <span>{row.email}</span>
            </span>
          </div>
        </div>
      ),
    },
    {
      header: 'Phone Number',
      accessor: (row) => (
        <span className="text-xs text-[#7A6B70] dark:text-[#D7C0B5] flex items-center space-x-1">
          <Phone className="w-3 h-3 text-[#8C3A57]" />
          <span>{row.phone || 'N/A'}</span>
        </span>
      ),
    },
    {
      header: 'Total Orders',
      accessor: (row) => (
        <span className="font-bold text-[#2B1A1F] text-xs">
          {row.total_orders} Orders
        </span>
      ),
    },
    {
      header: 'Lifetime Value',
      accessor: (row) => (
        <span className="font-serif font-bold text-[#2B1A1F] text-xs">
          {formatINR(row.total_spent)}
        </span>
      ),
    },
    {
      header: 'Member Since',
      accessor: (row) => (
        <span className="text-xs text-[#7A6B70] flex items-center space-x-1">
          <Calendar className="w-3 h-3 text-[#D4AF37]" />
          <span>{formatDate(row.created_at)}</span>
        </span>
      ),
    },
  ]

  const filteredCustomers = customers.filter(c =>
    (c.full_name && c.full_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
    c.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.phone && c.phone.includes(searchQuery))
  )

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Customer Directory"
        description="View registered store shoppers, loyalty member profiles, order history, and lifetime value."
        badgeText={`${customers.length} Registered Members`}
      />

      <SearchAndFilterBar
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search customer by name, email or phone..."
      />

      {errorMsg ? (
        <div className="p-6 bg-red-500/10 border border-red-500/20 rounded-2xl text-center text-red-800 dark:text-red-200 font-medium">
          {errorMsg}
        </div>
      ) : isLoading ? (
        <TableSkeleton rows={5} />
      ) : filteredCustomers.length === 0 ? (
        <EmptyState
          title="No Customers Found"
          description="Registered shopper accounts will be listed here automatically."
          icon={Users}
        />
      ) : (
        <div className="bg-white rounded-2xl border border-[#5C0B26]/10 shadow-sm overflow-hidden p-2 dark:bg-[#211318] dark:border-[#70424E]">
          <DataTable
            columns={columns}
            data={filteredCustomers}
            actions={(row) => (
              <Link
                href={`/admin/customers/${row.id}`}
                className="inline-flex items-center justify-center font-medium rounded-lg transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background border border-[#5C0B26]/20 text-[#5C0B26] hover:bg-[#5C0B26]/5 px-3 py-1.5 text-xs min-h-[32px] font-semibold cursor-pointer"
              >
                <ArrowUpRight className="w-3.5 h-3.5 mr-1 text-[#D4AF37]" /> View Details
              </Link>
            )}
          />
        </div>
      )}
    </div>
  )
}
