import type { Metadata } from 'next'
import { ToastProvider } from '@/context/ToastContext'
import { AuthProvider } from '@/context/AuthContext'
import { CartProvider } from '@/context/CartContext'
import { resolveApplicationSession } from '@/lib/auth/resolveApplicationSession'
import { ThemeProvider } from '@/components/ThemeProvider'
import './globals.css'

const playfair = {
  variable: 'font-serif',
  className: 'font-serif'
}

const inter = {
  variable: 'font-sans',
  className: 'font-sans'
}

export const metadata: Metadata = {
  metadataBase: new URL('https://shreengar.in'),
  title: 'Shreengar | Royal Indian Ethnic Couture & Designer Wear',
  description: 'Shop authentic Zardozi Anarkalis, Banarasi Silk Sarees, Designer Kurtis and Festive Ethnic Sets online at Shreengar.',
  keywords: ['ethnic wear', 'anarkali suit', 'silk saree', 'kurtis', 'indian festive fashion', 'zardozi'],
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/icon.png', type: 'image/png', sizes: '512x512' },
    ],
    apple: [
      { url: '/apple-icon.png', sizes: '512x512', type: 'image/png' },
    ],
  },
  openGraph: {
    title: 'Shreengar | Royal Indian Ethnic Couture',
    description: 'Shop authentic Zardozi Anarkalis & Heritage Silk Sarees',
    siteName: 'Shreengar',
    images: ['/assets/hero_banner.jpg'],
  },
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const initialSession = await resolveApplicationSession()

  return (
    <html lang="en" className={`${playfair.variable} ${inter.variable}`} suppressHydrationWarning>
      <body className="min-h-screen antialiased flex flex-col font-sans">
        <ThemeProvider>
          <ToastProvider>
            <AuthProvider initialSession={initialSession}>
              <CartProvider>
                {children}
              </CartProvider>
            </AuthProvider>
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
