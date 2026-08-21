'use client'

import React, { useState, useMemo, useEffect } from 'react'
import Image from 'next/image'
import {
  Package,
  Layers,
  Palette,
  ImageIcon,
  Ruler,
  Warehouse,
  Tag,
  Truck,
  Globe,
  CheckCircle2,
  AlertTriangle,
  Upload,
  Trash2,
  Check,
  Sparkles,
  X,
  Info,
  RefreshCw
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { AdminProduct, Category, ProductFamily, ProductImageState, ExistingProductImage, ProductFormVariant, AdminProductVariant, ProductFamilyFormState } from '@/types/database'
import { getParentCategoryOptions } from '@/lib/utils/categoryTree'
import { calculateDeliveryEstimate } from '@/lib/utils/delivery'
import { generateProductSkuAction, createColorAction } from '@/actions/catalog/actions'
import { validateSkuFormat } from '@/lib/utils/sku'

export interface ColorOption {
  id: string
  name: string
  hex_code?: string | null
}

export interface SizeOption {
  id: string
  name: string
  code?: string | null
  sortOrder?: number
  isActive?: boolean
  display_name?: string | null
  display_order?: number
  is_active?: boolean
}

export interface CollectionOption {
  id: string
  name: string
}

export interface ProductFormValues {
  id?: string
  title: string
  slug: string
  sku: string
  selling_price: number
  mrp: number
  category_id: string
  collection_id: string | null
  fabric: string | null
  occasion: string | null
  care_instructions: string | null
  description: string
  short_description: string | null
  material: string | null
  fit: string | null
  sleeve_type: string | null
  neck_type: string | null
  pattern: string | null
  color_name: string | null
  images: ProductImageState[]
  is_featured: boolean
  is_trending: boolean
  is_active: boolean
  delivery_available: boolean
  show_delivery_estimate: boolean
  showroom_collection_only: boolean
  pickup_available: boolean
  free_delivery: boolean
  delivery_min_days: number | null
  delivery_max_days: number | null
  delivery_message: string | null
  cod_available: boolean
  express_delivery_available: boolean
  is_returnable: boolean
  return_window_days: number | null
  return_policy_message: string | null
  exchange_allowed: boolean
  show_color_option: boolean
  storefront_default_color_id: string | null
  product_family_id: string | null
  primary_color_id: string | null
  colorway_sort_order: number
  stock_quantity: number
  variants: ProductFormVariant[]
  show_storefront_stock_message?: boolean
  storefront_stock_message_quantity?: number
  shipping_weight_grams?: number | null
  parcel_length_cm?: number | null
  parcel_width_cm?: number | null
  parcel_height_cm?: number | null
}

export interface ProductFormProps {
  initialProduct?: AdminProduct | null
  categories: Category[]
  collections: CollectionOption[]
  productFamilies: ProductFamily[]
  colors: ColorOption[]
  sizes?: SizeOption[]
  preselectedFamilyId?: string | null
  initialStep?: number
  onSave: (values: ProductFormValues, isPublishing: boolean) => Promise<{ success: boolean; error?: string }>
  onCancel: () => void
  isSubmitting?: boolean
  isFamiliesLoading?: boolean
  familiesError?: string | null
  onRetryFamilies?: () => void
}

const generateUUID = () => {
  if (typeof window !== 'undefined' && window.crypto && window.crypto.randomUUID) {
    return window.crypto.randomUUID()
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  });
}

const STEPS = [
  { id: 1, label: 'Basic Info', icon: Package },
  { id: 2, label: 'Category & Collection', icon: Layers },
  { id: 3, label: 'Family & Colourways', icon: Palette },
  { id: 4, label: 'Images', icon: ImageIcon },
  { id: 5, label: 'Sizes & Variants', icon: Ruler },
  { id: 6, label: 'Inventory', icon: Warehouse },
  { id: 7, label: 'Pricing', icon: Tag },
  { id: 8, label: 'Shipping & Returns', icon: Truck },
  { id: 9, label: 'SEO', icon: Globe },
  { id: 10, label: 'Review & Publish', icon: CheckCircle2 },
]

const STANDARD_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL', 'One Size']

