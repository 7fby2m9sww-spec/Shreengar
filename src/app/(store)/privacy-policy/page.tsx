import React from 'react'
import { Breadcrumb } from '@/components/store/Breadcrumb'

export default function PrivacyPolicyPage() {
  return (
    <div className="space-y-6 pb-16 max-w-4xl mx-auto text-foreground" data-privacy-policy-page>
      <Breadcrumb
        items={[{ label: 'Privacy Policy' }]}
        linkClassName="dark:!text-[#CDBBB3] dark:hover:!text-[#F1DDAF]"
        activeClassName="dark:!text-[#F1DDAF]"
        iconClassName="dark:!text-[#D4AF37]"
        separatorClassName="dark:!text-[#8A5A65]"
      />

      <h1 className="font-serif text-3xl font-bold text-foreground dark:!text-[#FFF0D2]">Privacy Policy</h1>
      <p className="text-xs text-muted dark:!text-[#BFAFA8] font-medium">Last updated: July 2026</p>

      <div
        className="bg-surface dark:!bg-[#2C151D] p-6 sm:p-8 rounded-2xl border border-border dark:!border-[#D4AF37]/22 shadow-sm dark:shadow-[0_18px_50px_rgba(0,0,0,0.32)] space-y-6 text-xs sm:text-sm leading-relaxed transition-colors"
        data-privacy-policy-card
      >
        <div className="space-y-6" data-privacy-policy-content>
          <section className="space-y-2">
            <h3 className="font-serif text-base font-bold text-foreground dark:!text-[#F6E4BE]">1. Information We Collect</h3>
            <p className="text-rose-900/80 dark:!text-[#D9C8C1]">
              When you make a purchase from Shreengar, we collect information including your full name, email address, phone number, shipping address, payment method preferences, and IP address.
            </p>
          </section>

          <section className="space-y-2">
            <h3 className="font-serif text-base font-bold text-foreground dark:!text-[#F6E4BE]">2. How We Use Your Information</h3>
            <p className="text-rose-900/80 dark:!text-[#D9C8C1]">
              We use your personal data to process your orders, arrange delivery with courier partners (e.g. Blue Dart, Delhivery), send transaction updates, and provide customer support.
            </p>
          </section>

          <section className="space-y-2">
            <h3 className="font-serif text-base font-bold text-foreground dark:!text-[#F6E4BE]">3. Data Protection & Security</h3>
            <p className="text-rose-900/80 dark:!text-[#D9C8C1]">
              All sensitive financial data is encrypted using SSL (Secure Sockets Layer). Payment transactions are processed directly via PCI-DSS compliant payment gateways (UPI, Credit/Debit cards). We never store your raw card numbers or CVV.
            </p>
          </section>

          <section className="space-y-2">
            <h3 className="font-serif text-base font-bold text-foreground dark:!text-[#F6E4BE]">4. Contact Privacy Officer</h3>
            <p className="text-rose-900/80 dark:!text-[#D9C8C1]">
              For privacy requests, data deletion, or questions, please contact our Privacy Desk at <a href="mailto:privacy@shreengar.com" className="font-bold underline text-amber-800 dark:!text-[#D4AF37] dark:hover:!text-[#E7C761]">privacy@shreengar.com</a>.
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
