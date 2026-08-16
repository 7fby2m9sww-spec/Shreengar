'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Star, ShoppingBag, Heart, Eye } from 'lucide-react'
import { Product } from '@/types/database'
import { ProductPrice } from '@/components/products/ProductPrice'

interface ProductCardProps {
  product: Product
  onAddToCart?: (product: Product) => void
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, onAddToCart }) => {
  const [isWishlisted, setIsWishlisted] = useState(false)

  const getCoverImage = (index: number): string => {
    const images = product.images || []
    if (images.length > 0) {
      const item = images[index] || images[0]
      if (typeof item === 'string' && item.trim()) return item
      if (item && typeof item === 'object') {
        const url = (item as any).image_url || (item as any).url
        if (url) return url
      }
    }
    return '/images/product-placeholder.webp'
  }

  const [imgSrc, setImgSrc] = useState<string>(() => getCoverImage(0))

  React.useEffect(() => {
    setImgSrc(getCoverImage(0))
  }, [product])

  const sellingPrice = (product as any).selling_price ?? product.price
  const mrp = (product as any).mrp ?? product.compare_at_price

  const productTitle =
    typeof (product as any).title === 'string' && (product as any).title.trim()
      ? (product as any).title.trim()
      : typeof (product as any).name === 'string' && (product as any).name.trim()
        ? (product as any).name.trim()
        : 'Shreengar product'

  // Out of stock detection
  const isOutOfStock =
    (product as any).in_stock === false ||
    (product as any).stock === 0 ||
    (product as any).is_out_of_stock === true ||
    (product as any).stock_status === 'out_of_stock'

  // Option selection requirement detection
  const hasMultipleSizes = (product as any).sizes && Array.isArray((product as any).sizes) && (product as any).sizes.length > 0
  const hasVariants = (product as any).variants && Array.isArray((product as any).variants) && (product as any).variants.length > 0
  const requiresOptionSelection = hasMultipleSizes || hasVariants

  return (
    <div className="group relative bg-surface-warm/60 rounded-[4px] overflow-hidden border border-border-warm hover:-translate-y-1 hover:shadow-2xl hover:border-gold/50 transition-all duration-300 flex flex-col">
      {/* Product Image & Floating Controls */}
      <div
        className="relative aspect-[3/4] w-full bg-surface-muted/20 overflow-hidden cursor-pointer rounded-t-[4px]"
        onMouseEnter={() => {
          if (product.images && product.images.length > 1) {
            setImgSrc(getCoverImage(1))
          }
        }}
        onMouseLeave={() => {
          setImgSrc(getCoverImage(0))
        }}
      >
        <Link href={`/product/${product.id}`} className="block w-full h-full">
          <Image
            src={imgSrc}
            alt={productTitle}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className="object-cover object-top transition-transform duration-500 ease-out group-hover:scale-105"
            onError={() => setImgSrc('/images/product-placeholder.webp')}
            unoptimized
          />
        </Link>

        {/* Badges (Top-Left, z-10, Pointer Events None) */}
        <div className="absolute top-3 left-3 flex flex-col space-y-1 z-10 pointer-events-none">
          {isOutOfStock ? (
            <span className="bg-destructive text-destructive-foreground text-[9px] font-serif font-bold uppercase tracking-widest px-2 py-0.5 rounded-sm shadow-md backdrop-blur-sm">
              Out of Stock
            </span>
          ) : (
            <>
              {product.is_bestseller && (
                <span className="bg-gold text-brand-primary-foreground text-[9px] font-serif font-bold uppercase tracking-widest px-2 py-0.5 rounded-sm shadow-md backdrop-blur-sm">
                  Bestseller
                </span>
              )}
              {product.is_new_arrival && (
                <span className="bg-brand-primary text-brand-primary-foreground text-[9px] font-serif font-bold uppercase tracking-widest px-2 py-0.5 rounded-sm shadow-md backdrop-blur-sm">
                  New Arrival
                </span>
              )}
            </>
          )}
        </div>

        {/* Wishlist Toggle Button (Top-Right, z-30, Dedicated Position) */}
        <button
          onClick={(e) => {
            e.stopPropagation()
            setIsWishlisted(!isWishlisted)
          }}
          aria-label={isWishlisted ? "Remove from Wishlist" : "Add to Wishlist"}
          className="absolute top-3 right-3 w-9 h-9 flex items-center justify-center bg-surface/85 backdrop-blur-md rounded-full text-foreground hover:bg-surface transition-transform hover:scale-105 z-30 shadow-md border border-border-warm/50 cursor-pointer"
        >
          <Heart
            className={`w-4 h-4 transition-colors ${
              isWishlisted ? 'fill-rose-700 text-rose-700' : 'text-muted-foreground hover:text-foreground'
            }`}
          />
        </button>

        {/* Action Overlay Wrapper (Bottom-3, z-20, Clear Separation from Wishlist) */}
        <div className="absolute bottom-3 inset-x-3 z-20 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0">
          {isOutOfStock ? (
            <Link
              href={`/product/${product.id}`}
              className="btn-smooth w-full py-2.5 px-3 bg-surface-muted hover:bg-surface text-foreground font-serif font-bold text-xs tracking-wider rounded-[4px] shadow flex items-center justify-center space-x-1.5 border border-border-warm transition-colors"
            >
              <Eye className="w-3.5 h-3.5 text-muted-foreground" />
              <span>View Details</span>
            </Link>
          ) : requiresOptionSelection ? (
            <Link
              href={`/product/${product.id}`}
              className="btn-smooth btn-shine w-full py-2.5 px-3 bg-brand-primary/95 hover:bg-brand-primary text-brand-primary-foreground font-serif font-bold text-xs tracking-wider rounded-[4px] shadow-xl flex items-center justify-center space-x-1.5 backdrop-blur-md transition-all hover:scale-[1.02]"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Select Options</span>
            </Link>
          ) : (
            <button
              onClick={(e) => {
                e.stopPropagation()
                if (onAddToCart) {
                  onAddToCart(product)
                }
              }}
              className="btn-smooth btn-shine w-full py-2.5 px-3 bg-brand-primary/95 hover:bg-brand-primary text-brand-primary-foreground font-serif font-bold text-xs tracking-wider rounded-[4px] shadow-xl flex items-center justify-center space-x-1.5 backdrop-blur-md transition-all hover:scale-[1.02] cursor-pointer"
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>Add to Cart</span>
            </button>
          )}
        </div>
      </div>

      {/* Product Details Block */}
      <div className="p-3.5 flex-1 flex flex-col justify-between space-y-2">
        <div>
          {/* Rating */}
          <div className="flex items-center space-x-1 mb-1">
            <Star className="w-3 h-3 fill-gold text-gold" />
            <span className="text-[11px] font-bold text-foreground">{product.rating || 5.0}</span>
            <span className="text-[10px] text-muted-foreground">({product.reviews_count || 0})</span>
          </div>

          {/* Product Name */}
          <Link href={`/product/${product.id}`}>
            <h3 className="font-serif text-xs sm:text-sm font-bold text-foreground line-clamp-1 group-hover:text-gold transition-colors">
              {productTitle}
            </h3>
          </Link>

          {/* Fabric / Category Label */}
          {product.fabric && (
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground line-clamp-1 mt-0.5 font-light">
              {product.fabric}
            </p>
          )}
        </div>

        {/* Price Row */}
        <div>
          <ProductPrice
            sellingPrice={sellingPrice}
            mrp={mrp}
            className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5"
            priceClassName="text-xs sm:text-sm font-bold text-brand-primary dark:text-gold"
            mrpClassName="text-[11px] text-muted-foreground line-through font-light"
            discountClassName="text-[11px] font-semibold text-emerald-800 dark:text-emerald-300"
          />
        </div>
      </div>
    </div>
  )
}
