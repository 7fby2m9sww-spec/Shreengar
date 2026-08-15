import { Category, Collection, Product, AdminProduct, StorefrontVariantOption } from '@/types/database'
import { createClient } from '@/lib/supabase/client'
import { mapDbToAdminProduct } from '@/lib/mappers/product'
import { createBrowserClient } from '@supabase/ssr'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

function getSupabaseClient(isAdmin?: boolean) {
  if (isAdmin && typeof window === 'undefined') {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
    return createSupabaseClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    })
  }
  return createClient()
}

function createServerSideClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  return createBrowserClient(supabaseUrl, supabaseAnonKey, {
    global: {
      fetch: (url, init) => fetch(url, { ...init, cache: 'no-store' })
    }
  })
}

// Data Access Service Functions — 100% Supabase Database Driven
export async function getProducts(options?: {
  categoryId?: string
  collectionId?: string
  search?: string
  minPrice?: number
  maxPrice?: number
  sort?: string
}): Promise<Product[]> {
  try {
    const supabase = createClient()
    let query = supabase.from('products').select('*').eq('is_active', true).eq('status', 'active')

    if (options?.categoryId) query = query.eq('category_id', options.categoryId)
    if (options?.collectionId) query = query.eq('collection_id', options.collectionId)
    if (options?.search) query = query.ilike('name', `%${options.search}%`)
    if (options?.minPrice !== undefined) query = query.gte('selling_price', options.minPrice)
    if (options?.maxPrice !== undefined) query = query.lte('selling_price', options.maxPrice)

    if (options?.sort === 'price-low') query = query.order('selling_price', { ascending: true })
    else if (options?.sort === 'price-high') query = query.order('selling_price', { ascending: false })
    else if (options?.sort === 'rating') query = query.order('average_rating', { ascending: false })
    else query = query.order('created_at', { ascending: false })

    const { data, error } = await query
    if (error) {
      console.error('[DATABASE-ERROR] getProducts failed:', error.message, error.details)
      return []
    }

    if (data) {
      const products = data.map((p: any) => ({
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
        show_color_option: p.show_color_option !== undefined ? !!p.show_color_option : false,
        storefront_default_color_id: p.storefront_default_color_id || null,
        created_at: p.created_at,
        updated_at: p.updated_at
      })) as Product[]

      const productIds = products.map(p => p.id)
      if (productIds.length > 0) {
        const { data: dbImages, error: imgError } = await supabase
          .from('product_images')
          .select('*')
          .in('product_id', productIds)
          .order('display_order', { ascending: true })

        if (imgError) {
          console.error('[DATABASE-ERROR] Fetching product_images failed:', imgError.message, imgError.details)
        }

        if (dbImages && dbImages.length > 0) {
          const sortedDbImages = [...dbImages].sort((a: any, b: any) => {
            if (a.is_primary && !b.is_primary) return -1
            if (!a.is_primary && b.is_primary) return 1
            const orderA = a.display_order ?? 999999
            const orderB = b.display_order ?? 999999
            if (orderA !== orderB) return orderA - orderB
            return (a.image_url || '').localeCompare(b.image_url || '')
          })

          const imagesByProduct: Record<string, string[]> = {}
          sortedDbImages.forEach((img: any) => {
            if (!imagesByProduct[img.product_id]) imagesByProduct[img.product_id] = []
            imagesByProduct[img.product_id].push(img.image_url)
          })

          products.forEach(p => {
            if (imagesByProduct[p.id] && imagesByProduct[p.id].length > 0) {
              p.images = imagesByProduct[p.id]
            }
          })
        }
      }
      return products
    }
  } catch (err: any) {
    console.error('[UNEXPECTED-ERROR] getProducts failed:', err.message || err)
  }
  return []
}

export async function getProductById(id: string): Promise<Product | null> {
  try {
    const supabase = createServerSideClient()
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
    const query = isUuid
      ? supabase.from('products').select('*').eq('id', id)
      : supabase.from('products').select('*').eq('slug', id)
    const { data: p, error } = await query.maybeSingle()
    if (!error && p) {
      const product: Product = {
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
        short_description: p.short_description || null,
        material: p.material || null,
        fit: p.fit || null,
        sleeve_type: p.sleeve_type || null,
        neck_type: p.neck_type || null,
        pattern: p.pattern || null,
        color_name: p.color_name || null,
        details: p.details || [],
        images: p.images || [],
        is_bestseller: p.best_seller || false,
        is_new_arrival: p.new_arrival || false,
        is_active: p.is_active || false,
        delivery_available: p.delivery_available !== undefined ? !!p.delivery_available : true,
        show_delivery_estimate: p.show_delivery_estimate !== undefined ? !!p.show_delivery_estimate : false,
        showroom_collection_only: p.showroom_collection_only !== undefined ? !!p.showroom_collection_only : false,
        pickup_available: p.pickup_available !== undefined ? !!p.pickup_available : false,
        free_delivery: !!p.free_delivery,
        delivery_min_days: p.delivery_min_days !== undefined ? p.delivery_min_days : null,
        delivery_max_days: p.delivery_max_days !== undefined ? p.delivery_max_days : null,
        delivery_message: p.delivery_message || null,
        cod_available: !!p.cod_available,
        express_delivery_available: !!p.express_delivery_available,
        is_returnable: p.is_returnable !== undefined ? !!p.is_returnable : true,
        return_window_days: p.return_window_days !== undefined ? p.return_window_days : null,
        return_policy_message: p.return_policy_message || null,
        exchange_allowed: !!p.exchange_allowed,
        show_color_option: p.show_color_option !== undefined ? !!p.show_color_option : false,
        storefront_default_color_id: p.storefront_default_color_id || null,
        product_family_id: p.product_family_id || null,
        show_storefront_stock_message: !!p.show_storefront_stock_message,
        storefront_stock_message_quantity: p.storefront_stock_message_quantity !== undefined ? Number(p.storefront_stock_message_quantity) : 1,
        primary_color_id: p.primary_color_id || null,
        colorway_sort_order: p.colorway_sort_order !== undefined ? Number(p.colorway_sort_order) : 0,
        rating: Number(p.average_rating || 5.0),
        reviews_count: p.total_reviews || 0,
        created_at: p.created_at,
        updated_at: p.updated_at
      }
      const { data: dbImages } = await supabase
        .from('product_images')
        .select('*')
        .eq('product_id', product.id)

      if (dbImages && dbImages.length > 0) {
        const sortedDbImages = [...dbImages].sort((a: any, b: any) => {
          if (a.is_primary && !b.is_primary) return -1
          if (!a.is_primary && b.is_primary) return 1
          const orderA = a.display_order ?? 999999
          const orderB = b.display_order ?? 999999
          if (orderA !== orderB) return orderA - orderB
          return (a.image_url || '').localeCompare(b.image_url || '')
        })
        product.images = sortedDbImages.map((img: any) => img.image_url)
      }

      if (product.product_family_id) {
        const { data: familyProds } = await supabase
          .from('products')
          .select(`
            id,
            slug,
            name,
            status,
            selling_price,
            mrp,
            is_active,
            colorway_sort_order,
            primary_color_id,
            primary_color:colors!products_primary_color_id_fkey(name, hex_code),
            product_images(image_url, is_primary, display_order)
          `)
          .eq('product_family_id', product.product_family_id)
          .eq('is_active', true)
          .eq('status', 'active')
          .order('colorway_sort_order', { ascending: true })

        if (familyProds) {
          product.linked_colourways = familyProds.map((fp: any) => {
            let coverUrl = '/images/product-placeholder.webp'
            const imgs = fp.product_images || []
            if (imgs.length > 0) {
              const sortedImgs = [...imgs].sort((a: any, b: any) => {
                if (a.is_primary && !b.is_primary) return -1
                if (!a.is_primary && b.is_primary) return 1
                return (a.display_order ?? 999) - (b.display_order ?? 999)
              })
              coverUrl = sortedImgs[0].image_url
            }
            return {
              id: fp.id,
              slug: fp.slug,
              title: fp.name,
              price: Number(fp.selling_price || 0),
              mrp: Number(fp.mrp || 0),
              primary_image: coverUrl,
              primary_color_id: fp.primary_color_id,
              color_name: fp.primary_color?.name || fp.name,
              color_code: fp.primary_color?.hex_code || '#000000',
              colorway_sort_order: fp.colorway_sort_order || 0,
              is_active: fp.is_active
            }
          })
        }
      }

      return product
    }
  } catch (err) {
    console.error('Error in getProductById:', err)
  }
  return null
}

