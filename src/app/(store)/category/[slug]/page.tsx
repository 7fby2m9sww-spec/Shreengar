import React from 'react'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import { getCategoryBySlug, getProducts } from '@/services/products'
import { ProductCard } from '@/components/store/ProductCard'
import { Breadcrumb } from '@/components/store/Breadcrumb'

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const category = await getCategoryBySlug(slug)

  if (!category || category.is_active === false) {
    notFound()
  }

  const products = await getProducts({ categoryId: category.id })

  return (
    <div className="space-y-6 pb-12">
      <Breadcrumb
        items={[
          { label: 'Shop', href: '/shop' },
          { label: category.name },
        ]}
      />

      {/* Category Hero Banner */}
      <div className="relative rounded-2xl overflow-hidden aspect-[16/5] bg-rose-950 text-amber-100 p-8 flex items-center shadow-lg border border-border">
        {category.image_url && (
          <Image
            src={category.image_url}
            alt={category.name}
            fill
            className="object-cover opacity-30 mix-blend-overlay"
          />
        )}
        <div className="relative z-10 max-w-xl space-y-2">
          <span className="text-xs uppercase tracking-widest text-amber-400 font-bold">Category Collection</span>
          <h1 className="font-serif text-3xl sm:text-4xl font-bold text-amber-100">{category.name}</h1>
          <p className="text-xs sm:text-sm text-amber-100/80 leading-relaxed">{category.description}</p>
        </div>
      </div>

      {/* Product List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-border">
          <h2 className="font-serif text-xl font-bold text-foreground">
            Available Designs ({products.length})
          </h2>
        </div>

        {products.length === 0 ? (
          <div className="text-center py-12 bg-surface-muted/40 rounded-xl border border-border text-muted-foreground font-serif text-sm">
            No products available in this category
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {products.map(product => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
