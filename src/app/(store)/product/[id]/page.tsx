import React from 'react'
import { notFound } from 'next/navigation'
import { getProductById, getProductVariants, getProductColourways, StorefrontColourway } from '@/services/products'
import { getReviewsForProduct } from '@/services/store'
import { Breadcrumb } from '@/components/store/Breadcrumb'
import { ProductGalleryAndActions } from './ProductGalleryAndActions'
import { ProductInfoTabs } from './ProductInfoTabs'
import { RecentlyViewed } from '@/components/store/RecentlyViewed'
import { Star } from 'lucide-react'

export const revalidate = 0

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const product = await getProductById(id)

  if (!product) {
    notFound()
  }

  const variants = await getProductVariants(product.id)
  const reviews = await getReviewsForProduct(product.id)

  let colourways: any[] = []
  let colourwaysError: string | null = null

  if (product.product_family_id) {
    const colRes = await getProductColourways(product.product_family_id, product.id)
    if (colRes.success && colRes.data) {
      colourways = colRes.data
    } else {
      colourwaysError = colRes.error || 'Unable to load colour options.'
    }
  }

  // JSON-LD Structured Data Schema for Google Search Rich Product Snippets
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.title,
    image: product.images,
    description: product.description,
    sku: product.sku,
    brand: {
      '@type': 'Brand',
      name: 'Shreengar',
    },
    offers: {
      '@type': 'Offer',
      url: `https://shreengar.com/product/${product.id}`,
      priceCurrency: 'INR',
      price: product.price,
      itemCondition: 'https://schema.org/NewCondition',
      availability: product.is_active ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
    },
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: product.rating,
      reviewCount: product.reviews_count || reviews.length || 1,
    },
  }

  return (
    <div className="space-y-10 pb-16">
      {/* Inject JSON-LD Schema Script */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <Breadcrumb
        items={[
          { label: 'Shop', href: '/shop' },
          { label: product.title },
        ]}
      />

      {/* Main Product Showcase */}
      {(() => {
        return (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
            <ProductGalleryAndActions 
              product={product} 
              variants={variants as any} 
              colourways={colourways} 
              colourwaysError={colourwaysError}
            />
          </div>
        )
      })()}

      {/* Product Information Tabs & Reviews Section */}
      <div className="space-y-8 pt-8 border-t border-border">
        <ProductInfoTabs product={product} />

        {/* Customer Reviews Section */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="font-serif text-2xl font-bold text-foreground">
              Customer Reviews ({reviews.length})
            </h3>
            <div className="flex items-center space-x-1 bg-amber-100 dark:bg-amber-950/40 px-3 py-1 rounded-full text-foreground dark:text-amber-300 font-bold text-sm">
              <Star className="w-4 h-4 fill-amber-500 text-amber-500" />
              <span>{product.rating} out of 5</span>
            </div>
          </div>

          {reviews.length === 0 ? (
            <div className="p-8 bg-surface rounded-xl border border-border text-center text-xs text-muted-foreground font-serif">
              No customer reviews yet. Be the first to leave a review!
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {reviews.map(rev => (
                <div
                  key={rev.id}
                  className="bg-surface p-5 rounded-xl border border-border shadow-sm space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-serif font-bold text-sm text-foreground">{rev.user_name}</span>
                    <div className="flex items-center">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`w-3.5 h-3.5 ${
                            i < rev.rating ? 'fill-amber-500 text-amber-500' : 'text-slate-200 dark:text-slate-700'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                  {rev.title && <h5 className="text-xs font-bold text-foreground">{rev.title}</h5>}
                  <p className="text-xs text-muted-foreground leading-relaxed">{rev.comment}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Cross-Selling Handcrafted Recommendations */}
        <RecentlyViewed currentProductId={product.id} />
      </div>
    </div>
  )
}
