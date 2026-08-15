'use client'

import React, { useEffect, useState, useMemo } from 'react'
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
  Search,
  AlertTriangle,
  Palette,
  Check,
  X
} from 'lucide-react'
import {
  getColorsAction,
  createColorAction,
  updateColorAction,
  deleteColorAction
} from '@/actions/catalog/actions'

interface ColorRow {
  id: string
  name: string
  slug: string
  hex_code: string
  display_order: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export default function AdminColorsPage() {
  const [colors, setColors] = useState<ColorRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [actionNotice, setActionNotice] = useState<string | null>(null)

  // Create/Edit modal states
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingColor, setEditingColor] = useState<ColorRow | null>(null)
  const [colorName, setColorName] = useState('')
  const [colorCode, setColorCode] = useState('')
  const [colorHex, setColorHex] = useState('')
  const [colorIsActive, setColorIsActive] = useState(true)
  const [colorDisplayOrder, setColorDisplayOrder] = useState('0')
  const [formError, setFormError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Delete modal states
  const [deletingColor, setDeletingColor] = useState<ColorRow | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const loadColors = async () => {
    setIsLoading(true)
    const res = await getColorsAction()
    if (res.data) {
      setColors(res.data as ColorRow[])
    }
    setIsLoading(false)
  }

  useEffect(() => {
    loadColors()
  }, [])

  const filteredColors = useMemo(() => {
    return colors.filter(c => {
      const matchesSearch =
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.slug.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.hex_code.toLowerCase().includes(searchQuery.toLowerCase())
      
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && c.is_active) ||
        (statusFilter === 'inactive' && !c.is_active)

      return matchesSearch && matchesStatus
    })
  }, [colors, searchQuery, statusFilter])

  const handleOpenAddModal = () => {
    setEditingColor(null)
    setColorName('')
    setColorCode('')
    setColorHex('#')
    setColorIsActive(true)
    setColorDisplayOrder('1')
    setFormError(null)
    setIsModalOpen(true)
  }

  const handleOpenEditModal = (color: ColorRow) => {
    setEditingColor(color)
    setColorName(color.name)
    setColorCode(color.slug.toUpperCase())
    setColorHex(color.hex_code)
    setColorIsActive(color.is_active)
    setColorDisplayOrder(String(color.display_order ?? 0))
    setFormError(null)
    setIsModalOpen(true)
  }

