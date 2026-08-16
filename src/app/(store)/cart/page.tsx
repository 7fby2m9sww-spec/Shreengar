'use client'

import React, { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Breadcrumb } from '@/components/store/Breadcrumb'
import { useCart } from '@/context/CartContext'
import { useToast } from '@/context/ToastContext'
import { validateCouponAction } from '@/actions/cart/actions'
import { formatINR } from '@/lib/utils'
import { Trash2, Plus, Minus, ShoppingBag, PackageX, Tag, ArrowRight, RefreshCw, CheckCircle2, Truck } from 'lucide-react'
import { Coupon } from '@/types/database'

export default function CartPage() {
  const {
    items,
    totals,
    isLoading,
    updateQuantity,
    removeItem,
    clearCart,
    setCouponDiscount,
    appliedCoupon,
    applyCoupon,
    removeCoupon,
    shippingPincode,
    shippingQuoteError,
    setShippingPincode,
    deliveryMinDays,
    deliveryMaxDays
  } = useCart()

  const { showToast } = useToast()
  const [pincodeInput, setPincodeInput] = useState(shippingPincode || '')
  const [couponCode, setCouponCode] = useState('')
  const [couponLoading, setCouponLoading] = useState(false)
  const [couponError, setCouponError] = useState<string | null>(null)
  const [clearConfirm, setClearConfirm] = useState(false)

  const handleQuantityChange = async (itemId: string, newQty: number, max: number) => {
    if (newQty < 1 || newQty > max) return
    const res = await updateQuantity(itemId, newQty)
    if (!res.success && res.error) showToast('Stock Limit', res.error, 'error')
  }

  const handleRemove = async (itemId: string, title: string) => {
    const res = await removeItem(itemId)
    if (res.success) showToast('Removed', `"${title}" removed from your bag.`, 'info')
    else showToast('Error', 'Could not remove item. Please try again.', 'error')
  }

  const handleClearCart = async () => {
    if (!clearConfirm) { setClearConfirm(true); return }
    await clearCart()
    removeCoupon()
    setCouponCode('')
    setClearConfirm(false)
    showToast('Cart Cleared', 'All items have been removed from your bag.', 'info')
  }

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return
    setCouponLoading(true)
    setCouponError(null)
    const result = await applyCoupon(couponCode)
    if (result.valid && result.coupon) {
      showToast('Coupon Applied!', `${result.coupon.code} — saved ${formatINR(result.discountAmount || 0)}.`, 'success')
      setCouponCode('')
    } else {
      setCouponError(result.message || 'Invalid coupon code.')
    }
    setCouponLoading(false)
  }

  const handleRemoveCouponClick = () => {
    removeCoupon()
    setCouponCode('')
    showToast('Coupon Removed', 'The promotional code has been removed.', 'info')
  }

  if (isLoading) {
    return (
      <div className="space-y-8 pb-16">
        <Breadcrumb items={[{ label: 'Shopping Bag' }]} />
        <h1 className="font-serif text-3xl font-bold text-foreground">Shopping Bag</h1>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-pulse">
          <div className="lg:col-span-2 space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-32 bg-amber-100/60 rounded-2xl" />
            ))}
          </div>
          <div className="h-80 bg-amber-100/60 rounded-2xl" />
        </div>
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="space-y-8 pb-16">
        <Breadcrumb items={[{ label: 'Shopping Bag' }]} />
        <div className="flex flex-col items-center justify-center py-24 space-y-6 text-center">
          <div className="w-24 h-24 rounded-full bg-amber-100 flex items-center justify-center">
            <PackageX className="w-12 h-12 text-muted-foreground" />
          </div>
          <div>
            <h1 className="font-serif text-2xl font-bold text-foreground">Your bag is empty</h1>
            <p className="text-sm text-muted-foreground mt-2">
              Discover our exclusive collection of royal ethnic wear
            </p>
          </div>
          <Link
            href="/shop"
            className="flex items-center space-x-2 px-8 py-3.5 bg-rose-950 text-amber-100 font-serif font-bold rounded-xl hover:bg-rose-900 transition-colors"
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Explore Collection</span>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-16">
      <Breadcrumb items={[{ label: 'Shopping Bag' }]} />

      <div className="flex items-center justify-between">
        <h1 className="font-serif text-3xl font-bold text-foreground">
          Shopping Bag
          <span className="ml-2 text-lg font-normal text-muted-foreground">({items.reduce((s, i) => s + i.quantity, 0)} items)</span>
        </h1>
        <button
          onClick={handleClearCart}
          className={`text-xs flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border transition-colors ${
            clearConfirm
              ? 'border-red-400 text-red-600 bg-red-50'
              : 'border-border text-muted-foreground hover:text-rose-700 hover:border-rose-700/30'
          }`}
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>{clearConfirm ? 'Tap again to clear' : 'Clear Bag'}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Cart Items */}
        <div className="lg:col-span-2 space-y-4">
          {items.map(item => {
            const lineTotal = item.price * item.quantity
            const isLowStock = item.stockQuantity > 0 && item.stockQuantity < 5
            const isOutOfStock = item.stockQuantity === 0

            return (
              <div
                key={item.id}
                className="bg-surface rounded-2xl border border-border shadow-sm overflow-hidden flex gap-0"
              >
                {/* Product Image */}
                <div className="w-28 sm:w-36 flex-shrink-0">
                  {item.image ? (
                    <Image
                      src={item.image}
                      alt={item.title}
                      width={144}
                      height={180}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-surface-muted flex items-center justify-center">
                      <ShoppingBag className="w-8 h-8 text-muted-foreground" />
                    </div>
                  )}
                </div>

                {/* Details */}
                <div className="flex-1 p-4 flex flex-col justify-between min-h-[140px]">
                  <div className="space-y-1.5">
                    <h3 className="font-serif font-bold text-sm text-foreground leading-snug line-clamp-2">
                      {item.title}
                    </h3>
                    <div className="flex items-center flex-wrap gap-2 text-[11px]">
                      <span className="px-2 py-0.5 bg-amber-100 text-muted-foreground font-medium rounded">
                        Size: {item.size}
                      </span>
                      {item.showColorOption !== false && item.colorName && item.colorName !== 'Default' && (
                        <span className="flex items-center space-x-1 px-2 py-0.5 bg-amber-100 rounded">
                          <span
                            className="w-2.5 h-2.5 rounded-full border border-border"
                            style={{ backgroundColor: item.colorCode || '#ccc' }}
                          />
                          <span className="text-muted-foreground font-medium">{item.colorName}</span>
                        </span>
                      )}
                      <span className="text-muted-foreground font-mono">{item.sku}</span>
                    </div>

                    {/* Stock Status */}
                    {isOutOfStock && (
                      <span className="inline-block text-[10px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded border border-red-200">
                        Out of Stock
                      </span>
                    )}
                    {isLowStock && (
                      <span className="inline-block text-[10px] font-bold text-amber-700 bg-surface-muted px-2 py-0.5 rounded border border-amber-200">
                        Only {item.stockQuantity} left!
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between mt-3">
                    {/* Quantity Controls */}
                    <div className="flex items-center space-x-1 bg-surface-muted border border-border rounded-lg">
                      <button
                        onClick={() => handleQuantityChange(item.id, item.quantity - 1, item.stockQuantity)}
                        disabled={item.quantity <= 1}
                        className="w-8 h-8 flex items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        aria-label="Decrease"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="w-8 text-center text-sm font-bold text-foreground">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => handleQuantityChange(item.id, item.quantity + 1, item.stockQuantity)}
                        disabled={item.quantity >= item.stockQuantity}
                        className="w-8 h-8 flex items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        aria-label="Increase"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Line Total + Remove */}
                    <div className="flex items-center space-x-3">
                      <span className="font-bold text-sm text-foreground">{formatINR(lineTotal)}</span>
                      <button
                        onClick={() => handleRemove(item.id, item.title)}
                        className="p-2 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        aria-label="Remove item"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}

          {/* Continue Shopping */}
          <Link
            href="/shop"
            className="inline-flex items-center space-x-2 text-xs text-muted-foreground hover:text-foreground transition-colors py-2"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Continue Shopping</span>
          </Link>
        </div>

        {/* Order Summary Sidebar */}
        <aside className="space-y-4">
          {/* Coupon */}
          <div className="bg-surface rounded-2xl border border-border shadow-sm p-5 space-y-3">
            <h3 className="font-serif font-bold text-sm text-foreground flex items-center space-x-2">
              <Tag className="w-4 h-4 text-amber-700" />
              <span>Apply Coupon</span>
            </h3>
            {appliedCoupon ? (
              <div className="flex items-center justify-between p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <div>
                    <p className="text-xs font-bold text-emerald-800">{appliedCoupon.code}</p>
                    <p className="text-[10px] text-emerald-600">
                      {appliedCoupon.type === 'percentage'
                        ? `${appliedCoupon.value}% off applied`
                        : `${formatINR(appliedCoupon.value)} off applied`}
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleRemoveCouponClick}
                  className="text-emerald-600 hover:text-red-500 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={couponCode}
                  onChange={e => { setCouponCode(e.target.value.toUpperCase()); setCouponError(null) }}
                  onKeyDown={e => e.key === 'Enter' && handleApplyCoupon()}
                  placeholder="Enter coupon code"
                  className="flex-1 px-3 py-2 text-xs bg-surface-muted border border-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-rose-900/30 font-mono uppercase tracking-wider"
                />
                <button
                  onClick={handleApplyCoupon}
                  disabled={couponLoading || !couponCode.trim()}
                  className="px-3 py-2 bg-rose-950 text-amber-100 text-xs font-bold rounded-xl hover:bg-rose-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-1"
                >
                  {couponLoading ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <span>Apply</span>
                  )}
                </button>
              </div>
            )}
            {couponError && (
              <p className="text-[11px] text-red-600 font-medium">{couponError}</p>
            )}
          </div>

          {/* Estimate Shipping */}
          <div className="bg-surface rounded-2xl border border-border shadow-sm p-5 space-y-3">
            <h3 className="font-serif font-bold text-sm text-foreground flex items-center space-x-2">
              <Truck className="w-4 h-4 text-amber-700" />
              <span>Estimate Shipping</span>
            </h3>
            <div className="flex space-x-2">
              <input
                type="text"
                maxLength={6}
                value={pincodeInput}
                onChange={e => { setPincodeInput(e.target.value.replace(/[^0-9]/g, '')); setShippingPincode(null); }}
                placeholder="Enter 6-digit Pincode"
                className="flex-1 px-3 py-2 text-xs bg-surface-muted border border-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-rose-900/30 font-mono"
              />
              <button
                onClick={() => setShippingPincode(pincodeInput || null)}
                disabled={pincodeInput.length !== 6}
                className="px-3 py-2 bg-rose-950 text-amber-100 text-xs font-bold rounded-xl hover:bg-rose-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Estimate
              </button>
            </div>
            {shippingQuoteError && (
              <p className="text-[11px] text-red-600 font-medium">{shippingQuoteError}</p>
            )}
            {shippingPincode && !shippingQuoteError && (
              <p className="text-[10px] text-emerald-700 font-semibold">
                Shipping calculated for {shippingPincode} {deliveryMinDays && `(Delivered in ${deliveryMinDays}–${deliveryMaxDays} days)`}
              </p>
            )}
          </div>

          {/* Price Summary */}
          <div className="bg-surface rounded-2xl border border-border shadow-sm p-5 space-y-4">
            <h3 className="font-serif font-bold text-sm text-foreground">Order Summary</h3>
            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal ({items.reduce((s, i) => s + i.quantity, 0)} items)</span>
                <span className="font-medium">{formatINR(totals.subtotal)}</span>
              </div>
              {totals.couponDiscount > 0 && (
                <div className="flex justify-between text-emerald-700">
                  <span>Coupon Discount</span>
                  <span className="font-bold">− {formatINR(totals.couponDiscount)}</span>
                </div>
              )}
              <div className="flex justify-between text-muted-foreground">
                <span>Shipping</span>
                {totals.shipping === 0 ? (
                  <span className="text-emerald-700 font-bold">Free</span>
                ) : (
                  <span className="font-medium">{formatINR(totals.shipping)}</span>
                )}
              </div>
              {totals.tax > 0 && (
                <div className="flex justify-between text-muted-foreground">
                  <span>GST (18.00%)</span>
                  <span className="font-medium">{formatINR(totals.tax)}</span>
                </div>
              )}
              {totals.shipping > 0 && totals.shipping < 100 && (
                <p className="text-[10px] text-muted-foreground">
                  Add {formatINR(1000 - totals.subtotal)} more for free shipping
                </p>
              )}
              <div className="pt-2 border-t border-border">
                <div className="flex justify-between text-foreground font-bold">
                  <span className="text-sm">Grand Total</span>
                  <span className="text-base">{formatINR(totals.grandTotal)}</span>
                </div>
                <p className="text-[10px] text-muted-foreground mt-0.5">Inclusive of all applicable taxes</p>
              </div>
            </div>

            <Link
              href={shippingQuoteError ? '#' : '/checkout'}
              className={`flex items-center justify-center space-x-2 w-full py-3.5 bg-rose-950 text-amber-100 font-serif font-bold text-sm rounded-xl hover:bg-rose-900 transition-colors shadow-md shadow-rose-950/20 ${
                shippingQuoteError ? 'opacity-40 pointer-events-none cursor-not-allowed' : ''
              }`}
            >
              <span>Proceed to Checkout</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            {/* Trust badges */}
            <div className="flex flex-wrap gap-2 pt-1">
              {['🔒 Secure Payment', '↩ Easy Returns', '📦 Free Shipping ₹1000+'].map(badge => (
                <span key={badge} className="text-[10px] text-muted-foreground bg-surface-muted px-2 py-1 rounded-lg">
                  {badge}
                </span>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}

// Local X icon for coupon remove button
function X({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  )
}
