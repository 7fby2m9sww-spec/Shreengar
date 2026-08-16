import { test, describe } from 'node:test'
import assert from 'node:assert'

export function validateCouponPayload(payload: { title?: string; code?: string; value?: number; min_spend?: number }) {
  const cleanTitle = (payload.title || '').trim()
  const cleanCode = (payload.code || '').trim().toUpperCase()

  if (!cleanTitle) {
    return { valid: false, error: 'Coupon title is required and cannot be empty.' }
  }

  if (!cleanCode) {
    return { valid: false, error: 'Coupon code is required and cannot be empty.' }
  }

  if (payload.value === undefined || payload.value < 0) {
    return { valid: false, error: 'Discount value must be a positive number.' }
  }

  return {
    valid: true,
    payload: {
      title: cleanTitle,
      code: cleanCode,
      value: payload.value,
      min_spend: payload.min_spend ?? 0
    }
  }
}

describe('Coupon Title & Required Field Validation Tests', () => {

  test('1. Valid title and code pass payload validation', () => {
    const res = validateCouponPayload({
      title: 'Summer Sale 2026',
      code: 'summer100',
      value: 100,
      min_spend: 1000
    })

    assert.strictEqual(res.valid, true)
    assert.strictEqual(res.payload?.title, 'Summer Sale 2026')
    assert.strictEqual(res.payload?.code, 'SUMMER100')
  })

  test('2. Empty title is rejected with user-friendly error', () => {
    const res = validateCouponPayload({
      title: '',
      code: 'SUMMER100',
      value: 100
    })

    assert.strictEqual(res.valid, false)
    assert.strictEqual(res.error, 'Coupon title is required and cannot be empty.')
  })

  test('3. Whitespace-only title is rejected after trim', () => {
    const res = validateCouponPayload({
      title: '    ',
      code: 'SUMMER100',
      value: 100
    })

    assert.strictEqual(res.valid, false)
    assert.strictEqual(res.error, 'Coupon title is required and cannot be empty.')
  })

  test('4. Empty code is rejected with user-friendly error', () => {
    const res = validateCouponPayload({
      title: 'Festive Offer',
      code: '',
      value: 100
    })

    assert.strictEqual(res.valid, false)
    assert.strictEqual(res.error, 'Coupon code is required and cannot be empty.')
  })

})
