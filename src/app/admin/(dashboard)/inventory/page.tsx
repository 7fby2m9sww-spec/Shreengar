'use client'

import React, { useEffect, useState } from 'react'
import {
  AdminPageHeader,
  EmptyState,
  SearchAndFilterBar,
  TableSkeleton,
} from '@/components/admin/AdminUI'
import { DataTable, Column } from '@/components/ui/DataTable'
import {
  getInventoryAction,
  updateInventoryAction,
  adjustInventoryAction,
  getInventoryHistoryAction,
  getCategoriesAction,
  getProductFamiliesAction
} from '@/actions/catalog/actions'
import { createClient } from '@/lib/supabase/client'
import { resolveInventoryHealth } from '@/lib/inventory/health'
import {
  Warehouse,
  AlertTriangle,
  History,
  ArrowRight,
  Settings,
  Loader2,
  X,
  Plus,
  Minus,
  ChevronDown,
  ChevronUp
} from 'lucide-react'

export default function AdminInventoryPage() {
  const [inventory, setInventory] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [queryError, setQueryError] = useState(false)
  const [lastRefreshed, setLastRefreshed] = useState('')
  
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [productFamilyFilter, setProductFamilyFilter] = useState('all')
  const [colorFilter, setColorFilter] = useState('all')
  const [sizeFilter, setSizeFilter] = useState('all')
  const [viewMode, setViewMode] = useState<'grouped' | 'variant'>('grouped')

  // Pagination states
  const [page, setPage] = useState(1)
  const [pageSize] = useState(25)
  const [totalCount, setTotalCount] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [summary, setSummary] = useState<any | null>(null)

  // Filter option lists
  const [categories, setCategories] = useState<any[]>([])
  const [productFamilies, setProductFamilies] = useState<any[]>([])
  const [colors, setColors] = useState<any[]>([])
  const [sizes, setSizes] = useState<any[]>([])

  // Debounced search query
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('')

  // Expand collapse tracking for hierarchical groupings
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())
  const [expandedFamilies, setExpandedFamilies] = useState<Set<string>>(new Set())
  const [expandedProducts, setExpandedProducts] = useState<Set<string>>(new Set())

  // Modals state
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false)
  const [isThresholdModalOpen, setIsThresholdModalOpen] = useState(false)
  const [isHistoryDrawerOpen, setIsHistoryDrawerOpen] = useState(false)
  
  const [selectedItem, setSelectedItem] = useState<any | null>(null)
  const [selectedVariantId, setSelectedVariantId] = useState<string>('')
  const [historyLogs, setHistoryLogs] = useState<any[]>([])
  const [isHistoryLoading, setIsHistoryLoading] = useState(false)

  // Form states
  const [adjustmentType, setAdjustmentType] = useState<'increase' | 'decrease' | 'exact'>('increase')
  const [adjustmentValue, setAdjustmentValue] = useState('1')
  const [adjustmentReason, setAdjustmentReason] = useState('Receive Shipment')
  
  const [lowStockThreshold, setLowStockThreshold] = useState('5')
  const [warehouseLocation, setWarehouseLocation] = useState('')

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  // Fetch filter dropdown options on mount
  useEffect(() => {
    async function initFilters() {
      try {
        const catRes = await getCategoriesAction()
        if (catRes.data) {
          setCategories(catRes.data)
        }
      } catch (err) {
        console.error('Error loading categories:', err)
      }

      try {
        const famRes = await getProductFamiliesAction() as any
        if (famRes.success && famRes.data) {
          setProductFamilies(famRes.data)
        }
      } catch (err) {
        console.error('Error loading product families:', err)
      }

      try {
        const supabase = createClient()
        const { data: cols } = await supabase.from('colors').select('id, name, hex_code').eq('is_active', true).order('name')
        if (cols) setColors(cols)
      } catch (err) {
        console.error('Error loading colors:', err)
      }

      try {
        const supabase = createClient()
        const { data: szs } = await supabase.from('sizes').select('id, name').eq('is_active', true).order('display_order')
        if (szs) setSizes(szs)
      } catch (err) {
        console.error('Error loading sizes:', err)
      }
    }
    initFilters()
  }, [])

  // Debounce search query input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery)
      setPage(1)
    }, 400)
    return () => clearTimeout(timer)
  }, [searchQuery])

  // Trigger paginated load when state dependencies change
  useEffect(() => {
    loadInventory()
  }, [page, pageSize, debouncedSearchQuery, statusFilter, categoryFilter, productFamilyFilter, colorFilter, sizeFilter, viewMode])

  const loadInventory = async () => {
    setIsLoading(true)
    setQueryError(false)
    try {
      const res = await getInventoryAction({
        page,
        pageSize,
        search: debouncedSearchQuery,
        categoryId: categoryFilter,
        productFamilyId: productFamilyFilter,
        colorId: colorFilter,
        sizeId: sizeFilter,
        status: statusFilter,
        viewMode
      })
      if (res.success) {
        setInventory(res.rows || [])
        setTotalCount(res.totalCount || 0)
        setTotalPages(res.totalPages || 1)
        if (res.summary) {
          setSummary(res.summary)
        }
        setLastRefreshed(new Date().toLocaleTimeString())
      } else {
        setQueryError(true)
        console.error('Error loading inventory:', res.error)
      }
    } catch (err) {
      setQueryError(true)
      console.error('Error loading inventory:', err)
    } finally {
      setIsLoading(false)
    }
  }

  // Preferred default layout auto expansion
  const isFilterActive =
    statusFilter !== 'all' ||
    categoryFilter !== 'all' ||
    productFamilyFilter !== 'all' ||
    colorFilter !== 'all' ||
    sizeFilter !== 'all' ||
    searchQuery.trim() !== ''

  useEffect(() => {
    if (inventory.length > 0 && expandedCategories.size === 0 && !isFilterActive && viewMode === 'grouped') {
      const firstCat = inventory[0]
      const firstCatKey = firstCat.categoryId || 'uncategorised'
      const firstFam = firstCat.families?.[0]
      const firstFamKey = firstFam ? `${firstCatKey}:${firstFam.familyId || 'no-family'}` : ''
      
      setExpandedCategories(new Set([firstCatKey]))
      if (firstFamKey) {
        setExpandedFamilies(new Set([firstFamKey]))
      }
    }
  }, [inventory, isFilterActive, viewMode])

  const toggleCategoryExpand = (catKey: string) => {
    const newSet = new Set(expandedCategories)
    if (newSet.has(catKey)) {
      newSet.delete(catKey)
    } else {
      newSet.add(catKey)
    }
    setExpandedCategories(newSet)
  }

  const toggleFamilyExpand = (famKey: string) => {
    const newSet = new Set(expandedFamilies)
    if (newSet.has(famKey)) {
      newSet.delete(famKey)
    } else {
      newSet.add(famKey)
    }
    setExpandedFamilies(newSet)
  }

  const toggleProductExpand = (prodId: string) => {
    const newSet = new Set(expandedProducts)
    if (newSet.has(prodId)) {
      newSet.delete(prodId)
    } else {
      newSet.add(prodId)
    }
    setExpandedProducts(newSet)
  }

  const handleCategoryChange = (catId: string) => {
    setCategoryFilter(catId)
    setProductFamilyFilter('all')
    setPage(1)
  }

  const openAdjustModal = (item: any) => {
    setSelectedItem(item)
    if (item.variants && item.variants.length > 0) {
      setSelectedVariantId(item.variants[0].id)
    } else {
      setSelectedVariantId(item.id)
    }
    setAdjustmentType('increase')
    setAdjustmentValue('1')
    setAdjustmentReason('Receive Shipment')
    setErrorMsg(null)
    setSuccessMsg(null)
    setIsAdjustModalOpen(true)
  }

  const openThresholdModal = (item: any) => {
    setSelectedItem(item)
    if (item.variants && item.variants.length > 0) {
      const firstVar = item.variants[0]
      setSelectedVariantId(firstVar.id)
      setLowStockThreshold(String(firstVar.low_stock_threshold ?? 5))
      setWarehouseLocation(firstVar.warehouse_location || 'Unassigned')
    } else {
      setSelectedVariantId(item.id)
      setLowStockThreshold(String(item.low_stock_threshold ?? 5))
      setWarehouseLocation(item.warehouse_location || 'Unassigned')
    }
    setErrorMsg(null)
    setSuccessMsg(null)
    setIsThresholdModalOpen(true)
  }

  const openHistoryDrawer = async (item: any) => {
    setSelectedItem(item)
    let targetId = item.id
    if (item.variants && item.variants.length > 0) {
      const firstVar = item.variants[0]
      setSelectedVariantId(firstVar.id)
      targetId = firstVar.id
    } else {
      setSelectedVariantId(item.id)
    }
    setIsHistoryDrawerOpen(true)
    setIsHistoryLoading(true)
    setHistoryLogs([])
    const res = await getInventoryHistoryAction(targetId)
    if (res.success && res.data) {
      setHistoryLogs(res.data)
    }
    setIsHistoryLoading(false)
  }

  const handleHistoryVariantChange = async (varId: string) => {
    setSelectedVariantId(varId)
    setIsHistoryLoading(true)
    setHistoryLogs([])
    const res = await getInventoryHistoryAction(varId)
    if (res.success && res.data) {
      setHistoryLogs(res.data)
    }
    setIsHistoryLoading(false)
  }

  const handleAdjustInventory = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedItem) return
    const targetId = selectedVariantId || selectedItem.id
    if (!targetId) return

    setIsSubmitting(true)
    setErrorMsg(null)

    const val = Number(adjustmentValue)
    if (isNaN(val) || val <= 0) {
      setErrorMsg('Please enter a valid positive number.')
      setIsSubmitting(false)
      return
    }

    try {
      let delta = val
      let type: 'delta' | 'exact' = 'delta'
      if (adjustmentType === 'decrease') {
        delta = -val
      } else if (adjustmentType === 'exact') {
        delta = val
        type = 'exact'
      }

      const res = await adjustInventoryAction(targetId, delta, type, adjustmentReason)
      if (res.error) {
        setErrorMsg(res.error)
      } else {
        setSuccessMsg('Inventory adjusted successfully!')
        setTimeout(() => {
          setIsAdjustModalOpen(false)
          loadInventory()
        }, 1500)
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'An unexpected error occurred.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleUpdateThresholds = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedItem) return
    const targetId = selectedVariantId || selectedItem.id
    if (!targetId) return

    setIsSubmitting(true)
    setErrorMsg(null)

    const threshold = Number(lowStockThreshold)
    if (isNaN(threshold) || threshold < 0) {
      setErrorMsg('Low stock threshold must be a non-negative number.')
      setIsSubmitting(false)
      return
    }

    try {
      const res = await updateInventoryAction(targetId, {
        reorder_level: threshold,
        warehouse_location: warehouseLocation.trim()
      })
      if (res.error) {
        setErrorMsg(res.error)
      } else {
        setSuccessMsg('Inventory configuration updated successfully!')
        setTimeout(() => {
          setIsThresholdModalOpen(false)
          loadInventory()
        }, 1500)
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'An unexpected error occurred.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Filter dropdown options for product families belonging to selected category
  const filteredFamiliesForDropdown = productFamilies.filter((fam: any) => {
    if (categoryFilter === 'all') return true
    return fam.category_id === categoryFilter
  })

  // flat view variant columns
  const flatColumns: Column<any>[] = [
    {
      header: 'Product Variant',
      accessor: (row) => {
        const image = row.imageUrl || row.variant?.product?.images?.[0]
        return (
          <div className="flex items-center space-x-3">
            {image ? (
              <img
                src={image}
                alt={row.product_name || 'Product'}
                className="w-10 h-10 object-cover rounded-lg border border-rose-950/10"
              />
            ) : (
              <div className="w-10 h-10 bg-rose-950/5 flex items-center justify-center rounded-lg border border-rose-950/10 text-[9px] text-[#7A6B70] font-bold">
                No Img
              </div>
            )}
            <div className="flex flex-col">
              <span className="font-serif text-[#2B1A1F] font-bold text-xs dark:text-[#FFF4DC]">{row.product_name || 'N/A'}</span>
              <div className="flex items-center space-x-2 mt-1">
                <span className="font-mono font-bold text-[10px] text-[#5C0B26] bg-[#5C0B26]/5 px-1.5 py-0.5 rounded dark:bg-rose-950/40 dark:text-rose-300" title="SKU">
                  {row.sku || 'N/A'}
                </span>
                <span className="text-[10px] text-[#7A6B70] font-semibold dark:text-[#D7C0B5]">Size: {row.size || 'N/A'}</span>
                <div className="flex items-center space-x-1">
                  <span
                    className="w-2.5 h-2.5 rounded-full border border-rose-900/10 shadow-2xs"
                    style={{ backgroundColor: row.color_code || '#fff' }}
                    title={row.color_name || 'Default'}
                  />
                  <span className="text-[9px] text-[#7A6B70] dark:text-[#D7C0B5]">{row.color_name || 'Default'}</span>
                </div>
              </div>
            </div>
          </div>
        )
      }
    },
    {
      header: 'Location',
      accessor: (row) => (
        <span className="text-xs text-[#2B1A1F] font-semibold flex items-center space-x-1.5 dark:text-[#D7C0B5]">
          <Warehouse className="w-3.5 h-3.5 text-[#8C3A57]" />
          <span>{row.warehouse_location || 'Unassigned'}</span>
        </span>
      ),
    },
    {
      header: 'Quantities',
      accessor: (row) => (
        <div className="flex flex-col space-y-0.5 text-xs">
          <span className="font-mono font-bold text-[#2B1A1F] dark:text-[#FFF4DC]">{row.quantity || 0} total</span>
          <span className="text-[10px] text-amber-700 font-bold dark:text-amber-400">{row.reserved_quantity || 0} reserved</span>
          <span className="text-[10px] text-emerald-700 font-bold dark:text-emerald-400">{row.availableQuantity || 0} available</span>
          <span className="text-[9px] text-rose-700 font-bold dark:text-rose-400">Threshold: {row.low_stock_threshold || 5}</span>
        </div>
      ),
    },
    {
      header: 'Status',
      accessor: (row) => {
        let label = 'In Stock'
        let classes = 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400'
        if (row.status === 'out_of_stock') {
          label = 'Out of Stock'
          classes = 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400'
        } else if (row.status === 'low_stock') {
          label = 'Low Stock'
          classes = 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400'
        }

        return (
          <div className="flex flex-col space-y-1 items-start">
            <span className={`px-2 py-0.5 rounded border text-[10px] font-bold ${classes}`}>
              {label}
            </span>
            {row.hasMismatch && (
              <span className="text-[8px] text-rose-600 font-bold italic" title={`DB Status: ${row.stock_status}`}>
                DB Sync Mismatch
              </span>
            )}
          </div>
        )
      },
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <AdminPageHeader
          title="Warehouse Inventory Control"
          description="Monitor physical inventories, configure low stock thresholds, and view transaction audits."
          badgeText={`${totalCount} ${viewMode === 'grouped' ? 'Products' : 'SKU Items'}`}
        />
        <div className="flex flex-col items-end space-y-1.5 w-full md:w-auto">
          {lastRefreshed && (
            <span className="text-[10px] text-muted-foreground font-mono">
              Last refreshed: {lastRefreshed}
            </span>
          )}
          <button
            onClick={() => loadInventory()}
            className="flex items-center space-x-1 px-2.5 py-1.5 bg-[#FAF8F5] border border-rose-900/10 rounded-lg text-[10px] text-rose-950 hover:bg-rose-50 font-bold transition-all cursor-pointer dark:bg-[#140C10] dark:border-[#5D3944] dark:text-[#FFF4DC]"
            title="Refresh Inventory Data"
            aria-label="Refresh Data"
          >
            <span>Refresh Data</span>
          </button>
        </div>
      </div>

      {/* Aggregate summaries */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
          <div className="bg-white p-3 rounded-xl border border-rose-950/10 shadow-3xs dark:bg-[#211318] dark:border-[#70424E] flex flex-col justify-between">
            <span className="text-[8px] font-bold text-rose-950/50 uppercase tracking-wider dark:text-[#D7C0B5]">Categories</span>
            <span className="text-sm font-serif font-bold text-[#2B1A1F] mt-0.5 dark:text-[#FFF4DC]">{summary.totalCategories ?? 0}</span>
          </div>
          <div className="bg-white p-3 rounded-xl border border-rose-950/10 shadow-3xs dark:bg-[#211318] dark:border-[#70424E] flex flex-col justify-between">
            <span className="text-[8px] font-bold text-rose-950/50 uppercase tracking-wider dark:text-[#D7C0B5]">Families</span>
            <span className="text-sm font-serif font-bold text-[#2B1A1F] mt-0.5 dark:text-[#FFF4DC]">{summary.totalFamilies ?? 0}</span>
          </div>
          <div className="bg-white p-3 rounded-xl border border-rose-950/10 shadow-3xs dark:bg-[#211318] dark:border-[#70424E] flex flex-col justify-between">
            <span className="text-[8px] font-bold text-rose-950/50 uppercase tracking-wider dark:text-[#D7C0B5]">Products</span>
            <span className="text-sm font-serif font-bold text-[#2B1A1F] mt-0.5 dark:text-[#FFF4DC]">{summary.totalProducts ?? 0}</span>
          </div>
          <div className="bg-white p-3 rounded-xl border border-rose-950/10 shadow-3xs dark:bg-[#211318] dark:border-[#70424E] flex flex-col justify-between">
            <span className="text-[8px] font-bold text-rose-950/50 uppercase tracking-wider dark:text-[#D7C0B5]">Variants</span>
            <span className="text-sm font-serif font-bold text-[#2B1A1F] mt-0.5 dark:text-[#FFF4DC]">{summary.totalVariants ?? 0}</span>
          </div>
          <div className="bg-white p-3 rounded-xl border border-rose-950/10 shadow-3xs dark:bg-[#211318] dark:border-[#70424E] flex flex-col justify-between">
            <span className="text-[8px] font-bold text-rose-950/50 uppercase tracking-wider dark:text-[#D7C0B5]">Total Units</span>
            <span className="text-sm font-serif font-bold text-emerald-800 mt-0.5 dark:text-emerald-400">{summary.totalStockUnits ?? 0}</span>
          </div>
          <div className="bg-white p-3 rounded-xl border border-rose-950/10 shadow-3xs dark:bg-[#211318] dark:border-[#70424E] flex flex-col justify-between">
            <span className="text-[8px] font-bold text-rose-950/50 uppercase tracking-wider dark:text-[#D7C0B5]">Available</span>
            <span className="text-sm font-serif font-bold text-amber-800 mt-0.5 dark:text-amber-400">{summary.totalAvailableUnits ?? 0}</span>
          </div>
          <div className="bg-white p-3 rounded-xl border border-rose-950/10 shadow-3xs dark:bg-[#211318] dark:border-[#70424E] flex flex-col justify-between">
            <span className="text-[8px] font-bold text-rose-950/50 uppercase tracking-wider dark:text-[#D7C0B5]">Low Stock</span>
            <span className="text-sm font-serif font-bold text-rose-900 mt-0.5 dark:text-rose-400">{summary.lowStockVariants ?? 0}</span>
          </div>
          <div className="bg-white p-3 rounded-xl border border-rose-950/10 shadow-3xs dark:bg-[#211318] dark:border-[#70424E] flex flex-col justify-between">
            <span className="text-[8px] font-bold text-rose-950/50 uppercase tracking-wider dark:text-[#D7C0B5]">Out of Stock</span>
            <span className="text-sm font-serif font-bold text-red-900 mt-0.5 dark:text-red-400">{summary.outOfStockVariants ?? 0}</span>
          </div>
        </div>
      )}

      {/* Filters and Search controls */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-3 rounded-2xl border border-rose-950/10 shadow-2xs dark:bg-[#211318] dark:border-[#70424E]">
        <div className="flex-1 w-full">
          <SearchAndFilterBar
            searchValue={searchQuery}
            onSearchChange={(val) => {
              setSearchQuery(val)
              setPage(1)
            }}
            searchPlaceholder="Search category, family, product, variant SKU..."
          />
        </div>
        <div className="flex flex-wrap gap-2 w-full md:w-auto items-center">
          {/* View Toggle */}
          <div className="flex bg-[#FAF8F5] border border-rose-900/10 rounded-xl p-1 dark:bg-[#140C10] dark:border-[#5D3944] mr-2">
            <button
              type="button"
              onClick={() => { setViewMode('grouped'); setPage(1); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-serif font-bold transition-all cursor-pointer ${
                viewMode === 'grouped'
                  ? 'bg-rose-950 text-amber-100 shadow-xs'
                  : 'text-rose-950/70 hover:text-rose-950 dark:text-[#D7C0B5] dark:hover:text-[#FFF4DC]'
              }`}
            >
              Hierarchical Tree
            </button>
            <button
              type="button"
              onClick={() => { setViewMode('variant'); setPage(1); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-serif font-bold transition-all cursor-pointer ${
                viewMode === 'variant'
                  ? 'bg-rose-950 text-amber-100 shadow-xs'
                  : 'text-rose-950/70 hover:text-rose-950 dark:text-[#D7C0B5] dark:hover:text-[#FFF4DC]'
              }`}
            >
              Flat Variants
            </button>
          </div>

          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value)
              setPage(1)
            }}
            className="p-2.5 bg-[#FAF8F5] border border-rose-900/10 rounded-xl text-xs text-rose-950 outline-hidden font-serif font-semibold w-full sm:w-32 cursor-pointer dark:bg-[#140C10] dark:border-[#5D3944] dark:text-[#FFF4DC]"
          >
            <option value="all">All Statuses</option>
            <option value="normal">In Stock</option>
            <option value="low">Low Stock</option>
            <option value="out">Out of Stock</option>
          </select>

          <select
            value={categoryFilter}
            onChange={(e) => handleCategoryChange(e.target.value)}
            className="p-2.5 bg-[#FAF8F5] border border-rose-900/10 rounded-xl text-xs text-rose-950 outline-hidden font-serif font-semibold w-full sm:w-32 cursor-pointer dark:bg-[#140C10] dark:border-[#5D3944] dark:text-[#FFF4DC]"
          >
            <option value="all">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          <select
            value={productFamilyFilter}
            onChange={(e) => {
              setProductFamilyFilter(e.target.value)
              setPage(1)
            }}
            className="p-2.5 bg-[#FAF8F5] border border-rose-900/10 rounded-xl text-xs text-rose-950 outline-hidden font-serif font-semibold w-full sm:w-32 cursor-pointer dark:bg-[#140C10] dark:border-[#5D3944] dark:text-[#FFF4DC]"
          >
            <option value="all">All Product Families</option>
            {filteredFamiliesForDropdown.map((fam) => (
              <option key={fam.id} value={fam.id}>{fam.name}</option>
            ))}
          </select>

          <select
            value={colorFilter}
            onChange={(e) => {
              setColorFilter(e.target.value)
              setPage(1)
            }}
            className="p-2.5 bg-[#FAF8F5] border border-rose-900/10 rounded-xl text-xs text-rose-950 outline-hidden font-serif font-semibold w-full sm:w-28 cursor-pointer dark:bg-[#140C10] dark:border-[#5D3944] dark:text-[#FFF4DC]"
          >
            <option value="all">All Colors</option>
            {colors.map((col) => (
              <option key={col.id} value={col.id}>{col.name}</option>
            ))}
          </select>

          <select
            value={sizeFilter}
            onChange={(e) => {
              setSizeFilter(e.target.value)
              setPage(1)
            }}
            className="p-2.5 bg-[#FAF8F5] border border-rose-900/10 rounded-xl text-xs text-rose-950 outline-hidden font-serif font-semibold w-full sm:w-28 cursor-pointer dark:bg-[#140C10] dark:border-[#5D3944] dark:text-[#FFF4DC]"
          >
            <option value="all">All Sizes</option>
            {sizes.map((sz) => (
              <option key={sz.id} value={sz.id}>{sz.name}</option>
            ))}
          </select>
        </div>
      </div>

      {isLoading ? (
        <TableSkeleton rows={5} />
      ) : queryError ? (
        <EmptyState
          title="Query Error"
          description="Unable to load inventory. Please try again."
          icon={AlertTriangle}
        />
      ) : inventory.length === 0 ? (
        <EmptyState
          title={isFilterActive ? "No Matching Records" : "No Inventory Records"}
          description={isFilterActive ? "No inventory matches the selected filters." : "No inventory records found."}
          icon={Warehouse}
        />
      ) : (
        <div className="space-y-4">
          {viewMode === 'variant' ? (
            <div className="bg-white rounded-2xl border border-[#5C0B26]/10 shadow-sm overflow-x-auto dark:bg-[#211318] dark:border-[#70424E]">
              <DataTable
                columns={flatColumns}
                data={inventory}
                hidePagination={true}
                actions={(row) => (
                  <div className="flex items-center justify-end space-x-1.5">
                    <button
                      onClick={() => openAdjustModal(row)}
                      className="p-1.5 text-amber-700 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                      title="Adjust Inventory Stock"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => openThresholdModal(row)}
                      className="p-1.5 text-[#5C0B26] hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                      title="Inventory Configuration"
                    >
                      <Settings className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => openHistoryDrawer(row)}
                      className="p-1.5 text-rose-950/60 hover:bg-rose-950/5 rounded-lg transition-colors cursor-pointer dark:text-[#D7C0B5]"
                      title="Audit Transactions History"
                    >
                      <History className="w-4 h-4" />
                    </button>
                  </div>
                )}
              />
            </div>
          ) : (
            // Category -> Family -> Product -> Variant Tree Hierarchy Accordions Layout
            <div className="space-y-4">
              {inventory.map((cat: any) => {
                const catKey = cat.categoryId || 'uncategorised'
                const isCatExpanded = expandedCategories.has(catKey)
                const shouldExpandCat = isCatExpanded || (isFilterActive && cat.families.some((f: any) => f.products.some((p: any) => p.variants.some((v: any) => v.isMatched))))

                return (
                  <div key={catKey} className="border border-rose-900/10 rounded-2xl bg-white dark:bg-[#211318] dark:border-[#70424E] overflow-hidden shadow-xs">
                    {/* Level 1 Category Row */}
                    <div
                      onClick={() => toggleCategoryExpand(catKey)}
                      className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 bg-[#FAF8F5]/90 hover:bg-[#FAF8F5] dark:bg-[#2A171E]/40 dark:hover:bg-[#2A171E]/60 transition-colors cursor-pointer border-b border-rose-900/5 select-none"
                    >
                      <div className="flex items-center space-x-3">
                        <span className="p-1 hover:bg-rose-950/5 rounded-lg">
                          {shouldExpandCat ? <ChevronUp className="w-4 h-4 text-rose-950 dark:text-[#FFF4DC]" /> : <ChevronDown className="w-4 h-4 text-rose-950 dark:text-[#FFF4DC]" />}
                        </span>
                        <div className="flex flex-col">
                          <span className="font-serif text-[#2B1A1F] font-bold text-sm dark:text-[#FFF4DC]">{cat.categoryName}</span>
                          <span className="text-[10px] text-rose-950/60 dark:text-[#D7C0B5]/80 mt-0.5 font-semibold">
                            {cat.productFamilyCount} families · {cat.productCount} products · {cat.variantCount} variants
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4 mt-2 sm:mt-0 text-xs font-semibold text-rose-950 dark:text-[#FFF4DC]">
                        <div className="flex flex-col items-end">
                          <span className="font-mono text-[10px] text-[#2B1A1F] dark:text-[#FFF4DC]">{cat.totalQuantity} total · {cat.totalAvailable} available</span>
                          <span className="text-[9px] text-[#7A6B70] mt-0.5 dark:text-[#D7C0B5]">
                            {cat.lowStockVariantCount} low stock · {cat.outOfStockVariantCount} out of stock
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Level 2 Families Area */}
                    {shouldExpandCat && (
                      <div className="p-4 space-y-4 bg-rose-50/5 dark:bg-[#140C10]/15 border-t border-rose-900/5">
                        {cat.families.map((fam: any) => {
                          const famKey = `${catKey}:${fam.familyId || 'no-family'}`
                          const isFamExpanded = expandedFamilies.has(famKey)
                          const shouldExpandFam = isFamExpanded || (isFilterActive && fam.products.some((p: any) => p.variants.some((v: any) => v.isMatched)))

                          return (
                            <div key={famKey} className="border border-rose-900/5 dark:border-[#5D3944]/30 rounded-xl overflow-hidden bg-[#FAF8F5]/40 dark:bg-[#1A0F14]/40">
                              {/* Family Row */}
                              <div
                                onClick={() => toggleFamilyExpand(famKey)}
                                className="flex justify-between items-center px-4 py-2.5 bg-[#FAF8F5]/60 hover:bg-[#FAF8F5] dark:bg-[#2A171E]/20 dark:hover:bg-[#2A171E]/40 transition-colors cursor-pointer select-none"
                              >
                                <div className="flex items-center space-x-2">
                                  <span className="p-0.5 hover:bg-rose-950/5 rounded-md">
                                    {shouldExpandFam ? <ChevronUp className="w-3.5 h-3.5 text-rose-950 dark:text-[#FFF4DC]" /> : <ChevronDown className="w-3.5 h-3.5 text-rose-950 dark:text-[#FFF4DC]" />}
                                  </span>
                                  <span className="font-serif text-[#2B1A1F] font-bold text-xs dark:text-[#FFF4DC]">{fam.familyName}</span>
                                </div>
                                <div className="flex items-center space-x-3 text-[10px] font-semibold text-[#7A6B70] dark:text-[#D7C0B5]">
                                  <span>{fam.productCount} products · {fam.variantCount} variants</span>
                                  <span>·</span>
                                  <span>{fam.totalQuantity} total · {fam.totalAvailable} available</span>
                                  <span>·</span>
                                  <span className={`px-2 py-0.5 rounded border text-[9px] font-bold ${
                                    fam.overallStatus === 'out_of_stock'
                                      ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400'
                                      : fam.overallStatus === 'low_stock'
                                        ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400'
                                        : fam.overallStatus === 'mixed_stock'
                                          ? 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-400'
                                          : 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400'
                                  }`}>
                                    {fam.overallStatus === 'out_of_stock' ? 'Out of Stock' : fam.overallStatus === 'low_stock' ? 'Low Stock' : fam.overallStatus === 'mixed_stock' ? 'Mixed Stock' : 'In Stock'}
                                  </span>
                                </div>
                              </div>

                              {/* Level 3 Products Area */}
                              {shouldExpandFam && (
                                <div className="p-3 space-y-3 bg-white dark:bg-[#140C10] border-t border-rose-900/5">
                                  {fam.products.map((prod: any) => {
                                    const isProdExpanded = expandedProducts.has(prod.productId)
                                    const shouldExpandProd = isProdExpanded || (isFilterActive && prod.variants.some((v: any) => v.isMatched))

                                    return (
                                      <div key={prod.productId} className="border border-rose-900/5 dark:border-[#5D3944]/20 rounded-lg overflow-hidden shadow-2xs">
                                        {/* Product Row */}
                                        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center p-3 hover:bg-[#FAF8F5]/30 dark:hover:bg-[#2A171E]/10 transition-colors">
                                          <div className="flex items-center space-x-3">
                                            {prod.imageUrl ? (
                                              <img
                                                src={prod.imageUrl}
                                                alt={prod.productName}
                                                className="w-9 h-9 object-cover rounded-lg border border-rose-950/10"
                                              />
                                            ) : (
                                              <div className="w-9 h-9 bg-rose-950/5 flex items-center justify-center rounded-lg border border-rose-950/10 text-[8px] text-[#7A6B70] font-bold">
                                                No Img
                                              </div>
                                            )}
                                            <div className="flex flex-col">
                                              <span className="font-serif text-[#2B1A1F] font-bold text-xs dark:text-[#FFF4DC]">{prod.productName}</span>
                                              {prod.baseSku && (
                                                <span className="font-mono text-[9px] text-[#5C0B26] mt-0.5" title="Base SKU">Base SKU: {prod.baseSku}</span>
                                              )}
                                            </div>
                                          </div>
                                          
                                          <div className="flex flex-wrap items-center gap-4 mt-2 lg:mt-0 text-[11px] font-semibold text-[#7A6B70] dark:text-[#D7C0B5]">
                                            <span>{prod.variantCount} variants</span>
                                            <span>{prod.totalQuantity} total · {prod.totalAvailable} available</span>
                                            <div className="flex items-center space-x-1.5">
                                              <span className={`px-2 py-0.5 rounded border text-[9px] font-bold ${
                                                prod.overallStatus === 'out_of_stock'
                                                  ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400'
                                                  : prod.overallStatus === 'low_stock'
                                                    ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400'
                                                    : prod.overallStatus === 'mixed_stock'
                                                      ? 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-400'
                                                      : 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400'
                                              }`}>
                                                {prod.overallStatus === 'out_of_stock' ? 'Out of Stock' : prod.overallStatus === 'low_stock' ? 'Low Stock' : prod.overallStatus === 'mixed_stock' ? 'Mixed Stock' : 'In Stock'}
                                              </span>
                                              {prod.hasStatusMismatch && (
                                                <span className="text-amber-600 cursor-help" title="One or more variants have a stored stock status that differs from the calculated operational status.">
                                                  <AlertTriangle className="w-3.5 h-3.5 animate-pulse" />
                                                </span>
                                              )}
                                            </div>
                                            <span className="text-[10px] text-[#2B1A1F] dark:text-[#D7C0B5] truncate max-w-[120px]" title={prod.locationSummary}>
                                              Loc: {prod.locationSummary}
                                            </span>

                                            <div className="flex items-center justify-end space-x-1.5">
                                              <button
                                                onClick={() => toggleProductExpand(prod.productId)}
                                                className="p-1 text-rose-950/60 hover:bg-rose-950/5 rounded-lg transition-colors cursor-pointer dark:text-[#D7C0B5]"
                                                title={shouldExpandProd ? 'Collapse variant rows' : 'Expand variant rows'}
                                              >
                                                {shouldExpandProd ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                                              </button>
                                              <button
                                                onClick={() => openAdjustModal(prod)}
                                                className="p-1 text-amber-700 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                                                title="Adjust Variant Stock Levels"
                                              >
                                                <Plus className="w-3.5 h-3.5" />
                                              </button>
                                              <button
                                                onClick={() => openHistoryDrawer(prod)}
                                                className="p-1 text-rose-950/60 hover:bg-rose-950/5 rounded-lg transition-colors cursor-pointer dark:text-[#D7C0B5]"
                                                title="Audit Transaction Logs"
                                              >
                                                <History className="w-3.5 h-3.5" />
                                              </button>
                                            </div>
                                          </div>
                                        </div>

                                        {/* Level 4 Nested Variant Table */}
                                        {shouldExpandProd && (
                                          <div className="bg-[#FAF8F5]/30 dark:bg-[#1A0F14]/20 border-t border-rose-900/5 p-3 overflow-x-auto">
                                            <table className="w-full text-left border-collapse text-xs">
                                              <thead>
                                                <tr className="border-b border-rose-900/10 text-[9px] font-bold uppercase tracking-wider text-rose-950/60 dark:text-[#D7C0B5]">
                                                  <th className="px-3 py-1.5">SKU</th>
                                                  <th className="px-3 py-1.5">Size</th>
                                                  <th className="px-3 py-1.5">Colour</th>
                                                  <th className="px-3 py-1.5">Total Quantity</th>
                                                  <th className="px-3 py-1.5">Reserved</th>
                                                  <th className="px-3 py-1.5">Available</th>
                                                  <th className="px-3 py-1.5">Low-Stock Threshold</th>
                                                  <th className="px-3 py-1.5">Stock Status</th>
                                                  <th className="px-3 py-1.5">Location</th>
                                                  <th className="px-3 py-1.5 text-right">Actions</th>
                                                </tr>
                                              </thead>
                                              <tbody>
                                                {prod.variants.map((v: any) => (
                                                  <tr
                                                    key={v.id}
                                                    className={`hover:bg-rose-50/10 dark:hover:bg-[#2A171E]/10 transition-colors border-b border-rose-900/5 dark:border-[#5D3944]/20 ${
                                                      v.isMatched ? 'bg-amber-50/20 dark:bg-amber-950/10 font-bold' : ''
                                                    }`}
                                                    style={{ height: '40px' }}
                                                  >
                                                    <td className="px-3 py-1.5 font-mono text-[10px] text-rose-900 dark:text-rose-300">
                                                      {v.sku}
                                                    </td>
                                                    <td className="px-3 py-1.5 text-[#7A6B70] dark:text-[#D7C0B5]">
                                                      {v.size || 'N/A'}
                                                    </td>
                                                    <td className="px-3 py-1.5">
                                                      <div className="flex items-center space-x-1.5">
                                                        <span
                                                          className="w-2.5 h-2.5 rounded-full border border-rose-900/10 shadow-2xs"
                                                          style={{ backgroundColor: v.color_code || '#fff' }}
                                                        />
                                                        <span className="text-[#7A6B70] dark:text-[#D7C0B5]">{v.color_name || 'Default'}</span>
                                                      </div>
                                                    </td>
                                                    <td className="px-3 py-1.5 font-mono font-semibold text-rose-950 dark:text-[#FFF4DC]">
                                                      {v.quantity}
                                                    </td>
                                                    <td className="px-3 py-1.5 font-mono text-amber-700 dark:text-amber-400">
                                                      {v.reserved_quantity}
                                                    </td>
                                                    <td className="px-3 py-1.5 font-mono text-emerald-700 dark:text-emerald-400">
                                                      {v.availableQuantity}
                                                    </td>
                                                    <td className="px-3 py-1.5 font-mono text-rose-800 dark:text-rose-400">
                                                      {v.low_stock_threshold}
                                                    </td>
                                                    <td className="px-3 py-1.5">
                                                      <div className="flex flex-col space-y-0.5 items-start">
                                                        <span className={`px-2 py-0.5 rounded border text-[9px] font-bold ${
                                                          v.status === 'out_of_stock'
                                                            ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400'
                                                            : v.status === 'low_stock'
                                                              ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400'
                                                              : 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400'
                                                        }`}>
                                                          {v.status === 'out_of_stock' ? 'Out of Stock' : v.status === 'low_stock' ? 'Low Stock' : 'In Stock'}
                                                        </span>
                                                        {v.hasMismatch && (
                                                          <span className="text-[8px] text-rose-600 font-bold italic" title={`DB Status: ${v.stock_status}`}>
                                                            DB Sync Mismatch
                                                          </span>
                                                        )}
                                                      </div>
                                                    </td>
                                                    <td className="px-3 py-1.5 text-rose-950 dark:text-[#FFF4DC]">
                                                      {v.warehouse_location || 'Unassigned'}
                                                    </td>
                                                    <td className="px-3 py-1.5 text-right">
                                                      <div className="flex items-center justify-end space-x-1">
                                                        <button
                                                          onClick={() => openAdjustModal(v)}
                                                          className="p-1 text-amber-700 hover:bg-amber-50 rounded-lg cursor-pointer"
                                                          title="Adjust Variant Stock Level"
                                                        >
                                                          <Plus className="w-3.5 h-3.5" />
                                                        </button>
                                                        <button
                                                          onClick={() => openThresholdModal(v)}
                                                          className="p-1 text-[#5C0B26] hover:bg-rose-50 rounded-lg cursor-pointer"
                                                          title="Configure Low Stock / Location"
                                                        >
                                                          <Settings className="w-3.5 h-3.5" />
                                                        </button>
                                                        <button
                                                          onClick={() => openHistoryDrawer(v)}
                                                          className="p-1 text-rose-950/60 hover:bg-rose-950/5 rounded-lg cursor-pointer dark:text-[#D7C0B5]"
                                                          title="Audit Transaction Logs"
                                                        >
                                                          <History className="w-3.5 h-3.5" />
                                                        </button>
                                                      </div>
                                                    </td>
                                                  </tr>
                                                ))}
                                              </tbody>
                                            </table>
                                          </div>
                                        )}
                                      </div>
                                    )
                                  })}
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {/* Authoritative Single Pagination Controls */}
          {totalCount > 0 && (
            <div className="flex items-center justify-between bg-white px-4 py-3 rounded-2xl border border-[#5C0B26]/10 shadow-2xs dark:bg-[#211318] dark:border-[#70424E] text-xs">
              <div className="text-muted-foreground dark:text-[#D7C0B5]">
                Showing <span className="font-bold text-foreground dark:text-[#FFF4DC]">{Math.min(totalCount, (page - 1) * pageSize + 1)}</span> to{' '}
                <span className="font-bold text-foreground dark:text-[#FFF4DC]">{Math.min(totalCount, page * pageSize)}</span> of{' '}
                <span className="font-bold text-foreground dark:text-[#FFF4DC]">{totalCount}</span> products
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1.5 border border-border rounded-lg bg-surface font-semibold text-rose-950 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-rose-50/50 cursor-pointer dark:text-[#FFF4DC] dark:border-[#5D3944]"
                >
                  Previous
                </button>
                <span className="text-muted-foreground dark:text-[#D7C0B5] px-2">
                  Page <span className="font-bold text-foreground dark:text-[#FFF4DC]">{page}</span> of{' '}
                  <span className="font-bold text-foreground dark:text-[#FFF4DC]">{totalPages}</span>
                </span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-1.5 border border-border rounded-lg bg-surface font-semibold text-rose-950 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-rose-50/50 cursor-pointer dark:text-[#FFF4DC] dark:border-[#5D3944]"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ADJUST INVENTORY DIALOG MODAL */}
      {isAdjustModalOpen && selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#211318] rounded-2xl border border-rose-900/10 dark:border-[#70424E] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-rose-950/10 dark:border-[#5D3944] flex justify-between items-center bg-[#FAF8F5] dark:bg-[#2A171E]">
              <h3 className="font-serif text-base font-bold text-rose-950 dark:text-[#FFF4DC] flex items-center space-x-1.5">
                <Warehouse className="w-4 h-4 text-amber-700" />
                <span>Adjust Stock Levels</span>
              </h3>
              <button
                onClick={() => setIsAdjustModalOpen(false)}
                className="p-1 text-rose-950/50 hover:bg-rose-950/5 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAdjustInventory} className="p-5 space-y-4">
              {errorMsg && <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-medium">{errorMsg}</div>}
              {successMsg && <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-xs font-medium">{successMsg}</div>}

              {selectedItem.variants && selectedItem.variants.length > 0 ? (
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-rose-950/60 dark:text-[#D7C0B5]">Select Variant</label>
                  <select
                    value={selectedVariantId}
                    onChange={(e) => setSelectedVariantId(e.target.value)}
                    className="w-full p-2.5 bg-[#FAF8F5] border border-rose-900/10 rounded-xl text-xs text-rose-950 outline-hidden font-semibold dark:bg-[#140C10] dark:border-[#5D3944] dark:text-[#FFF4DC]"
                  >
                    {selectedItem.variants.map((v: any) => (
                      <option key={v.id} value={v.id}>
                        {v.size || 'N/A'} / {v.color_name || 'Default'} ({v.sku}) - {v.quantity} total
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-rose-950/60">Product SKU Details</label>
                  <input
                    type="text"
                    disabled
                    value={`${selectedItem.product_name} - Size ${selectedItem.size} (${selectedItem.sku})`}
                    className="w-full p-2.5 bg-rose-950/5 border border-rose-900/10 rounded-xl text-xs text-rose-950/60 outline-hidden font-serif"
                  />
                </div>
              )}

              <div className="space-y-1">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-rose-950/60 dark:text-[#D7C0B5]">Adjustment Type</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setAdjustmentType('increase')}
                    className={`py-2 px-3 border rounded-xl text-xs font-serif font-bold transition-all flex items-center justify-center space-x-1 cursor-pointer ${
                      adjustmentType === 'increase'
                        ? 'bg-emerald-700 border-emerald-700 text-white shadow-sm'
                        : 'bg-white dark:bg-[#140C10] dark:border-[#5D3944] dark:text-[#FFF4DC] border-rose-950/10 text-rose-950 hover:bg-rose-50'
                    }`}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Receive</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdjustmentType('decrease')}
                    className={`py-2 px-3 border rounded-xl text-xs font-serif font-bold transition-all flex items-center justify-center space-x-1 cursor-pointer ${
                      adjustmentType === 'decrease'
                        ? 'bg-rose-700 border-rose-700 text-white shadow-sm'
                        : 'bg-white dark:bg-[#140C10] dark:border-[#5D3944] dark:text-[#FFF4DC] border-rose-950/10 text-rose-950 hover:bg-rose-50'
                    }`}
                  >
                    <Minus className="w-3.5 h-3.5" />
                    <span>Damage</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdjustmentType('exact')}
                    className={`py-2 px-3 border rounded-xl text-xs font-serif font-bold transition-all flex items-center justify-center space-x-1 cursor-pointer ${
                      adjustmentType === 'exact'
                        ? 'bg-rose-950 border-rose-950 text-white shadow-sm dark:bg-[#FFF4DC] dark:text-rose-950'
                        : 'bg-white dark:bg-[#140C10] dark:border-[#5D3944] dark:text-[#FFF4DC] border-rose-950/10 text-rose-950 hover:bg-rose-50'
                    }`}
                  >
                    <span>Audit Set</span>
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-rose-950/60 dark:text-[#D7C0B5]">Adjustment Amount / Quantity</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={adjustmentValue}
                  onChange={(e) => setAdjustmentValue(e.target.value)}
                  className="w-full p-2.5 bg-[#FAF8F5] border border-rose-900/10 rounded-xl text-xs text-rose-950 outline-hidden focus:border-amber-700 font-semibold dark:bg-[#140C10] dark:border-[#5D3944] dark:text-[#FFF4DC]"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-rose-950/60 dark:text-[#D7C0B5]">Reason Description</label>
                <input
                  type="text"
                  required
                  value={adjustmentReason}
                  onChange={(e) => setAdjustmentReason(e.target.value)}
                  className="w-full p-2.5 bg-[#FAF8F5] border border-rose-900/10 rounded-xl text-xs text-rose-950 outline-hidden focus:border-amber-700 font-semibold dark:bg-[#140C10] dark:border-[#5D3944] dark:text-[#FFF4DC]"
                />
              </div>

              <div className="flex space-x-3 pt-3 border-t border-rose-950/10">
                <button
                  type="button"
                  onClick={() => setIsAdjustModalOpen(false)}
                  className="flex-1 py-2.5 px-4 bg-white border border-rose-900/10 text-rose-950 text-xs font-serif font-bold rounded-xl cursor-pointer dark:bg-[#2A171E] dark:border-[#5D3944] dark:text-[#FFF4DC] hover:bg-rose-50"
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
                    <span>Save Adjustments</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* THRESHOLD CONFIG DIALOG MODAL */}
      {isThresholdModalOpen && selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#211318] rounded-2xl border border-rose-900/10 dark:border-[#70424E] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-rose-950/10 dark:border-[#5D3944] flex justify-between items-center bg-[#FAF8F5] dark:bg-[#2A171E]">
              <h3 className="font-serif text-base font-bold text-rose-950 dark:text-[#FFF4DC] flex items-center space-x-1.5">
                <Settings className="w-4 h-4 text-[#5C0B26]" />
                <span>Configure Variant Status</span>
              </h3>
              <button
                onClick={() => setIsThresholdModalOpen(false)}
                className="p-1 text-rose-950/50 hover:bg-rose-950/5 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateThresholds} className="p-5 space-y-4">
              {errorMsg && <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-medium">{errorMsg}</div>}
              {successMsg && <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-xs font-medium">{successMsg}</div>}

              {selectedItem.variants && selectedItem.variants.length > 0 ? (
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-rose-950/60 dark:text-[#D7C0B5]">Select Variant</label>
                  <select
                    value={selectedVariantId}
                    onChange={(e) => {
                      const varId = e.target.value
                      setSelectedVariantId(varId)
                      const matched = selectedItem.variants.find((v: any) => v.id === varId)
                      if (matched) {
                        setLowStockThreshold(String(matched.low_stock_threshold ?? 5))
                        setWarehouseLocation(matched.warehouse_location || 'Unassigned')
                      }
                    }}
                    className="w-full p-2.5 bg-[#FAF8F5] border border-rose-900/10 rounded-xl text-xs text-rose-950 outline-hidden font-semibold dark:bg-[#140C10] dark:border-[#5D3944] dark:text-[#FFF4DC]"
                  >
                    {selectedItem.variants.map((v: any) => (
                      <option key={v.id} value={v.id}>
                        {v.size || 'N/A'} / {v.color_name || 'Default'} ({v.sku})
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-rose-950/60">Product SKU Details</label>
                  <input
                    type="text"
                    disabled
                    value={`${selectedItem.product_name} - Size ${selectedItem.size} (${selectedItem.sku})`}
                    className="w-full p-2.5 bg-rose-950/5 border border-rose-900/10 rounded-xl text-xs text-rose-950/60 outline-hidden font-serif"
                  />
                </div>
              )}

              <div className="space-y-1">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-rose-950/60 dark:text-[#D7C0B5]">Low Stock Threshold Limit</label>
                <input
                  type="number"
                  min="0"
                  required
                  value={lowStockThreshold}
                  onChange={(e) => setLowStockThreshold(e.target.value)}
                  className="w-full p-2.5 bg-[#FAF8F5] border border-rose-900/10 rounded-xl text-xs text-rose-950 outline-hidden focus:border-amber-700 font-semibold dark:bg-[#140C10] dark:border-[#5D3944] dark:text-[#FFF4DC]"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-rose-950/60 dark:text-[#D7C0B5]">Warehouse Location Bin</label>
                <input
                  type="text"
                  required
                  value={warehouseLocation}
                  onChange={(e) => setWarehouseLocation(e.target.value)}
                  placeholder="e.g. Rack A1"
                  className="w-full p-2.5 bg-[#FAF8F5] border border-rose-900/10 rounded-xl text-xs text-rose-950 outline-hidden focus:border-amber-700 font-semibold dark:bg-[#140C10] dark:border-[#5D3944] dark:text-[#FFF4DC]"
                />
              </div>

              <div className="flex space-x-3 pt-3 border-t border-rose-950/10">
                <button
                  type="button"
                  onClick={() => setIsThresholdModalOpen(false)}
                  className="flex-1 py-2.5 px-4 bg-white hover:bg-rose-50 border border-rose-900/10 text-rose-950 text-xs font-serif font-bold rounded-xl cursor-pointer dark:bg-[#2A171E] dark:border-[#5D3944] dark:text-[#FFF4DC]"
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
                    <span>Save Configuration</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* INVENTORY HISTORY DRAWER (SLIDE OVER) */}
      {isHistoryDrawerOpen && selectedItem && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#211318] w-full max-w-md h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            <div className="p-5 border-b border-rose-950/10 dark:border-[#5D3944] flex justify-between items-center bg-[#FAF8F5] dark:bg-[#2A171E]">
              <div className="flex flex-col w-full pr-8">
                <h4 className="font-serif text-sm font-bold text-rose-950 dark:text-[#FFF4DC] flex items-center space-x-1.5">
                  <History className="w-4 h-4 text-rose-950" />
                  <span>Audit Logs</span>
                </h4>
                <span className="text-[10px] text-[#7A6B70] mt-0.5">{selectedItem.productName || selectedItem.product_name}</span>
                
                {selectedItem.variants && selectedItem.variants.length > 0 && (
                  <div className="mt-2">
                    <label className="block text-[8px] font-bold uppercase tracking-wider text-rose-950/50 dark:text-[#D7C0B5] mb-1">Select Variant</label>
                    <select
                      value={selectedVariantId}
                      onChange={(e) => handleHistoryVariantChange(e.target.value)}
                      className="w-full p-1.5 bg-[#FAF8F5] border border-rose-900/10 rounded-lg text-[10px] text-rose-950 outline-hidden font-semibold dark:bg-[#140C10] dark:border-[#5D3944] dark:text-[#FFF4DC]"
                    >
                      {selectedItem.variants.map((v: any) => (
                        <option key={v.id} value={v.id}>
                          {v.size || 'N/A'} / {v.color_name || 'Default'} ({v.sku})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
              <button
                onClick={() => setIsHistoryDrawerOpen(false)}
                className="p-1 text-rose-950/50 hover:bg-rose-950/5 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {isHistoryLoading ? (
                <div className="flex flex-col items-center justify-center h-48 space-y-2">
                  <Loader2 className="w-6 h-6 animate-spin text-rose-950" />
                  <span className="text-xs text-rose-950/60 font-serif">Loading history logs...</span>
                </div>
              ) : historyLogs.length === 0 ? (
                <div className="text-center py-12 text-rose-950/50">
                  <History className="w-8 h-8 mx-auto text-rose-950/20 mb-2" />
                  <p className="text-xs font-serif">No transactions logged yet for this variant SKU.</p>
                </div>
              ) : (
                <div className="relative border-l-2 border-rose-950/10 pl-4 space-y-6">
                  {historyLogs.map((log) => (
                    <div key={log.id} className="relative space-y-1.5">
                      {/* Timeline dot */}
                      <span className="absolute -left-[21px] top-1.5 w-2 h-2 rounded-full bg-rose-950 border border-white" />
                      
                      <div className="flex justify-between items-start">
                        <span className="px-2 py-0.5 rounded bg-rose-950/5 border border-rose-950/10 text-[9px] font-bold text-rose-950">
                          {log.reason}
                        </span>
                        <span className="text-[10px] text-[#7A6B70]">
                          {new Date(log.created_at).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })}
                        </span>
                      </div>

                      <div className="flex items-center text-xs font-semibold text-rose-950">
                        <span className="font-mono text-[#7A6B70]">{log.previous_quantity} units</span>
                        <ArrowRight className="w-3.5 h-3.5 mx-1.5 text-rose-950/45" />
                        <span className="font-mono text-rose-950 font-bold">{log.new_quantity} units</span>
                        <span className={`ml-2 text-[10px] font-bold ${
                          log.change_amount > 0 ? 'text-emerald-700' : 'text-rose-700'
                        }`}>
                          ({log.change_amount > 0 ? `+${log.change_amount}` : log.change_amount})
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