export function ProductForm({
  initialProduct,
  categories,
  collections,
  productFamilies,
  colors,
  sizes = [],
  preselectedFamilyId = null,
  initialStep = 1,
  onSave,
  onCancel,
  isSubmitting = false,
  isFamiliesLoading = false,
  familiesError = null,
  onRetryFamilies
}: ProductFormProps) {
  const [activeStep, setActiveStep] = useState(initialStep)
  const [formError, setFormError] = useState<string | null>(null)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [isCancelConfirmOpen, setIsCancelConfirmOpen] = useState(false)

  // Local Colors and Modal States
  const [localColors, setLocalColors] = useState<ColorOption[]>(colors)
  const [isAddColorModalOpen, setIsAddColorModalOpen] = useState(false)
  const [newColorName, setNewColorName] = useState('')
  const [newColorCode, setNewColorCode] = useState('')
  const [newColorHex, setNewColorHex] = useState('#')
  const [newColorOrder, setNewColorOrder] = useState('1')
  const [colorModalError, setColorModalError] = useState<string | null>(null)
  const [isCreatingColor, setIsCreatingColor] = useState(false)

  useEffect(() => {
    setLocalColors(colors)
  }, [colors])

  // Form State
  const [title, setTitle] = useState(initialProduct?.title || '')
  const [slug, setSlug] = useState(initialProduct?.slug || '')
  const [sku, setSku] = useState(initialProduct?.sku || '')
  const [skuMode, setSkuMode] = useState<'auto' | 'manual'>(initialProduct?.id ? 'manual' : 'auto')
  const [isGeneratingSku, setIsGeneratingSku] = useState(false)
  const [sellingPrice, setSellingPrice] = useState<string>(initialProduct?.sellingPrice ? String(initialProduct.sellingPrice) : '')
  const [mrp, setMrp] = useState<string>(initialProduct?.mrp ? String(initialProduct.mrp) : '')
  const [categoryId, setCategoryId] = useState(initialProduct?.category_id || '')
  const [collectionId, setCollectionId] = useState<string | null>(initialProduct?.collection_id || null)
  const [shortDescription, setShortDescription] = useState(initialProduct?.short_description || '')
  const [description, setDescription] = useState(initialProduct?.description || '')
  const [fabric, setFabric] = useState(initialProduct?.fabric || '')
  const [occasion, setOccasion] = useState(initialProduct?.occasion || '')
  const [careInstructions, setCareInstructions] = useState(initialProduct?.care_instructions || '')
  const [material, setMaterial] = useState(initialProduct?.material || '')
  const [fit, setFit] = useState(initialProduct?.fit || '')
  const [sleeveType, setSleeveType] = useState(initialProduct?.sleeve_type || '')
  const [neckType, setNeckType] = useState(initialProduct?.neck_type || '')
  const [pattern, setPattern] = useState(initialProduct?.pattern || '')
  const [colorName, setColorName] = useState(initialProduct?.color_name || '')

  const [isFeatured, setIsFeatured] = useState(!!initialProduct?.featured)
  const [isTrending, setIsTrending] = useState(!!initialProduct?.trending)
  const [isActive, setIsActive] = useState(initialProduct?.is_active !== false)
  const [productId] = useState(() => initialProduct?.id || generateUUID())

  // Storefront Stock Message
  const [showStorefrontStockMessage, setShowStorefrontStockMessage] = useState(
    initialProduct ? !!initialProduct.show_storefront_stock_message : false
  )
  const [storefrontStockMessageQuantity, setStorefrontStockMessageQuantity] = useState(
    initialProduct?.storefront_stock_message_quantity !== undefined
      ? Number(initialProduct.storefront_stock_message_quantity)
      : 1
  )

  // Images State
  const [images, setImages] = useState<ProductImageState[]>(() => {
    if (!initialProduct?.images) return []
    return initialProduct.images.map((img: any, idx: number) => {
      if (typeof img === 'string') {
        return {
          type: 'existing',
          id: `img-${idx}`,
          product_id: initialProduct.id,
          image_url: img,
          storage_path: null,
          display_order: idx,
          is_primary: idx === 0,
          alt_text: initialProduct.title || null
        } as ExistingProductImage & { type: 'existing' }
      }
      return img as ProductImageState
    })
  })

  // Family & Colourways State
  const [familyState, setFamilyState] = useState<ProductFamilyFormState>(() => {
    return {
      productFamilyId: initialProduct ? (initialProduct.product_family_id || null) : (preselectedFamilyId || null),
      primaryColorId: initialProduct ? (initialProduct.primary_color_id || null) : null,
      colorwaySortOrder: initialProduct ? (initialProduct.colorway_sort_order ?? 0) : 0,
      showColorOption: initialProduct ? (initialProduct.show_color_option !== false) : true
    }
  })

  const { productFamilyId, primaryColorId, colorwaySortOrder, showColorOption } = familyState

  const setProductFamilyId = (id: string | null) => {
    setFamilyState(prev => ({ ...prev, productFamilyId: id }))
  }
  const setPrimaryColorId = (id: string | null) => {
    setFamilyState(prev => ({ ...prev, primaryColorId: id }))
  }
  const setShowColorOption = (val: boolean) => {
    setFamilyState(prev => ({ ...prev, showColorOption: val }))
  }
  const setColorwaySortOrder = (order: string | number) => {
    setFamilyState(prev => ({ ...prev, colorwaySortOrder: Number(order) || 0 }))
  }

  const handleCreateNewColor = async (e: React.FormEvent) => {
    e.preventDefault()
    setColorModalError(null)
    setIsCreatingColor(true)

    const res = await createColorAction({
      name: newColorName,
      code: newColorCode,
      hex_code: newColorHex,
      is_active: true,
      display_order: parseInt(newColorOrder) || 1
    })

    setIsCreatingColor(false)
    if (res.error) {
      setColorModalError(res.error)
    } else if (res.data) {
      const savedColor = res.data as any
      const newOption = {
        id: savedColor.id,
        name: savedColor.name,
        hex_code: savedColor.hex_code
      }
      setLocalColors(prev => [...prev, newOption])
      setPrimaryColorId(savedColor.id)
      setColorName(savedColor.name)
      
      // Update variants with the new color id and name
      setVariants(prev => prev.map(v => ({
        ...v,
        color_id: savedColor.id,
        color_name: savedColor.name
      })))

      // Reset form states
      setNewColorName('')
      setNewColorCode('')
      setNewColorHex('#')
      setNewColorOrder('1')
      setIsAddColorModalOpen(false)
    }
  }

  // Variants State — Reset to empty for Add mode, populate real DB variants for Edit mode
  const [selectedSizes, setSelectedSizes] = useState<string[]>(() => {
    if (initialProduct?.variants && initialProduct.variants.length > 0) {
      const rawSizeIds = initialProduct.variants
        .filter((v: any) => v.is_active !== false && v.isActive !== false)
        .map((v: any) => {
          if (v.size_id) return v.size_id
          const matchingSize = (sizes || []).find(s => s.name === v.size || s.display_name === v.size)
          return matchingSize?.id || null
        })
        .filter(Boolean) as string[]
      return Array.from(new Set(rawSizeIds))
    }
    return []
  })

  const [variants, setVariants] = useState<ProductFormVariant[]>(() => {
    if (initialProduct?.variants && initialProduct.variants.length > 0) {
      const canonicalMap = new Map<string, ProductFormVariant>()
      for (const v of initialProduct.variants) {
        const sizeName = v.size || 'M'
        const matchingSize = (sizes || []).find(s => s.name === sizeName || s.display_name === sizeName)
        const sizeId = v.size_id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v.size_id)
          ? v.size_id
          : (matchingSize?.id || null)

        const colorId = v.color_id || initialProduct.primary_color_id || null
        const colorName = v.color_name || initialProduct.color_name || null
        const canonicalKey = `${sizeId || sizeName}:${colorId || 'default'}`

        const invId = v.inventory_id || null
        const qty = v.stock_quantity ?? 0
        const reserved = v.reserved_quantity ?? 0
        const active = v.is_active !== false

        if (!canonicalMap.has(canonicalKey)) {
          const avail = Math.max(qty - reserved, 0)
          const lowThresh = 5
          const status = qty > 0 ? (qty <= lowThresh ? 'low_stock' : 'in_stock') : 'out_of_stock'
          canonicalMap.set(canonicalKey, {
            variantId: v.id,
            inventoryId: invId,
            sizeId: sizeId || '',
            sizeCode: matchingSize?.code || matchingSize?.name || sizeName,
            colorId,
            sku: v.sku || `${initialProduct.sku}-${sizeName}`,
            quantity: qty,
            originalQuantity: qty,
            reservedQuantity: reserved,
            availableQuantity: avail,
            isActive: active,
            isNew: false,
            isSizeRemoved: false,
            isQuantityEdited: false,

            // Aliases
            id: v.id,
            sizeName,
            size: sizeName,
            size_id: sizeId,
            color_id: colorId,
            colorName,
            color_name: colorName,
            stock_quantity: qty,
            reserved_quantity: reserved,
            available_quantity: avail,
            is_active: active,
            lowStockThreshold: lowThresh,
            stockStatus: status
          })
        }
      }
      return Array.from(canonicalMap.values())
    }
    return []
  })

  // Shipping & Returns State
  const [deliveryAvailable, setDeliveryAvailable] = useState(initialProduct?.delivery_available !== false)
  const [showDeliveryEstimate, setShowDeliveryEstimate] = useState(initialProduct?.show_delivery_estimate !== false)
  const [showroomCollectionOnly, setShowroomCollectionOnly] = useState(false)
  const [pickupAvailable, setPickupAvailable] = useState(false)
  const [freeDelivery, setFreeDelivery] = useState(true) // Force true
  const [deliveryMinDays, setDeliveryMinDays] = useState(initialProduct?.delivery_min_days !== null && initialProduct?.delivery_min_days !== undefined ? String(initialProduct.delivery_min_days) : '3')
  const [deliveryMaxDays, setDeliveryMaxDays] = useState(initialProduct?.delivery_max_days !== null && initialProduct?.delivery_max_days !== undefined ? String(initialProduct.delivery_max_days) : '7')
  const [deliveryMessage, setDeliveryMessage] = useState(initialProduct?.delivery_message || '')
  const [codAvailable, setCodAvailable] = useState(false)
  const [expressDeliveryAvailable, setExpressDeliveryAvailable] = useState(false)
  const [isReturnable, setIsReturnable] = useState(false) // Force false since returns are not ready
  const [returnWindowDays, setReturnWindowDays] = useState(initialProduct?.return_window_days !== null && initialProduct?.return_window_days !== undefined ? String(initialProduct.return_window_days) : '')
  const [returnPolicyMessage, setReturnPolicyMessage] = useState(initialProduct?.return_policy_message || '')
  const [exchangeAllowed, setExchangeAllowed] = useState(false)
  const [shippingWeightGrams, setShippingWeightGrams] = useState(initialProduct?.shipping_weight_grams !== null && initialProduct?.shipping_weight_grams !== undefined ? String(initialProduct.shipping_weight_grams) : '')
  const [parcelLengthCm, setParcelLengthCm] = useState(initialProduct?.parcel_length_cm !== null && initialProduct?.parcel_length_cm !== undefined ? String(initialProduct.parcel_length_cm) : '')
  const [parcelWidthCm, setParcelWidthCm] = useState(initialProduct?.parcel_width_cm !== null && initialProduct?.parcel_width_cm !== undefined ? String(initialProduct.parcel_width_cm) : '')
  const [parcelHeightCm, setParcelHeightCm] = useState(initialProduct?.parcel_height_cm !== null && initialProduct?.parcel_height_cm !== undefined ? String(initialProduct.parcel_height_cm) : '')

  // Category Tree options
  const categoryTreeOptions = useMemo(() => {
    return getParentCategoryOptions(categories).filter(o => o.id !== null)
  }, [categories])

  // Auto-generate SKU
  const handleRegenerateSku = async () => {
    setIsGeneratingSku(true)
    const res = await generateProductSkuAction(categoryId || null, primaryColorId || null)
    if (res.sku) {
      setSku(res.sku)
      setHasUnsavedChanges(true)
      setVariants(prev => prev.map(v => {
        const sName = v.sizeName || v.size || 'M'
        const matchingSize = (sizes || []).find(s => s.id === v.sizeId || s.name === sName || s.display_name === sName)
        const sCode = v.sizeCode || matchingSize?.code || matchingSize?.display_name || sName
        return {
          ...v,
          sku: `${res.sku}-${sCode}`
        }
      }))
    }
    setIsGeneratingSku(false)
  }

  const handleResetToAutoSku = () => {
    setSkuMode('auto')
    handleRegenerateSku()
  }

  React.useEffect(() => {
    if (skuMode === 'auto' && !initialProduct?.id) {
      handleRegenerateSku()
    }
  }, [categoryId, primaryColorId, skuMode])

  // Sync size codes when sizes list finishes loading without mutating inventory
  React.useEffect(() => {
    if (sizes && sizes.length > 0) {
      setVariants((prev): ProductFormVariant[] => prev.map((v): ProductFormVariant => {
        const match = sizes.find(s => s.id === v.sizeId || s.name === v.sizeName || s.display_name === v.sizeName)
        if (!match) return v
        const correctSizeName = match.name || match.display_name || v.sizeName || ''
        const correctSizeCode = match.name || match.display_name || correctSizeName || ''
        const correctSizeId = match.id || v.sizeId
        return {
          ...v,
          sizeId: correctSizeId,
          sizeName: correctSizeName,
          sizeCode: correctSizeCode,
          size: correctSizeName,
          size_id: correctSizeId
        }
      }))
    }
  }, [sizes])

  // Sync selectedSizes when sizes list finishes loading
  React.useEffect(() => {
    if (sizes && sizes.length > 0 && initialProduct?.variants) {
      setSelectedSizes(prev => {
        const rawSizeIds = (initialProduct?.variants || [])
          .filter((v: any) => v.is_active !== false && v.isActive !== false)
          .map((v: any) => {
            if (v.size_id) return v.size_id
            const matchingSize = sizes.find(s => s.name === v.size || s.display_name === v.size)
            return matchingSize?.id || null
          })
          .filter(Boolean) as string[]
        // Merge with existing selections if any, keeping unique values
        return Array.from(new Set([...prev, ...rawSizeIds]))
      })
    }
  }, [sizes, initialProduct])

  // Auto-generate slug from title
  const handleTitleChange = (val: string) => {
    setTitle(val)
    setHasUnsavedChanges(true)
    if (!slug || slug === title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')) {
      setSlug(val.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''))
    }
  }

  const handleToggleSize = (sizeId: string) => {
    const matchingSize = (sizes || []).find(s => s.id === sizeId)
    if (!matchingSize) return

    const sizeName = matchingSize.name
    const exists = selectedSizes.includes(sizeId)

    if (exists) {
      const existingVar = variants.find(v => v.sizeId === sizeId && v.variantId && (v.quantity ?? v.stock_quantity ?? 0) > 0)
      if (existingVar) {
        const qty = existingVar.quantity ?? existingVar.stock_quantity ?? 0
        const confirmDeselect = window.confirm(
          `Warning: The size "${sizeName}" has a stock quantity of ${qty} units. Deselecting it will deactivate this variant and hide it from the storefront. Do you want to proceed?`
        )
        if (!confirmDeselect) return
      }
    }

    setHasUnsavedChanges(true)
    setSelectedSizes(prev => {
      const nextSizes = exists ? prev.filter(s => s !== sizeId) : [...prev, sizeId]

      if (!exists) {
        // Toggle SELECT
        setVariants((vPrev): ProductFormVariant[] => {
          // If variant already exists in state, reactivate it
          const existingIdx = vPrev.findIndex(v => v.sizeId === sizeId)
          if (existingIdx !== -1) {
            return vPrev.map((v, idx): ProductFormVariant => idx === existingIdx ? { ...v, isActive: true, isSizeRemoved: false, is_active: true } : v)
          }

          // Otherwise, create a new pending variant state
          const baseSku = sku || 'SKU'
          const newVar = {
            variantId: null,
            inventoryId: null,
            sizeId,
            sizeCode: matchingSize?.name || '',
            colorId: primaryColorId || null,
            sku: `${baseSku}-${matchingSize?.name || ''}`,
            quantity: 0,
            originalQuantity: 0,
            reservedQuantity: 0,
            availableQuantity: 0,
            isActive: true,
            isNew: true,
            isSizeRemoved: false,
            isQuantityEdited: false,

            // Aliases
            id: null,
            sizeName,
            size: sizeName,
            size_id: sizeId,
            color_id: primaryColorId || null,
            colorName: colorName || null,
            color_name: colorName || null,
            stock_quantity: 0,
            reserved_quantity: 0,
            available_quantity: 0,
            is_active: true,
            lowStockThreshold: 5,
            stockStatus: 'out_of_stock'
          } as ProductFormVariant
          return [...vPrev, newVar] as ProductFormVariant[]
        })
      } else {
        // Toggle DESELECT
        setVariants((vPrev): ProductFormVariant[] => {
          return vPrev.map(v => {
            if (v.sizeId === sizeId) {
              if (v.variantId) {
                // Keep existing variant but mark as inactive/removed
                return { ...v, isActive: false, isSizeRemoved: true, is_active: false }
              }
              // Return null for new unsaved variant to filter it out
              return null
            }
            return v
          }).filter(Boolean) as ProductFormVariant[]
        })
      }

      return nextSizes
    })
  }

  const handleUpdateVariantStock = (targetKey: string, newQuantity: number) => {
    const validQty = Math.max(0, Math.floor(isNaN(newQuantity) ? 0 : newQuantity))
    setHasUnsavedChanges(true)
    setVariants(prev => prev.map(v => {
      const key = `${v.sizeId || v.size}:${v.colorId || v.color_id || 'default'}`
      const match = key === targetKey || v.size === targetKey || v.sizeId === targetKey
      if (match) {
        const res = v.reservedQuantity ?? v.reserved_quantity ?? 0
        const avail = Math.max(validQty - res, 0)
        const lowThresh = v.lowStockThreshold ?? 5
        const status = validQty > 0 ? (validQty <= lowThresh ? 'low_stock' : 'in_stock') : 'out_of_stock'
        return {
          ...v,
          quantity: validQty,
          stock_quantity: validQty,
          reservedQuantity: res,
          reserved_quantity: res,
          availableQuantity: avail,
          available_quantity: avail,
          stockStatus: status,
          isQuantityEdited: true
        }
      }
      return v
    }))
  }

  const handleUpdateVariantWeight = (targetKey: string, weightGrams: number | null) => {
    const validWeight = weightGrams === null ? null : Math.max(0, Math.floor(isNaN(weightGrams) ? 0 : weightGrams))
    setHasUnsavedChanges(true)
    setVariants(prev => prev.map(v => {
      const key = `${v.sizeId || v.size}:${v.colorId || v.color_id || 'default'}`
      const match = key === targetKey || v.size === targetKey || v.sizeId === targetKey
      if (match) {
        return {
          ...v,
          shipping_weight_grams: validWeight
        }
      }
      return v
    }))
  }

  const handleRemoveVariant = (sizeId: string) => {
    const target = variants.find(v => v.sizeId === sizeId)
    if (!target) return
    if (target.variantId) {
      if (!confirm(`Are you sure you want to remove this size variant? This variant currently exists in the database.`)) {
        return
      }
    }
    setHasUnsavedChanges(true)
    setSelectedSizes(prev => prev.filter(s => s !== sizeId))
    setVariants(vPrev => {
      return vPrev.map(v => {
        if (v.sizeId === sizeId) {
          if (v.variantId) {
            return { ...v, isActive: false, isSizeRemoved: true, is_active: false }
          }
          return null
        }
        return v
      }).filter(Boolean) as ProductFormVariant[]
    })
  }

  const totalStockQuantity = useMemo(() => {
    return variants.filter(v => v.isActive && !v.isSizeRemoved).reduce((sum, v) => sum + (v.quantity ?? v.stock_quantity ?? 0), 0)
  }, [variants])

  const totalReservedQuantity = useMemo(() => {
    return variants.filter(v => v.isActive && !v.isSizeRemoved).reduce((sum, v) => sum + (v.reservedQuantity ?? v.reserved_quantity ?? 0), 0)
  }, [variants])

  const totalAvailableQuantity = useMemo(() => {
    return variants.filter(v => v.isActive && !v.isSizeRemoved).reduce((sum, v) => {
      const q = v.quantity ?? v.stock_quantity ?? 0
      const r = v.reservedQuantity ?? v.reserved_quantity ?? 0
      return sum + Math.max(q - r, 0)
    }, 0)
  }, [variants])

  // Canonical Publish Validation Rules (strict for production publish)
  const publishStepErrors = useMemo(() => {
    const errors: Record<number, string[]> = {}

    const s1: string[] = []
    if (!title.trim()) s1.push('Product title is required.')
    if (!sku.trim()) s1.push('SKU code is required.')
    if (!slug.trim()) s1.push('Slug is required.')
    if (!description.trim()) s1.push('Product description is required.')
    if (s1.length > 0) errors[1] = s1

    const s2: string[] = []
    if (!categoryId) s2.push('Category selection is required.')
    if (s2.length > 0) errors[2] = s2

    const s4: string[] = []
    if (images.length === 0) s4.push('At least one product image is required for publication.')
    if (s4.length > 0) errors[4] = s4

    const s5: string[] = []
    if (variants.length === 0) s5.push('At least one active size variant is required.')
    if (s5.length > 0) errors[5] = s5

    const s7: string[] = []
    const sp = Number(sellingPrice)
    const m = Number(mrp)
    if (isNaN(sp) || sp <= 0) s7.push('Selling price must be greater than zero.')
    if (isNaN(m) || m <= 0) s7.push('MRP must be greater than zero.')
    if (sp > m) s7.push('Selling price cannot exceed MRP.')
    if (s7.length > 0) errors[7] = s7

    const s8: string[] = []
    const minDays = Number(deliveryMinDays)
    const maxDays = Number(deliveryMaxDays)
    if (deliveryMinDays === '' || isNaN(minDays) || minDays < 1) {
      s8.push('Minimum delivery days is required and must be at least 1.')
    }
    if (deliveryMaxDays === '' || isNaN(maxDays) || maxDays < minDays) {
      s8.push('Maximum delivery days is required and must be greater than or equal to minimum delivery days.')
    }
    if (isReturnable) {
      const rw = Number(returnWindowDays)
      if (!returnWindowDays || isNaN(rw) || rw <= 0 || !Number.isInteger(rw)) {
        s8.push('Return window days is required and must be a positive integer for returnable items.')
      }
    }
    if (s8.length > 0) errors[8] = s8

    return errors
  }, [title, sku, slug, description, categoryId, images, variants, sellingPrice, mrp, isReturnable, returnWindowDays, deliveryMinDays, deliveryMaxDays])

  // Canonical Draft Validation Rules (permissive for saving work in progress)
  const draftStepErrors = useMemo(() => {
    const errors: Record<number, string[]> = {}

    const s1: string[] = []
    if (!title.trim()) s1.push('Product title is required to save a draft.')
    if (s1.length > 0) errors[1] = s1

    const s7: string[] = []
    const sp = Number(sellingPrice)
    const m = Number(mrp)
    if (sellingPrice !== '' && (isNaN(sp) || sp < 0)) s7.push('Selling price must be non-negative.')
    if (mrp !== '' && (isNaN(m) || m < 0)) s7.push('MRP must be non-negative.')
    if (sp > 0 && m > 0 && sp > m) s7.push('Selling price cannot exceed MRP.')
    if (s7.length > 0) errors[7] = s7

    return errors
  }, [title, sellingPrice, mrp])

  const publishSectionErrorCount = Object.keys(publishStepErrors).length

  const getPayload = (imagesArray = images): ProductFormValues => {
    return {
      id: productId,
      title: title.trim(),
      slug: slug.trim().toLowerCase(),
      sku: sku.trim().toUpperCase(),
      selling_price: Number(sellingPrice) || 0,
      mrp: Number(mrp) || 0,
      category_id: categoryId,
      collection_id: collectionId || null,
      fabric: fabric.trim() || null,
      occasion: occasion.trim() || null,
      care_instructions: careInstructions.trim() || null,
      description: description.trim(),
      short_description: shortDescription.trim() || null,
      material: material.trim() || null,
      fit: fit.trim() || null,
      sleeve_type: sleeveType.trim() || null,
      neck_type: neckType.trim() || null,
      pattern: pattern.trim() || null,
      color_name: colorName.trim() || null,
      images: imagesArray,
      is_featured: isFeatured,
      is_trending: isTrending,
      is_active: isActive,
      delivery_available: deliveryAvailable,
      show_delivery_estimate: showDeliveryEstimate,
      showroom_collection_only: false,
      pickup_available: false,
      free_delivery: true,
      delivery_min_days: deliveryMinDays === '' ? null : (Number(deliveryMinDays) || null),
      delivery_max_days: deliveryMaxDays === '' ? null : (Number(deliveryMaxDays) || null),
      delivery_message: deliveryMessage.trim() || null,
      cod_available: false,
      express_delivery_available: false,
      is_returnable: false,
      return_window_days: null,
      return_policy_message: null,
      exchange_allowed: false,
      show_color_option: showColorOption,
      storefront_default_color_id: null,
      product_family_id: productFamilyId || null,
      primary_color_id: primaryColorId || null,
      colorway_sort_order: Number(colorwaySortOrder) || 0,
      stock_quantity: totalStockQuantity,
      shipping_weight_grams: initialProduct?.shipping_weight_grams !== undefined && initialProduct?.shipping_weight_grams !== null ? Number(initialProduct.shipping_weight_grams) : null,
      parcel_length_cm: initialProduct?.parcel_length_cm !== undefined && initialProduct?.parcel_length_cm !== null ? Number(initialProduct.parcel_length_cm) : null,
      parcel_width_cm: initialProduct?.parcel_width_cm !== undefined && initialProduct?.parcel_width_cm !== null ? Number(initialProduct.parcel_width_cm) : null,
      parcel_height_cm: initialProduct?.parcel_height_cm !== undefined && initialProduct?.parcel_height_cm !== null ? Number(initialProduct.parcel_height_cm) : null,
      show_storefront_stock_message: showStorefrontStockMessage,
      storefront_stock_message_quantity: storefrontStockMessageQuantity,
      variants: (() => {
        const canonicalMap = new Map<string, ProductFormVariant>()
        for (const v of variants) {
          const sName = v.sizeName || v.size || 'M'
          const matchingSize = (sizes || []).find(s => s.name === sName || s.display_name === sName)
          const rawSizeId = v.sizeId || v.size_id || matchingSize?.id
          const validSizeId = rawSizeId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(rawSizeId) ? rawSizeId : null

          const cId = v.colorId || v.color_id || primaryColorId || null
          const cName = v.colorName || v.color_name || colorName.trim() || null
          const key = `${validSizeId || sName}:${cId || 'default'}`
          const qty = v.quantity ?? v.stock_quantity ?? 0
          const res = v.reservedQuantity ?? v.reserved_quantity ?? 0
          const avail = Math.max(qty - res, 0)
          const lowThresh = v.lowStockThreshold ?? 5
          const status = qty > 0 ? (qty <= lowThresh ? 'low_stock' : 'in_stock') : 'out_of_stock'

          if (!canonicalMap.has(key)) {
            canonicalMap.set(key, {
              ...v,
              variantId: v.variantId || v.id || null,
              inventoryId: v.inventoryId || null,
              sizeId: validSizeId || '',
              sizeCode: matchingSize?.code || matchingSize?.name || sName,
              sizeName: sName,
              size_id: validSizeId,
              size: sName,
              colorId: cId,
              color_id: cId,
              colorName: cName,
              color_name: cName,
              sku: v.sku || `${sku.trim().toUpperCase()}-${matchingSize?.code || matchingSize?.name || sName}`,
              quantity: qty,
              stock_quantity: qty,
              reservedQuantity: res,
              reserved_quantity: res,
              availableQuantity: avail,
              available_quantity: avail,
              lowStockThreshold: lowThresh,
              reorderLevel: v.reorderLevel ?? 10,
              stockStatus: status,
              isActive: v.isActive !== false,
              isNew: v.isNew ?? false,
              isSizeRemoved: v.isSizeRemoved ?? false,
              isQuantityEdited: v.isQuantityEdited || (qty !== v.originalQuantity),
              originalQuantity: v.originalQuantity ?? 0,
              id: v.variantId || v.id || null,
              is_active: v.isActive !== false,
              shipping_weight_grams: v.shipping_weight_grams !== undefined && v.shipping_weight_grams !== null && String(v.shipping_weight_grams).trim() !== '' ? Number(v.shipping_weight_grams) : null
            })
          }
        }
        return Array.from(canonicalMap.values())
      })()
    }
  }

  const handleSubmit = async (isPublishing: boolean) => {
    setFormError(null)

    const activeErrors = isPublishing ? publishStepErrors : draftStepErrors
    const sectionCount = Object.keys(activeErrors).length

    if (sectionCount > 0) {
      const modeText = isPublishing ? 'publishing' : 'saving draft'
      setFormError(`Please fix validation errors in ${sectionCount} section(s) before ${modeText}.`)
      const firstErrorStep = Number(Object.keys(activeErrors)[0])
      if (firstErrorStep) setActiveStep(firstErrorStep)
      return
    }

    // 1. Upload any new images first
    const uploadedImages = [...images]
    for (let i = 0; i < uploadedImages.length; i++) {
      const img = uploadedImages[i]
      if (img.type === 'new' && (img as any).file) {
        const formData = new FormData()
        formData.append('file', (img as any).file)
        formData.append('productId', productId)
        
        let uploadRes: { success?: boolean; url?: string; storage_path?: string; error?: string }
        try {
          const response = await fetch('/api/admin/upload', {
            method: 'POST',
            body: formData
          })

          if (!response.ok) {
            const message = await response.text()
            throw new Error(`Upload failed (${response.status}): ${message}`)
          }

          uploadRes = await response.json()
        } catch (error: any) {
          console.error("Product image request failed", error)
          setFormError("Unable to upload the product image. Please try again.")
          return
        }

        if (!uploadRes.success || !uploadRes.url) {
          setFormError(`Failed to upload image "${(img as any).file.name}": ${uploadRes.error || 'Unknown error'}`)
          return
        }
        uploadedImages[i] = {
          type: 'new',
          image_url: uploadRes.url,
          storage_path: uploadRes.storage_path || '',
          alt_text: img.alt_text || title || 'Product Image'
        }
      }
    }

    // Update images state so getPayload gets the updated array
    setImages(uploadedImages)

    const payload = getPayload(uploadedImages)
    const res = await onSave(payload, isPublishing)
    if (res.error) {
      setFormError(res.error)
    } else {
      setHasUnsavedChanges(false)
    }
  }

  const handleCancelClick = () => {
    if (hasUnsavedChanges) {
      setIsCancelConfirmOpen(true)
    } else {
      onCancel()
    }
  }

  const getImageUrl = (img: ProductImageState): string => {
    return img.image_url
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col min-h-[640px]">
      {/* Cancel Unsaved Changes Confirmation Modal */}
      {isCancelConfirmOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full space-y-4 shadow-xl border border-gray-200">
            <div className="flex items-center space-x-3 text-amber-700">
              <AlertTriangle className="w-6 h-6 flex-shrink-0" />
              <h4 className="font-serif font-bold text-base text-gray-900">Discard unsaved changes?</h4>
            </div>
            <p className="text-xs text-gray-600">
              You have unsaved product edits. Leaving now will discard all changes made in this session.
            </p>
            <div className="flex justify-end space-x-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCancelConfirmOpen(false)}
                className="text-xs"
              >
                Keep Editing
              </Button>
              <Button
                type="button"
                onClick={onCancel}
                className="bg-rose-700 text-white text-xs hover:bg-rose-800"
              >
                Discard Changes
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Top Bar */}
      <div className="bg-[#FAF8F5] p-4 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-[#5C0B26]/10 text-[#5C0B26] flex items-center justify-center font-bold">
            <Package className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="font-serif font-bold text-sm text-[#2B1A1F]">
                {initialProduct ? `Edit Product: ${initialProduct.title}` : 'Add New Ethnic Product'}
              </h3>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${isActive ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-amber-100 text-amber-800 border border-amber-200'}`}>
                {isActive ? 'Published' : 'Draft'}
              </span>
            </div>
            <p className="text-[11px] text-gray-500 font-mono">
              Step {activeStep} of 10 — {STEPS[activeStep - 1].label}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {publishSectionErrorCount > 0 && (
            <div className="hidden sm:flex items-center space-x-1.5 bg-rose-50 text-rose-700 px-3 py-1.5 rounded-xl border border-rose-200 text-xs font-semibold">
              <AlertTriangle className="w-4 h-4 text-rose-600" />
              <span>{publishSectionErrorCount} section(s) need attention</span>
            </div>
          )}

          <Button type="button" variant="outline" onClick={handleCancelClick} className="text-xs">
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => handleSubmit(false)}
            disabled={isSubmitting}
            className="bg-gray-800 text-white text-xs hover:bg-gray-900"
          >
            {initialProduct && initialProduct.is_active !== false ? 'Save as Draft' : 'Save Draft'}
          </Button>
          <Button
            type="button"
            onClick={() => handleSubmit(true)}
            disabled={isSubmitting}
            className="bg-[#5C0B26] hover:bg-[#8C3A57] text-white text-xs"
          >
            {isSubmitting
              ? 'Saving...'
              : initialProduct && initialProduct.is_active !== false
              ? 'Update Published Product'
              : 'Publish Product'}
          </Button>
        </div>
      </div>

      {formError && (
        <div className="p-3 bg-rose-50 border-b border-rose-200 text-rose-700 text-xs font-semibold flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
            <span>{formError}</span>
          </div>
          <button type="button" onClick={() => setFormError(null)} className="text-rose-500 hover:text-rose-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Layout */}
      <div className="flex-1 flex flex-col md:flex-row">
        {/* Desktop Sidebar */}
        <div className="hidden md:block w-64 bg-[#FAF8F5]/60 border-r border-gray-200 p-3 space-y-1">
          {STEPS.map(step => {
            const isCurrent = activeStep === step.id
            const hasError = !isCurrent && !!publishStepErrors[step.id]
            const isComplete = !hasError && !isCurrent && activeStep > step.id && !publishStepErrors[step.id]

            return (
              <button
                key={step.id}
                type="button"
                onClick={() => setActiveStep(step.id)}
                className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  isCurrent
                    ? 'bg-[#5C0B26] text-white shadow-xs'
                    : hasError
                    ? 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
                    : isComplete
                    ? 'text-gray-700 hover:bg-gray-100'
                    : 'text-gray-500 hover:bg-gray-100'
                }`}
              >
                <div className="flex items-center space-x-2.5 truncate">
                  <span
                    className={`w-6 h-6 rounded-lg text-[11px] font-bold flex items-center justify-center ${
                      isCurrent
                        ? 'bg-white/20 text-white'
                        : isComplete
                        ? 'bg-emerald-100 text-emerald-800'
                        : hasError
                        ? 'bg-rose-100 text-rose-800'
                        : 'bg-gray-200 text-gray-600'
                    }`}
                  >
                    {isComplete ? <Check className="w-3.5 h-3.5" /> : step.id}
                  </span>
                  <span className="truncate">{step.label}</span>
                </div>

                {hasError && <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />}
              </button>
            )
          })}
        </div>

        {/* Mobile Header Bar */}
        <div className="md:hidden bg-gray-50 p-3 border-b border-gray-200 flex items-center justify-between overflow-x-auto text-xs">
          <div className="flex items-center space-x-2">
            <span className="font-bold text-[#5C0B26]">Step {activeStep}/10:</span>
            <span className="font-semibold text-gray-800">{STEPS[activeStep - 1].label}</span>
          </div>
          <div className="flex items-center space-x-1">
            <Button
              type="button"
              variant="outline"
              onClick={() => setActiveStep(prev => Math.max(1, prev - 1))}
              disabled={activeStep === 1}
              className="p-1 h-7 text-xs"
            >
              Prev
            </Button>
            <Button
              type="button"
              onClick={() => setActiveStep(prev => Math.min(10, prev + 1))}
              disabled={activeStep === 10}
              className="p-1 h-7 text-xs bg-[#5C0B26] text-white"
            >
              Next
            </Button>
          </div>
        </div>

        {/* Right Content Panel */}
        <div className="flex-1 p-6 space-y-6 overflow-y-auto max-h-[720px]">
          {/* STEP 1: BASIC INFO */}
          {activeStep === 1 && (
            <div className="space-y-4">
              <h4 className="font-serif font-bold text-sm text-[#2B1A1F] border-b border-gray-200 pb-2">
                1. Basic Product Information
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                <div className="md:col-span-8 space-y-3">
                  <Input
                    label="Product Title *"
                    value={title}
                    onChange={e => handleTitleChange(e.target.value)}
                    placeholder="e.g. Royal Maroon Silk Anarkali Kurti"
                    required
                  />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <Input
                        label="SKU Code *"
                        value={sku}
                        onChange={e => {
                          setSku(e.target.value.toUpperCase())
                          setSkuMode('manual')
                          setHasUnsavedChanges(true)
                        }}
                        placeholder="e.g. SHR-KUR-MRN-001"
                        required
                      />
                      <div className="mt-1 flex items-center justify-between text-[11px]">
                        <span className="text-gray-500 font-medium">
                          {skuMode === 'auto' ? `Generated Product SKU: ${sku}` : 'Manual SKU Mode'}
                        </span>
                        {skuMode === 'auto' ? (
                          <div className="flex items-center space-x-2">
                            <button
                              type="button"
                              onClick={handleRegenerateSku}
                              disabled={isGeneratingSku}
                              className="text-[#5C0B26] hover:underline font-semibold inline-flex items-center"
                            >
                              <RefreshCw className={`w-3 h-3 mr-1 ${isGeneratingSku ? 'animate-spin' : ''}`} />
                              Regenerate
                            </button>
                            <button
                              type="button"
                              onClick={() => setSkuMode('manual')}
                              className="text-gray-600 hover:underline font-medium"
                            >
                              Edit SKU
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={handleResetToAutoSku}
                            className="text-[#5C0B26] font-semibold hover:underline"
                          >
                            Use Automatic SKU
                          </button>
                        )}
                      </div>
                      <p className="text-[10px] text-gray-500 mt-0.5">
                        SKU is generated automatically. You may edit it before saving.
                      </p>
                    </div>
                    <div>
                      <Input
                        label="URL Slug *"
                        value={slug}
                        onChange={e => {
                          setSlug(e.target.value.toLowerCase())
                          setHasUnsavedChanges(true)
                        }}
                        placeholder="e.g. royal-maroon-silk-anarkali-kurti"
                        required
                      />
                      <p className="text-[10px] text-gray-500 mt-0.5 font-mono">
                        Path: /product/{slug || 'royal-maroon-kurti'}
                      </p>
                    </div>
                  </div>

                  <div>
                    <label className="font-semibold text-xs text-gray-800 block mb-1">
                      Short Description
                    </label>
                    <textarea
                      value={shortDescription}
                      onChange={e => {
                        setShortDescription(e.target.value)
                        setHasUnsavedChanges(true)
                      }}
                      placeholder="Short summary..."
                      rows={2}
                      className="w-full p-2.5 border border-gray-300 rounded-xl text-xs text-gray-900 bg-white focus:ring-[#5C0B26]"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-xs text-gray-800 block mb-1">
                      Full Description *
                    </label>
                    <textarea
                      value={description}
                      onChange={e => {
                        setDescription(e.target.value)
                        setHasUnsavedChanges(true)
                      }}
                      placeholder="Detailed specifications..."
                      rows={5}
                      className="w-full p-2.5 border border-gray-300 rounded-xl text-xs text-gray-900 bg-white focus:ring-[#5C0B26]"
                      required
                    />
                  </div>
                </div>

                <div className="md:col-span-4 bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-4">
                  <h5 className="font-serif font-bold text-xs text-[#2B1A1F]">Garment Attributes</h5>
                  <Input label="Fabric" value={fabric} onChange={e => { setFabric(e.target.value); setHasUnsavedChanges(true) }} />
                  <Input label="Occasion" value={occasion} onChange={e => { setOccasion(e.target.value); setHasUnsavedChanges(true) }} />
                  <Input label="Care Instructions" value={careInstructions} onChange={e => { setCareInstructions(e.target.value); setHasUnsavedChanges(true) }} />

                  <div className="pt-2 border-t border-gray-200 space-y-2">
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input type="checkbox" checked={isActive} onChange={e => { setIsActive(e.target.checked); setHasUnsavedChanges(true) }} className="w-4 h-4 text-[#5C0B26] rounded" />
                      <span className="font-bold text-xs text-gray-800">Active</span>
                    </label>
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input type="checkbox" checked={isFeatured} onChange={e => { setIsFeatured(e.target.checked); setHasUnsavedChanges(true) }} className="w-4 h-4 text-[#5C0B26] rounded" />
                      <span className="font-semibold text-xs text-gray-700">Featured Showcase</span>
                    </label>
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input type="checkbox" checked={isTrending} onChange={e => { setIsTrending(e.target.checked); setHasUnsavedChanges(true) }} className="w-4 h-4 text-[#5C0B26] rounded" />
                      <span className="font-semibold text-xs text-gray-700">Trending Badge</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: CATEGORY & COLLECTION */}
          {activeStep === 2 && (
            <div className="space-y-4">
              <h4 className="font-serif font-bold text-sm text-[#2B1A1F] border-b border-gray-200 pb-2">
                2. Category Hierarchy & Collections
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                <div className="md:col-span-6 space-y-3">
                  <div>
                    <label className="font-semibold text-xs text-gray-800 block mb-1">
                      Storefront Category Hierarchy *
                    </label>
                    <select
                      value={categoryId}
                      onChange={e => {
                        setCategoryId(e.target.value)
                        setHasUnsavedChanges(true)
                      }}
                      className="w-full p-2.5 border border-gray-300 rounded-xl text-xs text-gray-900 bg-white focus:ring-[#5C0B26]"
                    >
                      <option value="">
                        {categories.length === 0 ? 'No categories exist. Create a category first.' : 'Select Category Path...'}
                      </option>
                      {categoryTreeOptions.map(opt => (
                        <option key={opt.id} value={opt.id!}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                    {categories.length === 0 && (
                      <p className="text-[10px] text-amber-700 mt-1">
                        No active categories found in database. Please create a category on the Categories page first.
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="font-semibold text-xs text-gray-800 block mb-1">
                      Curated Collection (Optional)
                    </label>
                    <select
                      value={collectionId || ''}
                      onChange={e => {
                        setCollectionId(e.target.value || null)
                        setHasUnsavedChanges(true)
                      }}
                      className="w-full p-2.5 border border-gray-300 rounded-xl text-xs text-gray-900 bg-white focus:ring-[#5C0B26]"
                    >
                      <option value="">None — Standard Catalogue</option>
                      {collections.map(col => (
                        <option key={col.id} value={col.id}>
                          {col.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="md:col-span-6 bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-3">
                  <h5 className="font-serif font-bold text-xs text-[#2B1A1F]">Secondary Specs (Optional)</h5>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Input label="Material" value={material} onChange={e => { setMaterial(e.target.value); setHasUnsavedChanges(true) }} placeholder="e.g. Pure Silk" />
                    <Input label="Fit Type" value={fit} onChange={e => { setFit(e.target.value); setHasUnsavedChanges(true) }} placeholder="e.g. Regular Fit" />
                    <Input label="Sleeve Type" value={sleeveType} onChange={e => { setSleeveType(e.target.value); setHasUnsavedChanges(true) }} placeholder="e.g. 3/4 Sleeves" />
                    <Input label="Neck Type" value={neckType} onChange={e => { setNeckType(e.target.value); setHasUnsavedChanges(true) }} placeholder="e.g. Round Neck" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: FAMILY & COLOURWAYS */}
          {activeStep === 3 && (
            <div className="space-y-4">
              <h4 className="font-serif font-bold text-sm text-[#2B1A1F] border-b border-gray-200 pb-2">
                3. Product Family & Colourways Architecture
              </h4>

              {productFamilies.length === 0 && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-center space-x-2">
                  <Info className="w-4 h-4 text-amber-600 flex-shrink-0" />
                  <span>Product Family features are currently running in ungrouped mode.</span>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                <div className="md:col-span-6 space-y-3">
                  <div>
                    <label className="font-semibold text-xs text-gray-800 block mb-1">
                      Product Family Group
                    </label>
                    {isFamiliesLoading ? (
                      <div className="space-y-1">
                        <select
                          disabled
                          className="w-full p-2.5 border border-gray-300 rounded-xl text-xs text-gray-400 bg-gray-50 cursor-not-allowed"
                        >
                          <option>Loading Product Families...</option>
                        </select>
                      </div>
                    ) : familiesError ? (
                      <div className="space-y-2">
                        <select
                          disabled
                          className="w-full p-2.5 border border-red-300 rounded-xl text-xs text-red-700 bg-red-50 cursor-not-allowed"
                        >
                          <option>Unable to load Product Families.</option>
                        </select>
                        {onRetryFamilies && (
                          <button
                            type="button"
                            onClick={onRetryFamilies}
                            className="text-xs text-[#5C0B26] font-semibold hover:underline flex items-center space-x-1 cursor-pointer"
                          >
                            <RefreshCw className="w-3 h-3 mr-1 inline" />
                            <span>Retry loading families</span>
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <select
                          value={productFamilyId || ''}
                          onChange={e => {
                            setProductFamilyId(e.target.value || null)
                            setHasUnsavedChanges(true)
                          }}
                          className="w-full p-2.5 border border-gray-300 rounded-xl text-xs text-gray-900 bg-white focus:ring-[#5C0B26]"
                        >
                          <option value="">Ungrouped</option>
                          {productFamilies.map(fam => (
                            <option key={fam.id} value={fam.id}>
                              {fam.name}{fam.categoryName ? ` — ${fam.categoryName}` : ''}
                            </option>
                          ))}
                        </select>
                        {productFamilies.length === 0 && (
                          <p className="text-[11px] text-amber-800 font-medium">
                            No Product Families exist. Create one first.
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="font-semibold text-xs text-gray-800 block">Primary Colour</label>
                          <button
                            type="button"
                            onClick={() => setIsAddColorModalOpen(true)}
                            className="text-[10px] text-[#5C0B26] hover:underline font-bold cursor-pointer"
                          >
                            + Add New Colour
                          </button>
                        </div>
                        <select
                          value={primaryColorId || ''}
                          onChange={e => {
                            const newColorId = e.target.value || null
                            setPrimaryColorId(newColorId)
                            setHasUnsavedChanges(true)
                            const selected = localColors.find(c => c.id === newColorId)
                            const newName = selected ? selected.name : colorName
                            if (selected) setColorName(selected.name)

                            setVariants(prev => prev.map(v => ({
                              ...v,
                              color_id: newColorId,
                              color_name: newName || v.color_name || 'Default'
                            })))
                          }}
                          className="w-full p-2.5 border border-gray-300 rounded-xl text-xs text-gray-900 bg-white focus:ring-[#5C0B26]"
                        >
                          <option value="">Select Primary Colour...</option>
                          {localColors.map(c => (
                            <option key={c.id} value={c.id}>
                              {c.name} ({c.hex_code})
                            </option>
                          ))}
                        </select>
                      </div>

                      <Input
                        label="Colour Name"
                        value={colorName}
                        onChange={e => {
                          const val = e.target.value
                          setColorName(val)
                          setHasUnsavedChanges(true)
                          setVariants(prev => prev.map(v => ({
                            ...v,
                            color_id: primaryColorId,
                            color_name: val.trim() || v.color_name || 'Default'
                          })))
                        }}
                      />
                    </div>

                  <div className="pt-2 border-t border-gray-200">
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input type="checkbox" checked={showColorOption} onChange={e => { setShowColorOption(e.target.checked); setHasUnsavedChanges(true) }} className="w-4 h-4 text-[#5C0B26] rounded" />
                      <span className="font-bold text-xs text-gray-800">Show Colour Switcher to Customers</span>
                    </label>
                  </div>
                </div>

                <div className="md:col-span-6 bg-[#FAF8F5] p-4 rounded-xl border border-gray-200 space-y-3 text-xs">
                  <h5 className="font-serif font-bold text-xs text-[#2B1A1F] flex items-center space-x-1">
                    <Sparkles className="w-4 h-4 text-[#D4AF37]" />
                    <span>Safety Rules</span>
                  </h5>
                  <p className="text-gray-600">Unlinking a product updates only family ID without deleting stock or images.</p>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: IMAGES */}
          {activeStep === 4 && (
            <div className="space-y-4">
              <h4 className="font-serif font-bold text-sm text-[#2B1A1F] border-b border-gray-200 pb-2 flex items-center justify-between">
                <span>4. Product Images</span>
                <span className="text-xs text-gray-500">{images.length} Image(s) Attached</span>
              </h4>

              <div className="space-y-3">
                <label className="cursor-pointer bg-[#5C0B26] text-white px-4 py-2 rounded-xl text-xs font-semibold inline-flex items-center space-x-2 hover:bg-[#8C3A57] transition-colors">
                  <Upload className="w-4 h-4 text-[#D4AF37]" />
                  <span>Upload Images</span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={e => {
                      const files = Array.from(e.target.files || [])
                      const newImgs: ProductImageState[] = files.map((file) => ({
                        type: 'new',
                        file,
                        image_url: URL.createObjectURL(file),
                        storage_path: `catalog/${Date.now()}-${Math.random().toString(36).substring(2, 7)}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`,
                        alt_text: title || 'Product Image'
                      }))
                      setImages(prev => [...prev, ...newImgs])
                      setHasUnsavedChanges(true)
                    }}
                    className="hidden"
                  />
                </label>

                {images.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                    {images.map((img, idx) => (
                      <div key={idx} className="relative rounded-xl border border-gray-200 overflow-hidden bg-gray-100">
                        <div className="relative aspect-3/4 w-full">
                          <Image src={getImageUrl(img)} alt={title || 'Product'} fill className="object-cover" />
                        </div>
                        <div className="p-1.5 bg-white flex items-center justify-between border-t">
                          {idx === 0 ? (
                            <span className="text-[10px] bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded font-bold">Primary</span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setImages(prev => {
                                  const next = [...prev]
                                  const [item] = next.splice(idx, 1)
                                  next.unshift(item)
                                  return next
                                })
                                setHasUnsavedChanges(true)
                              }}
                              className="text-[10px] text-amber-800 font-bold hover:underline cursor-pointer"
                            >
                              Make Primary
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              setImages(prev => prev.filter((_, i) => i !== idx))
                              setHasUnsavedChanges(true)
                            }}
                            className="text-rose-600 p-1 hover:bg-rose-50 rounded cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP 5: SIZES & VARIANTS */}
          {activeStep === 5 && (
            <div className="space-y-4">
              <h4 className="font-serif font-bold text-sm text-[#2B1A1F] border-b border-gray-200 pb-2">
                5. Available Sizes & Variant Matrix
              </h4>

              <p className="text-xs text-gray-600">
                Click size options to generate matching inventory rows in Step 6.
              </p>

              <div className="flex flex-wrap gap-2">
                {STANDARD_SIZES.map(s => {
                  const matchingSize = (sizes || []).find(sz => sz.name === s || sz.display_name === s)
                  const sizeId = matchingSize?.id || s
                  const isSelected = selectedSizes.includes(sizeId)
                  const hasInactiveVariant = initialProduct?.variants?.some((v: any) => {
                    const vSizeId = v.size_id || (sizes || []).find(sz => sz.name === v.size || sz.display_name === v.size)?.id
                    return vSizeId === sizeId && v.is_active === false
                  })

                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => handleToggleSize(sizeId)}
                      title={hasInactiveVariant ? `${s} (Inactive variant exists in database)` : undefined}
                      className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                        isSelected
                          ? 'bg-[#5C0B26] text-white border-[#5C0B26] shadow-xs'
                          : hasInactiveVariant
                            ? 'bg-gray-50 text-gray-400 border-dashed border-gray-300 hover:bg-gray-100'
                            : 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200'
                      }`}
                    >
                      {s}
                    </button>
                  )
                })}
              </div>

              <div className="mt-4 p-3 bg-[#FAF8F5] rounded-xl border border-gray-200 text-xs text-gray-700 space-y-1">
                <p className="font-bold">Selected variants:</p>
                <p className="font-medium text-[#5C0B26]">
                  {selectedSizes.length} sizes &times; 1 colour = {selectedSizes.length} variants
                </p>
                {showColorOption && (
                  <p className="text-[10px] text-gray-500">
                    * Since the colour switcher is active, this configuration represents {selectedSizes.length} sizes &times; 1 colour = {selectedSizes.length} active variants for this specific product colourway.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* STEP 6: INVENTORY */}
          {activeStep === 6 && (
            <div className="space-y-4">
              <h4 className="font-serif font-bold text-sm text-[#2B1A1F] border-b border-gray-200 pb-2">
                6. Inventory & Stock Management
              </h4>

              <div className="grid grid-cols-3 gap-3 bg-[#FAF8F5] p-4 rounded-xl border border-gray-200 text-center">
                <div>
                  <span className="text-[10px] text-gray-500 font-bold block">TOTAL STOCK</span>
                  <span className="font-serif font-bold text-lg text-[#5C0B26]">{totalStockQuantity}</span>
                </div>
                <div>
                  <span className="text-[10px] text-gray-500 font-bold block">RESERVED</span>
                  <span className="font-serif font-bold text-lg text-amber-700">{totalReservedQuantity}</span>
                </div>
                <div>
                  <span className="text-[10px] text-gray-500 font-bold block">AVAILABLE</span>
                  <span className="font-serif font-bold text-lg text-emerald-700">{totalAvailableQuantity}</span>
                </div>
              </div>

              {variants.filter(v => v.isActive !== false && !v.isSizeRemoved).length === 0 ? (
                <div className="p-6 bg-gray-50 rounded-xl border border-dashed border-gray-300 text-center space-y-2">
                  <Warehouse className="w-8 h-8 text-gray-400 mx-auto" />
                  <p className="font-semibold text-xs text-gray-700">No variants have been created yet.</p>
                  <p className="text-[11px] text-gray-500">Select sizes in Step 5 (Sizes & Variants) to generate stock rows.</p>
                  <Button type="button" onClick={() => setActiveStep(5)} className="bg-[#5C0B26] text-white text-xs mt-2">
                    Go to Step 5: Select Sizes
                  </Button>
                </div>
              ) : (
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#FAF8F5] border-b border-gray-200 font-serif font-bold text-[#2B1A1F]">
                      <tr>
                        <th className="p-3">Size</th>
                        <th className="p-3">Variant SKU</th>
                        <th className="p-3 w-32">Weight (g)</th>
                        <th className="p-3 w-32">Stock Quantity</th>
                        <th className="p-3 text-center">Reserved</th>
                        <th className="p-3 text-center">Available</th>
                        <th className="p-3">Status</th>
                        <th className="p-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {variants.filter(v => v.isActive !== false && !v.isSizeRemoved).map((v) => {
                        const reserved = Number(v.reserved_quantity) || 0
                        const stock = Number(v.stock_quantity) || 0
                        const avail = Math.max(stock - reserved, 0)
                        const rowKey = `${v.size}:${v.color_id || 'default'}`

                        return (
                          <tr key={rowKey} className="hover:bg-amber-50/20">
                            <td className="p-3 font-bold text-gray-900">
                              <span className="bg-[#5C0B26]/10 text-[#5C0B26] px-2.5 py-1 rounded-lg text-xs font-bold">
                                {v.size}
                              </span>
                            </td>
                            <td className="p-3 font-mono text-[11px] text-gray-600">
                              {v.sku}
                            </td>
                            <td className="p-3">
                              <input
                                type="number"
                                min="0"
                                value={v.shipping_weight_grams ?? ''}
                                onChange={e => handleUpdateVariantWeight(v.sizeName || v.size || '', e.target.value === '' ? null : Number(e.target.value))}
                                placeholder="Default"
                                className="w-24 p-1.5 border border-gray-300 rounded-lg text-xs font-bold text-gray-900 text-center focus:ring-2 focus:ring-[#5C0B26]"
                              />
                            </td>
                            <td className="p-3">
                              <input
                                type="number"
                                min="0"
                                value={v.quantity ?? v.stock_quantity ?? 0}
                                onChange={e => handleUpdateVariantStock(v.sizeName || v.size || '', Number(e.target.value))}
                                className="w-24 p-1.5 border border-gray-300 rounded-lg text-xs font-bold text-gray-900 text-center focus:ring-2 focus:ring-[#5C0B26]"
                              />
                            </td>
                            <td className="p-3 text-center font-bold text-amber-700">
                              {reserved}
                            </td>
                            <td className="p-3 text-center font-bold text-emerald-700">
                              {avail}
                            </td>
                            <td className="p-3">
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${stock > 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                                {stock > 0 ? 'In Stock' : 'Out of Stock'}
                              </span>
                            </td>
                            <td className="p-3 text-right">
                              <button
                                type="button"
                                onClick={() => handleRemoveVariant(v.sizeName || v.size || '')}
                                className="text-gray-400 hover:text-rose-700 p-1 hover:bg-rose-50 rounded cursor-pointer"
                                title="Remove size variant"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Storefront Stock Message Section */}
              <div className="pt-6 mt-6 border-t border-gray-200 space-y-4">
                <h5 className="font-serif font-bold text-xs text-[#2B1A1F] uppercase tracking-wider">
                  Storefront Stock Message
                </h5>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-gray-50 dark:bg-gray-900/30 rounded-xl border border-gray-200">
                  <div className="space-y-4">
                    <label className="flex items-start space-x-3 cursor-pointer pt-2">
                      <input
                        type="checkbox"
                        checked={showStorefrontStockMessage}
                        onChange={e => setShowStorefrontStockMessage(e.target.checked)}
                        className="rounded border-[#5C0B26]/20 text-[#5C0B26] focus:ring-[#5C0B26] w-4 h-4 mt-0.5"
                      />
                      <div className="space-y-0.5">
                        <span className="text-xs font-semibold text-[#2B1A1F] dark:text-[#FFF4DC]">
                          Show manual low-stock message on storefront
                        </span>
                        <p className="text-[10px] text-gray-500">
                          Enable this to display a static, manual urgency warning count to customers.
                        </p>
                      </div>
                    </label>

                    <div className="space-y-1 ml-7">
                      <label className="block text-[11px] font-bold text-[#2B1A1F] dark:text-[#FFF4DC] mb-1">
                        Number to display to customers:
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={20}
                        value={storefrontStockMessageQuantity}
                        onChange={e => setStorefrontStockMessageQuantity(Math.max(1, Math.min(20, parseInt(e.target.value) || 1)))}
                        disabled={!showStorefrontStockMessage}
                        className={`w-32 p-2 border border-gray-300 rounded-lg text-xs font-bold text-gray-900 focus:ring-2 focus:ring-[#5C0B26] ${
                          !showStorefrontStockMessage ? 'bg-gray-100 text-gray-400 cursor-not-allowed border-gray-200' : ''
                        }`}
                      />
                      <p className="text-[10px] text-amber-700 dark:text-amber-500 font-medium">
                        * This is a storefront display message only. It does not change real inventory.
                      </p>
                    </div>
                  </div>

                  <div className="p-4 bg-white dark:bg-gray-950 rounded-lg border border-gray-200/60 flex flex-col justify-center space-y-2">
                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">
                      Storefront Customer Preview
                    </span>
                    {showStorefrontStockMessage ? (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-[11px] p-2 bg-amber-50 dark:bg-amber-950/20 border border-amber-100 rounded">
                          <span className="text-gray-500 font-medium">Customer sees:</span>
                          <span className="text-amber-700 dark:text-amber-400 font-bold">
                            Only {storefrontStockMessageQuantity} left!
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="text-[11px] text-gray-500 italic p-4 text-center">
                        Manual stock messages are disabled. Customers will only see standard &quot;In Stock&quot; or &quot;Out of Stock&quot; notices based on real inventory.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 7: PRICING */}
          {activeStep === 7 && (
            <div className="space-y-4">
              <h4 className="font-serif font-bold text-sm text-[#2B1A1F] border-b border-gray-200 pb-2">
                7. Pricing Structure
              </h4>

              <div className="grid grid-cols-2 gap-4 max-w-md">
                <Input
                  label="Selling Price (₹) *"
                  type="number"
                  value={sellingPrice}
                  onChange={e => {
                    setSellingPrice(e.target.value)
                    setHasUnsavedChanges(true)
                  }}
                  required
                />
                <Input
                  label="MRP Price (₹) *"
                  type="number"
                  value={mrp}
                  onChange={e => {
                    setMrp(e.target.value)
                    setHasUnsavedChanges(true)
                  }}
                  required
                />
              </div>
            </div>
          )}

          {/* STEP 8: SHIPPING & RETURNS */}
          {activeStep === 8 && (() => {
            return (
              <div className="space-y-4 animate-in fade-in duration-200">
                <h4 className="font-serif font-bold text-sm text-[#2B1A1F] border-b border-gray-200 pb-2">
                  8. Shipping & Delivery Configuration
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                  <div className="md:col-span-7 space-y-4 bg-gray-50 p-4 rounded-xl border border-gray-200 text-xs">
                    <h5 className="font-serif font-bold text-xs text-[#2B1A1F]">Delivery Configuration</h5>

                    <div className="flex flex-wrap gap-4 pt-1">
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input type="checkbox" checked={deliveryAvailable} onChange={e => { setDeliveryAvailable(e.target.checked); setHasUnsavedChanges(true) }} className="w-4 h-4 text-[#5C0B26] rounded" />
                        <span className="font-bold text-gray-800">Delivery Available</span>
                      </label>
                      <label className="flex items-center space-x-2 cursor-not-allowed">
                        <input type="checkbox" checked={true} disabled className="w-4 h-4 text-[#5C0B26] rounded opacity-60" />
                        <span className="font-bold text-emerald-800">Free Delivery</span>
                      </label>
                    </div>
                    <p className="text-[10px] text-emerald-700 font-semibold mt-0.5">Free shipping is currently enabled store-wide.</p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                      <Input
                        label="Min Delivery Days (e.g. 3)"
                        type="number"
                        min="1"
                        value={deliveryMinDays}
                        onChange={e => { setDeliveryMinDays(e.target.value); setHasUnsavedChanges(true) }}
                      />
                      <Input
                        label="Max Delivery Days (e.g. 7)"
                        type="number"
                        min="1"
                        value={deliveryMaxDays}
                        onChange={e => { setDeliveryMaxDays(e.target.value); setHasUnsavedChanges(true) }}
                      />
                    </div>

                    <Input
                      label="Delivery Notice / Courier Message"
                      value={deliveryMessage}
                      onChange={e => { setDeliveryMessage(e.target.value); setHasUnsavedChanges(true) }}
                      placeholder="e.g. Ships via express courier within 24 hours"
                    />

                    <div className="pt-3 border-t border-gray-200 space-y-3">
                      <h5 className="font-serif font-bold text-xs text-[#2B1A1F]">Return & Exchange Policy</h5>
                      <div className="flex items-center space-x-4">
                        <label className="flex items-center space-x-2 cursor-not-allowed">
                          <input type="checkbox" checked={false} disabled className="w-4 h-4 text-[#5C0B26] rounded opacity-60" />
                          <span className="font-bold text-gray-800">Returnable Item</span>
                        </label>
                      </div>
                      <p className="text-[10px] text-rose-800 font-medium mt-0.5">
                        Returns will be enabled after the inspection and refund workflow is completed.
                      </p>
                    </div>
                  </div>

                  {/* Live Storefront Preview */}
                  <div className="md:col-span-5 bg-[#FAF8F5] p-4 rounded-xl border border-gray-200 space-y-3 text-xs">
                    <h5 className="font-serif font-bold text-xs text-[#5C0B26] flex items-center space-x-1.5">
                      <Truck className="w-4 h-4 text-[#D4AF37]" />
                      <span>Live Storefront Preview</span>
                    </h5>

                    <div className="p-3 bg-white rounded-xl border border-gray-200 space-y-2 shadow-xs">
                      <div className="text-[11px] space-y-1.5 text-gray-600 pl-3 border-l-2 border-[#5C0B26]">
                        <p>
                          <span className="font-semibold text-gray-800">Estimated delivery:</span>{' '}
                          {deliveryAvailable 
                            ? `${deliveryMinDays || 3}–${deliveryMaxDays || 7} business days` 
                            : 'Delivery unavailable'}
                        </p>
                        <p>
                          <span className="font-semibold text-gray-800">Shipping:</span> Free
                        </p>
                        <p>
                          <span className="font-semibold text-gray-800">Payment:</span> Prepaid only
                        </p>
                        <p>
                          <span className="font-semibold text-gray-800">Returns:</span> Non-returnable
                        </p>
                        {deliveryMessage && (
                          <p className="italic text-gray-500 text-[10px]">&quot;{deliveryMessage}&quot;</p>
                        )}
                      </div>
                    </div>

                    <p className="text-[10px] text-gray-500">
                      Storefront estimates delivery business days based on the customer’s order timestamp and courier transit times.
                    </p>
                  </div>
                </div>
              </div>
            )
          })()}

          {/* STEP 9: SEO */}
          {activeStep === 9 && (
            <div className="space-y-4">
              <h4 className="font-serif font-bold text-sm text-[#2B1A1F] border-b border-gray-200 pb-2">
                9. SEO Indexing
              </h4>

              <Input label="SEO Title" value={title} onChange={e => handleTitleChange(e.target.value)} />
            </div>
          )}

          {/* STEP 10: REVIEW & PUBLISH */}
          {activeStep === 10 && (
            <div className="space-y-4">
              <h4 className="font-serif font-bold text-sm text-[#2B1A1F] border-b border-gray-200 pb-2">
                10. Review & Publish
              </h4>

              <div className="p-4 bg-[#FAF8F5] rounded-xl border border-gray-200 text-xs space-y-1">
                <p><span className="font-semibold">Title:</span> {title || 'Untitled Garment'}</p>
                <p><span className="font-semibold">SKU:</span> {sku || '—'}</p>
                <p><span className="font-semibold">Price:</span> ₹{sellingPrice || '0'} (MRP: ₹{mrp || '0'})</p>
                <p><span className="font-semibold">Total Stock:</span> {totalStockQuantity} units across {variants.filter(v => v.isActive !== false && !v.isSizeRemoved).length} variant(s)</p>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                <Button type="button" variant="outline" onClick={handleCancelClick}>
                  Cancel
                </Button>
                <Button type="button" onClick={() => handleSubmit(false)} className="bg-gray-800 text-white">
                  {initialProduct && initialProduct.is_active !== false ? 'Save as Draft' : 'Save Draft'}
                </Button>
                <Button type="button" onClick={() => handleSubmit(true)} className="bg-[#5C0B26] text-white">
                  {initialProduct && initialProduct.is_active !== false ? 'Update Published Product' : 'Publish Product'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add New Color Modal inside ProductForm */}
      {isAddColorModalOpen && (
        <Modal
          isOpen={isAddColorModalOpen}
          onClose={() => setIsAddColorModalOpen(false)}
          title="Add New Colour Swatch"
        >
          <form onSubmit={handleCreateNewColor} className="space-y-4 pt-2">
            {colorModalError && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-800 text-xs rounded-xl flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
                <span>{colorModalError}</span>
              </div>
            )}

            <div className="space-y-1">
              <label className="block text-xs font-semibold text-gray-700">Colour Name</label>
              <Input
                value={newColorName}
                onChange={e => setNewColorName(e.target.value)}
                placeholder="e.g. Royal Maroon"
                required
                className="text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-gray-700">Colour Code</label>
                <Input
                  value={newColorCode}
                  onChange={e => setNewColorCode(e.target.value.toUpperCase())}
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
                    value={newColorHex}
                    onChange={e => setNewColorHex(e.target.value)}
                    placeholder="#800000"
                    required
                    className="text-xs font-mono pl-3"
                  />
                  <div
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-md border border-gray-200 shadow-sm"
                    style={{ backgroundColor: newColorHex.startsWith('#') ? newColorHex : `#${newColorHex}` }}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-semibold text-gray-700">Sort Order</label>
              <Input
                type="number"
                value={newColorOrder}
                onChange={e => setNewColorOrder(e.target.value)}
                placeholder="1"
                className="text-xs"
              />
            </div>

            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-100">
              <Button type="button" variant="outline" onClick={() => setIsAddColorModalOpen(false)} className="text-xs">
                Cancel
              </Button>
              <Button type="submit" disabled={isCreatingColor} className="bg-[#5C0B26] text-white text-xs">
                {isCreatingColor ? 'Creating...' : 'Create Colour'}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
