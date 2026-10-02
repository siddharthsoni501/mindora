import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'MINDORA — Private Personal AI',
  description: 'Your AI remembers. You control the memory. A private, secure personal AI with persistent, user-owned memory.',
  keywords: ['personal AI', 'memory', 'private AI', 'MINDORA'],
  authors: [{ name: 'MINDORA' }],
  openGraph: {
    title: 'MINDORA — Private Personal AI',
    description: 'Your AI remembers. You control the memory.',
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  )
}
