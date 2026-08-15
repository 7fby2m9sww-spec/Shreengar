'use client'

import React, { useEffect, useState, useMemo } from 'react'
import Image from 'next/image'
import Link from 'next/link'
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
import { Plus, Edit, Trash2, Sparkles, Upload, Loader2, Link2, Settings, HelpCircle, Layers, Check, Search, X } from 'lucide-react'
import {
  getAdminCollectionsAction,
  createCollectionAction,
  updateCollectionAction,
  deleteCollectionAction,
  getCollectionProductsForAdminAction,
  updateCollectionProductAssignmentsAction,
  getPaginatedProductsAction
} from '@/actions/catalog/actions'
import { uploadCollectionImageAction } from '@/actions/admin/uploadCollectionImageAction'
import { Collection } from '@/types/database'

export default function AdminCollectionsPage() {
  const [collections, setCollections] = useState<Collection[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  // Create modal states
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [colName, setColName] = useState('')
  const [colDescription, setColDescription] = useState('')
  const [colImageUrl, setColImageUrl] = useState('')
  const [colStatus, setColStatus] = useState<'draft' | 'published' | 'archived'>('draft')
  const [colIsFeatured, setColIsFeatured] = useState(false)
  const [colSortOrder, setColSortOrder] = useState('0')
  const [colSeoTitle, setColSeoTitle] = useState('')
  const [colSeoDescription, setColSeoDescription] = useState('')
  const [isUploadingCreate, setIsUploadingCreate] = useState(false)
  const [uploadErrorCreate, setUploadErrorCreate] = useState<string | null>(null)
  const [isCreating, setIsCreating] = useState(false)

  // Edit modal states
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editingCollection, setEditingCollection] = useState<Collection | null>(null)
  const [activeTab, setActiveTab] = useState<'general' | 'seo' | 'products'>('general')

  // Edit Form Fields
  const [editName, setEditName] = useState('')
  const [editSlug, setEditSlug] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editImageUrl, setEditImageUrl] = useState('')
  const [editStatus, setEditStatus] = useState<'draft' | 'published' | 'archived'>('draft')
  const [editIsFeatured, setEditIsFeatured] = useState(false)
  const [editSortOrder, setEditSortOrder] = useState('0')
  const [editSeoTitle, setEditSeoTitle] = useState('')
  const [editSeoDescription, setEditSeoDescription] = useState('')
  const [isUploadingEdit, setIsUploadingEdit] = useState(false)
  const [uploadErrorEdit, setUploadErrorEdit] = useState<string | null>(null)
  const [isUpdating, setIsUpdating] = useState(false)

  // Product Assignment State
  const [allProducts, setAllProducts] = useState<any[]>([])
  const [assignedProducts, setAssignedProducts] = useState<any[]>([])
  const [isProductLoading, setIsProductLoading] = useState(false)
  const [productSearch, setProductSearch] = useState('')
  const [isAssigning, setIsAssigning] = useState(false)

  const loadCollections = async () => {
    setIsLoading(true)
    const res = await getAdminCollectionsAction()
    if (res.data) {
      setCollections(res.data)
    }
    setIsLoading(false)
  }

  useEffect(() => {
    loadCollections()
  }, [])

  // Fetch all products once for assignment checklist
  const loadAllProducts = async () => {
    setIsProductLoading(true)
    const res = await getPaginatedProductsAction({ isAdmin: true, pageSize: 200 })
    if ('products' in res && res.products) {
      setAllProducts(res.products)
    }
    setIsProductLoading(false)
  }

  useEffect(() => {
    if (isEditModalOpen) {
      loadAllProducts()
    }
  }, [isEditModalOpen])

  // Handle image upload for Create
  const handleCreateImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setIsUploadingCreate(true)
    setUploadErrorCreate(null)

    const formData = new FormData()
    formData.append('file', file)

    const res = await uploadCollectionImageAction(formData)
    setIsUploadingCreate(false)

    if (res.success && res.url) {
      setColImageUrl(res.url)
    } else {
      setUploadErrorCreate(res.error || 'Upload failed.')
    }
  }

  // Handle image upload for Edit
  const handleEditImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setIsUploadingEdit(true)
    setUploadErrorEdit(null)

    const formData = new FormData()
    formData.append('file', file)

    const res = await uploadCollectionImageAction(formData)
    setIsUploadingEdit(false)

    if (res.success && res.url) {
      setEditImageUrl(res.url)
    } else {
      setUploadErrorEdit(res.error || 'Upload failed.')
    }
  }

  const handleAddCollection = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsCreating(true)

    const res = await createCollectionAction({
      name: colName,
      description: colDescription || null,
      image_url: colImageUrl || null,
      is_featured: colIsFeatured,
      status: colStatus,
      sort_order: Number(colSortOrder) || 0,
      seo_title: colSeoTitle || null,
      seo_description: colSeoDescription || null
    })

    setIsCreating(false)

    if (res.error) {
      alert(res.error)
    } else if (res.success) {
      setIsModalOpen(false)
      // Reset fields
      setColName('')
      setColDescription('')
      setColImageUrl('')
      setColStatus('draft')
      setColIsFeatured(false)
      setColSortOrder('0')
      setColSeoTitle('')
      setColSeoDescription('')
      loadCollections()
    }
  }

  const handleOpenEditModal = async (collection: Collection) => {
    setEditingCollection(collection)
    setEditName(collection.name)
    setEditSlug(collection.slug)
    setEditDescription(collection.description || '')
    setEditImageUrl(collection.image_url || '')
    setEditStatus(collection.status)
    setEditIsFeatured(collection.is_featured)
    setEditSortOrder(String(collection.sort_order || 0))
    setEditSeoTitle(collection.seo_title || '')
    setEditSeoDescription(collection.seo_description || '')
    setActiveTab('general')
    setAssignedProducts([])

    // Load assigned products
    const res = await getCollectionProductsForAdminAction(collection.id)
    if (res.data) {
      setAssignedProducts(res.data)
    }

    setIsEditModalOpen(true)
  }

  const handleUpdateCollection = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingCollection) return
    setIsUpdating(true)

    const res = await updateCollectionAction(editingCollection.id, {
      name: editName,
      slug: editSlug,
      description: editDescription || null,
      image_url: editImageUrl || null,
      is_featured: editIsFeatured,
      status: editStatus,
      sort_order: Number(editSortOrder) || 0,
      seo_title: editSeoTitle || null,
      seo_description: editSeoDescription || null
    })

    setIsUpdating(false)

    if (res.error) {
      alert(res.error)
    } else if (res.success) {
      setIsEditModalOpen(false)
      setEditingCollection(null)
      loadCollections()
    }
  }

  const handleDeleteCollection = async (id: string) => {
    if (confirm('Are you sure you want to delete this collection? This action cannot be undone.')) {
      const res = await deleteCollectionAction(id)
      if (res.error) {
        alert(res.error)
      } else {
        loadCollections()
      }
    }
  }

  // Toggle product assignment
  const handleToggleProduct = (productId: string) => {
    const exists = assignedProducts.some(p => p.id === productId)
    if (exists) {
      setAssignedProducts(assignedProducts.filter(p => p.id !== productId))
    } else {
      const prod = allProducts.find(p => p.id === productId)
      if (prod) {
        // Find next max sort order
        const maxOrder = assignedProducts.reduce((max, p) => Math.max(max, p.sort_order || 0), 0)
        setAssignedProducts([...assignedProducts, { ...prod, sort_order: maxOrder + 1 }])
      }
    }
  }

  // Update order of assigned product
  const handleUpdateProductSort = (productId: string, orderVal: string) => {
    const parsed = parseInt(orderVal) || 0
    setAssignedProducts(assignedProducts.map(p => p.id === productId ? { ...p, sort_order: parsed } : p))
  }

  // Save product assignments
  const handleSaveAssignments = async () => {
    if (!editingCollection) return
    setIsAssigning(true)

    const payload = assignedProducts.map((p, idx) => ({
      product_id: p.id,
      sort_order: p.sort_order !== undefined ? p.sort_order : idx
    }))

    const res = await updateCollectionProductAssignmentsAction(editingCollection.id, payload)
    setIsAssigning(false)

    if (res.error) {
      alert(res.error)
    } else {
      alert('Product assignments updated successfully!')
      loadCollections()
    }
  }

  // Filtered available products to assign
  const filteredProducts = useMemo(() => {
    return allProducts.filter(p =>
      p.title?.toLowerCase().includes(productSearch.toLowerCase())
    )
  }, [allProducts, productSearch])

  const columns: Column<Collection>[] = [
    {
      header: 'Collection Title',
      accessor: (row) => (
        <div className="flex items-center space-x-3">
          {row.image_url ? (
            <Image
              src={row.image_url}
              alt={row.name}
              width={40}
              height={40}
              className="w-10 h-10 object-cover rounded-xl border border-[#5C0B26]/10"
            />
          ) : (
            <div className="w-10 h-10 bg-[#5C0B26]/5 border border-[#5C0B26]/10 rounded-xl flex items-center justify-center font-bold text-xs text-[#5C0B26] dark:text-[#FFF4DC]">
              {row.name.charAt(0)}
            </div>
          )}
          <div>
            <div className="flex items-center space-x-1.5">
              <h4 className="font-serif font-bold text-xs text-[#2B1A1F] dark:text-[#FFF4DC]">{row.name}</h4>
              {row.is_featured && (
                <span className="inline-flex items-center px-1.5 py-0.2 rounded-full text-[8px] font-bold bg-amber-500/10 text-amber-900 dark:text-amber-400 border border-amber-500/20">
                  Featured
                </span>
              )}
            </div>
            <span className="font-mono text-[9px] text-[#7A6B70] dark:text-[#D7C0B5]">/collection/{row.slug}</span>
          </div>
        </div>
      ),
    },
    {
      header: 'Products',
      accessor: (row) => (
        <span className="text-xs font-semibold text-[#2B1A1F] dark:text-[#FFF4DC]">
          {row.product_count ?? 0} Designs
        </span>
      ),
    },
    {
      header: 'Status',
      accessor: (row) => (
        <StatusBadge status={row.status === 'published' ? 'active' : row.status === 'draft' ? 'draft' : 'inactive'} />
      ),
    },
    {
      header: 'Display Order',
      accessor: (row) => (
        <span className="text-xs font-mono text-gray-500 font-bold">
          {row.sort_order}
        </span>
      ),
    },
  ]

  const filteredCollections = collections.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Curated Collections"
        description="Create seasonal themes, festival edits, and homepage featured showcases."
        badgeText={`${collections.length} Collections`}
        actions={
          <Button onClick={() => setIsModalOpen(true)} variant="primary" className="bg-[#5C0B26] hover:bg-[#8C3A57] dark:bg-gradient-to-r dark:from-[#861A39] dark:to-[#611026] dark:text-[#FFF4DC] dark:border-[#D0A45C]/25">
            <Plus className="w-4 h-4 mr-1 text-[#D4AF37]" /> Add Collection
          </Button>
        }
      />

      <SearchAndFilterBar
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search collection title..."
      />

      {isLoading ? (
        <TableSkeleton rows={4} />
      ) : filteredCollections.length === 0 ? (
        <EmptyState
          title="No Collections Found"
          description="Create a curated collection to group seasonal ethnic products."
          icon={Sparkles}
          action={
            <Button onClick={() => setIsModalOpen(true)} variant="primary" className="bg-[#5C0B26]">
              <Plus className="w-4 h-4 mr-1 text-[#D4AF37]" /> Add First Collection
            </Button>
          }
        />
      ) : (
        <div className="bg-white dark:bg-[#211318] rounded-2xl border border-[#5C0B26]/10 shadow-sm overflow-hidden p-2">
          <DataTable
            columns={columns}
            data={filteredCollections}
            actions={(row) => (
              <div className="flex items-center justify-end space-x-1">
                {row.status === 'published' && (
                  <Link
                    href={`/collection/${row.slug}`}
                    target="_blank"
                    className="p-1.5 text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                    title="View Storefront"
                  >
                    <Link2 className="w-4 h-4" />
                  </Link>
                )}
                <button
                  onClick={() => handleOpenEditModal(row)}
                  className="p-1.5 text-[#8C3A57] hover:bg-[#5C0B26]/5 rounded-lg transition-colors"
                  title="Edit Collection"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDeleteCollection(row.id)}
                  className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                  title="Delete Collection"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )}
          />
        </div>
      )}

      {/* Create Collection Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Add New Collection">
        <form onSubmit={handleAddCollection} className="space-y-4 max-h-[80vh] overflow-y-auto pr-1">
          <Input
            label="Collection Title"
            value={colName}
            onChange={e => setColName(e.target.value)}
            placeholder="e.g. Royal Festive Edit 2026"
            required
          />

          <div className="space-y-1">
            <label className="block text-xs font-bold text-[#2B1A1F] dark:text-[#FFF4DC]">Description</label>
            <textarea
              value={colDescription}
              onChange={e => setColDescription(e.target.value)}
              placeholder="Enter collection details or marketing content..."
              className="w-full min-h-[80px] p-2 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5C0B26] dark:bg-gray-850 dark:border-gray-700"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="block text-xs font-bold text-[#2B1A1F] dark:text-[#FFF4DC]">Status</label>
              <select
                value={colStatus}
                onChange={e => setColStatus(e.target.value as any)}
                className="w-full p-2 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5C0B26] dark:bg-gray-850 dark:border-gray-700 font-bold"
              >
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="archived">Archived</option>
              </select>
            </div>

            <Input
              label="Display Sort Order"
              type="number"
              value={colSortOrder}
              onChange={e => setColSortOrder(e.target.value)}
            />
          </div>

          {/* Image Upload */}
          <div className="space-y-2 border-t border-gray-100 pt-3">
            <label className="block text-xs font-bold text-[#2B1A1F] dark:text-[#FFF4DC]">Collection Banner Image</label>
            <div className="flex items-center space-x-4">
              {colImageUrl && (
                <div className="relative w-16 h-16 rounded-xl overflow-hidden border border-gray-200">
                  <Image src={colImageUrl} alt="Preview" fill className="object-cover" />
                </div>
              )}
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="Paste URL or upload image"
                  value={colImageUrl}
                  onChange={e => setColImageUrl(e.target.value)}
                  className="w-full p-2 text-xs border border-gray-300 rounded-lg mb-2"
                />
                <label className="inline-flex items-center px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-[#2B1A1F] text-xs font-bold rounded-lg cursor-pointer transition-colors">
                  {isUploadingCreate ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="w-3.5 h-3.5 mr-1.5" /> Upload File
                    </>
                  )}
                  <input type="file" onChange={handleCreateImageUpload} className="hidden" accept="image/*" />
                </label>
                {uploadErrorCreate && (
                  <p className="text-[10px] text-rose-600 mt-1 font-semibold">{uploadErrorCreate}</p>
                )}
              </div>
            </div>
          </div>

          {/* Featured checkbox */}
          <label className="flex items-center space-x-2 pt-2 cursor-pointer">
            <input
              type="checkbox"
              checked={colIsFeatured}
              onChange={e => setColIsFeatured(e.target.checked)}
              className="rounded border-gray-300 text-[#5C0B26] focus:ring-[#5C0B26]"
            />
            <span className="text-xs font-bold text-[#2B1A1F] dark:text-[#FFF4DC]">Highlight / Feature on Homepage</span>
          </label>

          <div className="flex justify-end space-x-2 pt-4 border-t border-[#5C0B26]/10">
            <Button variant="outline" type="button" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={isCreating} className="bg-[#5C0B26]">
              {isCreating ? 'Saving...' : 'Save Collection'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Collection Modal */}
      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Edit Collection Details">
        <div className="space-y-4 max-h-[85vh] overflow-y-auto pr-1">
          {/* Tab Navigation */}
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setActiveTab('general')}
              className={`flex-1 py-2 text-xs font-bold border-b-2 text-center transition-colors ${
                activeTab === 'general' ? 'border-[#5C0B26] text-[#5C0B26]' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              General Info
            </button>
            <button
              onClick={() => setActiveTab('seo')}
              className={`flex-1 py-2 text-xs font-bold border-b-2 text-center transition-colors ${
                activeTab === 'seo' ? 'border-[#5C0B26] text-[#5C0B26]' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              SEO Configuration
            </button>
            <button
              onClick={() => setActiveTab('products')}
              className={`flex-1 py-2 text-xs font-bold border-b-2 text-center transition-colors ${
                activeTab === 'products' ? 'border-[#5C0B26] text-[#5C0B26]' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Products ({assignedProducts.length})
            </button>
          </div>

          {/* TAB 1: GENERAL INFO */}
          {activeTab === 'general' && (
            <form onSubmit={handleUpdateCollection} className="space-y-4">
              <Input
                label="Collection Title"
                value={editName}
                onChange={e => setEditName(e.target.value)}
                required
              />

              <div className="space-y-1">
                <label className="block text-xs font-bold text-[#2B1A1F] dark:text-[#FFF4DC]">Slug path</label>
                <input
                  type="text"
                  value={editSlug}
                  onChange={e => setEditSlug(e.target.value)}
                  className="w-full p-2 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5C0B26] font-mono"
                  required
                />
                <p className="text-[9px] text-amber-700 font-semibold flex items-center bg-amber-50 p-1.5 rounded border border-amber-100">
                  <HelpCircle className="w-3.5 h-3.5 mr-1" /> Slug changes will break existing banners and links pointing to /collection/{editingCollection?.slug}. Update references accordingly.
                </p>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-[#2B1A1F] dark:text-[#FFF4DC]">Description</label>
                <textarea
                  value={editDescription}
                  onChange={e => setEditDescription(e.target.value)}
                  className="w-full min-h-[80px] p-2 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5C0B26] dark:bg-gray-850"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-[#2B1A1F] dark:text-[#FFF4DC]">Status</label>
                  <select
                    value={editStatus}
                    onChange={e => setEditStatus(e.target.value as any)}
                    className="w-full p-2 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5C0B26]"
                  >
                    <option value="draft">Draft</option>
                    <option value="published">Published</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>

                <Input
                  label="Display Sort Order"
                  type="number"
                  value={editSortOrder}
                  onChange={e => setEditSortOrder(e.target.value)}
                />
              </div>

              {/* Image Upload */}
              <div className="space-y-2 border-t border-gray-100 pt-3">
                <label className="block text-xs font-bold text-[#2B1A1F] dark:text-[#FFF4DC]">Collection Banner Image</label>
                <div className="flex items-center space-x-4">
                  {editImageUrl && (
                    <div className="relative w-16 h-16 rounded-xl overflow-hidden border border-gray-200">
                      <Image src={editImageUrl} alt="Preview" fill className="object-cover" />
                    </div>
                  )}
                  <div className="flex-1">
                    <input
                      type="text"
                      placeholder="Paste URL or upload image"
                      value={editImageUrl}
                      onChange={e => setEditImageUrl(e.target.value)}
                      className="w-full p-2 text-xs border border-gray-300 rounded-lg mb-2"
                    />
                    <label className="inline-flex items-center px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-[#2B1A1F] text-xs font-bold rounded-lg cursor-pointer transition-colors">
                      {isUploadingEdit ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Uploading...
                        </>
                      ) : (
                        <>
                          <Upload className="w-3.5 h-3.5 mr-1.5" /> Upload File
                        </>
                      )}
                      <input type="file" onChange={handleEditImageUpload} className="hidden" accept="image/*" />
                    </label>
                    {uploadErrorEdit && (
                      <p className="text-[10px] text-rose-600 mt-1 font-semibold">{uploadErrorEdit}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Featured checkbox */}
              <label className="flex items-center space-x-2 pt-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editIsFeatured}
                  onChange={e => setEditIsFeatured(e.target.checked)}
                  className="rounded border-gray-300 text-[#5C0B26] focus:ring-[#5C0B26]"
                />
                <span className="text-xs font-bold text-[#2B1A1F] dark:text-[#FFF4DC]">Highlight / Feature on Homepage</span>
              </label>

              <div className="flex justify-end space-x-2 pt-4 border-t border-[#5C0B26]/10">
                <Button variant="outline" type="button" onClick={() => setIsEditModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" disabled={isUpdating} className="bg-[#5C0B26]">
                  {isUpdating ? 'Saving...' : 'Save General Info'}
                </Button>
              </div>
            </form>
          )}

          {/* TAB 2: SEO CONFIG */}
          {activeTab === 'seo' && (
            <form onSubmit={handleUpdateCollection} className="space-y-4">
              <Input
                label="SEO Meta Title"
                value={editSeoTitle}
                onChange={e => setEditSeoTitle(e.target.value)}
                placeholder="defaults to Collection Title"
              />

              <div className="space-y-1">
                <label className="block text-xs font-bold text-[#2B1A1F] dark:text-[#FFF4DC]">SEO Meta Description</label>
                <textarea
                  value={editSeoDescription}
                  onChange={e => setEditSeoDescription(e.target.value)}
                  placeholder="Enter dynamic meta description used by search engines..."
                  className="w-full min-h-[100px] p-2 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5C0B26] dark:bg-gray-850"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-4 border-t border-[#5C0B26]/10">
                <Button variant="outline" type="button" onClick={() => setIsEditModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" disabled={isUpdating} className="bg-[#5C0B26]">
                  {isUpdating ? 'Saving...' : 'Save SEO Configurations'}
                </Button>
              </div>
            </form>
          )}

          {/* TAB 3: PRODUCTS ASSIGNMENT */}
          {activeTab === 'products' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Available Products Checkbox Checklist */}
                <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-3 flex flex-col h-[380px]">
                  <h5 className="font-serif font-bold text-xs text-[#2B1A1F] mb-2 pb-1 border-b flex items-center justify-between">
                    <span>Available Store Products</span>
                    <span className="text-[10px] text-gray-500 font-mono">Total: {filteredProducts.length}</span>
                  </h5>

                  <div className="relative mb-2">
                    <input
                      type="text"
                      placeholder="Search designs..."
                      value={productSearch}
                      onChange={e => setProductSearch(e.target.value)}
                      className="w-full pl-8 pr-2.5 py-1.5 text-[11px] border border-gray-300 rounded-lg"
                    />
                    <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  </div>

                  <div className="flex-1 overflow-y-auto space-y-1 pr-1">
                    {isProductLoading ? (
                      <div className="text-center py-8 text-[11px] text-gray-400 flex items-center justify-center">
                        <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> Loading products...
                      </div>
                    ) : filteredProducts.length === 0 ? (
                      <p className="text-[10px] text-center text-gray-400 py-8">No matching products found.</p>
                    ) : (
                      filteredProducts.map(prod => {
                        const isAssigned = assignedProducts.some(p => p.id === prod.id)
                        return (
                          <label key={prod.id} className="flex items-center space-x-2.5 p-1.5 hover:bg-gray-50 dark:hover:bg-gray-900 rounded cursor-pointer text-[11px]">
                            <input
                              type="checkbox"
                              checked={isAssigned}
                              onChange={() => handleToggleProduct(prod.id)}
                              className="rounded text-[#5C0B26] focus:ring-[#5C0B26] w-3.5 h-3.5"
                            />
                            {prod.images?.[0] ? (
                              <img src={prod.images[0]} alt={prod.title} className="w-6 h-6 object-cover rounded" />
                            ) : (
                              <div className="w-6 h-6 bg-gray-100 rounded" />
                            )}
                            <div className="flex-1 truncate">
                              <p className="font-bold truncate text-gray-800 dark:text-gray-200">{prod.title}</p>
                              <span className="text-[8px] text-gray-400 font-mono">{prod.slug}</span>
                            </div>
                          </label>
                        )
                      })
                    )}
                  </div>
                </div>

                {/* Assigned Products Reordering list */}
                <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-3 flex flex-col h-[380px]">
                  <h5 className="font-serif font-bold text-xs text-[#2B1A1F] mb-2 pb-1 border-b flex items-center justify-between">
                    <span>Assigned Curated List</span>
                    <span className="text-[10px] text-gray-500 font-mono">Count: {assignedProducts.length}</span>
                  </h5>

                  <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
                    {assignedProducts.length === 0 ? (
                      <div className="text-center py-16 text-[11px] text-gray-400 italic">
                        No designs assigned. Select products from the left panel to assign to this collection.
                      </div>
                    ) : (
                      assignedProducts
                        .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
                        .map((prod, idx) => (
                          <div key={prod.id} className="flex items-center justify-between p-1.5 bg-[#5C0B26]/5 rounded border border-[#5C0B26]/10 text-[11px]">
                            <div className="flex items-center space-x-2 truncate flex-1">
                              <span className="font-bold text-gray-400 font-mono text-[9px] w-4 text-center">#{idx + 1}</span>
                              {prod.images?.[0] ? (
                                <img src={prod.images[0]} alt={prod.title} className="w-6 h-6 object-cover rounded" />
                              ) : (
                                <div className="w-6 h-6 bg-gray-100 rounded" />
                              )}
                              <p className="font-bold truncate text-gray-800 dark:text-gray-200">{prod.title}</p>
                            </div>

                            <div className="flex items-center space-x-2 ml-2">
                              {/* Order Input */}
                              <div className="flex items-center space-x-1">
                                <span className="text-[9px] text-gray-400">Order:</span>
                                <input
                                  type="number"
                                  value={prod.sort_order !== undefined ? prod.sort_order : idx}
                                  onChange={e => handleUpdateProductSort(prod.id, e.target.value)}
                                  className="w-12 p-1 text-[10px] border border-gray-300 rounded text-center focus:ring-1 focus:ring-[#5C0B26]"
                                />
                              </div>

                              <button
                                onClick={() => handleToggleProduct(prod.id)}
                                className="text-rose-600 hover:bg-rose-50 p-1 rounded"
                                title="Remove Assignment"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))
                    )}
                  </div>
                </div>
              </div>

              <div className="flex justify-between items-center pt-3 border-t border-gray-100">
                <span className="text-[9px] text-gray-500 font-semibold italic">
                  * Save product assignments to apply sort ordering on the storefront.
                </span>
                <div className="flex space-x-2">
                  <Button variant="outline" type="button" onClick={() => setIsEditModalOpen(false)}>
                    Close
                  </Button>
                  <Button
                    onClick={handleSaveAssignments}
                    disabled={isAssigning}
                    variant="primary"
                    className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold"
                  >
                    {isAssigning ? (
                      <>
                        <Loader2 className="w-3 h-3 animate-spin mr-1" /> Saving...
                      </>
                    ) : (
                      <>
                        <Check className="w-3 h-3 mr-1" /> Save Assignments
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </Modal>
    </div>
  )
}
