'use server'

import { getSession } from '@/lib/auth/getSession'
import { createAdminClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

/**
 * Checks if a product is wishlisted for the currently logged-in customer.
 */
export async function checkWishlistStatusAction(productId: string): Promise<boolean> {
  try {
    const session = await getSession()
    if (!session.authenticated) {
      return false
    }

    const customerId = session.profile.id
    const supabase = createAdminClient()

    // Resolve all variants of the product
    const { data: variants, error: varError } = await supabase
      .from('product_variants')
      .select('id')
      .eq('product_id', productId)

    if (varError || !variants || variants.length === 0) {
      return false
    }

    const variantIds = variants.map(v => v.id)

    const { data, error } = await supabase
      .from('wishlist')
      .select('id')
      .eq('user_id', customerId)
      .in('variant_id', variantIds)
      .limit(1)
      .maybeSingle()

    if (error) {
      return false
    }
    return !!data
  } catch {
    return false
  }
}

/**
 * Toggles a product's wishlist status for the currently logged-in customer.
 */
export async function toggleWishlistAction(
  productId: string
): Promise<{ success: boolean; isWishlisted?: boolean; error?: string }> {
  try {
    const session = await getSession()
    if (!session.authenticated) {
      return { success: false, error: 'Authentication required' }
    }

    const customerId = session.profile.id
    const supabase = createAdminClient()

    // Resolve all variants of the product
    const { data: variants, error: varError } = await supabase
      .from('product_variants')
      .select('id')
      .eq('product_id', productId)

    if (varError || !variants || variants.length === 0) {
      return { success: false, error: 'Product has no variants' }
    }

    const variantIds = variants.map(v => v.id)

    // Check if any variant is already wishlisted
    const { data: existing, error: checkError } = await supabase
      .from('wishlist')
      .select('id')
      .eq('user_id', customerId)
      .in('variant_id', variantIds)
      .limit(1)
      .maybeSingle()

    if (checkError) {
      return { success: false, error: 'Database check failed' }
    }

    if (existing) {
      // Remove all variants of this product from wishlist
      const { error: deleteError } = await supabase
        .from('wishlist')
        .delete()
        .eq('user_id', customerId)
        .in('variant_id', variantIds)

      if (deleteError) {
        return { success: false, error: 'Could not remove from wishlist' }
      }
      
      revalidatePath('/wishlist')
      return { success: true, isWishlisted: false }
    } else {
      // Add the first variant to wishlist
      const { error: insertError } = await supabase
        .from('wishlist')
        .insert({
          user_id: customerId,
          variant_id: variants[0].id
        })

      if (insertError) {
        return { success: false, error: 'Could not add to wishlist' }
      }

      revalidatePath('/wishlist')
      return { success: true, isWishlisted: true }
    }
  } catch (err: any) {
    return { success: false, error: err.message || 'Server error' }
  }
}

/**
 * Resolves the authenticated customer's wishlist count securely.
 */
export async function getWishlistCountAction(): Promise<number> {
  try {
    const session = await getSession()
    if (!session.authenticated) {
      return 0
    }

    const customerId = session.profile.id
    const supabase = createAdminClient()
    const { count, error } = await supabase
      .from('wishlist')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', customerId)

    if (error) {
      return 0
    }
    return count || 0
  } catch {
    return 0
  }
}
