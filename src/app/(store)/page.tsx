import React from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Sparkles, ArrowRight } from 'lucide-react'
import { getProducts, getCategories, getCollections, getCollectionProducts } from '@/services/products'
import { getBanners, getBlogs } from '@/services/admin'
import { getStorefrontHomepageLayout } from '@/services/homepage'
import { ProductCard } from '@/components/store/ProductCard'
import { resolveCollectionMedia } from '@/lib/mediaResolvers'

export const revalidate = 0

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

function formatTitleWithBreaks(title: string) {
  if (!title) return null
  const lower = title.toLowerCase().trim()
  if (lower === 'celebrate every moment in shreengar') {
    return (
      <>
        Celebrate Every<br />
        Moment in<br />
        Shreengar
      </>
    )
  }
  return title
}

export default async function HomePage() {
  const [products, categories, collections, banners, blogs, layoutSections] = await Promise.all([
    getProducts(),
    getCategories(),
    getCollections(),
    getBanners(),
    getBlogs(),
    getStorefrontHomepageLayout(),
  ])

  const rawBest = products.filter(p => p.is_bestseller).slice(0, 4)
  const bestSellers = rawBest.length > 0 ? rawBest : products.slice(0, 4)

  const rawNew = products.filter(p => p.is_new_arrival).slice(0, 4)
  const newArrivals = rawNew.length > 0 ? rawNew : products.slice(0, 4)

  const heroSection = layoutSections.find((s: any) => s.section_type === 'hero_banner')
  const heroSettings = heroSection?.settings || {}
  const heroBanner = banners.length > 0 ? banners[0] : null

  // Strict priority: 1. Admin desktop image, 2. Admin banner image, 3. null (renders branded maroon surface)
  const heroDesktopImage = heroSettings.desktop_image_url || heroSettings.image_url || heroBanner?.image_url || null
  const heroMobileImage = heroSettings.mobile_image_url || (heroBanner as any)?.mobile_image_url || heroDesktopImage
  const heroAlt = heroSettings.image_alt || (heroBanner as any)?.image_alt || heroBanner?.title || heroSection?.title || 'Shreengar Royal Couture'
  const heroEyebrow = heroSettings.eyebrow || (heroBanner as any)?.eyebrow || 'EXQUISITE HANDCRAFTED INDIAN WEAR'
  const heroTitle = heroSection?.title || heroBanner?.title || 'Celebrate Every Moment in Shreengar'
  const heroSubtitle = heroSection?.subtitle || heroBanner?.subtitle || 'Discover timeless Anarkalis, silk sarees, and handcrafted ethnic wear tailored for celebrations.'
  const heroCtaText = heroSettings.cta_text || heroBanner?.cta_text || 'Explore Collection'
  const heroCtaLink = heroSettings.cta_link || heroBanner?.cta_link || '/shop'

  // Focal position settings resolved from Admin
  const desktopPosX = heroSettings.desktop_position_x || '78%'
  const desktopPosY = heroSettings.desktop_position_y || 'center'
  const desktopObjectPosition = `${desktopPosX} ${desktopPosY}`

  const mobilePosX = heroSettings.mobile_position_x || 'center'
  const mobilePosY = heroSettings.mobile_position_y || 'center'
  const mobileObjectPosition = `${mobilePosX} ${mobilePosY}`

  // Authoritative collection product & count resolution (using public.product_collections & collection_id query)
  const featuredCollectionsData = await Promise.all(
    collections.map(async col => {
      const colProducts = await getCollectionProducts(col.id)
      return {
        collection: col,
        products: colProducts,
        designCount: colProducts.length,
      }
    })
  )

  // Order sections dynamically based on saved database sort_order from Admin Layout Manager
  const defaultNonHeroSections = [
    { id: 'sec-collections', section_type: 'collections', title: 'Featured Collections' },
    { id: 'sec-category', section_type: 'category_grid', title: 'Shop by Category' },
    { id: 'sec-bestsellers', section_type: 'products', title: 'Bestselling Classics' },
    { id: 'sec-new', section_type: 'products', title: 'New Arrivals 2026' },
    { id: 'sec-blogs', section_type: 'blog_articles', title: 'From the Shreengar Blog' },
  ]

  const activeNonHeroSections = layoutSections && layoutSections.length > 0
    ? layoutSections.filter((s: any) => s.section_type !== 'hero_banner')
    : defaultNonHeroSections

  return (
    <div className="w-full pb-12">
      {/* 1. Full-Bleed Homepage Hero Banner — ALWAYS Position 1 (Locked) */}
      <section className="relative left-1/2 w-screen -translate-x-1/2 isolate overflow-hidden h-[500px] md:h-[530px] lg:h-[540px] flex items-center bg-[#23000C] -mt-6">
        {/* Layer 1: Base Fallback Surface (z-0) */}
        <div className="absolute inset-0 bg-[#23000C] z-0" />

        {/* Layer 2: Admin Fashion Photograph Layer (z-1, Full-Bleed 100% width/height, model on right) */}
        {heroDesktopImage && (
          <>
            {/* Desktop Image */}
            <div className="hidden sm:block absolute inset-0 w-full h-full z-1">
              <Image
                src={heroDesktopImage}
                alt={heroAlt}
                fill
                sizes="100vw"
                className="object-cover transition-opacity duration-700"
                style={{ objectPosition: desktopObjectPosition }}
                priority
              />
            </div>
            {/* Mobile Image */}
            <div className="block sm:hidden absolute inset-0 w-full h-full z-1">
              <Image
                src={heroMobileImage || heroDesktopImage}
                alt={heroAlt}
                fill
                sizes="100vw"
                className="object-cover transition-opacity duration-700"
                style={{ objectPosition: mobileObjectPosition }}
                priority
              />
            </div>
          </>
        )}

        {/* Layer 3: Cinematic Translucent Royal Maroon Gradient Overlay (z-10) */}
        <div
          className="absolute inset-0 z-10 pointer-events-none"
          style={{
            background: 'linear-gradient(90deg, rgba(35, 0, 12, 0.98) 0%, rgba(66, 0, 23, 0.94) 20%, rgba(76, 5, 25, 0.76) 38%, rgba(76, 5, 25, 0.40) 52%, rgba(76, 5, 25, 0.12) 66%, rgba(76, 5, 25, 0.02) 82%, rgba(76, 5, 25, 0) 100%)',
          }}
        />

        {/* Layer 4: Layered Bottom Curve Transition (z-20, translucent wine curve + overlapping wine layer + antique-gold curved hairline) */}
        <div className="absolute bottom-0 inset-x-0 h-12 sm:h-14 lg:h-16 pointer-events-none z-20 overflow-hidden flex items-end" aria-hidden="true">
          <svg viewBox="0 0 1440 60" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full text-[#1A0109]" preserveAspectRatio="none">
            <path d="M0 25 Q 400 55 800 30 T 1440 18 L1440 60 L0 60 Z" fill="#25000D" opacity="0.35" />
            <path d="M0 20 Q 360 52 720 32 T 1440 12 L1440 60 L0 60 Z" fill="#1A0109" opacity="0.99" />
            <path d="M0 20 Q 360 52 720 32 T 1440 12" stroke="#D4AF37" strokeWidth="1.3" opacity="0.5" fill="none" />
          </svg>
        </div>

        {/* Layer 5: Dynamic Admin-Managed Content (z-30, Inner Max-Width Alignment Container) */}
        <div className="relative z-30 mx-auto flex h-full w-full max-w-7xl items-center px-6 lg:px-10">
          <div className="max-w-[450px] space-y-4 md:space-y-5">
            <div className="inline-flex items-center space-x-2 px-3 py-1 bg-[#D4AF37]/15 backdrop-blur-md rounded-[2px] border border-[#D4AF37]/40 mb-2">
              <Sparkles className="w-3.5 h-3.5 text-[#D4AF37]" />
              <span className="uppercase tracking-widest text-[9px] sm:text-[10px] font-bold text-[#D4AF37]">
                {heroEyebrow}
              </span>
            </div>

            <h1 className="font-serif text-4xl sm:text-5xl lg:text-[58px] font-bold leading-[0.99] tracking-normal text-[#FFF4DC] max-w-[450px]">
              {formatTitleWithBreaks(heroTitle)}
            </h1>

            <p className="text-sm sm:text-base text-[#F5E6D8] leading-relaxed font-light max-w-[410px]">
              {heroSubtitle}
            </p>

            <div className="pt-4 sm:pt-5">
              <Link
                href={heroCtaLink}
                className="inline-flex h-[46px] w-[200px] items-center justify-center gap-3 rounded-[4px] bg-[#D4AF37] px-6 font-serif font-bold text-[#25000D] shadow-md transition-colors hover:bg-[#E0B95A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFF4DC]"
              >
                <span>{heroCtaText}</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Dynamic Non-Hero Homepage Sections — Rendered in Persisted Saved Database Order */}
      {activeNonHeroSections.map((section: any) => {
        switch (section.section_type) {
          case 'collections': {
            if (featuredCollectionsData.length === 0) return null
            return (
              <section key={section.id} className="relative left-1/2 w-screen -translate-x-1/2 bg-background dark:bg-[#1A0109] pt-6 pb-12 sm:pb-16 border-b border-border-warm dark:border-rose-950/40">
                <div className="mx-auto w-full max-w-7xl px-6 lg:px-10 space-y-6">
                  <div className="flex items-center justify-between border-b border-[#5C0B26]/15 dark:border-[#D4AF37]/20 pb-4">
                    <div>
                      <span className="text-[10px] sm:text-xs uppercase tracking-widest text-amber-700 dark:text-[#D4AF37] font-bold">
                        EXCLUSIVE DROPS
                      </span>
                      <h2 className="font-serif text-2xl sm:text-3xl lg:text-4xl font-bold text-[#5C0B26] dark:text-[#FFF4DC] mt-0.5">
                        {section.title || 'Featured Collections'}
                      </h2>
                    </div>
                    <Link
                      href="/shop?filter=collections"
                      className="text-xs sm:text-sm font-semibold text-[#8A3A19] hover:text-[#5C0B26] dark:text-[#D4AF37] dark:hover:text-[#E0B95A] flex items-center space-x-1 transition-colors pr-0 lg:pr-48"
                    >
                      <span>View All</span>
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>

                  {/* Category-Style Portrait Editorial Collection Cards Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 sm:gap-6 pt-2">
                    {featuredCollectionsData.map(item => {
                      const col = item.collection
                      const colImage = resolveCollectionMedia({
                        collection: col,
                        assignedProducts: item.products,
                      })

                      const designLabel = item.designCount === 1 ? '1 Design' : `${item.designCount} Designs`
                      const hasValidImage = colImage && typeof colImage === 'string' && colImage.trim().length > 0 && !colImage.includes('placeholder')

                      return (
                        <Link
                          key={col.id}
                          href={`/collection/${col.slug}`}
                          data-featured-collection-card="true"
                          className="group relative rounded-[6px] overflow-hidden aspect-[4/5] w-full max-w-[260px] bg-rose-950/40 border border-[#5C0B26]/20 dark:border-[#D4AF37]/30 shadow-[0_12px_32px_rgba(76,5,25,0.12)] dark:shadow-[0_18px_50px_rgba(0,0,0,0.28)] hover:shadow-xl transition-all duration-300 flex flex-col justify-end"
                        >
                          {/* Image Layer: 100% Fill */}
                          {hasValidImage ? (
                            <Image
                              src={colImage}
                              alt={formatCollectionTitle(col.name)}
                              fill
                              sizes="(max-width: 640px) 50vw, 260px"
                              className="object-cover object-top group-hover:scale-105 transition-transform duration-500"
                            />
                          ) : (
                            <div className="absolute inset-0 bg-gradient-to-br from-rose-950 via-[#350817] to-[#1A0109] flex flex-col items-center justify-center p-4 text-[#D4AF37]">
                              <Sparkles className="w-8 h-8 opacity-50 mb-2" />
                              <span className="text-[10px] font-bold uppercase tracking-widest text-[#D4AF37]/80 text-center">Couture Selection</span>
                            </div>
                          )}

                          {/* Bottom Gradient Overlay & Text Content */}
                          <div className="absolute inset-0 bg-gradient-to-t from-rose-950/95 via-rose-950/40 to-transparent flex flex-col justify-end p-4 sm:p-5 text-[#FFF4DC] space-y-1 z-10">
                            <span className="text-[9px] sm:text-[10px] uppercase font-bold tracking-widest text-[#D4AF37]">
                              CURATED COLLECTION
                            </span>
                            <h3 className="font-serif font-bold text-base sm:text-lg text-[#FFF4DC] leading-snug group-hover:text-amber-300 transition-colors line-clamp-2">
                              {formatCollectionTitle(col.name)}
                            </h3>
                            <div className="flex items-center justify-between text-[11px] pt-1">
                              <span className="text-[#D4AF37] font-semibold">{designLabel}</span>
                              <span className="text-amber-200/90 font-medium group-hover:text-amber-300 flex items-center space-x-1 transition-colors">
                                <span>Shop Collection &rarr;</span>
                              </span>
                            </div>
                          </div>
                        </Link>
                      )
                    })}
                  </div>
                </div>
              </section>
            )
          }

          case 'category_grid': {
            if (categories.length === 0) return null
            return (
              <section key={section.id} className="mt-10 sm:mt-14 space-y-6">
                <div className="flex items-center justify-between border-b border-border-warm pb-4">
                  <div>
                    <span className="text-xs uppercase tracking-widest text-amber-700 font-bold">Curated Collections</span>
                    <h2 className="font-serif text-2xl sm:text-3xl font-bold text-foreground">
                      {section.title || 'Shop by Category'}
                    </h2>
                  </div>
                  <Link href="/shop" className="text-xs font-semibold text-amber-800 hover:text-foreground flex items-center space-x-1 transition-colors">
                    <span>View All Categories</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                  {categories.map(cat => (
                    <Link
                      key={cat.id}
                      href={`/category/${cat.slug}`}
                      className="group relative rounded-[4px] overflow-hidden aspect-[4/5] bg-rose-950/10 shadow-sm border border-border-warm hover:shadow-lg transition-all"
                    >
                      {cat.image_url && (
                        <Image
                          src={cat.image_url}
                          alt={cat.name}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-rose-950/90 via-rose-950/30 to-transparent flex flex-col justify-end p-4 text-amber-100">
                        <h3 className="font-serif font-bold text-sm sm:text-base group-hover:text-amber-300 transition-colors">
                          {cat.name}
                        </h3>
                        <span className="text-[10px] text-amber-200/70 font-medium">Explore Couture &rarr;</span>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )
          }

          case 'products': {
            const titleLower = (section.title || '').toLowerCase()
            const isNewArrivalsSection = titleLower.includes('new') || titleLower.includes('fresh')
            const displayProducts = isNewArrivalsSection ? newArrivals : bestSellers
            const sectionEyebrowText = isNewArrivalsSection ? 'Fresh Dropped' : 'Most Loved'
            const sectionTitleText = section.title || (isNewArrivalsSection ? 'New Arrivals 2026' : 'Bestselling Classics')
            const filterUrl = isNewArrivalsSection ? '/shop?filter=new' : '/shop?filter=bestsellers'
            const viewAllText = isNewArrivalsSection ? 'View All New' : 'View All Bestsellers'

            return (
              <section key={section.id} className="mt-10 sm:mt-14 space-y-6">
                <div className="flex items-center justify-between border-b border-border-warm pb-4">
                  <div>
                    <span className="text-xs uppercase tracking-widest text-amber-700 font-bold">{sectionEyebrowText}</span>
                    <h2 className="font-serif text-2xl sm:text-3xl font-bold text-foreground">{sectionTitleText}</h2>
                  </div>
                  <Link href={filterUrl} className="text-xs font-semibold text-amber-800 hover:text-foreground flex items-center space-x-1 transition-colors">
                    <span>{viewAllText}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>

                {displayProducts.length === 0 ? (
                  <div className="text-center py-12 bg-surface-muted/40 rounded-[4px] border border-border-warm">
                    <p className="text-sm text-muted-foreground font-serif">No products available</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                    {displayProducts.map(product => (
                      <ProductCard key={product.id} product={product} />
                    ))}
                  </div>
                )}
              </section>
            )
          }

          case 'blog_articles': {
            const assignedBlogItems = section.items && section.items.length > 0
              ? section.items.map((i: any) => i.resolvedEntity).filter((b: any) => b && b.is_published !== false)
              : blogs.filter(b => b.is_published !== false).slice(0, 3)

            if (assignedBlogItems.length === 0) return null

            return (
              <section key={section.id} className="mt-10 sm:mt-14 space-y-6">
                <div className="text-center max-w-xl mx-auto space-y-2">
                  <span className="text-xs uppercase tracking-widest text-amber-700 font-bold">Style Journal</span>
                  <h2 className="font-serif text-3xl font-bold text-foreground">{section.title || 'From the Shreengar Blog'}</h2>
                  {section.subtitle && (
                    <p className="text-xs text-muted-foreground">{section.subtitle}</p>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {assignedBlogItems.map((blog: any) => (
                    <div
                      key={blog.id}
                      className="bg-surface-muted/50 rounded-[4px] overflow-hidden border border-border-warm shadow-sm hover:shadow-md transition-shadow flex flex-col"
                    >
                      <div className="aspect-[16/10] relative bg-rose-950">
                        {blog.cover_image ? (
                          <Image
                            src={blog.cover_image}
                            alt={blog.title}
                            fill
                            className="object-cover"
                          />
                        ) : (
                          <div className="absolute inset-0 bg-gradient-to-br from-rose-950 via-[#350817] to-[#1A0109] flex flex-col items-center justify-center p-4 text-[#D4AF37]">
                            <Sparkles className="w-6 h-6 opacity-50 mb-1" />
                            <span className="text-[9px] font-bold uppercase tracking-widest text-[#D4AF37]/80">Shreengar Journal</span>
                          </div>
                        )}
                      </div>
                      <div className="p-5 flex flex-col justify-between flex-1 space-y-3">
                        <div>
                          <div className="flex items-center space-x-2 text-[10px] uppercase font-bold text-amber-800 mb-1">
                            <span>{blog.tags?.[0] || 'Fashion'}</span>
                            <span>•</span>
                            <span>{blog.author || 'Shreengar Team'}</span>
                          </div>
                          <h3 className="font-serif text-base font-bold text-foreground line-clamp-2 hover:text-amber-800 transition-colors">
                            {blog.title}
                          </h3>
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{blog.excerpt}</p>
                        </div>
                        <Link
                          href={`/blog/${blog.slug || blog.id}`}
                          className="text-xs font-bold text-foreground hover:text-amber-800 inline-flex items-center space-x-1 transition-colors pt-2"
                        >
                          <span>Read Article</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )
          }

          default:
            return null
        }
      })}
    </div>
  )
}