export async function getCategories(): Promise<Category[]> {
  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true })

    if (error) {
      console.error('[DATABASE-ERROR] getCategories failed:', error.message, error.details)
      return []
    }
    return (data || []) as Category[]
  } catch (err: any) {
    console.error('[UNEXPECTED-ERROR] getCategories failed:', err.message || err)
  }
  return []
}

export async function getCategoryBySlug(slug: string): Promise<Category | null> {
  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('slug', slug)
      .eq('is_active', true)
      .maybeSingle()

    if (error) {
      console.error('[DATABASE-ERROR] getCategoryBySlug failed:', error.message, error.details)
      return null
    }
    return data as Category | null
  } catch (err: any) {
    console.error('[UNEXPECTED-ERROR] getCategoryBySlug failed:', err.message || err)
  }
  return null
}

export async function getCollections(): Promise<Collection[]> {
  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('collections')
      .select('*')
      .eq('status', 'published')
      .order('sort_order', { ascending: true })

    if (error) {
      console.error('[DATABASE-ERROR] getCollections failed:', error.message, error.details)
      return []
    }
    return (data || []) as Collection[]
  } catch (err: any) {
    console.error('[UNEXPECTED-ERROR] getCollections failed:', err.message || err)
  }
  return []
}

export async function getCollectionBySlug(slug: string): Promise<Collection | null> {
  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('collections')
      .select('*')
      .eq('slug', slug)
      .eq('status', 'published')
      .maybeSingle()

    if (error) {
      console.error('[DATABASE-ERROR] getCollectionBySlug failed:', error.message, error.details)
      return null
    }
    return data as Collection | null
  } catch (err: any) {
    console.error('[UNEXPECTED-ERROR] getCollectionBySlug failed:', err.message || err)
    return null
  }
}

export async function getCollectionProducts(collectionId: string): Promise<Product[]> {
  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('product_collections')
      .select(`
        sort_order,
        products (
          *,
          product_images (
            *
          )
        )
      `)
      .eq('collection_id', collectionId)
      .order('sort_order', { ascending: true })

    if (error) {
      console.error('[DATABASE-ERROR] getCollectionProducts failed:', error.message, error.details)
      return []
    }

    const relProducts = (data || [])
      .map((item: any) => {
        const prod = item.products
        if (!prod || !prod.is_active || prod.status !== 'active') return null

        const dbImages = prod.product_images || []
        const sortedDbImages = [...dbImages].sort((a: any, b: any) => {
          if (a.is_primary && !b.is_primary) return -1
          if (!a.is_primary && b.is_primary) return 1
          const orderA = a.display_order ?? 999999
          const orderB = b.display_order ?? 999999
          if (orderA !== orderB) return orderA - orderB
          return (a.image_url || '').localeCompare(b.image_url || '')
        })

        return {
          id: prod.id,
          title: prod.name || '',
          name: prod.name || '',
          slug: prod.slug,
          sku: prod.sku || '',
          price: Number(prod.selling_price || 0),
          compare_at_price: prod.mrp ? Number(prod.mrp) : null,
          category_id: prod.category_id,
          collection_id: prod.collection_id,
          fabric: prod.fabric || null,
          occasion: prod.occasion || null,
          care_instructions: prod.care_instructions || null,
          description: prod.description || '',
          details: prod.details || [],
          images: sortedDbImages.map((img: any) => img.image_url),
          is_featured: prod.featured || false,
          is_trending: prod.trending || false,
          is_bestseller: prod.best_seller || false,
          is_new_arrival: prod.new_arrival || false,
          is_active: prod.is_active || false,
          rating: Number(prod.average_rating || 5.0),
          reviews_count: prod.total_reviews || 0,
          meta_title: prod.seo_title || null,
          meta_description: prod.seo_description || null,
          show_color_option: prod.show_color_option !== undefined ? !!prod.show_color_option : false,
          storefront_default_color_id: prod.storefront_default_color_id || null,
          created_at: prod.created_at,
          updated_at: prod.updated_at
        }
      })
      .filter(Boolean) as Product[]

    if (relProducts.length > 0) {
      return relProducts
    }

    // Direct collection_id query fallback when product_collections relation table is empty
    const { data: directData } = await supabase
      .from('products')
      .select('*, product_images(*)')
      .eq('collection_id', collectionId)

    return (directData || [])
      .map((prod: any) => {
        if (!prod || !prod.is_active || prod.status !== 'active') return null

        const dbImages = prod.product_images || []
        const sortedDbImages = [...dbImages].sort((a: any, b: any) => {
          if (a.is_primary && !b.is_primary) return -1
          if (!a.is_primary && b.is_primary) return 1
          const orderA = a.display_order ?? 999999
          const orderB = b.display_order ?? 999999
          if (orderA !== orderB) return orderA - orderB
          return (a.image_url || '').localeCompare(b.image_url || '')
        })

        return {
          id: prod.id,
          title: prod.name || '',
          name: prod.name || '',
          slug: prod.slug,
          sku: prod.sku || '',
          price: Number(prod.selling_price || 0),
          compare_at_price: prod.mrp ? Number(prod.mrp) : null,
          category_id: prod.category_id,
          collection_id: prod.collection_id,
          fabric: prod.fabric || null,
          occasion: prod.occasion || null,
          care_instructions: prod.care_instructions || null,
          description: prod.description || '',
          details: prod.details || [],
          images: sortedDbImages.map((img: any) => img.image_url),
          is_featured: prod.featured || false,
          is_trending: prod.trending || false,
          is_bestseller: prod.best_seller || false,
          is_new_arrival: prod.new_arrival || false,
          is_active: prod.is_active || false,
          rating: Number(prod.average_rating || 5.0),
          reviews_count: prod.total_reviews || 0,
          meta_title: prod.seo_title || null,
          meta_description: prod.seo_description || null,
          show_color_option: prod.show_color_option !== undefined ? !!prod.show_color_option : false,
          storefront_default_color_id: prod.storefront_default_color_id || null,
          created_at: prod.created_at,
          updated_at: prod.updated_at
        }
      })
      .filter(Boolean) as Product[]
  } catch (err: any) {
    console.error('[UNEXPECTED-ERROR] getCollectionProducts failed:', err.message || err)
    return []
  }
}

