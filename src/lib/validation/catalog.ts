export interface ProductInput {
  title: string
  slug: string
  sku: string
  selling_price: number
  mrp: number
  category_id: string
  collection_id?: string | null
  fabric?: string | null
  occasion?: string | null
  care_instructions?: string | null
  description: string
  short_description?: string | null
  material?: string | null
  fit?: string | null
  sleeve_type?: string | null
  neck_type?: string | null
  pattern?: string | null
  color_name?: string | null
  details?: string[]
  images?: any[]
  is_featured?: boolean
  is_trending?: boolean
  is_active?: boolean
  is_returnable?: boolean
  delivery_available?: boolean
  show_delivery_estimate?: boolean
  showroom_collection_only?: boolean
  pickup_available?: boolean
  free_delivery?: boolean
  delivery_min_days?: number | null
  delivery_max_days?: number | null
  delivery_message?: string | null
  cod_available?: boolean
  express_delivery_available?: boolean
  return_window_days?: number | null
  return_policy_message?: string | null
  exchange_allowed?: boolean
  show_color_option?: boolean
  storefront_default_color_id?: string | null
  product_family_id?: string | null
  primary_color_id?: string | null
  colorway_sort_order?: number
  stock_quantity?: number
  show_storefront_stock_message?: boolean
  storefront_stock_message_quantity?: number
  status?: string
  shipping_weight_grams?: number | null
  parcel_length_cm?: number | null
  parcel_width_cm?: number | null
  parcel_height_cm?: number | null
  variants?: {
    id?: string | null
    variantId?: string | null
    inventoryId?: string | null
    sizeId?: string
    sizeName?: string
    sizeCode?: string | null
    colorId?: string | null
    colorName?: string | null
    size_id?: string | null
    color_id?: string | null
    size?: string
    color_name?: string
    color_code?: string
    sku: string
    stock_quantity?: number
    quantity?: number
    originalQuantity?: number
    reserved_quantity?: number
    reservedQuantity?: number
    available_quantity?: number
    availableQuantity?: number
    low_stock_threshold?: number
    lowStockThreshold?: number
    reorder_level?: number
    reorderLevel?: number
    stock_status?: string
    stockStatus?: string
    price_override?: number | null
    priceOverride?: number | null
    is_active?: boolean
    isActive?: boolean
    is_default?: boolean
    isNew?: boolean
    isSizeRemoved?: boolean
    isQuantityEdited?: boolean
    shipping_weight_grams?: number | null
  }[]
}

export interface CategoryInput {
  name: string
  slug: string
  description?: string | null
  image_url?: string | null
  parent_id?: string | null
  display_order?: number
  is_active?: boolean
}

export interface CollectionInput {
  name: string
  slug: string
  description?: string | null
  image_url?: string | null
  is_featured?: boolean
  status?: 'draft' | 'published' | 'archived'
  sort_order?: number
  seo_title?: string | null
  seo_description?: string | null
  published_at?: string | null
}

