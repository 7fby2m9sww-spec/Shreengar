'use server'

import { createAdminClient, createClient } from '@/lib/supabase/server'
import { checkAdminAuth } from '../catalog/actions.ts'
import { revalidatePath } from 'next/cache'

export interface StorefrontSettings {
  show_low_stock_warning: boolean
  low_stock_warning_threshold: number
}

const DEFAULT_SETTINGS: StorefrontSettings = {
  show_low_stock_warning: true,
  low_stock_warning_threshold: 3
}

export async function getStorefrontSettingsAction(): Promise<{ success: boolean; settings: StorefrontSettings; error?: string; isNotConfigured?: boolean }> {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('storefront_settings')
      .select('show_low_stock_warning, low_stock_warning_threshold')
      .eq('id', 'default')
      .maybeSingle()

    if (error) {
      console.error('[GET-STOREFRONT-SETTINGS-ERROR]', error)
      if (error.code === '42P01') {
        return { success: false, settings: DEFAULT_SETTINGS, error: 'Storefront settings are not configured yet.', isNotConfigured: true }
      }
      return { success: false, settings: DEFAULT_SETTINGS, error: error.message }
    }

    if (data) {
      return {
        success: true,
        settings: {
          show_low_stock_warning: !!data.show_low_stock_warning,
          low_stock_warning_threshold: Number(data.low_stock_warning_threshold)
        }
      }
    }

    return { success: false, settings: DEFAULT_SETTINGS, error: 'No storefront settings found.' }
  } catch (err: any) {
    console.error('[GET-STOREFRONT-SETTINGS-EXCEPTION]', err)
    return { success: false, settings: DEFAULT_SETTINGS, error: err.message || 'An unexpected error occurred.' }
  }
}

export async function updateStorefrontSettingsAction(
  settings: Partial<StorefrontSettings>
): Promise<{ success: boolean; error?: string }> {
  try {
    // 1. Server-side permission check using existing Settings-management permission
    await checkAdminAuth('manage_security')

    const showLowStockWarning = settings.show_low_stock_warning
    const lowStockWarningThreshold = settings.low_stock_warning_threshold

    // 2. Server-side validation
    if (typeof showLowStockWarning !== 'boolean') {
      return { success: false, error: 'Show low-stock warning must be a boolean.' }
    }

    if (
      typeof lowStockWarningThreshold !== 'number' ||
      !Number.isInteger(lowStockWarningThreshold) ||
      lowStockWarningThreshold < 1 ||
      lowStockWarningThreshold > 20
    ) {
      return { success: false, error: 'Warning threshold must be an integer between 1 and 20.' }
    }

    // 3. Update database using admin client (service role)
    const supabase = createAdminClient()
    const { error } = await supabase
      .from('storefront_settings')
      .upsert({
        id: 'default',
        show_low_stock_warning: showLowStockWarning,
        low_stock_warning_threshold: lowStockWarningThreshold,
        updated_at: new Date().toISOString()
      })

    if (error) {
      console.error('[UPDATE-STOREFRONT-SETTINGS-ERROR]', error)
      return { success: false, error: 'Failed to update storefront settings.' }
    }

    // 4. Revalidate paths
    try {
      revalidatePath('/')
      revalidatePath('/shop')
      revalidatePath('/product/[id]', 'layout')
    } catch (e) {
      console.error('Revalidation error:', e)
    }

    return { success: true }
  } catch (err: any) {
    console.error('[UPDATE-STOREFRONT-SETTINGS-EXCEPTION]', err)
    return { success: false, error: err.message || 'Unauthorized or unexpected error.' }
  }
}
