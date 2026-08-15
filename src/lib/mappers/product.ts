import { AdminProduct, ProductImageState, AdminProductVariant, DbVariant } from '@/types/database'

export interface DbProductImage {
  id: string
  product_id: string
  image_url: string
  storage_path: string | null
  display_order: number
  is_primary: boolean
  alt_text: string | null
  created_at: string
  updated_at: string
}

export interface DbProduct {
  id: string
  name: string | null
  slug: string | null
  sku: string | null
  selling_price: number | null
  mrp: number | null
  category_id: string | null
  collection_id: string | null
  fabric: string | null
  occasion: string | null
  care_instructions: string | null
  description: string | null
  details: string[] | null
  short_description?: string | null
  material?: string | null
  fit?: string | null
  sleeve_type?: string | null
  neck_type?: string | null
  pattern?: string | null
  color_name?: string | null
  featured: boolean | null
  trending: boolean | null
  is_active: boolean | null
  show_storefront_stock_message?: boolean | null
  storefront_stock_message_quantity?: number | null
  status?: string | null
  is_returnable?: boolean | null
  average_rating: number | null
  total_reviews: number | null
  best_seller: boolean | null
  new_arrival: boolean | null
  delivery_available?: boolean | null
  show_delivery_estimate?: boolean | null
  showroom_collection_only?: boolean | null
  pickup_available?: boolean | null
  free_delivery?: boolean | null
  delivery_min_days?: number | null
  delivery_max_days?: number | null
  delivery_message?: string | null
  cod_available?: boolean | null
  express_delivery_available?: boolean | null
  return_window_days?: number | null
  return_policy_message?: string | null
  exchange_allowed?: boolean | null
  show_color_option?: boolean | null
  storefront_default_color_id?: string | null
  product_family_id?: string | null
  primary_color_id?: string | null
  colorway_sort_order?: number | null
  product_family?: { name: string } | null
  product_families?: { name: string } | { name: string }[] | null
  primary_color?: { name: string; hex_code: string } | null
  created_at: string
  updated_at: string
  category?: { name: string } | null
  collection?: { name: string } | null
  product_images?: DbProductImage[] | null
  product_variants?: DbVariant[] | null
  shipping_weight_grams?: number | null
  parcel_length_cm?: number | null
  parcel_width_cm?: number | null
  parcel_height_cm?: number | null
}

