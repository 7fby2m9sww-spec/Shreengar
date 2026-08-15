'use server'

import { isUserActiveAdmin, requireAdmin } from '@/services/auth'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath, updateTag } from 'next/cache'
import { checkUserPermission } from '@/services/admin'
import {
  validateProduct,
  validateCategory,
  validateCollection,
  ProductInput,
  CategoryInput,
  CollectionInput
} from '@/lib/validation/catalog'
import { validateVariant, VariantInput } from '@/lib/validation/variant'
import {
  createProduct as createProductService,
  updateProduct as updateProductService,
  deleteProduct as deleteProductService,
  getCategories as getCategoriesService,
  createCategory as createCategoryService,
  updateCategory as updateCategoryService,
  deleteCategory as deleteCategoryService,
  createCollection as createCollectionService,
  updateCollection as updateCollectionService,
  deleteCollection as deleteCollectionService,
  getAdminCollections,
  getCollectionProductsForAdmin,
  updateCollectionProductAssignments,
  deleteProductImage as deleteProductImageService,
  reorderProductImages as reorderProductImagesService,
  setProductFeaturedImage as setProductFeaturedImageService,
  createVariant as createVariantService,
  updateVariant as updateVariantService,
  deleteVariant as deleteVariantService,
  updateInventory as updateInventoryService,
  adjustInventory as adjustInventoryService,
  getProductFamilies as getProductFamiliesService,
  createProductFamily as createProductFamilyService,
  unlinkProductFromFamily as unlinkProductFromFamilyService,
  linkProductToFamily as linkProductToFamilyService,
  duplicateProductAsColourway as duplicateProductAsColourwayService,
  deleteProductFamily as deleteProductFamilyService,
  getSizes as getSizesService,
  generateProductSku as generateProductSkuService,
  resolveCategory,
  ProductMutationResult
} from '@/services/admin/products'

import {
  getVariants as getVariantsService,
  getInventory as getInventoryService,
  getInventoryHistory as getInventoryHistoryService,
  getPaginatedProducts,
  getProductVariants as getProductVariantsService,
  PaginatedProductsOptions
} from '@/services/products'
import { mapDbToAdminProduct } from '@/lib/mappers/product'
import { AdminProduct } from '@/types/database'

export async function getProductVariantsAction(productId: string) {
  try {
    const data = await getProductVariantsService(productId)
    return { data }
  } catch (err: any) {
    return { error: err.message }
  }
}

export async function checkAdminAuth(permissionCode?: string): Promise<string> {
  const adminPayload = await requireAdmin()

  if (permissionCode) {
    const hasPerm = await checkUserPermission(adminPayload.email, permissionCode)
    if (!hasPerm) {
      throw new Error(`Access Denied. Missing required permission: ${permissionCode}`)
    }
  }

  return adminPayload.userId
}

async function revalidateProductRoutes(
  productId: string, 
  categoryId: string | null | undefined, 
  collectionId: string | null | undefined
) {
  try {
    const supabase = await createClient()
    let categorySlug = ''
    let collectionSlug = ''
    
    if (categoryId) {
      const { data: cat } = await supabase.from('categories').select('slug').eq('id', categoryId).maybeSingle()
      if (cat?.slug) categorySlug = cat.slug
    }
    if (collectionId) {
      const { data: col } = await supabase.from('collections').select('slug').eq('id', collectionId).maybeSingle()
      if (col?.slug) collectionSlug = col.slug
    }

    revalidatePath('/admin/products')
    revalidatePath('/admin/inventory')
    revalidatePath('/')
    revalidatePath('/shop')
    revalidatePath('/wishlist')
    revalidatePath('/cart')
    revalidatePath(`/product/${productId}`)

    if (categorySlug) {
      revalidatePath(`/category/${categorySlug}`)
    }
    if (collectionSlug) {
      revalidatePath(`/collection/${collectionSlug}`)
    }
  } catch (err) {
    console.error('Error during revalidateProductRoutes:', err)
  }
}

