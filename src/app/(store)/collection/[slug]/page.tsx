import React from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getCollectionBySlug, getCollectionProducts } from '@/services/products'
import { ProductCard } from '@/components/store/ProductCard'
import { Breadcrumb } from '@/components/store/Breadcrumb'
import { Sparkles, ShoppingBag, ArrowRight } from 'lucide-react'
import { resolveCollectionMedia } from '@/lib/mediaResolvers'

interface PageProps {
  params: Promise<{ slug: string }>
}

function formatCollectionTitle(name: string): string {
  if (!name || !name.trim()) return 'Collection'
  const trimmed = name.trim()
  const words = trimmed.split(/[\s_-]+/).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
  const title = words.join(' ')
  if (title.toLowerCase().includes('collection')) {
    return title
  }
  return `${title} Collection`
}

export default async function CollectionDetailPage({ params }: PageProps) {
  const { slug } = await params
  const collection = await getCollectionBySlug(slug)

  // Drafts must be hidden from public users
  if (!collection || collection.status !== 'published') {
    notFound()
  }

  const products = await getCollectionProducts(collection.id)
  const collectionTitle = formatCollectionTitle(collection.name)

  // Format description
  const descriptionText =
    collection.description?.trim() === 'Collection created via Admin Panel.' || !collection.description?.trim()
      ? 'Explore a curated selection of Shreengar designs, handcrafted for grand celebrations and elegant occasions.'
      : collection.description.trim()

  // Media Resolution Priority: 1. collection.banner_url, 2. collection.image_url, 3. first assigned product image, 4. branded fallback
  const resolvedImage = resolveCollectionMedia({
    collection,
    assignedProducts: products,
  })

  const hasValidHeroImage =
    resolvedImage &&
    typeof resolvedImage === 'string' &&
    resolvedImage.trim().length > 0 &&
    !resolvedImage.includes('placeholder')

  return (
    <div className="bg-background-warm text-foreground/80 transition-colors duration-300 min-h-screen pb-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* 1. Breadcrumb Spacing */}
        <div className="pt-20 sm:pt-24 mb-4 sm:mb-6">
          <Breadcrumb
            items={[
              { label: 'Collections', href: '/shop' },
              { label: collectionTitle },
            ]}
          />
        </div>

        {/* 2. Premium Image-Led Collection Hero Banner */}
        <section className="relative isolate overflow-hidden w-full max-w-7xl mx-auto rounded-[8px] border border-[#D4AF37]/30 shadow-xl h-[460px] md:h-[490px] lg:h-[520px] flex items-center bg-[#23000C]">
          {/* Layer 1: Base Fallback Surface (z-0) */}
          <div className="absolute inset-0 bg-[#23000C] z-0" />

          {/* Layer 2: Collection Photograph (z-1) */}
          {hasValidHeroImage ? (
            <div className="absolute inset-0 w-full h-full z-1">
              <Image
                src={resolvedImage}
                alt={`${collectionTitle} editorial`}
                fill
                sizes="100vw"
                className="object-cover object-top"
                priority
              />
            </div>
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-rose-950 via-[#350817] to-[#1A0109] z-1" />
          )}

          {/* Layer 3: Cinematic Translucent Royal Maroon Gradient Overlay (z-10) */}
          <div
            className="absolute inset-0 z-10 pointer-events-none"
            style={{
              background: 'linear-gradient(90deg, rgba(35, 0, 12, 0.98) 0%, rgba(60, 0, 22, 0.94) 22%, rgba(76, 5, 25, 0.78) 40%, rgba(76, 5, 25, 0.48) 56%, rgba(76, 5, 25, 0.16) 72%, rgba(76, 5, 25, 0.02) 88%, rgba(76, 5, 25, 0) 100%)',
            }}
          />

          {/* Layer 4: Decorative Lower Curve Transition (z-20) */}
          <div className="absolute bottom-0 inset-x-0 h-12 sm:h-14 lg:h-16 pointer-events-none z-20 overflow-hidden flex items-end" aria-hidden="true">
            <svg viewBox="0 0 1440 60" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full text-[#1A0109]" preserveAspectRatio="none">
              <path d="M0 25 Q 400 55 800 30 T 1440 18 L1440 60 L0 60 Z" fill="#25000D" opacity="0.35" />
              <path d="M0 20 Q 360 52 720 32 T 1440 12 L1440 60 L0 60 Z" fill="#1A0109" opacity="0.99" />
              <path d="M0 20 Q 360 52 720 32 T 1440 12" stroke="#D4AF37" strokeWidth="1.3" opacity="0.5" fill="none" />
            </svg>
          </div>

          {/* Layer 5: Collection Content Container (z-30) */}
          <div className="relative z-30 w-full h-full flex items-center px-6 sm:px-10 lg:px-14">
            <div className="max-w-[480px] space-y-4">
              <div className="inline-flex items-center space-x-2 px-3 py-1 bg-[#D4AF37]/15 backdrop-blur-md rounded-[2px] border border-[#D4AF37]/40 mb-1">
                <Sparkles className="w-3.5 h-3.5 text-[#D4AF37]" />
                <span className="uppercase tracking-widest text-[9px] sm:text-[10px] font-bold text-[#D4AF37]">
                  SHREENGAR COLLECTION
                </span>
              </div>

              <h1 className="font-serif text-4xl sm:text-5xl lg:text-[56px] font-bold leading-[0.99] tracking-normal text-[#FFF4DC] max-w-[480px]">
                {collectionTitle}
              </h1>

              <p className="text-sm sm:text-base text-[#F5E6D8] leading-relaxed font-light max-w-[420px] line-clamp-3">
                {descriptionText}
              </p>

              <div className="pt-3 flex flex-wrap items-center gap-4">
                <a
                  href="#curated-designs"
                  className="inline-flex h-[46px] w-[200px] items-center justify-center gap-3 rounded-[4px] bg-[#D4AF37] px-6 font-serif font-bold text-[#25000D] shadow-md transition-colors hover:bg-[#E0B95A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFF4DC]"
                >
                  <span>Explore Collection</span>
                  <ArrowRight className="w-4 h-4" />
                </a>
                <div className="text-xs font-semibold text-[#D4AF37]">
                  <span className="font-bold text-[#FFF4DC] text-sm mr-1">{products.length}</span>
                  {products.length === 1 ? 'curated design' : 'curated designs'}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 3. Curated Designs Section Header & Grid */}
        <div id="curated-designs" className="mt-10 sm:mt-14 space-y-8 scroll-mt-8">
          {/* Header */}
          <div className="border-b border-border-warm dark:border-border pb-4 text-center space-y-2 max-w-xl mx-auto">
            <h2 className="font-serif text-2xl sm:text-3xl font-bold text-primary">
              Curated Designs
            </h2>
            <p className="text-xs text-muted-foreground font-light">
              Explore {products.length} {products.length === 1 ? 'design' : 'designs'} selected for this collection.
            </p>
            <div className="w-12 h-[2px] bg-gold mx-auto mt-2 rounded-full" />
          </div>

          {/* Empty State vs. Product Grid */}
          {products.length === 0 ? (
            <div className="max-w-lg mx-auto py-12 sm:py-16 px-6 bg-surface-warm rounded-2xl border border-dashed border-accent/30 shadow-md text-center space-y-5 transition-colors duration-300">
              <div className="w-12 h-12 mx-auto bg-brand-primary/5 rounded-full flex items-center justify-center text-accent">
                <ShoppingBag className="w-6 h-6" />
              </div>
              <div className="space-y-2">
                <h3 className="font-serif text-xl font-bold text-primary">
                  This collection is being curated
                </h3>
                <p className="text-xs text-muted-foreground font-light max-w-sm mx-auto leading-relaxed">
                  New designs will be added soon. Explore our latest arrivals in the meantime.
                </p>
              </div>
              <div>
                <Link
                  href="/shop?filter=new"
                  className="inline-flex items-center space-x-2 px-6 py-2.5 bg-brand-primary hover:bg-brand-primary-hover text-brand-primary-foreground font-serif font-bold text-xs tracking-wider rounded-xl shadow transition-all hover:scale-[1.02]"
                >
                  <span>Shop New Arrivals</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
              {products.map(product => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
