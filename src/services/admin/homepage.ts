'use server'

import { createAdminClient } from '@/lib/supabase/server'

export interface HomepageSection {
  id?: string
  section_type: 'hero_banner' | 'category_grid' | 'collections' | 'products' | 'blog_articles'
  title: string | null
  subtitle: string | null
  is_enabled: boolean
  sort_order: number
  desktop_enabled: boolean
  mobile_enabled: boolean
  starts_at: string | null
  ends_at: string | null
  settings: Record<string, any>
  created_at?: string
  updated_at?: string
}

export interface HomepageSectionItem {
  id?: string
  section_id: string
  entity_type: 'collection' | 'product' | 'banner' | 'blog'
  entity_id: string
  sort_order: number
  is_enabled: boolean
  custom_title: string | null
  custom_subtitle: string | null
  custom_image_url: string | null
  created_at?: string
  updated_at?: string
}

export async function getAdminHomepageSections(): Promise<HomepageSection[]> {
  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('homepage_sections')
      .select('*')
      .order('sort_order', { ascending: true })

    if (error) {
      console.error('Error fetching admin homepage sections:', error.message)
      return []
    }
    return data || []
  } catch (err: any) {
    console.error('Unexpected error fetching admin homepage sections:', err.message || err)
    return []
  }
}

export async function createHomepageSection(data: Partial<HomepageSection>): Promise<{ success: boolean; data?: HomepageSection; error?: string }> {
  try {
    const supabase = createAdminClient()
    const { data: inserted, error } = await supabase
      .from('homepage_sections')
      .insert(data)
      .select()
      .single()

    if (error) {
      return { success: false, error: error.message }
    }
    return { success: true, data: inserted }
  } catch (err: any) {
    return { success: false, error: err.message || 'Unexpected error' }
  }
}

export async function updateHomepageSection(id: string, data: Partial<HomepageSection>): Promise<{ success: boolean; data?: HomepageSection; error?: string }> {
  try {
    const supabase = createAdminClient()
    const { data: updated, error } = await supabase
      .from('homepage_sections')
      .update(data)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return { success: false, error: error.message }
    }
    return { success: true, data: updated }
  } catch (err: any) {
    return { success: false, error: err.message || 'Unexpected error' }
  }
}

export async function deleteHomepageSection(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createAdminClient()
    const { error } = await supabase
      .from('homepage_sections')
      .delete()
      .eq('id', id)

    if (error) {
      return { success: false, error: error.message }
    }
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message || 'Unexpected error' }
  }
}

export async function getHomepageSectionItems(sectionId: string): Promise<HomepageSectionItem[]> {
  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('homepage_section_items')
      .select('*')
      .eq('section_id', sectionId)
      .order('sort_order', { ascending: true })

    if (error) {
      console.error('Error fetching homepage section items:', error.message)
      return []
    }
    return data || []
  } catch (err: any) {
    console.error('Unexpected error fetching homepage section items:', err.message || err)
    return []
  }
}

export async function updateHomepageSectionItems(sectionId: string, items: Array<Partial<HomepageSectionItem>>): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createAdminClient()
    
    // First, delete existing items for this section
    const { error: deleteError } = await supabase
      .from('homepage_section_items')
      .delete()
      .eq('section_id', sectionId)

    if (deleteError) {
      return { success: false, error: deleteError.message }
    }

    if (items.length === 0) {
      return { success: true }
    }

    // Prepare items for insertion
    const itemsToInsert = items.map((item, idx) => ({
      section_id: sectionId,
      entity_type: item.entity_type,
      entity_id: item.entity_id,
      sort_order: item.sort_order ?? (idx + 1),
      is_enabled: item.is_enabled !== false,
      custom_title: item.custom_title || null,
      custom_subtitle: item.custom_subtitle || null,
      custom_image_url: item.custom_image_url || null
    }))

    const { error: insertError } = await supabase
      .from('homepage_section_items')
      .insert(itemsToInsert)

    if (insertError) {
      return { success: false, error: insertError.message }
    }

    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message || 'Unexpected error' }
  }
}
