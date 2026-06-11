'use client'

import { useEffect, useRef, useState } from 'react'

export function OceanBackground() {
  const ref = useRef<HTMLDivElement>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    const stage = ref.current
    if (!stage) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let alive = true
    let uid = 0

    const timeouts: number[] = []
    const rnd = (a: number, b: number) => a + Math.random() * (b - a)

    function spawnDrops(cx: number, cy: number, sz: number) {
      if (!alive || !stage) return
      const n = Math.round(rnd(8, 12))
      for (let i = 0; i < n; i++) {
        const d = document.createElement('div')
        d.className = 'ocean-drop'
        const ds  = Math.max(2, Math.round(sz * rnd(0.10, 0.22)))
        const ang = rnd(0, Math.PI * 2)
        const rad = sz * rnd(0.7, 1.7)
        d.style.width = ds + 'px'; d.style.height = ds + 'px'
        d.style.left  = cx + 'px'; d.style.top = cy + 'px'
        d.style.setProperty('--tx', (Math.cos(ang) * rad).toFixed(1) + 'px')
        d.style.setProperty('--ty', (Math.sin(ang) * rad).toFixed(1) + 'px')
        stage.appendChild(d)
        timeouts.push(window.setTimeout(() => d.remove(), 640))
      }
    }

    function spawnTypeA() {
      if (!alive || !stage) return
      const H    = stage.clientHeight || window.innerHeight
      const b    = document.createElement('div')
      b.className = 'ocean-bb'
      const size = Math.round(rnd(9, 46))
      const dur  = rnd(12, 22)
      const op   = rnd(0.45, 0.85)
      const rise = Math.round(rnd(0.88, 1.0) * H)
      b.style.width = size + 'px'; b.style.height = size + 'px'
      b.style.left  = rnd(3, 95) + '%'
      b.style.setProperty('--op',   op.toFixed(2))
      b.style.setProperty('--rise', rise + 'px')
      b.style.animation = `ocean-rise-full ${dur.toFixed(1)}s linear forwards`
      b.addEventListener('animationend', () => {
        b.remove()
        if (alive) spawnTypeA()
      }, { once: true })
      stage.appendChild(b)
    }

    function spawnTypeB() {
      if (!alive || !stage) return
      const H      = stage.clientHeight || window.innerHeight
      const burstY = Math.round(rnd(0.40, 0.90) * H)
      const b      = document.createElement('div')
      b.className  = 'ocean-bb'
      const size   = Math.round(rnd(9, 46))
      const dur    = rnd(10, 18) * (burstY / H)
      const op     = rnd(0.45, 0.85)
      const name   = 'ocean-burst-' + (++uid)

      const styleEl = document.createElement('style')
      styleEl.dataset.ocean = '1'
      styleEl.textContent =
        `@keyframes ${name}{` +
        `0%{transform:translateY(0) scale(0.6);opacity:0;}` +
        `8%{opacity:${op.toFixed(2)};}` +
        `100%{transform:translateY(calc(-1 * ${burstY}px)) scale(1);opacity:${op.toFixed(2)};}` +
        `}`
      document.head.appendChild(styleEl)

      b.style.width  = size + 'px'; b.style.height = size + 'px'
      b.style.left   = rnd(3, 95) + '%'
      b.style.animation = `${name} ${dur.toFixed(1)}s linear forwards`
      b.addEventListener('animationend', () => {
        if (alive) {
          const r  = b.getBoundingClientRect()
          const s  = stage.getBoundingClientRect()
          spawnDrops(r.left - s.left + r.width / 2, r.top - s.top + r.height / 2, r.width)
        }
        b.remove()
        styleEl.remove()
        if (alive) spawnTypeB()
      }, { once: true })
      stage.appendChild(b)
    }

    const count = reduced ? 3 : 9
    for (let i = 0; i < count; i++) timeouts.push(window.setTimeout(spawnTypeA, Math.random() * 9000))
    for (let i = 0; i < count; i++) timeouts.push(window.setTimeout(spawnTypeB, Math.random() * 9000))

    return () => {
      alive = false
      timeouts.forEach(clearTimeout)
      stage.querySelectorAll('.ocean-bb, .ocean-drop').forEach(e => e.remove())
      document.querySelectorAll('style[data-ocean]').forEach(e => e.remove())
    }
  }, [mounted])

  if (!mounted) return null

  return (
    <div
      ref={ref}
      className="ocean-bg"
      style={{
        position: 'fixed', inset: 0, zIndex: 0, overflow: 'hidden', pointerEvents: 'none',
        background: 'linear-gradient(160deg, #0d6080 0%, #0a4d6e 20%, #093d58 45%, #072840 70%, #040f1a 100%)',
      }}
    >
      {/* Radial glow — top-left light source */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: 'radial-gradient(ellipse 60% 50% at 35% 20%, rgba(80,190,240,0.15) 0%, transparent 70%)',
      }} />
      {/* Dark fade at bottom */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, height: '28%', pointerEvents: 'none',
        background: 'linear-gradient(0deg, rgba(2,8,20,0.65) 0%, transparent 100%)',
      }} />
    </div>
  )
}
