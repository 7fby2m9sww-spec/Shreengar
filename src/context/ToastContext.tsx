'use client'

import React, { createContext, useContext, useState } from 'react'
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react'

export interface ToastMessage {
  id: string
  type: 'success' | 'error' | 'info'
  title: string
  message?: string
}

interface ToastContextType {
  showToast: (title: string, message?: string, type?: ToastMessage['type']) => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([])

  const showToast = (title: string, message?: string, type: ToastMessage['type'] = 'success') => {
    const id = Math.random().toString(36).substring(2, 9)
    const newToast: ToastMessage = { id, title, message, type }
    setToasts(prev => [...prev, newToast])

    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 4000)
  }

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {/* Toast Render Portal */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col space-y-2 pointer-events-none">
        {toasts.map(t => (
          <div
            key={t.id}
            className="pointer-events-auto bg-rose-950 text-amber-100 p-4 rounded-xl shadow-2xl border border-amber-400/40 flex items-start space-x-3 max-w-sm animate-in slide-in-from-bottom duration-300"
          >
            {t.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />}
            {t.type === 'error' && <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />}
            {t.type === 'info' && <Info className="w-5 h-5 text-sky-400 flex-shrink-0 mt-0.5" />}
            <div className="flex-1 space-y-0.5">
              <h5 className="font-serif font-bold text-xs leading-snug">{t.title}</h5>
              {t.message && <p className="text-[11px] text-amber-200/80">{t.message}</p>}
            </div>
            <button
              onClick={() => removeToast(t.id)}
              className="p-1 text-amber-200/50 hover:text-amber-100 rounded"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}
