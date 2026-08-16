import { test, describe } from 'node:test'
import assert from 'node:assert'

export interface NotificationItem {
  id: string
  title: string
  message: string
  time: string
  type: 'order' | 'customer' | 'coupon' | 'system'
  link: string
}

export function filterUnreadNotifications(notifications: NotificationItem[], readIds: Set<string>): NotificationItem[] {
  return notifications.filter(n => !readIds.has(n.id))
}

export function computeUnreadCount(notifications: NotificationItem[], readIds: Set<string>): number {
  return filterUnreadNotifications(notifications, readIds).length
}

export function formatRelativeTime(dateStr: string, now: Date = new Date()): string {
  try {
    const diffSec = Math.floor((now.getTime() - new Date(dateStr).getTime()) / 1000)

    if (diffSec < 60) return 'Just now'
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`
    if (diffSec < 604800) return `${Math.floor(diffSec / 86400)}d ago`

    return new Date(dateStr).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })
  } catch {
    return 'Recently'
  }
}

describe('Admin Notification System Unit Tests', () => {

  const sampleNotifications: NotificationItem[] = [
    { id: 'order-1', title: 'New Order Received', message: 'Order #SHR-001 placed for ₹2,999', time: '2m ago', type: 'order', link: '/admin/orders' },
    { id: 'cust-1', title: 'New Customer Registered', message: 'DEV joined Shreengar', time: '10m ago', type: 'customer', link: '/admin/customers' },
    { id: 'coupon-1', title: 'Active Promo Code', message: 'FEST30 is live', time: '1h ago', type: 'coupon', link: '/admin/coupons' }
  ]

  test('1. Compute unread count starts at total notifications when readIds is empty', () => {
    const readIds = new Set<string>()
    const unread = computeUnreadCount(sampleNotifications, readIds)
    assert.strictEqual(unread, 3)
  })

  test('2. Marking item as read decrements unread count', () => {
    const readIds = new Set<string>(['order-1'])
    const unread = computeUnreadCount(sampleNotifications, readIds)
    assert.strictEqual(unread, 2)

    const unreadList = filterUnreadNotifications(sampleNotifications, readIds)
    assert.strictEqual(unreadList.some(n => n.id === 'order-1'), false)
  })

  test('3. Marking all as read results in zero unread count', () => {
    const readIds = new Set<string>(['order-1', 'cust-1', 'coupon-1'])
    const unread = computeUnreadCount(sampleNotifications, readIds)
    assert.strictEqual(unread, 0)
  })

  test('4. Formats relative time correctly', () => {
    const refNow = new Date('2026-08-16T12:00:00Z')
    const date2mAgo = new Date('2026-08-16T11:58:00Z').toISOString()
    const date2hAgo = new Date('2026-08-16T10:00:00Z').toISOString()

    assert.strictEqual(formatRelativeTime(date2mAgo, refNow), '2m ago')
    assert.strictEqual(formatRelativeTime(date2hAgo, refNow), '2h ago')
  })

})
