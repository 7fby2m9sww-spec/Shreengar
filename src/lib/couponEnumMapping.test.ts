import { test, describe } from 'node:test'
import assert from 'node:assert'

export function mapUiTypeToDbEnum(uiType: string): 'percentage' | 'fixed_amount' | 'free_shipping' {
  if (uiType === 'fixed') return 'fixed_amount'
  if (uiType === 'free_shipping') return 'free_shipping'
  return 'percentage'
}

export function mapDbEnumToUiType(dbEnum: string): 'percentage' | 'fixed' {
  if (dbEnum === 'fixed_amount' || dbEnum === 'fixed') return 'fixed'
  return 'percentage'
}

export function calculateFixedDiscount(cartSubtotal: number, couponValue: number, minSpend: number = 0): number {
  if (cartSubtotal < minSpend) return 0
  return Math.min(couponValue, cartSubtotal)
}

describe('Coupon Enum Mapping & TEST100 Validation Tests', () => {

  test('1. Maps UI "fixed" to DB enum "fixed_amount"', () => {
    const dbEnum = mapUiTypeToDbEnum('fixed')
    assert.strictEqual(dbEnum, 'fixed_amount')
  })

  test('2. Maps DB enum "fixed_amount" back to UI "fixed"', () => {
    const uiType = mapDbEnumToUiType('fixed_amount')
    assert.strictEqual(uiType, 'fixed')
  })

  test('3. Maps UI "percentage" to DB enum "percentage"', () => {
    const dbEnum = mapUiTypeToDbEnum('percentage')
    assert.strictEqual(dbEnum, 'percentage')
  })

  test('4. Creating TEST100 (Flat ₹100 OFF) calculates correct discount on ₹500 cart', () => {
    const coupon = {
      code: 'TEST100',
      type: mapDbEnumToUiType('fixed_amount'), // UI gets 'fixed'
      value: 100,
      min_spend: 0
    }

    const discount = calculateFixedDiscount(500, coupon.value, coupon.min_spend)
    assert.strictEqual(discount, 100)
    assert.strictEqual(500 - discount, 400)
  })

})
