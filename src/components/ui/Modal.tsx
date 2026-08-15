'use client'

import React, { useEffect, useRef, useId } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ModalProps {
  /** Controls visibility of the modal */
  isOpen: boolean
  /** Callback invoked when the modal should close */
  onClose: () => void
  /** Optional title displayed at the top of the modal */
  title?: string
  /** Modal body content */
  children: React.ReactNode
  /** Additional CSS classes for the dialog container */
  className?: string
  /** Ref to an element that should receive initial focus when the modal opens */
  initialFocusRef?: React.RefObject<HTMLElement | null>
  /** Accessible label used when no title is supplied */
  ariaLabel?: string
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  className,
  initialFocusRef,
  ariaLabel,
}) => {
  const modalRef = useRef<HTMLDivElement>(null)
  // Store the element that triggered the modal so we can restore focus later
  const openerRef = useRef<HTMLElement | null>(null)
  // Keep a stable reference to the latest onClose callback
  const onCloseRef = useRef(onClose)
  const titleId = useId()

  // Update the stable onClose reference whenever the prop changes
  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  // ---------------------------------------------------------------------
  // Focus management & ESC handling – runs **only** when the modal opens
  // ---------------------------------------------------------------------
  useEffect(() => {
    if (!isOpen) return

    // -------------------------------------------------------------------
    // Escape key handling – invokes the latest onClose via the ref
    // -------------------------------------------------------------------
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onCloseRef.current()
      }
    }

    // -------------------------------------------------------------------
    // Tab key handling – traps focus within the modal
    // -------------------------------------------------------------------
    const focusableSelector =
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== 'Tab' || !modalRef.current) return

      const focusableElements = Array.from(
        modalRef.current.querySelectorAll<HTMLElement>(focusableSelector)
      )

      // No focusable children – keep focus on the container itself
      if (focusableElements.length === 0) {
        e.preventDefault()
        modalRef.current?.focus()
        return
      }

      const activeElement = document.activeElement
      const active =
        activeElement instanceof HTMLElement ? activeElement : null
      const isInside = active !== null && modalRef.current.contains(active)

      // If focus escaped the modal, move it to the appropriate edge
      if (!isInside) {
        e.preventDefault()
        if (e.shiftKey) {
          focusableElements[focusableElements.length - 1].focus()
        } else {
          focusableElements[0].focus()
        }
        return
      }

      // Single focusable element – ensure it receives focus
      if (focusableElements.length === 1) {
        e.preventDefault()
        if (active !== focusableElements[0]) {
          focusableElements[0].focus()
        }
        return
      }

      const activeIndex = focusableElements.indexOf(active)

      // Active element is not in the focusable list (e.g., container or heading)
      if (activeIndex === -1) {
        e.preventDefault()
        if (e.shiftKey) {
          focusableElements[focusableElements.length - 1].focus()
        } else {
          focusableElements[0].focus()
        }
        return
      }

      const first = focusableElements[0]
      const last = focusableElements[focusableElements.length - 1]

      if (e.shiftKey) {
        if (active === first) {
          e.preventDefault()
          last.focus()
        }
      } else {
        if (active === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }

    // -------------------------------------------------------------------
    // Preserve original body overflow value and prevent scrolling while open
    // -------------------------------------------------------------------
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    // -------------------------------------------------------------------
    // Register global listeners for Escape and Tab while the modal is open
    // -------------------------------------------------------------------
    window.addEventListener('keydown', handleEscape)
    window.addEventListener('keydown', handleTab)

    // Capture the element that opened the modal for later restoration
    openerRef.current = document.activeElement as HTMLElement

    // -------------------------------------------------------------------
    // Determine the element that should receive initial focus
    // -------------------------------------------------------------------
    const focusTarget =
      initialFocusRef?.current ??
      modalRef.current?.querySelector<HTMLElement>(`
        input:not([disabled]),
        textarea:not([disabled]),
        select:not([disabled]),
        [contenteditable="true"],
        button:not([disabled]):not([data-modal-close]),
        [tabindex]:not([tabindex="-1"])`
      ) ??
      modalRef.current

    const frame = requestAnimationFrame(() => {
      focusTarget?.focus()
    })

    // -------------------------------------------------------------------
    // Cleanup – runs when the modal closes or the component unmounts
    // -------------------------------------------------------------------
    return () => {
      cancelAnimationFrame(frame)
      // Restore the original overflow value
      document.body.style.overflow = previousOverflow
      // Restore focus to the element that triggered the modal, if still present
      if (openerRef.current && document.body.contains(openerRef.current)) {
        openerRef.current.focus()
      }
      window.removeEventListener('keydown', handleEscape)
      window.removeEventListener('keydown', handleTab)
    }
  }, [isOpen, initialFocusRef])

  // Render nothing while the modal is closed
  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/30 dark:bg-black/60 animate-in fade-in duration-200"
      // Clicking on the overlay should close the modal using the stable ref
      onClick={e => {
        if (e.target === e.currentTarget) {
          onCloseRef.current()
        }
      }}
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        aria-label={!title ? ariaLabel ?? 'Dialog' : undefined}
        tabIndex={-1}
        className={cn(
          'relative w-[calc(100%-24px)] md:w-full md:max-w-2xl bg-surface rounded-2xl shadow-2xl border border-border p-5 md:p-6 overflow-hidden max-h-[85vh] flex flex-col',
          className
        )}
        // Prevent clicks inside the modal from bubbling up to the overlay
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-4 border-b border-border">
          {title ? (
            <h3 id={titleId} className="text-lg font-serif font-bold text-foreground">
              {title}
            </h3>
          ) : (
            <div />
          )}
          <button
            type="button"
            data-modal-close
            onClick={() => onCloseRef.current()}
            aria-label="Close dialog"
            className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-surface-muted transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D0A45C] focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-[#D0A45C] dark:focus-visible:ring-offset-[#211318]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="py-4 overflow-y-auto flex-1 overscroll-contain">{children}</div>
      </div>
    </div>
  )
}
