import React from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Breadcrumb } from '@/components/store/Breadcrumb'
import { getOrdersForUser } from '@/services/store'
import { Badge } from '@/components/ui/Badge'
import { Package, Truck, MessageSquare } from 'lucide-react'
import { formatINR, formatDate } from '@/lib/utils'
import { getSession } from '@/lib/auth/getSession'
import { redirect } from 'next/navigation'
import { AccountEmptyState } from '@/components/store/account/AccountEmptyState'

export default async function MyOrdersPage() {
  const session = await getSession()
  if (!session.authenticated) {
    redirect('/auth/login?next=/orders')
  }
  const userId = session.profile.id
  const orders = await getOrdersForUser(userId)

  return (
    <div className="space-y-6 pb-16 font-sans px-4 sm:px-6 lg:px-8">
      <div className="hidden sm:block">
        <Breadcrumb items={[{ label: 'My Orders' }]} />
      </div>

      <h1 className="font-serif text-[34px] sm:text-4xl font-bold text-foreground">My Purchase History</h1>

      {orders.length === 0 ? (
        <AccountEmptyState
          Icon={Package}
          title="No orders found"
          description="You haven't placed any orders yet."
          ctaLabel="Start Shopping"
          ctaHref="/shop"
        />
      ) : (
        <div className="space-y-4">
          {orders.map(order => (
            <div
              key={order.id}
              className="bg-surface rounded-2xl border border-border shadow-sm p-4 sm:p-6 lg:p-8 space-y-4"
            >
              {/* Header info */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-border text-xs text-foreground">
                <div className="flex items-center space-x-3">
                  <Package className="w-5 h-5 text-accent" />
                  <div>
                    <span className="font-mono font-bold text-sm">#{order.order_number}</span>
                    <span className="text-muted-foreground ml-2">Placed on {formatDate(order.created_at)}</span>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <Badge
                    variant={
                      order.status === 'delivered'
                        ? 'success'
                        : order.status === 'shipped'
                        ? 'info'
                        : 'warning'
                    }
                  >
                    {order.status.toUpperCase()}
                  </Badge>
                  {order.items && order.items.length > 1 && (
                    <span className="font-semibold text-brand-primary dark:text-gold">+{order.items.length - 1} more items</span>
                  )}
                </div>
              </div>

              {/* Items list */}
              <div className="space-y-3">
                {order.items?.map(item => (
                  <div key={item.id} className="flex items-center space-x-3 text-xs text-foreground">
                    {item.image_url ? (
                      <Image
                        src={item.image_url}
                        alt={item.product_name || 'Product Image'}
                        width={48}
                        height={56}
                        className="w-12 h-14 object-cover rounded-md border border-border shadow-sm"
                      />
                    ) : (
                      <div className="w-12 h-14 bg-surface-muted border border-border rounded flex items-center justify-center font-bold text-[10px] text-muted-foreground shadow-sm">
                        No Img
                      </div>
                    )}
                    <div className="flex-1">
                      <p className="font-serif font-bold text-sm text-foreground">{item.product_name}</p>
                      {item.size_name || item.color_name ? <p className="text-xs text-muted-foreground mt-0.5">Variant: {item.size_name} {item.color_name}</p> : null}
                    </div>
                        <span className="font-semibold text-foreground">{formatINR(item.selling_price)}</span>
                  </div>
                ))}
              </div>

              {/* Actions */}
              <div className="pt-3 border-t border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <span className="text-muted-foreground font-medium">
                  {order.tracking_number ? `Tracking: ${order.tracking_number}` : 'Preparing Dispatch'}
                </span>

                <div className="flex items-center space-x-2">
                  <Link
                    href={`/orders?supportOrder=${order.id}`}
                    className="inline-flex items-center justify-center font-medium rounded-lg transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-accent bg-brand-primary/10 dark:bg-amber-400/10 text-brand-primary dark:text-amber-300 border border-brand-primary/20 dark:border-amber-400/30 hover:bg-brand-primary/20 dark:hover:bg-amber-400/20 px-3 py-1.5 text-xs min-h-[32px] space-x-1"
                  >
                    <MessageSquare className="w-3.5 h-3.5 text-gold" />
                    <span>Help & Support</span>
                  </Link>

                  <Link
                    href={`/tracking?order=${order.order_number}`}
                    className="inline-flex items-center justify-center font-medium rounded-lg transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background bg-surface-muted text-foreground border border-border hover:bg-surface-elevated px-3 py-1.5 text-xs min-h-[32px] space-x-1"
                  >
                    <Truck className="w-3.5 h-3.5 text-accent" />
                    <span>Track Order</span>
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
