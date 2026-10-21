import Link from 'next/link'
import { LOCALES } from '../lib/langs.mjs'
import { repoUrl } from '../lib/paths.mjs'

export const metadata = {
  title: 'Choose a language / 言語を選択'
}

export default function Page() {
  const card = {
    border: '1px solid rgba(125,125,125,.35)',
    borderRadius: 10,
    padding: '10px 14px'
  }
  return (
    <div style={{ margin: '0 auto', maxWidth: 720, padding: '48px 24px' }}>
      <h1 style={{ fontSize: '1.5rem', marginBottom: 4 }}>
        How to make shader packs — Bloxd.io
      </h1>
      <p style={{ opacity: 0.75, marginBottom: 32 }}>
        言語を選択 · Choose a language
      </p>
      <ul style={{ listStyle: 'none', padding: 0, display: 'grid', gap: 8 }}>
        {LOCALES.map(({ code, name, native }) => (
          <li key={code} style={card}>
            <Link href={`/${code}/`} style={{ textDecoration: 'none' }}>
              <b style={{ marginRight: 8 }}>{native}</b>
              <span style={{ opacity: 0.7 }}>{name}</span>
            </Link>
          </li>
        ))}
      </ul>
      <p style={{ marginTop: 32, fontSize: '0.9rem', opacity: 0.7 }}>
        <a href={repoUrl}>GitHub</a>
      </p>
    </div>
  )
}
