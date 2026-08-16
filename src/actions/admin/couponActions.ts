'use server'

import { createAdminClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { checkAdminAuth } from '@/actions/catalog/actions'
import { Coupon } from '@/types/database'

function normalizeCouponFromDb(row: any): Coupon {
  if (!row) return row
  const rawType = row.type || row.discount_type || 'percentage'
  const mappedType = (rawType === 'fixed_amount' || rawType === 'fixed') ? 'fixed' : 'percentage'
  return {
    ...row,
    title: row.title || row.code || 'Promo Voucher',
    type: mappedType,
    value: Number(row.value ?? row.discount_value ?? 0),
    min_spend: Number(row.min_spend ?? row.minimum_order_amount ?? 0),
    max_discount: row.max_discount ?? row.maximum_discount ?? null,
    start_date: row.start_date || row.starts_at || new Date().toISOString(),
    end_date: row.end_date || row.expires_at || new Date(Date.now() + 365 * 86400000).toISOString(),
    usage_limit: row.usage_limit ?? 500,
    used_count: Number(row.used_count || 0),
    is_active: row.is_active !== false,
    first_time_only: Boolean(row.first_time_only || row.target_type === 'first_time_buyers'),
  } as Coupon
}

export async function getAdminCouponsAction(): Promise<{
  success: boolean
  data?: Coupon[]
  error?: string
}> {
  try {
    await checkAdminAuth('promotions.manage')
    const supabase = createAdminClient()

    const { data, error } = await supabase
      .from('coupons')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('getAdminCouponsAction DB error:', error)
      return { success: false, error: error.message }
    }

    const mapped = (data || []).map(normalizeCouponFromDb)
    return { success: true, data: mapped }
  } catch (err: any) {
    console.error('getAdminCouponsAction exception:', err)
    return { success: false, error: err.message || 'Failed to fetch coupons.' }
  }
}

export async function createAdminCouponAction(payload: Partial<Coupon>): Promise<{
  success: boolean
  data?: Coupon
  error?: string
}> {
  try {
    await checkAdminAuth('promotions.manage')
    const supabase = createAdminClient()

    const cleanTitle = (payload.title || '').trim()
    const cleanCode = (payload.code || 'PROMO20').trim().toUpperCase()

    if (!cleanTitle) {
      return { success: false, error: 'Coupon title is required and cannot be empty.' }
    }
    if (!cleanCode) {
      return { success: false, error: 'Coupon code is required and cannot be empty.' }
    }

    const uiType = payload.type || 'percentage'
    const dbDiscountType = uiType === 'fixed' ? 'fixed_amount' : uiType
    const isFirstTimeOnly = Boolean(payload.first_time_only || payload.target_type === 'first_time_buyers')

    const insertData: any = {
      title: cleanTitle,
      code: cleanCode,
      type: uiType,
      discount_type: dbDiscountType,
      value: Number(payload.value || 0),
      discount_value: Number(payload.value || 0),
      min_spend: Number(payload.min_spend || 0),
      minimum_order_amount: Number(payload.min_spend || 0),
      max_discount: payload.max_discount ?? 1500,
      maximum_discount: payload.max_discount ?? 1500,
      start_date: payload.start_date || new Date().toISOString(),
      starts_at: payload.start_date || new Date().toISOString(),
      end_date: payload.end_date || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      expires_at: payload.end_date || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      usage_limit: payload.usage_limit ?? 500,
      used_count: 0,
      is_active: payload.is_active !== undefined ? payload.is_active : true,
      target_type: payload.target_type || 'all',
      target_product_ids: payload.target_product_ids || [],
      target_category_ids: payload.target_category_ids || [],
      target_customer_ids: payload.target_customer_ids || [],
      target_customer_emails: payload.target_customer_emails || [],
      first_time_only: isFirstTimeOnly,
      created_at: new Date().toISOString(),
    }

    let { data, error } = await supabase
      .from('coupons')
      .insert(insertData)
      .select('*')
      .single()

    // Resilient fallback retry omitting missing schema cache columns if PGRST204 occurs
    if (error && (error.code === 'PGRST204' || error.message.includes('column') || error.message.includes('first_time_only'))) {
      const fallbackInsertData: any = { ...insertData }
      delete fallbackInsertData.first_time_only

      const retryRes = await supabase
        .from('coupons')
        .insert(fallbackInsertData)
        .select('*')
        .single()

      if (!retryRes.error && retryRes.data) {
        data = retryRes.data
        error = null
      }
    }

    if (error) {
      console.error('createAdminCouponAction DB Error Details:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint
      })
      return { success: false, error: `[DB Error ${error.code}]: ${error.message}` }
    }

    revalidatePath('/')
    revalidatePath('/admin/coupons')
    revalidatePath('/cart')
    revalidatePath('/checkout')
    revalidatePath('/coupons')

    return { success: true, data: normalizeCouponFromDb(data) }
  } catch (err: any) {
    console.error('createAdminCouponAction Exception:', err)
    return { success: false, error: err.message || 'Failed to create coupon.' }
  }
}

