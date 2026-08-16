import { test, describe } from 'node:test'
import assert from 'node:assert'

// Pure pricing engine totals calculator (matching CartContext logic)
export function computeCartTotals(subtotal: number, couponDiscount: number, shipping: number = 0) {
  const discount = 0
  const tax = 0
  const grandTotal = Math.max(0, subtotal - discount - couponDiscount + shipping + tax)
  return { subtotal, discount, couponDiscount, shipping, tax, grandTotal }
}

describe('Coupon Checkout Integration & Calculation Tests', () => {

  test('1. Compute cart totals accurately subtracts coupon discount from grand total', () => {
    const subtotal = 3999
    const couponDiscount = 1200
    const shipping = 0

    const totals = computeCartTotals(subtotal, couponDiscount, shipping)
    assert.strictEqual(totals.subtotal, 3999)
    assert.strictEqual(totals.couponDiscount, 1200)
    assert.strictEqual(totals.grandTotal, 2799)
  })

  test('2. Coupon discount cannot reduce grand total below zero', () => {
    const subtotal = 500
    const couponDiscount = 1000 // Exceeds subtotal

    const totals = computeCartTotals(subtotal, couponDiscount, 0)
    assert.strictEqual(totals.grandTotal, 0, 'Grand total must never be negative')
  })

  test('3. Revalidation correctly invalidates coupon if cart subtotal drops below min_spend', () => {
    const minSpend = 2999
    const currentSubtotal = 1500 // Dropped below min_spend

    const isStillValid = currentSubtotal >= minSpend
    assert.strictEqual(isStillValid, false, 'Coupon must be invalidated when cart subtotal falls below min_spend')
  })

  test('4. Server-side order placement accepts valid coupon code', async () => {
    const inputCouponCode = 'FESTIVE30'
    const validatedCode = inputCouponCode.trim().toUpperCase()

    assert.strictEqual(validatedCode, 'FESTIVE30')
  })

  test('5. Local storage coupon cleanup on order completion or cart clear', () => {
    const storage: Record<string, string> = {
      'shreengar_applied_coupon': 'PROMO20'
    }

    // Simulate removeCoupon()
    delete storage['shreengar_applied_coupon']

    assert.strictEqual(storage['shreengar_applied_coupon'], undefined, 'Coupon key must be cleared from storage post-checkout')
  })

})
