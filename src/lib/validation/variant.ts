export interface VariantInput {
  product_id: string
  sku: string
  size: string
  color_name: string
  color_code: string
  price_override?: number | null
  stock_quantity: number
}

const ALLOWED_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL']
const HEX_COLOR_REGEX = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/

export function validateVariant(data: Partial<VariantInput>): { error?: string; data?: VariantInput } {
  if (!data.product_id || data.product_id.trim() === '') {
    return { error: 'Product ID is required.' }
  }

  if (!data.sku || data.sku.trim() === '') {
    return { error: 'SKU code is required.' }
  }

  // Ensure SKU is uppercase
  const sku = data.sku.trim().toUpperCase()

  if (!data.size || !ALLOWED_SIZES.includes(data.size)) {
    return { error: `Invalid size. Allowed: ${ALLOWED_SIZES.join(', ')}` }
  }

  if (!data.color_name || data.color_name.trim() === '') {
    return { error: 'Color name is required.' }
  }

  if (!data.color_code || !HEX_COLOR_REGEX.test(data.color_code)) {
    return { error: 'Invalid HEX color code (must start with # followed by 3 or 6 hex digits).' }
  }

  const stock_quantity = Number(data.stock_quantity)
  if (data.stock_quantity === undefined || isNaN(stock_quantity) || stock_quantity < 0) {
    return { error: 'Inventory quantity must be a non-negative number.' }
  }

  const price_override = data.price_override !== undefined && data.price_override !== null ? Number(data.price_override) : null
  if (price_override !== null && (isNaN(price_override) || price_override < 0)) {
    return { error: 'Price override must be a non-negative number.' }
  }

  return {
    data: {
      product_id: data.product_id,
      sku,
      size: data.size,
      color_name: data.color_name.trim(),
      color_code: data.color_code.trim(),
      price_override,
      stock_quantity
    }
  }
}