export async function updateAdminCouponAction(
  id: string,
  payload: Partial<Coupon>
): Promise<{
  success: boolean
  data?: Coupon
  error?: string
}> {
  try {
    await checkAdminAuth('promotions.manage')
    const supabase = createAdminClient()

    const updateData: any = { ...payload }
    delete updateData.id

    if (updateData.title !== undefined) {
      const cleanTitle = updateData.title.trim()
      if (!cleanTitle) {
        return { success: false, error: 'Coupon title is required and cannot be empty.' }
      }
      updateData.title = cleanTitle
    }

    if (updateData.code !== undefined) {
      const cleanCode = updateData.code.trim().toUpperCase()
      if (!cleanCode) {
        return { success: false, error: 'Coupon code is required and cannot be empty.' }
      }
      updateData.code = cleanCode
    }

    if (updateData.type) {
      updateData.discount_type = updateData.type === 'fixed' ? 'fixed_amount' : updateData.type
    }

    if (updateData.first_time_only !== undefined) {
      updateData.first_time_only = Boolean(updateData.first_time_only || updateData.target_type === 'first_time_buyers')
    }

    let { data, error } = await supabase
      .from('coupons')
      .update(updateData)
      .eq('id', id)
      .select('*')
      .single()

    // Resilient fallback retry omitting missing schema cache columns if PGRST204 occurs
    if (error && (error.code === 'PGRST204' || error.message.includes('column') || error.message.includes('first_time_only'))) {
      const fallbackUpdate: any = { ...updateData }
      delete fallbackUpdate.first_time_only

      const retryRes = await supabase
        .from('coupons')
        .update(fallbackUpdate)
        .eq('id', id)
        .select('*')
        .single()

      if (!retryRes.error && retryRes.data) {
        data = retryRes.data
        error = null
      }
    }

    if (error) {
      console.error('updateAdminCouponAction DB Error Details:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint
      })
      return { success: false, error: `[DB Error ${error.code}]: ${error.message}` }
    }

    revalidatePath('/')
    revalidatePath('/admin/coupons')
    revalidatePath('/cart')
    revalidatePath('/checkout')
    revalidatePath('/coupons')

    return { success: true, data: normalizeCouponFromDb(data) }
  } catch (err: any) {
    console.error('updateAdminCouponAction Exception:', err)
    return { success: false, error: err.message || 'Failed to update coupon.' }
  }
}

export async function deleteAdminCouponAction(id: string): Promise<{
  success: boolean
  error?: string
}> {
  try {
    await checkAdminAuth('promotions.manage')
    const supabase = createAdminClient()

    const { error } = await supabase
      .from('coupons')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('deleteAdminCouponAction DB Error Details:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint
      })
      return { success: false, error: `[DB Error ${error.code}]: ${error.message}` }
    }

    revalidatePath('/')
    revalidatePath('/admin/coupons')
    revalidatePath('/cart')
    revalidatePath('/checkout')
    revalidatePath('/coupons')

    return { success: true }
  } catch (err: any) {
    console.error('deleteAdminCouponAction Exception:', err)
    return { success: false, error: err.message || 'Failed to delete coupon.' }
  }
}

export async function getPublicActiveCouponsAction(): Promise<Coupon[]> {
  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('coupons')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (error || !data) return []

    const now = new Date()
    const valid = (data as any[]).filter(c => {
      if (c.is_active === false) return false

      const start = c.start_date || c.starts_at
      const end = c.end_date || c.expires_at

      if (start && new Date(start).getTime() > now.getTime()) return false
      if (end && new Date(end).getTime() < now.getTime()) return false

      const limit = c.usage_limit
      const used = c.used_count || 0
      if (limit !== null && limit !== undefined && used >= limit) return false

      return true
    })

    return valid.map(normalizeCouponFromDb)
  } catch (err) {
    console.error('getPublicActiveCouponsAction exception:', err)
    return []
  }
}
