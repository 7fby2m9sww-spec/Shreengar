'use server'

import { checkAdminAuth } from '@/actions/catalog/actions'
import { getFooterSettings, updateFooterSettings } from '@/services/footer'
import { FooterConfig } from '@/types/database'
import { revalidatePath } from 'next/cache'

export async function getFooterSettingsAction() {
  try {
    const config = await getFooterSettings()
    return { success: true, data: config }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to load footer settings' }
  }
}

export async function updateFooterSettingsAction(config: FooterConfig) {
  try {
    await checkAdminAuth('manage_marketing')

    // Basic server-side validation
    if (!config.brand.name || !config.brand.name.trim()) {
      return { success: false, error: 'Brand display name is required.' }
    }
    if (config.brand.supportEmail && !config.brand.supportEmail.includes('@')) {
      return { success: false, error: 'Support email address must be a valid email.' }
    }

    // Validate link URLs
    const allLinks = [...(config.quickLinks?.items || []), ...(config.policies?.items || [])]
    for (const link of allLinks) {
      if (!link.label || !link.label.trim()) {
        return { success: false, error: 'Link label is required for all links.' }
      }
      if (!link.href || !link.href.trim()) {
        return { success: false, error: 'Link URL is required for all links.' }
      }
      if (link.href.toLowerCase().startsWith('javascript:')) {
        return { success: false, error: 'JavaScript URLs are strictly forbidden for security reasons.' }
      }
      if (!link.href.startsWith('/') && !link.href.startsWith('https://') && !link.href.startsWith('mailto:')) {
        return { success: false, error: `Invalid link URL "${link.href}". Must start with "/" for internal links or "https://" for external links.` }
      }
    }

    const res = await updateFooterSettings(config)
    if (!res.success) {
      return { success: false, error: res.error || 'Failed to update footer settings' }
    }

    revalidatePath('/')
    revalidatePath('/admin/settings/footer')
    revalidatePath('/', 'layout')

    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message || 'Unauthorized or failed to save footer settings' }
  }
}
