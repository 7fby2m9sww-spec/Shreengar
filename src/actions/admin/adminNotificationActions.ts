'use server'

import { createAdminClient } from '@/lib/supabase/server'
import { checkAdminAuth } from '@/actions/catalog/actions'
import { formatINR } from '@/lib/utils'

export interface AdminNotificationItem {
  id: string
  title: string
  message: string
  time: string
  timestamp: string
  type: 'order' | 'customer' | 'coupon' | 'system'
  link: string
  isRead?: boolean
}

function getRelativeTimeString(dateStr: string): string {
  try {
    const now = new Date().getTime()
    const past = new Date(dateStr).getTime()
    const diffSec = Math.floor((now - past) / 1000)

    if (diffSec < 60) return 'Just now'
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`
    if (diffSec < 604800) return `${Math.floor(diffSec / 86400)}d ago`

    return new Date(dateStr).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })
  } catch {
    return 'Recently'
  }
}

export async function getAdminLiveNotificationsAction(): Promise<{
  success: boolean
  data?: AdminNotificationItem[]
  unreadCount?: number
  error?: string
}> {
  try {
    await checkAdminAuth()
    const supabase = createAdminClient()
    const notifications: AdminNotificationItem[] = []

    // 1. Fetch Recent Orders (Last 5)
    const { data: orders } = await supabase
      .from('orders')
      .select('id, order_number, total_amount, created_at, status')
      .order('created_at', { ascending: false })
      .limit(5)

    if (orders && orders.length > 0) {
      orders.forEach(o => {
        const orderNum = o.order_number || o.id.slice(0, 8).toUpperCase()
        const amountStr = o.total_amount ? formatINR(Number(o.total_amount)) : '₹0'
        notifications.push({
          id: `order-${o.id}`,
          title: 'New Order Received',
          message: `Order #${orderNum} placed for ${amountStr} (${(o.status || 'pending').toUpperCase()})`,
          time: getRelativeTimeString(o.created_at),
          timestamp: o.created_at,
          type: 'order',
          link: '/admin/orders',
        })
      })
    }

    // 2. Fetch Recent Customer Profiles (Last 5)
    const { data: customers } = await supabase
      .from('profiles')
      .select('id, full_name, email, created_at')
      .order('created_at', { ascending: false })
      .limit(5)

    if (customers && customers.length > 0) {
      customers.forEach(c => {
        const name = c.full_name || c.email || 'New Customer'
        notifications.push({
          id: `customer-${c.id}`,
          title: 'New Customer Registered',
          message: `${name} joined Shreengar Couture`,
          time: getRelativeTimeString(c.created_at),
          timestamp: c.created_at,
          type: 'customer',
          link: '/admin/customers',
        })
      })
    }

    // 3. Fetch Active Coupons
    const { data: coupons } = await supabase
      .from('coupons')
      .select('id, code, title, is_active, created_at')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(3)

    if (coupons && coupons.length > 0) {
      coupons.forEach(cp => {
        notifications.push({
          id: `coupon-${cp.id}`,
          title: 'Active Promo Code',
          message: `Code "${cp.code}" (${cp.title || 'Promo'}) is active in storefront`,
          time: getRelativeTimeString(cp.created_at),
          timestamp: cp.created_at,
          type: 'coupon',
          link: '/admin/coupons',
        })
      })
    }

    // 4. System Security Notification
    notifications.push({
      id: 'system-security-verified',
      title: 'Security & Audit Mode Active',
      message: 'Admin Dashboard initialized with active encryption and secure RBAC policy.',
      time: 'Today',
      timestamp: new Date().toISOString(),
      type: 'system',
      link: '/admin/settings/security',
    })

    // Sort all notifications chronologically by timestamp (newest first)
    notifications.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

    return {
      success: true,
      data: notifications,
      unreadCount: notifications.length
    }
  } catch (err: any) {
    console.error('getAdminLiveNotificationsAction error:', err)
    return {
      success: false,
      error: err.message || 'Failed to fetch admin notifications.'
    }
  }
}
