'use client'

import React, { useEffect, useState } from 'react'
import {
  AdminPageHeader,
  EmptyState,
  SearchAndFilterBar,
  TableSkeleton,
} from '@/components/admin/AdminUI'
import { DataTable, Column } from '@/components/ui/DataTable'
import { createClient } from '@/lib/supabase/client'
import { Plus, Edit, Trash2, X, Star, Loader2, Sparkles } from 'lucide-react'
import {
  createVariantAction,
  updateVariantAction,
  deleteVariantAction,
  getVariantsAction
} from '@/actions/catalog/actions'

interface ProductOption {
  id: string
  title: string
}

export default function AdminVariantsPage() {
  const [variants, setVariants] = useState<any[]>([])
  const [products, setProducts] = useState<ProductOption[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  
  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [selectedVariant, setSelectedVariant] = useState<any | null>(null)
  
  // Form states
  const [productId, setProductId] = useState('')
  const [sku, setSku] = useState('')
  const [size, setSize] = useState('M')
  const [colorName, setColorName] = useState('')
  const [colorCode, setColorCode] = useState('#000000')
  const [priceOverride, setPriceOverride] = useState('')
  const [stockQuantity, setStockQuantity] = useState('0')
  
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  const allowedSizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL']

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setIsLoading(true)
    try {
      const res = await getVariantsAction()
      if (res.success && res.data) {
        setVariants(res.data)
      }
      
      const supabase = createClient()
      const { data: prodData } = await supabase
        .from('products')
        .select('id, title')
        .eq('is_active', true)
      if (prodData) {
        setProducts(prodData)
      }
    } catch {}
    setIsLoading(false)
  }

  const openCreateModal = () => {
    setProductId(products[0]?.id || '')
    setSku('')
    setSize('M')
    setColorName('')
    setColorCode('#000000')
    setPriceOverride('')
    setStockQuantity('0')
    setErrorMsg(null)
    setSuccessMsg(null)
    setIsCreateModalOpen(true)
  }

  const openEditModal = (variant: any) => {
    setSelectedVariant(variant)
    setSku(variant.sku)
    setSize(variant.size || 'M')
    setColorName(variant.color_name || '')
    setColorCode(variant.color_code || '#000000')
    setPriceOverride(variant.price_override ? String(variant.price_override) : '')
    setStockQuantity(String(variant.stock_quantity || 0))
    setErrorMsg(null)
    setSuccessMsg(null)
    setIsEditModalOpen(true)
  }

  const openDeleteModal = (variant: any) => {
    setSelectedVariant(variant)
    setErrorMsg(null)
    setSuccessMsg(null)
    setIsDeleteModalOpen(true)
  }

  const handleCreateVariant = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setErrorMsg(null)

    try {
      const input = {
        product_id: productId,
        sku: sku.trim().toUpperCase(),
        size,
        color_name: colorName.trim(),
        color_code: colorCode.trim(),
        price_override: priceOverride.trim() ? Number(priceOverride) : null,
        stock_quantity: Number(stockQuantity)
      }

      const res = await createVariantAction(input)
      if (res.error) {
        setErrorMsg(res.error)
      } else {
        setSuccessMsg('Product variant created successfully!')
        setTimeout(() => {
          setIsCreateModalOpen(false)
          loadData()
        }, 1500)
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'An unexpected error occurred.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleUpdateVariant = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedVariant) return
    setIsSubmitting(true)
    setErrorMsg(null)

    try {
      const input = {
        product_id: selectedVariant.product_id,
        sku: sku.trim().toUpperCase(),
        size,
        color_name: colorName.trim(),
        color_code: colorCode.trim(),
        price_override: priceOverride.trim() ? Number(priceOverride) : null,
        stock_quantity: Number(stockQuantity)
      }

      const res = await updateVariantAction(selectedVariant.id, input)
      if (res.error) {
        setErrorMsg(res.error)
      } else {
        setSuccessMsg('Product variant updated successfully!')
        setTimeout(() => {
          setIsEditModalOpen(false)
          loadData()
        }, 1500)
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'An unexpected error occurred.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteVariant = async () => {
    if (!selectedVariant) return
    setIsSubmitting(true)
    setErrorMsg(null)

    try {
      const res = await deleteVariantAction(selectedVariant.id)
      if (res.error) {
        setErrorMsg(res.error)
      } else {
        setSuccessMsg('Product variant deleted successfully!')
        setTimeout(() => {
          setIsDeleteModalOpen(false)
          loadData()
        }, 1500)
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'An unexpected error occurred.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const columns: Column<any>[] = [
    {
      header: 'Product Name',
      accessor: (row) => <span className="font-serif text-[#2B1A1F] font-bold text-xs">{row.product_name}</span>,
    },
    {
      header: 'SKU Code',
      accessor: (row) => <span className="font-mono font-bold text-xs text-[#5C0B26]">{row.sku}</span>,
    },
    {
      header: 'Size',
      accessor: (row) => (
        <span className="px-2 py-0.5 rounded bg-rose-50 text-rose-950 border border-rose-900/10 text-[10px] font-bold">
          {row.size}
        </span>
      ),
    },
    {
      header: 'Color / Swatch',
      accessor: (row) => (
        <div className="flex items-center space-x-2">
          <span
            className="w-4 h-4 rounded-full border border-rose-950/20 shadow-2xs"
            style={{ backgroundColor: row.color_code || '#000' }}
          />
          <span className="text-xs text-[#2B1A1F] font-medium">{row.color_name}</span>
        </div>
      ),
    },
    {
      header: 'Price Override',
      accessor: (row) => (
        <span className="text-xs text-rose-950 font-semibold">
          {row.price_override ? `₹${row.price_override}` : 'None (Base)'}
        </span>
      ),
    },
    {
      header: 'Stock Quantity',
      accessor: (row) => (
        <span
          className={`font-bold text-xs ${
            row.stock_quantity <= 5 ? 'text-rose-700' : 'text-emerald-700'
          }`}
        >
          {row.stock_quantity} units
        </span>
      ),
    },
  ]

  const filteredVariants = variants.filter(v =>
    v.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
    v.color_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    v.product_name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <AdminPageHeader
          title="Product SKU Variants"
          description="Manage sizes, color swatches, price overrides, and variant-level warehouse balances."
          badgeText={`${variants.length} Variants`}
        />
        <button
          onClick={openCreateModal}
          className="py-2.5 px-4 bg-rose-950 hover:bg-rose-900 dark:bg-gradient-to-r dark:from-[#861A39] dark:to-[#611026] dark:text-[#FFF4DC] dark:border dark:border-[#D0A45C]/25 text-amber-100 text-xs font-serif font-bold rounded-xl shadow-md transition-all flex items-center space-x-1.5 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add SKU Variant</span>
        </button>
      </div>

      <SearchAndFilterBar
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search variant by product name, SKU, or color..."
      />

      {isLoading ? (
        <TableSkeleton rows={5} />
      ) : filteredVariants.length === 0 ? (
        <EmptyState
          title="No Product SKU Variants Found"
          description="SKU variants will be listed here. Add a new SKU variant to monitor catalog balances."
          icon={Sparkles}
        />
      ) : (
        <div className="bg-white dark:bg-[#211318] rounded-2xl border border-[#5C0B26]/10 dark:border-[#70424E] shadow-sm overflow-hidden p-2">
          <DataTable
            columns={columns}
            data={filteredVariants}
            actions={(row) => (
              <div className="flex space-x-2">
                <button
                  onClick={() => openEditModal(row)}
                  className="p-1.5 text-amber-700 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                  title="Edit Variant"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  onClick={() => openDeleteModal(row)}
                  className="p-1.5 text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                  title="Delete Variant"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )}
          />
        </div>
      )}

      {/* CREATE VARIANT DIALOG MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#211318] rounded-2xl border border-rose-900/10 dark:border-[#70424E] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-rose-950/10 dark:border-[#5D3944] flex justify-between items-center bg-[#FAF8F5] dark:bg-[#2A171E]">
              <h3 className="font-serif text-base font-bold text-rose-950 dark:text-[#FFF4DC] flex items-center space-x-1.5">
                <Star className="w-4 h-4 text-amber-600 fill-amber-600" />
                <span>Create SKU Variant</span>
              </h3>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1 text-rose-950/50 hover:bg-rose-950/5 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateVariant} className="p-5 space-y-4">
              {errorMsg && <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-medium">{errorMsg}</div>}
              {successMsg && <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-xs font-medium">{successMsg}</div>}

              <div className="space-y-1">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-rose-950/60">Product</label>
                <select
                  value={productId}
                  onChange={(e) => setProductId(e.target.value)}
                  className="w-full p-2.5 bg-[#FAF8F5] dark:bg-[#140C10] dark:border-[#5D3944] dark:text-[#FFF4DC] border border-rose-900/10 rounded-xl text-xs text-rose-950 outline-hidden focus:border-amber-700 font-serif"
                >
                  {products.map(p => (
                    <option key={p.id} value={p.id}>{p.title}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-rose-950/60">SKU Code</label>
                  <input
                    type="text"
                    required
                    value={sku}
                    onChange={(e) => setSku(e.target.value)}
                    placeholder="e.g. SR-RED-M"
                  className="w-full p-2.5 bg-[#FAF8F5] dark:bg-[#140C10] dark:border-[#5D3944] dark:text-[#FFF4DC] border border-rose-900/10 rounded-xl text-xs text-rose-950 outline-hidden focus:border-amber-700 font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-rose-950/60">Size</label>
                  <select
                    value={size}
                    onChange={(e) => setSize(e.target.value)}
                  className="w-full p-2.5 bg-[#FAF8F5] dark:bg-[#140C10] dark:border-[#5D3944] dark:text-[#FFF4DC] border border-rose-900/10 rounded-xl text-xs text-rose-950 outline-hidden focus:border-amber-700 font-bold"
                  >
                    {allowedSizes.map(sz => (
                      <option key={sz} value={sz}>{sz}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-rose-950/60">Color Name</label>
                  <input
                    type="text"
                    required
                    value={colorName}
                    onChange={(e) => setColorName(e.target.value)}
                    placeholder="e.g. Crimson Red"
                    className="w-full p-2.5 bg-[#FAF8F5] border border-rose-900/10 rounded-xl text-xs text-rose-950 outline-hidden focus:border-amber-700 font-medium"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-rose-950/60">Color Hex Swatch</label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="color"
                      value={colorCode}
                      onChange={(e) => setColorCode(e.target.value)}
                      className="w-8 h-8 rounded-lg border border-rose-950/10 cursor-pointer overflow-hidden p-0"
                    />
                    <input
                      type="text"
                      required
                      value={colorCode}
                      onChange={(e) => setColorCode(e.target.value)}
                      placeholder="#000000"
                      className="flex-1 p-2.5 bg-[#FAF8F5] border border-rose-900/10 rounded-xl text-xs text-rose-950 outline-hidden focus:border-amber-700 font-mono"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-rose-950/60">Price Override (₹)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={priceOverride}
                    onChange={(e) => setPriceOverride(e.target.value)}
                    placeholder="Base price"
                    className="w-full p-2.5 bg-[#FAF8F5] border border-rose-900/10 rounded-xl text-xs text-rose-950 outline-hidden focus:border-amber-700"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-rose-950/60">Initial Stock</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={stockQuantity}
                    onChange={(e) => setStockQuantity(e.target.value)}
                    className="w-full p-2.5 bg-[#FAF8F5] border border-rose-900/10 rounded-xl text-xs text-rose-950 outline-hidden focus:border-amber-700 font-bold"
                  />
                </div>
              </div>

              <div className="flex space-x-3 pt-3 border-t border-rose-950/10">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="flex-1 py-2.5 px-4 bg-white hover:bg-rose-50 border border-rose-900/10 text-rose-950 text-xs font-serif font-bold rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 px-4 bg-rose-950 hover:bg-rose-900 text-amber-100 text-xs font-serif font-bold rounded-xl shadow-md flex items-center justify-center space-x-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>Create Variant</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT VARIANT DIALOG MODAL */}
      {isEditModalOpen && selectedVariant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#211318] rounded-2xl border border-rose-900/10 dark:border-[#70424E] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-rose-950/10 dark:border-[#5D3944] flex justify-between items-center bg-[#FAF8F5] dark:bg-[#2A171E]">
              <h3 className="font-serif text-base font-bold text-rose-950 dark:text-[#FFF4DC] flex items-center space-x-1.5">
                <Edit className="w-4 h-4 text-amber-700" />
                <span>Edit SKU Variant</span>
              </h3>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="p-1 text-rose-950/50 hover:bg-rose-950/5 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateVariant} className="p-5 space-y-4">
              {errorMsg && <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-medium">{errorMsg}</div>}
              {successMsg && <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-xs font-medium">{successMsg}</div>}

              <div className="space-y-1">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-rose-950/60">Product</label>
                <input
                  type="text"
                  disabled
                  value={selectedVariant.product_name}
                  className="w-full p-2.5 bg-rose-950/5 border border-rose-900/10 rounded-xl text-xs text-rose-950/60 outline-hidden font-serif"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-rose-950/60">SKU Code</label>
                  <input
                    type="text"
                    required
                    value={sku}
                    onChange={(e) => setSku(e.target.value)}
                    className="w-full p-2.5 bg-[#FAF8F5] border border-rose-900/10 rounded-xl text-xs text-rose-950 outline-hidden focus:border-amber-700 font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-rose-950/60">Size</label>
                  <select
                    value={size}
                    onChange={(e) => setSize(e.target.value)}
                    className="w-full p-2.5 bg-[#FAF8F5] border border-rose-900/10 rounded-xl text-xs text-rose-950 outline-hidden focus:border-amber-700 font-bold"
                  >
                    {allowedSizes.map(sz => (
                      <option key={sz} value={sz}>{sz}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-rose-950/60">Color Name</label>
                  <input
                    type="text"
                    required
                    value={colorName}
                    onChange={(e) => setColorName(e.target.value)}
                    className="w-full p-2.5 bg-[#FAF8F5] border border-rose-900/10 rounded-xl text-xs text-rose-950 outline-hidden focus:border-amber-700 font-medium"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-rose-950/60">Color Hex Swatch</label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="color"
                      value={colorCode}
                      onChange={(e) => setColorCode(e.target.value)}
                      className="w-8 h-8 rounded-lg border border-rose-950/10 cursor-pointer overflow-hidden p-0"
                    />
                    <input
                      type="text"
                      required
                      value={colorCode}
                      onChange={(e) => setColorCode(e.target.value)}
                      className="flex-1 p-2.5 bg-[#FAF8F5] border border-rose-900/10 rounded-xl text-xs text-rose-950 outline-hidden focus:border-amber-700 font-mono"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-rose-950/60">Price Override (₹)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={priceOverride}
                    onChange={(e) => setPriceOverride(e.target.value)}
                    placeholder="Base price"
                    className="w-full p-2.5 bg-[#FAF8F5] border border-rose-900/10 rounded-xl text-xs text-rose-950 outline-hidden focus:border-amber-700"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-rose-950/60">Stock Level</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={stockQuantity}
                    onChange={(e) => setStockQuantity(e.target.value)}
                    className="w-full p-2.5 bg-[#FAF8F5] border border-rose-900/10 rounded-xl text-xs text-rose-950 outline-hidden focus:border-amber-700 font-bold"
                  />
                </div>
              </div>

              <div className="flex space-x-3 pt-3 border-t border-rose-950/10">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="flex-1 py-2.5 px-4 bg-white hover:bg-rose-50 border border-rose-900/10 text-rose-950 text-xs font-serif font-bold rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 px-4 bg-rose-950 hover:bg-rose-900 text-amber-100 text-xs font-serif font-bold rounded-xl shadow-md flex items-center justify-center space-x-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>Save Changes</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE DIALOG MODAL */}
      {isDeleteModalOpen && selectedVariant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#211318] rounded-2xl border border-rose-900/10 dark:border-[#70424E] shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200 p-6 space-y-4">
            <h4 className="font-serif text-base font-bold text-rose-950 dark:text-[#FFF4DC] flex items-center space-x-2">
              <Trash2 className="w-5 h-5 text-rose-700" />
              <span>Delete Product Variant</span>
            </h4>
            <p className="text-xs text-rose-900/70 leading-relaxed">
              Are you sure you want to permanently delete variant <strong className="font-mono text-rose-950 font-bold">{selectedVariant.sku}</strong>? This will also remove the corresponding inventory stock records. This action cannot be undone.
            </p>

            {errorMsg && <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-medium">{errorMsg}</div>}
            {successMsg && <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-xs font-medium">{successMsg}</div>}

            <div className="flex space-x-3 pt-2">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => setIsDeleteModalOpen(false)}
                className="flex-1 py-2.5 px-4 bg-white hover:bg-rose-50 border border-rose-900/10 text-rose-950 text-xs font-serif font-bold rounded-xl cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleDeleteVariant}
                className="flex-1 py-2.5 px-4 bg-rose-700 hover:bg-rose-600 text-white text-xs font-serif font-bold rounded-xl shadow-md flex items-center justify-center space-x-1.5 cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <span>Yes, Delete</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