export async function getProductVariants(productId: string): Promise<StorefrontVariantOption[]> {
  try {
    const supabase = createServerSideClient()
    const { data, error } = await supabase
      .from('product_variants')
      .select('*, sizes(*), colors(*), inventory(*)')
      .eq('product_id', productId)
      .eq('is_active', true)

    if (error) {
      console.error('[DATABASE-ERROR] getProductVariants failed:', error.message, error.details)
      return []
    }
    if (data) {
      return data.map((v: any) => {
        const sizeObj = Array.isArray(v.sizes) ? v.sizes[0] : v.sizes
        const colorObj = Array.isArray(v.colors) ? v.colors[0] : v.colors
        const invObj = Array.isArray(v.inventory) ? v.inventory[0] : v.inventory

        const sizeName = sizeObj?.display_name || sizeObj?.name || 'M'
        const sizeCode = sizeObj?.name || 'M'
        const sizeSort = (sizeObj?.display_order !== undefined && sizeObj?.display_order !== null)
          ? Number(sizeObj.display_order)
          : (sizeObj?.sort_order !== undefined && sizeObj?.sort_order !== null)
            ? Number(sizeObj.sort_order)
            : 9999

        const qty = Number(invObj?.quantity) || 0
        const reserved = Number(invObj?.reserved_quantity ?? invObj?.reserved_stock) || 0
        const availableQuantity = invObj?.available_quantity ?? Math.max(qty - reserved, 0)

        return {
          variantId: v.id,
          sizeId: v.size_id || sizeObj?.id || '',
          sizeCode,
          sizeName,
          sizeSortOrder: sizeSort,
          colorId: v.color_id || colorObj?.id || null,
          quantity: qty,
          reservedQuantity: reserved,
          availableQuantity,
          isActive: v.is_active !== false,

          // Legacy fields for backward compatibility in storefront components
          id: v.id,
          size: sizeCode,
          size_id: v.size_id || sizeObj?.id || '',
          color_id: v.color_id || colorObj?.id || null,
          color_name: colorObj?.name || 'Default',
          color_code: colorObj?.code || null,
          sku: v.sku,
          stock_quantity: qty,
          reserved_quantity: reserved,
          available_quantity: availableQuantity,
          is_active: v.is_active !== false,
          product_id: v.product_id,
          price_override: v.price_override || null,
          created_at: v.created_at || new Date().toISOString()
        }
      })
    }
  } catch (err: any) {
    console.error('[UNEXPECTED-ERROR] getProductVariants failed:', err.message || err)
  }
  return []
}

export async function getVariants(): Promise<any[]> {
  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('product_variants')
      .select('*, size:sizes(*), color:colors(*), product:products(name, sku)')

    if (error) {
      console.error('[DATABASE-ERROR] getVariants failed:', error.message, error.details)
      return []
    }
    if (data) {
      return data.map((v: any) => ({
        ...v,
        product_name: v.product?.name || null,
        size: v.size?.name || null,
        color_name: v.color?.name || null,
        color_code: v.color?.code || null
      }))
    }
  } catch (err: any) {
    console.error('[UNEXPECTED-ERROR] getVariants failed:', err.message || err)
  }
  return []
}

export type InventoryGroupStatus = 'in_stock' | 'low_stock' | 'mixed_stock' | 'out_of_stock';

export type InventoryVariantRow = {
  id: string
  variant_id: string
  quantity: number
  reserved_quantity: number
  low_stock_threshold: number
  stock_status: string
  sku: string | null
  size: string | null
  color_name: string | null
  color_code: string | null
  warehouse_location: string | null
  availableQuantity: number
  status: 'in_stock' | 'low_stock' | 'out_of_stock'
  hasMismatch: boolean
  isMatched: boolean
}

export type InventoryProductGroup = {
  productId: string
  productName: string
  productSlug: string
  baseSku: string | null
  imageUrl: string | null
  variantCount: number
  totalQuantity: number
  totalReserved: number
  totalAvailable: number
  overallStatus: InventoryGroupStatus
  locationSummary: string
  hasStatusMismatch: boolean
  variants: InventoryVariantRow[]
}

export type InventoryFamilyGroup = {
  familyId: string | null
  familyName: string
  productCount: number
  variantCount: number
  totalQuantity: number
  totalReserved: number
  totalAvailable: number
  overallStatus: InventoryGroupStatus
  products: InventoryProductGroup[]
}

