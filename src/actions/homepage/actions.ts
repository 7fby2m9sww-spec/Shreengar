'use server'

import { revalidatePath } from 'next/cache'
import { checkAdminAuth } from '@/actions/catalog/actions'
import {
  getAdminHomepageSections,
  createHomepageSection,
  updateHomepageSection,
  deleteHomepageSection,
  getHomepageSectionItems,
  updateHomepageSectionItems,
  HomepageSection,
  HomepageSectionItem
} from '@/services/admin/homepage'
import { getAdminCollections } from '@/services/admin/products'
import { getBanners, getAdminBlogsWithStatus } from '@/services/admin'
import { getProducts } from '@/services/products'

export async function getHomepageManagerOptionsAction() {
  try {
    await checkAdminAuth('manage_marketing')
    const [collections, banners, blogsRes, products] = await Promise.all([
      getAdminCollections(),
      getBanners(),
      getAdminBlogsWithStatus(),
      getProducts()
    ])
    return {
      success: true,
      data: {
        collections: collections || [],
        banners: banners || [],
        blogs: blogsRes.blogs || [],
        blogsError: blogsRes.error || null,
        products: products || []
      }
    }
  } catch (err: any) {
    return { success: false, error: err.message || 'Unauthorized or unexpected error' }
  }
}

export async function getAdminHomepageLayoutAction() {
  try {
    await checkAdminAuth('manage_marketing')
    const sections = await getAdminHomepageSections()
    
    // Sort sections: hero_banner always first at sort_order 1, others ordered by sort_order
    const sortedSections = [...sections].sort((a, b) => {
      if (a.section_type === 'hero_banner') return -1
      if (b.section_type === 'hero_banner') return 1
      return (a.sort_order || 0) - (b.sort_order || 0)
    })

    const sectionsWithItems = []
    for (const section of sortedSections) {
      if (section.id) {
        const items = await getHomepageSectionItems(section.id)
        sectionsWithItems.push({
          ...section,
          items
        })
      }
    }
    
    return { success: true, data: sectionsWithItems }
  } catch (err: any) {
    return { success: false, error: err.message || 'Unauthorized or unexpected error' }
  }
}

export async function saveHomepageSectionAction(
  sectionId: string,
  sectionData: Partial<HomepageSection>,
  itemsData: Array<Partial<HomepageSectionItem>>
) {
  try {
    await checkAdminAuth('manage_marketing')

    const dbSections = await getAdminHomepageSections()
    const targetSection = dbSections.find(s => s.id === sectionId)

    if (targetSection?.section_type === 'blog_articles') {
      if (itemsData.length > 3) {
        return { success: false, error: 'Maximum 3 blog articles can be selected for the Homepage.' }
      }

      const uniqueIds = new Set(itemsData.map(i => i.entity_id))
      if (uniqueIds.size !== itemsData.length) {
        return { success: false, error: 'Duplicate blog articles are not allowed.' }
      }
    }
    
    const sectionRes = await updateHomepageSection(sectionId, sectionData)
    if (!sectionRes.success) {
      return { success: false, error: sectionRes.error || 'Failed to update section metadata' }
    }

    const normalizedItems = itemsData.map((item, idx) => ({
      ...item,
      sort_order: idx + 1
    }))

    const itemsRes = await updateHomepageSectionItems(sectionId, normalizedItems)
    if (!itemsRes.success) {
      return { success: false, error: itemsRes.error || 'Failed to update section items' }
    }

    // Trigger targeted path revalidation
    revalidatePath('/')
    revalidatePath('/admin/homepage')

    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message || 'Unauthorized or unexpected error' }
  }
}

export async function createHomepageSectionAction(sectionData: Partial<HomepageSection>) {
  try {
    await checkAdminAuth('manage_marketing')

    // Reject creating a second hero_banner section if one already exists
    if (sectionData.section_type === 'hero_banner') {
      const existing = await getAdminHomepageSections()
      if (existing.some(s => s.section_type === 'hero_banner')) {
        return { success: false, error: 'Hero Banner already exists and is locked at position 1.' }
      }
    }

    const res = await createHomepageSection(sectionData)
    
    if (res.success) {
      revalidatePath('/')
      revalidatePath('/admin/homepage')
    }
    return res
  } catch (err: any) {
    return { success: false, error: err.message || 'Unauthorized or unexpected error' }
  }
}

export async function deleteHomepageSectionAction(sectionId: string) {
  try {
    await checkAdminAuth('manage_marketing')

    // Reject deleting the locked Hero Banner
    const existing = await getAdminHomepageSections()
    const target = existing.find(s => s.id === sectionId)
    if (target?.section_type === 'hero_banner') {
      return { success: false, error: 'Hero Banner cannot be deleted as it is permanently locked at position 1.' }
    }

    const res = await deleteHomepageSection(sectionId)
    
    if (res.success) {
      revalidatePath('/')
      revalidatePath('/admin/homepage')
    }
    return res
  } catch (err: any) {
    return { success: false, error: err.message || 'Unauthorized or unexpected error' }
  }
}

export async function updateSectionsOrderAction(orders: Array<{ id: string; sort_order: number }>) {
  try {
    await checkAdminAuth('manage_marketing')
    
    const dbSections = await getAdminHomepageSections()
    const heroSection = dbSections.find(s => s.section_type === 'hero_banner')

    // Always lock Hero Banner at sort_order 1
    if (heroSection?.id) {
      await updateHomepageSection(heroSection.id, { sort_order: 1 })
    }

    // Process non-hero sections starting sequentially from sort_order 2
    let nextOrder = 2
    for (const order of orders) {
      const targetSec = dbSections.find(s => s.id === order.id)
      if (!targetSec || targetSec.section_type === 'hero_banner') continue

      await updateHomepageSection(order.id, { sort_order: nextOrder })
      nextOrder++
    }
    
    revalidatePath('/')
    revalidatePath('/admin/homepage')
    
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message || 'Unauthorized or unexpected error' }
  }
}
