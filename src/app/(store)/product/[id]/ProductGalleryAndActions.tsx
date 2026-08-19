'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { toggleWishlistAction, checkWishlistStatusAction } from '@/actions/wishlist/actions'
import Image from 'next/image'
import { Heart, ShoppingBag, Star, ShieldCheck, Truck, RefreshCw, Check, Loader2 } from 'lucide-react'
import { Product, ProductVariant } from '@/types/database'
import { formatINR } from '@/lib/utils'
import { useCart } from '@/context/CartContext'
import { useToast } from '@/context/ToastContext'
import { useAuth } from '@/context/AuthContext'
import { ProductPrice } from '@/components/products/ProductPrice'

import type { StorefrontColourway } from '@/services/products'
interface ProductGalleryAndActionsProps {
  product: Product
  variants: ProductVariant[]
  colourways?: StorefrontColourway[]
  colourwaysError?: string | null
}

export const ProductGalleryAndActions: React.FC<ProductGalleryAndActionsProps> = ({
  product,
  variants = [],
  colourways = [],
  colourwaysError = null,
}) => {
  const showColorsOnStorefront = product.show_color_option !== undefined ? !!product.show_color_option : false;

  // Extract unique active real colors (excluding technical Default)
  const activeRealColors = Array.from(
    new Map(
      variants
        .filter(v => v.color_id && v.color_name && v.is_active !== false && v.color_name !== 'Default')
        .map(v => [v.color_id!, { id: v.color_id!, name: v.color_name, code: v.color_code }])
    ).values()
  );

  const colors = showColorsOnStorefront ? activeRealColors : [];

  let hiddenTargetColorId: string | null = null;
  if (!showColorsOnStorefront) {
    if (activeRealColors.length === 1) {
      hiddenTargetColorId = activeRealColors[0].id;
    } else if (activeRealColors.length > 1) {
      hiddenTargetColorId = product.storefront_default_color_id || null;
    }
  }

  const filteredVariantsForSizes = showColorsOnStorefront
    ? variants
    : hiddenTargetColorId
      ? variants.filter(v => v.color_id === hiddenTargetColorId)
      : variants.filter(v => !v.color_name || v.color_name === 'Default');

  // Extract unique sizes from active variants
  const sizes = Array.from(
    new Map(
      filteredVariantsForSizes
        .filter(v => v.size_id && v.size && v.is_active !== false && v.size !== 'One Size')
        .map(v => [v.size_id!, { id: v.size_id!, name: v.size }])
    ).values()
  )

  const hasColors = colors.length > 0
  const hasSizes = sizes.length > 0
  const hasRealColors = colors.length > 1

  const [selectedColorId, setSelectedColorId] = useState<string | null>(() => {
    return colors.length === 1 ? colors[0].id : null
  })
  const [selectedSizeId, setSelectedSizeId] = useState<string | null>(null)

  // Resolve Active Variant
  let activeVariant: ProductVariant | undefined = undefined
  if (hasColors && hasSizes) {
    if (selectedColorId && selectedSizeId) {
      activeVariant = variants.find(
        v => v.color_id === selectedColorId && v.size_id === selectedSizeId && v.is_active !== false
      )
    }
  } else if (hasSizes) {
    if (selectedSizeId) {
      activeVariant = filteredVariantsForSizes.find(
        v => v.size_id === selectedSizeId && v.is_active !== false
      )
    }
  } else if (hasColors) {
    if (selectedColorId) {
      activeVariant = variants.find(
        v => v.color_id === selectedColorId && v.is_active !== false
      )
    }
  } else {
    activeVariant = filteredVariantsForSizes.find(v => v.is_active !== false)
  }

  // Reset selected values when product changes to keep in sync with current product page
  useEffect(() => {
    const defaultColorId = product.primary_color_id || (colors.length > 0 ? colors[0].id : null);
    setSelectedColorId(defaultColorId);
    setSelectedSizeId(null);
    setQuantity(1);
  }, [product.id]);

  useEffect(() => {
    if (colors.length === 1 && selectedColorId !== colors[0].id) {
      setSelectedColorId(colors[0].id)
    }
  }, [variants, colors, selectedColorId])

  // Temporary development-only verification log
  if (process.env.NODE_ENV === 'development') {
    console.log('--- STOREFRONT DIAGNOSTIC LOG ---');
    console.log('Product ID:', product.id);
    console.log('Total Variants Count:', variants.length);
    console.log('Active Variants Count:', variants.filter(v => v.is_active !== false).length);
    console.log('Sizes Names:', variants.map(v => v.size));
    console.log('Sizes IDs:', variants.map(v => v.size_id));
    console.log('Colors Names:', variants.map(v => v.color_name));
    console.log('Quantities:', variants.map(v => `${v.size}: qty=${v.stock_quantity}, res=${v.reserved_quantity}`));
    console.log('---------------------------------');
  }

  const selectedColor = colors.find(c => c.id === selectedColorId) || null
  const selectedSize = sizes.find(s => s.id === selectedSizeId) || null

  // Get unique sizes assigned to selected color (or all sizes if no color is selected/present)
  const SIZE_ORDER = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL', 'One Size']
  
  const rawSizes = variants
    .filter(v => {
      if (v.is_active !== false) {
        if (!v.size_id || !v.size) {
          console.warn(`[DATA-INTEGRITY] Variant ${v.id} is active but has missing size relation. size_id: ${v.size_id}, size: ${v.size}`);
          return false;
        }
      }
      return (!hasColors || !selectedColorId || v.color_id === selectedColorId) && v.is_active !== false
    })
    .map(v => ({ id: v.size_id!, name: v.size!, sortOrder: v.sizeSortOrder ?? 9999 }))

  const availableSizes = Array.from(
    new Map(rawSizes.map(s => [s.id, s])).values()
  ).sort((a, b) => {
    const orderDiff = (a.sortOrder ?? 9999) - (b.sortOrder ?? 9999)
    if (orderDiff !== 0) return orderDiff

    const nameA = a.name || ''
    const nameB = b.name || ''
    const idxA = SIZE_ORDER.indexOf(nameA)
    const idxB = SIZE_ORDER.indexOf(nameB)
    if (idxA !== -1 || idxB !== -1) {
      if (idxA === -1) return 1
      if (idxB === -1) return -1
      return idxA - idxB
    }

    return nameA.localeCompare(nameB)
  })

  const [quantity, setQuantity] = useState(1)
  const [isWishlisted, setIsWishlisted] = useState(false)
  const [addedToast, setAddedToast] = useState(false)
  const [isAddingToCart, setIsAddingToCart] = useState(false)
  const [justAdded, setJustAdded] = useState(false)
  const [validationError, setValidationError] = useState<string | null>(null)
  const { addItem, openMiniCart } = useCart()
  const { showToast } = useToast()
  const { session, isAuthenticated } = useAuth()

  // Sync wishlist status
  useEffect(() => {
    let active = true
    async function checkWishlist() {
      if (session.type === 'customer') {
        const isSaved = await checkWishlistStatusAction(product.id)
        if (active) {
          setIsWishlisted(isSaved)
        }
      } else {
        try {
          const localWish = JSON.parse(localStorage.getItem('shreengar_wishlist') || '[]')
          if (active) {
            setIsWishlisted(localWish.includes(product.id))
          }
        } catch {
          if (active) {
            setIsWishlisted(false)
          }
        }
      }
    }
    checkWishlist()

    const handleSync = async () => {
      if (session.type === 'customer') {
        const isSaved = await checkWishlistStatusAction(product.id)
        if (active) setIsWishlisted(isSaved)
      } else {
        try {
          const localWish = JSON.parse(localStorage.getItem('shreengar_wishlist') || '[]')
          if (active) setIsWishlisted(localWish.includes(product.id))
        } catch {}
      }
    }

    window.addEventListener('wishlist-updated', handleSync)
    return () => {
      active = false
      window.removeEventListener('wishlist-updated', handleSync)
    }
  }, [session, product.id])

  const toggleWishlist = async () => {
    if (session.type === 'customer') {
      try {
        const res = await toggleWishlistAction(product.id)
        if (res.success) {
          setIsWishlisted(!!res.isWishlisted)
          window.dispatchEvent(new CustomEvent('wishlist-updated'))
          if (res.isWishlisted) {
            showToast('Added to Wishlist', `"${product.title}" saved.`, 'success')
          } else {
            showToast('Removed from Wishlist', `"${product.title}" removed.`, 'info')
          }
        } else {
          showToast('Error', res.error || 'Could not update wishlist.', 'error')
        }
      } catch {
        showToast('Error', 'Could not update wishlist.', 'error')
      }
    } else {
      try {
        const localWish = JSON.parse(localStorage.getItem('shreengar_wishlist') || '[]')
        let updatedWish = []
        if (isWishlisted) {
          updatedWish = localWish.filter((id: string) => id !== product.id)
          setIsWishlisted(false)
          showToast('Removed from Wishlist', `"${product.title}" removed.`, 'info')
        } else {
          updatedWish = [...localWish, product.id]
          setIsWishlisted(true)
          showToast('Added to Wishlist', `"${product.title}" saved.`, 'success')
        }
        localStorage.setItem('shreengar_wishlist', JSON.stringify(updatedWish))
        window.dispatchEvent(new CustomEvent('wishlist-updated'))
      } catch (err) {
        showToast('Error', 'Could not update wishlist.', 'error')
      }
    }
  }

  const handleColorSelect = (colorId: string) => {
    setSelectedColorId(colorId)
    setValidationError(null)
    // Clear size selection if it's not valid/available for the new color
    if (selectedSizeId) {
      const match = variants.find(
        v => v.color_id === colorId && v.size_id === selectedSizeId && v.is_active !== false
      )
      const stock = match 
        ? Math.max(0, (match.stock_quantity ?? 0) - (match.reserved_quantity ?? 0))
        : 0
      
      if (!match || stock <= 0) {
        setSelectedSizeId(null)
      }
    }
  }

  const handleSizeSelect = (sizeId: string) => {
    setSelectedSizeId(sizeId)
    setValidationError(null)
  }

  // Clear selected values that no longer resolve to active variants
  useEffect(() => {
    if (selectedColorId && !colors.some(c => c.id === selectedColorId)) {
      setSelectedColorId(null)
    }
    if (selectedSizeId && !sizes.some(s => s.id === selectedSizeId)) {
      setSelectedSizeId(null)
    }
  }, [variants])

  // Active variant resolved above

  const getResolvedImage = (item: any): string => {
    if (typeof item === 'string' && item.trim()) return item
    if (item && typeof item === 'object') {
      const url = (item as any).image_url || (item as any).url
      if (url) return url
    }
    return '/images/product-placeholder.webp'
  }

  const resolvedImages = (product.images || []).map(getResolvedImage)
  const [selectedImage, setSelectedImage] = useState<string>(() => resolvedImages[0] || '/images/product-placeholder.webp')

  useEffect(() => {
    const resolved = (product.images || []).map(getResolvedImage)
    if (resolved[0]) {
      setSelectedImage(resolved[0])
    }
  }, [product])

  const handleAddToCart = async () => {
    if (!isAuthenticated) {
      showToast('Authentication Required', 'Please sign in to add items to your bag.', 'error')
      if (typeof window !== 'undefined') {
        const nextUrl = encodeURIComponent(window.location.pathname + window.location.search)
        window.location.href = `/auth/login?next=${nextUrl}`
      }
      return
    }

    if (hasColors && !selectedColorId) {
      setValidationError('Please select a colour.')
      showToast('Selection Required', 'Please select a colour.', 'error')
      return
    }
    if (hasSizes && !selectedSizeId) {
      setValidationError('Please select a size.')
      showToast('Selection Required', 'Please select a size.', 'error')
      return
    }
    setValidationError(null)

    if (!activeVariant) {
      showToast('Not Available', 'This combination is not available.', 'error')
      return
    }
    
    const availableStock = Math.max(0, (activeVariant.stock_quantity ?? 0) - (activeVariant.reserved_quantity ?? 0))
    if (availableStock <= 0) {
      showToast('Out of Stock', 'This combination is out of stock.', 'error')
      return
    }
    if (quantity > maxQuantityAllowed) {
      if (maxQuantityAllowed === MAX_PURCHASE_LIMIT) {
        showToast('Limit Exceeded', `Maximum of ${MAX_PURCHASE_LIMIT} units can be added to your bag.`, 'error')
      } else {
        showToast('Insufficient Stock', `Only ${availableStock} item(s) are available.`, 'error')
      }
      return
    }

    setIsAddingToCart(true)

    // Build guest snapshot (used only if user is not authenticated)
    const snapshot = {
      productId: product.id,
      title: product.title,
      sku: activeVariant.sku,
      size: activeVariant.size,
      colorName: activeVariant.color_name,
      colorCode: activeVariant.color_code,
      price: activeVariant.price_override ?? (product as any).selling_price ?? product.price,
      image: product.images[0] ?? null,
      showColorOption: showColorsOnStorefront,
    }

    const res = await addItem(product.id, activeVariant.id, quantity, snapshot)
    setIsAddingToCart(false)

    if (res.success) {
      setJustAdded(true)
      setAddedToast(true)
      setTimeout(() => setJustAdded(false), 4000)
      setTimeout(() => setAddedToast(false), 4000)
      showToast('Added to Bag!', `${product.title} (${activeVariant.size})`, 'success')
    } else {
      showToast('Could Not Add', res.error || 'Please try again.', 'error')
    }
  }

  const isSimpleProduct = !hasColors && !hasSizes

  const sellingPrice = (product as any).selling_price ?? product.price
  const mrp = (product as any).mrp ?? product.compare_at_price

  const activePrice = activeVariant ? (activeVariant.price_override ?? sellingPrice) : sellingPrice
  const activeMrp = activeVariant ? (activeVariant.price_override ? activeVariant.price_override : mrp) : mrp
  
  const hasOverride = activeVariant && activeVariant.price_override !== null && activeVariant.price_override !== undefined
  
  const getVariantAvailableStock = (v: any) => {
    if (!v) return 0
    const inv = Array.isArray(v.inventory) ? v.inventory[0] : v.inventory
    const qty = v.quantity ?? v.stock_quantity ?? inv?.quantity ?? 0
    const res = v.reservedQuantity ?? v.reserved_quantity ?? inv?.reserved_quantity ?? 0
    const avail = v.availableQuantity ?? v.available_quantity ?? inv?.available_quantity ?? Math.max(qty - res, 0)
    return avail
  }

  // available stock calculation: quantity - reserved_quantity
  const availableStock = activeVariant ? getVariantAvailableStock(activeVariant) : 0
  const isOutOfStock = activeVariant 
    ? availableStock <= 0 
    : (variants.length > 0 && variants.every(v => getVariantAvailableStock(v) <= 0))
  const isProductGloballyOutOfStock = !variants.some(
    v => v.is_active !== false && getVariantAvailableStock(v) > 0
  )
  const showStorefrontStockMessage = !!product.show_storefront_stock_message
  const storefrontStockMessageQuantity = product.storefront_stock_message_quantity !== undefined ? Number(product.storefront_stock_message_quantity) : 1
  const isLowStock = activeVariant && availableStock > 0 && showStorefrontStockMessage

  const MAX_PURCHASE_LIMIT = 10
  const maxQuantityAllowed = activeVariant ? Math.min(availableStock, MAX_PURCHASE_LIMIT) : 1

  const getStockForSize = (sizeName: string) => {
    const targetVariants = (hasColors && selectedColorId)
      ? variants.filter(v => v.color_id === selectedColorId)
      : filteredVariantsForSizes;
    const variantForSz = targetVariants.find(
      v => v.size === sizeName && v.is_active !== false
    )
    if (!variantForSz) return 0
    return getVariantAvailableStock(variantForSz)
  }

  // Ensure quantity does not exceed available stock and purchase limit
  useEffect(() => {
    if (!isOutOfStock && quantity > maxQuantityAllowed && maxQuantityAllowed > 0) {
      setQuantity(maxQuantityAllowed)
    }
  }, [maxQuantityAllowed, isOutOfStock, quantity])

  const isSelectionMissing = (hasColors && !selectedColorId) || (hasSizes && !selectedSizeId)
  const isBuyDisabled = isSelectionMissing || isOutOfStock

  return (
    <>
      {/* Toast Notification */}
      {addedToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-rose-950 text-amber-100 px-5 py-3 rounded-xl shadow-2xl flex items-center space-x-3 border border-amber-400/40 animate-in slide-in-from-bottom duration-300">
          <div className="w-6 h-6 rounded-full bg-emerald-500 text-foreground flex items-center justify-center font-bold">
            ✓
          </div>
          <div>
            <p className="text-xs font-serif font-bold">Added to Cart!</p>
            <p className="text-[10px] text-amber-200/80">{product.title} {!isSimpleProduct && selectedSize && `(Size: ${selectedSize.name})`}</p>
          </div>
          <Link href="/cart" className="text-xs font-bold text-amber-400 underline pl-2">
            View Cart
          </Link>
        </div>
      )}

      {/* Left Column: Image Gallery (7 cols) */}
      <div className="lg:col-span-7 flex flex-col sm:flex-row gap-4">
        {/* Thumbnails */}
        <div className="flex sm:flex-col gap-3 order-2 sm:order-1 overflow-x-auto sm:overflow-y-auto">
          {resolvedImages.map((img, idx) => (
            <button
              key={idx}
              onClick={() => setSelectedImage(img)}
              className={`relative aspect-[3/4] w-16 sm:w-20 rounded-lg overflow-hidden border-2 transition-all flex-shrink-0 ${
                selectedImage === img ? 'border-rose-950 scale-105' : 'border-transparent opacity-70 hover:opacity-100'
              }`}
            >
              <Image
                src={img}
                alt={`${product.title} ${idx}`}
                fill
                className="object-cover"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = '/images/product-placeholder.webp';
                }}
                unoptimized
              />
            </button>
          ))}
        </div>

        {/* Main Display Image */}
        <div className="flex-1 order-1 sm:order-2 aspect-[3/4] rounded-2xl overflow-hidden bg-rose-950/5 border border-border relative shadow-lg">
          {selectedImage ? (
            <Image
              key={selectedImage}
              src={selectedImage}
              alt={product.title}
              fill
              className="object-cover object-top animate-fade-in"
              onError={() => setSelectedImage('/images/product-placeholder.webp')}
              unoptimized
            />
          ) : (
            <Image src="/images/product-placeholder.webp" alt="Image unavailable" fill className="object-cover object-center opacity-80" />
          )}
          <button
            onClick={toggleWishlist}
            className="absolute top-4 right-4 p-3 bg-surface-muted/80 backdrop-blur-md rounded-full text-foreground hover:bg-surface transition-all shadow-md z-10 cursor-pointer min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label={isWishlisted ? "Remove from Wishlist" : "Add to Wishlist"}
          >
            <Heart className={`w-5 h-5 ${isWishlisted ? 'fill-rose-700 text-rose-700' : 'text-foreground'}`} />
          </button>
        </div>
      </div>

      {/* Right Column: Variant Selector & Purchase Options (5 cols) */}
      <div className="lg:col-span-5 space-y-6">
        <div>
          <span className="text-xs uppercase font-bold tracking-widest text-amber-800">
            {product.fabric || 'Heritage Couture'}
          </span>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-foreground mt-1 leading-snug">
            {product.title}
          </h1>

          <div className="flex items-center space-x-3 mt-3">
            <div className="flex items-center space-x-1 bg-amber-100 dark:bg-amber-950/40 px-2.5 py-0.5 rounded text-foreground dark:text-amber-300 font-bold text-xs">
              <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
              <span>{product.rating}</span>
            </div>
            <span className="text-xs text-muted-foreground">|</span>
            <span className="text-xs text-muted-foreground font-medium">{product.reviews_count} Verified Customer Reviews</span>
          </div>
        </div>

        {/* Price Breakdown */}
        <div className="p-4 bg-surface-muted/60 rounded-xl border border-border flex items-center">
          <ProductPrice 
            sellingPrice={activePrice} 
            mrp={activeMrp} 
            className="flex items-baseline space-x-3"
            priceClassName="text-3xl font-serif font-bold text-foreground"
            mrpClassName="text-sm text-muted-foreground line-through"
            discountClassName="text-xs font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 px-2 py-0.5 rounded shadow-sm"
          />
        </div>
        
        {hasOverride && (
          <div className="px-4">
            <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">SKU Price</span>
          </div>
        )}

        {/* Myntra-style MORE COLOURS Section */}
        {showColorsOnStorefront && (colourwaysError || (colourways && colourways.length > 1)) && (
          <div className="space-y-2.5 pt-2 border-t border-border">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-foreground">
                MORE COLOURS
              </span>
              {!colourwaysError && (
                <span className="text-[11px] font-medium text-amber-800 dark:text-amber-300">
                  {colourways.length} Colours Available
                </span>
              )}
            </div>

            {colourwaysError ? (
              <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-xs text-red-700 flex items-center space-x-2 font-medium">
                <span>{colourwaysError}</span>
              </div>
            ) : (
              /* Desktop & Mobile Scrollable Row */
              <div className="flex items-center space-x-3 overflow-x-auto snap-x scrollbar-none pb-1.5 pt-0.5">
                {colourways.map(col => {
                  const isSelected = col.productId === product.id
                  return (
                    <Link
                      key={col.productId}
                      href={`/product/${col.slug}`}
                      aria-label={`${col.colorName || 'Colour'}, open ${col.title}`}
                      className={`group relative flex-shrink-0 w-16 sm:w-20 snap-start rounded-lg border-2 transition-all duration-200 p-1 bg-surface cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-primary ${
                        isSelected
                          ? 'border-brand-primary dark:border-gold ring-2 ring-brand-primary/30 dark:ring-gold/30 shadow-sm'
                          : 'border-border hover:border-gold/60'
                      }`}
                    >
                      <div className="relative aspect-[3/4] w-full rounded overflow-hidden bg-surface-muted">
                        {col.imageUrl ? (
                          <Image
                            src={col.imageUrl}
                            alt={col.title}
                            fill
                            sizes="(max-width: 640px) 64px, 80px"
                            className="object-cover object-top group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[10px] text-muted-foreground">No Img</div>
                        )}
                        {isSelected && (
                          <div className="absolute inset-0 bg-brand-primary/10 border-2 border-brand-primary dark:border-gold rounded pointer-events-none" />
                        )}
                      </div>
                      <div className="mt-1 text-center">
                        <p className={`text-[10px] font-medium truncate ${isSelected ? 'text-brand-primary dark:text-gold font-bold' : 'text-foreground'}`}>
                          {col.colorName || col.title}
                        </p>
                      </div>
                    </Link>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* Color Swatch Selection */}
        {!isSimpleProduct && colors.length > 0 && (
          <div className="space-y-2">
            {hasRealColors ? (
              <>
                <span className="text-xs font-bold uppercase tracking-wider text-foreground">Select Color: <strong className="text-gold">{selectedColor?.name || 'Choose a colour'}</strong></span>
                <div className="flex items-center space-x-2">
                  {colors.map(col => (
                    <button
                      key={col.id}
                      onClick={() => handleColorSelect(col.id)}
                      className={`w-8 h-8 rounded-full border-2 transition-all p-0.5 cursor-pointer ${
                        selectedColorId === col.id ? 'border-brand-primary dark:border-gold scale-110 shadow-md' : 'border-transparent opacity-70 hover:opacity-100'
                      }`}
                      title={col.name}
                    >
                      <span
                        className="block w-full h-full rounded-full border border-border"
                        style={{ backgroundColor: col.code }}
                      />
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <div className="text-xs text-muted-foreground font-semibold">
                Colour: <span className="text-foreground font-bold">{colors[0].name}</span>
              </div>
            )}
          </div>
        )}

        {/* Size Selection */}
        {!isSimpleProduct && hasSizes && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-foreground">
                Select Size: <strong className="text-gold">{selectedSize?.name || 'Choose a size'}</strong>
              </span>
              <button className="text-[11px] font-semibold text-gold underline">Size Chart</button>
            </div>
            {hasColors && !selectedColorId ? (
              <p className="text-xs text-brand-primary dark:text-gold font-medium bg-surface-warm border border-border-warm px-3 py-2 rounded-lg">
                Please select a color first to see size availability.
              </p>
            ) : (
              <div className="grid grid-cols-4 gap-3">
                {availableSizes.map(sz => {
                  const stockForSz = getStockForSize(sz.name)
                  const isSzOutOfStock = stockForSz <= 0

                  return (
                    <button
                      key={sz.id}
                      disabled={isSzOutOfStock}
                      onClick={() => setSelectedSizeId(sz.id)}
                      className={`py-2.5 text-xs font-bold rounded-lg border transition-all ${
                        selectedSizeId === sz.id
                          ? 'bg-brand-primary hover:bg-brand-primary-hover text-brand-primary-foreground border-brand-primary dark:border-gold shadow-md cursor-pointer'
                          : 'bg-surface text-foreground border-border hover:border-border cursor-pointer'
                      } ${isSzOutOfStock ? 'opacity-40 line-through !cursor-not-allowed' : ''}`}
                      title={isSzOutOfStock ? `${sz.name} - Out of Stock` : undefined}
                    >
                      {sz.name}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* Quantity Selector & Inventory Status */}
        <div className="space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-foreground">Quantity</span>
          <div className="flex items-center space-x-3">
            <div className="flex items-center border border-border rounded-lg bg-surface overflow-hidden">
              <button
                disabled={isProductGloballyOutOfStock}
                onClick={() => setQuantity(q => Math.max(1, q - 1))}
                className="px-3 py-1.5 text-foreground font-bold hover:bg-rose-50 disabled:opacity-30"
              >
                -
              </button>
              <span className="px-4 py-1.5 text-xs font-bold text-foreground">{isProductGloballyOutOfStock ? 0 : quantity}</span>
              <button
                disabled={isProductGloballyOutOfStock || quantity >= maxQuantityAllowed}
                onClick={() => setQuantity(q => q + 1)}
                className="px-3 py-1.5 text-foreground font-bold hover:bg-rose-50 disabled:opacity-30"
              >
                +
              </button>
            </div>
            {isOutOfStock ? (
              <span className="text-xs text-rose-700 dark:text-rose-400 font-bold flex items-center bg-rose-50 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900/30 px-2 py-0.5 rounded">
                {selectedSizeId ? 'This size is currently out of stock.' : 'Out of Stock'}
              </span>
            ) : (hasSizes && !selectedSizeId) ? (
              <span className="text-xs text-muted-foreground font-medium flex items-center bg-surface border border-border px-2 py-0.5 rounded">
                Select a size to check stock
              </span>
            ) : isLowStock ? (
              <span className="text-xs text-amber-700 dark:text-amber-400 font-bold flex items-center bg-surface-muted border border-amber-100 dark:border-amber-900/20 px-2 py-0.5 rounded">
                Only {storefrontStockMessageQuantity} left!
              </span>
            ) : (
              <span className="text-xs text-emerald-700 dark:text-emerald-400 font-semibold flex items-center bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/30 px-2 py-0.5 rounded">
                <Check className="w-3.5 h-3.5 mr-1" />
                {availableStock} available (In Stock & Ready to Ship)
              </span>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3 pt-2">
          {validationError && (
            <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/40 rounded-xl text-xs font-bold text-red-600 dark:text-red-400 flex items-center space-x-2 animate-in fade-in duration-150">
              <span className="w-2 h-2 rounded-full bg-red-600 animate-ping shrink-0" />
              <span>{validationError}</span>
            </div>
          )}

          <button
            onClick={handleAddToCart}
            disabled={isBuyDisabled || isAddingToCart}
            className={`w-full py-3.5 px-6 font-serif font-bold text-sm rounded-xl shadow-lg transition-all hover:scale-[1.01] active:scale-[0.98] duration-200 flex items-center justify-center space-x-2 disabled:opacity-50 cursor-pointer ${
              justAdded
                ? 'bg-emerald-800 text-amber-100 ring-2 ring-emerald-400/50'
                : 'bg-rose-950 hover:bg-rose-900 text-amber-100'
            }`}
          >
            {isAddingToCart ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Processing...</span>
              </>
            ) : justAdded ? (
              <>
                <Check className="w-4 h-4 text-emerald-400" />
                <span>Added to Bag!</span>
              </>
            ) : (hasColors && !selectedColorId) ? (
              <span>Please select a colour.</span>
            ) : (hasSizes && !selectedSizeId) ? (
              <span>Please select a size.</span>
            ) : isOutOfStock ? (
              <span>This size is out of stock.</span>
            ) : (
              <>
                <ShoppingBag className="w-4 h-4" />
                <span>Add to Shopping Bag</span>
              </>
            )}
          </button>

          {/* Post Add-to-Cart Action Bar */}
          {justAdded && (
            <div className="p-3.5 bg-emerald-950/10 dark:bg-emerald-900/20 border border-emerald-500/30 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-3 animate-in fade-in slide-in-from-top-1 duration-200">
              <div className="flex items-center space-x-2">
                <div className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-bold shrink-0">
                  ✓
                </div>
                <span className="text-xs font-serif font-bold text-emerald-900 dark:text-emerald-300">
                  Item added to your bag!
                </span>
              </div>
              <div className="flex items-center space-x-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={openMiniCart}
                  className="flex-1 sm:flex-initial px-4 py-2 bg-brand-primary hover:bg-brand-primary-hover text-amber-100 text-xs font-serif font-bold rounded-lg transition-colors cursor-pointer text-center"
                >
                  View Cart
                </button>
                <Link
                  href="/shop"
                  className="flex-1 sm:flex-initial px-4 py-2 bg-surface border border-border text-foreground text-xs font-serif font-medium rounded-lg hover:bg-surface-muted transition-colors text-center"
                >
                  Continue Shopping
                </Link>
              </div>
            </div>
          )}

          <Link
            href={isBuyDisabled ? '#' : '/checkout'}
            className={`w-full py-3.5 px-6 bg-amber-600 hover:bg-amber-500 text-amber-950 font-serif font-bold text-sm rounded-xl shadow-md text-center block transition-colors ${
              isBuyDisabled ? 'opacity-40 pointer-events-none' : ''
            }`}
          >
            Buy Now with Express Checkout
          </Link>
        </div>

        {/* Guarantee Badges */}
        <div className="pt-4 border-t border-border grid grid-cols-3 gap-2 text-center text-[10px] text-muted-foreground pb-16 sm:pb-0">
          {product.delivery_available && !product.showroom_collection_only ? (
            <div className="p-2 rounded-lg bg-surface-muted/40 border border-border flex flex-col justify-center" title={product.delivery_message || undefined}>
              <Truck className="w-4 h-4 mx-auto text-amber-700 mb-1" />
              <span className="font-semibold text-foreground">
                {product.free_delivery ? 'Free Delivery' : 'Standard Shipping'}
              </span>
              {product.show_delivery_estimate && product.delivery_min_days && product.delivery_max_days && (
                <span className="text-[9px] text-muted-foreground">
                  {product.delivery_min_days}–{product.delivery_max_days} Days
                </span>
              )}
            </div>
          ) : null}
          
          <div className="p-2 rounded-lg bg-surface-muted/40 border border-border flex flex-col justify-center" title={product.return_policy_message || undefined}>
            <RefreshCw className="w-4 h-4 mx-auto text-amber-700 mb-1" />
            <span className="font-semibold text-foreground">
              {product.is_returnable ? (
                (() => {
                  const days = product.return_window_days;
                  const isValidWindow = days !== null && days !== undefined && Number.isInteger(days) && days >= 1;
                  if (isValidWindow) {
                    return `Returnable within ${days} days`;
                  } else {
                    console.warn(`[DATABASE-WARNING] Product ${product.id} is returnable but has an invalid return_window_days:`, days);
                    return 'Returnable';
                  }
                })()
              ) : (
                'Non-returnable item'
              )}
            </span>
            {product.is_returnable && product.exchange_allowed && (
              <span className="text-[9px] text-muted-foreground">Exchange Available</span>
            )}
          </div>
          
          <div className="p-2 rounded-lg bg-surface-muted/40 border border-border flex flex-col justify-center">
            <ShieldCheck className="w-4 h-4 mx-auto text-amber-700 mb-1" />
            <span className="font-semibold text-foreground">100% Authentic</span>
            <span className="text-[9px] text-muted-foreground">Direct from Shreengar</span>
          </div>
        </div>
      </div>

      {/* Mobile Fixed Bottom Action Bar */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 z-30 bg-surface/95 backdrop-blur-md border-t border-border px-4 py-3 shadow-2xl flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-serif font-bold text-foreground truncate">{product.title}</p>
          <p className="text-xs font-bold text-brand-primary dark:text-gold">{formatINR(activePrice)}</p>
        </div>
        <button
          onClick={handleAddToCart}
          disabled={isBuyDisabled || isAddingToCart}
          className={`px-5 py-2.5 font-serif font-bold text-xs rounded-xl shadow-lg flex items-center space-x-1.5 disabled:opacity-50 shrink-0 cursor-pointer ${
            justAdded
              ? 'bg-emerald-800 text-amber-100'
              : 'bg-rose-950 hover:bg-rose-900 text-amber-100'
          }`}
        >
          {isAddingToCart ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : justAdded ? (
            <>
              <Check className="w-4 h-4 text-emerald-400" />
              <span>Added!</span>
            </>
          ) : (
            <>
              <ShoppingBag className="w-4 h-4" />
              <span>Add to Bag</span>
            </>
          )}
        </button>
      </div>
    </>
  )
}
