import type { Metadata, Viewport } from 'next'
import { Plus_Jakarta_Sans, Space_Grotesk, JetBrains_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { Toaster } from '@/components/ui/sonner'
import './globals.css'

const fontSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
})

const fontHeading = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-heading",
})

const fontMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
})

export const metadata: Metadata = {
  title: {
    default: 'SIVRON - Aplikasi Verifikasi RKA/DPA',
    template: '%s | SIVRON',
  },
  description: 'SIVRON adalah aplikasi verifikasi RKA/DPA dimana berbagai instansi menginput berbagai dokumen lalu akan di verifikasi oleh 4 admin (Bapperida, Setda, Bidang Anggaran BKAD, Bidang Aset BKAD).',
  keywords: ['sivron', 'verifikasi', 'RKA', 'DPA', 'Bapperida', 'Setda', 'BKAD', 'dokumen'],
  authors: [{ name: 'SIVRON Team' }],
  generator: 'v0.app',
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#3b5998' },
    { media: '(prefers-color-scheme: dark)', color: '#1a365d' },
  ],
  width: 'device-width',
  initialScale: 1,
}

import { ThemeProvider } from '@/components/theme-provider'

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body className={`${fontSans.variable} ${fontHeading.variable} ${fontMono.variable} font-sans antialiased min-h-screen w-full overflow-x-hidden`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem={false}
          disableTransitionOnChange
        >
          {children}
          <Toaster position="top-right" richColors closeButton />
          <Analytics />
        </ThemeProvider>
      </body>
    </html>
  )
}
