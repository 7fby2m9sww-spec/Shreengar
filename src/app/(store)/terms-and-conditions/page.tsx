import React from 'react'
import { Breadcrumb } from '@/components/store/Breadcrumb'

export default function TermsAndConditionsPage() {
  return (
    <div className="space-y-6 pb-16 max-w-4xl mx-auto text-foreground">
      <Breadcrumb items={[{ label: 'Terms & Conditions' }]} />

      <h1 className="font-serif text-3xl font-bold">Terms & Conditions</h1>
      <p className="text-xs text-muted font-medium">Last updated: July 2026</p>

      <div className="bg-surface p-6 sm:p-8 rounded-2xl border border-border shadow-sm space-y-6 text-xs sm:text-sm leading-relaxed">
        <section className="space-y-2">
          <h3 className="font-serif text-base font-bold text-foreground">1. Acceptance of Terms</h3>
          <p className="text-rose-900/80">
            By accessing and purchasing from Shreengar, you agree to comply with these terms of service and applicable Indian laws.
          </p>
        </section>

        <section className="space-y-2">
          <h3 className="font-serif text-base font-bold text-foreground">2. Product Colors & Descriptions</h3>
          <p className="text-rose-900/80">
            We make every effort to display true garment colors and handloom textures. Slight color variations may occur due to screen resolutions or hand-dyeing processes.
          </p>
        </section>

        <section className="space-y-2">
          <h3 className="font-serif text-base font-bold text-foreground">3. Pricing & Taxes</h3>
          <p className="text-rose-900/80">
            All prices listed on Shreengar are in Indian Rupees (INR) and are inclusive of GST taxes unless specified otherwise. Prices are subject to change without notice.
          </p>
        </section>
      </div>
    </div>
  )
}
