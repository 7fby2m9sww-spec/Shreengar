'use server'

import { createAdminClient } from '../../lib/supabase/server.ts'
import { resolveApplicationSession } from '../../lib/auth/resolveApplicationSession.ts'

export async function cancelOrderCustomerAction(orderId: string, reason?: string): Promise<{ success: boolean; error?: string }> {
  try {
    // 1. Resolve application session for customer
    const appSession = await resolveApplicationSession()
    if (appSession.type !== 'customer') {
      return { success: false, error: 'You must be logged in to cancel an order.' }
    }
    const userId = appSession.customerId

    const supabase = createAdminClient()

    // 2. Fetch order to verify ownership and current status
    const { data: order, error: orderErr } = await supabase
      .from('orders')
      .select('user_id, status, payment_status')
      .eq('id', orderId)
      .single()

    if (orderErr || !order) {
      return { success: false, error: 'Order not found.' }
    }

    // 3. Verify ownership
    if (order.user_id !== userId) {
      return { success: false, error: 'Unauthorized. You do not own this order.' }
    }

    // 4. Validate customer can cancel (only before dispatch / pre-dispatch)
    // Valid cancellable statuses before dispatch: pending, confirmed, processing, packed
    const cancellableStatuses = ['pending', 'confirmed', 'processing', 'packed']
    if (!cancellableStatuses.includes(order.status)) {
      return { success: false, error: `Order cannot be cancelled in its current state: ${order.status}` }
    }

    // 5. Block cancellation if already shipped, delivered or cancelled
    const blockedStatuses = ['shipped', 'delivered', 'cancelled', 'returned', 'refunded']
    if (blockedStatuses.includes(order.status)) {
      return { success: false, error: 'This order has already been shipped or processed beyond cancellation.' }
    }

    // 6. Invoke update_order_status_atomic RPC
    const { data: rpcRes, error: rpcErr } = await supabase.rpc('update_order_status_atomic', {
      p_order_id: orderId,
      p_new_status: 'cancelled'
    })

    if (rpcErr || !rpcRes || !(rpcRes as any).success) {
      console.error('[CUSTOMER-CANCEL-ORDER-ERROR]', rpcErr || rpcRes)
      return { success: false, error: rpcErr?.message || 'Failed to cancel order.' }
    }

    // Insert activity log
    await supabase.from('activity_logs').insert({
      action: 'order.cancelled_by_customer',
      module: 'orders',
      details: { order_id: orderId, reason }
    })

    // Revalidate paths
    try {
      const { revalidatePath } = await import('next/cache')
      revalidatePath('/admin/orders')
      revalidatePath('/admin/inventory')
      revalidatePath('/orders')
      revalidatePath('/shop')
      
      const { data: orderItems } = await supabase
        .from('order_items')
        .select('product_id')
        .eq('order_id', orderId)
      
      if (orderItems) {
        for (const item of orderItems) {
          if (item.product_id) {
            revalidatePath(`/product/${item.product_id}`)
          }
        }
      }
    } catch (e) {
      console.error('Revalidation error:', e)
    }

    return { success: true }
  } catch (err: any) {
    console.error('[CUSTOMER-CANCEL-ORDER-EXCEPTION]', err)
    return { success: false, error: err.message || 'An unexpected error occurred.' }
  }
}
