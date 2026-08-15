import React from 'react'
import { Breadcrumb } from '@/components/store/Breadcrumb'

export default function RefundPolicyPage() {
  return (
    <div className="space-y-6 pb-16 max-w-4xl mx-auto text-foreground">
      <Breadcrumb items={[{ label: 'Return & Refund Policy' }]} />

      <h1 className="font-serif text-3xl font-bold">Return & Refund Policy</h1>
      <p className="text-xs text-muted font-medium">Last updated: July 2026</p>

      <div className="bg-surface p-6 sm:p-8 rounded-2xl border border-border shadow-sm space-y-6 text-xs sm:text-sm leading-relaxed">
        <section className="space-y-2">
          <h3 className="font-serif text-base font-bold text-foreground">1. 7-Day Easy Return Guarantee</h3>
          <p className="text-rose-900/80">
            If you are not completely satisfied with the fit or style of your ethnic garment, you can request a return or size exchange within <strong>7 days of delivery</strong>.
          </p>
        </section>

        <section className="space-y-2">
          <h3 className="font-serif text-base font-bold text-foreground">2. Conditions for Return</h3>
          <ul className="list-disc list-inside space-y-1 text-rose-900/80">
            <li>Garments must be unworn, unwashed, and in original condition.</li>
            <li>Original tags and designer packaging must be intact.</li>
            <li>Custom tailored or altered dresses are non-returnable.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h3 className="font-serif text-base font-bold text-foreground">3. Refund Processing</h3>
          <p className="text-rose-900/80">
            Upon pickup and quality inspection at our Bengaluru facility, refunds are initiated within 48 hours directly to your original payment source (Bank Account, UPI, or Card).
          </p>
        </section>
      </div>
    </div>
  )
}
