import type { Metadata, Viewport } from 'next'
import { Toaster } from 'sonner'
import { Playfair_Display, Inter } from 'next/font/google'
import './globals.css'

const playfair = Playfair_Display({
  subsets: ['vietnamese', 'latin'],
  variable: '--font-playfair',
  display: 'swap',
})

const inter = Inter({ 
  subsets: ['vietnamese', 'latin'],
  variable: '--font-lexend',
  weight: ['400', '500', '600', '700'],
  display: 'swap',
})

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'),
  title: {
    default: 'HDG Food - Thực đơn món ngon mỗi ngày',
    template: '%s | HDG Food',
  },
  description: 'Đặt món online tại HDG Food với thực đơn đa dạng, giao nhanh và ưu đãi mỗi ngày.',
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    locale: 'vi_VN',
    url: '/',
    siteName: 'HDG Food',
    title: 'HDG Food - Thực đơn món ngon mỗi ngày',
    description: 'Đặt món online tại HDG Food với thực đơn đa dạng, giao nhanh và ưu đãi mỗi ngày.',
  },
  robots: {
    index: true,
    follow: true,
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" suppressHydrationWarning className={`${playfair.variable} ${inter.variable}`}>
      <body suppressHydrationWarning className="font-lexend">
        {children}
        {/* Sonner toast — hiển thị ở góc trên bên phải */}
        <Toaster
          position="top-right"
          richColors
          closeButton
          toastOptions={{
            style: { fontFamily: 'inherit' },
          }}
        />
      </body>
    </html>
  )
}
