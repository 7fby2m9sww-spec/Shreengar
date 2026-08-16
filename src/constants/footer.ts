import { FooterConfig } from '@/types/database'

export const DEFAULT_FOOTER_CONFIG: FooterConfig = {
  brand: {
    name: 'SHREENGAR',
    description: 'Royal Indian Ethnic Couture — Handcrafted Mulberry Silk Sarees, Flared Zardozi Anarkalis, and Designer Kurtis tailored to perfection.',
    supportEmailLabel: 'Support Email',
    supportEmail: 'care@shreengar.com',
    businessAddressLabel: 'Business Address',
    businessAddress: 'Coming Soon',
    enabled: true
  },
  quickLinks: {
    heading: 'Quick Links',
    enabled: true,
    items: [
      { id: 'ql-1', label: 'Shop Catalog', href: '/shop', enabled: true, sortOrder: 1 },
      { id: 'ql-2', label: 'About Us', href: '/about', enabled: true, sortOrder: 2 },
      { id: 'ql-3', label: 'Contact Support', href: '/contact', enabled: true, sortOrder: 3 },
      { id: 'ql-4', label: 'Frequently Asked Questions', href: '/faqs', enabled: true, sortOrder: 4 },
      { id: 'ql-5', label: 'Track Order Status', href: '/tracking', enabled: true, sortOrder: 5 }
    ]
  },
  policies: {
    heading: 'Policies & Compliance',
    enabled: true,
    items: [
      { id: 'pol-1', label: 'Privacy Policy', href: '/privacy-policy', enabled: true, sortOrder: 1 },
      { id: 'pol-2', label: 'Return & Refund Policy', href: '/refund-policy', enabled: true, sortOrder: 2 },
      { id: 'pol-3', label: 'Shipping & Delivery Policy', href: '/shipping-policy', enabled: true, sortOrder: 3 },
      { id: 'pol-4', label: 'Terms & Conditions', href: '/terms-and-conditions', enabled: true, sortOrder: 4 }
    ]
  },
  newsletter: {
    heading: 'Festive Circle',
    description: 'Subscribe for exclusive festive launch previews and couture collection updates.',
    placeholder: 'Enter email...',
    buttonLabel: 'Subscribe',
    enabled: false
  },
  bottomBar: {
    copyrightText: 'Shreengar Ethnic Couture. All rights reserved.',
    automaticYear: true,
    manualYear: '2026',
    authenticityText: '100% Authentic Handloom',
    craftedWithText: 'Crafted with love for Indian Fashion',
    enabled: true
  }
}
