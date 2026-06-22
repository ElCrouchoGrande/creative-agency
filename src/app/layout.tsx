import type { Metadata } from 'next'
import { Press_Start_2P, VT323 } from 'next/font/google'
import './globals.css'

const pressStart = Press_Start_2P({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-display',
})

const vt323 = VT323({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-body',
})

export const metadata: Metadata = {
  title: '♛ Brands by Bowser',
  description: 'AI-powered creative agency campaign team',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${pressStart.variable} ${vt323.variable}`}>
      <body>{children}</body>
    </html>
  )
}
