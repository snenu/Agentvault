import React from "react"
import type { Metadata } from 'next'
import { Geist, Geist_Mono, IBM_Plex_Sans } from 'next/font/google'
import { Courier_Prime } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'

const _geist = Geist({ subsets: ["latin"] });
const _geistMono = Geist_Mono({ subsets: ["latin"] });
const _courierPrime = Courier_Prime({ weight: ["400", "700"], subsets: ["latin"] });
const _ibmPlexSans = IBM_Plex_Sans({ weight: ["300", "400", "500", "600"], subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL('https://agentvault-t3.vercel.app'),
  applicationName: 'AgentVault',
  title: 'AgentVault — Secure Secret Manager for AI Agents',
  description: 'AgentVault protects secrets from AI agents with Terminal3 identity, policy checks, temporary credential references, sealed vault storage, and audit logs.',
  keywords: ['Terminal3', 'Agent Auth SDK', 'AI agents', 'secret manager', 'TEE', 'agent security'],
  authors: [{ name: 'AgentVault' }],
  openGraph: {
    title: 'AgentVault — Secure Secret Manager for AI Agents',
    description: 'Protect secrets from AI agents with Terminal3 identity, TEE-backed vault flows, and short-lived access references.',
    type: 'website',
    url: 'https://agentvault-t3.vercel.app',
    siteName: 'AgentVault',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AgentVault — Secure Secret Manager for AI Agents',
    description: 'Terminal3-powered identity, policy, temporary credentials, and auditability for AI agents.',
  },
  icons: {
    icon: [
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    shortcut: '/icon.svg',
  },
  manifest: '/site.webmanifest',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const showAnalytics = process.env.VERCEL === "1"

  return (
    <html lang="en">
      <body className={`font-sans antialiased`}>
        {children}
        {showAnalytics ? <Analytics /> : null}
      </body>
    </html>
  )
}
