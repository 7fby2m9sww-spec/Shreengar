'use client'

import React, { useEffect, useState } from 'react'
import Image from 'next/image'
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
import { Plus, Trash2, Image as ImageIcon, Upload, Loader2, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react'
import { getBanners, createBanner, updateBanner, deleteBanner } from '@/services/admin'
import { HomepageBanner } from '@/types/database'
import { uploadHeroImageAction } from '@/actions/admin/uploadHeroImageAction'

export default function AdminBannersPage() {
  const [banners, setBanners] = useState<HomepageBanner[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingBanner, setEditingBanner] = useState<HomepageBanner | null>(null)

  // Form Fields
  const [title, setTitle] = useState('')
  const [subtitle, setSubtitle] = useState('')
  const [eyebrow, setEyebrow] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [mobileImageUrl, setMobileImageUrl] = useState('')
  const [imageAlt, setImageAlt] = useState('')
  const [ctaText, setCtaText] = useState('Explore Collection')
  const [ctaLink, setCtaLink] = useState('/shop')
  const [isActive, setIsActive] = useState(true)

  // Upload States
  const [isUploadingDesktop, setIsUploadingDesktop] = useState(false)
  const [isUploadingMobile, setIsUploadingMobile] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  const loadBanners = async () => {
    setIsLoading(true)
    try {
      const data = await getBanners()
      setBanners(data)
    } catch (e: any) {
      console.error('Failed to load banners:', e)
    }
    setIsLoading(false)
  }

  useEffect(() => {
    loadBanners()
  }, [])

  const openAddModal = () => {
    setEditingBanner(null)
    setTitle('Celebrate Every Moment in Shreengar')
    setSubtitle('Discover timeless Anarkalis, silk sarees, and handcrafted ethnic wear tailored for celebrations.')
    setEyebrow('Exquisite Handcrafted Indian Wear')
    setImageUrl('')
    setMobileImageUrl('')
    setImageAlt('Shreengar Royal Couture Hero Photograph')
    setCtaText('Explore Collection')
    setCtaLink('/shop')
    setIsActive(true)
    setErrorMessage(null)
    setSuccessMessage(null)
    setIsModalOpen(true)
  }

  const openEditModal = (banner: HomepageBanner) => {
    setEditingBanner(banner)
    setTitle(banner.title || '')
    setSubtitle(banner.subtitle || '')
    setEyebrow((banner as any).eyebrow || 'Exquisite Handcrafted Indian Wear')
    setImageUrl(banner.image_url || '')
    setMobileImageUrl((banner as any).mobile_image_url || '')
    setImageAlt((banner as any).image_alt || banner.title || '')
    setCtaText(banner.cta_text || 'Explore Collection')
    setCtaLink(banner.cta_link || '/shop')
    setIsActive(banner.is_active ?? true)
    setErrorMessage(null)
    setSuccessMessage(null)
    setIsModalOpen(true)
  }

  const handleDesktopFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setErrorMessage(null)
    setSuccessMessage(null)
    setIsUploadingDesktop(true)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const result = await uploadHeroImageAction(formData)

      if (result.success && result.url) {
        setImageUrl(result.url)
        setSuccessMessage('Desktop Hero photograph uploaded successfully!')
      } else {
        setErrorMessage(result.error || 'Failed to upload desktop image.')
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'An error occurred during upload.')
    } finally {
      setIsUploadingDesktop(false)
      e.target.value = ''
    }
  }

  const handleMobileFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setErrorMessage(null)
    setSuccessMessage(null)
    setIsUploadingMobile(true)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const result = await uploadHeroImageAction(formData)

      if (result.success && result.url) {
        setMobileImageUrl(result.url)
        setSuccessMessage('Mobile Hero photograph uploaded successfully!')
      } else {
        setErrorMessage(result.error || 'Failed to upload mobile image.')
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'An error occurred during upload.')
    } finally {
      setIsUploadingMobile(false)
      e.target.value = ''
    }
  }

  const handleSaveBanner = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    setErrorMessage(null)
    setSuccessMessage(null)

    const payload: any = {
      title: title.trim(),
      subtitle: subtitle.trim(),
      eyebrow: eyebrow.trim(),
      image_url: imageUrl.trim(),
      mobile_image_url: mobileImageUrl.trim() || null,
      image_alt: imageAlt.trim() || title.trim(),
      cta_text: ctaText.trim(),
      cta_link: ctaLink.trim(),
      display_order: editingBanner ? editingBanner.display_order : banners.length + 1,
      is_active: isActive,
    }

    let result
    if (editingBanner) {
      result = await updateBanner(editingBanner.id, payload)
    } else {
      result = await createBanner({
        ...payload,
        id: `ban-${Date.now()}`,
        created_at: new Date().toISOString(),
      })
    }

    setIsSaving(false)

    if (result.success) {
      setSuccessMessage('Hero banner saved successfully!')
      await loadBanners()
      setTimeout(() => {
        setIsModalOpen(false)
      }, 500)
    } else {
      setErrorMessage(result.error || 'Failed to save Hero banner.')
    }
  }

  const handleDelete = async (bannerId: string) => {
    if (!window.confirm('Are you sure you want to delete this Hero Banner?')) return
    const res = await deleteBanner(bannerId)
    if (res.success) {
      loadBanners()
    } else {
      alert(res.error || 'Failed to delete banner')
    }
  }

  const columns: Column<HomepageBanner>[] = [
    {
      header: 'Hero Slide',
      accessor: (row) => (
        <div className="flex items-center space-x-3">
          {row.image_url ? (
            <div className="relative w-16 h-10 rounded-lg overflow-hidden border border-[#5C0B26]/10 shadow-sm bg-rose-950">
              <Image
                src={row.image_url}
                alt={row.title}
                fill
                className="object-cover"
              />
            </div>
          ) : (
            <div className="w-16 h-10 bg-rose-950/20 border border-[#5C0B26]/10 rounded-lg flex items-center justify-center font-bold text-[10px] text-[#5C0B26] dark:text-[#FFF4DC]">
              No Image
            </div>
          )}
          <div>
            <h4 className="font-serif font-bold text-xs text-[#2B1A1F] dark:text-[#FFF4DC] line-clamp-1">{row.title}</h4>
            <span className="text-[10px] text-[#7A6B70] dark:text-[#D7C0B5] line-clamp-1">{row.subtitle}</span>
          </div>
        </div>
      ),
    },
    {
      header: 'CTA Action',
      accessor: (row) => (
        <span className="font-semibold text-xs text-rose-950 dark:text-[#FFF4DC]">
          {row.cta_text} &rarr; ({row.cta_link})
        </span>
      ),
    },
    {
      header: 'Display Order',
      accessor: (row) => <span className="font-mono font-bold text-xs text-[#2B1A1F]">Slide #{row.display_order}</span>,
    },
    {
      header: 'Status',
      accessor: (row) => <StatusBadge status={row.is_active ? 'active' : 'inactive'} />,
    },
  ]

  const filteredBanners = banners.filter(b =>
    b.title.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Homepage Hero Banners"
        description="Configure dynamic image-led Hero campaign slides, call-to-action buttons, and mobile image overrides."
        badgeText={`${banners.length} Active Slides`}
        actions={
          <Button onClick={openAddModal} variant="primary" className="bg-[#5C0B26] hover:bg-[#8C3A57] text-[#FFF4DC] border border-amber-400/30">
            <Plus className="w-4 h-4 mr-1 text-[#D4AF37]" /> Add Hero Slide
          </Button>
        }
      />

      <SearchAndFilterBar
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search hero banner title..."
      />

      {isLoading ? (
        <TableSkeleton rows={4} />
      ) : filteredBanners.length === 0 ? (
        <EmptyState
          title="No Hero Banners Found"
          description="Upload an image and configure call-to-action buttons for your storefront Hero."
          icon={ImageIcon}
          action={
            <Button onClick={openAddModal} variant="primary" className="bg-[#5C0B26] text-[#FFF4DC]">
              <Plus className="w-4 h-4 mr-1 text-[#D4AF37]" /> Add First Hero Slide
            </Button>
          }
        />
      ) : (
        <div className="bg-white dark:bg-[#211318] rounded-2xl border border-[#5C0B26]/10 shadow-sm overflow-hidden p-2">
          <DataTable
            columns={columns}
            data={filteredBanners}
            actions={(row) => (
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => openEditModal(row)}
                  className="px-2.5 py-1 text-xs font-bold text-[#5C0B26] dark:text-[#D4AF37] hover:bg-[#5C0B26]/10 rounded-lg transition-colors"
                >
                  Edit Slide
                </button>
                <button
                  onClick={() => handleDelete(row.id)}
                  className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                  title="Delete Banner"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )}
          />
        </div>
      )}

      {/* ADMIN HERO BANNER EDITOR MODAL */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingBanner ? 'Edit Homepage Hero Banner' : 'Add Homepage Hero Banner'}>
        <form onSubmit={handleSaveBanner} className="space-y-5 max-h-[80vh] overflow-y-auto pr-1">
          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* 1. DESKTOP HERO IMAGE UPLOADER */}
          <div className="space-y-2 border-b pb-4">
            <label className="block text-xs font-bold text-gray-800 dark:text-amber-100">
              Desktop Hero Photograph <span className="text-amber-600">*</span>
            </label>
            <div className="flex flex-col sm:flex-row gap-4 items-start">
              {imageUrl ? (
                <div className="relative w-full sm:w-48 aspect-[16/9] rounded-lg overflow-hidden border border-amber-500/30 bg-rose-950 group">
                  <Image src={imageUrl} alt="Desktop Hero Preview" fill className="object-cover" />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center space-x-2">
                    <button
                      type="button"
                      onClick={() => setImageUrl('')}
                      className="p-1.5 bg-rose-600 text-white rounded-md text-xs font-bold hover:bg-rose-700"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ) : (
                <div className="w-full sm:w-48 aspect-[16/9] rounded-lg border-2 border-dashed border-gray-300 dark:border-rose-900 bg-gray-50 dark:bg-rose-950/30 flex flex-col items-center justify-center p-3 text-center">
                  <ImageIcon className="w-6 h-6 text-gray-400 mb-1" />
                  <span className="text-[10px] text-gray-500 font-medium">No Desktop Image</span>
                </div>
              )}

              <div className="space-y-2 flex-1">
                <div className="flex items-center space-x-2">
                  <label className="cursor-pointer inline-flex items-center space-x-2 px-3 py-2 bg-[#5C0B26] hover:bg-[#8C3A57] text-[#FFF4DC] text-xs font-bold rounded-lg shadow-sm transition-colors">
                    {isUploadingDesktop ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Uploading...</span>
                      </>
                    ) : (
                      <>
                        <Upload className="w-3.5 h-3.5" />
                        <span>{imageUrl ? 'Replace Desktop Photograph' : 'Upload Desktop Photograph'}</span>
                      </>
                    )}
                    <input
                      type="file"
                      accept="image/jpeg,image/jpg,image/png,image/webp,image/avif"
                      onChange={handleDesktopFileSelect}
                      disabled={isUploadingDesktop}
                      className="hidden"
                    />
                  </label>
                  {imageUrl && (
                    <button
                      type="button"
                      onClick={() => setImageUrl('')}
                      className="text-xs font-bold text-rose-600 hover:text-rose-700"
                    >
                      Remove
                    </button>
                  )}
                </div>
                <p className="text-[10px] text-gray-500">
                  Accepted formats: JPG, PNG, WebP, AVIF (Max 10MB). SVG & HEIC are rejected.
                </p>
                <Input
                  label="Or enter Image URL directly"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://..."
                  className="text-xs"
                />
              </div>
            </div>
          </div>

          {/* 2. MOBILE HERO IMAGE UPLOADER */}
          <div className="space-y-2 border-b pb-4">
            <label className="block text-xs font-bold text-gray-800 dark:text-amber-100">
              Mobile Hero Photograph <span className="text-gray-400 font-normal">(Optional Override)</span>
            </label>
            <div className="flex flex-col sm:flex-row gap-4 items-start">
              {mobileImageUrl ? (
                <div className="relative w-28 aspect-[3/4] rounded-lg overflow-hidden border border-amber-500/30 bg-rose-950 group">
                  <Image src={mobileImageUrl} alt="Mobile Hero Preview" fill className="object-cover" />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <button
                      type="button"
                      onClick={() => setMobileImageUrl('')}
                      className="p-1 bg-rose-600 text-white rounded text-[10px] font-bold"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ) : (
                <div className="w-28 aspect-[3/4] rounded-lg border-2 border-dashed border-gray-300 dark:border-rose-900 bg-gray-50 dark:bg-rose-950/30 flex flex-col items-center justify-center p-2 text-center">
                  <ImageIcon className="w-5 h-5 text-gray-400 mb-1" />
                  <span className="text-[9px] text-gray-500 font-medium">Uses Desktop Fallback</span>
                </div>
              )}

              <div className="space-y-2 flex-1">
                <div className="flex items-center space-x-2">
                  <label className="cursor-pointer inline-flex items-center space-x-2 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-white text-xs font-bold rounded-lg shadow-sm transition-colors">
                    {isUploadingMobile ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Uploading...</span>
                      </>
                    ) : (
                      <>
                        <Upload className="w-3.5 h-3.5" />
                        <span>{mobileImageUrl ? 'Replace Mobile Override' : 'Upload Mobile Override'}</span>
                      </>
                    )}
                    <input
                      type="file"
                      accept="image/jpeg,image/jpg,image/png,image/webp,image/avif"
                      onChange={handleMobileFileSelect}
                      disabled={isUploadingMobile}
                      className="hidden"
                    />
                  </label>
                  {mobileImageUrl && (
                    <button
                      type="button"
                      onClick={() => setMobileImageUrl('')}
                      className="text-xs font-bold text-rose-600 hover:text-rose-700"
                    >
                      Clear Mobile Override
                    </button>
                  )}
                </div>
                <Input
                  label="Or enter Mobile Image URL"
                  value={mobileImageUrl}
                  onChange={(e) => setMobileImageUrl(e.target.value)}
                  placeholder="https://..."
                  className="text-xs"
                />
              </div>
            </div>
          </div>

          {/* 3. HERO CONTENT METADATA */}
          <div className="space-y-3">
            <Input
              label="Image Alt Text"
              value={imageAlt}
              onChange={(e) => setImageAlt(e.target.value)}
              placeholder="e.g. Handcrafted Rose Anarkali Bridal Suit Model Photo"
              required
            />

            <Input
              label="Eyebrow Badge Text"
              value={eyebrow}
              onChange={(e) => setEyebrow(e.target.value)}
              placeholder="e.g. Exquisite Handcrafted Indian Wear"
            />

            <Input
              label="Hero Headline Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Celebrate Every Moment in Shreengar"
              required
            />

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Hero Subtitle / Campaign Description</label>
              <textarea
                value={subtitle}
                onChange={(e) => setSubtitle(e.target.value)}
                placeholder="Discover timeless Anarkalis, silk sarees, and handcrafted ethnic wear tailored for celebrations."
                className="w-full p-2.5 text-xs rounded-lg border border-gray-300 dark:border-rose-900 bg-white dark:bg-rose-950/40 focus:ring-[#5C0B26] focus:border-[#5C0B26]"
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Input
                label="CTA Button Label"
                value={ctaText}
                onChange={(e) => setCtaText(e.target.value)}
                placeholder="e.g. Explore Collection"
                required
              />
              <Input
                label="CTA Link Destination"
                value={ctaLink}
                onChange={(e) => setCtaLink(e.target.value)}
                placeholder="e.g. /shop or /collection/festive"
                required
              />
            </div>

            <label className="flex items-center space-x-2 pt-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="rounded text-[#5C0B26] focus:ring-[#5C0B26]"
              />
              <span className="text-xs font-bold text-gray-800 dark:text-amber-100">Hero Slide Active</span>
            </label>
          </div>

          <div className="flex justify-end space-x-2 pt-4 border-t border-[#5C0B26]/10">
            <Button variant="outline" type="button" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={isSaving || isUploadingDesktop || isUploadingMobile} className="bg-[#5C0B26] text-[#FFF4DC]">
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <span>Save Hero Banner</span>
              )}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
