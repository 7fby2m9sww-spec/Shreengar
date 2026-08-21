'use client'

import React, { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import {
  AdminPageHeader,
  StatusBadge,
} from '@/components/admin/AdminUI'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import {
  Plus,
  Trash2,
  Save,
  ChevronUp,
  ChevronDown,
  Layout,
  Layers,
  Settings,
  Calendar,
  AlertTriangle,
  Loader2,
  FileText,
  Upload,
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
  Info,
  Sparkles
} from 'lucide-react'
import {
  getAdminHomepageLayoutAction,
  saveHomepageSectionAction,
  createHomepageSectionAction,
  deleteHomepageSectionAction,
  getHomepageManagerOptionsAction,
  updateSectionsOrderAction
} from '@/actions/homepage/actions'
import { updateCollectionAction } from '@/actions/catalog/actions'
import { uploadHeroImageAction } from '@/actions/admin/uploadHeroImageAction'

export default function AdminHomepageManagerPage() {
  const [sections, setSections] = useState<any[]>([])
  const [collections, setCollections] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [banners, setBanners] = useState<any[]>([])
  const [blogs, setBlogs] = useState<any[]>([])

  const [isLoading, setIsLoading] = useState(true)
  const [isSavingSectionId, setIsSavingSectionId] = useState<string | null>(null)
  
  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editingSection, setEditingSection] = useState<any | null>(null)

  // Edit fields
  const [editTitle, setEditTitle] = useState('')
  const [editSubtitle, setEditSubtitle] = useState('')
  const [editIsEnabled, setEditIsEnabled] = useState(true)
  const [editDesktopEnabled, setEditDesktopEnabled] = useState(true)
  const [editMobileEnabled, setEditMobileEnabled] = useState(true)
  const [startsAt, setStartsAt] = useState('')
  const [endsAt, setEndsAt] = useState('')

  // Hero-specific upload, metadata, and focal position fields inside Section Editor
  const [editHeroDesktopImage, setEditHeroDesktopImage] = useState('')
  const [editHeroMobileImage, setEditHeroMobileImage] = useState('')
  const [editHeroImageAlt, setEditHeroImageAlt] = useState('')
  const [editHeroEyebrow, setEditHeroEyebrow] = useState('')
  const [editHeroCtaText, setEditHeroCtaText] = useState('')
  const [editHeroCtaLink, setEditHeroCtaLink] = useState('')

  // Focal positioning controls
  const [editDesktopPosX, setEditDesktopPosX] = useState('72%')
  const [editDesktopPosY, setEditDesktopPosY] = useState('center')
  const [editMobilePosX, setEditMobilePosX] = useState('center')
  const [editMobilePosY, setEditMobilePosY] = useState('center')
  const [editPositionPreset, setEditPositionPreset] = useState('right')

  const handlePositionChange = (val: string) => {
    setEditPositionPreset(val)
    if (val === 'left') {
      setEditDesktopPosX('25%')
      setEditDesktopPosY('center')
      setEditMobilePosX('left')
      setEditMobilePosY('center')
    } else if (val === 'center') {
      setEditDesktopPosX('center')
      setEditDesktopPosY('center')
      setEditMobilePosX('center')
      setEditMobilePosY('center')
    } else if (val === 'right') {
      setEditDesktopPosX('72%')
      setEditDesktopPosY('center')
      setEditMobilePosX('right')
      setEditMobilePosY('center')
    } else if (val === 'top') {
      setEditDesktopPosX('center')
      setEditDesktopPosY('top')
      setEditMobilePosX('center')
      setEditMobilePosY('top')
    } else if (val === 'bottom') {
      setEditDesktopPosX('center')
      setEditDesktopPosY('bottom')
      setEditMobilePosX('center')
      setEditMobilePosY('bottom')
    }
  }

  // Ref pointers to preview containers to measure width/height for drag scale
  const desktopDragContainerRef = useRef<HTMLDivElement>(null)
  const mobileDragContainerRef = useRef<HTMLDivElement>(null)

  // Scale states
  const [editDesktopScale, setEditDesktopScale] = useState(1.0)
  const [editMobileScale, setEditMobileScale] = useState(1.0)

  // Translates in percent
  const [editDesktopTX, setEditDesktopTX] = useState(0)
  const [editDesktopTY, setEditDesktopTY] = useState(0)
  const [editMobileTX, setEditMobileTX] = useState(0)
  const [editMobileTY, setEditMobileTY] = useState(0)

  const [previewTab, setPreviewTab] = useState<'desktop' | 'mobile'>('desktop')

  // Helper to parse coordinate string (e.g. "12.5%", "72%", "center") to numeric percent
  const parseTranslatePercent = (val: string): number => {
    const clean = (val || '').trim()
    if (clean.endsWith('%')) {
      const num = parseFloat(clean)
      return isNaN(num) ? 0 : num
    }
    return 0
  }

  // Active dragging session reference
  const dragSessionRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    startTX: number;
    startTY: number;
    containerWidth: number;
    containerHeight: number;
    naturalWidth: number;
    naturalHeight: number;
    scale: number;
  } | null>(null)

  // Unified Pointer Down handler
  const handlePointerDown = (
    e: React.PointerEvent<HTMLDivElement>,
    device: 'desktop' | 'mobile'
  ) => {
    // Only handle left mouse click or touch
    if (e.button !== 0 && e.pointerType === 'mouse') return
    
    const container = e.currentTarget
    container.setPointerCapture(e.pointerId)

    const imgEl = container.querySelector('img')
    if (!imgEl) return

    const rect = container.getBoundingClientRect()
    const naturalWidth = imgEl.naturalWidth || rect.width
    const naturalHeight = imgEl.naturalHeight || rect.height

    const scale = device === 'desktop' ? editDesktopScale : editMobileScale
    const startTX = device === 'desktop' ? editDesktopTX : editMobileTX
    const startTY = device === 'desktop' ? editDesktopTY : editMobileTY

    dragSessionRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      startTX,
      startTY,
      containerWidth: rect.width,
      containerHeight: rect.height,
      naturalWidth,
      naturalHeight,
      scale
    }
  }

  // Unified Pointer Move handler with boundary clamping
  const handlePointerMove = (
    e: React.PointerEvent<HTMLDivElement>,
    device: 'desktop' | 'mobile'
  ) => {
    const session = dragSessionRef.current
    if (!session || session.pointerId !== e.pointerId) return

    const deltaX = e.clientX - session.startX
    const deltaY = e.clientY - session.startY

    // Calculate delta in percentage units relative to container size
    const deltaTXPercent = (deltaX / session.containerWidth) * 100
    const deltaTYPercent = (deltaY / session.containerHeight) * 100

    const nextTX = session.startTX + deltaTXPercent
    const nextTY = session.startTY + deltaTYPercent

    // Calculate maximum bounds to prevent blank space/gaps
    const F = Math.max(session.containerWidth / session.naturalWidth, session.containerHeight / session.naturalHeight)
    const W_v = session.naturalWidth * F * session.scale
    const H_v = session.naturalHeight * F * session.scale

    const dx_max = Math.max(0, (W_v - session.containerWidth) / 2)
    const dy_max = Math.max(0, (H_v - session.containerHeight) / 2)

    const limitXPercent = (dx_max / session.containerWidth) * 100
    const limitYPercent = (dy_max / session.containerHeight) * 100

    const clampedTX = Math.max(-limitXPercent, Math.min(limitXPercent, nextTX))
    const clampedTY = Math.max(-limitYPercent, Math.min(limitYPercent, nextTY))

    if (device === 'desktop') {
      setEditDesktopTX(clampedTX)
      setEditDesktopTY(clampedTY)
      setEditDesktopPosX(`${clampedTX.toFixed(2)}%`)
      setEditDesktopPosY(`${clampedTY.toFixed(2)}%`)
    } else {
      setEditMobileTX(clampedTX)
      setEditMobileTY(clampedTY)
      setEditMobilePosX(`${clampedTX.toFixed(2)}%`)
      setEditMobilePosY(`${clampedTY.toFixed(2)}%`)
    }
  }

  // Unified Pointer Up handler
  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const session = dragSessionRef.current
    if (session && session.pointerId === e.pointerId) {
      e.currentTarget.releasePointerCapture(e.pointerId)
      dragSessionRef.current = null
    }
  }

  // Zoom manipulation with automatic clamping
  const updateZoom = (device: 'desktop' | 'mobile', newScale: number) => {
    const scale = Math.max(1.0, Math.min(3.0, newScale))
    if (device === 'desktop') {
      setEditDesktopScale(scale)
      clampTranslatesOnZoomChange(device, scale)
    } else {
      setEditMobileScale(scale)
      clampTranslatesOnZoomChange(device, scale)
    }
  }

  const adjustZoom = (device: 'desktop' | 'mobile', step: number) => {
    const current = device === 'desktop' ? editDesktopScale : editMobileScale
    updateZoom(device, current + step)
  }

  const clampTranslatesOnZoomChange = (device: 'desktop' | 'mobile', nextScale: number) => {
    const ref = device === 'desktop' ? desktopDragContainerRef : mobileDragContainerRef
    if (!ref.current) return

    const imgEl = ref.current.querySelector('img')
    if (!imgEl) return

    const rect = ref.current.getBoundingClientRect()
    const naturalWidth = imgEl.naturalWidth || rect.width
    const naturalHeight = imgEl.naturalHeight || rect.height

    const currentTX = device === 'desktop' ? editDesktopTX : editMobileTX
    const currentTY = device === 'desktop' ? editDesktopTY : editMobileTY

    const F = Math.max(rect.width / naturalWidth, rect.height / naturalHeight)
    const W_v = naturalWidth * F * nextScale
    const H_v = naturalHeight * F * nextScale

    const dx_max = Math.max(0, (W_v - rect.width) / 2)
    const dy_max = Math.max(0, (H_v - rect.height) / 2)

    const limitXPercent = (dx_max / rect.width) * 100
    const limitYPercent = (dy_max / rect.height) * 100

    const clampedTX = Math.max(-limitXPercent, Math.min(limitXPercent, currentTX))
    const clampedTY = Math.max(-limitYPercent, Math.min(limitYPercent, currentTY))

    if (device === 'desktop') {
      setEditDesktopTX(clampedTX)
      setEditDesktopTY(clampedTY)
      setEditDesktopPosX(`${clampedTX.toFixed(2)}%`)
      setEditDesktopPosY(`${clampedTY.toFixed(2)}%`)
    } else {
      setEditMobileTX(clampedTX)
      setEditMobileTY(clampedTY)
      setEditMobilePosX(`${clampedTX.toFixed(2)}%`)
      setEditMobilePosY(`${clampedTY.toFixed(2)}%`)
    }
  }

  const [isUploadingHeroDesktop, setIsUploadingHeroDesktop] = useState(false)
  const [isUploadingHeroMobile, setIsUploadingHeroMobile] = useState(false)
  const [heroUploadError, setHeroUploadError] = useState<string | null>(null)
  const [heroUploadSuccess, setHeroUploadSuccess] = useState<string | null>(null)
  
  // Blog article search query state
  const [blogSearchQuery, setBlogSearchQuery] = useState('')
  const [blogsError, setBlogsError] = useState<string | null>(null)
  
  // Selected items state inside edit modal
  const [selectedItems, setSelectedItems] = useState<any[]>([])

  // Add Section form fields
  const [newType, setNewType] = useState<'hero_banner' | 'category_grid' | 'collections' | 'products' | 'blog_articles'>('collections')
  const [newTitle, setNewTitle] = useState('')
  const [newSubtitle, setNewSubtitle] = useState('')

  const loadData = async () => {
    setIsLoading(true)
    const layoutRes = await getAdminHomepageLayoutAction()
    const optionsRes = await getHomepageManagerOptionsAction()

    if (layoutRes.data) {
      setSections(layoutRes.data)
    }
    if (optionsRes.data) {
      setCollections(optionsRes.data.collections)
      setProducts(optionsRes.data.products)
      setBanners(optionsRes.data.banners)
      setBlogs(optionsRes.data.blogs)
      setBlogsError(optionsRes.data.blogsError || null)
    }
    setIsLoading(false)
  }

  useEffect(() => {
    loadData()
  }, [])

  const handlePublishCollection = async (col: any) => {
    if (!window.confirm(`Are you sure you want to publish the "${col.name}" collection?`)) return
    const res = await updateCollectionAction(col.id, {
      name: col.name,
      slug: col.slug,
      description: col.description || '',
      image_url: col.image_url || '',
      is_featured: !!col.is_featured,
      status: 'published',
      sort_order: col.sort_order || 0,
      seo_title: col.seo_title || '',
      seo_description: col.seo_description || '',
      published_at: new Date().toISOString()
    })
    if (res.success) {
      loadData()
    } else {
      alert(res.error || 'Failed to publish collection')
    }
  }

  const handleMoveUp = async (idx: number) => {
    if (idx <= 1 || sections[idx]?.section_type === 'hero_banner') return
    const updated = [...sections]
    const temp = updated[idx]
    updated[idx] = updated[idx - 1]
    updated[idx - 1] = temp

    const orders = updated.map((sec, i) => ({
      id: sec.id,
      sort_order: i === 0 ? 1 : i + 1
    }))

    setSections(updated.map((sec, i) => ({ ...sec, sort_order: i === 0 ? 1 : i + 1 })))
    await updateSectionsOrderAction(orders)
  }

  const handleMoveDown = async (idx: number) => {
    if (idx === 0 || idx >= sections.length - 1 || sections[idx]?.section_type === 'hero_banner') return
    const updated = [...sections]
    const temp = updated[idx]
    updated[idx] = updated[idx + 1]
    updated[idx + 1] = temp

    const orders = updated.map((sec, i) => ({
      id: sec.id,
      sort_order: i === 0 ? 1 : i + 1
    }))

    setSections(updated.map((sec, i) => ({ ...sec, sort_order: i === 0 ? 1 : i + 1 })))
    await updateSectionsOrderAction(orders)
  }

  const handleOpenEdit = (section: any) => {
    setEditingSection(section)
    setEditTitle(section.title || '')
    setEditSubtitle(section.subtitle || '')
    setEditIsEnabled(section.is_enabled !== false)
    setEditDesktopEnabled(section.desktop_enabled !== false)
    setEditMobileEnabled(section.mobile_enabled !== false)
    setStartsAt(section.starts_at ? new Date(section.starts_at).toISOString().slice(0, 16) : '')
    setEndsAt(section.ends_at ? new Date(section.ends_at).toISOString().slice(0, 16) : '')
    setSelectedItems(section.items || [])
    setBlogSearchQuery('')

    // Hero-specific settings
    const settings = section.settings || {}
    setEditHeroDesktopImage(settings.desktop_image_url || settings.image_url || '')
    setEditHeroMobileImage(settings.mobile_image_url || '')
    setEditHeroImageAlt(settings.image_alt || section.title || '')
    setEditHeroEyebrow(settings.eyebrow || 'EXQUISITE HANDCRAFTED INDIAN WEAR')
    setEditHeroCtaText(settings.cta_text || 'Explore Collection')
    setEditHeroCtaLink(settings.cta_link || '/shop')

    // Focal positioning settings
    const dxVal = settings.desktop_position_x || '0%'
    const dyVal = settings.desktop_position_y || '0%'
    const mxVal = settings.mobile_position_x || '0%'
    const myVal = settings.mobile_position_y || '0%'

    setEditDesktopPosX(dxVal)
    setEditDesktopPosY(dyVal)
    setEditMobilePosX(mxVal)
    setEditMobilePosY(myVal)

    // Set translation numbers
    setEditDesktopTX(parseTranslatePercent(dxVal))
    setEditDesktopTY(parseTranslatePercent(dyVal))
    setEditMobileTX(parseTranslatePercent(mxVal))
    setEditMobileTY(parseTranslatePercent(myVal))

    setEditDesktopScale(typeof settings.desktop_scale === 'number' ? settings.desktop_scale : 1.0)
    setEditMobileScale(typeof settings.mobile_scale === 'number' ? settings.mobile_scale : 1.0)

    setHeroUploadError(null)
    setHeroUploadSuccess(null)

    setIsEditModalOpen(true)
  }

  const handleAddSection = async (e: React.FormEvent) => {
    e.preventDefault()
    const maxOrder = sections.reduce((max, s) => Math.max(max, s.sort_order || 0), 0)
    const newSection = {
      section_type: newType,
      title: newTitle || null,
      subtitle: newSubtitle || null,
      sort_order: maxOrder + 10,
      is_enabled: false,
      desktop_enabled: true,
      mobile_enabled: true,
      settings: {}
    }

    const res = await createHomepageSectionAction(newSection)
    if (res.success) {
      setIsAddModalOpen(false)
      setNewTitle('')
      setNewSubtitle('')
      loadData()
    } else {
      alert(res.error || 'Failed to create section')
    }
  }

  const handleDeleteSection = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this homepage section?')) return
    const res = await deleteHomepageSectionAction(id)
    if (res.success) {
      loadData()
    } else {
      alert(res.error || 'Failed to delete section')
    }
  }

  const handleDesktopFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setHeroUploadError(null)
    setHeroUploadSuccess(null)
    setIsUploadingHeroDesktop(true)

    try {
      const formData = new FormData()
      formData.append('file', file)
      const result = await uploadHeroImageAction(formData)

      if (result.success && result.url) {
        setEditHeroDesktopImage(result.url)
        setHeroUploadSuccess('Desktop Hero photograph uploaded successfully!')
      } else {
        setHeroUploadError(result.error || 'Failed to upload desktop image.')
      }
    } catch (err: any) {
      setHeroUploadError(err.message || 'Error uploading file.')
    } finally {
      setIsUploadingHeroDesktop(false)
      e.target.value = ''
    }
  }

  const handleMobileFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setHeroUploadError(null)
    setHeroUploadSuccess(null)
    setIsUploadingHeroMobile(true)

    try {
      const formData = new FormData()
      formData.append('file', file)
      const result = await uploadHeroImageAction(formData)

      if (result.success && result.url) {
        setEditHeroMobileImage(result.url)
        setHeroUploadSuccess('Mobile Hero photograph uploaded successfully!')
      } else {
        setHeroUploadError(result.error || 'Failed to upload mobile image.')
      }
    } catch (err: any) {
      setHeroUploadError(err.message || 'Error uploading file.')
    } finally {
      setIsUploadingHeroMobile(false)
      e.target.value = ''
    }
  }

  const handleSaveSection = async () => {
    if (!editingSection) return
    setIsSavingSectionId(editingSection.id)
    
    const sectionData = {
      title: editTitle || null,
      subtitle: editSubtitle || null,
      is_enabled: editIsEnabled,
      desktop_enabled: editDesktopEnabled,
      mobile_enabled: editMobileEnabled,
      starts_at: startsAt ? new Date(startsAt).toISOString() : null,
      ends_at: endsAt ? new Date(endsAt).toISOString() : null,
      settings: editingSection.section_type === 'hero_banner' ? {
        desktop_image_url: editHeroDesktopImage.trim(),
        mobile_image_url: editHeroMobileImage.trim(),
        image_alt: editHeroImageAlt.trim(),
        eyebrow: editHeroEyebrow.trim(),
        cta_text: editHeroCtaText.trim(),
        cta_link: editHeroCtaLink.trim(),
        desktop_position_x: editDesktopPosX,
        desktop_position_y: editDesktopPosY,
        mobile_position_x: editMobilePosX,
        mobile_position_y: editMobilePosY,
        desktop_scale: editDesktopScale,
        mobile_scale: editMobileScale
      } : (editingSection.settings || {})
    }

    const res = await saveHomepageSectionAction(editingSection.id, sectionData, selectedItems)
    setIsSavingSectionId(null)
    if (res.success) {
      setIsEditModalOpen(false)
      loadData()
    } else {
      alert(res.error || 'Failed to save section')
    }
  }

  return (
    <div className="space-y-6 pb-12">
      <AdminPageHeader
        title="Homepage Layout Manager"
        description="Design and structure the dynamic storefront homepage layout"
        actions={
          <Button onClick={() => setIsAddModalOpen(true)} className="bg-[#5C0B26] hover:bg-[#5C0B26]/90 text-white font-serif font-bold text-xs flex items-center space-x-2">
            <Plus className="w-4 h-4" />
            <span>Add Layout Section</span>
          </Button>
        }
      />

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-24 space-y-4">
          <Loader2 className="w-12 h-12 text-[#5C0B26] animate-spin" />
          <p className="text-sm font-serif font-bold text-gray-700">Loading Homepage Layout Configurations...</p>
        </div>
      ) : (
        <div className="space-y-4">
          {sections.map((section, idx) => (
            <div
              key={section.id}
              className={`bg-white rounded-2xl border transition-all p-5 ${
                section.is_enabled ? 'border-[#5C0B26]/15 shadow-sm' : 'border-gray-200 opacity-75 bg-gray-50/50'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="p-3 bg-[#5C0B26]/5 rounded-xl border border-[#5C0B26]/10 text-[#5C0B26]">
                    <Layout className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h3 className="font-serif font-bold text-base text-gray-900">
                        {section.title || section.section_type.replace('_', ' ').toUpperCase()}
                      </h3>
                      {section.section_type === 'hero_banner' ? (
                        <span className="px-2 py-0.5 text-[10px] font-bold text-amber-700 bg-amber-500/10 rounded border border-amber-500/20">
                          Fixed at position 1
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 text-[10px] uppercase font-bold text-[#5C0B26] bg-[#5C0B26]/10 rounded border border-[#5C0B26]/20">
                          {section.section_type}
                        </span>
                      )}
                      <StatusBadge status={section.is_enabled ? 'active' : 'inactive'} />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {section.subtitle || 'No subtitle configured.'} • Items: {section.items?.length || 0}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleMoveUp(idx)}
                    disabled={idx <= 1 || section.section_type === 'hero_banner'}
                    className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronUp className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleMoveDown(idx)}
                    disabled={idx === 0 || idx === sections.length - 1 || section.section_type === 'hero_banner'}
                    className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronDown className="w-4 h-4" />
                  </button>
                  <Button
                    onClick={() => handleOpenEdit(section)}
                    variant="outline"
                    className="text-xs border-[#5C0B26]/30 text-[#5C0B26] hover:bg-[#5C0B26]/5"
                  >
                    <Settings className="w-3.5 h-3.5 mr-1" /> Configure Section
                  </Button>
                  {section.section_type !== 'hero_banner' && (
                    <button
                      onClick={() => handleDeleteSection(section.id)}
                      className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 1. ADD SECTION MODAL */}
      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Add Layout Section">
        <form onSubmit={handleAddSection} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Section Type</label>
            <select
              value={newType}
              onChange={(e: any) => setNewType(e.target.value)}
              className="w-full p-2.5 text-xs rounded-lg border border-gray-300 bg-white"
            >
              <option value="hero_banner">Hero Banner</option>
              <option value="category_grid">Category Grid</option>
              <option value="collections">Collections</option>
              <option value="products">Products</option>
              <option value="blog_articles">Blog Articles</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Heading Title</label>
            <Input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="e.g. Festive Collections"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Subtitle</label>
            <Input
              value={newSubtitle}
              onChange={(e) => setNewSubtitle(e.target.value)}
              placeholder="e.g. Timeless luxury handpicked for you"
            />
          </div>

          <div className="flex justify-end space-x-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setIsAddModalOpen(false)}>Cancel</Button>
            <Button type="submit" className="bg-[#5C0B26] text-white">Create Section</Button>
          </div>
        </form>
      </Modal>

      {/* 2. EDIT SECTION MODAL */}
      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title={`Configure Section: ${editingSection?.section_type.replace('_', ' ').toUpperCase()}`}>
        <div className="space-y-6 max-h-[80vh] overflow-y-auto pr-2">
          
          {/* General Metadata */}
          <div className="space-y-4">
            <h3 className="font-serif font-bold text-sm text-[#5C0B26] border-b pb-1">1. Section Metadata</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-semibold text-gray-700 mb-1">Heading / Title</label>
                <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} placeholder="Section Title" />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-gray-700 mb-1">Subtitle / Description</label>
                <Input value={editSubtitle} onChange={(e) => setEditSubtitle(e.target.value)} placeholder="Section Subtitle" />
              </div>
            </div>

            {/* HERO-SPECIFIC IMAGE UPLOADER & METADATA */}
            {editingSection?.section_type === 'hero_banner' && (
              <div className="space-y-6">
                <div className="p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/30 rounded-lg text-xs text-blue-900 dark:text-blue-200 flex items-start space-x-2">
                  <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                  <p>
                    <strong>Luxury Campaign Image Guidance:</strong> Upload separate visual assets for desktop and mobile layouts. Click and drag the images within their preview frames to adjust their alignment.
                  </p>
                </div>

                {heroUploadError && (
                  <div className="p-2.5 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/30 text-rose-800 dark:text-rose-200 rounded text-xs flex items-center space-x-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                    <span>{heroUploadError}</span>
                  </div>
                )}

                {heroUploadSuccess && (
                  <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/30 text-emerald-800 dark:text-emerald-200 rounded text-xs flex items-center space-x-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                    <span>{heroUploadSuccess}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Desktop Banner Config */}
                  <div className="space-y-3 p-4 bg-gray-50 dark:bg-zinc-900/40 rounded-xl border border-gray-100 dark:border-zinc-800">
                    <div className="flex items-center justify-between border-b border-gray-200 dark:border-zinc-800 pb-2">
                      <h4 className="font-serif font-bold text-xs text-[#5C0B26] dark:text-[#FFF4DC]">DESKTOP BANNER</h4>
                      {editHeroDesktopImage && (
                        <button
                          type="button"
                          onClick={() => {
                            setEditDesktopTX(0)
                            setEditDesktopTY(0)
                            setEditDesktopScale(1.0)
                            setEditDesktopPosX('0%')
                            setEditDesktopPosY('0%')
                          }}
                          className="text-[10px] text-[#5C0B26] dark:text-rose-400 font-bold hover:underline"
                        >
                          [ Reset Position ]
                        </button>
                      )}
                    </div>

                    <div className="space-y-3">
                      {/* Interactive Drag Container */}
                      {editHeroDesktopImage ? (
                        <div
                          ref={desktopDragContainerRef}
                          onPointerDown={(e) => handlePointerDown(e, 'desktop')}
                          onPointerMove={(e) => handlePointerMove(e, 'desktop')}
                          onPointerUp={handlePointerUp}
                          onPointerCancel={handlePointerUp}
                          className="relative w-full aspect-[16/7] rounded-lg border dark:border-zinc-700 bg-rose-950 overflow-hidden shadow-sm cursor-grab active:cursor-grabbing select-none touch-none"
                          style={{ touchAction: 'none' }}
                        >
                          <Image
                            src={editHeroDesktopImage}
                            alt="Desktop Position Editor"
                            fill
                            draggable={false}
                            className="object-cover pointer-events-none"
                            style={{
                              transform: `translate3d(${editDesktopTX}%, ${editDesktopTY}%, 0) scale(${editDesktopScale})`,
                              transformOrigin: 'center center'
                            }}
                          />
                          <div className="absolute inset-0 bg-black/10 hover:bg-transparent pointer-events-none transition-colors" />
                        </div>
                      ) : (
                        <div className="w-full aspect-[16/7] rounded-lg border border-dashed border-gray-300 dark:border-zinc-700 flex items-center justify-center text-xs text-gray-400 dark:text-zinc-500 bg-white dark:bg-zinc-900/30">
                          No Desktop Image (Renders Branded Fallback)
                        </div>
                      )}

                      <div className="text-[11px] text-gray-500 dark:text-zinc-400 italic text-center sm:text-left">
                        Drag image inside frame to align (↔ left/right, ↕ up/down)
                      </div>

                      {/* Zoom Controls */}
                      <div className="space-y-1">
                        <label className="block text-[10px] font-bold text-gray-700 dark:text-zinc-300">Zoom</label>
                        <div className="flex items-center space-x-2">
                          <button
                            type="button"
                            onClick={() => adjustZoom('desktop', -0.1)}
                            className="p-1 px-2.5 bg-gray-200 dark:bg-zinc-700 hover:bg-gray-300 dark:hover:bg-zinc-600 rounded text-xs font-bold"
                          >
                            −
                          </button>
                          <input
                            type="range"
                            min="1.0"
                            max="3.0"
                            step="0.05"
                            value={editDesktopScale}
                            onChange={(e) => updateZoom('desktop', parseFloat(e.target.value))}
                            className="w-full h-1 bg-gray-200 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-[#5C0B26]"
                          />
                          <button
                            type="button"
                            onClick={() => adjustZoom('desktop', 0.1)}
                            className="p-1 px-2.5 bg-gray-200 dark:bg-zinc-700 hover:bg-gray-300 dark:hover:bg-zinc-600 rounded text-xs font-bold"
                          >
                            +
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2 pt-1">
                        <label className="cursor-pointer inline-flex items-center space-x-1.5 px-3 py-1.5 bg-[#5C0B26] text-white text-xs font-bold rounded hover:bg-[#8C3A57] transition-colors">
                          {isUploadingHeroDesktop ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              <span>Uploading...</span>
                            </>
                          ) : (
                            <>
                              <Upload className="w-3.5 h-3.5" />
                              <span>{editHeroDesktopImage ? 'Replace Image' : 'Upload Image'}</span>
                            </>
                          )}
                          <input
                            type="file"
                            accept="image/jpeg,image/jpg,image/png,image/webp,image/avif"
                            onChange={handleDesktopFileSelect}
                            disabled={isUploadingHeroDesktop}
                            className="hidden"
                          />
                        </label>
                        {editHeroDesktopImage && (
                          <button type="button" onClick={() => setEditHeroDesktopImage('')} className="text-xs text-rose-600 dark:text-rose-400 font-bold hover:underline">
                            Remove Image
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Mobile Banner Config */}
                  <div className="space-y-3 p-4 bg-gray-50 dark:bg-zinc-900/40 rounded-xl border border-gray-100 dark:border-zinc-800">
                    <div className="flex items-center justify-between border-b border-gray-200 dark:border-zinc-800 pb-2">
                      <h4 className="font-serif font-bold text-xs text-[#5C0B26] dark:text-[#FFF4DC]">MOBILE BANNER</h4>
                      {(editHeroMobileImage || editHeroDesktopImage) && (
                        <button
                          type="button"
                          onClick={() => {
                            setEditMobileTX(0)
                            setEditMobileTY(0)
                            setEditMobileScale(1.0)
                            setEditMobilePosX('0%')
                            setEditMobilePosY('0%')
                          }}
                          className="text-[10px] text-[#5C0B26] dark:text-rose-400 font-bold hover:underline"
                        >
                          [ Reset Position ]
                        </button>
                      )}
                    </div>

                    <div className="space-y-3">
                      {/* Interactive Drag Container */}
                      {(editHeroMobileImage || editHeroDesktopImage) ? (
                        <div
                          ref={mobileDragContainerRef}
                          onPointerDown={(e) => handlePointerDown(e, 'mobile')}
                          onPointerMove={(e) => handlePointerMove(e, 'mobile')}
                          onPointerUp={handlePointerUp}
                          onPointerCancel={handlePointerUp}
                          className="relative w-44 aspect-[3/4] rounded-lg border dark:border-zinc-700 bg-rose-950 overflow-hidden shadow-sm cursor-grab active:cursor-grabbing select-none touch-none mx-auto"
                          style={{ touchAction: 'none' }}
                        >
                          <Image
                            src={editHeroMobileImage || editHeroDesktopImage}
                            alt="Mobile Position Editor"
                            fill
                            draggable={false}
                            className="object-cover pointer-events-none"
                            style={{
                              transform: `translate3d(${editMobileTX}%, ${editMobileTY}%, 0) scale(${editMobileScale})`,
                              transformOrigin: 'center center'
                            }}
                          />
                          <div className="absolute inset-0 bg-black/10 hover:bg-transparent pointer-events-none transition-colors" />
                        </div>
                      ) : (
                        <div className="w-44 aspect-[3/4] rounded-lg border border-dashed border-gray-300 dark:border-zinc-700 flex items-center justify-center text-xs text-gray-400 dark:text-zinc-500 bg-white dark:bg-zinc-900/30 mx-auto">
                          Desktop Fallback
                        </div>
                      )}

                      <div className="text-[11px] text-gray-500 dark:text-zinc-400 italic text-center">
                        Drag image inside frame to align (↔ left/right, ↕ up/down)
                      </div>

                      {/* Zoom Controls */}
                      <div className="space-y-1 max-w-xs mx-auto">
                        <label className="block text-[10px] font-bold text-gray-700 dark:text-zinc-300 text-center sm:text-left">Zoom</label>
                        <div className="flex items-center space-x-2">
                          <button
                            type="button"
                            onClick={() => adjustZoom('mobile', -0.1)}
                            className="p-1 px-2.5 bg-gray-200 dark:bg-zinc-700 hover:bg-gray-300 dark:hover:bg-zinc-600 rounded text-xs font-bold"
                          >
                            −
                          </button>
                          <input
                            type="range"
                            min="1.0"
                            max="3.0"
                            step="0.05"
                            value={editMobileScale}
                            onChange={(e) => updateZoom('mobile', parseFloat(e.target.value))}
                            className="w-full h-1 bg-gray-200 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-[#5C0B26]"
                          />
                          <button
                            type="button"
                            onClick={() => adjustZoom('mobile', 0.1)}
                            className="p-1 px-2.5 bg-gray-200 dark:bg-zinc-700 hover:bg-gray-300 dark:hover:bg-zinc-600 rounded text-xs font-bold"
                          >
                            +
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center justify-center space-x-2 pt-1">
                        <label className="cursor-pointer inline-flex items-center space-x-1.5 px-3 py-1.5 bg-[#5C0B26] text-white text-xs font-bold rounded hover:bg-[#8C3A57] transition-colors">
                          {isUploadingHeroMobile ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              <span>Uploading...</span>
                            </>
                          ) : (
                            <>
                              <Upload className="w-3.5 h-3.5" />
                              <span>{editHeroMobileImage ? 'Replace Mobile Image' : 'Upload Mobile Image'}</span>
                            </>
                          )}
                          <input
                            type="file"
                            accept="image/jpeg,image/jpg,image/png,image/webp,image/avif"
                            onChange={handleMobileFileSelect}
                            disabled={isUploadingHeroMobile}
                            className="hidden"
                          />
                        </label>
                        {editHeroMobileImage && (
                          <button type="button" onClick={() => setEditHeroMobileImage('')} className="text-xs text-rose-600 dark:text-rose-400 font-bold hover:underline">
                            Remove Image
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Previews Tabs */}
                <div className="space-y-3 p-4 bg-gray-50 dark:bg-zinc-900/40 rounded-xl border border-gray-100 dark:border-zinc-800">
                  <div className="flex items-center justify-between border-b border-gray-200 dark:border-zinc-800 pb-2">
                    <h4 className="font-serif font-bold text-xs text-[#5C0B26] dark:text-[#FFF4DC]">PREVIEW</h4>
                    <div className="flex space-x-1">
                      <button
                        type="button"
                        onClick={() => setPreviewTab('desktop')}
                        className={`px-3 py-1 text-xs font-bold rounded transition-colors ${
                          previewTab === 'desktop'
                            ? 'bg-[#5C0B26] text-white'
                            : 'bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-300 border dark:border-zinc-700 hover:bg-gray-100 dark:hover:bg-zinc-700'
                        }`}
                      >
                        Desktop Preview
                      </button>
                      <button
                        type="button"
                        onClick={() => setPreviewTab('mobile')}
                        className={`px-3 py-1 text-xs font-bold rounded transition-colors ${
                          previewTab === 'mobile'
                            ? 'bg-[#5C0B26] text-white'
                            : 'bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-300 border dark:border-zinc-700 hover:bg-gray-100 dark:hover:bg-zinc-700'
                        }`}
                      >
                        Mobile Preview
                      </button>
                    </div>
                  </div>

                  <div className="pt-2 flex justify-center">
                    {previewTab === 'desktop' ? (
                      /* Real Desktop Overlaid Preview Mockup */
                      <div className="relative w-full max-w-3xl aspect-[16/7] rounded-xl overflow-hidden bg-rose-950 border shadow-md flex items-center">
                        {editHeroDesktopImage ? (
                          <Image
                            src={editHeroDesktopImage}
                            alt="Desktop Mockup"
                            fill
                            className="object-cover"
                            style={{
                              transform: `translate3d(${editDesktopTX}%, ${editDesktopTY}%, 0) scale(${editDesktopScale})`,
                              transformOrigin: 'center center'
                            }}
                          />
                        ) : (
                          <div className="absolute inset-0 bg-[#23000C]" />
                        )}
                        <div className="absolute inset-0 bg-gradient-to-r from-rose-950/80 via-rose-950/40 to-transparent pointer-events-none" />
                        <div className="relative z-10 px-6 max-w-sm space-y-2 pointer-events-none">
                          {editHeroEyebrow && (
                            <span className="text-[9px] tracking-widest font-bold text-amber-300 uppercase block">{editHeroEyebrow}</span>
                          )}
                          <h2 className="text-sm font-serif font-bold text-[#FFF4DC] leading-snug">
                            {editTitle || 'Celebrate Every Moment in Shreengar'}
                          </h2>
                          <p className="text-[9px] text-zinc-300 line-clamp-2">
                            {editSubtitle || 'Discover timeless Anarkalis, silk sarees, and handcrafted ethnic wear.'}
                          </p>
                          <div className="pt-1">
                            <span className="inline-block px-3 py-1 bg-amber-400 text-rose-950 text-[9px] font-bold uppercase rounded-sm">
                              {editHeroCtaText || 'Explore'}
                            </span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* Real Mobile Overlaid Preview Mockup */
                      <div className="relative w-64 aspect-[3/4] rounded-2xl overflow-hidden bg-rose-950 border-4 border-gray-800 shadow-lg flex items-end pb-8">
                        {editHeroMobileImage || editHeroDesktopImage ? (
                          <Image
                            src={editHeroMobileImage || editHeroDesktopImage}
                            alt="Mobile Mockup"
                            fill
                            className="object-cover"
                            style={{
                              transform: `translate3d(${editMobileTX}%, ${editMobileTY}%, 0) scale(${editMobileScale})`,
                              transformOrigin: 'center center'
                            }}
                          />
                        ) : (
                          <div className="absolute inset-0 bg-[#23000C]" />
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-rose-950/90 via-rose-950/30 to-transparent pointer-events-none" />
                        <div className="relative z-10 px-4 w-full text-center space-y-1.5 pointer-events-none">
                          {editHeroEyebrow && (
                            <span className="text-[8px] tracking-wider font-bold text-amber-300 uppercase block">{editHeroEyebrow}</span>
                          )}
                          <h2 className="text-xs font-serif font-bold text-[#FFF4DC] leading-tight">
                            {editTitle || 'Celebrate Every Moment in Shreengar'}
                          </h2>
                          <div className="pt-1 flex justify-center">
                            <span className="inline-block px-2.5 py-1 bg-amber-400 text-rose-950 text-[8px] font-bold uppercase rounded-sm">
                              {editHeroCtaText || 'Explore'}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Advanced Settings section */}
                <details className="border border-gray-200 dark:border-zinc-800 rounded-lg p-3 bg-gray-50 dark:bg-zinc-900/30 cursor-pointer">
                  <summary className="text-xs font-semibold text-gray-700 dark:text-zinc-300 select-none">Advanced Settings</summary>
                  <div className="pt-4 space-y-4 cursor-default" onClick={e => e.stopPropagation()}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <Input
                        label="Desktop Image URL"
                        value={editHeroDesktopImage}
                        onChange={(e) => setEditHeroDesktopImage(e.target.value)}
                        placeholder="Image URL"
                        className="text-xs"
                      />
                      <Input
                        label="Mobile Image URL"
                        value={editHeroMobileImage}
                        onChange={(e) => setEditHeroMobileImage(e.target.value)}
                        placeholder="Mobile Override URL"
                        className="text-xs"
                      />
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pt-1 text-[11px] text-gray-700 dark:text-zinc-300">
                      <div>
                        <label className="block font-bold mb-0.5">Desktop X</label>
                        <Input value={editDesktopPosX} onChange={e => setEditDesktopPosX(e.target.value)} className="text-xs" />
                      </div>
                      <div>
                        <label className="block font-bold mb-0.5">Desktop Y</label>
                        <Input value={editDesktopPosY} onChange={e => setEditDesktopPosY(e.target.value)} className="text-xs" />
                      </div>
                      <div>
                        <label className="block font-bold mb-0.5">Mobile X</label>
                        <Input value={editMobilePosX} onChange={e => setEditMobilePosX(e.target.value)} className="text-xs" />
                      </div>
                      <div>
                        <label className="block font-bold mb-0.5">Mobile Y</label>
                        <Input value={editMobilePosY} onChange={e => setEditMobilePosY(e.target.value)} className="text-xs" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 pt-2">
                      <Input label="Eyebrow Badge" value={editHeroEyebrow} onChange={(e) => setEditHeroEyebrow(e.target.value)} placeholder="EXQUISITE HANDCRAFTED INDIAN WEAR" />
                      <Input label="Image Alt Text" value={editHeroImageAlt} onChange={(e) => setEditHeroImageAlt(e.target.value)} placeholder="Hero photograph description" />
                      <Input label="CTA Label" value={editHeroCtaText} onChange={(e) => setEditHeroCtaText(e.target.value)} placeholder="Explore Collection" />
                      <Input label="CTA Link" value={editHeroCtaLink} onChange={(e) => setEditHeroCtaLink(e.target.value)} placeholder="/shop" />
                    </div>
                  </div>
                </details>
              </div>
            )}

            {/* BLOG-SPECIFIC SELECTION AREA */}
            {editingSection?.section_type === 'blog_articles' && (
              <div className="p-4 bg-amber-500/10 border border-amber-400/30 rounded-xl space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-serif font-bold text-xs text-[#5C0B26]">Homepage Blog Articles Selection</h4>
                  <span className="text-[10px] font-bold text-amber-800 bg-amber-200/50 px-2 py-0.5 rounded border border-amber-300">
                    Selected: {selectedItems.length} / 3 Max
                  </span>
                </div>
                <p className="text-xs text-gray-600">Select up to 3 published articles to showcase on the Homepage Style Journal section.</p>

                {/* Selected Articles List */}
                <div className="space-y-2">
                  <label className="block text-[11px] font-bold text-gray-800">Selected Articles Order ({selectedItems.length})</label>
                  {selectedItems.length === 0 ? (
                    <div className="p-3 bg-white border border-dashed rounded-lg text-center text-xs text-gray-500">
                      No blog articles selected yet. Search and add published articles below.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {selectedItems.map((item: any, idx: number) => {
                        const blog = blogs.find(b => b.id === item.entity_id) || item.resolvedEntity
                        const title = blog?.title || `Blog Article (${item.entity_id.slice(0, 8)})`
                        const date = blog?.published_at ? new Date(blog.published_at).toLocaleDateString() : 'Published'
                        const isPub = blog ? blog.is_published !== false : true

                        return (
                          <div key={item.entity_id || idx} className="flex items-center justify-between p-3 bg-white rounded-lg border shadow-sm">
                            <div className="flex items-center space-x-3 min-w-0">
                              <span className="w-5 h-5 rounded-full bg-[#5C0B26]/10 text-[#5C0B26] font-bold text-[10px] flex items-center justify-center shrink-0">
                                {idx + 1}
                              </span>
                              {blog?.cover_image ? (
                                <div className="relative w-10 h-10 rounded overflow-hidden shrink-0 bg-rose-950">
                                  <Image src={blog.cover_image} alt={title} fill className="object-cover" />
                                </div>
                              ) : (
                                <div className="w-10 h-10 rounded bg-rose-950/20 border flex items-center justify-center shrink-0">
                                  <FileText className="w-5 h-5 text-[#5C0B26]" />
                                </div>
                              )}
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-gray-900 truncate">{title}</p>
                                <div className="flex items-center space-x-2 text-[10px] text-gray-500">
                                  <span>{date}</span>
                                  <span>•</span>
                                  <StatusBadge status={isPub ? 'active' : 'inactive'} />
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center space-x-1 shrink-0">
                              <button
                                type="button"
                                onClick={() => {
                                  if (idx === 0) return
                                  const updated = [...selectedItems]
                                  const temp = updated[idx]
                                  updated[idx] = updated[idx - 1]
                                  updated[idx - 1] = temp
                                  setSelectedItems(updated.map((it, i) => ({ ...it, sort_order: i + 1 })))
                                }}
                                disabled={idx === 0}
                                className="p-1 text-gray-500 hover:bg-gray-100 rounded disabled:opacity-30"
                              >
                                <ChevronUp className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  if (idx === selectedItems.length - 1) return
                                  const updated = [...selectedItems]
                                  const temp = updated[idx]
                                  updated[idx] = updated[idx + 1]
                                  updated[idx + 1] = temp
                                  setSelectedItems(updated.map((it, i) => ({ ...it, sort_order: i + 1 })))
                                }}
                                disabled={idx === selectedItems.length - 1}
                                className="p-1 text-gray-500 hover:bg-gray-100 rounded disabled:opacity-30"
                              >
                                <ChevronDown className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  const updated = selectedItems.filter((_, i) => i !== idx)
                                  setSelectedItems(updated.map((it, i) => ({ ...it, sort_order: i + 1 })))
                                }}
                                className="p-1 text-rose-600 hover:bg-rose-50 rounded"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>

                {/* Search & Add Available Published Articles */}
                <div className="space-y-2 pt-2 border-t border-amber-300/30">
                  <label className="block text-[11px] font-bold text-gray-800">Search & Select Published Articles</label>
                  <Input
                    value={blogSearchQuery}
                    onChange={(e) => setBlogSearchQuery(e.target.value)}
                    placeholder="Search published Blog articles..."
                    className="text-xs"
                  />

                  <div className="max-h-48 overflow-y-auto space-y-1.5 pt-1">
                    {blogsError ? (
                      <div className="p-3 text-center text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg">
                        Blog articles could not be loaded because the configured Blog database table is unavailable. ({blogsError})
                      </div>
                    ) : (() => {
                      const publishedBlogs = blogs
                      const unselectedPublishedBlogs = publishedBlogs.filter(b => !selectedItems.some(item => item.entity_id === b.id))

                      if (publishedBlogs.length === 0) {
                        return (
                          <div className="p-3 text-center text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg">
                            No published Blog articles are available. Publish an article from Marketing → Blog before adding it to the Homepage.
                          </div>
                        )
                      }

                      const filteredBlogs = unselectedPublishedBlogs.filter(b => {
                        if (!blogSearchQuery.trim()) return true
                        const q = blogSearchQuery.toLowerCase().trim()
                        return (
                          (b.title || '').toLowerCase().includes(q) ||
                          (b.slug || '').toLowerCase().includes(q) ||
                          (b.author || '').toLowerCase().includes(q)
                        )
                      })

                      if (filteredBlogs.length === 0 && blogSearchQuery.trim().length > 0) {
                        return (
                          <div className="p-3 text-center text-xs text-gray-600 bg-gray-50 border border-gray-200 rounded-lg">
                            No published articles match your search.
                          </div>
                        )
                      }

                      return filteredBlogs.map(blog => (
                        <div key={blog.id} className="flex items-center justify-between p-2 bg-white rounded border text-xs">
                          <div className="flex items-center space-x-2.5 min-w-0">
                            {blog.cover_image ? (
                              <div className="relative w-8 h-8 rounded overflow-hidden shrink-0 bg-rose-950">
                                <Image src={blog.cover_image} alt={blog.title} fill className="object-cover" />
                              </div>
                            ) : (
                              <div className="w-8 h-8 rounded bg-rose-950/10 flex items-center justify-center shrink-0">
                                <FileText className="w-4 h-4 text-[#5C0B26]" />
                              </div>
                            )}
                            <div className="min-w-0">
                              <p className="font-bold text-gray-800 truncate">{blog.title}</p>
                              <p className="text-[10px] text-gray-500">{blog.author || 'Shreengar Team'} • {blog.published_at ? new Date(blog.published_at).toLocaleDateString() : 'Published'}</p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              if (selectedItems.length >= 3) {
                                alert('Maximum 3 articles can be selected for the Homepage.')
                                return
                              }
                              const newItem = {
                                entity_type: 'blog',
                                entity_id: blog.id,
                                sort_order: selectedItems.length + 1
                              }
                              setSelectedItems([...selectedItems, newItem])
                            }}
                            disabled={selectedItems.length >= 3}
                            className="px-2.5 py-1 bg-[#5C0B26] text-white font-bold text-[10px] rounded hover:bg-[#5C0B26]/90 disabled:opacity-40"
                          >
                            + Add
                          </button>
                        </div>
                      ))
                    })()}
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-3 gap-4">
              <label className="flex items-center space-x-2 p-2 bg-gray-50 border rounded-lg cursor-pointer">
                <input type="checkbox" checked={editIsEnabled} onChange={(e) => setEditIsEnabled(e.target.checked)} className="rounded text-[#5C0B26] focus:ring-[#5C0B26]" />
                <span className="text-[11px] font-semibold text-gray-700">Section Enabled</span>
              </label>

              <label className="flex items-center space-x-2 p-2 bg-gray-50 border rounded-lg cursor-pointer">
                <input type="checkbox" checked={editDesktopEnabled} onChange={(e) => setEditDesktopEnabled(e.target.checked)} className="rounded text-[#5C0B26] focus:ring-[#5C0B26]" />
                <span className="text-[11px] font-semibold text-gray-700">Show on Desktop</span>
              </label>

              <label className="flex items-center space-x-2 p-2 bg-gray-50 border rounded-lg cursor-pointer">
                <input type="checkbox" checked={editMobileEnabled} onChange={(e) => setEditMobileEnabled(e.target.checked)} className="rounded text-[#5C0B26] focus:ring-[#5C0B26]" />
                <span className="text-[11px] font-semibold text-gray-700">Show on Mobile</span>
              </label>
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-4 border-t border-gray-100">
            <Button type="button" variant="outline" onClick={() => setIsEditModalOpen(false)}>Cancel</Button>
            <Button
              onClick={handleSaveSection}
              disabled={isSavingSectionId === editingSection?.id}
              className="bg-[#5C0B26] hover:bg-[#5C0B26]/90 text-white font-serif font-bold text-xs"
            >
              {isSavingSectionId === editingSection?.id ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5 mr-1.5" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
