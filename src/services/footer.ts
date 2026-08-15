import { createAdminClient } from '@/lib/supabase/server'
import { FooterConfig } from '@/types/database'
import { DEFAULT_FOOTER_CONFIG } from '@/constants/footer'

export { DEFAULT_FOOTER_CONFIG }

export async function getFooterSettings(): Promise<FooterConfig> {
  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('storefront_settings')
      .select('footer_config')
      .eq('id', 'default')
      .single()

    if (error || !data || !data.footer_config) {
      return DEFAULT_FOOTER_CONFIG
    }

    const raw = data.footer_config as Partial<FooterConfig>

    return {
      brand: {
        ...DEFAULT_FOOTER_CONFIG.brand,
        ...(raw.brand || {})
      },
      quickLinks: {
        heading: raw.quickLinks?.heading || DEFAULT_FOOTER_CONFIG.quickLinks.heading,
        enabled: raw.quickLinks?.enabled !== false,
        items: Array.isArray(raw.quickLinks?.items)
          ? raw.quickLinks.items.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
          : DEFAULT_FOOTER_CONFIG.quickLinks.items
      },
      policies: {
        heading: raw.policies?.heading || DEFAULT_FOOTER_CONFIG.policies.heading,
        enabled: raw.policies?.enabled !== false,
        items: Array.isArray(raw.policies?.items)
          ? raw.policies.items.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
          : DEFAULT_FOOTER_CONFIG.policies.items
      },
      newsletter: {
        ...DEFAULT_FOOTER_CONFIG.newsletter,
        ...(raw.newsletter || {})
      },
      bottomBar: {
        ...DEFAULT_FOOTER_CONFIG.bottomBar,
        ...(raw.bottomBar || {})
      }
    }
  } catch (err: any) {
    console.warn('Diagnostic warning (getFooterSettings):', err.message || err)
    return DEFAULT_FOOTER_CONFIG
  }
}

export async function updateFooterSettings(config: FooterConfig): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createAdminClient()
    const { error } = await supabase
      .from('storefront_settings')
      .upsert({
        id: 'default',
        footer_config: config as any,
        updated_at: new Date().toISOString()
      })

    if (error) {
      console.warn('Diagnostic warning (updateFooterSettings):', error.message || error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (err: any) {
    console.warn('Diagnostic warning (updateFooterSettings exception):', err.message || err)
    return { success: false, error: err.message || 'Failed to update footer settings' }
  }
}
