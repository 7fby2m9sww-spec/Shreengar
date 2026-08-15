'use server'

import { revalidatePath } from 'next/cache'
import { resolveApplicationSession } from '@/lib/auth/resolveApplicationSession'
import { validateAddToCart, validateUpdateQuantity } from '@/lib/validation/cart'
import {
  addCartItem,
  updateCartItemQuantity,
  removeCartItem as removeCartItemService,
  clearUserCart,
  mergeGuestCart as mergeGuestCartService,
  getCartItems,
  validateCoupon,
} from '@/services/store'
import { LocalCartItem, Coupon } from '@/types/database'

async function getAuthUserId(): Promise<{ userId: string | null; isAdmin: boolean }> {
  try {
    const session = await resolveApplicationSession();
    if (session.type === 'customer') {
      return { userId: session.customerId, isAdmin: false };
    }
    if (session.type === 'admin') {
      return { userId: null, isAdmin: true };
    }
    return { userId: null, isAdmin: false };
  } catch {
    return { userId: null, isAdmin: false };
  }
}

function revalidateCartPaths() {
  revalidatePath('/cart')
  revalidatePath('/checkout')
  revalidatePath('/', 'layout') // revalidates header cart count
}

/**
 * Add item to authenticated user cart.
 * Price always fetched from DB — never trusted from client.
 */
export async function addToCartAction(productId: string, variantId: string, quantity: number) {
  try {
    const { userId, isAdmin } = await getAuthUserId()
    if (isAdmin) {
      return {
        error: 'Please switch to a customer account to place an order.',
        code: 'CUSTOMER_SESSION_REQUIRED'
      }
    }
    if (!userId) {
      return { error: 'Please log in to add items to your cart.' }
    }

    const validation = validateAddToCart({ productId, variantId, quantity })
    if (validation.error || !validation.data) {
      return { error: validation.error || 'Invalid input.' }
    }

    const res = await addCartItem(userId, validation.data.productId, validation.data.variantId, validation.data.quantity)
    if (res.success) {
      revalidateCartPaths()
      return { success: true, cartItemId: res.cartItemId }
    }
    return { error: res.error || 'Failed to add item.' }
  } catch (err: any) {
    return { error: err.message || 'Unexpected error.' }
  }
}

/**
 * Update quantity of a cart item.
 * Validates inventory before updating.
 */
export async function updateCartQuantityAction(cartItemId: string, quantity: number) {
  try {
    const { userId, isAdmin } = await getAuthUserId()
    if (isAdmin) {
      return {
        error: 'Please switch to a customer account to place an order.',
        code: 'CUSTOMER_SESSION_REQUIRED'
      }
    }
    if (!userId) return { error: 'Authentication required.' }

    const validation = validateUpdateQuantity({ cartItemId, quantity })
    if (validation.error || !validation.data) {
      return { error: validation.error || 'Invalid input.' }
    }

    const res = await updateCartItemQuantity(userId, cartItemId, quantity)
    if (res.success) {
      revalidateCartPaths()
      return { success: true }
    }
    return { error: res.error || 'Failed to update quantity.' }
  } catch (err: any) {
    return { error: err.message || 'Unexpected error.' }
  }
}

/**
 * Remove a single item from cart.
 */
export async function removeCartItemAction(cartItemId: string) {
  try {
    const { userId, isAdmin } = await getAuthUserId()
    if (isAdmin) {
      return {
        error: 'Please switch to a customer account to place an order.',
        code: 'CUSTOMER_SESSION_REQUIRED'
      }
    }
    if (!userId) return { error: 'Authentication required.' }
    if (!cartItemId) return { error: 'Cart item ID required.' }

    const res = await removeCartItemService(userId, cartItemId)
    if (res.success) {
      revalidateCartPaths()
      return { success: true }
    }
    return { error: res.error || 'Failed to remove item.' }
  } catch (err: any) {
    return { error: err.message || 'Unexpected error.' }
  }
}

/**
 * Clear entire cart.
 */
export async function clearCartAction() {
  try {
    const { userId, isAdmin } = await getAuthUserId()
    if (isAdmin) {
      return {
        error: 'Please switch to a customer account to place an order.',
        code: 'CUSTOMER_SESSION_REQUIRED'
      }
    }
    if (!userId) return { error: 'Authentication required.' }

    const res = await clearUserCart(userId)
    if (res.success) {
      revalidateCartPaths()
      return { success: true }
    }
    return { error: res.error || 'Failed to clear cart.' }
  } catch (err: any) {
    return { error: err.message || 'Unexpected error.' }
  }
}

/**
 * Merge guest LocalStorage cart into DB cart on login.
 * Called from CartContext after auth state change.
 */
export async function mergeGuestCartAction(localItems: LocalCartItem[]) {
  try {
    const { userId, isAdmin } = await getAuthUserId()
    if (isAdmin) return { success: true, mergedCount: 0 }
    if (!userId) return { error: 'Authentication required.' }
    if (!localItems || localItems.length === 0) return { success: true, mergedCount: 0 }

    const guestItems = localItems.map(item => ({
      variantId: item.variantId,
      quantity: item.quantity,
    }))

    const res = await mergeGuestCartService(userId, guestItems)
    if (res.success) {
      revalidateCartPaths()
      return { success: true, mergedCount: res.mergedCount }
    }
    return { error: 'Failed to merge cart.' }
  } catch (err: any) {
    return { error: err.message || 'Unexpected error.' }
  }
}

/**
 * Fetch the current authenticated user's cart items (server-side).
 */
export async function getCartAction() {
  try {
    const { userId, isAdmin } = await getAuthUserId()
    if (isAdmin || !userId) return { success: true, items: [] }
    const items = await getCartItems(userId)
    return { success: true, items }
  } catch (err: any) {
    return { error: err.message }
  }
}

export async function validateCouponAction(code: string, subtotal: number): Promise<{ valid: boolean; coupon?: Coupon; message?: string }> {
  try {
    const { userId } = await getAuthUserId()
    if (!userId) return { valid: false, message: 'Authentication required.' }
    return await validateCoupon(code, subtotal)
  } catch (err: any) {
    return { valid: false, message: err.message }
  }
}
