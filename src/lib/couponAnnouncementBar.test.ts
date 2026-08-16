import { test, describe } from 'node:test'
import assert from 'node:assert'

export function filterActiveAnnouncementCoupons(rawCoupons: any[], now: Date = new Date()): any[] {
  return rawCoupons.filter(c => {
    if (!c.is_active) return false
    const start = c.start_date || c.starts_at
    const end = c.end_date || c.expires_at

    if (start && new Date(start).getTime() > now.getTime()) return false
    if (end && new Date(end).getTime() < now.getTime()) return false

    const limit = c.usage_limit
    const used = c.used_count || 0
    if (limit !== null && limit !== undefined && used >= limit) return false

    return true
  })
}

export function formatAnnouncementItem(coupon: any): string {
  const rawType = coupon.type || coupon.discount_type || 'percentage'
  const isFixed = rawType === 'fixed_amount' || rawType === 'fixed'
  const discountStr = isFixed ? `Flat ₹${coupon.value} OFF` : `${coupon.value}% OFF`

  const minSpend = Number(coupon.min_spend || coupon.minimum_order_amount || 0)
  const targetStr = (coupon.first_time_only || coupon.target_type === 'first_time_buyers')
    ? 'for First-Time Buyers'
    : minSpend > 0
    ? `on Orders Above ₹${minSpend}`
    : 'Storewide'

  return `${coupon.code} — ${discountStr} ${targetStr}`
}

describe('Dynamic Coupon Announcement Bar Unit Tests', () => {

  const now = new Date('2026-08-16T12:00:00Z')

  const sampleCoupons = [
    {
      code: 'FESTIVE30',
      is_active: true,
      start_date: '2026-08-01T00:00:00Z',
      end_date: '2026-08-30T00:00:00Z',
      value: 30,
      type: 'percentage',
      min_spend: 2999,
      usage_limit: 500,
      used_count: 5
    },
    {
      code: 'EXPIRED10',
      is_active: true,
      start_date: '2026-01-01T00:00:00Z',
      end_date: '2026-02-01T00:00:00Z',
      value: 10,
      type: 'percentage'
    },
    {
      code: 'INACTIVE50',
      is_active: false,
      value: 50,
      type: 'percentage'
    },
    {
      code: 'LIMITREACHED',
      is_active: true,
      value: 20,
      usage_limit: 10,
      used_count: 10
    }
  ]

  test('1. Filters active coupons correctly within date and usage bounds', () => {
    const valid = filterActiveAnnouncementCoupons(sampleCoupons, now)
    assert.strictEqual(valid.length, 1)
    assert.strictEqual(valid[0].code, 'FESTIVE30')
  })

  test('2. Formats coupon announcement string with min spend info', () => {
    const formatted = formatAnnouncementItem(sampleCoupons[0])
    assert.strictEqual(formatted, 'FESTIVE30 — 30% OFF on Orders Above ₹2999')
  })

  test('3. Formats fixed discount coupon announcement string', () => {
    const fixedCoupon = {
      code: 'TEST100',
      type: 'fixed_amount',
      value: 100,
      min_spend: 0
    }
    const formatted = formatAnnouncementItem(fixedCoupon)
    assert.strictEqual(formatted, 'TEST100 — Flat ₹100 OFF Storewide')
  })

  test('4. Formats first-time buyer coupon announcement string', () => {
    const ftCoupon = {
      code: 'WELCOME30',
      type: 'percentage',
      value: 30,
      first_time_only: true
    }
    const formatted = formatAnnouncementItem(ftCoupon)
    assert.strictEqual(formatted, 'WELCOME30 — 30% OFF for First-Time Buyers')
  })

})