export async function createProductAction(data: ProductInput, categoryName: string): Promise<ProductMutationResult> {
  try {
    await checkAdminAuth('manage_products')

    // Resolve Category
    const catRes = await resolveCategory(categoryName)
    if (!catRes.success || !catRes.data) {
      return { success: false, error: catRes.error || 'Failed to resolve category.' }
    }
    
    // Assign resolved category ID to the data
    data.category_id = catRes.data

    const validation = validateProduct(data)
    if (validation.error || !validation.data) {
      return { success: false, error: validation.error || 'Invalid product details.' }
    }

    const res = await createProductService(validation.data as ProductInput)
    if (res.success || res.partialSuccess) {
      const pId = res.productId || res.product?.id
      if (pId) {
        await revalidateProductRoutes(pId, validation.data.category_id, validation.data.collection_id)
      }
      return res
    }
    return res
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

export async function updateProductAction(id: string, data: Partial<ProductInput>, categoryName: string): Promise<ProductMutationResult> {
  try {
    await checkAdminAuth('manage_products')

    // Resolve Category
    const catRes = await resolveCategory(categoryName)
    if (!catRes.success || !catRes.data) {
      return { success: false, error: catRes.error || 'Failed to resolve category.' }
    }
    
    // Assign resolved category ID to the data
    data.category_id = catRes.data

    const validation = validateProduct(data)
    if (validation.error || !validation.data) {
      return { success: false, error: validation.error || 'Invalid product details.' }
    }

    const res = await updateProductService(id, validation.data)
    if (res.success || res.partialSuccess) {
      await revalidateProductRoutes(id, validation.data.category_id, validation.data.collection_id)

      // Cache tag invalidations:
      updateTag('products')
      updateTag(`product:${id}`)
      updateTag(`product-variants:${id}`)
      const famId = validation.data.product_family_id
      if (famId) {
        updateTag(`product-family:${famId}`)
        updateTag(`product-colourways:${famId}`)
      }
      const catId = validation.data.category_id
      if (catId) {
        updateTag(`category:${catId}`)
      }
      const colId = validation.data.collection_id
      if (colId) {
        updateTag(`collection:${colId}`)
      }
      return res
    }
    return res
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

export async function deleteProductAction(id: string) {
  try {
    await checkAdminAuth('manage_products')

    // Fetch details before deletion for cache revalidation
    const supabase = await createClient()
    const { data: prod } = await supabase
      .from('products')
      .select('product_family_id, category_id, collection_id')
      .eq('id', id)
      .maybeSingle()

    const res = await deleteProductService(id)
    if (res.success) {
      await revalidateProductRoutes(id, prod?.category_id, prod?.collection_id)

      // Cache tag invalidations:
      updateTag('products')
      updateTag(`product:${id}`)
      if (prod?.product_family_id) {
        updateTag(`product-family:${prod.product_family_id}`)
        updateTag(`product-colourways:${prod.product_family_id}`)
      }
      if (prod?.category_id) {
        updateTag(`category:${prod.category_id}`)
      }
      if (prod?.collection_id) {
        updateTag(`collection:${prod.collection_id}`)
      }
      return { success: true }
    }
    return { error: res.error || 'Failed to delete product.' }
  } catch (err: any) {
    return { error: err.message }
  }
}

// ----------------------------------------------------
// Category Server Actions
// ----------------------------------------------------

export async function getCategoriesAction() {
  try {
    await checkAdminAuth()
    const data = await getCategoriesService()
    return { success: true, data }
  } catch (err: any) {
    return { success: false, error: err.message, data: [] }
  }
}

export async function getCategoriesWithCountAction() {
  try {
    await checkAdminAuth()
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('categories')
      .select('*, products(id)')
      .order('display_order', { ascending: true })

    if (error) {
      return { error: error.message }
    }

    const categories = (data || []).map((cat: any) => ({
      ...cat,
      product_count: Array.isArray(cat.products) ? cat.products.length : 0
    }))

    return { data: categories }
  } catch (err: any) {
    return { error: err.message }
  }
}

export async function getCategoryDetailsAction(id: string) {
  try {
    await checkAdminAuth()
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('categories')
      .select('*, products(id)')
      .eq('id', id)
      .maybeSingle()

    if (error) {
      return { error: error.message }
    }
    if (!data) {
      return { error: 'Category not found.' }
    }

    const category = {
      ...data,
      product_count: Array.isArray(data.products) ? data.products.length : 0
    }

    return { data: category }
  } catch (err: any) {
    return { error: err.message }
  }
}

export async function getCategoryProductsAction(categoryId: string) {
  try {
    await checkAdminAuth()
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('products')
      .select('*, category:categories(name), collection:collections!products_collection_id_fkey(name), product_variants(stock)')
      .eq('category_id', categoryId)
      .order('created_at', { ascending: false })

    if (error) {
      return { error: error.message }
    }

    const products = (data || []).map((dbProduct: any) => {
      const totalStock = (dbProduct.product_variants || []).reduce((acc: number, v: any) => acc + (v.stock || 0), 0)
      const adminProduct: AdminProduct = mapDbToAdminProduct(dbProduct)
      return {
        ...adminProduct,
        stock_quantity: totalStock
      }
    })

    return { data: products }
  } catch (err: any) {
    return { error: err.message }
  }
}

export async function createCategoryAction(data: Partial<CategoryInput>) {
  try {
    await checkAdminAuth('manage_categories')
    const validation = validateCategory(data)
    if (validation.error || !validation.data) {
      return { error: validation.error || 'Invalid category details.' }
    }

    // Server-side parent validation
    if (validation.data.parent_id) {
      const supabase = await createClient()
      const { data: parentCat } = await supabase
        .from('categories')
        .select('id')
        .eq('id', validation.data.parent_id)
        .maybeSingle()

      if (!parentCat) {
        return { error: 'Select a valid parent category. A category cannot be placed inside itself or one of its descendants.' }
      }
    }

    const res = await createCategoryService(validation.data)
    if (res.success) {
      revalidatePath('/admin/categories')
      revalidatePath('/admin/products')
      revalidatePath('/')
      revalidatePath('/shop')
      if (res.data?.slug) {
        revalidatePath(`/category/${res.data.slug}`)
      }
      return { success: true, data: res.data }
    }
    return { error: res.error || 'Failed to create category.' }
  } catch (err: any) {
    return { error: err.message }
  }
}

export async function updateCategoryAction(id: string, data: Partial<CategoryInput>) {
  try {
    await checkAdminAuth('manage_categories')
    const validation = validateCategory(data)
    if (validation.error || !validation.data) {
      return { error: validation.error || 'Invalid category details.' }
    }

    // Server-side parent and circular reference validation
    if (validation.data.parent_id) {
      if (validation.data.parent_id === id) {
        return { error: 'Select a valid parent category. A category cannot be placed inside itself or one of its descendants.' }
      }

      const supabase = await createClient()
      const { data: allCats } = await supabase.from('categories').select('id, parent_id')
      if (allCats) {
        let currentParentId: string | null = validation.data.parent_id
        const visited = new Set<string>()

        while (currentParentId) {
          if (currentParentId === id) {
            return { error: 'Select a valid parent category. A category cannot be placed inside itself or one of its descendants.' }
          }
          if (visited.has(currentParentId)) break
          visited.add(currentParentId)
          const parentNode = allCats.find(c => c.id === currentParentId)
          currentParentId = parentNode?.parent_id || null
        }
      }
    }

    const res = await updateCategoryService(id, validation.data)
    if (res.success) {
      revalidatePath('/admin/categories')
      revalidatePath(`/admin/categories/${id}`)
      revalidatePath('/admin/products')
      revalidatePath('/')
      revalidatePath('/shop')
      if (res.data?.slug) {
        revalidatePath(`/category/${res.data.slug}`)
      }
      return { success: true, data: res.data }
    }
    return { error: res.error || 'Failed to update category.' }
  } catch (err: any) {
    return { error: err.message }
  }
}

export async function deleteCategoryAction(id: string) {
  try {
    await checkAdminAuth('manage_categories')
    
    const supabase = await createClient()

    // 1. Check if category has child categories
    const { count: childCount, error: childErr } = await supabase
      .from('categories')
      .select('id', { count: 'exact', head: true })
      .eq('parent_id', id)

    if (childErr) {
      return { error: 'Database error verifying child categories.' }
    }
    if (childCount && childCount > 0) {
      return { error: `Move or delete the ${childCount} child categories before deleting this category.` }
    }

    // 2. Check if category has any products
    const { count: prodCount, error: prodErr } = await supabase
      .from('products')
      .select('id', { count: 'exact', head: true })
      .eq('category_id', id)

    if (prodErr) {
      return { error: 'Database error verifying category products.' }
    }
    if (prodCount && prodCount > 0) {
      return { error: `This category contains ${prodCount} products. Move or delete those products before deleting the category.` }
    }

    const res = await deleteCategoryService(id)
    if (res.success) {
      revalidatePath('/admin/categories')
      revalidatePath('/admin/products')
      revalidatePath('/')
      revalidatePath('/shop')
      return { success: true }
    }
    return { error: res.error || 'Failed to delete category.' }
  } catch (err: any) {
    // Handle foreign key constraint race conditions safely
    if (err?.code === '23503' || err?.message?.includes('foreign key')) {
      return { error: 'Cannot delete category because linked products or subcategories still exist.' }
    }
    return { error: err.message || 'Failed to delete category.' }
  }
}

// ----------------------------------------------------
// Collection Server Actions
// ----------------------------------------------------

export async function createCollectionAction(data: Partial<CollectionInput>) {
  try {
    await checkAdminAuth('manage_collections')
    const validation = validateCollection(data)
    if (validation.error || !validation.data) {
      return { error: validation.error || 'Invalid collection details.' }
    }

    const res = await createCollectionService(validation.data)
    if (res.success) {
      revalidatePath('/admin/collections')
      revalidatePath('/admin/homepage')
      revalidatePath('/')
      return { success: true, data: res.data }
    }
    return { error: res.error || 'Failed to create collection.' }
  } catch (err: any) {
    return { error: err.message }
  }
}

export async function updateCollectionAction(id: string, data: Partial<CollectionInput>) {
  try {
    await checkAdminAuth('manage_collections')
    const validation = validateCollection(data)
    if (validation.error || !validation.data) {
      return { error: validation.error || 'Invalid collection details.' }
    }

    const res = await updateCollectionService(id, validation.data)
    if (res.success) {
      revalidatePath('/admin/collections')
      revalidatePath('/admin/homepage')
      revalidatePath('/')
      if (res.data?.slug) {
        revalidatePath(`/collection/${res.data.slug}`)
      }
      return { success: true, data: res.data }
    }
    return { error: res.error || 'Failed to update collection.' }
  } catch (err: any) {
    return { error: err.message }
  }
}

export async function deleteCollectionAction(id: string) {
  try {
    await checkAdminAuth('manage_collections')
    const res = await deleteCollectionService(id)
    if (res.success) {
      revalidatePath('/admin/collections')
      return { success: true }
    }
    return { error: res.error || 'Failed to delete collection.' }
  } catch (err: any) {
    return { error: err.message }
  }
}

export async function getAdminCollectionsAction() {
  try {
    await checkAdminAuth('manage_collections')
    const data = await getAdminCollections()
    return { success: true, data }
  } catch (err: any) {
    return { error: err.message }
  }
}

export async function getCollectionProductsForAdminAction(collectionId: string) {
  try {
    await checkAdminAuth('manage_collections')
    const data = await getCollectionProductsForAdmin(collectionId)
    return { success: true, data }
  } catch (err: any) {
    return { error: err.message }
  }
}

export async function updateCollectionProductAssignmentsAction(
  collectionId: string, 
  assignments: { product_id: string; sort_order: number }[]
) {
  try {
    await checkAdminAuth('manage_collections')
    const res = await updateCollectionProductAssignments(collectionId, assignments)
    if (res.success) {
      const supabase = await createClient()
      const { data: col } = await supabase.from('collections').select('slug').eq('id', collectionId).maybeSingle()
      if (col?.slug) {
        revalidatePath(`/collection/${col.slug}`)
      }
      revalidatePath('/')
      revalidatePath('/admin/collections')
      return { success: true }
    }
    return { error: res.error || 'Failed to update product assignments.' }
  } catch (err: any) {
    return { error: err.message }
  }
}

export async function deleteProductImageAction(imageId: string) {
  try {
    await checkAdminAuth('manage_products')
    const res = await deleteProductImageService(imageId)
    if (res.success) {
      revalidatePath('/admin/products')
      return { success: true }
    }
    return { error: res.error || 'Failed to delete product image.' }
  } catch (err: any) {
    return { error: err.message }
  }
}

export async function reorderProductImagesAction(productId: string, orderedImageUrls: string[]) {
  try {
    await checkAdminAuth('manage_products')
    const res = await reorderProductImagesService(productId, orderedImageUrls)
    if (res.success) {
      revalidatePath('/admin/products')
      return { success: true }
    }
    return { error: res.error || 'Failed to reorder product images.' }
  } catch (err: any) {
    return { error: err.message }
  }
}

export async function setProductFeaturedImageAction(productId: string, featuredImageUrl: string) {
  try {
    await checkAdminAuth('manage_products')
    const res = await setProductFeaturedImageService(productId, featuredImageUrl)
    if (res.success) {
      revalidatePath('/admin/products')
      return { success: true }
    }
    return { error: res.error || 'Failed to set featured image.' }
  } catch (err: any) {
    return { error: err.message }
  }
}

export async function createVariantAction(data: Partial<VariantInput>) {
  try {
    await checkAdminAuth('manage_variants')
    const validation = validateVariant(data)
    if (validation.error || !validation.data) {
      return { error: validation.error || 'Invalid variant details.' }
    }

    const res = await createVariantService(validation.data)
    if (res.success) {
      revalidatePath('/admin/variants')
      revalidatePath('/admin/inventory')
      return { success: true, data: res.data }
    }
    return { error: res.error || 'Failed to create variant.' }
  } catch (err: any) {
    return { error: err.message }
  }
}

export async function updateVariantAction(id: string, data: Partial<VariantInput>) {
  try {
    await checkAdminAuth('manage_variants')
    const validation = validateVariant(data)
    if (validation.error || !validation.data) {
      return { error: validation.error || 'Invalid variant details.' }
    }

    const res = await updateVariantService(id, validation.data)
    if (res.success) {
      revalidatePath('/admin/variants')
      revalidatePath('/admin/inventory')
      return { success: true }
    }
    return { error: res.error || 'Failed to update variant.' }
  } catch (err: any) {
    return { error: err.message }
  }
}

export async function deleteVariantAction(id: string) {
  try {
    await checkAdminAuth('manage_variants')
    const res = await deleteVariantService(id)
    if (res.success) {
      revalidatePath('/admin/variants')
      revalidatePath('/admin/inventory')
      return { success: true }
    }
    return { error: res.error || 'Failed to delete variant.' }
  } catch (err: any) {
    return { error: err.message }
  }
}

export async function getVariantsAction() {
  try {
    await checkAdminAuth('view_variants')
    const data = await getVariantsService()
    return { success: true, data }
  } catch (err: any) {
    return { error: err.message }
  }
}

export async function updateInventoryAction(
  id: string,
  data: { reorder_level?: number; warehouse_location?: string }
) {
  try {
    await checkAdminAuth('manage_inventory')
    const res = await updateInventoryService(id, data)
    if (res.success) {
      revalidatePath('/admin/inventory')
      return { success: true }
    }
    return { error: res.error || 'Failed to update inventory.' }
  } catch (err: any) {
    return { error: err.message }
  }
}

export async function adjustInventoryAction(
  inventoryId: string,
  quantity: number,
  type: 'delta' | 'exact',
  reason: string
) {
  try {
    const adminUserId = await checkAdminAuth('manage_inventory')

    if (reason.trim() === '') {
      return { error: 'Adjustment reason is required.' }
    }

    const res = await adjustInventoryService(inventoryId, quantity, type, reason, adminUserId)
    if (res.success) {
      revalidatePath('/admin/inventory')
      revalidatePath('/admin/variants')

      try {
        const supabase = await createClient()
        const { data: inv } = await supabase
          .from('inventory')
          .select('variant_id, product_variants(product_id, products(category_id, collection_id))')
          .eq('id', inventoryId)
          .maybeSingle()

        const pId = (inv?.product_variants as any)?.product_id
        if (pId) {
          const catId = (inv?.product_variants as any)?.products?.category_id
          const colId = (inv?.product_variants as any)?.products?.collection_id
          await revalidateProductRoutes(pId, catId, colId)
        }
      } catch (err) {
        console.error('Error in adjustInventoryAction revalidation:', err)
      }

      return { success: true }
    }
    return { error: res.error || 'Failed to adjust inventory.' }
  } catch (err: any) {
    return { error: err.message }
  }
}

export async function getInventoryAction(options?: {
  page?: number
  pageSize?: number
  search?: string
  categoryId?: string
  colorId?: string
  sizeId?: string
  status?: string
  viewMode?: 'grouped' | 'variant'
  productFamilyId?: string
}) {
  try {
    await checkAdminAuth('view_inventory')
    const result = await getInventoryService(options)
    return {
      success: true,
      rows: result.rows,
      page: result.page,
      pageSize: result.pageSize,
      totalCount: result.totalCount,
      totalPages: result.totalPages,
      summary: result.summary
    }
  } catch (err: any) {
    return {
      success: false,
      error: err.message,
      rows: [],
      page: 1,
      pageSize: 25,
      totalCount: 0,
      totalPages: 0,
      summary: undefined
    }
  }
}

export async function getInventoryHistoryAction(inventoryId: string) {
  try {
    await checkAdminAuth('view_inventory')
    const data = await getInventoryHistoryService(inventoryId)
    return { success: true, data }
  } catch (err: any) {
    return { error: err.message }
  }
}

// ----------------------------------------------------
// Paginated Products Server Action (Admin + Storefront)
// ----------------------------------------------------

export async function getPaginatedProductsAction(options?: PaginatedProductsOptions) {
  try {
    // Admin-only path requires auth
    if (options?.isAdmin) {
      await checkAdminAuth('view_products')
    }
    const result = await getPaginatedProducts(options)
    return { success: true, ...result }
  } catch (err: any) {
    return { error: err.message }
  }
}

// ----------------------------------------------------
// Product Family Server Actions
// ----------------------------------------------------

export async function getProductFamiliesAction(options?: { activeOnly?: boolean }) {
  try {
    await checkAdminAuth('manage_products')
    const res = await getProductFamiliesService(options)
    return res
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

export async function createProductFamilyAction(name: string, categoryId?: string | null, internalRef?: string | null, isActive: boolean = true) {
  try {
    await checkAdminAuth('manage_products')

    const cleanName = name ? name.trim() : ''
    if (!cleanName) {
      return { success: false, error: 'Enter a Product Family name.' }
    }

    const res = await createProductFamilyService(cleanName, categoryId || null, internalRef ? internalRef.trim() : null, isActive)
    if (res.success) {
      revalidatePath('/admin/products')
      revalidatePath('/admin/product-families')
      updateTag('product-families')
      return res
    }
    return res
  } catch (err: any) {
    return { success: false, error: err.message || 'Unable to create the Product Family.' }
  }
}

export async function unlinkProductFromFamilyAction(productId: string) {
  try {
    await checkAdminAuth('manage_products')

    // Fetch product details for cache invalidation
    const supabase = await createClient()
    const { data: prod } = await supabase
      .from('products')
      .select('product_family_id, category_id, collection_id')
      .eq('id', productId)
      .maybeSingle()

    // Fetch all members of the family before unlinking
    let familyMembers: any[] = []
    const oldFamilyId = prod?.product_family_id
    if (oldFamilyId) {
      const { data: members } = await supabase
        .from('products')
        .select('id')
        .eq('product_family_id', oldFamilyId)
      familyMembers = members || []
    }

    const res = await unlinkProductFromFamilyService(productId)
    if (res.success) {
      revalidatePath('/admin/products')
      revalidatePath('/admin/product-families')
      revalidatePath('/')
      revalidatePath('/shop')
      revalidatePath(`/product/${productId}`)

      // Revalidate previously linked family members
      for (const member of familyMembers) {
        if (member.id) {
          revalidatePath(`/product/${member.id}`)
        }
      }

      // Cache tag invalidations:
      updateTag('products')
      updateTag(`product:${productId}`)
      updateTag(`product-variants:${productId}`)
      if (oldFamilyId) {
        updateTag(`product-family:${oldFamilyId}`)
        updateTag(`product-colourways:${oldFamilyId}`)
      }
      return res
    }
    return res
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

export async function linkProductToFamilyAction(productId: string, familyId: string, primaryColorId?: string | null) {
  try {
    await checkAdminAuth('manage_products')

    // Fetch current product details to check previous family
    const supabase = await createClient()
    const { data: prod } = await supabase
      .from('products')
      .select('product_family_id, category_id, collection_id')
      .eq('id', productId)
      .maybeSingle()

    const oldFamilyId = prod?.product_family_id

    // Fetch previously linked family members (from old family)
    let prevMembers: any[] = []
    if (oldFamilyId) {
      const { data: members } = await supabase
        .from('products')
        .select('id')
        .eq('product_family_id', oldFamilyId)
      prevMembers = members || []
    }

    // Fetch newly linked family members (from new family)
    let newMembers: any[] = []
    if (familyId) {
      const { data: members } = await supabase
        .from('products')
        .select('id')
        .eq('product_family_id', familyId)
      newMembers = members || []
    }

    const res = await linkProductToFamilyService(productId, familyId, primaryColorId)
    if (res.success) {
      revalidatePath('/admin/products')
      revalidatePath('/admin/product-families')
      revalidatePath('/')
      revalidatePath('/shop')
      revalidatePath(`/product/${productId}`)

      // Revalidate previously linked family members
      for (const member of prevMembers) {
        if (member.id) {
          revalidatePath(`/product/${member.id}`)
        }
      }

      // Revalidate newly linked family members
      for (const member of newMembers) {
        if (member.id) {
          revalidatePath(`/product/${member.id}`)
        }
      }

      // Cache tag invalidations:
      updateTag('products')
      updateTag(`product:${productId}`)
      updateTag(`product-variants:${productId}`)
      updateTag(`product-family:${familyId}`)
      updateTag(`product-colourways:${familyId}`)
      if (oldFamilyId) {
        updateTag(`product-family:${oldFamilyId}`)
        updateTag(`product-colourways:${oldFamilyId}`)
      }
      return res
    }
    return res
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

export async function duplicateProductAsColourwayAction(
  sourceProductId: string,
  newPrimaryColorId: string,
  newColorName: string,
  newTitle: string,
  newSkuPrefix: string,
  copyImages: boolean = false
) {
  try {
    await checkAdminAuth('manage_products')
    const res = await duplicateProductAsColourwayService(sourceProductId, newPrimaryColorId, newColorName, newTitle, newSkuPrefix, copyImages)
    if (res.success) {
      const newProd = res.data
      const newProductId = newProd?.id
      const familyId = newProd?.product_family_id

      // Fetch family members
      let familyMembers: any[] = []
      if (familyId) {
        const supabase = await createClient()
        const { data: members } = await supabase
          .from('products')
          .select('id')
          .eq('product_family_id', familyId)
        familyMembers = members || []
      }

      revalidatePath('/admin/products')
      revalidatePath('/admin/product-families')
      revalidatePath('/')
      revalidatePath('/shop')
      revalidatePath(`/product/${sourceProductId}`)
      if (newProductId) {
        revalidatePath(`/product/${newProductId}`)
      }
      for (const member of familyMembers) {
        if (member.id) {
          revalidatePath(`/product/${member.id}`)
        }
      }

      // Cache tag invalidations:
      updateTag('products')
      updateTag(`product:${sourceProductId}`)
      updateTag(`product-variants:${sourceProductId}`)
      if (newProductId) {
        updateTag(`product:${newProductId}`)
        updateTag(`product-variants:${newProductId}`)
      }
      if (familyId) {
        updateTag(`product-family:${familyId}`)
        updateTag(`product-colourways:${familyId}`)
      }
      return res
    }
    return res
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

export async function deleteProductFamilyAction(familyId: string) {
  try {
    await checkAdminAuth('manage_products')
    const res = await deleteProductFamilyService(familyId)
    if (res.success) {
      revalidatePath('/admin/product-families')
      revalidatePath('/admin/products')
      return res
    }
    return res
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

export async function getSizesAction() {
  try {
    const { data, error } = await getSizesService()
    if (error) return { data: [], error }
    return { data: data || [] }
  } catch (err: any) {
    return { data: [], error: err.message || 'Failed to fetch sizes.' }
  }
}

export async function generateProductSkuAction(categoryId?: string | null, colorId?: string | null) {
  try {
    const res = await generateProductSkuService(categoryId, colorId)
    return res
  } catch (err: any) {
    return { sku: 'SHR-KUR-MRN-001', error: err.message }
  }
}

export async function getColorsAction() {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('colors')
      .select('*')
      .order('display_order', { ascending: true })
    if (error) return { data: [], error: error.message }
    return { data: data || [] }
  } catch (err: any) {
    return { data: [], error: err.message }
  }
}

export async function createColorAction(data: {
  name: string
  code: string
  hex_code: string
  is_active: boolean
  display_order: number
}) {
  try {
    await checkAdminAuth('manage_products')

    // Validation
    if (!data.name || data.name.trim() === '') {
      return { error: 'Enter a colour name.' }
    }
    if (!data.code || data.code.trim() === '') {
      return { error: 'Enter a colour code.' }
    }
    const hexRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/
    if (!data.hex_code || !hexRegex.test(data.hex_code)) {
      return { error: 'Enter a valid hex colour.' }
    }

    const slug = data.code.trim().toLowerCase()

    const supabase = await createClient()

    // Check duplicate code (we check slug since we map slug as code)
    const { data: existing } = await supabase
      .from('colors')
      .select('id')
      .or(`slug.eq.${slug},name.eq.${data.name.trim()}`)
      .maybeSingle()

    if (existing) {
      return { error: 'This colour name or code already exists.' }
    }

    const { data: newColor, error: insErr } = await supabase
      .from('colors')
      .insert({
        name: data.name.trim(),
        slug,
        hex_code: data.hex_code.trim(),
        is_active: data.is_active,
        display_order: data.display_order
      })
      .select()
      .single()

    if (insErr) return { error: insErr.message }

    revalidatePath('/admin/products')
    revalidatePath('/admin/colors')
    return { success: true, data: newColor }
  } catch (err: any) {
    return { error: err.message }
  }
}

export async function updateColorAction(id: string, data: {
  name: string
  code: string
  hex_code: string
  is_active: boolean
  display_order: number
}) {
  try {
    await checkAdminAuth('manage_products')

    // Validation
    if (!data.name || data.name.trim() === '') {
      return { error: 'Enter a colour name.' }
    }
    if (!data.code || data.code.trim() === '') {
      return { error: 'Enter a colour code.' }
    }
    const hexRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/
    if (!data.hex_code || !hexRegex.test(data.hex_code)) {
      return { error: 'Enter a valid hex colour.' }
    }

    const slug = data.code.trim().toLowerCase()

    const supabase = await createClient()

    // Check duplicate code/name in other rows
    const { data: existing } = await supabase
      .from('colors')
      .select('id')
      .or(`slug.eq.${slug},name.eq.${data.name.trim()}`)
      .neq('id', id)
      .maybeSingle()

    if (existing) {
      return { error: 'This colour name or code already exists.' }
    }

    const { data: updatedColor, error: upErr } = await supabase
      .from('colors')
      .update({
        name: data.name.trim(),
        slug,
        hex_code: data.hex_code.trim(),
        is_active: data.is_active,
        display_order: data.display_order
      })
      .eq('id', id)
      .select()
      .single()

    if (upErr) return { error: upErr.message }

    revalidatePath('/admin/products')
    revalidatePath('/admin/colors')
    return { success: true, data: updatedColor }
  } catch (err: any) {
    return { error: err.message }
  }
}

export async function deleteColorAction(id: string) {
  try {
    await checkAdminAuth('manage_products')

    const supabase = await createClient()

    // Check if the color is used in products or variants
    const { count: prodCount } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true })
      .eq('primary_color_id', id)

    const { count: varCount } = await supabase
      .from('product_variants')
      .select('*', { count: 'exact', head: true })
      .eq('color_id', id)

    if ((prodCount && prodCount > 0) || (varCount && varCount > 0)) {
      // Deactivate instead of deleting
      const { error: upErr } = await supabase
        .from('colors')
        .update({ is_active: false })
        .eq('id', id)
      if (upErr) return { error: upErr.message }
      revalidatePath('/admin/products')
      revalidatePath('/admin/colors')
      return { success: true, message: 'Colour is used by existing products. It has been deactivated instead of deleted.' }
    }

    const { error: delErr } = await supabase
      .from('colors')
      .delete()
      .eq('id', id)

    if (delErr) return { error: delErr.message }

    revalidatePath('/admin/products')
    revalidatePath('/admin/colors')
    return { success: true }
  } catch (err: any) {
    return { error: err.message }
  }
}