export type InventoryCategoryGroup = {
  categoryId: string | null
  categoryName: string
  productFamilyCount: number
  productCount: number
  variantCount: number
  totalQuantity: number
  totalReserved: number
  totalAvailable: number
  lowStockVariantCount: number
  outOfStockVariantCount: number
  families: InventoryFamilyGroup[]
}

export async function getInventory(options?: {
  page?: number
  pageSize?: number
  search?: string
  categoryId?: string
  colorId?: string
  sizeId?: string
  status?: string
  viewMode?: 'grouped' | 'variant'
  productFamilyId?: string
}): Promise<{
  rows: any[]
  totalCount: number
  totalPages: number
  page: number
  pageSize: number
  summary: any
}> {
  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('inventory')
      .select('*, variant:product_variants(*, size:sizes(*), color:colors(*), product:products(*, category:categories(id, name), product_families:product_families(id, name), images:product_images(image_url)))')

    if (error) {
      console.error('[DATABASE-ERROR] getInventory failed:', error.message, error.details)
      throw error
    }

    if (!data) {
      return { rows: [], totalCount: 0, totalPages: 0, page: 1, pageSize: 25, summary: undefined }
    }

    const { resolveInventoryHealth } = await import('@/lib/inventory/health')

    // 1. Map rows with details
    const mappedVariants = data.map((row: any) => {
      const threshold = row.low_stock_threshold ?? row.reorder_level ?? 5
      const available = Math.max((row.quantity || 0) - (row.reserved_quantity || 0), 0)
      const health = resolveInventoryHealth({
        quantity: row.quantity || 0,
        reservedQuantity: row.reserved_quantity || 0,
        threshold: threshold,
        stockStatus: row.stock_status
      })
      return {
        ...row,
        product_id: row.variant?.product?.id || 'unknown_product',
        product_name: row.variant?.product?.title || row.variant?.product?.name || 'Unknown Product',
        product_slug: row.variant?.product?.slug || '',
        sku: row.variant?.sku || null,
        size: row.variant?.size?.name || null,
        color_name: row.variant?.color?.name || null,
        color_code: row.variant?.color?.hex_code || null,
        low_stock_threshold: threshold,
        availableQuantity: available,
        status: health.status as 'in_stock' | 'low_stock' | 'out_of_stock',
        hasMismatch: health.hasMismatch
      }
    })

    const search = options?.search?.trim().toLowerCase()
    const categoryId = options?.categoryId
    const familyId = options?.productFamilyId
    const colorId = options?.colorId
    const sizeId = options?.sizeId
    const status = options?.status
    const viewMode = options?.viewMode ?? 'grouped'

    // Phase 1: Determine which variants match the filters and search query
    const matchedVariantIds = new Set<string>()
    const matchedProductIds = new Set<string>()

    for (const row of mappedVariants) {
      let matchesSearch = true
      if (search) {
        const catName = (row.variant?.product?.category?.name || 'Uncategorised').toLowerCase()
        const famName = (row.variant?.product?.product_families?.name || 'No Product Family').toLowerCase()
        const prodName = (row.product_name || '').toLowerCase()
        const baseSku = (row.variant?.product?.sku || '').toLowerCase()
        const varSku = (row.sku || '').toLowerCase()
        const sizeVal = (row.size || '').toLowerCase()
        const colorVal = (row.color_name || '').toLowerCase()

        matchesSearch = catName.includes(search) || 
                        famName.includes(search) || 
                        prodName.includes(search) || 
                        baseSku.includes(search) || 
                        varSku.includes(search) || 
                        sizeVal.includes(search) || 
                        colorVal.includes(search)
      }

      let matchesCategory = true
      if (categoryId && categoryId !== 'all') {
        matchesCategory = row.variant?.product?.category_id === categoryId
      }

      let matchesFamily = true
      if (familyId && familyId !== 'all') {
        matchesFamily = row.variant?.product?.product_family_id === familyId
      }

      let matchesColor = true
      if (colorId && colorId !== 'all') {
        matchesColor = row.variant?.color_id === colorId
      }

      let matchesSize = true
      if (sizeId && sizeId !== 'all') {
        matchesSize = row.variant?.size_id === sizeId
      }

      let matchesStatus = true
      if (status && status !== 'all') {
        if (status === 'normal') matchesStatus = row.status === 'in_stock'
        else if (status === 'low') matchesStatus = row.status === 'low_stock'
        else if (status === 'out') matchesStatus = row.status === 'out_of_stock'
      }

      if (matchesSearch && matchesCategory && matchesFamily && matchesColor && matchesSize && matchesStatus) {
        matchedVariantIds.add(row.id)
        matchedProductIds.add(row.product_id)
      }
    }

    // 2. Filter & paginate based on viewMode
    if (viewMode === 'variant') {
      const filteredVariants = mappedVariants.filter(v => matchedVariantIds.has(v.id))
      const totalCount = filteredVariants.length
      const page = options?.page ?? 1
      const pageSize = options?.pageSize ?? 25
      const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))
      const startIndex = (page - 1) * pageSize
      const paginatedRows = filteredVariants.slice(startIndex, startIndex + pageSize)

      // Calculate summaries based on matched variants
      let totalStockUnits = 0
      let totalAvailableUnits = 0
      let lowStockVariants = 0
      let outOfStockVariants = 0
      const uniqueCats = new Set<string>()
      const uniqueFams = new Set<string>()
      const uniqueProds = new Set<string>()

      for (const v of filteredVariants) {
        totalStockUnits += v.quantity || 0
        totalAvailableUnits += v.availableQuantity || 0
        if (v.status === 'low_stock') lowStockVariants++
        if (v.status === 'out_of_stock') outOfStockVariants++
        if (v.variant?.product?.category_id) uniqueCats.add(v.variant.product.category_id)
        if (v.variant?.product?.product_family_id) uniqueFams.add(v.variant.product.product_family_id)
        if (v.product_id) uniqueProds.add(v.product_id)
      }

      const summary = {
        totalCategories: uniqueCats.size,
        totalFamilies: uniqueFams.size,
        totalProducts: uniqueProds.size,
        totalVariants: filteredVariants.length,
        totalStockUnits,
        totalAvailableUnits,
        lowStockVariants,
        outOfStockVariants
      }

      return {
        rows: paginatedRows,
        totalCount,
        totalPages,
        page,
        pageSize,
        summary
      }
    } else {
      // Grouped / Hierarchical tree view mode
      const categoriesMap = new Map<string, any>()

      // Group all variants of matched products
      for (const row of mappedVariants) {
        const prodId = row.product_id
        if (!matchedProductIds.has(prodId)) {
          continue
        }

        const catId = row.variant?.product?.category_id || null
        const catKey = catId || 'uncategorised'
        const catName = row.variant?.product?.category?.name || 'Uncategorised'

        const famId = row.variant?.product?.product_family_id || null
        const famKey = famId || 'no-family'
        const famName = row.variant?.product?.product_families?.name || 'No Product Family'

        if (!categoriesMap.has(catKey)) {
          categoriesMap.set(catKey, {
            categoryId: catId,
            categoryName: catName,
            productFamilyCount: 0,
            productCount: 0,
            variantCount: 0,
            totalQuantity: 0,
            totalReserved: 0,
            totalAvailable: 0,
            lowStockVariantCount: 0,
            outOfStockVariantCount: 0,
            familiesMap: new Map<string, any>()
          })
        }
        const categoryGroup = categoriesMap.get(catKey)!

        if (!categoryGroup.familiesMap.has(famKey)) {
          categoryGroup.familiesMap.set(famKey, {
            familyId: famId,
            familyName: famName,
            productCount: 0,
            variantCount: 0,
            totalQuantity: 0,
            totalReserved: 0,
            totalAvailable: 0,
            overallStatus: 'in_stock' as InventoryGroupStatus,
            productsMap: new Map<string, any>()
          })
        }
        const familyGroup = categoryGroup.familiesMap.get(famKey)!

        if (!familyGroup.productsMap.has(prodId)) {
          const primaryImg = row.variant?.product?.images?.[0]
          const imageObj = Array.isArray(primaryImg) ? primaryImg[0] : primaryImg
          const imageUrl = typeof imageObj === 'string' ? imageObj : (imageObj?.image_url || null)

          familyGroup.productsMap.set(prodId, {
            productId: prodId,
            productName: row.product_name,
            productSlug: row.product_slug,
            baseSku: row.variant?.product?.sku || null,
            imageUrl: imageUrl || null,
            variantCount: 0,
            totalQuantity: 0,
            totalReserved: 0,
            totalAvailable: 0,
            overallStatus: 'in_stock' as InventoryGroupStatus,
            locationSummary: '',
            hasStatusMismatch: false,
            variants: []
          })
        }
        const productGroup = familyGroup.productsMap.get(prodId)!

        productGroup.variants.push({
          ...row,
          isMatched: matchedVariantIds.has(row.id)
        })
      }

      // Calculate aggregates for all levels
      const finalCategories: any[] = []
      const allProductsFlat: any[] = []

      for (const catGroup of categoriesMap.values()) {
        const familiesList: any[] = []
        let catTotalQty = 0
        let catTotalReserved = 0
        let catTotalAvailable = 0
        let catVariantCount = 0
        let catProductCount = 0
        let catLowStockCount = 0
        let catOutOfStockCount = 0
        let catRealFamilyCount = 0

        for (const famGroup of catGroup.familiesMap.values()) {
          if (famGroup.familyId !== null) {
            catRealFamilyCount++
          }

          const productsList: any[] = []
          let famTotalQty = 0
          let famTotalReserved = 0
          let famTotalAvailable = 0
          let famVariantCount = 0
          let famProductCount = 0
          const famVariants: any[] = []

          for (const prodGroup of famGroup.productsMap.values()) {
            const prodVars = prodGroup.variants
            
            prodGroup.variantCount = prodVars.length
            prodGroup.totalQuantity = prodVars.reduce((sum: number, v: any) => sum + (v.quantity || 0), 0)
            prodGroup.totalReserved = prodVars.reduce((sum: number, v: any) => sum + (v.reserved_quantity || 0), 0)
            prodGroup.totalAvailable = prodVars.reduce((sum: number, v: any) => sum + (v.availableQuantity || 0), 0)
            
            const locations = prodVars.map((v: any) => v.warehouse_location?.trim()).filter(Boolean)
            const uniqueLocations = Array.from(new Set(locations))
            prodGroup.locationSummary = uniqueLocations.length > 0 ? uniqueLocations.join(', ') : 'N/A'
            prodGroup.hasStatusMismatch = prodVars.some((v: any) => v.hasMismatch)

            // Resolve product overall status
            const prodUniqueStatuses = Array.from(new Set(prodVars.map((v: any) => v.status)))
            if (prodUniqueStatuses.length === 1) {
              prodGroup.overallStatus = prodUniqueStatuses[0] as InventoryGroupStatus
            } else {
              prodGroup.overallStatus = 'mixed_stock' as InventoryGroupStatus
            }

            famTotalQty += prodGroup.totalQuantity
            famTotalReserved += prodGroup.totalReserved
            famTotalAvailable += prodGroup.totalAvailable
            famVariantCount += prodGroup.variantCount
            famProductCount++
            famVariants.push(...prodVars)

            productsList.push(prodGroup)

            // Add to flat list for pagination
            allProductsFlat.push({
              categoryId: catGroup.categoryId,
              categoryName: catGroup.categoryName,
              familyId: famGroup.familyId,
              familyName: famGroup.familyName,
              product: prodGroup
            })
          }

          famGroup.products = productsList
          famGroup.productCount = famProductCount
          famGroup.variantCount = famVariantCount
          famGroup.totalQuantity = famTotalQty
          famGroup.totalReserved = famTotalReserved
          famGroup.totalAvailable = famTotalAvailable

          // Resolve family overall status
          if (famVariants.length > 0) {
            const famUniqueStatuses = Array.from(new Set(famVariants.map((v: any) => v.status)))
            if (famUniqueStatuses.length === 1) {
              famGroup.overallStatus = famUniqueStatuses[0] as InventoryGroupStatus
            } else {
              famGroup.overallStatus = 'mixed_stock' as InventoryGroupStatus
            }
          } else {
            famGroup.overallStatus = 'in_stock' as InventoryGroupStatus
          }

          catTotalQty += famTotalQty
          catTotalReserved += famTotalReserved
          catTotalAvailable += famTotalAvailable
          catVariantCount += famVariantCount
          catProductCount += famProductCount

          for (const v of famVariants) {
            if (v.status === 'low_stock') catLowStockCount++
            if (v.status === 'out_of_stock') catOutOfStockCount++
          }

          familiesList.push(famGroup)
        }

        // Sort families so that "No Product Family" is always last
        familiesList.sort((a, b) => {
          if (a.familyId === null) return 1
          if (b.familyId === null) return -1
          return a.familyName.localeCompare(b.familyName)
        })

        catGroup.families = familiesList
        catGroup.productFamilyCount = catRealFamilyCount
        catGroup.productCount = catProductCount
        catGroup.variantCount = catVariantCount
        catGroup.totalQuantity = catTotalQty
        catGroup.totalReserved = catTotalReserved
        catGroup.totalAvailable = catTotalAvailable
        catGroup.lowStockVariantCount = catLowStockCount
        catGroup.outOfStockVariantCount = catOutOfStockCount

        finalCategories.push(catGroup)
      }

      // Sort categories alphabetically, Uncategorised last
      finalCategories.sort((a, b) => {
        if (a.categoryId === null) return 1
        if (b.categoryId === null) return -1
        return a.categoryName.localeCompare(b.categoryName)
      })

      // Paginate products
      const totalCount = allProductsFlat.length
      const page = options?.page ?? 1
      const pageSize = options?.pageSize ?? 25
      const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))
      const startIndex = (page - 1) * pageSize
      const paginatedProductsFlat = allProductsFlat.slice(startIndex, startIndex + pageSize)

      // Reconstruct the tree containing only the paginated products
      const paginatedCategoriesMap = new Map<string, any>()

      for (const item of paginatedProductsFlat) {
        const catKey = item.categoryId || 'uncategorised'
        const famKey = item.familyId || 'no-family'

        const origCat = categoriesMap.get(catKey)
        const origFam = origCat?.familiesMap.get(famKey)

        if (!paginatedCategoriesMap.has(catKey)) {
          paginatedCategoriesMap.set(catKey, {
            categoryId: item.categoryId,
            categoryName: item.categoryName,
            productFamilyCount: origCat.productFamilyCount,
            productCount: origCat.productCount,
            variantCount: origCat.variantCount,
            totalQuantity: origCat.totalQuantity,
            totalReserved: origCat.totalReserved,
            totalAvailable: origCat.totalAvailable,
            lowStockVariantCount: origCat.lowStockVariantCount,
            outOfStockVariantCount: origCat.outOfStockVariantCount,
            familiesMap: new Map<string, any>()
          })
        }
        const pagCat = paginatedCategoriesMap.get(catKey)!

        if (!pagCat.familiesMap.has(famKey)) {
          pagCat.familiesMap.set(famKey, {
            familyId: item.familyId,
            familyName: item.familyName,
            productCount: origFam.productCount,
            variantCount: origFam.variantCount,
            totalQuantity: origFam.totalQuantity,
            totalReserved: origFam.totalReserved,
            totalAvailable: origFam.totalAvailable,
            overallStatus: origFam.overallStatus,
            products: []
          })
        }
        const pagFam = pagCat.familiesMap.get(famKey)!

        pagFam.products.push(item.product)
      }

      const paginatedCategoriesList: any[] = []
      for (const cat of paginatedCategoriesMap.values()) {
        const fams = Array.from(cat.familiesMap.values())
        fams.sort((a: any, b: any) => {
          if (a.familyId === null) return 1
          if (b.familyId === null) return -1
          return a.familyName.localeCompare(b.familyName)
        })
        cat.families = fams
        delete cat.familiesMap
        paginatedCategoriesList.push(cat)
      }

      paginatedCategoriesList.sort((a: any, b: any) => {
        if (a.categoryId === null) return 1
        if (b.categoryId === null) return -1
        return a.categoryName.localeCompare(b.categoryName)
      })

      // Calculate global summaries across all matching products
      let totalStockUnits = 0
      let totalAvailableUnits = 0
      let lowStockVariants = 0
      let outOfStockVariants = 0
      const globalCats = new Set<string>()
      const globalFams = new Set<string>()
      const globalProds = new Set<string>()

      for (const cat of finalCategories) {
        globalCats.add(cat.categoryId || 'uncategorised')
        for (const fam of cat.families) {
          if (fam.familyId) globalFams.add(fam.familyId)
          for (const prod of fam.products) {
            globalProds.add(prod.productId)
            for (const v of prod.variants) {
              totalStockUnits += v.quantity || 0
              totalAvailableUnits += v.availableQuantity || 0
              if (v.status === 'low_stock') lowStockVariants++
              if (v.status === 'out_of_stock') outOfStockVariants++
            }
          }
        }
      }

      const summary = {
        totalCategories: globalCats.size,
        totalFamilies: globalFams.size,
        totalProducts: globalProds.size,
        totalVariants: allProductsFlat.reduce((sum, item) => sum + item.product.variants.length, 0),
        totalStockUnits,
        totalAvailableUnits,
        lowStockVariants,
        outOfStockVariants
      }

      return {
        rows: paginatedCategoriesList,
        totalCount,
        totalPages,
        page,
        pageSize,
        summary
      }
    }
  } catch (err: any) {
    console.error('[UNEXPECTED-ERROR] getInventory failed:', err.message || err)
    throw err
  }
}

