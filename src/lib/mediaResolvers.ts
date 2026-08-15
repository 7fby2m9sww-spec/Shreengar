import { Collection, Product } from '@/types/database'

export interface CollectionMediaResolutionInput {
  collection: Collection | null | undefined
  assignedProducts?: Product[]
  itemOverrideUrl?: string | null
}

/**
 * Generic media resolver for Featured Collection cards.
 * Generic Priority:
 * 1. Homepage section-item image override, when configured
 * 2. collection.banner_url, when configured
 * 3. collection.image_url, when configured
 * 4. First assigned product's primary active image
 * 5. Branded fallback
 */
export function resolveCollectionMedia({
  collection,
  assignedProducts = [],
  itemOverrideUrl,
}: CollectionMediaResolutionInput): string {
  if (itemOverrideUrl && typeof itemOverrideUrl === 'string' && itemOverrideUrl.trim()) {
    return itemOverrideUrl.trim()
  }

  if (!collection) return '/images/product-placeholder.webp'

  const bannerUrl = (collection as any).banner_url
  if (bannerUrl && typeof bannerUrl === 'string' && bannerUrl.trim()) {
    return bannerUrl.trim()
  }

  if (collection.image_url && typeof collection.image_url === 'string' && collection.image_url.trim()) {
    return collection.image_url.trim()
  }

  if (assignedProducts.length > 0) {
    const firstProduct = assignedProducts[0]
    const productImages = firstProduct?.images || []
    if (productImages.length > 0) {
      const primaryImage = productImages[0]
      if (typeof primaryImage === 'string' && primaryImage.trim()) {
        return primaryImage.trim()
      }
      if (primaryImage && typeof primaryImage === 'object') {
        const url = (primaryImage as any).image_url || (primaryImage as any).url
        if (url && typeof url === 'string' && url.trim()) {
          return url.trim()
        }
      }
    }
  }

  return '/images/product-placeholder.webp'
}

// Alias for backwards compatibility
export const resolveHomepageCollectionFeatureImage = resolveCollectionMedia
export const resolveCollectionThumbnail = resolveCollectionMedia
