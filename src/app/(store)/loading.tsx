import React from 'react'
import { Loader2 } from 'lucide-react'

export default function StoreLoading() {
  return (
    <div className="fixed inset-0 bg-background/60 backdrop-blur-xs z-50 flex flex-col items-center justify-center space-y-4">
      <div className="relative flex items-center justify-center">
        {/* Gold spinner */}
        <Loader2 className="w-12 h-12 text-[#D4AF37] animate-spin" style={{ animationDuration: '1.2s' }} />
        {/* Center brand mark */}
        <span className="absolute text-[10px] font-serif font-bold text-[#D4AF37] uppercase tracking-wider">S</span>
      </div>
      <p className="text-[10px] font-serif tracking-widest text-[#D4AF37] uppercase animate-pulse">
        Loading Couture
      </p>
    </div>
  )
}
