import { Head } from 'nextra/components'
import { siteUrl } from '../lib/paths.mjs'
import 'nextra-theme-docs/style.css'
import './custom.css'

export const metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'Bloxd.io Shader Packs — Guide',
    template: '%s'
  },
  description:
    'How to make shader packs for Bloxd.io — the full guide in 10 languages.'
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" dir="ltr" suppressHydrationWarning>
      <Head color={{ hue: 210 }} faviconGlyph="B" />
      <body>{children}</body>
    </html>
  )
}
