'use client'

// Shader Studio 本体: WebGPU プレビュー + エディタ + コントロール + 検証。
// WebGPU が使えない環境では soft-renderer.mjs (WGSL→JS トランスパイル +
// CPU ラスタライズ) へ自動フォールバックし、GPU API なしでプレビューする。

import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import { StudioRenderer } from './renderer.mjs'
import { StudioSoftRenderer } from './soft-renderer.mjs'
import { validatePack } from './validator.mjs'
import { STUDIO_I18N } from '../../lib/studio-i18n.mjs'
import registry from '../../lib/studio/registry.json'
import WgslEditor from './editor.jsx'

const DEFAULT_PACK = `// Your shader pack — edit and watch the preview update.
// Reference: /api/hooks · /api/structures · /api/functions

fn bloxdTerrainSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(surface);
    // Example: a gentle warm tint
    out.colour *= vec3f(1.05, 1.0, 0.95);
    return out;
}

#ifndef BLOXD_STRICT
fn bloxdTerrainVertex(v: BloxdVertexIn) -> BloxdVertex {
    var out = bloxdDefaultVertex(v);
    // Example: sway vegetation (vertex hooks need this guard)
    if (v.flags.vegetation) {
        let w = bloxdWorldPosition(v.position);
        out.position.x += sin(bloxdSeconds() * 1.5 + w.x + w.z) * 0.04;
    }
    return out;
}
#endif

fn bloxdLiquidSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(surface);
    #ifdef BLOXD_ALPHA
    // Example: slightly clearer water
    out.alpha = out.alpha * 0.85;
    #endif
    return out;
}

fn bloxdTerrainLight(surface: BloxdSurface, light: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(surface, light);
    // Example: subtle depth-based cooling
    let d = distance(light.position, bloxdEyePosition());
    out.colour = mix(out.colour, out.colour * vec3f(0.9, 0.95, 1.05),
                     saturate((d - 24.0) / 48.0));
    return out;
}
`

const SCENE_IDS = ['plains', 'forest', 'desert', 'waterside', 'ruins', 'night', 'cave', 'procedural']

// ホットバーのブロック色 (プレビュー演出用の飾り)
const HOTBAR = [
  { c1: '#7bbf4d', c2: '#5d9433' }, // grass
  { c1: '#9a6b45', c2: '#6f4a2e' }, // dirt
  { c1: '#8f9299', c2: '#6f7278' }, // stone
  { c1: '#c09a63', c2: '#8a6a3d' }, // planks
  { c1: '#5d9445', c2: '#3f6b2e' }, // leaves
  { c1: '#e3d5a1', c2: '#c2b17a' }, // sand
  { c1: '#9c5f52', c2: '#74423a' }, // brick
  null, null
]

