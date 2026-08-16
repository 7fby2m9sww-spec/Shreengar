import React from 'react'
import { getPaginatedProducts, getCategories, getCollections } from '@/services/products'
import { ProductCard } from '@/components/store/ProductCard'
import { Breadcrumb } from '@/components/store/Breadcrumb'
import { ShopSortSelect } from '@/components/store/ShopSortSelect'
import Link from 'next/link'
import { SlidersHorizontal, Search, ChevronLeft, ChevronRight } from 'lucide-react'

const PAGE_SIZE = 12

export default async function ShopPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>
}) {
  const params = await searchParams
  const categoryId = params.category
  const collectionId = params.collection
  const searchQuery = params.search
  const sort = params.sort || 'newest'
  const size = params.size
  const color = params.color
  const availability = params.availability as 'in_stock' | 'out_of_stock' | undefined
  const minPrice = params.minPrice ? Number(params.minPrice) : undefined
  const maxPrice = params.maxPrice ? Number(params.maxPrice) : undefined
  const isFeatured = params.featured === '1' ? true : undefined
  const isDiscounted = params.discounted === '1' ? true : undefined
  const page = Math.max(1, Number(params.page || 1))

  const [{ products, totalCount, totalPages }, categories, collections] = await Promise.all([
    getPaginatedProducts({
      categoryId,
      collectionId,
      search: searchQuery,
      sort,
      size,
      color,
      availability,
      minPrice,
      maxPrice,
      isFeatured,
      isDiscounted,
      page,
      pageSize: PAGE_SIZE,
    }),
    getCategories(),
    getCollections(),
  ])

  // Build a URLSearchParams helper for pagination links preserving all current filters
  const buildUrl = (newPage: number) => {
    const sp = new URLSearchParams()
    if (categoryId) sp.set('category', categoryId)
    if (collectionId) sp.set('collection', collectionId)
    if (searchQuery) sp.set('search', searchQuery)
    if (sort !== 'newest') sp.set('sort', sort)
    if (size) sp.set('size', size)
    if (color) sp.set('color', color)
    if (availability) sp.set('availability', availability)
    if (minPrice !== undefined) sp.set('minPrice', String(minPrice))
    if (maxPrice !== undefined) sp.set('maxPrice', String(maxPrice))
    if (isFeatured) sp.set('featured', '1')
    if (isDiscounted) sp.set('discounted', '1')
    sp.set('page', String(newPage))
    return `/shop?${sp.toString()}`
  }

  return (
    <div className="space-y-8 pb-16">
      <Breadcrumb items={[{ label: 'Shop All Collections' }]} />

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-border">
        <div>
          <h1 className="font-serif text-3xl sm:text-4xl font-bold text-foreground">
            Royal Ethnic Collection
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Discover {totalCount} handcrafted silk sarees, flared Anarkalis, and designer Kurtis.
          </p>
        </div>

        {/* Search & Sort Controls */}
        <div className="flex flex-wrap items-center gap-3">
          <form action="/shop" method="GET" className="relative">
            {categoryId && <input type="hidden" name="category" value={categoryId} />}
            {collectionId && <input type="hidden" name="collection" value={collectionId} />}
            {sort !== 'newest' && <input type="hidden" name="sort" value={sort} />}
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              name="search"
              defaultValue={searchQuery || ''}
              placeholder="Search products..."
              className="pl-9 pr-4 py-2 text-xs bg-surface border border-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-rose-900"
            />
          </form>

          <ShopSortSelect currentSort={sort} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Sidebar Filters (3 cols) */}
        <aside className="lg:col-span-3 space-y-5">
          {/* Categories Filter */}
          <div className="bg-surface-muted/50 p-5 rounded-2xl border border-border space-y-3">
            <h3 className="font-serif text-sm font-bold uppercase tracking-wider text-foreground pb-2 border-b border-border">
              Categories
            </h3>
            <ul className="space-y-1.5 text-xs">
              <li>
                <Link
                  href="/shop"
                  className={`block px-2.5 py-1.5 rounded-lg transition-colors ${
                    !categoryId ? 'bg-rose-950 text-amber-100 font-bold' : 'text-muted-foreground hover:bg-amber-100/60 dark:hover:bg-rose-950/40'
                  }`}
                >
                  All Categories
                </Link>
              </li>
              {categories
                .filter(cat => !cat.name?.toLowerCase().includes('kurti') && !cat.slug?.toLowerCase().includes('kurti'))
                .map(cat => (
                  <li key={cat.id}>
                    <Link
                      href={`/shop?category=${cat.id}`}
                      className={`block px-2.5 py-1.5 rounded-lg transition-colors ${
                        categoryId === cat.id ? 'bg-rose-950 text-amber-100 font-bold' : 'text-muted-foreground hover:bg-amber-100/60 dark:hover:bg-rose-950/40'
                      }`}
                    >
                      {cat.name}
                    </Link>
                  </li>
                ))}
            </ul>
          </div>

          {/* Collections Filter */}
          <div className="bg-surface-muted/50 p-5 rounded-2xl border border-border space-y-3">
            <h3 className="font-serif text-sm font-bold uppercase tracking-wider text-foreground pb-2 border-b border-border">
              Festive Collections
            </h3>
            <ul className="space-y-1.5 text-xs">
              <li>
                <Link
                  href="/shop"
                  className={`block px-2.5 py-1.5 rounded-lg transition-colors ${
                    !collectionId ? 'bg-rose-950 text-amber-100 font-bold' : 'text-muted-foreground hover:bg-amber-100/60 dark:hover:bg-rose-950/40'
                  }`}
                >
                  All Collections
                </Link>
              </li>
              {collections.map(col => (
                <li key={col.id}>
                  <Link
                    href={`/collection/${col.slug}`}
                    className={`block px-2.5 py-1.5 rounded-lg transition-colors ${
                      collectionId === col.slug || collectionId === col.id ? 'bg-rose-950 text-amber-100 font-bold' : 'text-muted-foreground hover:bg-amber-100/60 dark:hover:bg-rose-950/40'
                    }`}
                  >
                    {col.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Price Filter */}
          <div className="bg-surface-muted/50 p-5 rounded-2xl border border-border space-y-3">
            <h3 className="font-serif text-sm font-bold uppercase tracking-wider text-foreground pb-2 border-b border-border">
              Price Range
            </h3>
            <form action="/shop" method="GET" className="space-y-2">
              {categoryId && <input type="hidden" name="category" value={categoryId} />}
              {collectionId && <input type="hidden" name="collection" value={collectionId} />}
              {searchQuery && <input type="hidden" name="search" value={searchQuery} />}
              {sort !== 'newest' && <input type="hidden" name="sort" value={sort} />}
              <div className="flex gap-2">
                <input
                  type="number"
                  name="minPrice"
                  defaultValue={minPrice ?? ''}
                  placeholder="Min ₹"
                  className="w-full px-2 py-1.5 text-xs bg-surface border border-border rounded-lg text-foreground"
                />
                <input
                  type="number"
                  name="maxPrice"
                  defaultValue={maxPrice ?? ''}
                  placeholder="Max ₹"
                  className="w-full px-2 py-1.5 text-xs bg-surface border border-border rounded-lg text-foreground"
                />
              </div>
              <button
                type="submit"
                className="w-full py-1.5 text-xs font-bold bg-rose-950 text-amber-100 rounded-lg hover:bg-rose-900 transition-colors"
              >
                Apply Price Filter
              </button>
            </form>
          </div>

          {/* Availability Filter */}
          <div className="bg-surface-muted/50 p-5 rounded-2xl border border-border space-y-2">
            <h3 className="font-serif text-sm font-bold uppercase tracking-wider text-foreground pb-2 border-b border-border">
              Availability
            </h3>
            <div className="space-y-1.5 text-xs">
              <Link
                href={`/shop?${new URLSearchParams({ ...(categoryId ? { category: categoryId } : {}), ...(searchQuery ? { search: searchQuery } : {}), availability: 'in_stock' }).toString()}`}
                className={`block px-2.5 py-1.5 rounded-lg transition-colors ${availability === 'in_stock' ? 'bg-rose-950 text-amber-100 font-bold' : 'text-muted-foreground hover:bg-amber-100/60 dark:hover:bg-rose-950/40'}`}
              >
                In Stock
              </Link>
              <Link
                href={`/shop?${new URLSearchParams({ ...(categoryId ? { category: categoryId } : {}), ...(searchQuery ? { search: searchQuery } : {}), availability: 'out_of_stock' }).toString()}`}
                className={`block px-2.5 py-1.5 rounded-lg transition-colors ${availability === 'out_of_stock' ? 'bg-rose-950 text-amber-100 font-bold' : 'text-muted-foreground hover:bg-amber-100/60 dark:hover:bg-rose-950/40'}`}
              >
                Out of Stock
              </Link>
            </div>
          </div>

          {/* Quick Flags */}
          <div className="bg-surface-muted/50 p-5 rounded-2xl border border-border space-y-2">
            <h3 className="font-serif text-sm font-bold uppercase tracking-wider text-foreground pb-2 border-b border-border">
              Shop By
            </h3>
            <div className="space-y-1.5 text-xs">
              <Link
                href="/shop?featured=1"
                className={`block px-2.5 py-1.5 rounded-lg transition-colors ${isFeatured ? 'bg-rose-950 text-amber-100 font-bold' : 'text-muted-foreground hover:bg-amber-100/60 dark:hover:bg-rose-950/40'}`}
              >
                ✦ Featured Designs
              </Link>
              <Link
                href="/shop?discounted=1"
                className={`block px-2.5 py-1.5 rounded-lg transition-colors ${isDiscounted ? 'bg-rose-950 text-amber-100 font-bold' : 'text-muted-foreground hover:bg-amber-100/60 dark:hover:bg-rose-950/40'}`}
              >
                % On Sale
              </Link>
            </div>
          </div>

          {/* Clear Filters */}
          {(categoryId || collectionId || searchQuery || size || color || availability || minPrice || maxPrice || isFeatured || isDiscounted) && (
            <Link
              href="/shop"
              className="block w-full text-center py-2 text-xs font-bold text-muted-foreground border border-border rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-colors"
            >
              ✕ Clear All Filters
            </Link>
          )}
        </aside>

        {/* Product Grid (9 cols) */}
        <main className="lg:col-span-9 space-y-6">
          {products.length === 0 ? (
            <div className="text-center py-16 bg-surface-muted/40 rounded-2xl border border-border space-y-3">
              <h3 className="font-serif text-lg font-bold text-foreground">No products are available at the moment.</h3>
              {collections.length > 0 && (
                <Link href="/shop" className="inline-block mt-4 px-4 py-2 bg-rose-950 text-amber-100 text-xs font-serif font-bold rounded-xl hover:bg-rose-900 transition-colors">
                  Browse Collections
                </Link>
              )}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
                {products.map(product => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between border-t border-border pt-6">
                  <span className="text-xs text-muted-foreground">
                    Showing {((page - 1) * PAGE_SIZE) + 1}–{Math.min(page * PAGE_SIZE, totalCount)} of {totalCount} products
                  </span>
                  <div className="flex items-center space-x-2">
                    {page > 1 ? (
                      <Link
                        href={buildUrl(page - 1)}
                        className="flex items-center space-x-1 px-3 py-1.5 text-xs font-bold bg-surface border border-border rounded-lg text-foreground hover:bg-surface-muted transition-colors"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                        <span>Prev</span>
                      </Link>
                    ) : (
                      <span className="flex items-center space-x-1 px-3 py-1.5 text-xs font-bold bg-surface border border-border rounded-lg text-muted-foreground cursor-not-allowed">
                        <ChevronLeft className="w-3.5 h-3.5" />
                        <span>Prev</span>
                      </span>
                    )}

                    <div className="flex items-center space-x-1">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNum: number
                        if (totalPages <= 5) {
                          pageNum = i + 1
                        } else if (page <= 3) {
                          pageNum = i + 1
                        } else if (page >= totalPages - 2) {
                          pageNum = totalPages - 4 + i
                        } else {
                          pageNum = page - 2 + i
                        }
                        return (
                          <Link
                            key={pageNum}
                            href={buildUrl(pageNum)}
                            className={`w-8 h-8 flex items-center justify-center text-xs font-bold rounded-lg transition-colors ${
                              pageNum === page
                                ? 'bg-rose-950 text-amber-100'
                                : 'bg-surface border border-border text-foreground hover:bg-surface-muted'
                            }`}
                          >
                            {pageNum}
                          </Link>
                        )
                      })}
                    </div>

                    {page < totalPages ? (
                      <Link
                        href={buildUrl(page + 1)}
                        className="flex items-center space-x-1 px-3 py-1.5 text-xs font-bold bg-surface border border-border rounded-lg text-foreground hover:bg-surface-muted transition-colors"
                      >
                        <span>Next</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </Link>
                    ) : (
                      <span className="flex items-center space-x-1 px-3 py-1.5 text-xs font-bold bg-surface border border-border rounded-lg text-muted-foreground cursor-not-allowed">
                        <span>Next</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </span>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  )
}
