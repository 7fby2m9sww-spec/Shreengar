'use client'

import React, { useEffect, useState, use } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  AdminPageHeader,
  EmptyState,
  TableSkeleton,
  StatusBadge,
} from '@/components/admin/AdminUI'
import { DataTable, Column } from '@/components/ui/DataTable'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { ArrowLeft, Plus, Edit, Store, Package, Star, Eye } from 'lucide-react'
import {
  getCategoryDetailsAction,
  getCategoryProductsAction,
  updateCategoryAction,
  getCategoriesAction
} from '@/actions/catalog/actions'
import { uploadCategoryImageAction } from '@/actions/admin/uploadCategoryImageAction'
import { Category, AdminProduct } from '@/types/database'
import { formatINR } from '@/lib/utils'

export default function CategoryDetailsPage({
  params: paramsPromise,
}: {
  params: Promise<{ id: string }>
}) {
  const params = use(paramsPromise)
  const router = useRouter()
  const categoryId = params.id

  const [category, setCategory] = useState<Category | null>(null)
  const [products, setProducts] = useState<AdminProduct[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editName, setEditName] = useState('')
  const [editSlug, setEditSlug] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editDisplayOrder, setEditDisplayOrder] = useState('0')
  const [editIsActive, setEditIsActive] = useState(true)
  const [editParentId, setEditParentId] = useState('')
  const [editImageUrl, setEditImageUrl] = useState('')
  const [availableCategories, setAvailableCategories] = useState<Category[]>([])

  // Image Upload State
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

  const loadData = async () => {
    setIsLoading(true)
    setErrorMsg(null)
    try {
      const catRes = await getCategoryDetailsAction(categoryId)
      if (catRes.error) {
        setErrorMsg(catRes.error)
      } else if (catRes.data) {
        setCategory(catRes.data)
        
        // Load filtered products
        const prodRes = await getCategoryProductsAction(categoryId)
        if (prodRes.error) {
          setErrorMsg(prodRes.error)
        } else if (prodRes.data) {
          setProducts(prodRes.data)
        }
      }

      // Load parents for selector
      const allCatsRes = await getCategoriesAction()
      if (allCatsRes.data) {
        setAvailableCategories(allCatsRes.data.filter((c: Category) => c.id !== categoryId))
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load category details.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [categoryId])

  const handleOpenEdit = () => {
    if (!category) return
    setEditName(category.name)
    setEditSlug(category.slug)
    setEditDescription(category.description || '')
    setEditDisplayOrder(category.display_order?.toString() ?? '0')
    setEditIsActive(category.is_active !== false)
    setEditParentId(category.parent_id || '')
    setEditImageUrl(category.image_url || '')
    setIsEditModalOpen(true)
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploading(true)
    setUploadError(null)

    const formData = new FormData()
    formData.append('file', file)

    const res = await uploadCategoryImageAction(formData)
    setIsUploading(false)

    if (res.success && res.url) {
      setEditImageUrl(res.url)
    } else {
      setUploadError(res.error || 'Failed to upload image.')
    }
  }

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!category) return

    const res = await updateCategoryAction(category.id, {
      name: editName,
      slug: editSlug,
      description: editDescription,
      display_order: Number(editDisplayOrder),
      is_active: editIsActive,
      parent_id: editParentId || null,
      image_url: editImageUrl || null,
    })

    if (res.error) {
      alert(res.error)
    } else {
      setIsEditModalOpen(false)
      loadData()
    }
  }

  const columns: Column<AdminProduct>[] = [
    {
      header: 'Product Details',
      accessor: (row) => (
        <div className="flex items-center space-x-3">
          {row.images && row.images[0] ? (
            <Image
              src={row.images[0].image_url}
              alt={row.title}
              width={40}
              height={48}
              className="w-10 h-12 object-cover rounded-lg border border-[#5C0B26]/10"
            />
          ) : (
            <div className="w-10 h-12 bg-amber-500/10 border border-[#5C0B26]/10 rounded-lg flex items-center justify-center text-[10px] font-bold text-[#5C0B26]">
              No Img
            </div>
          )}
          <div>
            <h4 className="font-serif font-bold text-xs text-[#2B1A1F] line-clamp-1">{row.title}</h4>
            <span className="font-mono text-[9px] text-[#7A6B70]">{row.sku}</span>
          </div>
        </div>
      ),
    },
    {
      header: 'Price',
      accessor: (row) => (
        <div className="flex flex-col">
          <span className="font-bold text-[#2B1A1F] text-xs">{formatINR(row.sellingPrice)}</span>
          {row.mrp && row.mrp > row.sellingPrice && (
            <span className="text-[9px] text-[#7A6B70] line-through">
              {formatINR(row.mrp)}
            </span>
          )}
        </div>
      ),
    },
    {
      header: 'Stock',
      accessor: (row) => (
        <span className="font-semibold text-xs text-[#2B1A1F]">
          {row.stock_quantity ?? 0} units
        </span>
      ),
    },
    {
      header: 'Status',
      accessor: (row) => <StatusBadge status={row.is_active ? 'active' : 'inactive'} />,
    },
  ]

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-rose-950/10 rounded w-1/3 animate-pulse" />
        <TableSkeleton rows={4} />
      </div>
    )
  }

  if (errorMsg || !category) {
    return (
      <EmptyState
        title="Category Not Found"
        description={errorMsg || 'The category you are looking for does not exist or was deleted.'}
        icon={ArrowLeft}
        action={
          <Button onClick={() => router.push('/admin/categories')} variant="outline">
            Back to Categories
          </Button>
        }
      />
    )
  }

  return (
    <div className="space-y-6">
      {/* Header back button */}
      <div className="flex items-center space-x-2">
        <Link
          href="/admin/categories"
          className="p-2 hover:bg-[#5C0B26]/5 rounded-lg text-[#8C3A57] transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
          Catalog / Categories
        </span>
      </div>

      {/* Main Info Card */}
      <div className="bg-white dark:bg-[#211318] p-6 rounded-2xl border border-[#5C0B26]/10 dark:border-[#70424E] shadow-sm flex flex-col md:flex-row gap-6 items-start">
        {category.image_url ? (
          <div className="relative w-32 h-32 rounded-xl overflow-hidden border border-[#5C0B26]/10 shadow-inner flex-shrink-0">
            <Image
              src={category.image_url}
              alt={category.name}
              fill
              className="object-cover"
            />
          </div>
        ) : (
          <div className="w-32 h-32 bg-amber-500/10 border border-[#5C0B26]/10 rounded-xl flex items-center justify-center text-3xl font-bold text-[#5C0B26] flex-shrink-0 font-serif">
            {category.name.charAt(0)}
          </div>
        )}

        <div className="flex-1 space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#2B1A1F] dark:text-[#FFF4DC]">
              {category.name}
            </h1>
            <StatusBadge status={category.is_active !== false ? 'active' : 'inactive'} />
          </div>

          <p className="text-sm text-[#7A6B70] leading-relaxed max-w-2xl">
            {category.description || 'No description provided for this category.'}
          </p>

          <div className="flex flex-wrap gap-4 text-xs font-medium text-muted-foreground pt-2">
            <span>Slug: <code className="bg-[#5C0B26]/5 dark:bg-[#5C0B26]/20 px-2 py-0.5 rounded text-[#8C3A57]">/category/{category.slug}</code></span>
            <span>Display Order: <strong className="text-foreground">{category.display_order ?? 0}</strong></span>
            <span>Total Products: <strong className="text-foreground">{(category as any).product_count ?? 0}</strong></span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 self-stretch md:self-auto justify-end">
          <Button onClick={handleOpenEdit} variant="outline" className="border-[#5C0B26]/20 text-[#8C3A57] hover:bg-[#5C0B26]/5">
            <Edit className="w-4 h-4 mr-1.5" /> Edit Category
          </Button>
          <Link href={`/admin/products/new?category=${category.id}`}>
            <Button variant="primary" className="bg-[#5C0B26] hover:bg-[#8C3A57] w-full">
              <Plus className="w-4 h-4 mr-1.5 text-[#D4AF37]" /> Add Product
            </Button>
          </Link>
        </div>
      </div>

      {/* Filtered Products Table */}
      <div className="space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-[#5C0B26]/10">
          <h2 className="font-serif text-lg font-bold text-[#2B1A1F] dark:text-[#FFF4DC]">
            Products in &ldquo;{category.name}&rdquo; ({(category as any).product_count ?? 0})
          </h2>
        </div>

        {products.length === 0 ? (
          <EmptyState
            title="No Products in Category"
            description="Assigned products will appear in this list."
            icon={Package}
            action={
              <Link href={`/admin/products/new?category=${category.id}`}>
                <Button variant="primary" className="bg-[#5C0B26]">
                  <Plus className="w-4 h-4 mr-1.5 text-[#D4AF37]" /> Add First Product
                </Button>
              </Link>
            }
          />
        ) : (
          <div className="bg-white rounded-2xl border border-[#5C0B26]/10 shadow-sm overflow-hidden p-2 dark:bg-[#211318] dark:border-[#70424E]">
            <DataTable
              columns={columns}
              data={products}
              actions={(row) => (
                <div className="flex items-center justify-end space-x-1">
                  <Link
                    href={`/admin/products?edit=${row.id}`}
                    className="p-1.5 text-[#8C3A57] hover:bg-[#5C0B26]/5 rounded-lg transition-colors"
                    title="Edit Product"
                  >
                    <Edit className="w-4 h-4" />
                  </Link>
                  <Link
                    href={`/product/${row.id}`}
                    target="_blank"
                    className="p-1.5 text-[#D4AF37] hover:bg-amber-50 rounded-lg transition-colors"
                    title="View Storefront"
                  >
                    <Eye className="w-4 h-4" />
                  </Link>
                </div>
              )}
            />
          </div>
        )}
      </div>

      {/* Edit Category Modal */}
      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Edit Category Details">
        <form onSubmit={handleUpdate} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Category Name"
              value={editName}
              onChange={e => {
                setEditName(e.target.value)
                setEditSlug(e.target.value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''))
              }}
              required
            />
            <Input
              label="Slug (URL-safe)"
              value={editSlug}
              onChange={e => setEditSlug(e.target.value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''))}
              required
            />
          </div>

          <div className="flex flex-col space-y-1">
            <label className="text-xs font-semibold text-muted-foreground mb-1">Description</label>
            <textarea
              value={editDescription}
              onChange={e => setEditDescription(e.target.value)}
              className="w-full px-3 py-2 border border-rose-900/15 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-rose-900 min-h-[80px]"
              placeholder="Provide a brief overview of category catalog items..."
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Display Order"
              type="number"
              value={editDisplayOrder}
              onChange={e => setEditDisplayOrder(e.target.value)}
              min="0"
              required
            />
            <div className="flex flex-col space-y-1">
              <label className="text-xs font-semibold text-muted-foreground mb-1">Parent Category</label>
              <select
                value={editParentId}
                onChange={e => setEditParentId(e.target.value)}
                className="w-full px-3 py-2 border border-rose-900/15 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-rose-900 h-[38px]"
              >
                <option value="">None (Top Level)</option>
                {availableCategories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-col space-y-2 border-t border-[#5C0B26]/10 pt-3">
            <label className="text-xs font-semibold text-muted-foreground">Category Image</label>
            <div className="flex items-center space-x-4">
              {editImageUrl && (
                <div className="relative w-16 h-16 rounded-lg overflow-hidden border border-[#5C0B26]/10 flex-shrink-0">
                  <Image
                    src={editImageUrl}
                    alt="Category Upload"
                    fill
                    className="object-cover"
                  />
                </div>
              )}
              <div className="flex-1">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  disabled={isUploading}
                  className="text-xs text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-[#5C0B26]/10 file:text-[#8C3A57] hover:file:bg-[#5C0B26]/20 cursor-pointer"
                />
                {isUploading && <span className="text-[10px] text-amber-600 block mt-1">Uploading secure storage object...</span>}
                {uploadError && <span className="text-[10px] text-rose-600 block mt-1">{uploadError}</span>}
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2 pt-2">
            <input
              type="checkbox"
              id="editIsActive"
              checked={editIsActive}
              onChange={e => setEditIsActive(e.target.checked)}
              className="rounded border-[#5C0B26]/20 text-[#8C3A57] focus:ring-[#8C3A57]"
            />
            <label htmlFor="editIsActive" className="text-xs font-semibold text-foreground cursor-pointer">
              Active Category (visible on Storefront)
            </label>
          </div>

          <div className="flex justify-end space-x-2 pt-4 border-t border-[#5C0B26]/10">
            <Button variant="outline" type="button" onClick={() => setIsEditModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" className="bg-[#5C0B26]">
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
