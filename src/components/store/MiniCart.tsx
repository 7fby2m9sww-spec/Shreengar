'use client'

import React, { useRef, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { X, Trash2, ShoppingBag, Plus, Minus, PackageX } from 'lucide-react'
import { useCart } from '@/context/CartContext'
import { useToast } from '@/context/ToastContext'
import { useAuth } from '@/context/AuthContext'
import { formatINR } from '@/lib/utils'

export function MiniCart() {
  const { items, totals, isMiniCartOpen, closeMiniCart, updateQuantity, removeItem, isLoading } = useCart()
  const { showToast } = useToast()
  const { isAuthenticated } = useAuth()
  const drawerRef = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (drawerRef.current && !drawerRef.current.contains(e.target as Node)) {
        closeMiniCart()
      }
    }
    
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') closeMiniCart()
    }
    
    // Focus trap setup
    const handleTab = (e: KeyboardEvent) => {
      if (e.key === 'Tab' && drawerRef.current) {
        const focusableElements = drawerRef.current.querySelectorAll(
          'a[href], button, textarea, input, select, [tabindex]:not([tabindex="-1"])'
        )
        if (focusableElements.length === 0) return

        const firstElement = focusableElements[0] as HTMLElement
        const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            lastElement.focus()
            e.preventDefault()
          }
        } else {
          if (document.activeElement === lastElement) {
            firstElement.focus()
            e.preventDefault()
          }
        }
      }
    }

    if (isMiniCartOpen) {
      document.addEventListener('mousedown', handler)
      document.addEventListener('keydown', handleEscape)
      document.addEventListener('keydown', handleTab)
      
      // Focus first element
      setTimeout(() => {
        if (drawerRef.current) {
          const firstBtn = drawerRef.current.querySelector('button')
          if (firstBtn) firstBtn.focus()
        }
      }, 100)
    }
    
    return () => {
      document.removeEventListener('mousedown', handler)
      document.removeEventListener('keydown', handleEscape)
      document.removeEventListener('keydown', handleTab)
    }
  }, [isMiniCartOpen, closeMiniCart])

  // Prevent body scroll when open
  useEffect(() => {
    document.body.style.overflow = isMiniCartOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [isMiniCartOpen])

  const handleQuantityChange = async (itemId: string, newQty: number) => {
    if (newQty < 1) return
    const res = await updateQuantity(itemId, newQty)
    if (!res.success && res.error) showToast('Stock Limit', res.error, 'error')
  }

  const handleRemove = async (itemId: string, title: string) => {
    const res = await removeItem(itemId)
    if (res.success) showToast('Removed', `${title} removed from your bag.`, 'info')
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-black/30 dark:bg-black/60 transition-opacity duration-300 ${
          isMiniCartOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div
        ref={drawerRef}
        className={`fixed top-0 right-0 z-50 h-full w-full max-w-[400px] bg-surface shadow-2xl border-l border-border flex flex-col transition-transform duration-300 ease-in-out ${
          isMiniCartOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        role="dialog"
        aria-modal="true"
        aria-label="Shopping bag"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border-warm bg-brand-primary text-brand-primary-foreground shadow-md">
          <div className="flex items-center space-x-2">
            <ShoppingBag className="w-5 h-5 text-gold" />
            <h2 className="font-serif font-bold text-base tracking-wide">
              Your Bag {isAuthenticated && items.length > 0 && <span className="opacity-80 font-sans text-sm ml-1">({items.reduce((s, i) => s + i.quantity, 0)})</span>}
            </h2>
          </div>
          <button
            onClick={closeMiniCart}
            className="p-1.5 rounded-lg text-brand-primary-foreground/80 hover:text-brand-primary-foreground hover:bg-brand-primary-hover/50 transition-colors"
            aria-label="Close shopping bag"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Free Shipping Alert Bar */}
        {isAuthenticated && items.length > 0 && (
          <div className="bg-surface-warm px-5 py-3 border-b border-border-warm text-xs space-y-1.5">
            {totals.subtotal >= 2000 ? (
              <div className="flex items-center space-x-2 text-emerald-700 dark:text-emerald-400 font-bold font-serif">
                <span>✨ You unlocked FREE Express Delivery!</span>
              </div>
            ) : (
              <div className="flex justify-between items-center text-foreground font-medium">
                <span>Add <strong className="text-brand-primary dark:text-gold">{formatINR(2000 - totals.subtotal)}</strong> for Free Express Delivery</span>
                <span className="text-[10px] font-bold text-gold uppercase">{Math.min(100, Math.round((totals.subtotal / 2000) * 100))}%</span>
              </div>
            )}
            <div className="w-full h-1.5 bg-border-warm/40 rounded-full overflow-hidden">
              <div
                className="h-full bg-gold transition-all duration-500 rounded-full"
                style={{ width: `${Math.min(100, Math.round((totals.subtotal / 2000) * 100))}%` }}
              />
            </div>
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto overscroll-contain">
          {isLoading ? (
            <div className="flex items-center justify-center h-48">
              <div className="w-8 h-8 border-2 border-border border-t-brand-primary rounded-full animate-spin" />
            </div>
          ) : !isAuthenticated ? (
            <div className="flex flex-col items-center justify-center h-full min-h-[300px] space-y-5 px-6 text-center">
              <div className="w-16 h-16 rounded-full bg-surface-muted flex items-center justify-center border border-border-warm shadow-sm">
                <ShoppingBag className="w-7 h-7 text-gold" />
              </div>
              <div className="space-y-1">
                <h3 className="font-serif font-bold text-lg text-foreground">Sign in to view your bag</h3>
                <p className="text-sm text-muted-foreground font-light">Log in to sync your cart across your devices</p>
              </div>
              <Link
                href="/auth/login"
                onClick={closeMiniCart}
                className="px-6 py-2.5 bg-brand-primary text-brand-primary-foreground font-serif font-bold text-sm rounded-xl hover:bg-brand-primary-hover transition-colors shadow-md"
              >
                Sign In
              </Link>
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full min-h-[300px] space-y-5 px-6 text-center">
              <div className="w-16 h-16 rounded-full bg-surface-muted flex items-center justify-center border border-border-warm shadow-sm">
                <ShoppingBag className="w-7 h-7 text-gold" />
              </div>
              <div className="space-y-1">
                <h3 className="font-serif font-bold text-lg text-foreground">Your bag is empty</h3>
                <p className="text-sm text-muted-foreground font-light">Discover our exclusive ethnic collection</p>
              </div>
              <Link
                href="/shop"
                onClick={closeMiniCart}
                className="px-6 py-2.5 bg-brand-primary text-brand-primary-foreground font-serif font-bold text-sm rounded-xl hover:bg-brand-primary-hover transition-colors shadow-md"
              >
                Shop Collection
              </Link>
            </div>
          ) : (
            <ul className="divide-y divide-border-warm/40 px-4 py-2">
              {items.map(item => (
                <li key={item.id} className="py-4 flex items-start space-x-4">
                  {/* Image */}
                  <div className="flex-shrink-0 w-[72px] h-[90px] rounded-xl overflow-hidden border border-border-warm bg-surface-muted shadow-sm">
                    {item.image ? (
                      <Image
                        src={item.image}
                        alt={item.title}
                        width={72}
                        height={90}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ShoppingBag className="w-6 h-6 text-muted-foreground" />
                      </div>
                    )}
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <h4 className="font-serif font-bold text-sm text-foreground leading-snug line-clamp-2">{item.title}</h4>
                    <div className="flex flex-col space-y-0.5 text-xs text-muted-foreground font-light">
                      {item.size && item.size !== 'One Size' && item.size !== 'Free Size' && (
                        <div>
                          <span className="font-semibold text-foreground">Size:</span> {item.size}
                        </div>
                      )}
                      {item.showColorOption !== false && item.colorName && item.colorName !== 'Default' && (
                        <div className="flex items-center space-x-1">
                          <span className="font-semibold text-foreground">Colour:</span>
                          <span
                            className="w-2.5 h-2.5 rounded-full border border-border shadow-sm flex-shrink-0"
                            style={{ backgroundColor: item.colorCode || '#ccc' }}
                          />
                          <span>{item.colorName}</span>
                        </div>
                      )}
                    </div>
                    <p className="font-serif font-bold text-sm text-brand-primary dark:text-gold">{formatINR(item.price)}</p>

                    {/* Stock warning */}
                    {item.stockQuantity < 5 && item.stockQuantity > 0 && (
                      <p className="text-[10px] text-accent font-medium mt-0.5">Only {item.stockQuantity} left!</p>
                    )}

                    {/* Quantity + Remove */}
                    <div className="flex items-center justify-between pt-2">
                      <div className="flex items-center space-x-1 bg-surface-muted border border-border-warm rounded-lg shadow-sm">
                        <button
                          onClick={() => handleQuantityChange(item.id, item.quantity - 1)}
                          disabled={item.quantity <= 1}
                          className="w-7 h-7 flex items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                          aria-label="Decrease quantity"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="w-6 text-center text-xs font-semibold text-foreground">{item.quantity}</span>
                        <button
                          onClick={() => handleQuantityChange(item.id, item.quantity + 1)}
                          disabled={item.quantity >= item.stockQuantity}
                          className="w-7 h-7 flex items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                          aria-label="Increase quantity"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <button
                        onClick={() => handleRemove(item.id, item.title)}
                        className="p-1.5 text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-md transition-colors"
                        aria-label="Remove item"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Footer — Totals + CTA */}
        {isAuthenticated && items.length > 0 && (
          <div className="border-t border-border-warm bg-surface-elevated px-5 py-5 space-y-4 shadow-lg">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal</span>
                <span className="font-medium text-foreground">{formatINR(totals.subtotal - totals.couponDiscount)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Shipping</span>
                <span className="font-medium text-foreground text-xs italic">Calculated at checkout</span>
              </div>
              <div className="flex justify-between text-foreground font-bold border-t border-border-warm pt-2 mt-2">
                <span className="text-base font-serif">Subtotal</span>
                <span className="text-base font-serif text-brand-primary dark:text-gold">{formatINR(totals.subtotal - totals.couponDiscount)}</span>
              </div>
            </div>

            <div className="space-y-2.5 pt-1">
              <Link
                href="/checkout"
                onClick={closeMiniCart}
                className="flex items-center justify-center w-full py-3.5 bg-brand-primary hover:bg-brand-primary-hover text-brand-primary-foreground font-serif font-bold text-sm rounded-xl shadow-lg transition-all hover:scale-[1.01]"
              >
                Proceed to Checkout
              </Link>
              <Link
                href="/cart"
                onClick={closeMiniCart}
                className="flex items-center justify-center w-full py-2.5 border border-border-warm bg-transparent text-foreground font-medium text-sm rounded-xl hover:bg-surface-muted transition-colors"
              >
                View Cart
              </Link>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
