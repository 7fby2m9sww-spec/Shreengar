'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Breadcrumb } from '@/components/store/Breadcrumb'
import { createRazorpayOrder, verifyRazorpaySignature, isPaymentGatewayEnabled } from '@/services/payment'
import { ShippingAddress } from '@/types/database'
import { ShieldCheck, CreditCard, Smartphone, MapPin, Tag, CheckCircle2, X } from 'lucide-react'
import { formatINR } from '@/lib/utils'
import { useAuth } from '@/context/AuthContext'
import { useCart } from '@/context/CartContext'
import { getAddressesAction } from '@/actions/address/getAddressesAction'
import { placeOrderAction } from '@/actions/order/placeOrderAction'

export default function CheckoutPage() {
  const router = useRouter()
  const { profile, isAuthenticated, isLoading: authLoading } = useAuth()
  const {
    items: cartItems,
    totals,
    isLoading: cartLoading,
    clearCart,
    appliedCoupon,
    appliedCouponCode,
    applyCoupon,
    removeCoupon,
    shippingQuoteId,
    shippingQuoteError,
    setShippingPincode
  } = useCart()

  const [addresses, setAddresses] = useState<ShippingAddress[]>([])
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null)
  const [paymentMethod, setPaymentMethod] = useState<'upi' | 'card' | 'cod'>('upi')
  const [upiId, setUpiId] = useState('')
  const [isPlacing, setIsPlacing] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [isGatewayEnabled, setIsGatewayEnabled] = useState(true)

  // Coupon state in checkout
  const [checkoutCouponInput, setCheckoutCouponInput] = useState('')
  const [checkoutCouponLoading, setCheckoutCouponLoading] = useState(false)
  const [checkoutCouponError, setCheckoutCouponError] = useState<string | null>(null)

  useEffect(() => {
    isPaymentGatewayEnabled().then(setIsGatewayEnabled)
  }, [])

  // Redirect guest users to login
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace('/auth/login?next=/checkout')
    }
  }, [isAuthenticated, authLoading, router])

  // Load customer addresses
  useEffect(() => {
    if (isAuthenticated) {
      getAddressesAction().then((res) => {
        if (res.success && res.addresses) {
          setAddresses(res.addresses)
          const defaultAddr = res.addresses.find(a => a.is_default)
          if (defaultAddr) {
            setSelectedAddressId(defaultAddr.id)
          } else if (res.addresses.length > 0) {
            setSelectedAddressId(res.addresses[0].id)
          }
        }
      })
    }
  }, [isAuthenticated])

  // Sync selected address postal code to Cart Context
  useEffect(() => {
    if (selectedAddressId && addresses.length > 0) {
      const addr = addresses.find(a => a.id === selectedAddressId)
      if (addr) {
        setShippingPincode(addr.postal_code)
      }
    } else {
      setShippingPincode(null)
    }
  }, [selectedAddressId, addresses, setShippingPincode])

  const handleApplyCouponInCheckout = async () => {
    if (!checkoutCouponInput.trim()) return
    setCheckoutCouponLoading(true)
    setCheckoutCouponError(null)
    const res = await applyCoupon(checkoutCouponInput)
    if (res.valid) {
      setCheckoutCouponInput('')
    } else {
      setCheckoutCouponError(res.message || 'Invalid coupon code.')
    }
    setCheckoutCouponLoading(false)
  }

  if (authLoading || cartLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-rose-950"></div>
      </div>
    )
  }

  const subtotal = totals.subtotal
  const discount = totals.couponDiscount
  const total = totals.grandTotal

  const handlePlaceOrder = async () => {
    if (!selectedAddressId) {
      setErrorMsg('Please select a shipping address.')
      return
    }

    setIsPlacing(true)
    setErrorMsg(null)

    try {
      const couponCodeToPass = appliedCouponCode || undefined

      const orderRes = await placeOrderAction({
        addressId: selectedAddressId,
        paymentMethod,
        couponCode: couponCodeToPass,
        shippingQuoteId
      })

      if (!orderRes.success || !orderRes.orderId || !orderRes.orderNumber) {
        setErrorMsg(orderRes.error || 'Failed to place order. Please try again.')
        setIsPlacing(false)
        return
      }

      if (!isGatewayEnabled) {
        await clearCart()
        router.push(`/order-success/${orderRes.orderId}`)
        return
      }

      if (paymentMethod === 'cod') {
        await clearCart()
        router.push(`/order-success/${orderRes.orderId}`)
        return
      }

      const paymentOrder = await createRazorpayOrder({
        orderId: orderRes.orderId,
        amount: orderRes.totalAmount || total,
      })

      if (!paymentOrder?.success) {
        setErrorMsg(paymentOrder?.error || 'Failed to initialize payment gateway. Please try again.')
        setIsPlacing(false)
        return
      }

      const verification = await verifyRazorpaySignature({
        orderId: orderRes.orderId,
        razorpayOrderId: paymentOrder.razorpayOrderId,
        razorpayPaymentId: `pay_${Date.now()}`,
        razorpaySignature: 'simulated_valid_sig',
      })

      if (verification.verified) {
        await clearCart()
        router.push(`/order-success/${orderRes.orderId}`)
      } else {
        setErrorMsg(verification.error || 'Payment verification failed. Please try again.')
        setIsPlacing(false)
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'An unexpected error occurred during checkout.')
      setIsPlacing(false)
    }
  }

  return (
    <div className="space-y-6 pb-16 px-4 sm:px-6 lg:px-8">
      <div className="hidden sm:block">
        <Breadcrumb items={[{ label: 'Cart', href: '/cart' }, { label: 'Checkout' }]} />
      </div>

      <h1 className="font-serif text-[34px] sm:text-4xl font-bold text-foreground">Express Checkout</h1>

      {errorMsg && (
        <div className="p-4 bg-red-100 border border-red-300 text-red-800 text-xs rounded-xl font-medium">
          {errorMsg}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Address, Payment & Coupon (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          {/* Step 1: Shipping Address Selection */}
          <div className="bg-surface p-6 rounded-2xl border border-border shadow-sm space-y-4">
            <div className="flex items-center space-x-3 pb-3 border-b border-border">
              <div className="w-7 h-7 rounded-full bg-rose-950 text-amber-100 font-bold text-xs flex items-center justify-center">
                1
              </div>
              <h2 className="font-serif text-lg font-bold text-foreground">Delivery Shipping Address</h2>
            </div>

            {addresses.length === 0 ? (
              <div className="p-6 bg-surface-muted/40 rounded-xl border border-border text-center space-y-3">
                <MapPin className="w-8 h-8 text-muted-foreground mx-auto" />
                <p className="text-xs text-muted-foreground font-serif">No saved shipping addresses found.</p>
                <Link
                  href="/addresses"
                  className="inline-block px-4 py-2 bg-rose-950 text-amber-100 text-xs rounded-lg font-serif font-bold"
                >
                  Add Shipping Address
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {addresses.map(addr => (
                  <label
                    key={addr.id}
                    className={`p-4 rounded-xl border flex items-start space-x-3 cursor-pointer transition-all ${
                      selectedAddressId === addr.id
                        ? 'border-rose-950 bg-surface-muted/50 ring-2 ring-rose-950/20'
                        : 'border-border bg-surface'
                    }`}
                  >
                    <input
                      type="radio"
                      name="address"
                      checked={selectedAddressId === addr.id}
                      onChange={() => setSelectedAddressId(addr.id)}
                      className="mt-1 accent-rose-950"
                    />
                    <div className="text-xs text-foreground space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-sm">{addr.full_name}</span>
                        {addr.is_default && (
                          <span className="bg-amber-100 text-foreground text-[10px] font-bold px-2 py-0.5 rounded">
                            Default
                          </span>
                        )}
                      </div>
                      <p>{addr.address_line1}, {addr.address_line2}</p>
                      <p>{addr.city}, {addr.state} - {addr.postal_code}</p>
                      <p className="font-semibold text-muted-foreground">Phone: {addr.phone}</p>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Step 2: Payment Method Selection */}
          <div className="bg-surface p-6 rounded-2xl border border-border shadow-sm space-y-4">
            <div className="flex items-center space-x-3 pb-3 border-b border-border">
              <div className="w-7 h-7 rounded-full bg-rose-950 text-amber-100 font-bold text-xs flex items-center justify-center">
                2
              </div>
              <h2 className="font-serif text-lg font-bold text-foreground">Select Payment Option</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* UPI Option */}
              <button
                type="button"
                onClick={() => setPaymentMethod('upi')}
                className={`p-4 rounded-xl border text-left flex flex-col justify-between space-y-2 transition-all cursor-pointer ${
                  paymentMethod === 'upi'
                    ? 'border-rose-950 bg-surface-muted/50 ring-2 ring-rose-950/20'
                    : 'border-border bg-surface hover:border-border'
                }`}
              >
                <Smartphone className="w-6 h-6 text-amber-700" />
                <div>
                  <h4 className="font-bold text-xs text-foreground">UPI / QR Code</h4>
                  <span className="text-[10px] text-muted-foreground">GPay, PhonePe, Paytm</span>
                </div>
              </button>

              {/* Card Option */}
              <button
                type="button"
                onClick={() => setPaymentMethod('card')}
                className={`p-4 rounded-xl border text-left flex flex-col justify-between space-y-2 transition-all cursor-pointer ${
                  paymentMethod === 'card'
                    ? 'border-rose-950 bg-surface-muted/50 ring-2 ring-rose-950/20'
                    : 'border-border bg-surface hover:border-border'
                }`}
              >
                <CreditCard className="w-6 h-6 text-amber-700" />
                <div>
                  <h4 className="font-bold text-xs text-foreground">Credit / Debit Card</h4>
                  <span className="text-[10px] text-muted-foreground">Visa, Mastercard, RuPay</span>
                </div>
              </button>
            </div>

            {!isGatewayEnabled && (
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-[11px] text-amber-800 font-medium">
                Payment gateway is temporarily disabled. This order will remain pending payment.
              </div>
            )}

            {paymentMethod === 'upi' && (
              <div className="p-4 bg-surface-muted/50 rounded-xl border border-border space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Enter VPA / UPI ID</label>
                <input
                  type="text"
                  value={upiId}
                  onChange={e => setUpiId(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-surface border border-border rounded-lg text-foreground font-mono"
                  placeholder="e.g. mobile@upi"
                />
              </div>
            )}
          </div>

          {/* Step 3: Applied Promotional Coupon */}
          <div className="bg-surface p-6 rounded-2xl border border-border shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center space-x-3">
                <div className="w-7 h-7 rounded-full bg-rose-950 text-amber-100 font-bold text-xs flex items-center justify-center">
                  3
                </div>
                <h2 className="font-serif text-lg font-bold text-foreground">Promotional Coupon</h2>
              </div>
              {appliedCouponCode && (
                <span className="text-[11px] bg-emerald-100 text-emerald-800 font-bold px-3 py-1 rounded-full flex items-center space-x-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Applied</span>
                </span>
              )}
            </div>

            {appliedCouponCode ? (
              <div className="p-4 bg-emerald-50/80 border border-emerald-200 rounded-xl flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2.5 bg-emerald-100 text-emerald-800 rounded-xl">
                    <Tag className="w-5 h-5 text-emerald-700" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-mono font-bold text-sm text-emerald-950 tracking-wider">{appliedCouponCode}</span>
                      {(appliedCoupon?.first_time_only || appliedCoupon?.target_type === 'first_time_buyers') && (
                        <span className="text-[9px] bg-purple-100 text-purple-800 font-bold px-1.5 py-0.5 rounded">
                          1st Order Only
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-emerald-700 mt-0.5">
                      Discount of <span className="font-bold">{formatINR(totals.couponDiscount)}</span> applied to your order.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={removeCoupon}
                  className="text-xs text-red-600 hover:text-red-800 font-bold px-3 py-1.5 rounded-lg border border-red-200 hover:bg-red-50 transition-colors cursor-pointer flex items-center space-x-1"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Remove</span>
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={checkoutCouponInput}
                    onChange={e => { setCheckoutCouponInput(e.target.value.toUpperCase()); setCheckoutCouponError(null) }}
                    onKeyDown={e => e.key === 'Enter' && handleApplyCouponInCheckout()}
                    placeholder="Have a promo code? Enter here..."
                    className="flex-1 px-3 py-2.5 text-xs bg-surface border border-border rounded-xl text-foreground font-mono uppercase tracking-wider"
                  />
                  <button
                    type="button"
                    onClick={handleApplyCouponInCheckout}
                    disabled={checkoutCouponLoading || !checkoutCouponInput.trim()}
                    className="px-4 py-2.5 bg-rose-950 text-amber-100 text-xs font-bold rounded-xl hover:bg-rose-900 disabled:opacity-50 transition-colors cursor-pointer"
                  >
                    {checkoutCouponLoading ? 'Validating...' : 'Apply Code'}
                  </button>
                </div>
                {checkoutCouponError && (
                  <p className="text-xs text-red-600 font-medium">{checkoutCouponError}</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Order Summary & Place Order CTA (4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-surface-muted/60 p-6 rounded-2xl border border-border shadow-sm space-y-5">
            <h3 className="font-serif text-lg font-bold text-foreground pb-3 border-b border-border">
              Items in Order
            </h3>

            {cartItems.length === 0 ? (
              <p className="text-xs text-muted-foreground font-serif">No items in cart</p>
            ) : (
              <div className="space-y-3">
                {cartItems.map(it => (
                  <div key={it.id} className="flex items-center space-x-3 text-xs text-foreground">
                    {it.image && (
                      <img src={it.image} alt={it.title} className="w-8 h-8 rounded object-cover flex-shrink-0" />
                    )}
                    <div className="flex-1">
                      <h5 className="font-serif font-bold line-clamp-1">{it.title}</h5>
                      <span className="text-muted-foreground">
                        {it.size ? `${it.size}` : ''}
                        {it.colorName && it.colorName !== 'Default' && it.showColorOption !== false ? ` | ${it.colorName}` : ''} (Qty: {it.quantity})
                      </span>
                    </div>
                    <span className="font-serif font-bold">{formatINR(it.price * it.quantity)}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="space-y-2 text-xs text-foreground border-t border-border pt-3">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>{formatINR(subtotal)}</span>
              </div>
              {totals.couponDiscount > 0 && (
                <div className="flex justify-between text-emerald-700 font-medium">
                  <span className="flex items-center space-x-1">
                    <Tag className="w-3 h-3 text-emerald-600 inline" />
                    <span>Coupon ({appliedCouponCode})</span>
                  </span>
                  <span className="font-bold">− {formatINR(totals.couponDiscount)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Shipping</span>
                {totals.shipping === 0 ? (
                  <span className="font-bold text-emerald-700">FREE</span>
                ) : (
                  <span className="font-medium">{formatINR(totals.shipping)}</span>
                )}
              </div>
              {totals.tax > 0 && (
                <div className="flex justify-between text-muted-foreground">
                  <span>GST (18.00%)</span>
                  <span>{formatINR(totals.tax)}</span>
                </div>
              )}
              <div className="flex justify-between text-[10px] text-muted-foreground border-t border-dashed border-border/50 pt-1.5">
                <span>Payment Mode</span>
                <span className="font-bold text-amber-950 dark:text-amber-300">Prepaid only</span>
              </div>
              <div className="flex justify-between text-base font-serif font-bold text-foreground border-t border-border pt-3">
                <span>Total Amount Payable</span>
                <span className="text-rose-950 dark:text-amber-300">{formatINR(total)}</span>
              </div>
            </div>
            {shippingQuoteError && (
              <p className="text-[11px] text-red-600 font-bold text-center leading-relaxed">
                {shippingQuoteError}
              </p>
            )}

            <button
              onClick={handlePlaceOrder}
              disabled={isPlacing || !!shippingQuoteError}
              className="w-full py-4 px-6 bg-rose-950 hover:bg-rose-900 text-amber-100 font-serif font-bold text-sm rounded-xl shadow-xl transition-all hover:scale-[1.01] flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {isPlacing ? (
                <span>{isGatewayEnabled ? 'Verifying Payment...' : 'Placing Test Order...'}</span>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4 text-amber-400" />
                  <span>{isGatewayEnabled ? 'Place Order' : 'Place Test Order'} ({formatINR(total)})</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
