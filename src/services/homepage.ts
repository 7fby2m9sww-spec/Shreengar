'use server'

import { createClient } from '@/lib/supabase/client'
import { HomepageSection, HomepageSectionItem } from './admin/homepage'

export interface ResolvedHomepageSectionItem extends HomepageSectionItem {
  resolvedEntity: any | null
}

export interface ResolvedHomepageSection extends HomepageSection {
  items: ResolvedHomepageSectionItem[]
}

export async function getStorefrontHomepageLayout(): Promise<ResolvedHomepageSection[]> {
  try {
    const supabase = createClient()

    // Query active homepage sections (ordered by sort_order)
    // The RLS policy will automatically restrict to is_enabled = true and valid dates
    const { data: sections, error: sectionsError } = await supabase
      .from('homepage_sections')
      .select('*')
      .order('sort_order', { ascending: true })

    if (sectionsError || !sections) {
      console.error('Error fetching storefront homepage layout:', sectionsError?.message)
      return []
    }

    const resolvedLayouts: ResolvedHomepageSection[] = []

    for (const section of sections) {
      // Query items for this section
      // RLS policy will restrict to is_enabled = true
      const { data: items, error: itemsError } = await supabase
        .from('homepage_section_items')
        .select('*')
        .eq('section_id', section.id)
        .order('sort_order', { ascending: true })

      if (itemsError) {
        console.error(`Error fetching items for section ${section.id}:`, itemsError.message)
        continue
      }

      const resolvedItems: ResolvedHomepageSectionItem[] = []

      // If there are items, resolve them based on their entity type
      if (items && items.length > 0) {
        for (const item of items) {
          let resolvedEntity: any = null

          if (item.entity_type === 'collection') {
            const { data: col } = await supabase
              .from('collections')
              .select('*')
              .eq('id', item.entity_id)
              .eq('status', 'published') // Ensure only published collections appear
              .maybeSingle()

            if (col) {
              // Add product count
              const { count } = await supabase
                .from('product_collections')
                .select('*', { count: 'exact', head: true })
                .eq('collection_id', col.id)

              resolvedEntity = { ...col, productCount: count || 0 }
            }
          } else if (item.entity_type === 'product') {
            const { data: prod } = await supabase
              .from('products')
              .select('*, category:categories(name), product_variants(*, sizes(*), colors(*), inventory(*)), product_images(*)')
              .eq('id', item.entity_id)
              .eq('is_active', true)
              .eq('status', 'active')
              .maybeSingle()

            if (prod) {
              const dbImages = prod.product_images || []
              const sortedDbImages = [...dbImages].sort((a: any, b: any) => {
                if (a.is_primary && !b.is_primary) return -1
                if (!a.is_primary && b.is_primary) return 1
                const orderA = a.display_order ?? 999999
                const orderB = b.display_order ?? 999999
                if (orderA !== orderB) return orderA - orderB
                return (a.image_url || '').localeCompare(b.image_url || '')
              })

              resolvedEntity = {
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
            }
          } else if (item.entity_type === 'banner') {
            const { data: banner } = await supabase
              .from('homepage_banners')
              .select('*')
              .eq('id', item.entity_id)
              .eq('is_active', true)
              .maybeSingle()

            resolvedEntity = banner
          } else if (item.entity_type === 'blog') {
            try {
              const now = new Date().toISOString()
              const { data: blog, error: blogErr } = await supabase
                .from('blogs')
                .select('*')
                .eq('id', item.entity_id)
                .eq('is_published', true)
                .or(`published_at.is.null,published_at.lte.${now}`)
                .maybeSingle()

              if (!blogErr && blog) {
                resolvedEntity = blog
              }
            } catch (err: any) {
              console.warn('Diagnostic warning (storefront blog fetch):', err.message || err)
            }
          }

          // Only include item if the entity is resolved successfully (e.g. not unpublished/deleted)
          if (resolvedEntity) {
            resolvedItems.push({
              ...item,
              resolvedEntity
            })
          }
        }
      }

      // Check if this section type requires items to be rendered
      const requiresItems = ['collections', 'products', 'blog_articles'].includes(section.section_type)
      
      // If a section requires items but has none resolved, skip rendering it completely
      if (requiresItems && resolvedItems.length === 0) {
        continue
      }

      resolvedLayouts.push({
        ...section,
        items: resolvedItems
      })
    }

    return resolvedLayouts
  } catch (err: any) {
    console.error('Unexpected error fetching storefront homepage layout:', err.message || err)
    return []
  }
}