export function validateProduct(data: Partial<ProductInput>): { error?: string; data?: ProductInput } {
  if (!data.title || data.title.trim() === '') {
    return { error: 'Product title is required.' }
  }
  if (!data.sku || data.sku.trim() === '') {
    return { error: 'SKU code is required.' }
  }
  const normSku = data.sku.trim().toUpperCase()
  if (normSku.length < 3 || normSku.length > 50) {
    return { error: 'SKU code must be between 3 and 50 characters long.' }
  }
  if (!/^[A-Z0-9-]+$/.test(normSku)) {
    return { error: 'SKU code can only contain uppercase letters (A-Z), numbers (0-9), and hyphens (-).' }
  }
  const sellingPrice = Number(data.selling_price)
  if (isNaN(sellingPrice) || sellingPrice <= 0) {
    return { error: 'Selling price must be greater than zero.' }
  }

  const mrp = Number(data.mrp)
  if (isNaN(mrp) || mrp <= 0) {
    return { error: 'MRP must be greater than zero.' }
  }

  if (sellingPrice > mrp) {
    return { error: 'Selling price cannot be greater than MRP.' }
  }
  if (!data.description || data.description.trim() === '') {
    return { error: 'Product description is required.' }
  }

  if (!data.category_id || data.category_id.trim() === '') {
    return { error: 'Please select a category.' }
  }
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(data.category_id)) {
    return { error: 'Invalid category selection.' }
  }

  // Image validation
  if (data.images !== undefined && !Array.isArray(data.images)) {
    return { error: 'Images must be an array of image objects.' }
  }

  if (Array.isArray(data.images) && data.images.length > 0) {
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.avif', '.gif', '.bmp', '.tiff', '.heic', '.heif']
    const unsafeSchemes = ['javascript:', 'file:']

    for (const img of data.images as any[]) {
      if (!img || typeof img.image_url !== 'string' || img.image_url.trim() === '') {
        return { error: 'Invalid image payload. Image URL is missing or empty.' }
      }

      const url = img.image_url.trim()
      const lower = url.toLowerCase()

      // Reject unsafe schemes
      if (unsafeSchemes.some(p => lower.startsWith(p))) {
        return { error: 'Invalid image URL format. Unsafe URL scheme detected.' }
      }

      // Reject SVG vector images for security
      if (lower.includes('.svg') || lower.startsWith('data:image/svg+xml')) {
        return { error: 'SVG vector images are not allowed for product photos due to security guidelines. Please upload JPG, PNG, WebP, AVIF, HEIC, or GIF image files.' }
      }

      // Reject temporary/local URLs in the final product mutation payload
      if (lower.startsWith('blob:') || lower.startsWith('data:image/') || lower.includes('localhost') || lower.startsWith('file:')) {
        return { error: 'Temporary image URLs (blob, base64 data, local file, or localhost) are not allowed in the final product payload. Images must be uploaded to storage first.' }
      }

      // Validate standard HTTP / HTTPS URLs
      let parsed: URL
      try {
        parsed = new URL(url)
      } catch {
        return { error: 'Invalid image URL format. Please provide a valid HTTP or HTTPS image URL.' }
      }

      if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
        return { error: 'Image URL must use HTTP or HTTPS protocol.' }
      }

      const pathname = decodeURIComponent(parsed.pathname).toLowerCase()
      const extensionWithoutQuery = pathname.split('?')[0]
      const hasValidExt = allowedExtensions.some(ext => extensionWithoutQuery.endsWith(ext))

      // Allow Supabase storage URLs or URLs ending in supported extensions
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      let isSupabaseStorage = false
      if (supabaseUrl) {
        try {
          isSupabaseStorage = parsed.hostname === new URL(supabaseUrl).hostname
        } catch {
          isSupabaseStorage = false
        }
      }

      if (!hasValidExt && !isSupabaseStorage) {
        return { error: 'Invalid image format. Supported formats: JPG, JPEG, PNG, WebP, AVIF, GIF, BMP, TIFF, HEIC, HEIF.' }
      }
    }
  }
  const slug = data.slug || data.title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')

  let delivery_min_days = null;
  if (data.delivery_min_days !== undefined && data.delivery_min_days !== null && String(data.delivery_min_days).trim() !== '') {
    const minVal = Number(data.delivery_min_days);
    if (isNaN(minVal) || minVal <= 0 || !Number.isInteger(minVal)) {
      return { error: 'Minimum delivery days must be a positive integer.' };
    }
    delivery_min_days = minVal;
  }

  let delivery_max_days = null;
  if (data.delivery_max_days !== undefined && data.delivery_max_days !== null && String(data.delivery_max_days).trim() !== '') {
    const maxVal = Number(data.delivery_max_days);
    if (isNaN(maxVal) || maxVal <= 0 || !Number.isInteger(maxVal)) {
      return { error: 'Maximum delivery days must be a positive integer.' };
    }
    delivery_max_days = maxVal;
  }

  if (delivery_min_days !== null && delivery_max_days !== null && delivery_max_days < delivery_min_days) {
    return { error: 'Maximum delivery days cannot be less than minimum delivery days.' };
  }

  const is_returnable = data.is_returnable !== undefined ? !!data.is_returnable : false;
  let return_window_days = null;
  let exchange_allowed = false;
  let return_policy_message = null;

  if (is_returnable) {
    if (data.return_window_days !== undefined && data.return_window_days !== null && String(data.return_window_days).trim() !== '') {
      const retVal = Number(data.return_window_days);
      if (isNaN(retVal) || retVal <= 0 || !Number.isInteger(retVal)) {
        return { error: 'Return window days must be a positive integer.' };
      }
      return_window_days = retVal;
    } else {
      return { error: 'Return window days is required for returnable items.' };
    }
    exchange_allowed = !!data.exchange_allowed;
    return_policy_message = data.return_policy_message?.trim() || null;
  } else {
    return_window_days = null;
    exchange_allowed = false;
    return_policy_message = data.return_policy_message?.trim() || null;
  }

  const is_active = data.is_active !== undefined ? !!data.is_active : true;
  if (data.show_storefront_stock_message) {
    const qty = Number(data.storefront_stock_message_quantity);
    if (isNaN(qty) || qty < 1 || qty > 20 || !Number.isInteger(qty)) {
      return { error: 'Storefront stock message quantity must be an integer between 1 and 20.' };
    }
  }
  const showroom_collection_only = !!data.showroom_collection_only;
  const shipping_weight_grams = data.shipping_weight_grams !== undefined && data.shipping_weight_grams !== null && String(data.shipping_weight_grams).trim() !== '' ? Number(data.shipping_weight_grams) : null;
  const parcel_length_cm = data.parcel_length_cm !== undefined && data.parcel_length_cm !== null && String(data.parcel_length_cm).trim() !== '' ? Number(data.parcel_length_cm) : null;
  const parcel_width_cm = data.parcel_width_cm !== undefined && data.parcel_width_cm !== null && String(data.parcel_width_cm).trim() !== '' ? Number(data.parcel_width_cm) : null;
  const parcel_height_cm = data.parcel_height_cm !== undefined && data.parcel_height_cm !== null && String(data.parcel_height_cm).trim() !== '' ? Number(data.parcel_height_cm) : null;

  let stock_quantity = 0;
  if (data.stock_quantity !== undefined && data.stock_quantity !== null && String(data.stock_quantity).trim() !== '') {
    const qtyVal = Number(data.stock_quantity);
    if (isNaN(qtyVal) || qtyVal < 0 || qtyVal > 999999 || !Number.isInteger(qtyVal)) {
      return { error: 'Stock quantity must be between 0 and 999,999.' };
    }
    stock_quantity = qtyVal;
  }

  let validatedVariants: any[] | undefined = undefined;
  if (data.variants !== undefined) {
    if (!Array.isArray(data.variants)) {
      return { error: 'Variants must be an array of variant objects.' };
    }
    const skus = new Set<string>();
    validatedVariants = [];
    for (const v of data.variants) {
      if (!v.sku || v.sku.trim() === '') {
        return { error: 'Variant SKU code is required.' };
      }
      const skuTrim = v.sku.trim();
      if (skus.has(skuTrim)) {
        return { error: `Duplicate variant SKU code: ${skuTrim}` };
      }
      skus.add(skuTrim);

      if (v.stock_quantity === null || v.stock_quantity === undefined || String(v.stock_quantity).trim() === '') {
        return { error: `Variant stock quantity is required for SKU: ${skuTrim}` };
      }
      const qtyVal = Number(v.stock_quantity);
      if (isNaN(qtyVal) || qtyVal < 0 || qtyVal > 999999 || !Number.isInteger(qtyVal)) {
        return { error: `Variant stock quantity must be between 0 and 999,999 for SKU: ${skuTrim}` };
      }

      let priceOverrideVal = null;
      if (v.price_override !== undefined && v.price_override !== null && String(v.price_override).trim() !== '') {
        const pr = Number(v.price_override);
        if (isNaN(pr) || pr <= 0) {
          return { error: `Variant price override must be a positive number for SKU: ${skuTrim}` };
        }
        priceOverrideVal = pr;
      }

      if ((!v.size_id || v.size_id.trim() === '') && (!v.size || v.size.trim() === '')) {
        return { error: `Variant size is required for SKU: ${skuTrim}` };
      }

      const variantColorId = v.color_id?.trim() || data.primary_color_id?.trim() || null;
      const variantColorName = v.color_name?.trim() || data.color_name?.trim() || 'Default';

      if (!variantColorId && (!variantColorName || variantColorName.trim() === '')) {
        return { error: `Variant color is required for SKU: ${skuTrim}` };
      }

      let variantWeightVal = null;
      if (v.shipping_weight_grams !== undefined && v.shipping_weight_grams !== null && String(v.shipping_weight_grams).trim() !== '') {
        const vw = Number(v.shipping_weight_grams);
        if (isNaN(vw) || vw < 0) {
          return { error: `Variant shipping weight must be non-negative for SKU: ${skuTrim}` };
        }
        variantWeightVal = vw;
      }

      validatedVariants.push({
        id: v.id || v.variantId || null,
        variantId: v.variantId || v.id || null,
        inventoryId: v.inventoryId || null,
        sizeId: v.sizeId || v.size_id || null,
        sizeCode: v.sizeCode || v.size || '',
        isNew: !!v.isNew,
        isSizeRemoved: !!v.isSizeRemoved,
        isQuantityEdited: !!v.isQuantityEdited,
        size_id: v.size_id?.trim() || v.sizeId?.trim() || null,
        color_id: variantColorId,
        size: v.size?.trim() || v.sizeCode?.trim() || '',
        color_name: variantColorName,
        color_code: v.color_code?.trim() || '#000000',
        sku: skuTrim,
        stock_quantity: qtyVal,
        quantity: qtyVal,
        originalQuantity: Number(v.originalQuantity) || 0,
        price_override: priceOverrideVal,
        is_active: v.is_active !== undefined ? !!v.is_active : true,
        isActive: v.isActive !== undefined ? !!v.isActive : true,
        is_default: !!v.is_default,
        shipping_weight_grams: variantWeightVal,
      });
    }
  }

  const show_color_option = !!data.show_color_option;
  let storefront_default_color_id: string | null = data.storefront_default_color_id?.trim() || null;

  if (validatedVariants && validatedVariants.length > 0) {
    const activeColorIds = Array.from(new Set(
      validatedVariants
        .filter(v => v.is_active && v.color_id && v.color_name !== 'Default')
        .map(v => v.color_id!)
    ));

    if (!show_color_option && activeColorIds.length > 1) {
      if (!storefront_default_color_id || !activeColorIds.includes(storefront_default_color_id)) {
        return { error: 'Select the colour that should be used on the storefront.' };
      }
    } else if (activeColorIds.length === 1) {
      storefront_default_color_id = activeColorIds[0];
    } else if (activeColorIds.length === 0) {
      storefront_default_color_id = null;
    }
  }

  return {
    data: {
      title: data.title.trim(),
      slug: slug,
      sku: data.sku.trim(),
      selling_price: sellingPrice,
      mrp: mrp,
      category_id: data.category_id,
      collection_id: data.collection_id || null,
      fabric: data.fabric?.trim() || null,
      occasion: data.occasion?.trim() || null,
      care_instructions: data.care_instructions?.trim() || null,
      description: data.description.trim(),
      short_description: data.short_description?.trim() || null,
      material: data.material?.trim() || null,
      fit: data.fit?.trim() || null,
      sleeve_type: data.sleeve_type?.trim() || null,
      neck_type: data.neck_type?.trim() || null,
      pattern: data.pattern?.trim() || null,
      color_name: data.color_name?.trim() || null,
      details: data.details || [],
      images: data.images || [],
      is_featured: !!data.is_featured,
      is_trending: !!data.is_trending,
      is_active: data.is_active !== undefined ? !!data.is_active : true,
      delivery_available: data.delivery_available !== undefined ? !!data.delivery_available : true,
      show_delivery_estimate: !!data.show_delivery_estimate,
      showroom_collection_only: !!data.showroom_collection_only,
      pickup_available: !!data.pickup_available,
      free_delivery: !!data.free_delivery,
      delivery_min_days,
      delivery_max_days,
      delivery_message: data.delivery_message?.trim() || null,
      cod_available: !!data.cod_available,
      express_delivery_available: !!data.express_delivery_available,
      is_returnable,
      return_window_days,
      return_policy_message,
      exchange_allowed,
      show_color_option,
      storefront_default_color_id,
      product_family_id: data.product_family_id || null,
      primary_color_id: data.primary_color_id || null,
      colorway_sort_order: data.colorway_sort_order !== undefined ? Number(data.colorway_sort_order) : 0,
      stock_quantity,
      variants: validatedVariants,
      show_storefront_stock_message: data.show_storefront_stock_message !== undefined ? !!data.show_storefront_stock_message : false,
      storefront_stock_message_quantity: data.storefront_stock_message_quantity !== undefined ? Number(data.storefront_stock_message_quantity) : 1,
      shipping_weight_grams,
      parcel_length_cm,
      parcel_width_cm,
      parcel_height_cm,
    }
  };
}

