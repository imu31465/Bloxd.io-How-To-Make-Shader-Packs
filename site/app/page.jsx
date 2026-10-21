// 言語選択ページは廃止。静的出力なので / から英語版へ即リダイレクトするだけのページを置く
// (React 19 が body 内の <meta> を <head> に集約する。万一効かなくても
//  ブラウザは body 内の meta refresh も従う)
export const metadata = {
  title: 'How to make shader packs — Bloxd.io'
}

export default function Page() {
  return (
    <>
      <meta httpEquiv="refresh" content="0; url=en/" />
      <div style={{ margin: '0 auto', maxWidth: 720, padding: '48px 24px', fontFamily: 'system-ui, sans-serif' }}>
        <h1 style={{ fontSize: '1.5rem' }}>How to make shader packs — Bloxd.io</h1>
        <p>
          Redirecting to the English manual…
          <br />
          <a href="en/">Open the manual</a>
        </p>
      </div>
    </>
  )
}
