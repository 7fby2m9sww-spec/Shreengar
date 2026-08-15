'use client'

import React, { useEffect, useState, useMemo } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import {
  AdminPageHeader,
  EmptyState,
  TableSkeleton,
  StatusBadge,
} from '@/components/admin/AdminUI'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import {
  Plus,
  Edit,
  Trash2,
  FolderTree,
  Upload,
  ChevronRight,
  ChevronDown,
  Search,
  AlertTriangle,
  Folder,
  Layers,
  ChevronUp,
  Check,
  ArrowRight,
  ArrowLeft,
  X
} from 'lucide-react'
import {
  getCategoriesWithCountAction,
  createCategoryAction,
  updateCategoryAction,
  deleteCategoryAction
} from '@/actions/catalog/actions'
import { uploadCategoryImageAction } from '@/actions/admin/uploadCategoryImageAction'
import { Category } from '@/types/database'
import {
  CategoryTreeNode,
  buildCategoryTree,
  getParentCategoryOptions,
  flattenCategoryTree
} from '@/lib/utils/categoryTree'

type CategoryWithCount = Category & {
  product_count: number
}

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<CategoryWithCount[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')

  // Expanded Nodes state
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())

  // Create modal / step states
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [createStep, setCreateStep] = useState<1 | 2 | 3 | 4>(1) // Mobile 4-step wizard
  const [catName, setCatName] = useState('')
  const [catSlug, setCatSlug] = useState('')
  const [catDescription, setCatDescription] = useState('')
  const [catParentId, setCatParentId] = useState<string | null>(null)
  const [catDisplayOrder, setCatDisplayOrder] = useState('0')
  const [catIsActive, setCatIsActive] = useState(true)
  const [catImageUrl, setCatImageUrl] = useState('')
  const [isUploadingCreate, setIsUploadingCreate] = useState(false)
  const [uploadErrorCreate, setUploadErrorCreate] = useState<string | null>(null)
  const [createFormError, setCreateFormError] = useState<string | null>(null)

  // Edit modal states
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<CategoryWithCount | null>(null)
  const [editName, setEditName] = useState('')
  const [editSlug, setEditSlug] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editParentId, setEditParentId] = useState<string | null>(null)
  const [editDisplayOrder, setEditDisplayOrder] = useState('0')
  const [editIsActive, setEditIsActive] = useState(true)
  const [editImageUrl, setEditImageUrl] = useState('')
  const [isUploadingEdit, setIsUploadingEdit] = useState(false)
  const [uploadErrorEdit, setUploadErrorEdit] = useState<string | null>(null)
  const [editFormError, setEditFormError] = useState<string | null>(null)

  // Delete modal state
  const [deletingCat, setDeletingCat] = useState<CategoryWithCount | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const loadCategories = async () => {
    setIsLoading(true)
    const res = await getCategoriesWithCountAction()
    if (res.data) {
      setCategories(res.data)
      const rootIds = res.data.filter(c => !c.parent_id).map(c => c.id)
      setExpandedIds(new Set(rootIds))
    }
    setIsLoading(false)
  }

  useEffect(() => {
    loadCategories()
  }, [])

  // Build tree data
  const categoryTree = useMemo(() => {
    return buildCategoryTree(categories)
  }, [categories])

  // Search & Status filtered nodes
  const filteredCategories = useMemo(() => {
    let result = categories

    if (statusFilter !== 'all') {
      const activeBool = statusFilter === 'active'
      result = result.filter(c => !!c.is_active === activeBool)
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      result = result.filter(c =>
        c.name.toLowerCase().includes(q) ||
        c.slug.toLowerCase().includes(q)
      )
    }

    return result
  }, [categories, statusFilter, searchQuery])

  // Flattened tree rows for desktop view
  const flattenedRows = useMemo(() => {
    if (searchQuery.trim() || statusFilter !== 'all') {
      return buildCategoryTree(filteredCategories)
    }
    return flattenCategoryTree(categoryTree, expandedIds)
  }, [categoryTree, expandedIds, filteredCategories, searchQuery, statusFilter])

  // Parent Options for selector
  const createParentOptions = useMemo(() => {
    return getParentCategoryOptions(categories)
  }, [categories])

  const editParentOptions = useMemo(() => {
    return getParentCategoryOptions(categories, editingCategory?.id)
  }, [categories, editingCategory])

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const handleExpandAll = () => {
    setExpandedIds(new Set(categories.map(c => c.id)))
  }

  const handleCollapseAll = () => {
    setExpandedIds(new Set())
  }

  // Name to slug auto generator
  const handleNameChangeCreate = (val: string) => {
    setCatName(val)
    if (!catSlug || catSlug === catName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')) {
      setCatSlug(val.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''))
    }
  }

  const handleCreateImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploadingCreate(true)
    setUploadErrorCreate(null)

    const formData = new FormData()
    formData.append('file', file)

    const res = await uploadCategoryImageAction(formData)
    setIsUploadingCreate(false)

    if (res.success && res.url) {
      setCatImageUrl(res.url)
    } else {
      setUploadErrorCreate(res.error || 'Upload failed.')
    }
  }

  const handleEditImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploadingEdit(true)
    setUploadErrorEdit(null)

    const formData = new FormData()
    formData.append('file', file)

    const res = await uploadCategoryImageAction(formData)
    setIsUploadingEdit(false)

    if (res.success && res.url) {
      setEditImageUrl(res.url)
    } else {
      setUploadErrorEdit(res.error || 'Upload failed.')
    }
  }

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreateFormError(null)

    const trimmedName = catName.trim()
    const trimmedSlug = catSlug.trim().toLowerCase()

    if (!trimmedName) {
      setCreateFormError('Category Name is required.')
      return
    }
    if (!trimmedSlug) {
      setCreateFormError('Category Slug is required.')
      return
    }

    const res = await createCategoryAction({
      name: trimmedName,
      slug: trimmedSlug,
      description: catDescription.trim() || null,
      parent_id: catParentId,
      display_order: Number(catDisplayOrder) || 0,
      is_active: catIsActive,
      image_url: catImageUrl || null,
    })

    if (res.error) {
      setCreateFormError(res.error)
    } else {
      setIsModalOpen(false)
      setCreateStep(1)
      setCatName('')
      setCatSlug('')
      setCatDescription('')
      setCatParentId(null)
      setCatDisplayOrder('0')
      setCatIsActive(true)
      setCatImageUrl('')
      loadCategories()
    }
  }

  const handleOpenEdit = (cat: CategoryWithCount) => {
    setEditingCategory(cat)
    setEditName(cat.name)
    setEditSlug(cat.slug)
    setEditDescription(cat.description || '')
    setEditParentId(cat.parent_id || null)
    setEditDisplayOrder(String(cat.display_order ?? 0))
    setEditIsActive(cat.is_active !== false)
    setEditImageUrl(cat.image_url || '')
    setEditFormError(null)
    setIsEditModalOpen(true)
  }

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingCategory) return
    setEditFormError(null)

    const trimmedName = editName.trim()
    const trimmedSlug = editSlug.trim().toLowerCase()

    if (!trimmedName) {
      setEditFormError('Category Name is required.')
      return
    }
    if (!trimmedSlug) {
      setEditFormError('Category Slug is required.')
      return
    }

    const res = await updateCategoryAction(editingCategory.id, {
      name: trimmedName,
      slug: trimmedSlug,
      description: editDescription.trim() || null,
      parent_id: editParentId,
      display_order: Number(editDisplayOrder) || 0,
      is_active: editIsActive,
      image_url: editImageUrl || null,
    })

    if (res.error) {
      setEditFormError(res.error)
    } else {
      setIsEditModalOpen(false)
      loadCategories()
    }
  }

  const confirmDeleteCategory = async () => {
    if (!deletingCat) return
    setIsDeleting(true)
    const res = await deleteCategoryAction(deletingCat.id)
    setIsDeleting(false)
    if (res.error) {
      alert(res.error)
    } else {
      setDeletingCat(null)
      loadCategories()
    }
  }

  // Full ancestor inactive check
  const isParentInactive = (node: CategoryTreeNode): boolean => {
    let currentParentId = node.parent_id
    const visited = new Set<string>()

    while (currentParentId) {
      if (visited.has(currentParentId)) break
      visited.add(currentParentId)

      const parent = categories.find(c => c.id === currentParentId)
      if (!parent) break
      if (parent.is_active === false) return true
      currentParentId = parent.parent_id
    }
    return false
  }

  return (
    <div className="space-y-6">
      {/* 1. Page Header */}
      <AdminPageHeader
        title="Categories"
        description="Manage hierarchical storefront categories, parent relationships and sort order."
        badgeText={`${categories.length} Total`}
        actions={
          <Button
            onClick={() => {
              setCreateFormError(null)
              setCreateStep(1)
              setIsModalOpen(true)
            }}
            className="bg-[#5C0B26] hover:bg-[#8C3A57] text-[#FAF8F5] text-xs px-4 py-2 rounded-xl flex items-center space-x-1.5 shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4 text-[#D4AF37]" />
            <span>Add New Category</span>
          </Button>
        }
      />

      {/* 2. Controls Bar */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-2">
          <div className="relative max-w-xs w-full">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search category name or slug..."
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-[#5C0B26] focus:outline-none"
            />
          </div>

          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as any)}
            className="p-2 border border-gray-200 rounded-xl text-xs bg-white text-gray-700 font-medium focus:ring-2 focus:ring-[#5C0B26]"
          >
            <option value="all">All Status</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
          </select>
        </div>

        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={handleExpandAll}
            className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-xl text-xs font-semibold text-gray-700 transition-colors flex items-center space-x-1 cursor-pointer"
          >
            <ChevronDown className="w-3.5 h-3.5" />
            <span>Expand All</span>
          </button>

          <button
            type="button"
            onClick={handleCollapseAll}
            className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-xl text-xs font-semibold text-gray-700 transition-colors flex items-center space-x-1 cursor-pointer"
          >
            <ChevronUp className="w-3.5 h-3.5" />
            <span>Collapse All</span>
          </button>
        </div>
      </div>

      {/* 3. Category Tree Table View */}
      {isLoading ? (
        <TableSkeleton rows={8} />
      ) : categories.length === 0 ? (
        <EmptyState
          title="No Categories Created"
          description="Build your storefront taxonomy by adding root and child categories."
          action={
            <Button onClick={() => setIsModalOpen(true)} className="bg-[#5C0B26] text-white text-xs">
              Add First Category
            </Button>
          }
        />
      ) : (
        <>
          {/* Desktop Table View (>= 768px) */}
          <div className="hidden md:block bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#FAF8F5] border-b border-gray-200 font-serif font-bold text-[#2B1A1F]">
                <tr>
                  <th className="p-4 w-5/12">Category Name & Hierarchy</th>
                  <th className="p-4">Slug</th>
                  <th className="p-4 text-center">Products</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-center">Sort Order</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {flattenedRows.map(node => {
                  const hasChildren = node.children && node.children.length > 0
                  const isExpanded = expandedIds.has(node.id)
                  const parentInactive = isParentInactive(node)

                  return (
                    <tr key={node.id} className="hover:bg-amber-50/30 transition-colors">
                      {/* Name with indent tree */}
                      <td className="p-4">
                        <div
                          className="flex items-center space-x-2"
                          style={{ paddingLeft: `${node.depth * 24}px` }}
                        >
                          {hasChildren ? (
                            <button
                              type="button"
                              onClick={() => toggleExpand(node.id)}
                              className="p-1 hover:bg-gray-100 rounded text-gray-500 cursor-pointer"
                            >
                              {isExpanded ? (
                                <ChevronDown className="w-4 h-4 text-[#5C0B26]" />
                              ) : (
                                <ChevronRight className="w-4 h-4" />
                              )}
                            </button>
                          ) : (
                            <span className="w-6" />
                          )}

                          {node.image_url ? (
                            <Image
                              src={node.image_url}
                              alt={node.name}
                              width={32}
                              height={32}
                              className="w-8 h-8 object-cover rounded-lg border border-gray-200 flex-shrink-0"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-lg bg-[#5C0B26]/10 text-[#5C0B26] flex items-center justify-center flex-shrink-0 font-bold text-xs">
                              <Folder className="w-4 h-4" />
                            </div>
                          )}

                          <div>
                            <div className="flex items-center space-x-2">
                              <span className="font-bold text-gray-900">{node.name}</span>
                              {parentInactive && (
                                <span className="bg-amber-100 text-amber-800 text-[9px] font-bold px-1.5 py-0.5 rounded flex items-center space-x-1" title="Parent category is inactive">
                                  <AlertTriangle className="w-3 h-3 text-amber-600" />
                                  <span>Parent Inactive</span>
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-gray-400 font-mono block">Path: {node.path}</span>
                          </div>
                        </div>
                      </td>

                      {/* Slug */}
                      <td className="p-4 font-mono text-gray-600 text-[11px]">
                        /{node.slug}
                      </td>

                      {/* Product count */}
                      <td className="p-4 text-center">
                        <span className="font-bold text-gray-800 bg-gray-100 px-2.5 py-1 rounded-full text-[11px]">
                          {node.direct_product_count}
                          {node.total_product_count > node.direct_product_count && (
                            <span className="text-gray-500 text-[10px] ml-1">({node.total_product_count} total)</span>
                          )}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="p-4">
                        <StatusBadge status={node.is_active !== false ? 'active' : 'draft'} />
                      </td>

                      {/* Sort Order */}
                      <td className="p-4 text-center font-mono text-gray-500">
                        {node.display_order ?? 0}
                      </td>

                      {/* Actions */}
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(node)}
                            className="p-1.5 hover:bg-gray-100 text-gray-600 hover:text-[#5C0B26] rounded-lg transition-colors cursor-pointer"
                            title="Edit Category"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeletingCat(node)}
                            className="p-1.5 hover:bg-rose-50 text-gray-400 hover:text-rose-700 rounded-lg transition-colors cursor-pointer"
                            title="Delete Category"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Card Grid (< 768px) */}
          <div className="md:hidden space-y-3">
            {flattenedRows.map(node => (
              <div
                key={node.id}
                className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs space-y-3"
                style={{ marginLeft: `${Math.min(node.depth * 12, 36)}px` }}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    {node.image_url ? (
                      <Image
                        src={node.image_url}
                        alt={node.name}
                        width={40}
                        height={40}
                        className="w-10 h-10 object-cover rounded-xl border border-gray-200"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-xl bg-[#5C0B26]/10 text-[#5C0B26] flex items-center justify-center font-bold text-sm">
                        <FolderTree className="w-5 h-5" />
                      </div>
                    )}

                    <div>
                      <h4 className="font-bold text-sm text-gray-900">{node.name}</h4>
                      <p className="text-[11px] text-gray-500 font-mono">/{node.slug}</p>
                    </div>
                  </div>

                  <StatusBadge status={node.is_active !== false ? 'active' : 'draft'} />
                </div>

                <div className="text-xs text-gray-600 space-y-1 bg-gray-50 p-2.5 rounded-lg">
                  <p><span className="font-semibold">Path:</span> {node.path}</p>
                  <p><span className="font-semibold">Direct Products:</span> {node.direct_product_count} (Total: {node.total_product_count})</p>
                  <p><span className="font-semibold">Subcategories:</span> {node.child_count}</p>
                </div>

                <div className="flex items-center justify-end space-x-3 pt-1 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => handleOpenEdit(node)}
                    className="flex items-center space-x-1 min-h-[44px] px-3 py-2 text-xs font-semibold text-[#5C0B26] bg-[#5C0B26]/5 rounded-xl cursor-pointer"
                  >
                    <Edit className="w-3.5 h-3.5" />
                    <span>Edit</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeletingCat(node)}
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

      {/* 4. Create Category Modal (Desktop 2-Column: 35% Left / 65% Right & Mobile 4-Step Wizard) */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Add New Category"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
          {createFormError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl font-semibold flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
              <span>{createFormError}</span>
            </div>
          )}

          {/* Mobile 4-Step Indicator (< 768px) */}
          <div className="md:hidden flex items-center justify-between border-b border-gray-100 pb-3 mb-2">
            {[
              { step: 1, label: 'Hierarchy' },
              { step: 2, label: 'Details' },
              { step: 3, label: 'Image' },
              { step: 4, label: 'Review' },
            ].map(({ step, label }) => (
              <button
                key={step}
                type="button"
                onClick={() => setCreateStep(step as any)}
                className="flex items-center space-x-1 cursor-pointer"
              >
                <span
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    createStep === step
                      ? 'bg-[#5C0B26] text-white'
                      : createStep > step
                      ? 'bg-emerald-600 text-white'
                      : 'bg-gray-100 text-gray-400'
                  }`}
                >
                  {createStep > step ? <Check className="w-3 h-3" /> : step}
                </span>
                <span className="text-[10px] font-medium text-gray-500">{label}</span>
              </button>
            ))}
          </div>

          {/* DESKTOP VIEW (>= 768px): Always render complete 2-column layout */}
          <div className="hidden md:grid grid-cols-12 gap-5">
            {/* Left Column (35% / 5 cols) — Category Hierarchy */}
            <div className="col-span-5 bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-3">
              <h4 className="font-serif font-bold text-xs text-[#2B1A1F] flex items-center space-x-1">
                <Layers className="w-4 h-4 text-[#5C0B26]" />
                <span>Category Hierarchy</span>
              </h4>

              <div>
                <label className="font-semibold text-gray-700 block mb-1">Parent Category</label>
                <select
                  value={catParentId || ''}
                  onChange={e => setCatParentId(e.target.value || null)}
                  className="w-full p-2.5 border border-gray-300 rounded-xl text-xs bg-white text-gray-900 focus:ring-[#5C0B26]"
                >
                  {createParentOptions.map(opt => (
                    <option key={opt.id || 'root'} value={opt.id || ''} disabled={opt.disabled}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-gray-500 mt-1">
                  Select &quot;None — Root Category&quot; for top-level categories.
                </p>
              </div>

              <div>
                <label className="font-semibold text-gray-700 block mb-1">Sort Order</label>
                <Input
                  type="number"
                  value={catDisplayOrder}
                  onChange={e => setCatDisplayOrder(e.target.value)}
                  min="0"
                />
                <p className="text-[10px] text-gray-500 mt-1">Lower numbers appear first in navigation.</p>
              </div>

              <div>
                <label className="font-semibold text-gray-700 block mb-1">Storefront Visibility</label>
                <label className="flex items-center space-x-2 cursor-pointer mt-1">
                  <input
                    type="checkbox"
                    checked={catIsActive}
                    onChange={e => setCatIsActive(e.target.checked)}
                    className="w-4 h-4 text-[#5C0B26] focus:ring-[#5C0B26] rounded"
                  />
                  <span className="font-semibold text-xs text-gray-800">Active (Visible to Customers)</span>
                </label>
              </div>
            </div>

            {/* Right Column (65% / 7 cols) — Category Details & Image */}
            <div className="col-span-7 space-y-3">
              <Input
                label="Category Name *"
                value={catName}
                onChange={e => handleNameChangeCreate(e.target.value)}
                placeholder="e.g. Kurtis"
                required
              />

              <div>
                <Input
                  label="Slug *"
                  value={catSlug}
                  onChange={e => setCatSlug(e.target.value.toLowerCase())}
                  placeholder="e.g. kurtis"
                  required
                />
                <p className="text-[10px] text-gray-500 mt-0.5 font-mono">
                  Path: /category/{catSlug || 'kurtis'}
                </p>
              </div>

              <div>
                <label className="font-semibold text-[#2B1A1F] block mb-1">Description (Optional)</label>
                <textarea
                  value={catDescription}
                  onChange={e => setCatDescription(e.target.value)}
                  placeholder="Short description for SEO and category banner..."
                  rows={3}
                  className="w-full p-2.5 border border-gray-300 rounded-xl text-xs text-gray-900 bg-white focus:ring-[#5C0B26]"
                />
              </div>

              <div>
                <label className="font-semibold text-[#2B1A1F] block mb-1">Category Image</label>
                {catImageUrl ? (
                  <div className="relative w-24 h-24 rounded-xl border border-gray-200 overflow-hidden group">
                    <Image src={catImageUrl} alt="Category banner" fill className="object-cover" />
                    <button
                      type="button"
                      onClick={() => setCatImageUrl('')}
                      className="absolute inset-0 bg-black/60 text-white opacity-0 group-hover:opacity-100 flex items-center justify-center text-xs font-bold transition-opacity"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center space-x-3">
                    <label className="cursor-pointer bg-gray-100 hover:bg-gray-200 px-3 py-2 rounded-xl text-xs font-semibold text-gray-700 flex items-center space-x-1.5 border border-gray-300">
                      <Upload className="w-4 h-4 text-[#5C0B26]" />
                      <span>{isUploadingCreate ? 'Uploading...' : 'Upload Category Banner'}</span>
                      <input type="file" accept="image/*" onChange={handleCreateImageUpload} className="hidden" />
                    </label>
                  </div>
                )}
                {uploadErrorCreate && <p className="text-rose-600 text-[10px] mt-1">{uploadErrorCreate}</p>}
              </div>
            </div>
          </div>

          {/* MOBILE VIEW (< 768px): Render step-by-step wizard */}
          <div className="md:hidden space-y-3">
            {createStep === 1 && (
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-3">
                <h4 className="font-serif font-bold text-xs text-[#2B1A1F]">Step 1: Hierarchy</h4>
                <div>
                  <label className="font-semibold text-gray-700 block mb-1">Parent Category</label>
                  <select
                    value={catParentId || ''}
                    onChange={e => setCatParentId(e.target.value || null)}
                    className="w-full p-2.5 border border-gray-300 rounded-xl text-xs bg-white text-gray-900 focus:ring-[#5C0B26]"
                  >
                    {createParentOptions.map(opt => (
                      <option key={opt.id || 'root'} value={opt.id || ''} disabled={opt.disabled}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-gray-700 block mb-1">Sort Order</label>
                  <Input type="number" value={catDisplayOrder} onChange={e => setCatDisplayOrder(e.target.value)} min="0" />
                </div>
                <div>
                  <label className="flex items-center space-x-2 cursor-pointer mt-1">
                    <input type="checkbox" checked={catIsActive} onChange={e => setCatIsActive(e.target.checked)} className="w-4 h-4 text-[#5C0B26] rounded" />
                    <span className="font-semibold text-xs text-gray-800">Active Category</span>
                  </label>
                </div>
              </div>
            )}

            {createStep === 2 && (
              <div className="space-y-3">
                <h4 className="font-serif font-bold text-xs text-[#2B1A1F]">Step 2: Details</h4>
                <Input label="Category Name *" value={catName} onChange={e => handleNameChangeCreate(e.target.value)} placeholder="e.g. Kurtis" required />
                <Input label="Slug *" value={catSlug} onChange={e => setCatSlug(e.target.value.toLowerCase())} placeholder="e.g. kurtis" required />
                <div>
                  <label className="font-semibold text-[#2B1A1F] block mb-1">Description</label>
                  <textarea value={catDescription} onChange={e => setCatDescription(e.target.value)} rows={3} className="w-full p-2.5 border border-gray-300 rounded-xl text-xs text-gray-900 bg-white" />
                </div>
              </div>
            )}

            {createStep === 3 && (
              <div className="space-y-3">
                <h4 className="font-serif font-bold text-xs text-[#2B1A1F]">Step 3: Image</h4>
                {catImageUrl ? (
                  <div className="relative w-24 h-24 rounded-xl border border-gray-200 overflow-hidden">
                    <Image src={catImageUrl} alt="Category banner" fill className="object-cover" />
                    <button type="button" onClick={() => setCatImageUrl('')} className="absolute inset-0 bg-black/60 text-white flex items-center justify-center text-xs font-bold">Remove</button>
                  </div>
                ) : (
                  <label className="cursor-pointer bg-gray-100 px-3 py-2 rounded-xl text-xs font-semibold text-gray-700 flex items-center space-x-1.5 border border-gray-300 w-fit">
                    <Upload className="w-4 h-4 text-[#5C0B26]" />
                    <span>Upload Banner</span>
                    <input type="file" accept="image/*" onChange={handleCreateImageUpload} className="hidden" />
                  </label>
                )}
              </div>
            )}

            {createStep === 4 && (
              <div className="space-y-2 bg-[#FAF8F5] p-4 rounded-xl border border-gray-200">
                <h4 className="font-serif font-bold text-xs text-[#2B1A1F]">Step 4: Review</h4>
                <p><span className="font-semibold">Name:</span> {catName || '—'}</p>
                <p><span className="font-semibold">Slug:</span> {catSlug || '—'}</p>
                <p><span className="font-semibold">Parent:</span> {createParentOptions.find(o => o.id === catParentId)?.label || 'Root Category'}</p>
              </div>
            )}
          </div>

          {/* Modal Action Controls */}
          <div className="flex justify-between items-center pt-4 border-t border-gray-100">
            <div className="md:hidden flex space-x-2">
              {createStep > 1 && (
                <Button type="button" variant="outline" onClick={() => setCreateStep(prev => (prev - 1) as any)}>
                  <ArrowLeft className="w-4 h-4 mr-1" /> Back
                </Button>
              )}
              {createStep < 4 && (
                <Button type="button" className="bg-[#5C0B26] text-white" onClick={() => setCreateStep(prev => (prev + 1) as any)}>
                  Next <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              )}
            </div>

            <div className="flex space-x-2 ml-auto">
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-[#5C0B26] hover:bg-[#8C3A57] text-white">
                Save Category
              </Button>
            </div>
          </div>
        </form>
      </Modal>

      {/* 5. Edit Category Modal (Desktop 2-Column Layout) */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title={`Edit Category: ${editingCategory?.name || ''}`}
      >
        <form onSubmit={handleEditSubmit} className="space-y-4 text-xs">
          {editFormError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl font-semibold flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
              <span>{editFormError}</span>
            </div>
          )}

          {/* Path Movement Preview */}
          {editingCategory && (
            <div className="p-3 bg-[#5C0B26]/5 rounded-xl border border-[#5C0B26]/10 space-y-1">
              <p className="font-semibold text-[#5C0B26] text-xs">Category Path Movement Preview:</p>
              <p className="text-gray-700 font-mono text-[11px]">
                <span className="font-bold">Proposed Path:</span>{' '}
                {editParentId
                  ? (editParentOptions.find(o => o.id === editParentId)?.label || 'Root') + ' > ' + (editName || editingCategory.name)
                  : editName || editingCategory.name}
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
            {/* Left Column (35% / 5 cols) — Hierarchy */}
            <div className="md:col-span-5 bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-3">
              <h4 className="font-serif font-bold text-xs text-[#2B1A1F] flex items-center space-x-1">
                <Layers className="w-4 h-4 text-[#5C0B26]" />
                <span>Category Hierarchy & Settings</span>
              </h4>

              <div>
                <label className="font-semibold text-gray-700 block mb-1">Parent Category</label>
                <select
                  value={editParentId || ''}
                  onChange={e => setEditParentId(e.target.value || null)}
                  className="w-full p-2.5 border border-gray-300 rounded-xl text-xs bg-white text-gray-900 focus:ring-[#5C0B26]"
                >
                  {editParentOptions.map(opt => (
                    <option key={opt.id || 'root'} value={opt.id || ''} disabled={opt.disabled}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-gray-500 mt-1">
                  Self and descendants are disabled to prevent circular loops.
                </p>
              </div>

              <div>
                <label className="font-semibold text-gray-700 block mb-1">Sort Order</label>
                <Input
                  type="number"
                  value={editDisplayOrder}
                  onChange={e => setEditDisplayOrder(e.target.value)}
                  min="0"
                />
              </div>

              <div>
                <label className="font-semibold text-gray-700 block mb-1">Storefront Visibility</label>
                <label className="flex items-center space-x-2 cursor-pointer mt-1">
                  <input
                    type="checkbox"
                    checked={editIsActive}
                    onChange={e => setEditIsActive(e.target.checked)}
                    className="w-4 h-4 text-[#5C0B26] focus:ring-[#5C0B26] rounded"
                  />
                  <span className="font-semibold text-xs text-gray-800">Active (Visible to Customers)</span>
                </label>
              </div>
            </div>

            {/* Right Column (65% / 7 cols) — Details */}
            <div className="md:col-span-7 space-y-3">
              <Input
                label="Category Name *"
                value={editName}
                onChange={e => setEditName(e.target.value)}
                required
              />

              <div>
                <Input
                  label="Slug *"
                  value={editSlug}
                  onChange={e => setEditSlug(e.target.value.toLowerCase())}
                  required
                />
                <p className="text-[10px] text-amber-700 mt-0.5 font-medium">
                  Warning: Changing published slug will alter customer URLs.
                </p>
              </div>

              <div>
                <label className="font-semibold text-[#2B1A1F] block mb-1">Description</label>
                <textarea
                  value={editDescription}
                  onChange={e => setEditDescription(e.target.value)}
                  rows={3}
                  className="w-full p-2.5 border border-gray-300 rounded-xl text-xs text-gray-900 bg-white focus:ring-[#5C0B26]"
                />
              </div>

              <div>
                <label className="font-semibold text-[#2B1A1F] block mb-1">Category Image</label>
                {editImageUrl ? (
                  <div className="relative w-24 h-24 rounded-xl border border-gray-200 overflow-hidden group">
                    <Image src={editImageUrl} alt="Category image" fill className="object-cover" />
                    <button
                      type="button"
                      onClick={() => setEditImageUrl('')}
                      className="absolute inset-0 bg-black/60 text-white opacity-0 group-hover:opacity-100 flex items-center justify-center text-xs font-bold transition-opacity"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center space-x-3">
                    <label className="cursor-pointer bg-gray-100 hover:bg-gray-200 px-3 py-2 rounded-xl text-xs font-semibold text-gray-700 flex items-center space-x-1.5 border border-gray-300">
                      <Upload className="w-4 h-4 text-[#5C0B26]" />
                      <span>{isUploadingEdit ? 'Uploading...' : 'Upload Image'}</span>
                      <input type="file" accept="image/*" onChange={handleEditImageUpload} className="hidden" />
                    </label>
                  </div>
                )}
                {uploadErrorEdit && <p className="text-rose-600 text-[10px] mt-1">{uploadErrorEdit}</p>}
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-100">
            <Button type="button" variant="outline" onClick={() => setIsEditModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" className="bg-[#5C0B26] hover:bg-[#8C3A57] text-white">
              Update Category
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Category Confirmation Modal */}
      {deletingCat && (
        <Modal isOpen={!!deletingCat} onClose={() => setDeletingCat(null)} title="Delete Category">
          <div className="space-y-4 pt-2 text-xs">
            <p className="text-gray-700">
              Are you sure you want to delete category <strong className="font-bold text-gray-900">&quot;{deletingCat.name}&quot;</strong>?
            </p>
            {categories.filter(c => c.parent_id === deletingCat.id).length > 0 && (
              <p className="text-amber-700 font-semibold bg-amber-50 p-2.5 rounded-xl border border-amber-200">
                Warning: This category has subcategories. Deleting it will reassign child categories to root level.
              </p>
            )}

            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-100">
              <Button type="button" variant="outline" onClick={() => setDeletingCat(null)}>
                Cancel
              </Button>
              <Button
                type="button"
                onClick={confirmDeleteCategory}
                disabled={isDeleting}
                className="bg-rose-700 hover:bg-rose-800 text-white"
              >
                {isDeleting ? 'Deleting...' : 'Delete Category'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