export function validateCategory(data: Partial<CategoryInput>): { error?: string; data?: CategoryInput } {
  if (!data.name || data.name.trim() === '') {
    return { error: 'Category name is required.' }
  }

  let slug = data.slug?.trim().toLowerCase() || '';
  if (!slug) {
    slug = data.name
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '');
  }

  const urlSafeRegex = /^[a-z0-9-]+$/;
  if (!slug || !urlSafeRegex.test(slug)) {
    return { error: 'Slug is required, and must be lowercase and contain only letters, numbers, and hyphens.' }
  }

  const displayOrder = data.display_order !== undefined ? Number(data.display_order) : 0;
  if (isNaN(displayOrder) || displayOrder < 0 || !Number.isInteger(displayOrder)) {
    return { error: 'Display order must be a non-negative integer.' }
  }

  if (data.image_url && data.image_url.trim() !== '') {
    const url = data.image_url.trim();
    if (!url.startsWith('/') && !url.startsWith('http://') && !url.startsWith('https://') && !/^[a-zA-Z0-9_\-\/\.]+$/.test(url)) {
      return { error: 'Invalid category image URL or storage path format.' }
    }
  }

  return {
    data: {
      name: data.name.trim(),
      slug: slug,
      description: data.description?.trim() || null,
      image_url: data.image_url?.trim() || null,
      parent_id: data.parent_id || null,
      display_order: displayOrder,
      is_active: data.is_active !== undefined ? !!data.is_active : true,
    }
  }
}