export async function getInventoryHistory(inventoryId: string): Promise<any[]> {
  try {
    const supabase = createClient()
    const { data, error } = await supabase.from('inventory_transactions').select('*').eq('inventory_id', inventoryId).order('created_at', { ascending: false })
    if (!error && data) return data
  } catch (err) {
    console.error('Error in getInventoryHistory:', err)
  }
  return []
}

export interface PaginatedProductsOptions {
  search?: string
  categoryId?: string
  collectionId?: string
  minPrice?: number
  maxPrice?: number
  size?: string
  color?: string
  availability?: 'in_stock' | 'out_of_stock'
  isDiscounted?: boolean
  isFeatured?: boolean
  isTrending?: boolean
  sort?: string
  page?: number
  pageSize?: number
  isAdmin?: boolean
}

export async function getPaginatedProducts(options?: PaginatedProductsOptions): Promise<{
  products: any[]
  totalCount: number
  totalPages: number
  page: number
  pageSize: number
  fetchError?: string
}> {
  const currentPage = Number(options?.page || 1)
  const pageSize = Number(options?.pageSize || 100)
  const offset = (currentPage - 1) * pageSize

  try {
    const supabase = getSupabaseClient(options?.isAdmin)
    
    // 1. Variant filters if present
    let filteredProductIds: string[] | null = null

    if (options?.size || options?.color || options?.availability) {
      let varQuery = supabase.from('product_variants').select('product_id, inventory:inventory(quantity)')
      if (options.size) varQuery = varQuery.eq('size', options.size)
      if (options.color) varQuery = varQuery.ilike('color_name', `%${options.color}%`)

      const { data: varData } = await varQuery
      if (varData) {
        let ids = varData.map((v: any) => v.product_id)
        if (options.availability === 'in_stock') {
          ids = varData.filter((v: any) => {
            const q = Array.isArray(v.inventory) ? (v.inventory[0]?.quantity ?? 0) : (v.inventory?.quantity ?? 0)
            return q > 0
          }).map((v: any) => v.product_id)
        } else if (options.availability === 'out_of_stock') {
          ids = varData.filter((v: any) => {
            const q = Array.isArray(v.inventory) ? (v.inventory[0]?.quantity ?? 0) : (v.inventory?.quantity ?? 0)
            return q === 0
          }).map((v: any) => v.product_id)
        }
        filteredProductIds = ids
      }
    }

    if (filteredProductIds !== null && filteredProductIds.length === 0) {
      return { products: [], totalCount: 0, totalPages: 0, page: currentPage, pageSize }
    }

    // 2. Main product query using CORRECT database column names (name, selling_price, mrp, featured, trending)
    let query = supabase
      .from('products')
      .select('*, category:categories(name), collection:collections!products_collection_id_fkey(name), product_families(name), product_variants(*, sizes(*), colors(*), inventory(*)), product_images(*)', { count: 'exact' })

    if (!options?.isAdmin) {
      query = query.eq('is_active', true).eq('status', 'active')
    }

    if (options?.categoryId) query = query.eq('category_id', options.categoryId)
    if (options?.collectionId) {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(options.collectionId)
      let resolvedColId: string | null = null
      if (isUuid) {
        resolvedColId = options.collectionId
      } else {
        const { data: colData } = await supabase
          .from('collections')
          .select('id')
          .eq('slug', options.collectionId)
          .maybeSingle()
        if (colData) {
          resolvedColId = colData.id
        }
      }

      if (resolvedColId) {
        const { data: relData } = await supabase
          .from('product_collections')
          .select('product_id')
          .eq('collection_id', resolvedColId)

        const assignedIds = relData ? relData.map((r: any) => r.product_id) : []
        if (assignedIds.length > 0) {
          if (filteredProductIds !== null) {
            filteredProductIds = filteredProductIds.filter(id => assignedIds.includes(id))
          } else {
            filteredProductIds = assignedIds
          }
        } else {
          return { products: [], totalCount: 0, totalPages: 0, page: currentPage, pageSize }
        }
      } else {
        return { products: [], totalCount: 0, totalPages: 0, page: currentPage, pageSize }
      }
    }
    
    if (options?.isFeatured !== undefined) query = query.eq('featured', options.isFeatured)
    if (options?.isTrending !== undefined) query = query.eq('trending', options.isTrending)
    if (options?.isDiscounted) query = query.not('mrp', 'is', null)

    if (options?.minPrice !== undefined) query = query.gte('selling_price', options.minPrice)
    if (options?.maxPrice !== undefined) query = query.lte('selling_price', options.maxPrice)

    if (filteredProductIds !== null) {
      query = query.in('id', filteredProductIds)
    }

    if (options?.search) {
      const searchVal = `%${options.search}%`
      
      const { data: catMatches } = await supabase.from('categories').select('id').ilike('name', searchVal)
      const catIds = (catMatches || []).map((c: any) => c.id)

      const { data: colMatches } = await supabase.from('collections').select('id').ilike('name', searchVal)
      const colIds = (colMatches || []).map((c: any) => c.id)

      const { data: varMatches } = await supabase.from('product_variants').select('product_id').ilike('sku', searchVal)
      const varProdIds = (varMatches || []).map((v: any) => v.product_id)

      let orFilter = `name.ilike.${searchVal},description.ilike.${searchVal},sku.ilike.${searchVal}`
      if (catIds.length > 0) orFilter += `,category_id.in.(${catIds.join(',')})`
      if (colIds.length > 0) orFilter += `,collection_id.in.(${colIds.join(',')})`
      if (varProdIds.length > 0) orFilter += `,id.in.(${varProdIds.join(',')})`

      query = query.or(orFilter)
    }

    if (options?.sort === 'price-low') query = query.order('selling_price', { ascending: true })
    else if (options?.sort === 'price-high') query = query.order('selling_price', { ascending: false })
    else if (options?.sort === 'alphabetical-az') query = query.order('name', { ascending: true })
    else if (options?.sort === 'alphabetical-za') query = query.order('name', { ascending: false })
    else query = query.order('created_at', { ascending: false })

    query = query.range(offset, offset + pageSize - 1)

    const res = await query
    let data = res.data
    let count = res.count
    const error = res.error

    // Migration fallback if join query fails
    if (error) {
      console.warn('Primary products query failed, using safe fallback:', error.message)
      const fallback = await supabase.from('products').select('*', { count: 'exact' }).range(offset, offset + pageSize - 1)
      data = fallback.data
      count = fallback.count
      if (fallback.error) {
        return { products: [], totalCount: 0, totalPages: 0, page: currentPage, pageSize, fetchError: fallback.error.message }
      }
    }

    if (data) {
      const productIds = data.map((p: any) => p.id)
      const imagesByProduct: Record<string, any[]> = {}

      if (productIds.length > 0) {
        const { data: dbImages } = await supabase
          .from('product_images')
          .select('*')
          .in('product_id', productIds)
          .order('display_order', { ascending: true })

        if (dbImages && dbImages.length > 0) {
          dbImages.forEach((img: any) => {
            if (!imagesByProduct[img.product_id]) {
              imagesByProduct[img.product_id] = []
            }
            imagesByProduct[img.product_id].push(img)
          })
        }
      }

      const totalCount = count || data.length
      const totalPages = Math.ceil(totalCount / pageSize)

      if (options?.isAdmin) {
        const adminProducts = data.map((p: any) => {
          const dbImages = imagesByProduct[p.id] || []
          return mapDbToAdminProduct({
            ...p,
            product_images: dbImages
          })
        })

        return {
          products: adminProducts,
          totalCount,
          totalPages,
          page: currentPage,
          pageSize
        }
      }
    }
  } catch (err: any) {
    console.error('Error in getPaginatedProducts service:', err)
    return { products: [], totalCount: 0, totalPages: 0, page: currentPage, pageSize, fetchError: err.message }
  }

  return { products: [], totalCount: 0, totalPages: 0, page: currentPage, pageSize }
}

