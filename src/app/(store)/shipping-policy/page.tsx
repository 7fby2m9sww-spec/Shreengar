import React from 'react'
import { Breadcrumb } from '@/components/store/Breadcrumb'

export default function ShippingPolicyPage() {
  return (
    <div className="space-y-6 pb-16 max-w-4xl mx-auto text-foreground">
      <Breadcrumb items={[{ label: 'Shipping Policy' }]} />

      <h1 className="font-serif text-3xl font-bold">Shipping & Delivery Policy</h1>
      <p className="text-xs text-muted font-medium">Last updated: July 2026</p>

      <div className="bg-surface p-6 sm:p-8 rounded-2xl border border-border shadow-sm space-y-6 text-xs sm:text-sm leading-relaxed">
        <section className="space-y-2">
          <h3 className="font-serif text-base font-bold text-foreground">1. Dispatch & Delivery Timelines</h3>
          <p className="text-rose-900/80">
            Orders are dispatched within 24 to 48 hours. Standard delivery across metro cities in India takes 3 to 5 business days. Express shipping takes 1 to 2 business days.
          </p>
        </section>

        <section className="space-y-2">
          <h3 className="font-serif text-base font-bold text-foreground">2. Free Shipping Eligibility</h3>
          <p className="text-rose-900/80">
            We offer <strong>Free Express Shipping</strong> across India on all cart orders equal to or exceeding <strong>₹499</strong>. Orders under ₹499 incur a standard Shipping charges.
          </p>
        </section>

        <section className="space-y-2">
          <h3 className="font-serif text-base font-bold text-foreground">3. Order Tracking</h3>
          <p className="text-rose-900/80">Once dispatched, you will AWB tracking code. You can also track parcel progress directly on our <a href="/tracking" className="font-bold underline text-amber-800">Order Tracking Page</a>.
          </p>
        </section>
      </div>
    </div>
  )
}
