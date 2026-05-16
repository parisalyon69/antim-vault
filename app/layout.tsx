import type { Metadata } from 'next'
import { Lora, Inter } from 'next/font/google'
import { Analytics } from '@vercel/analytics/react'
import './globals.css'

const lora = Lora({
  subsets: ['latin'],
  weight: ['400', '600'],
  style: ['normal', 'italic'],
  variable: '--font-lora',
  display: 'swap',
})

const inter = Inter({
  subsets: ['latin'],
  weight: ['300', '400', '500'],
  variable: '--font-inter',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Antim Digital Vault — Everything your family will need',
  description:
    'Store your documents, map your accounts, and leave a message for your family — so nothing gets lost when it matters most.',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      className={`${lora.variable} ${inter.variable} h-full`}
    >
      <body className="min-h-full flex flex-col antialiased">{children}<Analytics /></body>
    </html>
  )
}
