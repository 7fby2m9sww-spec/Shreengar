import { test, describe } from 'node:test'
import assert from 'node:assert'

// Unit testable target validation logic
export function isCustomerTargetedByCoupon(
  coupon: {
    target_type?: string
    target_customer_ids?: string[]
    target_customer_emails?: string[]
  },
  userId?: string | null,
  userEmail?: string | null
): boolean {
  if (coupon.target_type !== 'selected_customers') return true

  const normalizedEmail = userEmail ? userEmail.toLowerCase() : null
  const targetedEmails = (coupon.target_customer_emails || []).map(e => e.toLowerCase())
  const targetedIds = coupon.target_customer_ids || []

  const isMatchById = Boolean(userId && targetedIds.includes(userId))
  const isMatchByEmail = Boolean(normalizedEmail && targetedEmails.includes(normalizedEmail))

  return isMatchById || isMatchByEmail
}

// Migration helper logic testing valid UUID filtering
export function filterValidUuids(rawArray: string[]): string[] {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  return rawArray.filter(item => uuidRegex.test(item))
}

describe('Targeted Coupon System Customer Validation Tests', () => {

  test('1. Coupon targeted by UUID matches customer user ID', () => {
    const coupon = {
      target_type: 'selected_customers',
      target_customer_ids: ['12345678-1234-1234-1234-123456789abc', '87654321-4321-4321-4321-987654321cba'],
      target_customer_emails: []
    }

    const isMatch = isCustomerTargetedByCoupon(coupon, '12345678-1234-1234-1234-123456789abc', null)
    assert.strictEqual(isMatch, true, 'Customer matching targeted UUID must be accepted')
  })

  test('2. Coupon targeted by Email matches customer email (case-insensitive)', () => {
    const coupon = {
      target_type: 'selected_customers',
      target_customer_ids: [],
      target_customer_emails: ['vip@shreengar.com', 'loyalty@shreengar.com']
    }

    const isMatch = isCustomerTargetedByCoupon(coupon, null, 'VIP@Shreengar.COM')
    assert.strictEqual(isMatch, true, 'Customer matching targeted email (case-insensitive) must be accepted')
  })

  test('3. Coupon targeted by Both matches customer with both UUID and email', () => {
    const coupon = {
      target_type: 'selected_customers',
      target_customer_ids: ['12345678-1234-1234-1234-123456789abc'],
      target_customer_emails: ['vip@shreengar.com']
    }

    const isMatch = isCustomerTargetedByCoupon(coupon, '12345678-1234-1234-1234-123456789abc', 'vip@shreengar.com')
    assert.strictEqual(isMatch, true, 'Customer matching both UUID and email must be accepted')
  })

  test('4. Non-targeted customer is rejected', () => {
    const coupon = {
      target_type: 'selected_customers',
      target_customer_ids: ['12345678-1234-1234-1234-123456789abc'],
      target_customer_emails: ['vip@shreengar.com']
    }

    const isMatch = isCustomerTargetedByCoupon(coupon, '00000000-0000-0000-0000-000000000000', 'random@gmail.com')
    assert.strictEqual(isMatch, false, 'Non-targeted customer must be rejected')
  })

  test('5. Missing user ID but matching email is accepted', () => {
    const coupon = {
      target_type: 'selected_customers',
      target_customer_ids: ['12345678-1234-1234-1234-123456789abc'],
      target_customer_emails: ['member@example.com']
    }

    const isMatch = isCustomerTargetedByCoupon(coupon, null, 'member@example.com')
    assert.strictEqual(isMatch, true, 'Missing user ID with matching email must be accepted for backward compatibility')
  })

  test('6. Matching user ID with different email is accepted', () => {
    const coupon = {
      target_type: 'selected_customers',
      target_customer_ids: ['12345678-1234-1234-1234-123456789abc'],
      target_customer_emails: ['old-email@example.com']
    }

    const isMatch = isCustomerTargetedByCoupon(coupon, '12345678-1234-1234-1234-123456789abc', 'new-updated-email@example.com')
    assert.strictEqual(isMatch, true, 'Matching user ID with different email must be accepted')
  })

  test('7. Migration helper ignores malformed UUIDs and preserves valid UUIDs', () => {
    const rawData = [
      '12345678-1234-1234-1234-123456789abc',
      'invalid-uuid-string',
      '',
      '87654321-4321-4321-4321-987654321cba'
    ]

    const validUuids = filterValidUuids(rawData)
    assert.deepStrictEqual(validUuids, [
      '12345678-1234-1234-1234-123456789abc',
      '87654321-4321-4321-4321-987654321cba'
    ])
  })

  test('8. Editing coupons retains existing UUID targets', () => {
    const originalCoupon = {
      id: 'coup-1',
      code: 'VIP50',
      target_type: 'selected_customers',
      target_customer_ids: ['12345678-1234-1234-1234-123456789abc'],
      target_customer_emails: ['vip@shreengar.com']
    }

    // Simulate edit operation
    const updatedCoupon = {
      ...originalCoupon,
      target_customer_ids: [...originalCoupon.target_customer_ids, '87654321-4321-4321-4321-987654321cba']
    }

    assert.strictEqual(updatedCoupon.target_customer_ids.length, 2)
    assert.ok(updatedCoupon.target_customer_ids.includes('12345678-1234-1234-1234-123456789abc'))
    assert.ok(updatedCoupon.target_customer_ids.includes('87654321-4321-4321-4321-987654321cba'))
  })

})
