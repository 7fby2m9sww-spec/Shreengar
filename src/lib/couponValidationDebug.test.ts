import { test, describe } from 'node:test'
import assert from 'node:assert'

export function validateCouponInMemory(
  coupon: any | null,
  code: string,
  subtotal: number,
  userId?: string | null,
  orderCount: number = 0
): { valid: boolean; message?: string; discountAmount?: number } {
  const cleanCode = code.trim().toUpperCase()

  if (!cleanCode) {
    return { valid: false, message: 'Please enter a coupon code.' }
  }

  if (!coupon || coupon.code.toUpperCase() !== cleanCode) {
    return { valid: false, message: 'Coupon not found.' }
  }

  if (coupon.is_active === false) {
    return { valid: false, message: 'This coupon code is currently inactive.' }
  }

  const now = new Date()
  const startDate = coupon.start_date || coupon.starts_at
  const endDate = coupon.end_date || coupon.expires_at

  if (startDate && new Date(startDate).getTime() > now.getTime()) {
    return { valid: false, message: 'This promo campaign has not started yet.' }
  }

  if (endDate && new Date(endDate).getTime() < now.getTime()) {
    return { valid: false, message: 'This coupon code has expired.' }
  }

  const usedCount = Number(coupon.used_count || 0)
  const usageLimit = coupon.usage_limit ? Number(coupon.usage_limit) : null

  if (usageLimit !== null && usedCount >= usageLimit) {
    return { valid: false, message: 'This promo code limit has been reached.' }
  }

  if (coupon.first_time_only || coupon.target_type === 'first_time_buyers') {
    if (!userId) {
      return { valid: false, message: 'Please log in to redeem this first-time buyer coupon.' }
    }
    if (orderCount > 0) {
      return { valid: false, message: 'This coupon is valid for first-time buyers only.' }
    }
  }

  const minSpend = Number(coupon.min_spend || coupon.minimum_order_amount || 0)
  if (subtotal < minSpend) {
    return { valid: false, message: `Minimum spend of ₹${minSpend} required on eligible items.` }
  }

  const couponValue = Number(coupon.value || coupon.discount_value || 0)
  const couponType = coupon.type || coupon.discount_type || 'percentage'
  const maxDiscount = coupon.max_discount ? Number(coupon.max_discount) : null

  let discount = couponType === 'percentage'
    ? (subtotal * couponValue) / 100
    : couponValue

  if (maxDiscount !== null && discount > maxDiscount) {
    discount = maxDiscount
  }

  return {
    valid: true,
    discountAmount: Math.min(Math.round(discount), subtotal)
  }
}

describe('Granular Coupon Validation & Debug Tests', () => {

  const festive30Coupon = {
    code: 'FESTIVE30',
    is_active: true,
    start_date: new Date(Date.now() - 86400000).toISOString(),
    end_date: new Date(Date.now() + 86400000 * 365).toISOString(),
    min_spend: 2999,
    value: 30,
    type: 'percentage',
    max_discount: 1500,
    usage_limit: 500,
    used_count: 0,
    target_type: 'all'
  }

  test('1. Valid FESTIVE30 coupon applies successfully on cart subtotal >= ₹2999', () => {
    const res = validateCouponInMemory(festive30Coupon, 'festive30', 3999)
    assert.strictEqual(res.valid, true)
    assert.strictEqual(res.discountAmount, 1200)
  })

  test('2. Case-insensitive lookup (mixed case "fEsTiVe30") resolves correctly', () => {
    const res = validateCouponInMemory(festive30Coupon, 'fEsTiVe30', 3999)
    assert.strictEqual(res.valid, true)
  })

  test('3. Returns "Coupon not found." for unknown codes', () => {
    const res = validateCouponInMemory(festive30Coupon, 'UNKNOWN_CODE', 3999)
    assert.strictEqual(res.valid, false)
    assert.strictEqual(res.message, 'Coupon not found.')
  })

  test('4. Returns "This coupon code is currently inactive." for inactive coupons', () => {
    const inactive = { ...festive30Coupon, is_active: false }
    const res = validateCouponInMemory(inactive, 'FESTIVE30', 3999)
    assert.strictEqual(res.valid, false)
    assert.strictEqual(res.message, 'This coupon code is currently inactive.')
  })

  test('5. Returns "This coupon code has expired." for expired coupons', () => {
    const expired = { ...festive30Coupon, end_date: '2020-01-01T00:00:00Z' }
    const res = validateCouponInMemory(expired, 'FESTIVE30', 3999)
    assert.strictEqual(res.valid, false)
    assert.strictEqual(res.message, 'This coupon code has expired.')
  })

  test('6. Returns "Minimum spend of ₹2999 required on eligible items." when subtotal < min_spend', () => {
    const res = validateCouponInMemory(festive30Coupon, 'FESTIVE30', 1500)
    assert.strictEqual(res.valid, false)
    assert.strictEqual(res.message, 'Minimum spend of ₹2999 required on eligible items.')
  })

})
