'use client'

import React, { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import {
  AdminPageHeader,
  StatusBadge,
  EmptyState,
  TableSkeleton,
} from '@/components/admin/AdminUI'
import { DataTable, Column } from '@/components/ui/DataTable'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Plus, Trash2, Layers, Search, AlertTriangle, Info, RefreshCw, X } from 'lucide-react'
import {
  getProductFamiliesAction,
  createProductFamilyAction,
  deleteProductFamilyAction,
  getCategoriesAction
} from '@/actions/catalog/actions'
import { ProductFamily, Category } from '@/types/database'

export default function ProductFamiliesPage() {
  const [families, setFamilies] = useState<ProductFamily[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [pageError, setPageError] = useState<string | null>(null)
  const [isMigrationPending, setIsMigrationPending] = useState(false)

  // Create Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [familyName, setFamilyName] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [internalRef, setInternalRef] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [modalError, setModalError] = useState<string | null>(null)

  // Delete Modal State
  const [deletingFamily, setDeletingFamily] = useState<ProductFamily | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const fetchFamilies = useCallback(async () => {
    setIsLoading(true)
    setPageError(null)
    try {
      const res = await getProductFamiliesAction()
      if ('data' in res && res.data) {
        setFamilies(res.data)
        setIsMigrationPending(false)
      } else if ('error' in res && res.error) {
        setPageError(res.error)
        if (res.error.includes('migration')) {
          setIsMigrationPending(true)
        }
      }
    } catch (err: any) {
      console.error('Failed to load product families:', err)
      setPageError('Unable to load product families.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchFamilies()
    getCategoriesAction().then(res => {
      if (res && 'data' in res && res.data) setCategories(res.data)
    })
  }, [fetchFamilies])

  const handleCreateFamily = async (e: React.FormEvent) => {
    e.preventDefault()
    setModalError(null)

    if (!familyName.trim()) {
      setModalError('Please enter a family name.')
      return
    }

    setIsSubmitting(true)
    try {
      const res = await createProductFamilyAction(familyName.trim(), categoryId || null, internalRef || null)
      if ('data' in res && res.data) {
        const selectedCat = categories.find(c => c.id === categoryId)
        const familyWithCatName = {
          ...res.data,
          categoryName: selectedCat ? selectedCat.name : null
        }
        setFamilies(prev => [...prev, familyWithCatName])
        setIsCreateModalOpen(false)
        setFamilyName('')
        setCategoryId('')
        setInternalRef('')
      } else {
        setModalError(('error' in res && res.error) ? res.error : 'Failed to create product family.')
      }
    } catch (err: any) {
      setModalError(err.message || 'Error creating product family.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const confirmDeleteFamily = async () => {
    if (!deletingFamily) return
    setIsDeleting(true)
    try {
      const res = await deleteProductFamilyAction(deletingFamily.id)
      if (res.success) {
        setFamilies(prev => prev.filter(f => f.id !== deletingFamily.id))
        setDeletingFamily(null)
      } else {
        setPageError(res.error || 'Failed to delete product family.')
      }
    } catch (err: any) {
      setPageError(err.message || 'Error deleting product family.')
    } finally {
      setIsDeleting(false)
    }
  }

  const filteredFamilies = families.filter(f =>
    f.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (f.categoryName && f.categoryName.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (f.internal_reference && f.internal_reference.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  const columns: Column<ProductFamily>[] = [
    {
      header: 'Family Name',
      accessor: (f) => (
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-[#5C0B26]/10 text-[#5C0B26] flex items-center justify-center flex-shrink-0">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <p className="font-semibold text-xs text-[#2B1A1F]">{f.name}</p>
            <p className="text-[10px] text-gray-500 font-mono">ID: {f.id.substring(0, 8)}...</p>
          </div>
        </div>
      )
    },
    {
      header: 'Category',
      accessor: (f) => (
        <span className="text-xs font-medium text-gray-700 bg-gray-100 px-2 py-0.5 rounded">
          {f.categoryName || 'Unassigned / Any'}
        </span>
      )
    },
    {
      header: 'Internal Reference',
      accessor: (f) => (
        <span className="text-xs text-gray-600 font-mono">
          {f.internal_reference || '—'}
        </span>
      )
    },
    {
      header: 'Status',
      accessor: (f) => (
        <StatusBadge status={f.is_active ? 'active' : 'draft'} />
      )
    },
    {
      header: 'Created At',
      accessor: (f) => (
        <span className="text-xs text-gray-500">
          {new Date(f.created_at).toLocaleDateString()}
        </span>
      )
    },
    {
      header: 'Actions',
      accessor: (f) => (
        <div className="flex items-center space-x-2">
          <Link
            href={`/admin/products?familyId=${f.id}`}
            className="p-1 text-[#5C0B26] hover:bg-[#5C0B26]/10 rounded font-semibold text-xs"
            title="View linked colourways"
          >
            View Garments
          </Link>
          <button
            type="button"
            onClick={() => setDeletingFamily(f)}
            className="p-1 text-gray-400 hover:text-rose-700 hover:bg-rose-50 rounded"
            title="Delete product family"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      )
    }
  ]

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <AdminPageHeader
        title="Product Families"
        description="Manage garment colourway families and category associations."
        badgeText={`${families.length} Families`}
        actions={
          <Button
            onClick={() => {
              setModalError(null)
              setIsCreateModalOpen(true)
            }}
            disabled={isMigrationPending}
            className="bg-[#5C0B26] hover:bg-[#8C3A57] text-[#FAF8F5] text-xs px-4 py-2 rounded-xl flex items-center space-x-1.5 shadow-sm"
          >
            <Plus className="w-4 h-4 text-[#D4AF37]" />
            <span>Create Family</span>
          </Button>
        }
      />

      {/* Migration Pending Error Banner */}
      {isMigrationPending && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-amber-900 text-xs flex items-center justify-between shadow-2xs">
          <div className="flex items-center space-x-3">
            <Info className="w-5 h-5 text-amber-600 flex-shrink-0" />
            <div>
              <h4 className="font-bold text-sm">Product Family Features Unavailable</h4>
              <p className="text-amber-700">
                Product Family features are unavailable because the required database migration has not been applied.
              </p>
            </div>
          </div>
          <Button onClick={fetchFamilies} variant="outline" className="text-xs bg-white">
            <RefreshCw className="w-3.5 h-3.5 mr-1" />
            Retry Check
          </Button>
        </div>
      )}

      {/* General Page Error Banner */}
      {pageError && !isMigrationPending && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
            <span>{pageError}</span>
          </div>
          <button type="button" onClick={() => setPageError(null)} className="text-rose-500 hover:text-rose-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
        <div className="relative max-w-md w-full">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Search family name or category..."
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-[#5C0B26] focus:outline-none"
          />
        </div>
      </div>

      {/* Table Section */}
      {isLoading ? (
        <div className="space-y-4">
          <div className="flex items-center space-x-2 text-xs text-gray-500">
            <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#5C0B26]" />
            <span>Loading Product Families…</span>
          </div>
          <TableSkeleton rows={6} />
        </div>
      ) : isMigrationPending ? (
        <div className="bg-white p-8 rounded-2xl border border-gray-200 text-center space-y-3">
          <Layers className="w-10 h-10 text-gray-400 mx-auto" />
          <h3 className="font-serif font-bold text-base text-gray-900">Migration Required</h3>
          <p className="text-xs text-gray-500 max-w-md mx-auto">
            Apply the pending migration <code className="bg-gray-100 px-1 py-0.5 rounded font-mono text-[11px]">20260720213000_product_colourway_groups.sql</code> to enable Product Family management.
          </p>
        </div>
      ) : pageError && !isMigrationPending ? (
        <div className="bg-rose-50 border border-rose-200 p-8 rounded-2xl text-center space-y-4 shadow-sm">
          <AlertTriangle className="w-8 h-8 text-rose-600 mx-auto" />
          <h3 className="font-serif font-bold text-base text-rose-900">Unable to load Product Families.</h3>
          <p className="text-xs text-rose-700">{pageError}</p>
          <Button onClick={fetchFamilies} className="bg-[#5C0B26] hover:bg-[#8C3A57] text-[#FAF8F5] text-xs px-4 py-2 rounded-xl">
            <RefreshCw className="w-3.5 h-3.5 mr-1.5 inline" />
            Retry
          </Button>
        </div>
      ) : families.length === 0 ? (
        <EmptyState
          title="No Product Families exist."
          description="Create your first colourway family group to link matching garments."
          action={
            <Button
              onClick={() => {
                setModalError(null)
                setIsCreateModalOpen(true)
              }}
              className="bg-[#5C0B26] text-white text-xs"
            >
              Create Family
            </Button>
          }
        />
      ) : filteredFamilies.length === 0 ? (
        <div className="bg-white p-8 rounded-2xl border border-gray-200 text-center space-y-2">
          <Layers className="w-8 h-8 text-gray-400 mx-auto" />
          <h4 className="font-bold text-sm text-gray-700">No matching product families found</h4>
          <p className="text-xs text-gray-500">Try adjusting your search terms.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
          <DataTable data={filteredFamilies} columns={columns} />
        </div>
      )}

      {/* Create Modal */}
      <Modal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} title="Create Product Family">
        <form onSubmit={handleCreateFamily} className="space-y-4 pt-2">
          {modalError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-semibold flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
              <span>{modalError}</span>
            </div>
          )}

          <Input
            label="Family Name *"
            value={familyName}
            onChange={e => setFamilyName(e.target.value)}
            placeholder="e.g. Royal Silk Anarkali Collection"
            required
          />

          <div>
            <label className="font-semibold text-xs text-gray-800 block mb-1">
              Category Association (Optional)
            </label>
            <select
              value={categoryId}
              onChange={e => setCategoryId(e.target.value)}
              className="w-full p-2.5 border border-gray-300 rounded-xl text-xs bg-white text-gray-900 focus:ring-2 focus:ring-[#5C0B26]"
            >
              <option value="">Any / Universal Category</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          <Input
            label="Internal Reference (Optional)"
            value={internalRef}
            onChange={e => setInternalRef(e.target.value)}
            placeholder="e.g. FAM-ANK-2026"
          />

          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsCreateModalOpen(false)}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-[#5C0B26] hover:bg-[#8C3A57] text-white text-xs"
            >
              {isSubmitting ? 'Creating...' : 'Create Family'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      {deletingFamily && (
        <Modal isOpen={!!deletingFamily} onClose={() => setDeletingFamily(null)} title="Delete Product Family">
          <div className="space-y-4 pt-2">
            <p className="text-xs text-gray-700">
              Are you sure you want to delete product family <strong className="font-bold text-gray-900">&quot;{deletingFamily.name}&quot;</strong>?
            </p>
            <p className="text-[11px] text-gray-500">
              Linked products will become standalone/ungrouped. No products or inventory will be deleted.
            </p>

            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-100">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDeletingFamily(null)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={confirmDeleteFamily}
                disabled={isDeleting}
                className="bg-rose-700 hover:bg-rose-800 text-white text-xs"
              >
                {isDeleting ? 'Deleting...' : 'Delete Family'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
