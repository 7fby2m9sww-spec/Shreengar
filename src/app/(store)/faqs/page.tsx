import React from 'react'
import { Breadcrumb } from '@/components/store/Breadcrumb'
import { HelpCircle } from 'lucide-react'

export default function FAQsPage() {
  const faqs = [
    {
      q: 'How do I know my correct size for Anarkalis and Kurtis?',
      a: 'Each product detail page contains an interactive Size Chart link with chest, waist, and length measurements in inches. If you fall between sizes, we recommend selecting one size larger for comfortable festive wear.',
    },
    {
      q: 'Are all Shreengar fabrics authentic silk and handloom?',
      a: 'Yes, 100% of our silk sarees and ethnic sets are crafted using genuine Mulberry Silk, Chanderi weave, and organic cotton directly from certified Indian artisanal weaving clusters.',
    },
    {
      q: 'Can I pay via Cash on Delivery (COD)?',
      a: 'Yes, we offer Cash on Delivery across most pin codes in India. You can select Cash on Delivery at checkout.',
    },
    {
      q: 'How can I alter or customize the dress length?',
      a: 'We offer custom tailoring assistance for festive Anarkalis and ethnic sets. Contact our concierge team via care@shreengar.com after placing your order.',
    },
  ]

  return (
    <div className="space-y-6 pb-16 max-w-4xl mx-auto text-foreground">
      <Breadcrumb items={[{ label: 'Frequently Asked Questions' }]} />

      <div className="flex items-center space-x-3">
        <HelpCircle className="w-8 h-8 text-amber-700" />
        <h1 className="font-serif text-3xl font-bold">Frequently Asked Questions (FAQs)</h1>
      </div>

      <div className="space-y-4">
        {faqs.map((faq, idx) => (
          <div key={idx} className="bg-surface p-6 rounded-2xl border border-border shadow-sm space-y-2">
            <h3 className="font-serif font-bold text-base text-foreground">Q: {faq.q}</h3>
            <p className="text-xs sm:text-sm text-rose-900/80 leading-relaxed">A: {faq.a}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