export function validateCollection(data: Partial<CollectionInput>): { error?: string; data?: CollectionInput } {
  if (!data.name || data.name.trim() === '') {
    return { error: 'Collection name is required.' }
  }

  const slug = data.slug?.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') || data.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
  if (!slug || slug.trim() === '') {
    return { error: 'Collection slug cannot be empty.' }
  }

  // Reject reserved admin or storefront paths
  const reservedSlugs = ['new', 'edit', 'delete', 'admin', 'api', 'shop', 'cart', 'checkout', 'orders', 'profile', 'settings', 'wishlist', 'categories', 'collections', 'variants', 'colors']
  if (reservedSlugs.includes(slug)) {
    return { error: `Slug "${slug}" is a reserved system path and cannot be used.` }
  }

  const status = data.status || 'draft'
  const sort_order = data.sort_order !== undefined ? Number(data.sort_order) : 0
  if (isNaN(sort_order) || !Number.isInteger(sort_order)) {
    return { error: 'Sort order must be an integer.' }
  }

  return {
    data: {
      name: data.name.trim(),
      slug: slug,
      description: data.description?.trim() || null,
      image_url: data.image_url?.trim() || null,
      is_featured: !!data.is_featured,
      status: status as any,
      sort_order: sort_order,
      seo_title: data.seo_title?.trim() || null,
      seo_description: data.seo_description?.trim() || null,
      published_at: status === 'published' ? (data.published_at || new Date().toISOString()) : null
    }
  }
}
