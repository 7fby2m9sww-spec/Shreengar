import React from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import { CheckCircle2, Truck, Calendar, MessageSquare } from 'lucide-react'
import { getCustomerOrderByIdAction } from '@/actions/orders/actions'
import { formatINR } from '@/lib/utils'

export default async function OrderSuccessPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const res = await getCustomerOrderByIdAction(id)

  if (!res.success || !res.data) {
    notFound()
  }

  const order = res.data
  const orderNumber = order.order_number
  const totalAmount = order.total_amount

  return (
    <div className="max-w-2xl mx-auto py-12 px-4 space-y-8 text-center">
      {/* Celebration Header */}
      <div className="space-y-4">
        <div className="w-20 h-20 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto shadow-inner border border-emerald-300">
          <CheckCircle2 className="w-12 h-12 stroke-[2.5]" />
        </div>

        <span className="inline-block px-3 py-1 bg-amber-100 text-amber-900 text-xs font-serif font-bold rounded-full">
          Payment Confirmed
        </span>

        <h1 className="font-serif text-3xl sm:text-4xl font-bold text-foreground">
          Thank You For Your Order!
        </h1>

        <p className="text-xs sm:text-sm text-muted-foreground max-w-md mx-auto">
          Your order <strong>#{orderNumber}</strong> has been received and is being prepared with royal care by our master tailors.
        </p>
      </div>

      {/* Delivery Receipt Card */}
      <div className="bg-surface-muted/60 p-6 rounded-2xl border border-border shadow-sm space-y-4 text-left text-xs text-foreground">
        <div className="flex items-center justify-between pb-3 border-b border-border">
          <div>
            <span className="text-[10px] uppercase font-bold text-muted-foreground">Order Number</span>
            <p className="font-mono font-bold text-sm text-foreground">{orderNumber}</p>
          </div>
          <div className="text-right">
            <span className="text-[10px] uppercase font-bold text-muted-foreground">Estimated Delivery</span>
            <p className="font-serif font-bold text-emerald-700 flex items-center justify-end">
              <Calendar className="w-3.5 h-3.5 mr-1" />
              Standard Delivery (3-5 Days)
            </p>
          </div>
        </div>

        {/* Item Preview */}
        {order?.items && order.items.length > 0 ? (
          order.items.map(item => (
            <div key={item.id} className="flex items-center space-x-3 py-2">
              {item.image_url ? (
                <Image
                  src={item.image_url}
                  alt={item.product_name || 'Product Image'}
                  width={56}
                  height={64}
                  className="w-14 h-16 object-cover rounded-md bg-rose-950/5"
                />
              ) : (
                <div className="w-14 h-16 bg-amber-100 rounded-md flex items-center justify-center font-bold text-[10px] text-foreground">
                  No Img
                </div>
              )}
              <div className="flex-1">
                <p className="font-serif font-bold text-sm text-foreground truncate max-w-[200px]">{item.product_name}</p>
                <span className="font-semibold text-brand-primary dark:text-gold">+{(order.items?.length || 1) - 1} more items</span>
                <span className="font-semibold text-foreground">{formatINR(item.selling_price)}</span>
              </div>
            </div>
          ))
        ) : (
          <p className="text-xs text-muted-foreground font-serif">Order details confirmed</p>
        )}

        <div className="pt-3 border-t border-border flex items-center justify-between font-bold text-sm text-foreground">
          <span>Amount Paid</span>
          <span>{formatINR(totalAmount)}</span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
        <Link
          href={`/tracking?order=${orderNumber}`}
          className="w-full sm:w-auto px-5 py-3 bg-rose-950 hover:bg-rose-900 text-amber-100 font-serif font-bold text-xs rounded-xl shadow-lg flex items-center justify-center space-x-2"
        >
          <Truck className="w-4 h-4 text-amber-400" />
          <span>Track Delivery Status</span>
        </Link>

        <Link
          href={`/order-success/${id}?supportOrder=${id}`}
          className="w-full sm:w-auto px-5 py-3 bg-brand-primary/10 hover:bg-brand-primary/20 text-brand-primary dark:text-amber-300 font-serif font-bold text-xs rounded-xl border border-brand-primary/20 flex items-center justify-center space-x-2"
        >
          <MessageSquare className="w-4 h-4 text-gold" />
          <span>Order Support Chat</span>
        </Link>

        <Link
          href="/shop"
          className="w-full sm:w-auto px-5 py-3 bg-surface-muted hover:bg-surface-elevated text-foreground font-serif font-semibold text-xs rounded-xl border border-border text-center"
        >
          Continue Shopping
        </Link>
      </div>
    </div>
  )
}
