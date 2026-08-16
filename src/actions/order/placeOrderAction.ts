'use server';

export interface PlaceOrderInput {
  addressId: string;
  paymentMethod: 'upi' | 'card' | 'cod';
  couponCode?: string;
  shippingQuoteId?: string | null;
}

/**
 * Pure internal placement logic that accepts a mock/real Supabase client and user ID.
 * Makes it 100% testable without Next.js headers/cookies request context.
 */
export async function placeOrderInternal(
  supabase: any,
  userId: string,
  input: PlaceOrderInput,
  cartItemsOverride?: any[]
): Promise<{
  success: boolean;
  error?: string;
  orderId?: string;
  orderNumber?: string;
  totalAmount?: number;
  code?: string;
}> {
  // 1. Fetch the shipping address from the database
  const { data: address, error: addrErr } = await supabase
    .from('addresses')
    .select('*')
    .eq('id', input.addressId)
    .eq('user_id', userId)
    .maybeSingle();

  if (addrErr || !address) {
    return { success: false, error: 'Invalid shipping address selected.' };
  }

  // 2. Fetch database cart items (server-side single-source of truth)
  let cartItems = cartItemsOverride;
  if (!cartItems) {
    const { getCartItems } = await import('../../services/store.ts');
    cartItems = await getCartItems(userId);
  }

  if (!cartItems || cartItems.length === 0) {
    return { success: false, error: 'Your cart is empty.' };
  }

  // 4. Validate coupon code server-side before atomic creation if provided
  let validatedCouponCode: string | null = null;
  if (input.couponCode && input.couponCode.trim()) {
    const { validateCoupon } = await import('../../services/store.ts');
    
    const { data: userProfile } = await supabase
      .from('profiles')
      .select('email')
      .eq('id', userId)
      .maybeSingle();

    const userEmail = userProfile?.email || null;

    const formattedCartItems = cartItems.map((item: any) => ({
      productId: item.variant?.product_id || item.product_id || '',
      categoryId: item.variant?.product?.category_id || item.category_id || '',
      price: item.unit_price || item.variant?.selling_price || 0,
      quantity: item.quantity || 1
    }));

    const cartSubtotal = cartItems.reduce((sum: number, item: any) => {
      const p = item.unit_price || item.variant?.selling_price || 0;
      return sum + (p * item.quantity);
    }, 0);

    const couponVal = await validateCoupon(
      input.couponCode.trim(),
      cartSubtotal,
      userId,
      userEmail,
      formattedCartItems
    );

    if (!couponVal.valid) {
      return {
        success: false,
        error: couponVal.message || 'The applied coupon is no longer valid for this order.'
      };
    }
    validatedCouponCode = input.couponCode.trim().toUpperCase();
  }

  // 5. Validate inventory for all items in the cart
  for (const item of cartItems) {
    const v = item.variant;
    if (!v) {
      return { success: false, error: 'One or more items in your cart are no longer available.' };
    }
    
    const { data: inv, error: invErr } = await supabase
      .from('inventory')
      .select('quantity')
      .eq('variant_id', v.id)
      .maybeSingle();

    if (invErr || !inv) {
      return { success: false, error: `Inventory not found for item: ${v.product?.title || 'Unknown'}` };
    }

    if (inv.quantity < item.quantity) {
      return {
        success: false,
        error: `Insufficient inventory for "${v.product?.title || 'Unknown'}". Only ${inv.quantity} left in stock.`
      };
    }
  }

  const rpcCartItems = cartItems.map(item => {
    const v = item.variant!;
    return {
      variant_id: v.id,
      quantity: item.quantity
    };
  });

  const { data: rpcRes, error: rpcErr } = await supabase.rpc('place_order_atomic', {
    p_user_id: userId,
    p_shipping_address_id: address.id,
    p_billing_address_id: address.id,
    p_coupon_code: validatedCouponCode,
    p_payment_method: input.paymentMethod,
    p_cart_items: rpcCartItems
  });

  if (rpcErr || !rpcRes || !(rpcRes as any).success) {
    console.error('Order atomic creation error:', rpcErr || rpcRes);
    return { success: false, error: rpcErr?.message || (rpcRes as any)?.error || 'Failed to place order.' };
  }

  const orderId = (rpcRes as any).order_id;
  const orderNumber = (rpcRes as any).order_number;

  // 6. Load created order financials to perform final update
  const { data: orderData } = await supabase
    .from('orders')
    .select('subtotal, discount_amount')
    .eq('id', orderId)
    .single();

  const orderSubtotal = Number(orderData?.subtotal || 0);
  const discountAmount = Number(orderData?.discount_amount || 0);

  // Calculate customer shipping fee (always 0)
  const customerShippingFee = 0;
  const finalTotalAmount = orderSubtotal - discountAmount + customerShippingFee;

  const shippingSnapshot = {
    provider: 'Shreengar',
    service: 'Free shipping',
    customer_shipping_charge: 0,
    shipping_discount: 0
  };

  // 7. Update order fields with free shipping info
  const { error: updateErr } = await supabase
    .from('orders')
    .update({
      shipping_snapshot: shippingSnapshot,
      shipping_fee: customerShippingFee,
      total_amount: finalTotalAmount
    })
    .eq('id', orderId);

  if (updateErr) {
    console.error('Error updating order shipping snapshot:', updateErr);
  }

  // 8. Clear cart
  const { error: cartClearErr } = await supabase
    .from('cart')
    .delete()
    .eq('user_id', userId);

  if (cartClearErr) {
    console.error('Cart clear error:', cartClearErr);
  }

  // 9. Record activity log
  await supabase.from('activity_logs').insert({
    action: 'checkout.order_placed',
    module: 'orders',
    details: { order_id: orderId, order_number: orderNumber }
  });

  // 9.5 Revalidate paths
  try {
    const { revalidatePath } = await import('next/cache');
    revalidatePath('/admin/inventory');
    revalidatePath('/admin/orders');
    revalidatePath('/shop');
    revalidatePath('/orders');
    for (const item of cartItems) {
      const v = item.variant;
      if (v && v.product?.id) {
        revalidatePath(`/product/${v.product.id}`);
        
        const { data: prod } = await supabase
          .from('products')
          .select('category:categories(slug)')
          .eq('id', v.product.id)
          .maybeSingle();
        
        const cat = (prod as any)?.category;
        const slug = Array.isArray(cat) ? cat[0]?.slug : cat?.slug;
        if (slug) {
          revalidatePath(`/category/${slug}`);
        }
      }
    }
  } catch (e) {
    console.error('Revalidation error:', e);
  }

  return {
    success: true,
    orderId: orderId,
    orderNumber: orderNumber,
    totalAmount: finalTotalAmount
  };
}

/**
 * Public storefront order placement server action.
 */
export async function placeOrderAction(input: PlaceOrderInput): Promise<{
  success: boolean;
  error?: string;
  orderId?: string;
  orderNumber?: string;
  totalAmount?: number;
  code?: string;
}> {
  try {
    const { resolveApplicationSession } = await import('../../lib/auth/resolveApplicationSession.ts');
    const appSession = await resolveApplicationSession();
    
    if (appSession.type === 'admin') {
      return {
        success: false,
        code: 'CUSTOMER_SESSION_REQUIRED',
        error: 'Please switch to a customer account to place an order.'
      };
    }
    
    if (appSession.type !== 'customer') {
      return { success: false, error: 'You must be logged in to place an order.' };
    }
    
    const userId = appSession.customerId;
    const { createAdminClient } = await import('../../lib/supabase/server.ts');
    const supabase = createAdminClient();
    return await placeOrderInternal(supabase, userId, input);
  } catch (err: any) {
    console.error('Place order exception:', err);
    return { success: false, error: err.message || 'An unexpected error occurred.' };
  }
}
