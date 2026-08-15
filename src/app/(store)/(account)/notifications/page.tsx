import React from 'react'
import { createClient } from '@/lib/supabase/server'
import { getSession } from '@/lib/auth/getSession'
import { Bell, ShoppingBag, Gift, ShieldCheck, Truck } from 'lucide-react'
import { getOrdersForUser } from '@/services/store'
import { formatDate } from '@/lib/utils'

export const dynamic = 'force-dynamic'

interface NotificationItem {
  id: string
  title: string
  message: string
  date: string
  type: 'order' | 'promo' | 'security' | 'system'
  icon: any
}

export default async function NotificationsPage() {
  const session = await getSession()
  const customerName = session.authenticated ? (session.profile.full_name || 'Customer') : 'Valued Customer'
  const userId = session.authenticated ? session.profile.id : ''

  // Fetch real order updates if possible
  let orders: any[] = []
  if (userId) {
    try {
      orders = await getOrdersForUser(userId)
    } catch {}
  }

  // Create real notifications based on orders
  const notificationsList: NotificationItem[] = []

  orders.slice(0, 3).forEach((order, index) => {
    if (order.status === 'delivered') {
      notificationsList.push({
        id: `order-del-${order.id}`,
        title: `Order Delivered: #${order.order_number}`,
        message: `Your package with total value of Rs. ${order.total_amount} has been successfully delivered. We hope you love your new attire!`,
        date: formatDate(order.updated_at || order.created_at),
        type: 'order',
        icon: ShieldCheck,
      })
    } else if (order.status === 'shipped') {
      notificationsList.push({
        id: `order-ship-${order.id}`,
        title: `Order Dispatched: #${order.order_number}`,
        message: `Your package is on its way! Courier: ${order.tracking_courier || 'Express'}. Tracking Number: ${order.tracking_number || 'N/A'}.`,
        date: formatDate(order.updated_at || order.created_at),
        type: 'order',
        icon: Truck,
      })
    } else {
      notificationsList.push({
        id: `order-place-${order.id}`,
        title: `Order Placed: #${order.order_number}`,
        message: `Thank you for shopping at Shreengar! Your order of Rs. ${order.total_amount} is currently being prepared for dispatch.`,
        date: formatDate(order.created_at),
        type: 'order',
        icon: ShoppingBag,
      })
    }
  })

  // Add system notifications
  notificationsList.push({
    id: 'welcome',
    title: 'Welcome to Shreengar Couture',
    message: `Dear ${customerName}, thank you for joining Shreengar. Explore our Royal Ethnic Couture collections with code FESTIVE20 for 20% off.`,
    date: 'July 14, 2026',
    type: 'system',
    icon: Gift,
  })

  notificationsList.push({
    id: 'security-sync',
    title: 'Account Verification Complete',
    message: 'Your profile registration and secure OTP login settings have been configured successfully.',
    date: 'July 14, 2026',
    type: 'security',
    icon: ShieldCheck,
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-3">
        <div className="p-2 bg-surface-muted rounded-xl border border-amber-500/20 text-foreground">
          <Bell className="w-6 h-6" />
        </div>
        <div>
          <h1 className="font-serif text-3xl font-bold text-foreground">Notifications</h1>
          <p className="text-xs text-muted mt-1">Stay updated with your order statuses and luxury couture highlights.</p>
        </div>
      </div>

      <div className="bg-surface rounded-2xl border border-border shadow-sm overflow-hidden divide-y divide-rose-900/10">
        {notificationsList.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">
            <Bell className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
            <p className="font-serif text-lg font-semibold">All quiet here</p>
            <p className="text-xs">No updates or notifications available at this time.</p>
          </div>
        ) : (
          notificationsList.map((item) => {
            const Icon = item.icon
            return (
              <div key={item.id} className="p-6 flex items-start space-x-4 hover:bg-surface-muted/20 transition-colors">
                <div className={`p-2 rounded-xl border flex-shrink-0 ${
                  item.type === 'order' 
                    ? 'bg-emerald-50 border-emerald-500/20 text-emerald-700' 
                    : item.type === 'security'
                    ? 'bg-blue-50 border-blue-500/20 text-blue-700'
                    : 'bg-surface-muted border-amber-500/20 text-amber-700'
                }`}>
                  <Icon className="w-5 h-5" />
                </div>
                
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <h3 className="font-serif font-bold text-sm text-foreground">
                      {item.title}
                    </h3>
                    <span className="text-[10px] text-rose-900/50 font-mono">
                      {item.date}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed max-w-2xl">
                    {item.message}
                  </p>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
