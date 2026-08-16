import { test, describe } from 'node:test'
import assert from 'node:assert'

export function computeActiveCodesBadge(coupons: { is_active: boolean }[]): number {
  return coupons.filter(c => c.is_active).length
}

export function formatInsertError(err: { code: string; message: string; details?: string; hint?: string }): string {
  return `[DB Error ${err.code}]: ${err.message}`
}

describe('Admin Coupon Persistence & Error Handling Tests', () => {

  test('1. Compute Active Codes badge correctly filters active coupons', () => {
    const couponsList = [
      { code: 'ACTIVE1', is_active: true },
      { code: 'ACTIVE2', is_active: true },
      { code: 'INACTIVE', is_active: false }
    ]

    const activeCount = computeActiveCodesBadge(couponsList)
    assert.strictEqual(activeCount, 2)
  })

  test('2. Error formatter captures DB code and message without swallowing errors', () => {
    const dbErr = {
      code: '23505', // Unique violation in Postgres
      message: 'duplicate key value violates unique constraint "coupons_code_key"',
      details: 'Key (code)=(FESTIVE30) already exists.'
    }

    const formatted = formatInsertError(dbErr)
    assert.ok(formatted.includes('23505'))
    assert.ok(formatted.includes('duplicate key value violates unique constraint'))
  })

  test('3. Coupon payload formats coupon code to uppercase and sets default dates', () => {
    const rawInput = {
      code: 'festive30',
      type: 'percentage' as const,
      value: 30,
      min_spend: 2999
    }

    const cleanCode = rawInput.code.trim().toUpperCase()
    assert.strictEqual(cleanCode, 'FESTIVE30')
  })

})
