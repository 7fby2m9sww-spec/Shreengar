'use server'

import { createClient, createAdminClient } from '../../lib/supabase/server.ts'
import type { Order } from '../../types/database.ts'

export async function getAllOrdersAction(): Promise<{ success: boolean; data?: Order[]; error?: string }> {
  try {
    const { checkAdminAuth } = await import('../catalog/actions.ts')
    await checkAdminAuth('view_orders')
    const supabase = createAdminClient()
    
    const { data, error } = await supabase
      .from('orders')
      .select('*, items:order_items(*)')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[GET-ALL-ORDERS-ERROR]', error.code, error.message)
      return { success: false, error: error.message }
    }

    if (data) {
      return { success: true, data: data as Order[] }
    }
    
    return { success: true, data: [] }
  } catch (err: any) {
    console.error('[GET-ALL-ORDERS-EXCEPTION]', err)
    return { success: false, error: err.message }
  }
}

export async function updateOrderStatusAction(
  orderId: string,
  newStatus: Order['status'],
  trackingNumber?: string,
  trackingCourier?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { checkAdminAuth } = await import('../catalog/actions.ts')
    // 1. Validate admin session exists
    await checkAdminAuth()

    // 2. Validate permission depending on requested state
    if (newStatus === 'cancelled') {
      await checkAdminAuth('cancel_orders')
    } else if (newStatus === 'refunded') {
      await checkAdminAuth('refund_orders')
    } else {
      await checkAdminAuth('manage_order_status')
    }

    const supabase = createAdminClient()
    
    // 3. Load order status and payment status from database
    const { data: currentOrder } = await supabase
      .from('orders')
      .select('status, payment_status')
      .eq('id', orderId)
      .single()

    if (!currentOrder) {
      return { success: false, error: 'Order not found' }
    }

    // 4. Validate requested status is a known status
    const { isTransitionAllowed, VALID_TRANSITIONS } = await import('../../lib/orders/orderWorkflow.ts')
    if (!Object.keys(VALID_TRANSITIONS).includes(newStatus)) {
      return { success: false, error: 'This status change is not allowed' }
    }

    // 5. Validate workflow transition rules and payment requirements
    const allowed = isTransitionAllowed(
      currentOrder.status as any,
      newStatus as any,
      currentOrder.payment_status as any
    )
    if (!allowed) {
      return { success: false, error: 'This status change is not allowed' }
    }
    
    // 6. Invoke atomic update RPC
    const { data: rpcRes, error: rpcErr } = await supabase.rpc('update_order_status_atomic', {
      p_order_id: orderId,
      p_new_status: newStatus,
      p_tracking_number: trackingNumber || null,
      p_courier_name: trackingCourier || null
    })

    if (rpcErr || !rpcRes) {
      console.error('[UPDATE-ORDER-STATUS-ERROR]', rpcErr)
      return { success: false, error: 'Failed to update order status.' }
    }

    await supabase.from('activity_logs').insert({
      action: `order.status_changed.${newStatus}`,
      module: 'orders',
      details: { order_id: orderId, status: newStatus, trackingNumber },
    })

    try {
      const { revalidatePath } = await import('next/cache')
      revalidatePath('/admin/orders')
      revalidatePath('/admin')
      revalidatePath('/admin/inventory')
      revalidatePath('/shop')
      revalidatePath('/orders')

      // Fetch order items to revalidate specific product pages
      const { data: orderItems } = await supabase
        .from('order_items')
        .select('product_id')
        .eq('order_id', orderId)
      
      if (orderItems) {
        for (const item of orderItems) {
          if (item.product_id) {
            revalidatePath(`/product/${item.product_id}`)
            
            const { data: prod } = await supabase
              .from('products')
              .select('category:categories(slug)')
              .eq('id', item.product_id)
              .maybeSingle()
            
            const cat = (prod as any)?.category
            const slug = Array.isArray(cat) ? cat[0]?.slug : cat?.slug
            if (slug) {
              revalidatePath(`/category/${slug}`)
            }
          }
        }
      }
    } catch {
      // Bypassed under test execution
    }

    return { success: true }
  } catch (err: any) {
    console.error('[UPDATE-ORDER-STATUS-EXCEPTION]', err)
    return { success: false, error: 'Failed to update order status.' }
  }
}

export async function getAdminOrderByIdAction(idOrNumber: string): Promise<Order | null> {
  try {
    const { checkAdminAuth } = await import('../catalog/actions.ts')
    await checkAdminAuth('view_orders')
    const { getOrderById } = await import('../../services/store.ts')
    return await getOrderById(idOrNumber)
  } catch {
    return null
  }
}

export async function getCustomerOrderByIdAction(idOrNumber: string): Promise<{
  success: boolean;
  data?: {
    order_number: string;
    total_amount: number;
    status: string;
    courier_name: string | null;
    tracking_number: string | null;
    items: Array<{
      id: string;
      product_name: string;
      selling_price: number;
      image_url: string | null;
    }>;
  };
  error?: string;
}> {
  try {
    const { resolveApplicationSession } = await import('../../lib/auth/resolveApplicationSession.ts')
    const session = await resolveApplicationSession()
    if (session.type !== 'customer') {
      return { success: false, error: 'Order not found' }
    }
    const customerId = session.customerId

    const { createAdminClient } = await import('../../lib/supabase/server.ts')
    const supabase = createAdminClient()

    const { getCustomerOrderById } = await import('../../lib/orders/customerOrderService.ts')
    return await getCustomerOrderById(supabase, customerId, idOrNumber)
  } catch {
    return { success: false, error: 'Order not found' }
  }
}
