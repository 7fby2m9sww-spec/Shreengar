import { Order, Coupon, Review, ShippingAddress, Product, UserProfile } from '@/types/database'

import { createAdminClient } from '@/lib/supabase/server'

export async function getReviewsForProduct(productId: string): Promise<Review[]> {
  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('reviews')
      .select('*')
      .eq('product_id', productId)
      .eq('status', 'approved')
      .order('created_at', { ascending: false })

    if (!error && data) return data as Review[]
  } catch {}

  return []
}

export async function submitProductReview(reviewData: {
  product_id: string
  rating: number
  title: string
  comment: string
}): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createAdminClient()
    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user) return { success: false, error: 'Please login to write a customer review.' }

    const { error } = await supabase.from('reviews').insert({
      product_id: reviewData.product_id,
      user_id: userData.user.id,
      user_name: userData.user.user_metadata?.full_name || userData.user.email || 'Customer',
      rating: reviewData.rating,
      title: reviewData.title,
      comment: reviewData.comment,
      status: 'pending',
    })

    if (!error) return { success: true }
    return { success: false, error: error.message }
  } catch {
    return { success: false, error: 'Failed to submit review.' }
  }
}

export async function validateCoupon(code: string, subtotal: number): Promise<{ valid: boolean; coupon?: Coupon; message?: string }> {
  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase.from('coupons').select('*').eq('code', code.toUpperCase()).maybeSingle()
    if (!error && data) {
      const c = data as Coupon
      if (!c.is_active) return { valid: false, message: 'This coupon code is inactive.' }
      if (subtotal < c.min_spend) return { valid: false, message: `Minimum order amount of ₹${c.min_spend} required.` }
      return { valid: true, coupon: c }
    }
  } catch {}

  return { valid: false, message: 'Invalid or expired promo code.' }
}

export async function getOrdersForUser(userId: string): Promise<Order[]> {
  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('orders')
      .select('*, items:order_items(*)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (!error && data) {
      return data as Order[]
    }
  } catch {}

  return []
}

export async function getWishlistForUser(userId: string): Promise<Product[]> {
  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('wishlist')
      .select('*, product:products(*)')
      .eq('user_id', userId)

    if (!error && data) {
      // Map the product columns correctly (name -> title, selling_price -> price, mrp -> compare_at_price)
      return data
        .map((item: any) => {
          if (!item.product) return null;
          const p = item.product;
          return {
            id: p.id,
            title: p.name || '',
            slug: p.slug,
            sku: p.sku || '',
            price: Number(p.selling_price || 0),
            compare_at_price: p.mrp ? Number(p.mrp) : null,
            category_id: p.category_id,
            collection_id: p.collection_id,
            fabric: p.fabric || null,
            occasion: p.occasion || null,
            care_instructions: p.care_instructions || null,
            description: p.description || '',
            details: p.details || [],
            images: p.images || [],
            is_featured: p.featured || false,
            is_trending: p.trending || false,
            is_bestseller: p.best_seller || false,
            is_new_arrival: p.new_arrival || false,
            is_active: p.is_active || false,
            rating: Number(p.average_rating || 5.0),
            reviews_count: p.total_reviews || 0,
            meta_title: p.seo_title || null,
            meta_description: p.seo_description || null,
            created_at: p.created_at,
            updated_at: p.updated_at
          } as Product;
        })
        .filter(Boolean) as Product[]
    }
  } catch {}

  return []
}

export async function getCartForUser(userId: string) {
  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('cart')
      .select('*, variant:product_variants(*, product:products(*))')
      .eq('user_id', userId)

    if (!error && data) return data
  } catch {}

  return []
}

export async function getOrderById(idOrNumber: string): Promise<Order | null> {
  try {
    const supabase = createAdminClient()
    const { data: order, error } = await supabase
      .from('orders')
      .select('*, items:order_items(*), payments(*)')
      .or(`id.eq.${idOrNumber},order_number.eq.${idOrNumber}`)
      .maybeSingle()

    if (!error && order) {
      return order as Order
    }
  } catch {}

  return null
}

