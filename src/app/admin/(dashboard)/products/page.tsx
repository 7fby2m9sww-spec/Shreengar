'use client'

import React, { useEffect, useState, useMemo } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import {
  AdminPageHeader,
  EmptyState,
  TableSkeleton,
} from '@/components/admin/AdminUI'
import { Button } from '@/components/ui/Button'
import {
  Plus,
  Edit,
  Trash2,
  Package,
  Search,
  ChevronDown,
  ChevronRight,
  Copy,
  Download,
  AlertTriangle,
  RefreshCw,
  Info,
  Warehouse
} from 'lucide-react'
import {
  getPaginatedProductsAction,
  createProductAction,
  updateProductAction,
  deleteProductAction,
  getCategoriesAction,
  getProductFamiliesAction,
  duplicateProductAsColourwayAction,
  getSizesAction
} from '@/actions/catalog/actions'
import { formatINR } from '@/lib/utils'
import { AdminProduct, Category, ProductFamily } from '@/types/database'
import { ProductForm, ProductFormValues, ColorOption, CollectionOption, SizeOption } from '@/components/admin/products/ProductForm'
import { createClient } from '@/lib/supabase/client'

function StatusBadge({ status }: { status: 'published' | 'draft' | 'archived' | 'inactive' | 'active' }) {
  if (status === 'published' || status === 'active') {
    return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">Published</span>
  }
  if (status === 'draft') {
    return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">Draft</span>
  }
  if (status === 'archived') {
    return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-700 border border-gray-200">Archived</span>
  }
  return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">Inactive</span>
}

