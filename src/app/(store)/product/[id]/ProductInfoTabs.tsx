'use client'

import React, { useState } from 'react'
import { Product } from '@/types/database'

interface ProductInfoTabsProps {
  product: Product
}

export const ProductInfoTabs: React.FC<ProductInfoTabsProps> = ({ product }) => {
  const [activeTab, setActiveTab] = useState<'details' | 'specs' | 'delivery'>('details')
  return (
    <div className="bg-surface rounded-2xl border border-border-warm overflow-hidden shadow-sm">
      <div className="flex border-b border-border-warm text-xs font-serif font-bold">
        <button
          onClick={() => setActiveTab('details')}
          className={`flex-1 py-3 text-center border-b-2 transition-all cursor-pointer ${
            activeTab === 'details'
              ? 'border-brand-primary text-brand-primary bg-brand-primary/5 dark:border-gold dark:text-gold dark:bg-gold/10'
              : 'border-transparent text-muted-foreground hover:bg-surface-muted'
          }`}
        >
          Description & Details
        </button>
        <button
          onClick={() => setActiveTab('specs')}
          className={`flex-1 py-3 text-center border-b-2 transition-all cursor-pointer ${
            activeTab === 'specs'
              ? 'border-brand-primary text-brand-primary bg-brand-primary/5 dark:border-gold dark:text-gold dark:bg-gold/10'
              : 'border-transparent text-muted-foreground hover:bg-surface-muted'
          }`}
        >
          Specifications & Care
        </button>
        <button
          onClick={() => setActiveTab('delivery')}
          className={`flex-1 py-3 text-center border-b-2 transition-all cursor-pointer ${
            activeTab === 'delivery'
              ? 'border-brand-primary text-brand-primary bg-brand-primary/5 dark:border-gold dark:text-gold dark:bg-gold/10'
              : 'border-transparent text-muted-foreground hover:bg-surface-muted'
          }`}
        >
          Delivery & Returns
        </button>
      </div>

      <div className="p-6 text-xs text-foreground leading-relaxed space-y-4">
        {activeTab === 'details' && (
          <div className="space-y-4 animate-fade-in duration-300">
            {product.short_description && (
              <div className="p-3 bg-surface-warm rounded-xl border border-border-warm text-brand-primary dark:text-gold font-semibold italic">
                {product.short_description}
              </div>
            )}
            <div>
              <h4 className="font-bold text-brand-primary dark:text-gold mb-1 font-serif text-sm">Product Description</h4>
              <p className="whitespace-pre-line text-muted-foreground">{product.description}</p>
            </div>
            {product.details && product.details.length > 0 && (
              <div>
                <h4 className="font-bold text-brand-primary dark:text-gold mb-2 font-serif text-sm">Key Features</h4>
                <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 list-disc list-inside text-muted-foreground">
                  {product.details.map((detail, idx) => (
                    <li key={idx}>{detail}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {activeTab === 'specs' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in duration-300">
            <div>
              <h4 className="font-bold text-brand-primary dark:text-gold mb-2 font-serif text-sm">Specifications</h4>
              <table className="w-full border-collapse">
                <tbody>
                  {product.fabric && (
                    <tr className="border-b border-border-warm/50">
                      <td className="py-2 font-bold text-muted-foreground w-1/3">Fabric</td>
                      <td className="py-2 text-foreground">{product.fabric}</td>
                    </tr>
                  )}
                  {product.material && (
                    <tr className="border-b border-border-warm/50">
                      <td className="py-2 font-bold text-muted-foreground w-1/3">Material</td>
                      <td className="py-2 text-foreground">{product.material}</td>
                    </tr>
                  )}
                  {product.occasion && (
                    <tr className="border-b border-border-warm/50">
                      <td className="py-2 font-bold text-muted-foreground">Occasion</td>
                      <td className="py-2 text-foreground">{product.occasion}</td>
                    </tr>
                  )}
                  {product.fit && (
                    <tr className="border-b border-border-warm/50">
                      <td className="py-2 font-bold text-muted-foreground">Fit</td>
                      <td className="py-2 text-foreground">{product.fit}</td>
                    </tr>
                  )}
                  {product.sleeve_type && (
                    <tr className="border-b border-border-warm/50">
                      <td className="py-2 font-bold text-muted-foreground">Sleeve Type</td>
                      <td className="py-2 text-foreground">{product.sleeve_type}</td>
                    </tr>
                  )}
                  {product.neck_type && (
                    <tr className="border-b border-border-warm/50">
                      <td className="py-2 font-bold text-muted-foreground">Neck Type</td>
                      <td className="py-2 text-foreground">{product.neck_type}</td>
                    </tr>
                  )}
                  {product.pattern && (
                    <tr className="border-b border-border-warm/50">
                      <td className="py-2 font-bold text-muted-foreground">Pattern</td>
                      <td className="py-2 text-foreground">{product.pattern}</td>
                    </tr>
                  )}
                  {product.color_name && (
                    <tr className="border-b border-border-warm/50">
                      <td className="py-2 font-bold text-muted-foreground">Color</td>
                      <td className="py-2 text-foreground">{product.color_name}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div>
              <h4 className="font-bold text-brand-primary dark:text-gold mb-2 font-serif text-sm">Garment Care</h4>
              <div className="p-3 bg-surface-warm rounded-xl border border-border-warm text-muted-foreground">
                <p className="font-bold text-foreground mb-1">Care Instructions:</p>
                <p>{product.care_instructions || 'Dry Clean Only. Steam iron on reverse if needed.'}</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'delivery' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in duration-300">
            <div>
              <h4 className="font-bold text-brand-primary dark:text-gold mb-2 font-serif text-sm">Shipping Information</h4>
              <div className="space-y-2">
                {!product.delivery_available ? (
                  <p className="text-muted-foreground p-3 bg-surface-muted rounded-xl border border-border">Delivery is currently not available for this product.</p>
                ) : (
                  <>
                    <p className="text-muted-foreground">
                      {product.free_delivery || true ? (
                        <span className="font-bold text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-400 px-2 py-0.5 rounded mr-1">Free Delivery</span>
                      ) : (
                        <span>Standard delivery options apply.</span>
                      )}
                    </p>
                    {product.delivery_min_days && product.delivery_max_days && (
                      <p className="text-foreground">Estimated delivery time: <strong>{product.delivery_min_days} to {product.delivery_max_days} business days</strong>.</p>
                    )}
                    {product.delivery_message && (
                      <p className="text-muted-foreground italic">Note: {product.delivery_message}</p>
                    )}
                    <p className="text-muted-foreground">✓ Prepaid Orders Only. Cash on Delivery (COD) is not supported.</p>
                  </>
                )}
              </div>
            </div>
            <div>
              <h4 className="font-bold text-brand-primary dark:text-gold mb-2 font-serif text-sm">Returns & Exchanges Policy</h4>
                <p className="text-muted-foreground">
                  {product.is_returnable ? (
                    (() => {
                      const days = product.return_window_days;
                      const isValidWindow = days !== null && days !== undefined && Number.isInteger(days) && days >= 1;
                      if (isValidWindow) {
                        return (
                          <span>This item is eligible for return/replacement within <strong>{days} days</strong> of delivery. Return requests require manual approval. Inventory and refunds are not processed automatically.</span>
                        );
                      } else {
                        return (
                          <span>This item is eligible for return/replacement. Refer to our general return guidelines. Return requests require manual approval.</span>
                        );
                      }
                    })()
                  ) : (
                    <>
                      <span className="font-bold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/30 px-2 py-0.5 rounded border border-rose-100 dark:border-rose-900/30">Non-Returnable</span>
                      {product.return_policy_message && (
                        <span className="block mt-2 text-xs italic text-muted-foreground">Reason: {product.return_policy_message}</span>
                      )}
                    </>
                  )}
                </p>
                {product.is_returnable && product.return_policy_message && (
                  <p className="text-muted-foreground italic">Policy details: {product.return_policy_message}</p>
                )}
              </div>
            </div>
        )}
      </div>
    </div>
  )
}
