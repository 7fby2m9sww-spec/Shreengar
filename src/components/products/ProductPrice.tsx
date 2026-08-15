import React from 'react'
import { calculateDiscount, formatPrice } from '@/lib/pricing/productPricing'

interface ProductPriceProps {
  sellingPrice: number
  mrp: number | null
  className?: string
  priceClassName?: string
  mrpClassName?: string
  discountClassName?: string
  showDiscount?: boolean
}

export const ProductPrice: React.FC<ProductPriceProps> = ({
  sellingPrice,
  mrp,
  className = 'flex flex-wrap items-baseline gap-x-2 gap-y-0.5',
  priceClassName = 'text-sm sm:text-base font-bold text-brand-primary dark:text-gold',
  mrpClassName = 'text-xs text-muted-foreground line-through font-light',
  discountClassName = 'text-xs font-semibold text-emerald-800 dark:text-emerald-300',
  showDiscount = true,
}) => {
  const discount = mrp ? calculateDiscount(mrp, sellingPrice) : 0
  const hasDiscount = discount > 0

  return (
    <div className={className}>
      <span className={priceClassName}>{formatPrice(sellingPrice)}</span>
      {hasDiscount && mrp && (
        <span className={mrpClassName}>{formatPrice(mrp)}</span>
      )}
      {hasDiscount && showDiscount && (
        <span className={discountClassName}>
          {mrp ? '· ' : ''}{discount}% OFF
        </span>
      )}
    </div>
  )
}
