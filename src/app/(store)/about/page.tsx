import React from 'react'
import Image from 'next/image'
import { Breadcrumb } from '@/components/store/Breadcrumb'
import { Award, Heart, Sparkles, Shield } from 'lucide-react'

export default function AboutPage() {
  return (
    <div className="space-y-12 pb-16 max-w-5xl mx-auto">
      <Breadcrumb items={[{ label: 'About Us' }]} />

      {/* Brand Story Hero Banner */}
      <div className="relative rounded-2xl overflow-hidden aspect-[16/6] min-h-[300px] bg-rose-950 text-amber-100 p-8 sm:p-12 flex items-center shadow-xl border border-border">
        <Image
          src="/assets/silk_texture.jpg"
          alt="Shreengar Craftsmanship"
          fill
          className="object-cover opacity-25 mix-blend-overlay"
        />
        <div className="relative z-10 max-w-2xl space-y-3">
          <span className="inline-flex items-center space-x-1 px-3 py-1 bg-amber-500/20 backdrop-blur-md rounded-full border border-amber-400/30 text-amber-300 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Royal Ethnic Couture</span>
          </span>
          <h1 className="font-serif text-3xl sm:text-5xl font-bold leading-tight text-amber-100">
            The Legend of Shreengar
          </h1>
          <p className="text-xs sm:text-sm text-amber-100/80 leading-relaxed font-light">
            Crafting royal Indian ethnic heritage into modern silhouettes — Zardozi hand embroidery, pure Mulberry Silks, and Chanderi weaves.
          </p>
        </div>
      </div>

      {/* Brand Mission & Story */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
        <div className="space-y-4">
          <span className="text-xs font-bold uppercase tracking-widest text-amber-800">Our Heritage Story</span>
          <h2 className="font-serif text-2xl sm:text-3xl font-bold text-foreground">
            Preserving Artisanal Indian Craftsmanship
          </h2>
          <p className="text-xs sm:text-sm text-rose-900/80 leading-relaxed">
            Founded with a vision to celebrate Indian ethnic aesthetics, <strong>Shreengar</strong> brings together master weavers, Zardozi artisans, and modern fashion designers to create heirloom garments.
          </p>
          <p className="text-xs sm:text-sm text-rose-900/80 leading-relaxed">
            Every garment — from our flared velvet Anarkalis to lightweight short Kurtis — undergoes rigorous quality checks and hand finishing to ensure timeless perfection.
          </p>
        </div>

        <div className="aspect-[4/3] rounded-2xl overflow-hidden bg-rose-950/5 border border-border shadow-md relative">
          <Image
            src="/assets/anarkali_1.jpg"
            alt="Royal Anarkali Set"
            fill
            className="object-cover object-top"
          />
        </div>
      </div>

      {/* Core Pillars */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-6">
        <div className="p-6 bg-surface-muted/60 rounded-2xl border border-border shadow-sm text-center space-y-2">
          <Award className="w-8 h-8 text-amber-700 mx-auto" />
          <h4 className="font-serif font-bold text-base text-foreground">100% Handloom Authenticity</h4>
          <p className="text-xs text-muted-foreground">Sourced directly from weaving clusters across Banaras, Chanderi, and Jaipur.</p>
        </div>

        <div className="p-6 bg-surface-muted/60 rounded-2xl border border-border shadow-sm text-center space-y-2">
          <Heart className="w-8 h-8 text-rose-700 mx-auto" />
          <h4 className="font-serif font-bold text-base text-foreground">Fair Trade & Sustainable</h4>
          <p className="text-xs text-muted-foreground">Empowering traditional Indian textile artisans with fair wages and safe workshops.</p>
        </div>

        <div className="p-6 bg-surface-muted/60 rounded-2xl border border-border shadow-sm text-center space-y-2">
          <Shield className="w-8 h-8 text-amber-700 mx-auto" />
          <h4 className="font-serif font-bold text-base text-foreground">Unmatched Quality</h4>
          <p className="text-xs text-muted-foreground">Premium Santoon linings, heavy zari handwork, and flawless tailoring in every stitch.</p>
        </div>
      </div>
    </div>
  )
}