  const handleSaveColor = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)
    setIsSubmitting(true)

    const payload = {
      name: colorName,
      code: colorCode,
      hex_code: colorHex,
      is_active: colorIsActive,
      display_order: parseInt(colorDisplayOrder) || 0
    }

    let res: { success?: boolean; error?: string; data?: any }
    if (editingColor) {
      res = await updateColorAction(editingColor.id, payload)
    } else {
      res = await createColorAction(payload)
    }

    setIsSubmitting(false)
    if (res.error) {
      setFormError(res.error)
    } else {
      setIsModalOpen(false)
      loadColors()
    }
  }

  const handleDeleteClick = (color: ColorRow) => {
    setDeletingColor(color)
  }

  const handleConfirmDelete = async () => {
    if (!deletingColor) return
    setIsDeleting(true)
    const res = await deleteColorAction(deletingColor.id)
    setIsDeleting(false)
    setDeletingColor(null)

    if (res.error) {
      setActionNotice(res.error)
    } else {
      if (res.message) {
        setActionNotice(res.message)
      } else {
        setActionNotice('Colour deleted successfully.')
      }
      loadColors()
    }
  }

  // Helper to determine if hex is light (needs a border)
  const isLightColor = (hex: string) => {
    const cleanHex = hex.replace('#', '')
    if (cleanHex.length !== 6) return false
    const r = parseInt(cleanHex.substring(0, 2), 16)
    const g = parseInt(cleanHex.substring(2, 4), 16)
    const b = parseInt(cleanHex.substring(4, 6), 16)
    const brightness = (r * 299 + g * 587 + b * 114) / 1000
    return brightness > 220
  }

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto p-4 md:p-8">
      {/* 1. Header */}
      <AdminPageHeader
        title="Colour Palette Management"
        description="Manage available colour swatches, hex codes, and storefront options."
        actions={
          <Button onClick={handleOpenAddModal} className="bg-[#5C0B26] text-white text-xs">
            <Plus className="w-4 h-4 mr-1.5" />
            Add Colour
          </Button>
        }
      />

      {/* 2. Notices */}
      {actionNotice && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-center justify-between text-xs text-amber-900 shadow-sm">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 text-amber-700 flex-shrink-0" />
            <span>{actionNotice}</span>
          </div>
          <button onClick={() => setActionNotice(null)} className="text-gray-400 hover:text-gray-600 font-bold text-sm">
            &times;
          </button>
        </div>
      )}

      {/* 3. Search and Status Filters */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search color name, code or hex..."
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-[#5C0B26] focus:outline-none"
          />
        </div>

        <div className="flex items-center space-x-2 text-xs w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          {[
            { id: 'all', label: 'All Status' },
            { id: 'active', label: 'Active Only' },
            { id: 'inactive', label: 'Inactive Only' },
          ].map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setStatusFilter(tab.id as any)}
              className={`px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap transition-all cursor-pointer ${
                statusFilter === tab.id
                  ? 'bg-[#5C0B26] text-white'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* 4. Color Grid/List */}
      {isLoading ? (
        <TableSkeleton rows={6} />
      ) : filteredColors.length === 0 ? (
        <EmptyState
          title="No Colours Found"
          description="Try modifying your search or filters, or add a new color swatch."
          icon={Palette}
        />
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-600">
                  <th className="p-4 w-20">Swatch</th>
                  <th className="p-4">Colour Name</th>
                  <th className="p-4">Colour Code</th>
                  <th className="p-4">Hex Value</th>
                  <th className="p-4 w-32">Sort Order</th>
                  <th className="p-4 w-32">Status</th>
                  <th className="p-4 w-28 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-xs text-gray-700">
                {filteredColors.map(c => (
                  <tr key={c.id} className="hover:bg-amber-50/20 transition-colors">
                    <td className="p-4">
                      <div
                        className={`w-10 h-10 rounded-xl shadow-inner`}
                        style={{
                          backgroundColor: c.hex_code,
                          border: isLightColor(c.hex_code) ? '1px solid #d1d5db' : 'none'
                        }}
                        title={c.name}
                      />
                    </td>
                    <td className="p-4 font-semibold text-gray-900">{c.name}</td>
                    <td className="p-4">
                      <span className="font-mono bg-gray-100 text-gray-800 px-2 py-0.5 rounded uppercase font-semibold text-[10px]">
                        {c.slug.toUpperCase()}
                      </span>
                    </td>
                    <td className="p-4 font-mono text-gray-600">{c.hex_code.toUpperCase()}</td>
                    <td className="p-4 text-gray-600">{c.display_order ?? 0}</td>
                    <td className="p-4">
                      <StatusBadge status={c.is_active ? 'active' : 'inactive'} />
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end space-x-1.5">
                        <button
                          onClick={() => handleOpenEditModal(c)}
                          className="p-1.5 text-[#5C0B26] hover:bg-[#5C0B26]/10 rounded-lg transition-colors cursor-pointer"
                          title="Edit Swatch"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteClick(c)}
                          className="p-1.5 text-gray-400 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="Delete Swatch"
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
        </div>
      )}

      {/* 5. Create/Edit Modal */}
      {isModalOpen && (
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title={editingColor ? 'Edit Colour Swatch' : 'Add New Colour Swatch'}
        >
          <form onSubmit={handleSaveColor} className="space-y-4 pt-2">
            {formError && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-800 text-xs rounded-xl flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <div className="space-y-1">
              <label className="block text-xs font-semibold text-gray-700">Colour Name</label>
              <Input
                value={colorName}
                onChange={e => setColorName(e.target.value)}
                placeholder="e.g. Royal Maroon"
                required
                className="text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-gray-700">Colour Code</label>
                <Input
                  value={colorCode}
                  onChange={e => setColorCode(e.target.value.toUpperCase())}
                  placeholder="e.g. MRN"
                  required
                  className="text-xs font-mono uppercase"
                  maxLength={10}
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-gray-700">Hex Value</label>
                <div className="relative">
                  <Input
                    value={colorHex}
                    onChange={e => setColorHex(e.target.value)}
                    placeholder="#800000"
                    required
                    className="text-xs font-mono pl-3"
                  />
                  <div
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-md border border-gray-200 shadow-sm"
                    style={{ backgroundColor: colorHex.startsWith('#') ? colorHex : `#${colorHex}` }}
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 items-center">
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-gray-700">Sort Order</label>
                <Input
                  type="number"
                  value={colorDisplayOrder}
                  onChange={e => setColorDisplayOrder(e.target.value)}
                  placeholder="1"
                  className="text-xs"
                />
              </div>

              <div className="flex items-center space-x-2 pt-5">
                <input
                  type="checkbox"
                  id="color_active"
                  checked={colorIsActive}
                  onChange={e => setColorIsActive(e.target.checked)}
                  className="w-4 h-4 text-[#5C0B26] border-gray-300 rounded focus:ring-[#5C0B26] cursor-pointer"
                />
                <label htmlFor="color_active" className="text-xs font-semibold text-gray-700 cursor-pointer">
                  Active / Publish Option
                </label>
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-100">
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)} className="text-xs">
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting} className="bg-[#5C0B26] text-white text-xs">
                {isSubmitting ? 'Saving...' : 'Save Swatch'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* 6. Delete Confirmation Modal */}
      {deletingColor && (
        <Modal
          isOpen={!!deletingColor}
          onClose={() => setDeletingColor(null)}
          title="Confirm Swatch Deletion"
        >
          <div className="space-y-4 pt-2">
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start space-x-2.5 text-xs text-amber-800">
              <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="font-bold">Important Safeguard</span>
                <p className="leading-relaxed">
                  If this color is currently used by any active products or variants, it will not be hard-deleted.
                  It will be safely deactivated to preserve historical carts, orders, and sales reports.
                </p>
              </div>
            </div>

            <p className="text-xs text-gray-600">
              Are you sure you want to delete or deactivate the colour{' '}
              <strong>{deletingColor.name} ({deletingColor.slug.toUpperCase()})</strong>?
            </p>

            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-100">
              <Button type="button" variant="outline" onClick={() => setDeletingColor(null)} className="text-xs">
                Cancel
              </Button>
              <Button onClick={handleConfirmDelete} disabled={isDeleting} className="bg-rose-700 text-white text-xs hover:bg-rose-800">
                {isDeleting ? 'Deleting...' : 'Confirm Delete'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