export function ShaderStudioApp({ lang }) {
  const t = STUDIO_I18N[lang] ?? STUDIO_I18N.en
  const canvasRef = useRef(null)
  const rendererRef = useRef(null)

  const [code, setCode] = useState(DEFAULT_PACK)
  const [appliedCode, setAppliedCode] = useState(DEFAULT_PACK)
  const [autoApply, setAutoApply] = useState(true)
  const [strict, setStrict] = useState(false)
  const [scene, setScene] = useState('plains')
  const [seed, setSeed] = useState(1337)
  const [initState, setInitState] = useState('loading') // loading | ready | error
  const [initError, setInitError] = useState('')
  const [fps, setFps] = useState(0)
  const [compileState, setCompileState] = useState(null)
  const [editorKey, setEditorKey] = useState(0)
  const [softMode, setSoftMode] = useState(false)
  const [softRes, setSoftRes] = useState(null)
  const [gameHud, setGameHud] = useState(true)

  // パラメータ (スライダー) — renderer.params を直接更新
  const paramsRef = useRef(null)
  if (!paramsRef.current) paramsRef.current = {
    sunAzimuth: 215, sunElevation: 54, fogDistance: 1, lit: true,
    ambient: 0.45, diffuse: 0.95, heldLight: 0,
    enchantTier: 3, overlayOn: false
  }
  const [ui, setUi] = useState({ ...paramsRef.current })

  // ---- 初期化 (WebGPU → 失敗時 CPU ソフトウェアレンダリングへフォールバック) ----
  useEffect(() => {
    let cancelled = false
    const canvas = canvasRef.current
    if (!canvas) return
    let r = null
    // webgpu コンテキストを一度でも取得した canvas には getContext('2d')
    // が二度と返らない (HTML 仕様: コンテキストモードは固定)。GPU 初期化が
    // コンテキスト取得後に失敗した場合の CPU フォールバック用に、新しい
    // canvas を隣に挿入して差し替える。React 管理の旧ノードは隠したまま
    // 残す (アンマウント時の removeChild が壊れないように)。
    let softCanvas = null
    const detachSoftCanvas = () => {
      if (softCanvas) {
        softCanvas.remove()
        softCanvas = null
        canvas.style.display = ''
        canvasRef.current = canvas
      }
    }
    const onStatus = s => {
      if (s.type === 'compiled' || s.type === 'wgsl-errors') {
        setCompileState(s)
      } else if (s.type === 'soft-res') {
        setSoftRes({ w: s.w, h: s.h })
      }
    }
    const boot = async () => {
      try {
        const gpu = new StudioRenderer(canvas, { onStatus })
        await gpu.init()
        r = gpu
      } catch (e) {
        // WebGPU なしでもプレビューできるのがこのツールの要件:
        // WGSL を JS にトランスパイルして CPU でラスタライズする。
        // コンテキストが webgpu で固定済みなら 2d を取れないので canvas を新調する。
        let target = canvas
        if (!canvas.getContext || !canvas.getContext('2d')) {
          target = document.createElement('canvas')
          target.className = canvas.className
          target.style.touchAction = 'none'
          canvas.style.display = 'none'
          canvas.parentNode?.insertBefore(target, canvas.nextSibling)
          softCanvas = target
          canvasRef.current = target
        }
        const soft = new StudioSoftRenderer(target, { onStatus })
        await soft.init()
        r = soft
      }
      if (cancelled) { r.destroy(); detachSoftCanvas(); return }
      rendererRef.current = r
      setSoftMode(!!r.soft)
      r.resize()
      r.setPack(appliedCode)
      r.setStrict(strict)
      r.setScene(scene, { seed })
      r.start()
      setInitState('ready')
      // FPS 計測
      let frames = 0
      let last = performance.now()
      const tick = () => {
        frames++
        const now = performance.now()
        if (now - last > 500) {
          if (!cancelled && rendererRef.current) {
            setFps(Math.round(frames * 1000 / (now - last)))
          }
          frames = 0
          last = now
        }
        if (!cancelled) requestAnimationFrame(tick)
      }
      requestAnimationFrame(tick)
    }
    boot().catch(e => {
      if (cancelled) return
      // soft 初期化自体が失敗した場合も、差し替えた canvas を解除して元に戻す
      detachSoftCanvas()
      setInitError(String(e?.message || e))
      setInitState('error')
    })
    const onResize = () => rendererRef.current?.resize()
    window.addEventListener('resize', onResize)
    return () => {
      cancelled = true
      window.removeEventListener('resize', onResize)
      rendererRef.current?.destroy()
      detachSoftCanvas()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ---- カメラ操作 ----
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    let dragging = false
    let lastX = 0, lastY = 0
    const down = e => { dragging = true; lastX = e.clientX; lastY = e.clientY }
    const move = e => {
      if (!dragging || !rendererRef.current) return
      const r = rendererRef.current
      r.camera.yaw += (e.clientX - lastX) * 0.006
      r.camera.pitch = Math.max(-1.4, Math.min(1.4, r.camera.pitch + (e.clientY - lastY) * 0.006))
      lastX = e.clientX; lastY = e.clientY
    }
    const up = () => { dragging = false }
    const wheel = e => {
      if (!rendererRef.current) return
      e.preventDefault()
      const r = rendererRef.current
      r.camera.dist = Math.max(4, Math.min(120, r.camera.dist * (1 + Math.sign(e.deltaY) * 0.08)))
    }
    canvas.addEventListener('pointerdown', down)
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    canvas.addEventListener('wheel', wheel, { passive: false })
    return () => {
      canvas.removeEventListener('pointerdown', down)
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      canvas.removeEventListener('wheel', wheel)
    }
  }, [initState])

  // ---- 適用 ----
  const applyCode = useCallback(() => {
    setAppliedCode(code)
    rendererRef.current?.setPack(code)
  }, [code])

  useEffect(() => {
    if (autoApply) {
      const id = setTimeout(() => {
        setAppliedCode(code)
        rendererRef.current?.setPack(code)
      }, 600)
      return () => clearTimeout(id)
    }
  }, [code, autoApply])

  useEffect(() => { rendererRef.current?.setStrict(strict) }, [strict])

  useEffect(() => { rendererRef.current?.setScene(scene, { seed }) }, [scene, seed])

  // パラメータ反映
  useEffect(() => {
    const r = rendererRef.current
    if (!r) return
    Object.assign(r.params, ui)
  }, [ui])

  // ---- 検証 ----
  const validation = useMemo(() => validatePack(appliedCode, { strict }), [appliedCode, strict])

  const setParam = (k, v) => setUi(u => ({ ...u, [k]: v }))

  const slider = (label, key, min, max, step, fmt) => (
    <label className="x:block x:mb-2 x:text-xs">
      <span className="x:flex x:justify-between x:mb-0.5">
        <span className="x:text-gray-600 x:dark:text-gray-400">{label}</span>
        <span className="x:font-mono x:text-gray-500">{fmt ? fmt(ui[key]) : ui[key]}</span>
      </span>
      <input
        type="range" min={min} max={max} step={step} value={ui[key]}
        onChange={e => setParam(key, Number(e.target.value))}
        className="x:w-full x:accent-blue-500"
      />
    </label>
  )

  const hookHas = name => {
    const info = compileState?.hooks?.[name] || {}
    return [info.vertex && 'V', info.surface && 'S', info.light && 'L'].filter(Boolean).join('') || '–'
  }

  const terr = { has: hookHas('terrain') }
  const liq = { has: hookHas('liquid') }
  const mod = { has: hookHas('model') }

  return (
    <div className="x:not-first:mt-6">
      <h1 className="x:text-3xl x:font-bold x:mb-1">
        {t.title}
        <span className="x:ml-2 x:align-middle x:text-xs x:font-semibold x:uppercase x:tracking-wider x:px-1.5 x:py-0.5 x:rounded x:border x:border-blue-500/40 x:bg-blue-500/10 x:text-blue-600 x:dark:text-blue-400">beta</span>
      </h1>
      <p className="x:text-sm x:text-gray-600 x:dark:text-gray-400 x:mb-2">{t.tagline}</p>
      <p className="x:text-xs x:text-gray-500 x:dark:text-gray-500 x:mb-4">{t.note}</p>

      <div className="x:grid x:grid-cols-1 lg:x:grid-cols-[1fr_300px] x:gap-4">
        {/* ---------------- プレビュー ---------------- */}
        <div>
          <div className="x:relative nextra-border x:border x:rounded-lg x:overflow-hidden x:bg-gray-900">
            <canvas
              ref={canvasRef}
              className="x:w-full x:aspect-[16/10] x:block x:cursor-grab x:active:cursor-grabbing"
              style={{ touchAction: 'none' }}
            />
            {initState === 'loading' && (
              <div className="x:absolute x:inset-0 x:flex x:items-center x:justify-center x:text-gray-300 x:text-sm">
                {t.loading}
              </div>
            )}
            {initState === 'error' && (
              <div className="x:absolute x:inset-0 x:flex x:items-center x:justify-center x:px-8 x:text-center">
                <div>
                  <p className="x:text-red-400 x:text-sm x:font-medium x:mb-1">{t.webgpuMissing}</p>
                  <p className="x:text-gray-500 x:text-xs">{initError}</p>
                </div>
              </div>
            )}
            {softMode && initState === 'ready' && (
              <div className="x:absolute x:top-2 x:left-2 x:text-[10px] x:font-mono x:px-1.5 x:py-0.5 x:rounded x:bg-black/60 x:text-amber-300">
                {t.cpuMode}{softRes ? ` · ${softRes.w}×${softRes.h}` : ''}
              </div>
            )}
            {/* bloxd風ゲームHUD (クロスヘア + ホットバー) — プレビューらしさ演出。
                nextra の prefix CSS に任意の position ユーティリティが無いので
                全部 inline style で配置する */}
            {gameHud && initState === 'ready' && (
              <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', userSelect: 'none' }}>
                <div style={{ position: 'absolute', left: '50%', top: '50%', width: 0, height: 0, mixBlendMode: 'difference' }}>
                  <div style={{ position: 'absolute', background: '#fff', width: 18, height: 2, left: -9, top: -1 }} />
                  <div style={{ position: 'absolute', background: '#fff', width: 2, height: 18, left: -1, top: -9 }} />
                </div>
                <div style={{
                  position: 'absolute', bottom: 12, left: '50%', transform: 'translateX(-50%)',
                  display: 'flex', gap: 3, padding: 3, borderRadius: 6,
                  background: 'rgba(10,12,16,0.45)', boxShadow: '0 1px 8px rgba(0,0,0,0.35)'
                }}>
                  {HOTBAR.map((slot, i) => (
                    <div key={i} style={{
                      width: 34, height: 34, borderRadius: 4,
                      background: slot ? `linear-gradient(135deg, ${slot.c1}, ${slot.c2})` : 'rgba(255,255,255,0.07)',
                      border: i === 0 ? '2px solid rgba(255,255,255,0.95)' : '1px solid rgba(255,255,255,0.35)',
                      boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.25)'
                    }} />
                  ))}
                </div>
              </div>
            )}
            <div className="x:absolute x:bottom-2 x:right-3 x:text-[10px] x:text-gray-400 x:font-mono x:flex x:gap-3">
              <span>{t.controls}</span>
              <span>{fps} {t.fps}</span>
            </div>
          </div>

          {/* 検証パネル */}
          <div className="nextra-border x:border x:rounded-lg x:mt-3 x:p-3">
            <div className="x:flex x:items-center x:gap-2 x:mb-2 x:text-sm x:font-semibold">
              <span>{t.validation}</span>
              <span className="x:text-xs x:font-normal x:text-gray-500">
                {t.detectedHooks}: T:{terr.has || '–'} L:{liq.has || '–'} M:{mod.has || '–'}
              </span>
              <span className="x:ml-auto x:text-xs x:font-normal">
                {compileState?.type === 'wgsl-errors'
                  ? <span className="x:text-red-500">{t.compileFailed}</span>
                  : compileState
                    ? <span className="x:text-green-600">{t.compiled}</span>
                    : <span className="x:text-gray-400">…</span>}
              </span>
            </div>
            {(validation.errors.length === 0 && validation.warnings.length === 0 && !compileState?.errors?.length) && (
              <p className="x:text-xs x:text-green-600">{t.noIssues}</p>
            )}
            {validation.errors.map((e, i) => (
              <p key={'e' + i} className="x:text-xs x:text-red-500 x:font-mono x:mb-0.5">
                L{e.line}: {e.message}
              </p>
            ))}
            {(compileState?.errors || []).filter(e => e.wgsl || e.line).map((e, i) => (
              <p key={'ce' + i} className="x:text-xs x:text-red-500 x:font-mono x:mb-0.5">
                [{e.program}] {e.line ? 'L' + e.line + ': ' : ''}{e.message}
              </p>
            ))}
            {validation.warnings.map((w, i) => (
              <p key={'w' + i} className="x:text-xs x:text-amber-600 x:dark:text-amber-400 x:font-mono x:mb-0.5">
                L{w.line}: {w.message}
              </p>
            ))}
          </div>
        </div>

        {/* ---------------- コントロール ---------------- */}
        <div className="nextra-border x:border x:rounded-lg x:p-3 x:text-sm">
          <label className="x:block x:mb-2">
            <span className="x:text-xs x:font-semibold x:block x:mb-1">{t.scene}</span>
            <select
              value={scene}
              onChange={e => setScene(e.target.value)}
              className="x:w-full nextra-border x:border x:rounded x:px-2 x:py-1.5 x:bg-transparent x:text-sm"
            >
              {SCENE_IDS.map(id => <option key={id} value={id}>{t.scenes[id]}</option>)}
            </select>
          </label>
          <label className="x:flex x:items-center x:gap-2 x:mb-3 x:text-xs x:cursor-pointer">
            <input type="checkbox" checked={gameHud} onChange={e => setGameHud(e.target.checked)} />
            {t.hud}
          </label>
          {scene === 'procedural' && (
            <div className="x:flex x:gap-2 x:mb-3">
              <input
                type="number" value={seed} min="1" max="999999"
                onChange={e => setSeed(Number(e.target.value) || 1)}
                className="x:flex-1 nextra-border x:border x:rounded x:px-2 x:py-1 x:bg-transparent x:text-xs x:font-mono"
                aria-label={t.seed}
              />
              <button
                onClick={() => setSeed(1 + Math.floor(Math.random() * 99999))}
                className="nextra-border x:border x:rounded x:px-2 x:py-1 x:text-xs x:cursor-pointer x:hover:bg-gray-100 x:dark:x:hover:bg-gray-800"
              >{t.randomize}</button>
            </div>
          )}

          <div className="x:mb-3">
            <span className="x:text-xs x:font-semibold x:block x:mb-1">{t.variant}</span>
            <div className="x:flex x:gap-1">
              <button
                onClick={() => setStrict(false)}
                className={`x:flex-1 x:rounded x:px-2 x:py-1 x:text-xs x:cursor-pointer nextra-border x:border ${!strict ? 'x:bg-blue-500 x:text-white x:border-blue-500' : 'x:hover:bg-gray-100 x:dark:x:hover:bg-gray-800'}`}
              >{t.allow}</button>
              <button
                onClick={() => setStrict(true)}
                className={`x:flex-1 x:rounded x:px-2 x:py-1 x:text-xs x:cursor-pointer nextra-border x:border ${strict ? 'x:bg-blue-500 x:text-white x:border-blue-500' : 'x:hover:bg-gray-100 x:dark:x:hover:bg-gray-800'}`}
              >{t.strict}</button>
            </div>
            {strict && <p className="x:text-[10px] x:text-gray-500 x:mt-1">{t.strictHint}</p>}
          </div>

          <div className="x:border-t nextra-border x:pt-2 x:mb-2">
            <span className="x:text-xs x:font-semibold x:block x:mb-1">{t.sun}</span>
            {slider(t.azimuth, 'sunAzimuth', 0, 359, 1, v => v + '°')}
            {slider(t.elevation, 'sunElevation', -30, 89, 1, v => v + '°')}
            {slider(t.fog, 'fogDistance', 0, 8, 1)}
          </div>

          <div className="x:border-t nextra-border x:pt-2 x:mb-2">
            <span className="x:text-xs x:font-semibold x:block x:mb-1">{t.lighting}</span>
            <label className="x:flex x:items-center x:gap-2 x:mb-2 x:text-xs x:cursor-pointer">
              <input type="checkbox" checked={ui.lit} onChange={e => setParam('lit', e.target.checked)} />
              {t.litOn}
            </label>
            {slider(t.ambient, 'ambient', 0, 1.5, 0.05, v => v.toFixed(2))}
            {slider(t.diffuse, 'diffuse', 0, 1.5, 0.05, v => v.toFixed(2))}
            {slider(t.heldLight, 'heldLight', 0, 1, 0.05, v => v.toFixed(2))}
          </div>

          <div className="x:border-t nextra-border x:pt-2 x:mb-2">
            <span className="x:text-xs x:font-semibold x:block x:mb-1">{t.models}</span>
            <label className="x:flex x:items-center x:gap-2 x:mb-1 x:text-xs x:cursor-pointer">
              <input type="checkbox" checked={ui.enchantTier > 0} onChange={e => setParam('enchantTier', e.target.checked ? 3 : 0)} />
              {t.enchant}
            </label>
            <label className="x:flex x:items-center x:gap-2 x:text-xs x:cursor-pointer">
              <input type="checkbox" checked={ui.overlayOn} onChange={e => setParam('overlayOn', e.target.checked)} />
              {t.overlay}
            </label>
          </div>

          <p className="x:border-t nextra-border x:pt-2 x:text-[10px] x:text-gray-500">
            {t.textureNote}<br />
            {t.registry.replace('{n}', registry.count)}
          </p>
        </div>
      </div>

      {/* ---------------- エディタ ---------------- */}
      <div className="nextra-border x:border x:rounded-lg x:mt-4 x:p-3">
        <div className="x:flex x:items-center x:gap-2 x:mb-2">
          <span className="x:text-sm x:font-semibold">{t.editor}</span>
          <label className="x:ml-auto x:flex x:items-center x:gap-1 x:text-xs x:cursor-pointer">
            <input type="checkbox" checked={autoApply} onChange={e => setAutoApply(e.target.checked)} />
            {t.autoApply}
          </label>
          {!autoApply && (
            <button onClick={applyCode} className="nextra-border x:border x:rounded x:px-3 x:py-1 x:text-xs x:cursor-pointer x:bg-blue-500 x:text-white x:border-blue-500">
              {t.apply}
            </button>
          )}
          <button
            onClick={() => { setCode(DEFAULT_PACK); setEditorKey(k => k + 1) }}
            className="nextra-border x:border x:rounded x:px-3 x:py-1 x:text-xs x:cursor-pointer x:hover:bg-gray-100 x:dark:x:hover:bg-gray-800"
          >{t.reset}</button>
        </div>
        <WgslEditor key={editorKey} value={code} onChange={setCode} height="300px" />
      </div>
    </div>
  )
}

export default ShaderStudioApp