export default function AdminProductsPage() {
  const [products, setProducts] = useState<AdminProduct[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [viewTab, setViewTab] = useState<'all' | 'grouped' | 'ungrouped' | 'active' | 'draft' | 'inactive' | 'archived' | 'low_stock' | 'out_of_stock'>('all')
  const [initialStep, setInitialStep] = useState(1)

  const [categories, setCategories] = useState<Category[]>([])
  const [productFamilies, setProductFamilies] = useState<ProductFamily[]>([])
  const [colors, setColors] = useState<ColorOption[]>([])
  const [collections, setCollections] = useState<CollectionOption[]>([])
  const [sizes, setSizes] = useState<SizeOption[]>([])

  // Product Family async statuses
  const [isFamiliesLoading, setIsFamiliesLoading] = useState(false)
  const [familiesError, setFamiliesError] = useState<string | null>(null)

  // Expanded Family Accordion Set
  const [expandedFamilyIds, setExpandedFamilyIds] = useState<Set<string>>(new Set())

  // Modal / Form States
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<AdminProduct | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Migration status
  const [isMigrationPending, setIsMigrationPending] = useState(false)
  const [actionNotice, setActionNotice] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null)

  const loadFamiliesData = async () => {
    setIsFamiliesLoading(true)
    setFamiliesError(null)
    const famRes = await getProductFamiliesAction({ activeOnly: true })
    if (famRes && 'data' in famRes && famRes.data) {
      setProductFamilies(famRes.data)
      setFamiliesError(null)
    } else {
      setFamiliesError(famRes?.error || 'Unable to load Product Families.')
    }
    setIsFamiliesLoading(false)
  }

  const loadData = async () => {
    setIsLoading(true)
    setFetchError(null)

    const res = await getPaginatedProductsAction({ isAdmin: true, pageSize: 100 })
    if (res && 'fetchError' in res && res.fetchError) {
      setFetchError(res.fetchError as string)
    } else if (res && 'products' in res && res.products) {
      setProducts(res.products as AdminProduct[])
    }

    const catRes = await getCategoriesAction()
    if (catRes && 'data' in catRes && catRes.data) setCategories(catRes.data)

    setIsFamiliesLoading(true)
    setFamiliesError(null)
    const famRes = await getProductFamiliesAction({ activeOnly: true })
    let loadedFamilies: ProductFamily[] = []
    if (famRes && 'data' in famRes && famRes.data) {
      setProductFamilies(famRes.data)
      loadedFamilies = famRes.data
      setFamiliesError(null)
    } else {
      setFamiliesError(famRes?.error || 'Unable to load Product Families.')
      setIsMigrationPending(true)
    }
    setIsFamiliesLoading(false)

    const szRes = await getSizesAction()
    if (szRes && szRes.data) setSizes(szRes.data)

    const supabase = createClient()
    const { data: colorData, error: colorErr } = await supabase.from('colors').select('id, name, hex_code')
    if (colorData) setColors(colorData)
    if (colorErr) setIsMigrationPending(true)

    const { data: colData } = await supabase.from('collections').select('id, name')
    if (colData) setCollections(colData)

    setIsLoading(false)
    return { loadedFamilies }
  }

  const [preselectedFamilyId, setPreselectedFamilyId] = useState<string | null>(null)

  useEffect(() => {
    loadData().then(({ loadedFamilies }) => {
      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search)
        
        // Stock filters pre-selection
        const stockParam = params.get('stock')
        if (stockParam === 'low') {
          setViewTab('low_stock')
        } else if (stockParam === 'out') {
          setViewTab('out_of_stock')
        } else if (stockParam === 'in') {
          setViewTab('active')
        }

        const famId = params.get('familyId')
        if (famId) {
          const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(famId)
          if (isUuid) {
            const exists = (loadedFamilies || []).some(f => f.id === famId)
            if (exists) {
              setPreselectedFamilyId(famId)
              setEditingProduct(null)
              setInitialStep(1)
              setIsFormOpen(true)
            } else {
              setActionNotice({ type: 'error', message: 'Selected Product Family could not be found.' })
            }
          } else {
            setActionNotice({ type: 'error', message: 'Selected Product Family could not be found.' })
          }
        } else if (params.get('new') === 'true') {
          handleOpenAdd()
        }
      }
    })
  }, [])

  // Helper to get image URL
  const getProductCoverImage = (product: AdminProduct): string => {
    if (product.images && product.images.length > 0) {
      const first = product.images[0]
      if (typeof first === 'string') return first
      if ('image_url' in first) return first.image_url
    }
    return '/placeholder.jpg'
  }

  // Filtered Products
  const filteredProducts = useMemo(() => {
    let result = products

    if (viewTab === 'active') {
      result = result.filter(p => p.is_active !== false && (p.status === 'active' || p.status === 'published' || !p.status))
    } else if (viewTab === 'draft') {
      result = result.filter(p => p.status === 'draft' || (p.is_active === false && p.status !== 'inactive' && p.status !== 'archived'))
    } else if (viewTab === 'inactive') {
      result = result.filter(p => p.status === 'inactive')
    } else if (viewTab === 'archived') {
      result = result.filter(p => p.status === 'inactive' || p.status === 'archived')
    } else if (viewTab === 'grouped') {
      result = result.filter(p => !!p.product_family_id)
    } else if (viewTab === 'ungrouped') {
      result = result.filter(p => !p.product_family_id || !productFamilies.some(f => f.id === p.product_family_id))
    } else if (viewTab === 'low_stock') {
      result = result.filter(p => (p.stock_quantity ?? 0) > 0 && (p.stock_quantity ?? 0) <= 5)
    } else if (viewTab === 'out_of_stock') {
      result = result.filter(p => (p.stock_quantity ?? 0) === 0)
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      result = result.filter(p =>
        (p.title || '').toLowerCase().includes(q) ||
        (p.sku || '').toLowerCase().includes(q) ||
        (p.categoryName || '').toLowerCase().includes(q)
      )
    }

    return result
  }, [products, viewTab, searchQuery])

  // Grouped Product Families Data
  const groupedFamilies = useMemo(() => {
    const familyMap = new Map<string, { family: ProductFamily; colourways: AdminProduct[] }>()

    for (const p of filteredProducts) {
      if (p.product_family_id) {
        const fam = productFamilies.find(f => f.id === p.product_family_id)
        if (fam) {
          if (!familyMap.has(fam.id)) {
            familyMap.set(fam.id, { family: fam, colourways: [] })
          }
          familyMap.get(fam.id)!.colourways.push(p)
        }
      }
    }

    return Array.from(familyMap.values())
  }, [filteredProducts, productFamilies])

  const toggleFamilyExpand = (id: string) => {
    setExpandedFamilyIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleOpenAdd = () => {
    setEditingProduct(null)
    setInitialStep(1)
    setIsFormOpen(true)
  }

  const handleOpenEdit = (product: AdminProduct, step: number = 1) => {
    setEditingProduct(product)
    setInitialStep(step)
    setIsFormOpen(true)
  }

  const handleDeleteProduct = async (product: AdminProduct) => {
    if (!confirm(`Are you sure you want to delete product "${product.title}"?`)) return
    const res = await deleteProductAction(product.id)
    if (res.error) {
      alert(res.error)
    } else {
      loadData()
    }
  }

  const handleDuplicateColourway = async (product: AdminProduct) => {
    const colorNamePrompt = prompt('Enter target colour name for new colourway (e.g. Royal Blue):')
    if (!colorNamePrompt) return

    const res = await duplicateProductAsColourwayAction(
      product.id,
      product.primary_color_id || '',
      colorNamePrompt,
      `${product.title} - ${colorNamePrompt}`,
      `${product.sku}-${colorNamePrompt.substring(0, 3).toUpperCase()}`,
      false
    )
    if (res.error) {
      alert(res.error)
    } else {
      loadData()
    }
  }

  const handleSaveProduct = async (values: ProductFormValues, isPublishing: boolean) => {
    setIsSubmitting(true)
    try {
      const payload: any = {
        ...values,
        is_active: isPublishing ? true : values.is_active
      }

      const categoryObj = categories.find(c => c.id === values.category_id)
      const categoryName = categoryObj?.name || 'Kurtis'

      let res: any
      if (editingProduct) {
        res = await updateProductAction(editingProduct.id, payload, categoryName)
      } else {
        res = await createProductAction(payload, categoryName)
      }

      if (res.error) {
        setIsSubmitting(false)
        return { success: false, error: res.error }
      }

      setIsFormOpen(false)
      await loadData()
      setIsSubmitting(false)
      return { success: true }
    } catch (err: any) {
      setIsSubmitting(false)
      return { success: false, error: err.message || 'Save failed.' }
    }
  }

  const handleExportCSV = () => {
    if (filteredProducts.length === 0) return
    const headers = ['ID', 'Title', 'SKU', 'Category', 'Price', 'MRP', 'Stock', 'Status']
    const csvRows = [
      headers.join(','),
      ...filteredProducts.map(p =>
        [
          `"${p.id}"`,
          `"${(p.title || '').replace(/"/g, '""')}"`,
          `"${p.sku}"`,
          `"${p.categoryName || ''}"`,
          p.sellingPrice,
          p.mrp,
          p.stock_quantity ?? 0,
          p.is_active !== false ? 'Active' : 'Draft'
        ].join(',')
      )
    ]
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `shreengar-products-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      {/* 1. Page Header */}
      <AdminPageHeader
        title="Products"
        description="Manage products, colourways, variants, stock and publishing status."
        actions={
          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={handleExportCSV}
              disabled={filteredProducts.length === 0}
              className={`inline-flex items-center space-x-1.5 px-3 py-2 text-xs font-semibold rounded-xl border transition-colors ${
                filteredProducts.length > 0
                  ? 'text-gray-700 bg-white border-gray-200 hover:bg-gray-50 cursor-pointer'
                  : 'text-gray-400 bg-gray-100 border-gray-200 cursor-not-allowed'
              }`}
              title={filteredProducts.length > 0 ? 'Export products to CSV' : 'Export — Coming Soon'}
            >
              <Download className="w-3.5 h-3.5" />
              <span>{filteredProducts.length > 0 ? 'Export CSV' : 'Export — Coming Soon'}</span>
            </button>
            <Button
              onClick={handleOpenAdd}
              className="bg-[#5C0B26] hover:bg-[#8C3A57] text-[#FAF8F5] text-xs px-4 py-2 rounded-xl flex items-center space-x-1.5 shadow-sm"
            >
              <Plus className="w-4 h-4 text-[#D4AF37]" />
              <span>Add Product</span>
            </Button>
          </div>
        }
      />

      {/* Action feedback banner */}
      {actionNotice && (
        <div className={`p-3 rounded-xl border text-xs flex items-center justify-between font-semibold ${
          actionNotice.type === 'error'
            ? 'bg-rose-50 border-rose-200 text-rose-700'
            : actionNotice.type === 'info'
            ? 'bg-amber-50 border-amber-200 text-amber-800'
            : 'bg-emerald-50 border-emerald-200 text-emerald-800'
        }`}>
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>{actionNotice.message}</span>
          </div>
          <button type="button" onClick={() => setActionNotice(null)} className="text-gray-400 hover:text-gray-600">
            &times;
          </button>
        </div>
      )}

      {/* 2. Filter Tabs & Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs space-y-4">
        <div className="flex items-center space-x-1 border-b border-gray-100 pb-3 overflow-x-auto text-xs">
          {[
            { id: 'all', label: 'All Products' },
            { id: 'grouped', label: 'Grouped by Product Family' },
            { id: 'ungrouped', label: 'Ungrouped' },
            { id: 'active', label: 'Active' },
            { id: 'draft', label: 'Draft' },
            { id: 'inactive', label: 'Inactive' },
            { id: 'archived', label: 'Archived' },
            { id: 'low_stock', label: 'Low Stock' },
            { id: 'out_of_stock', label: 'Out of Stock' },
          ].map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setViewTab(tab.id as any)}
              className={`px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap transition-all cursor-pointer ${
                viewTab === tab.id
                  ? 'bg-[#5C0B26] text-white shadow-xs'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search product title, SKU, or category..."
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-[#5C0B26] focus:outline-none"
          />
        </div>
      </div>

      {/* 3. Product Content Section */}
      {isLoading ? (
        <TableSkeleton rows={8} />
      ) : isFormOpen ? (
        <ProductForm
          initialProduct={editingProduct}
          categories={categories}
          collections={collections}
          productFamilies={productFamilies}
          colors={colors}
          sizes={sizes}
          preselectedFamilyId={preselectedFamilyId}
          initialStep={initialStep}
          onSave={handleSaveProduct}
          onCancel={() => setIsFormOpen(false)}
          isSubmitting={isSubmitting}
          isFamiliesLoading={isFamiliesLoading}
          familiesError={familiesError}
          onRetryFamilies={loadFamiliesData}
        />
      ) : fetchError ? (
        <div className="bg-rose-50 border border-rose-200 p-6 rounded-2xl text-center space-y-3">
          <AlertTriangle className="w-8 h-8 text-rose-600 mx-auto" />
          <h3 className="font-serif font-bold text-sm text-rose-900">Unable to load products</h3>
          <p className="text-xs text-rose-700">{fetchError}</p>
          <Button onClick={loadData} className="bg-rose-700 text-white text-xs">
            <RefreshCw className="w-3.5 h-3.5 mr-1" />
            Retry
          </Button>
        </div>
      ) : filteredProducts.length === 0 ? (
        <EmptyState
          title="No Products Found"
          description="Create your first ethnic garment or adjust active filters."
          action={
            <Button onClick={handleOpenAdd} className="bg-[#5C0B26] text-white text-xs">
              Add Product
            </Button>
          }
        />
      ) : viewTab === 'grouped' ? (
        isMigrationPending || productFamilies.length === 0 ? (
          <div className="bg-amber-50 border border-amber-200 p-6 rounded-2xl text-center space-y-2 text-amber-900">
            <Info className="w-6 h-6 text-amber-600 mx-auto" />
            <h4 className="font-bold text-sm">Product Family Feature Pending Migration</h4>
            <p className="text-xs text-amber-700">
              Apply the product-family migration to use the grouped colourway view. Standard product management remains active under All Products.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {groupedFamilies.map(({ family, colourways }) => {
              const isExpanded = expandedFamilyIds.has(family.id)
              const activeCount = colourways.filter(c => c.is_active !== false).length
              const totalStock = colourways.reduce((acc, c) => acc + (c.stock_quantity ?? 0), 0)

              return (
                <div key={family.id} className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-2xs">
                  <div
                    onClick={() => toggleFamilyExpand(family.id)}
                    className="bg-[#FAF8F5] p-4 border-b border-gray-200 flex items-center justify-between cursor-pointer hover:bg-[#F5F0EB] transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      {isExpanded ? <ChevronDown className="w-4 h-4 text-[#5C0B26]" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
                      <div>
                        <h4 className="font-serif font-bold text-sm text-[#2B1A1F] flex items-center space-x-2">
                          <span>{family.name}</span>
                          <span className="bg-[#5C0B26]/10 text-[#5C0B26] text-[10px] font-bold px-2 py-0.5 rounded-full">
                            {colourways.length} Colourway(s)
                          </span>
                        </h4>
                        <p className="text-[11px] text-gray-500">
                          {activeCount} Active • {totalStock} Total Stock
                        </p>
                      </div>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="divide-y divide-gray-100 p-2">
                      {colourways.map(c => (
                        <div key={c.id} className="p-3 flex items-center justify-between hover:bg-amber-50/20 text-xs">
                          <div className="flex items-center space-x-3">
                            <Image src={getProductCoverImage(c)} alt={c.title} width={36} height={36} className="w-9 h-9 object-cover rounded-lg border border-gray-200" />
                            <div>
                              <span className="font-bold text-gray-900">{c.title}</span>
                              <span className="font-mono text-gray-500 text-[10px] block">SKU: {c.sku}</span>
                            </div>
                          </div>

                          <div className="flex items-center space-x-4">
                            <span className="font-bold text-gray-800">{formatINR(c.sellingPrice || 0)}</span>
                            <StatusBadge status={(c.status || (c.is_active !== false ? 'active' : 'draft')) as any} />
                            <button onClick={() => handleOpenEdit(c)} className="p-1 text-[#5C0B26] hover:bg-gray-100 rounded">
                              <Edit className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )
      ) : (
        <>
          {/* Desktop Product Table */}
          <div className="hidden md:block bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#FAF8F5] border-b border-gray-200 font-serif font-bold text-[#2B1A1F]">
                <tr>
                  <th className="p-4 w-4/12">Product & SKU</th>
                  <th className="p-4">Category</th>
                  <th className="p-4">Family</th>
                  <th className="p-4">Price</th>
                  <th className="p-4 text-center">Stock</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredProducts.map(product => (
                  <tr key={product.id} className="hover:bg-amber-50/30 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center space-x-3">
                        <Image
                          src={getProductCoverImage(product)}
                          alt={product.title || 'Product'}
                          width={40}
                          height={40}
                          className="w-10 h-10 object-cover rounded-xl border border-gray-200 flex-shrink-0"
                        />
                        <div>
                          <h4 className="font-bold text-gray-900 text-xs">{product.title}</h4>
                          <span className="font-mono text-[10px] text-gray-500">SKU: {product.sku}</span>
                        </div>
                      </div>
                    </td>

                    <td className="p-4 font-medium text-gray-700">
                      {product.categoryName || 'Unassigned'}
                    </td>

                    <td className="p-4">
                      {!product.product_family_id ? (
                        <span className="text-gray-400 font-mono text-[10px]">Ungrouped</span>
                      ) : product.family_name ? (
                        <span className="bg-[#5C0B26]/10 text-[#5C0B26] text-[10px] font-bold px-2 py-0.5 rounded-full">
                          {product.family_name}
                        </span>
                      ) : (
                        <span className="bg-red-50 text-red-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                          Missing Product Family
                        </span>
                      )}
                    </td>

                    <td className="p-4">
                      <div className="space-y-0.5">
                        <span className="font-bold text-gray-900 block">{formatINR(product.sellingPrice || 0)}</span>
                        {product.mrp && product.mrp > product.sellingPrice ? (
                          <span className="text-[10px] text-gray-400 line-through block">{formatINR(product.mrp)}</span>
                        ) : null}
                      </div>
                    </td>

                    <td className="p-4 text-center">
                      <span className={`font-bold ${(product.stock_quantity ?? 0) <= 5 ? 'text-rose-600' : 'text-emerald-700'}`}>
                        {product.stock_quantity ?? 0} units
                      </span>
                    </td>

                    <td className="p-4">
                      <StatusBadge status={(product.status || (product.is_active !== false ? 'published' : 'draft')) as any} />
                    </td>

                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          type="button"
                          onClick={() => handleDuplicateColourway(product)}
                          className="p-1.5 text-[#5C0B26] hover:bg-[#5C0B26]/10 rounded-lg transition-colors"
                          title="Duplicate as New Colourway"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(product, 6)}
                          className="p-1.5 text-gray-600 hover:text-[#5C0B26] hover:bg-gray-100 rounded-lg transition-colors"
                          title="Manage Stock"
                        >
                          <Warehouse className="w-4 h-4 text-[#D4AF37]" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(product)}
                          className="p-1.5 text-gray-600 hover:text-[#5C0B26] hover:bg-gray-100 rounded-lg transition-colors"
                          title="Edit Product"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteProduct(product)}
                          className="p-1.5 text-gray-400 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Delete Product"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card Grid (< 768px) */}
          <div className="md:hidden space-y-3">
            {filteredProducts.map(product => (
              <div key={product.id} className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <Image
                      src={getProductCoverImage(product)}
                      alt={product.title || 'Product'}
                      width={48}
                      height={48}
                      className="w-12 h-12 object-cover rounded-xl border border-gray-200"
                    />
                    <div>
                      <h4 className="font-bold text-sm text-gray-900">{product.title}</h4>
                      <p className="text-[11px] text-gray-500 font-mono">SKU: {product.sku}</p>
                    </div>
                  </div>
                  <StatusBadge status={(product.status || (product.is_active !== false ? 'active' : 'draft')) as any} />
                </div>

                <div className="flex items-center justify-between text-xs bg-gray-50 p-2.5 rounded-lg">
                  <div>
                    <span className="text-gray-500 block text-[10px]">Price</span>
                    <span className="font-bold text-gray-900">{formatINR(product.sellingPrice || 0)}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block text-[10px]">Stock</span>
                    <span className="font-bold text-emerald-700">{product.stock_quantity ?? 0} units</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block text-[10px]">Category</span>
                    <span className="font-semibold text-gray-800">{product.categoryName || 'Unassigned'}</span>
                  </div>
                </div>

                <div className="flex items-center justify-end space-x-3 pt-1 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => handleOpenEdit(product, 6)}
                    className="flex items-center space-x-1 min-h-[44px] px-3 py-2 text-xs font-semibold text-[#5C0B26] bg-[#5C0B26]/5 rounded-xl cursor-pointer"
                  >
                    <Warehouse className="w-3.5 h-3.5 text-[#D4AF37]" />
                    <span>Stock</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleOpenEdit(product)}
                    className="flex items-center space-x-1 min-h-[44px] px-3 py-2 text-xs font-semibold text-[#5C0B26] bg-[#5C0B26]/5 rounded-xl cursor-pointer"
                  >
                    <Edit className="w-3.5 h-3.5" />
                    <span>Edit</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteProduct(product)}
                    className="flex items-center space-x-1 min-h-[44px] px-3 py-2 text-xs font-semibold text-rose-700 bg-rose-50 rounded-xl cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