export type StorefrontColourway = {
  productId: string;
  slug: string;
  title: string;
  sku: string;
  familyId: string;
  primaryColorId: string;
  colorName: string;
  hexCode: string | null;
  imageUrl: string;
  sellingPrice: number;
  mrp: number | null;
  availableStock: number;
  availableSizes: string[];
  isCurrent: boolean;
};

export async function getProductColourways(
  familyId: string,
  currentProductId: string
): Promise<{ success: boolean; data?: StorefrontColourway[]; error?: string }> {
  try {
    const supabase = createClient()

    // 1. Fetch the product family record to verify it is active
    const { data: familyRow, error: famErr } = await supabase
      .from('product_families')
      .select('is_active')
      .eq('id', familyId)
      .maybeSingle()

    if (famErr) {
      console.error("Error fetching product family", {
        message: famErr.message,
        code: famErr.code,
        details: famErr.details,
        hint: famErr.hint,
        familyId
      })
      return { success: false, error: 'Unable to load colour options.' }
    }

    if (!familyRow || !familyRow.is_active) {
      return { success: true, data: [] }
    }

    // 2. Fetch all members of the family that are active and published
    const { data: members, error: membersErr } = await supabase
      .from('products')
      .select(`
        id,
        name,
        slug,
        sku,
        product_family_id,
        primary_color_id,
        colorway_sort_order,
        show_color_option,
        is_active,
        status,
        selling_price,
        mrp,
        created_at,
        primary_color:colors!products_primary_color_id_fkey(name, hex_code)
      `)
      .eq('product_family_id', familyId)
      .eq('is_active', true)
      .eq('status', 'active')

    if (membersErr) {
      console.error("Error fetching family members", {
        message: membersErr.message,
        code: membersErr.code,
        details: membersErr.details,
        hint: membersErr.hint,
        familyId
      })
      return { success: false, error: 'Unable to load colour options.' }
    }

    if (!members || members.length === 0) {
      return { success: true, data: [] }
    }

    const list: StorefrontColourway[] = []
    const seenColorIds = new Set<string>()

    for (const m of members) {
      // Missing colour safety: member with no primary_color_id is incomplete
      if (!m.primary_color_id) {
        console.warn(`[DATA-INTEGRITY] Product family member ${m.id} (${m.name}) has no primary_color_id. Excluded from storefront colourways.`)
        continue
      }

      // Duplicate colour safety
      if (seenColorIds.has(m.primary_color_id)) {
        console.warn(`[DATA-INTEGRITY] Duplicate primary_color_id ${m.primary_color_id} detected in product family ${familyId}. Product ${m.id} (${m.name}) excluded.`)
        continue
      }
      seenColorIds.add(m.primary_color_id)

      // Fetch images for this member
      const { data: dbImages } = await supabase
        .from('product_images')
        .select('*')
        .eq('product_id', m.id)

      // Determine cover image:
      // 1) is_primary = true
      // 2) lowest display_order
      // 3) first valid image URL
      // 4) fallback
      let coverUrl = '/images/product-placeholder.webp'
      if (dbImages && dbImages.length > 0) {
        const sorted = [...dbImages].sort((a: any, b: any) => {
          if (a.is_primary && !b.is_primary) return -1
          if (!a.is_primary && b.is_primary) return 1
          const orderA = a.display_order ?? 999999
          const orderB = b.display_order ?? 999999
          if (orderA !== orderB) return orderA - orderB
          return (a.image_url || '').localeCompare(b.image_url || '')
        })
        if (sorted[0]?.image_url) {
          coverUrl = sorted[0].image_url
        }
      }

      // Fetch variants to compute available stock and sizes for this member
      const { data: dbVariants } = await supabase
        .from('product_variants')
        .select(`
          id,
          is_active,
          size_id,
          size:sizes(name),
          inventory(quantity, reserved_quantity, available_quantity)
        `)
        .eq('product_id', m.id)
        .eq('is_active', true)

      let totalStock = 0
      const activeSizes: string[] = []

      if (dbVariants) {
        for (const v of dbVariants) {
          const invObj = Array.isArray(v.inventory) ? v.inventory[0] : v.inventory
          const qty = Number(invObj?.quantity) || 0
          const res = Number(invObj?.reserved_quantity) || 0
          const stock = invObj?.available_quantity ?? Math.max(qty - res, 0)
          totalStock += stock
          const sizeName = (v.size as any)?.name
          if (sizeName) {
            activeSizes.push(sizeName)
          }
        }
      }

      const colorObj = Array.isArray(m.primary_color) ? m.primary_color[0] : m.primary_color;

      list.push({
        productId: m.id,
        slug: m.slug,
        title: m.name,
        sku: m.sku,
        familyId: m.product_family_id || '',
        primaryColorId: m.primary_color_id,
        colorName: colorObj?.name || 'Unknown',
        hexCode: colorObj?.hex_code || null,
        imageUrl: coverUrl,
        sellingPrice: Number(m.selling_price || 0),
        mrp: m.mrp ? Number(m.mrp) : null,
        availableStock: totalStock,
        availableSizes: activeSizes,
        isCurrent: m.id === currentProductId
      })
    }

    // Sort order:
    // 1) colorway_sort_order
    // 2) created_at
    // 3) title
    const sortedList = list.sort((a, b) => {
      // Find colorway_sort_order in members list
      const memA = members.find(m => m.id === a.productId)
      const memB = members.find(m => m.id === b.productId)
      const ordA = memA?.colorway_sort_order ?? 9999
      const ordB = memB?.colorway_sort_order ?? 9999
      if (ordA !== ordB) return ordA - ordB

      const timeA = new Date(memA?.created_at || 0).getTime()
      const timeB = new Date(memB?.created_at || 0).getTime()
      if (timeA !== timeB) return timeA - timeB

      return a.title.localeCompare(b.title)
    })

    return { success: true, data: sortedList }
  } catch (err: any) {
    console.error('Unexpected error in getProductColourways:', err)
    return { success: false, error: 'Unable to load colour options.' }
  }
}