export async function updateOrderStatus(
  orderId: string,
  newStatus: Order['status'],
  trackingNumber?: string,
  trackingCourier?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createAdminClient()
    const updateData: Partial<Order> = {
      status: newStatus,
      updated_at: new Date().toISOString(),
    }
    if (trackingNumber) updateData.tracking_number = trackingNumber
    if (trackingCourier) updateData.courier_name = trackingCourier

    const { error } = await supabase.from('orders').update(updateData).eq('id', orderId)

    if (!error) {
      await supabase.from('activity_logs').insert({
        action: `order.status_changed.${newStatus}`,
        module: 'orders',
        details: { order_id: orderId, status: newStatus, trackingNumber },
      })
      return { success: true }
    }
  } catch {}

  return { success: false, error: 'Failed to update order status' }
}

// Addresses Live CRUD Services (Target Table: addresses)
export async function getShippingAddresses(userId: string): Promise<ShippingAddress[]> {
  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('addresses')
      .select('*')
      .eq('user_id', userId)
      .order('is_default', { ascending: false })

    if (!error && data) return data as ShippingAddress[]
  } catch {}

  return []
}

export async function saveShippingAddress(addressData: Partial<ShippingAddress>): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createAdminClient()
    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user) return { success: false, error: 'Unauthorized user.' }

    const cleanPayload = {
      user_id: userData.user.id,
      full_name: addressData.full_name || '',
      phone: addressData.phone || '',
      address_line1: addressData.address_line1 || '',
      address_line2: addressData.address_line2 || null,
      city: addressData.city || '',
      state: addressData.state || '',
      postal_code: addressData.postal_code || '',
      country: addressData.country || 'India',
      is_default: addressData.is_default || false,
    }

    if (addressData.id) {
      const { error } = await supabase
        .from('addresses')
        .update(cleanPayload)
        .eq('id', addressData.id)
        .eq('user_id', userData.user.id)

      if (error) return { success: false, error: error.message }
    } else {
      const { error } = await supabase
        .from('addresses')
        .insert(cleanPayload)

      if (error) return { success: false, error: error.message }
    }

    return { success: true }
  } catch {
    return { success: false, error: 'Failed to save address.' }
  }
}

export async function deleteShippingAddress(addressId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createAdminClient()
    const { error } = await supabase.from('addresses').delete().eq('id', addressId)
    if (!error) return { success: true }
    return { success: false, error: error.message }
  } catch {
    return { success: false, error: 'Failed to delete address.' }
  }
}

export async function setDefaultShippingAddress(addressId: string, userId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createAdminClient()
    await supabase.from('addresses').update({ is_default: false }).eq('user_id', userId)
    const { error } = await supabase.from('addresses').update({ is_default: true }).eq('id', addressId)
    if (!error) return { success: true }
    return { success: false, error: error.message }
  } catch {
    return { success: false, error: 'Failed to set default address.' }
  }
}

// User Profile Live Services (Target Table: profiles)
export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle()
    if (!error && data) return data as UserProfile
  } catch {}

  return null
}

export async function updateUserProfile(
  userId: string,
  profileData: { full_name?: string; phone?: string; gender?: string; avatar_url?: string }
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createAdminClient()

    // 1. Synchronize user metadata in Supabase Auth
    if (profileData.full_name) {
      await supabase.auth.updateUser({
        data: { full_name: profileData.full_name },
      })
    }

    // 2. Fetch authenticated user email to ensure email NOT NULL constraint is satisfied
    const { data: userData } = await supabase.auth.getUser()
    const userEmail = userData.user?.email || ''

    // 3. Upsert profile record with email and phone payload
    const { error: profileError } = await supabase.from('profiles').upsert({
      id: userId,
      email: userEmail,
      ...profileData,
      updated_at: new Date().toISOString(),
    })

    if (profileError) return { success: false, error: profileError.message }

    return { success: true }
  } catch {
    return { success: false, error: 'Failed to update profile details.' }
  }
}

// ============================================================
// ENTERPRISE CART SERVICES (Sprint 3.1)
// ============================================================

export interface CartServiceResult {
  success: boolean
  error?: string
}

