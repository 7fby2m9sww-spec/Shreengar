import { test, describe } from 'node:test'
import assert from 'node:assert'

export function normalizeCouponRow(raw: any): any {
  if (!raw) return null
  return {
    ...raw,
    code: (raw.code || '').toUpperCase(),
    type: raw.type || raw.discount_type || 'percentage',
    value: Number(raw.value ?? raw.discount_value ?? 0),
    min_spend: Number(raw.min_spend ?? raw.minimum_order_amount ?? 0),
    max_discount: raw.max_discount ?? raw.maximum_discount ?? null,
    start_date: raw.start_date || raw.starts_at || new Date().toISOString(),
    end_date: raw.end_date || raw.expires_at || new Date(Date.now() + 365 * 86400000).toISOString(),
    usage_limit: raw.usage_limit ?? 500,
    used_count: Number(raw.used_count || 0),
    is_active: raw.is_active !== false,
  }
}

describe('Coupon Schema Alignment & PGRST204 Resiliency Tests', () => {

  test('1. Normalizes database row containing legacy column names (starts_at, minimum_order_amount)', () => {
    const legacyRow = {
      id: 'coup_1',
      code: 'TEST100',
      discount_type: 'percentage',
      discount_value: 10,
      minimum_order_amount: 1000,
      starts_at: '2026-08-15T00:00:00Z',
      expires_at: '2027-08-15T00:00:00Z',
      is_active: true
    }

    const norm = normalizeCouponRow(legacyRow)
    assert.strictEqual(norm.code, 'TEST100')
    assert.strictEqual(norm.type, 'percentage')
    assert.strictEqual(norm.value, 10)
    assert.strictEqual(norm.min_spend, 1000)
    assert.strictEqual(norm.start_date, '2026-08-15T00:00:00Z')
    assert.strictEqual(norm.end_date, '2027-08-15T00:00:00Z')
  })

  test('2. Normalizes database row containing standard column names (start_date, min_spend)', () => {
    const standardRow = {
      id: 'coup_2',
      code: 'FESTIVE30',
      type: 'percentage',
      value: 30,
      min_spend: 2999,
      start_date: '2026-08-15T00:00:00Z',
      end_date: '2027-08-15T00:00:00Z',
      is_active: true
    }

    const norm = normalizeCouponRow(standardRow)
    assert.strictEqual(norm.code, 'FESTIVE30')
    assert.strictEqual(norm.min_spend, 2999)
    assert.strictEqual(norm.value, 30)
  })

  test('3. Creating TEST100 generates valid coupon code and active status', () => {
    const input = { code: 'test100', value: 100, min_spend: 500 }
    const norm = normalizeCouponRow(input)
    assert.strictEqual(norm.code, 'TEST100')
    assert.strictEqual(norm.is_active, true)
  })

})