export function mapDbToAdminProduct(dbProduct: DbProduct): AdminProduct {
  const dbImages = dbProduct.product_images || [];
  const images: ProductImageState[] = dbImages.map((img) => ({
    type: 'existing' as const,
    id: img.id,
    product_id: img.product_id,
    image_url: img.image_url,
    storage_path: img.storage_path,
    display_order: img.display_order,
    is_primary: img.is_primary,
    alt_text: img.alt_text
  }));

  const dbVarList = dbProduct.product_variants || []
  const canonicalMap = new Map<string, AdminProductVariant>()

  for (const v of dbVarList) {
    const inv = Array.isArray(v.inventory) ? v.inventory[0] : v.inventory
    const qty = Number(inv?.quantity) || 0
    const reserved = Number(inv?.reserved_quantity ?? inv?.reserved_stock) || 0
    const available = Math.max(qty - reserved, 0)
    
    const sizeObj = Array.isArray(v.sizes) ? v.sizes[0] : v.sizes
    const sizeName = sizeObj?.name || v.size || 'M'
    
    const colorId = v.color_id || dbProduct.primary_color_id || null
    const canonicalKey = `${sizeName}:${colorId || 'default'}`

    if (!canonicalMap.has(canonicalKey)) {
      canonicalMap.set(canonicalKey, {
        id: v.id,
        product_id: v.product_id,
        size: sizeName,
        size_id: v.size_id || sizeObj?.id || null,
        color_id: colorId,
        color_name: v.color_name || dbProduct.color_name || null,
        color_code: v.color_code || null,
        sku: v.sku || '',
        stock_quantity: qty,
        reserved_quantity: reserved,
        available_quantity: available,
        is_active: v.is_active !== false,
        is_default: !!v.is_default,
        inventory_id: inv?.id || null,
        shipping_weight_grams: v.shipping_weight_grams || null
      })
    }
  }

  const variants: AdminProductVariant[] = Array.from(canonicalMap.values())

  const activeVariants = variants.filter(v => v.is_active !== false)
  const totalAvailableStock = activeVariants.reduce((sum, v) => sum + (v.available_quantity ?? 0), 0)

  return {
    id: dbProduct.id,
    title: dbProduct.name || '',
    slug: dbProduct.slug || '',
    sku: dbProduct.sku || '',
    sellingPrice: dbProduct.selling_price ? Number(dbProduct.selling_price) : 0,
    mrp: dbProduct.mrp ? Number(dbProduct.mrp) : 0,
    category_id: dbProduct.category_id || null,
    categoryName: dbProduct.category?.name || '',
    collection_id: dbProduct.collection_id || null,
    fabric: dbProduct.fabric || null,
    occasion: dbProduct.occasion || null,
    care_instructions: dbProduct.care_instructions || null,
    description: dbProduct.description || '',
    details: dbProduct.details || [],
    short_description: dbProduct.short_description || null,
    material: dbProduct.material || null,
    fit: dbProduct.fit || null,
    sleeve_type: dbProduct.sleeve_type || null,
    neck_type: dbProduct.neck_type || null,
    pattern: dbProduct.pattern || null,
    color_name: dbProduct.color_name || null,
    images,
    rating: dbProduct.average_rating ? Number(dbProduct.average_rating) : 0,
    reviews_count: dbProduct.total_reviews ? Number(dbProduct.total_reviews) : 0,
    is_bestseller: dbProduct.best_seller || false,
    is_new_arrival: dbProduct.new_arrival || false,
    featured: dbProduct.featured || false,
    trending: dbProduct.trending || false,
    is_active: dbProduct.is_active || false,
    status: dbProduct.status || null,
    is_returnable: dbProduct.is_returnable !== undefined ? !!dbProduct.is_returnable : true,
    delivery_available: dbProduct.delivery_available !== undefined ? !!dbProduct.delivery_available : true,
    show_delivery_estimate: dbProduct.show_delivery_estimate !== undefined ? !!dbProduct.show_delivery_estimate : false,
    showroom_collection_only: dbProduct.showroom_collection_only !== undefined ? !!dbProduct.showroom_collection_only : false,
    pickup_available: dbProduct.pickup_available !== undefined ? !!dbProduct.pickup_available : false,
    free_delivery: !!dbProduct.free_delivery,
    delivery_min_days: dbProduct.delivery_min_days !== undefined ? dbProduct.delivery_min_days : null,
    delivery_max_days: dbProduct.delivery_max_days !== undefined ? dbProduct.delivery_max_days : null,
    delivery_message: dbProduct.delivery_message || null,
    cod_available: !!dbProduct.cod_available,
    express_delivery_available: !!dbProduct.express_delivery_available,
    return_window_days: dbProduct.return_window_days !== undefined ? dbProduct.return_window_days : null,
    return_policy_message: dbProduct.return_policy_message || null,
    exchange_allowed: !!dbProduct.exchange_allowed,
    show_color_option: dbProduct.show_color_option !== undefined ? !!dbProduct.show_color_option : false,
    storefront_default_color_id: dbProduct.storefront_default_color_id || null,
    product_family_id: dbProduct.product_family_id || null,
    primary_color_id: dbProduct.primary_color_id || null,
    colorway_sort_order: dbProduct.colorway_sort_order !== undefined ? Number(dbProduct.colorway_sort_order) : 0,
    family_name: (Array.isArray(dbProduct.product_families) ? dbProduct.product_families[0] : dbProduct.product_families)?.name || null,
    stock_quantity: totalAvailableStock,
    variants,
    show_storefront_stock_message: !!dbProduct.show_storefront_stock_message,
    storefront_stock_message_quantity: dbProduct.storefront_stock_message_quantity !== undefined ? Number(dbProduct.storefront_stock_message_quantity) : 1,
    shipping_weight_grams: dbProduct.shipping_weight_grams || null,
    parcel_length_cm: dbProduct.parcel_length_cm || null,
    parcel_width_cm: dbProduct.parcel_width_cm || null,
    parcel_height_cm: dbProduct.parcel_height_cm || null,
    created_at: dbProduct.created_at,
    updated_at: dbProduct.updated_at
  }
}

export function getProductCoverImage(product: any): string {
  if (!product) return '/images/product-placeholder.webp'
  
  // Try to find in images array (can be array of strings or objects)
  const imgs = product.images || product.product_images || []
  if (Array.isArray(imgs) && imgs.length > 0) {
    // 1. image where is_primary = true or isPrimary = true
    const primaryImg = imgs.find(img => img && typeof img === 'object' && (img.is_primary === true || img.isPrimary === true))
    if (primaryImg) {
      if (typeof primaryImg.image_url === 'string' && primaryImg.image_url.trim()) return primaryImg.image_url
      if (typeof primaryImg.url === 'string' && primaryImg.url.trim()) return primaryImg.url
    }
    
    // 2. first image by sort_order or display_order
    const sorted = [...imgs].sort((a, b) => {
      const orderA = a && typeof a === 'object' ? (a.display_order ?? a.sort_order ?? 999) : 999
      const orderB = b && typeof b === 'object' ? (b.display_order ?? b.sort_order ?? 999) : 999
      return orderA - orderB
    })
    const firstSorted = sorted[0]
    if (firstSorted) {
      if (typeof firstSorted === 'string' && firstSorted.trim()) return firstSorted
      if (firstSorted && typeof firstSorted === 'object') {
        if (typeof firstSorted.image_url === 'string' && firstSorted.image_url.trim()) return firstSorted.image_url
        if (typeof firstSorted.url === 'string' && firstSorted.url.trim()) return firstSorted.url
      }
    }
    
    // 3. first valid image URL
    for (const img of imgs) {
      if (typeof img === 'string' && img.trim()) return img
      if (img && typeof img === 'object') {
        if (typeof img.image_url === 'string' && img.image_url.trim()) return img.image_url
        if (typeof img.url === 'string' && img.url.trim()) return img.url
      }
    }
  }

  return '/images/product-placeholder.webp'
}