/**
 * Fetch all cart items for a user with batched variant + product + inventory join.
 * Single round-trip, no N+1.
 */
export async function getCartItems(userId: string) {
  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('cart')
      .select(`
        id,
        variant_id,
        unit_price:price,
        quantity,
        created_at,
        variant:product_variants(
          id, sku, selling_price, size:sizes(name), color:colors(name, hex_code),
          product:products(id, name, selling_price, show_color_option, color_name, images:product_images(image_url)),
          inventory:inventory(quantity, reserved_quantity, available_quantity)
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: true })

    if (!error && data) {
      // Map the database columns to expected properties
      return data.map((row: any) => {
        const v = row.variant
        if (!v) return row
        return {
          ...row,
          variant: {
            id: v.id,
            sku: v.sku,
            size: v.size?.name || 'M',
            color_name: v.color?.name || 'Default',
            color_code: v.color?.hex_code || '#000',
            price_override: v.selling_price ? Number(v.selling_price) : null,
            product: v.product ? {
              id: v.product.id,
              title: v.product.name || '',
              price: Number(v.product.selling_price || 0),
              show_color_option: v.product.show_color_option !== undefined ? !!v.product.show_color_option : false,
              color_name: v.product.color_name || null,
              images: Array.isArray(v.product.images)
                ? v.product.images.map((img: any) => img.image_url || img)
                : []
            } : null,
            inventory: v.inventory
          }
        }
      })
    }
  } catch (err) {
    console.error('Error in getCartItems:', err)
  }
  return []
}

/**
 * Add item to cart (authenticated). Always fetches price from DB.
 * Validates inventory before insert.
 */
export async function addCartItem(
  userId: string,
  productId: string,
  variantId: string,
  requestedQty: number
): Promise<CartServiceResult & { cartItemId?: string }> {
  try {
    const supabase = createAdminClient()

    // 1. Fetch variant, product and inventory in a single query
    const { data: variant, error: varErr } = await supabase
      .from('product_variants')
      .select(`
        id,
        sku,
        selling_price,
        is_active,
        product_id,
        size_id,
        color_id,
        product:products(id, status, is_active, selling_price),
        inventory:inventory(quantity, reserved_quantity, available_quantity)
      `)
      .eq('id', variantId)
      .maybeSingle()

    if (varErr || !variant) {
      const errorMsg = 'This variant is no longer available.'
      console.error("Add to cart failed", {
        productId,
        variantId,
        sizeId: null,
        colorId: null,
        requestedQuantity: requestedQty,
        customerId: userId,
        cartId: null,
        message: errorMsg,
        code: varErr?.code || 'VARIANT_NOT_FOUND',
        details: varErr?.message || 'Variant not found in database',
        hint: 'Verify the variant ID is valid.',
      })
      return { success: false, error: errorMsg }
    }

    // 2. Verify variant belongs to the supplied product
    if (variant.product_id !== productId) {
      const errorMsg = 'Invalid product variant.'
      console.error("Add to cart failed", {
        productId,
        variantId,
        sizeId: variant.size_id || null,
        colorId: variant.color_id || null,
        requestedQuantity: requestedQty,
        customerId: userId,
        cartId: null,
        message: errorMsg,
        code: 'INVALID_PRODUCT_VARIANT',
        details: `Variant product_id (${variant.product_id}) does not match supplied productId (${productId})`,
        hint: 'Verify the variant belongs to the supplied product.',
      })
      return { success: false, error: errorMsg }
    }

    // 3. Verify product exists
    const prod = variant.product as any
    if (!prod) {
      const errorMsg = 'Product not found.'
      console.error("Add to cart failed", {
        productId,
        variantId,
        sizeId: variant.size_id || null,
        colorId: variant.color_id || null,
        requestedQuantity: requestedQty,
        customerId: userId,
        cartId: null,
        message: errorMsg,
        code: 'PRODUCT_NOT_FOUND',
        details: 'Product relation is missing on the variant',
        hint: 'Verify the product exists in the database.',
      })
      return { success: false, error: errorMsg }
    }

    // 4. Verify product is published (status should be 'active' in DB)
    if (prod.status !== 'active' || prod.is_active === false) {
      const errorMsg = 'This product is not currently available.'
      console.error("Add to cart failed", {
        productId,
        variantId,
        sizeId: variant.size_id || null,
        colorId: variant.color_id || null,
        requestedQuantity: requestedQty,
        customerId: userId,
        cartId: null,
        message: errorMsg,
        code: 'PRODUCT_NOT_AVAILABLE',
        details: `Product status is '${prod.status}' (expected 'active') and is_active is ${prod.is_active}`,
        hint: 'Verify the product is active and its status is active in the database.',
      })
      return { success: false, error: errorMsg }
    }

    // 5. Verify variant is active
    if (variant.is_active === false) {
      const errorMsg = 'This variant is currently inactive.'
      console.error("Add to cart failed", {
        productId,
        variantId,
        sizeId: variant.size_id || null,
        colorId: variant.color_id || null,
        requestedQuantity: requestedQty,
        customerId: userId,
        cartId: null,
        message: errorMsg,
        code: 'VARIANT_INACTIVE',
        details: 'Variant is_active flag is set to false',
        hint: 'Verify the variant is active in the admin panel.',
      })
      return { success: false, error: errorMsg }
    }

    // 6. Load exact inventory row and calculate available quantity
    const inv = variant.inventory as any
    const availableQuantity = inv 
      ? (inv.available_quantity ?? Math.max(inv.quantity - inv.reserved_quantity, 0))
      : 0

    if (availableQuantity <= 0) {
      const errorMsg = 'This variant is currently out of stock.'
      console.error("Add to cart failed", {
        productId,
        variantId,
        sizeId: variant.size_id || null,
        colorId: variant.color_id || null,
        requestedQuantity: requestedQty,
        customerId: userId,
        cartId: null,
        message: errorMsg,
        code: 'OUT_OF_STOCK',
        details: `Available quantity is ${availableQuantity} (inventory row: quantity=${inv?.quantity}, reserved=${inv?.reserved_quantity})`,
        hint: 'Restock the variant in the admin panel.',
      })
      return { success: false, error: errorMsg }
    }

    // 7. Check for existing row (same user + variant)
    const { data: existing } = await supabase
      .from('cart')
      .select('id, quantity')
      .eq('user_id', userId)
      .eq('variant_id', variantId)
      .maybeSingle()

    const newQty = (existing?.quantity ?? 0) + requestedQty

    // 8. Validate requested quantity
    if (newQty > availableQuantity) {
      const errorMsg = `Only ${availableQuantity} items are available in this size.`
      console.error("Add to cart failed", {
        productId,
        variantId,
        sizeId: variant.size_id || null,
        colorId: variant.color_id || null,
        requestedQuantity: requestedQty,
        customerId: userId,
        cartId: existing?.id || null,
        message: errorMsg,
        code: 'INSUFFICIENT_STOCK',
        details: `Requested new quantity (${newQty}) exceeds available quantity (${availableQuantity})`,
        hint: 'Lower the requested quantity or update inventory.',
      })
      return {
        success: false,
        error: errorMsg,
      }
    }

    const unitPrice: number =
      (variant.selling_price as number | null) ?? prod?.selling_price ?? 0

    if (existing) {
      // Update existing row
      const { error: upErr } = await supabase
        .from('cart')
        .update({ quantity: newQty, price: unitPrice })
        .eq('id', existing.id)
      if (upErr) {
        console.error("Add to cart failed", {
          productId,
          variantId,
          sizeId: variant.size_id || null,
          colorId: variant.color_id || null,
          requestedQuantity: requestedQty,
          customerId: userId,
          cartId: existing.id,
          message: upErr.message,
          code: upErr.code,
          details: upErr.details,
          hint: upErr.hint,
        })
        return { success: false, error: 'Your cart could not be updated. Please try again.' }
      }
      return { success: true, cartItemId: existing.id }
    } else {
      // Insert new row
      const { data: newRow, error: insertErr } = await supabase
        .from('cart')
        .insert({ user_id: userId, variant_id: variantId, quantity: requestedQty, price: unitPrice })
        .select('id')
        .single()
      if (insertErr) {
        console.error("Add to cart failed", {
          productId,
          variantId,
          sizeId: variant.size_id || null,
          colorId: variant.color_id || null,
          requestedQuantity: requestedQty,
          customerId: userId,
          cartId: null,
          message: insertErr.message,
          code: insertErr.code,
          details: insertErr.details,
          hint: insertErr.hint,
        })
        return { success: false, error: 'Your cart could not be updated. Please try again.' }
      }
      return { success: true, cartItemId: newRow.id }
    }
  } catch (err: any) {
    console.error('Error in addCartItem service:', err)
    console.error("Add to cart failed", {
      productId,
      variantId,
      sizeId: null,
      colorId: null,
      requestedQuantity: requestedQty,
      customerId: userId,
      cartId: null,
      message: err.message || 'Unexpected error.',
      code: err.code || 'UNEXPECTED_ERROR',
      details: err.stack || err.details || null,
      hint: 'Check server logs for database connectivity or script errors.',
    })
    return { success: false, error: 'Your cart could not be updated. Please try again.' }
  }
}

/**
 * Update cart item quantity. Validates inventory and ownership.
 */
export async function updateCartItemQuantity(
  userId: string,
  cartItemId: string,
  newQty: number
): Promise<CartServiceResult> {
  try {
    const supabase = createAdminClient()

    // Verify ownership + fetch variant inventory in one query
    const { data: cartRow, error } = await supabase
      .from('cart')
      .select('id, variant_id, variant:product_variants(is_active, inventory:inventory(quantity, reserved_quantity, available_quantity))')
      .eq('id', cartItemId)
      .eq('user_id', userId)
      .maybeSingle()

    if (error || !cartRow || (cartRow.variant as any)?.is_active === false) {
      return { success: false, error: 'Cart item not found or variant is inactive.' }
    }

    const inv = (cartRow.variant as any)?.inventory
    const stockQty = inv 
      ? (inv.available_quantity ?? Math.max(0, (inv.quantity ?? 0) - (inv.reserved_quantity ?? 0)))
      : 0

    if (newQty > stockQty) {
      return { success: false, error: `Only ${stockQty} items are available in this size.` }
    }

    await supabase.from('cart').update({ quantity: newQty }).eq('id', cartItemId).eq('user_id', userId)
    return { success: true }
  } catch {
    return { success: false, error: 'Failed to update quantity.' }
  }
}

/**
 * Remove a single cart item. Validates ownership.
 */
export async function removeCartItem(userId: string, cartItemId: string): Promise<CartServiceResult> {
  try {
    const supabase = createAdminClient()
    const { error } = await supabase
      .from('cart')
      .delete()
      .eq('id', cartItemId)
      .eq('user_id', userId)
    if (error) return { success: false, error: 'Failed to remove item.' }
    return { success: true }
  } catch {
    return { success: false, error: 'Failed to remove item.' }
  }
}

/**
 * Clear all cart items for a user.
 */
export async function clearUserCart(userId: string): Promise<CartServiceResult> {
  try {
    const supabase = createAdminClient()
    await supabase.from('cart').delete().eq('user_id', userId)
    return { success: true }
  } catch {
    return { success: false, error: 'Failed to clear cart.' }
  }
}

/**
 * Merge guest LocalStorage cart items into authenticated user cart.
 * Same variant → increase quantity (capped at stock).
 * New variant → insert.
 * Returns number of items merged.
 */
export async function mergeGuestCart(
  userId: string,
  guestItems: Array<{ variantId: string; quantity: number }>
): Promise<CartServiceResult & { mergedCount: number }> {
  let mergedCount = 0
  const supabase = createAdminClient()
  for (const item of guestItems) {
    // Fetch product_id for the variant
    const { data: variant } = await supabase
      .from('product_variants')
      .select('product_id')
      .eq('id', item.variantId)
      .maybeSingle()
    if (variant?.product_id) {
      const res = await addCartItem(userId, variant.product_id, item.variantId, item.quantity)
      if (res.success) mergedCount++
    }
  }
  return { success: true, mergedCount }
}

