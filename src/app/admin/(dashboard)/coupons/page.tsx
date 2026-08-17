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
import { Plus, Trash2, Ticket, Users, Shirt, Layers, UserCheck, X, Search, Edit2, AlertCircle, RefreshCw } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Coupon } from '@/types/database'
import { formatINR } from '@/lib/utils'
import {
  getAdminCouponsAction,
  createAdminCouponAction,
  updateAdminCouponAction,
  deleteAdminCouponAction
} from '@/actions/admin/couponActions'

interface CustomerProfile {
  id: string
  full_name: string | null
  email: string | null
}

export default function AdminCouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const [title, setTitle] = useState('')
  const [code, setCode] = useState('')
  const [type, setType] = useState<'percentage' | 'fixed'>('percentage')
  const [value, setValue] = useState('20')
  const [minSpend, setMinSpend] = useState('2999')
  const [searchQuery, setSearchQuery] = useState('')

  // Enhanced Targeting State
  const [targetType, setTargetType] = useState<'all' | 'products' | 'categories' | 'selected_customers' | 'first_time_buyers'>('all')
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([])
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([])
  const [selectedCustomers, setSelectedCustomers] = useState<CustomerProfile[]>([])
  const [customEmailsInput, setCustomEmailsInput] = useState('')
  const [customerSearchQuery, setCustomerSearchQuery] = useState('')
  const [firstTimeOnly, setFirstTimeOnly] = useState(false)

  // System Products, Categories & Customer Profiles for Picker Dropdowns
  const [availableProducts, setAvailableProducts] = useState<{ id: string; name: string }[]>([])
  const [availableCategories, setAvailableCategories] = useState<{ id: string; name: string }[]>([])
  const [availableProfiles, setAvailableProfiles] = useState<CustomerProfile[]>([])

  const loadCoupons = async () => {
    setIsLoading(true)
    try {
      const res = await getAdminCouponsAction()
      if (res.success && res.data) {
        setCoupons(res.data)
      } else {
        // Fallback to client-side fetch if action fails
        const supabase = createClient()
        const { data } = await supabase.from('coupons').select('*').order('created_at', { ascending: false })
        if (data) setCoupons(data as Coupon[])
      }
    } catch {
      const supabase = createClient()
      const { data } = await supabase.from('coupons').select('*').order('created_at', { ascending: false })
      if (data) setCoupons(data as Coupon[])
    }
    setIsLoading(false)
  }

  useEffect(() => {
    async function loadAuxiliaryData() {
      try {
        const supabase = createClient()
        const [productsRes, categoriesRes, profilesRes] = await Promise.all([
          supabase.from('products').select('id, name').order('name', { ascending: true }),
          supabase.from('categories').select('id, name').order('name', { ascending: true }),
          supabase.from('profiles').select('id, full_name, email').order('created_at', { ascending: false })
        ])

        if (productsRes.data) setAvailableProducts(productsRes.data as any)
        if (categoriesRes.data) setAvailableCategories(categoriesRes.data as any)
        if (profilesRes.data) setAvailableProfiles(profilesRes.data as CustomerProfile[])
      } catch {}
    }
    loadAuxiliaryData()
    loadCoupons()
  }, [])

  const handleAddCustomer = (cust: CustomerProfile) => {
    if (!selectedCustomers.some(c => c.id === cust.id)) {
      setSelectedCustomers([...selectedCustomers, cust])
    }
    setCustomerSearchQuery('')
  }

  const handleRemoveCustomer = (id: string) => {
    setSelectedCustomers(selectedCustomers.filter(c => c.id !== id))
  }

  const handleEditCoupon = (c: Coupon) => {
    setEditingCoupon(c)
    setTitle(c.title || '')
    setCode(c.code)
    setType(c.type)
    setValue(String(c.value))
    setMinSpend(String(c.min_spend))
    setTargetType(c.target_type || 'all')
    setSelectedProductIds(c.target_product_ids || [])
    setSelectedCategoryIds(c.target_category_ids || [])
    setFirstTimeOnly(Boolean(c.first_time_only))
    setFormError(null)

    // Pre-populate customer tags matching UUIDs or emails
    const targetIds = c.target_customer_ids || []
    const targetEmails = (c.target_customer_emails || []).map(e => e.toLowerCase())

    const matchedProfiles = availableProfiles.filter(p =>
      targetIds.includes(p.id) || (p.email && targetEmails.includes(p.email.toLowerCase()))
    )
    setSelectedCustomers(matchedProfiles)

    // Collect emails not present in matched profiles for customEmailsInput
    const matchedProfileEmails = matchedProfiles.map(p => p.email?.toLowerCase()).filter(Boolean)
    const unmatchedEmails = targetEmails.filter(e => !matchedProfileEmails.includes(e))
    setCustomEmailsInput(unmatchedEmails.join(', '))

    setIsModalOpen(true)
  }

  const handleSaveCoupon = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)

    // 0. Frontend Validation before any submission
    const cleanTitle = title.trim()
    const cleanCode = code.trim().toUpperCase()

    if (!cleanTitle) {
      setFormError('Coupon title is required and cannot be empty.')
      return
    }

    if (!cleanCode) {
      setFormError('Coupon code is required and cannot be empty.')
      return
    }

    if (!value || Number(value) < 0) {
      setFormError('Discount value must be a positive number.')
      return
    }

    setIsSaving(true)

    // 1. Gather Selected Customer UUIDs
    const targetCustomerIds = targetType === 'selected_customers'
      ? selectedCustomers.map(c => c.id)
      : []

    // 2. Gather Selected Customer Emails (from profile tags + manual raw email input)
    const profileEmails = selectedCustomers
      .map(c => c.email)
      .filter((e): e is string => Boolean(e))

    const manualEmails = customEmailsInput
      .split(',')
      .map(e => e.trim().toLowerCase())
      .filter(Boolean)

    const targetCustomerEmails = targetType === 'selected_customers'
      ? Array.from(new Set([...profileEmails.map(e => e.toLowerCase()), ...manualEmails]))
      : []

    const couponPayload: Partial<Coupon> = {
      title: cleanTitle,
      code: cleanCode,
      type,
      value: Number(value),
      min_spend: Number(minSpend),
      max_discount: 1500,
      start_date: editingCoupon?.start_date || new Date().toISOString(),
      end_date: editingCoupon?.end_date || new Date(new Date().getTime() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      usage_limit: 500,
      used_count: editingCoupon?.used_count || 0,
      is_active: editingCoupon ? editingCoupon.is_active : true,
      target_type: targetType,
      target_product_ids: targetType === 'products' ? selectedProductIds : [],
      target_category_ids: targetType === 'categories' ? selectedCategoryIds : [],
      target_customer_ids: targetCustomerIds,
      target_customer_emails: targetCustomerEmails,
      first_time_only: firstTimeOnly || targetType === 'first_time_buyers',
      created_at: editingCoupon?.created_at || new Date().toISOString(),
    }

    if (editingCoupon) {
      const res = await updateAdminCouponAction(editingCoupon.id, couponPayload)
      if (res.success && res.data) {
        setCoupons(coupons.map(c => (c.id === editingCoupon.id ? res.data! : c)))
        setIsModalOpen(false)
        resetForm()
      } else {
        setFormError(res.error || 'Failed to update coupon in database.')
      }
    } else {
      const res = await createAdminCouponAction(couponPayload)
      if (res.success && res.data) {
        setCoupons([res.data, ...coupons])
        setIsModalOpen(false)
        resetForm()
      } else {
        setFormError(res.error || 'Failed to save coupon in database.')
      }
    }

    setIsSaving(false)
  }

  const resetForm = () => {
    setEditingCoupon(null)
    setTitle('')
    setCode('')
    setValue('20')
    setMinSpend('2999')
    setTargetType('all')
    setSelectedProductIds([])
    setSelectedCategoryIds([])
    setSelectedCustomers([])
    setCustomEmailsInput('')
    setCustomerSearchQuery('')
    setFirstTimeOnly(false)
    setFormError(null)
  }

  const handleDeleteCoupon = async (id: string) => {
    const prevCoupons = coupons
    setCoupons(coupons.filter(c => c.id !== id))

    const res = await deleteAdminCouponAction(id)
    if (!res.success) {
      setCoupons(prevCoupons)
      alert(res.error || 'Failed to delete coupon.')
    }
  }

  // Filter available customer profiles by name, email, or user ID (UUID)
  const filteredCustomerProfiles = availableProfiles.filter(p => {
    const q = customerSearchQuery.toLowerCase()
    const nameMatch = p.full_name?.toLowerCase().includes(q)
    const emailMatch = p.email?.toLowerCase().includes(q)
    const idMatch = p.id.toLowerCase().includes(q)
    return (nameMatch || emailMatch || idMatch) && !selectedCustomers.some(s => s.id === p.id)
  })

  const columns: Column<Coupon>[] = [
    {
      header: 'Promo Code',
      accessor: (row) => (
        <div className="flex items-center space-x-2">
          <div className="p-2 rounded-xl bg-amber-500/10 text-amber-900 border border-amber-500/30">
            <Ticket className="w-4 h-4 text-[#D4AF37]" />
          </div>
          <div>
            <span className="font-mono font-bold text-[#5C0B26] text-xs tracking-wider block">
              {row.code}
            </span>
            {row.title && (
              <span className="text-[11px] text-gray-600 block font-medium">
                {row.title}
              </span>
            )}
            {row.first_time_only && (
              <span className="text-[9px] bg-purple-100 text-purple-800 font-bold px-1.5 py-0.5 rounded-md inline-block mt-0.5">
                1st Order Only
              </span>
            )}
          </div>
        </div>
      ),
    },
    {
      header: 'Targeting Rule',
      accessor: (row) => {
        const type = row.target_type || 'all'
        return (
          <span className="text-xs font-medium flex items-center space-x-1 capitalize text-gray-700">
            {type === 'products' && <Shirt className="w-3.5 h-3.5 text-rose-700" />}
            {type === 'categories' && <Layers className="w-3.5 h-3.5 text-indigo-700" />}
            {type === 'selected_customers' && <Users className="w-3.5 h-3.5 text-amber-700" />}
            {type === 'first_time_buyers' && <UserCheck className="w-3.5 h-3.5 text-emerald-700" />}
            <span>{type.replace(/_/g, ' ')}</span>
          </span>
        )
      },
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
      header: 'Minimum Spend',
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

  const activeCodesCount = coupons.filter(c => c.is_active).length

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Promotions & Targeted Discounts"
        description="Create storewide vouchers, targeted clothes discounts, category promotions, customer-specific codes (by UUID & Email), and first-time buyer incentives."
        badgeText={`${activeCodesCount} Active Codes`}
        actions={
          <Button onClick={() => { resetForm(); setIsModalOpen(true); }} variant="primary" className="bg-[#5C0B26] hover:bg-[#8C3A57] dark:bg-gradient-to-r dark:from-[#861A39] dark:to-[#611026] dark:text-[#FFF4DC] dark:border-[#D0A45C]/25">
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
            <Button onClick={() => { resetForm(); setIsModalOpen(true); }} variant="primary" className="bg-[#5C0B26] dark:bg-[#D4AF37] dark:text-[#2B1A1F]">
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
              <div className="flex items-center space-x-1">
                <button
                  onClick={() => handleEditCoupon(row)}
                  className="p-1.5 text-amber-700 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                  title="Edit Targeted Coupon"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDeleteCoupon(row.id)}
                  className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                  title="Delete Promo Code"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )}
          />
        </div>
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingCoupon ? 'Edit Targeted Promo Code' : 'Create New Promo Code'}>
        <form onSubmit={handleSaveCoupon} className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
          {formError && (
            <div className="p-3.5 bg-red-50 border border-red-200 text-red-800 text-xs rounded-xl flex items-start space-x-2 font-medium">
              <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
              <span>{formError}</span>
            </div>
          )}

          <Input
            label="Coupon Title *"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="e.g. Summer Sale 2026"
            required
          />

          <Input
            label="Coupon Code *"
            value={code}
            onChange={e => setCode(e.target.value)}
            placeholder="e.g. FESTIVE30"
            required
          />

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-rose-950/80">
              Coupon Target Type
            </label>
            <select
              value={targetType}
              onChange={e => setTargetType(e.target.value as any)}
              className="w-full px-3 py-2 text-sm rounded-md border border-[#5C0B26]/20 bg-[#FAF8F5]/60 text-[#2B1A1F] focus:outline-none focus:ring-2 focus:ring-[#5C0B26]"
            >
              <option value="all">Storewide (All Products)</option>
              <option value="products">Selected Products / Clothes</option>
              <option value="categories">Selected Categories / Inventory</option>
              <option value="selected_customers">Selected Customers (UUID & Email)</option>
              <option value="first_time_buyers">First-Time Buyers Only</option>
            </select>
          </div>

          {/* Conditional Product Picker */}
          {targetType === 'products' && (
            <div className="space-y-1.5 p-3 bg-rose-50/50 rounded-xl border border-rose-200">
              <label className="block text-xs font-semibold text-rose-950">Select Eligible Products</label>
              <select
                multiple
                value={selectedProductIds}
                onChange={e => setSelectedProductIds(Array.from(e.target.selectedOptions, o => o.value))}
                className="w-full p-2 text-xs rounded-md border border-gray-300 bg-white min-h-[100px]"
              >
                {availableProducts.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              <span className="text-[10px] text-gray-500">Hold Ctrl (or Cmd) to select multiple products.</span>
            </div>
          )}

          {/* Conditional Category Picker */}
          {targetType === 'categories' && (
            <div className="space-y-1.5 p-3 bg-indigo-50/50 rounded-xl border border-indigo-200">
              <label className="block text-xs font-semibold text-indigo-950">Select Eligible Categories</label>
              <select
                multiple
                value={selectedCategoryIds}
                onChange={e => setSelectedCategoryIds(Array.from(e.target.selectedOptions, o => o.value))}
                className="w-full p-2 text-xs rounded-md border border-gray-300 bg-white min-h-[100px]"
              >
                {availableCategories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <span className="text-[10px] text-gray-500">Hold Ctrl (or Cmd) to select multiple categories.</span>
            </div>
          )}

          {/* Conditional Customer Picker by UUID and Email */}
          {targetType === 'selected_customers' && (
            <div className="space-y-3 p-3.5 bg-amber-50/50 rounded-xl border border-amber-200">
              <label className="block text-xs font-semibold text-amber-950">Target Customers (User UUID & Email)</label>

              {/* Selected Customer Chips */}
              {selectedCustomers.length > 0 && (
                <div className="flex flex-wrap gap-1.5 p-2 bg-white rounded-lg border border-amber-200">
                  {selectedCustomers.map(cust => (
                    <span
                      key={cust.id}
                      className="inline-flex items-center space-x-1.5 px-2.5 py-1 bg-amber-100 text-amber-950 rounded-full text-xs font-medium border border-amber-300 shadow-sm"
                    >
                      <span>{cust.full_name || cust.email || 'User'}</span>
                      <span className="text-[9px] font-mono text-amber-700">({cust.id.slice(0, 8)})</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveCustomer(cust.id)}
                        className="hover:text-rose-700 transition-colors cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}

              {/* Search Customer Profiles Input */}
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-gray-400" />
                <input
                  type="text"
                  value={customerSearchQuery}
                  onChange={e => setCustomerSearchQuery(e.target.value)}
                  placeholder="Search customer by name, email, or user UUID..."
                  className="w-full pl-8 pr-3 py-2 text-xs rounded-md border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#5C0B26]"
                />

                {/* Filtered Search Results Dropdown */}
                {customerSearchQuery.trim() !== '' && (
                  <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-20 max-h-48 overflow-y-auto divide-y divide-gray-100">
                    {filteredCustomerProfiles.length === 0 ? (
                      <div className="p-2.5 text-[11px] text-gray-500 text-center">No matching customer profiles found.</div>
                    ) : (
                      filteredCustomerProfiles.map(p => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => handleAddCustomer(p)}
                          className="w-full text-left p-2.5 hover:bg-amber-50 flex items-center justify-between text-xs cursor-pointer transition-colors"
                        >
                          <div>
                            <span className="font-semibold text-gray-900">{p.full_name || 'Customer'}</span>
                            <span className="text-gray-500 text-[11px] block">{p.email || 'No email'}</span>
                          </div>
                          <span className="text-[10px] font-mono bg-gray-100 px-1.5 py-0.5 rounded text-gray-600">
                            {p.id.slice(0, 8)}...
                          </span>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* Optional Custom Emails Text Area */}
              <div className="space-y-1 pt-1">
                <label className="block text-[10px] font-semibold text-amber-900 uppercase tracking-wider">
                  Additional External Emails (Optional, comma-separated)
                </label>
                <textarea
                  value={customEmailsInput}
                  onChange={e => setCustomEmailsInput(e.target.value)}
                  placeholder="e.g. external.vip@example.com, loyalty@example.com"
                  className="w-full p-2 text-xs rounded-md border border-gray-300 bg-white min-h-[50px]"
                />
              </div>
            </div>
          )}

          {/* First-Time Buyers Only Toggle */}
          <div className="flex items-center space-x-2 pt-2">
            <input
              type="checkbox"
              id="firstTimeOnly"
              checked={firstTimeOnly}
              onChange={e => setFirstTimeOnly(e.target.checked)}
              className="w-4 h-4 rounded text-[#5C0B26] focus:ring-[#5C0B26]"
            />
            <label htmlFor="firstTimeOnly" className="text-xs font-semibold text-gray-800">
              Restrict coupon to First-Time Buyers only (0 prior orders)
            </label>
          </div>

          <div className="space-y-1.5 pt-2">
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
            <Button type="submit" variant="primary" disabled={isSaving} className="bg-[#5C0B26] flex items-center space-x-1">
              {isSaving && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
              <span>{editingCoupon ? 'Update Coupon' : 'Save Targeted Coupon'}</span>
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
