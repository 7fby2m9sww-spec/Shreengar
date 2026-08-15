export interface AddToCartInput {
  productId: string
  variantId: string
  quantity: number
}

export interface UpdateQuantityInput {
  cartItemId: string
  quantity: number
}

export interface RemoveItemInput {
  cartItemId: string
}

export function validateAddToCart(input: Partial<AddToCartInput>): {
  data?: AddToCartInput
  error?: string
} {
  if (!input.productId || typeof input.productId !== 'string' || input.productId.trim() === '') {
    return { error: 'Product ID is required.' }
  }
  if (!input.variantId || typeof input.variantId !== 'string' || input.variantId.trim() === '') {
    return { error: 'A valid variant must be selected.' }
  }
  const qty = Number(input.quantity)
  if (!Number.isInteger(qty) || qty < 1) {
    return { error: 'Quantity must be at least 1.' }
  }
  if (qty > 100) {
    return { error: 'Quantity cannot exceed 100.' }
  }
  return { data: { productId: input.productId.trim(), variantId: input.variantId.trim(), quantity: qty } }
}

export function validateUpdateQuantity(input: Partial<UpdateQuantityInput>): {
  data?: UpdateQuantityInput
  error?: string
} {
  if (!input.cartItemId || typeof input.cartItemId !== 'string' || input.cartItemId.trim() === '') {
    return { error: 'Cart item ID is required.' }
  }
  const qty = Number(input.quantity)
  if (!Number.isInteger(qty) || qty < 1) {
    return { error: 'Quantity must be at least 1.' }
  }
  if (qty > 100) {
    return { error: 'Quantity cannot exceed 100.' }
  }
  return { data: { cartItemId: input.cartItemId.trim(), quantity: qty } }
}
