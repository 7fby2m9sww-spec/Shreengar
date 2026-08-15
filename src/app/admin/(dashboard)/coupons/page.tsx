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
import { Plus, Trash2, Ticket } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Coupon } from '@/types/database'
import { formatINR } from '@/lib/utils'

export default function AdminCouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [code, setCode] = useState('')
  const [type, setType] = useState<'percentage' | 'fixed'>('percentage')
  const [value, setValue] = useState('20')
  const [minSpend, setMinSpend] = useState('2999')
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    async function loadCoupons() {
      try {
        const supabase = createClient()
        const { data } = await supabase.from('coupons').select('*').order('created_at', { ascending: false })
        if (data) setCoupons(data as Coupon[])
      } catch {}
      setIsLoading(false)
    }
    loadCoupons()
  }, [])

  const handleCreateCoupon = (e: React.FormEvent) => {
    e.preventDefault()
    const newC: Coupon = {
      id: `coup-${Date.now()}`,
      code: code.toUpperCase() || 'PROMO20',
      type,
      value: Number(value),
      min_spend: Number(minSpend),
      max_discount: 1500,
      start_date: '2026-01-01',
      end_date: '2026-12-31',
      usage_limit: 500,
      used_count: 0,
      is_active: true,
      created_at: new Date().toISOString(),
    }
    setCoupons([newC, ...coupons])
    setIsModalOpen(false)
    setCode('')
  }

  const columns: Column<Coupon>[] = [
    {
      header: 'Promo Code',
      accessor: (row) => (
        <div className="flex items-center space-x-2">
          <div className="p-2 rounded-xl bg-amber-500/10 text-amber-900 border border-amber-500/30">
            <Ticket className="w-4 h-4 text-[#D4AF37]" />
          </div>
          <span className="font-mono font-bold text-[#5C0B26] text-xs tracking-wider">
            {row.code}
          </span>
        </div>
      ),
    },
    {
      header: 'Discount Rule',
      accessor: (row) => (
        <span className="font-bold text-[#2B1A1F] text-xs">
          {row.type === 'percentage' ? `${row.value}% OFF` : `Flat ${formatINR(row.value)} OFF`}
        </span>
      ),
    },
    {
      header: 'Minimum Order Spend',
      accessor: (row) => (
        <span className="text-xs font-semibold text-[#7A6B70]">
          {formatINR(row.min_spend)}
        </span>
      ),
    },
    {
      header: 'Redemptions',
      accessor: (row) => (
        <span className="text-xs text-[#2B1A1F] font-semibold">
          {row.used_count} uses
        </span>
      ),
    },
    {
      header: 'Status',
      accessor: (row) => <StatusBadge status={row.is_active ? 'active' : 'inactive'} />,
    },
  ]

  const filteredCoupons = coupons.filter(c =>
    c.code.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Promotions & Discounts"
        description="Create voucher codes, percentage discounts, minimum cart spend rules, and usage limits."
        badgeText={`${coupons.length} Active Codes`}
        actions={
          <Button onClick={() => setIsModalOpen(true)} variant="primary" className="bg-[#5C0B26] hover:bg-[#8C3A57] dark:bg-gradient-to-r dark:from-[#861A39] dark:to-[#611026] dark:text-[#FFF4DC] dark:border-[#D0A45C]/25">
            <Plus className="w-4 h-4 mr-1 text-[#D4AF37]" /> Create Promo Code
          </Button>
        }
      />

      <SearchAndFilterBar
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search promo code..."
      />

      {isLoading ? (
        <TableSkeleton rows={4} />
      ) : filteredCoupons.length === 0 ? (
        <EmptyState
          title="No Coupons Found"
          description="Create voucher codes for seasonal marketing campaigns."
          icon={Ticket}
          action={
            <Button onClick={() => setIsModalOpen(true)} variant="primary" className="bg-[#5C0B26] dark:bg-[#D4AF37] dark:text-[#2B1A1F]">
              <Plus className="w-4 h-4 mr-1 text-[#D4AF37] dark:text-[#2B1A1F]" /> Create First Promo
            </Button>
          }
        />
      ) : (
        <div className="bg-white rounded-2xl border border-[#5C0B26]/10 shadow-sm overflow-hidden p-2 dark:bg-[#211318] dark:border-[#70424E]">
          <DataTable
            columns={columns}
            data={filteredCoupons}
            actions={(row) => (
              <button
                onClick={() => setCoupons(coupons.filter(c => c.id !== row.id))}
                className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                title="Delete Promo Code"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          />
        </div>
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Create New Promo Code">
        <form onSubmit={handleCreateCoupon} className="space-y-4">
          <Input
            label="Coupon Code"
            value={code}
            onChange={e => setCode(e.target.value)}
            placeholder="e.g. FESTIVE30"
            required
          />
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-rose-950/80">
              Discount Type
            </label>
            <select
              value={type}
              onChange={e => setType(e.target.value as 'percentage' | 'fixed')}
              className="w-full px-3 py-2 text-sm rounded-md border border-[#5C0B26]/20 bg-[#FAF8F5]/60 text-[#2B1A1F] focus:outline-none focus:ring-2 focus:ring-[#5C0B26]"
            >
              <option value="percentage">Percentage (%) OFF</option>
              <option value="fixed">Flat Amount (INR) OFF</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Discount Value"
              type="number"
              value={value}
              onChange={e => setValue(e.target.value)}
              required
            />
            <Input
              label="Min Order Spend (INR)"
              type="number"
              value={minSpend}
              onChange={e => setMinSpend(e.target.value)}
              required
            />
          </div>
          <div className="flex justify-end space-x-2 pt-4 border-t border-[#5C0B26]/10">
            <Button variant="outline" type="button" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" className="bg-[#5C0B26]">
              Save Coupon
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
