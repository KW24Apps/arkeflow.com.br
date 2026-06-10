'use client'

import { useEffect, useRef, useState } from 'react'

const RAYS = [
  { left: '8%',  height: '220px', width: '2px', dur: '7s', delay: '0s'    },
  { left: '18%', height: '180px', width: '2px', dur: '6s', delay: '-2.1s' },
  { left: '32%', height: '260px', width: '3px', dur: '8s', delay: '-4.5s' },
  { left: '48%', height: '160px', width: '2px', dur: '5s', delay: '-1.3s' },
  { left: '60%', height: '240px', width: '3px', dur: '7s', delay: '-3.7s' },
  { left: '72%', height: '190px', width: '2px', dur: '6s', delay: '-0.8s' },
  { left: '85%', height: '210px', width: '2px', dur: '5s', delay: '-5.2s' },
]

export function OceanBackground() {
  const ref = useRef<HTMLDivElement>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    const stage = ref.current
    if (!stage) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let alive = true

    const timeouts: number[] = []
    const rnd = (a: number, b: number) => a + Math.random() * (b - a)

    function burst(b: HTMLDivElement) {
      if (!alive || !stage) return
      const r = b.getBoundingClientRect()
      const s = stage.getBoundingClientRect()
      const cx = r.left - s.left + r.width / 2
      const cy = r.top - s.top + r.height / 2
      const sz = r.width
      if (cx < -60 || cx > s.width + 60) return
      const ring = document.createElement('div')
      ring.className = 'ocean-ring'
      ring.style.left = cx + 'px'; ring.style.top = cy + 'px'
      ring.style.width = sz + 'px'; ring.style.height = sz + 'px'
      stage.appendChild(ring)
      timeouts.push(window.setTimeout(() => ring.remove(), 520))
      const n = Math.max(5, Math.round(sz / 5.5))
      for (let i = 0; i < n; i++) {
        const d = document.createElement('div')
        d.className = 'ocean-drop'
        const ds = Math.max(2, Math.round(sz * rnd(0.10, 0.22)))
        const ang = rnd(0, Math.PI * 2)
        const rad = sz * rnd(0.7, 1.7)
        d.style.width = ds + 'px'; d.style.height = ds + 'px'
        d.style.left = cx + 'px'; d.style.top = cy + 'px'
        d.style.setProperty('--tx', (Math.cos(ang) * rad).toFixed(1) + 'px')
        d.style.setProperty('--ty', (Math.sin(ang) * rad + sz * 0.5).toFixed(1) + 'px')
        stage.appendChild(d)
        timeouts.push(window.setTimeout(() => d.remove(), 640))
      }
    }

    function spawn() {
      if (!alive || !stage) return
      const H = stage.clientHeight || window.innerHeight
      const b = document.createElement('div')
      b.className = 'ocean-bb'
      const size = Math.round(rnd(9, 46))
      const dur = rnd(7, 12)
      const op = rnd(0.45, 0.85)
      const rise = Math.round(rnd(0.5, 0.7) * H)
      b.style.width = size + 'px'; b.style.height = size + 'px'
      b.style.left = rnd(3, 95) + '%'
      b.style.setProperty('--op', op.toFixed(2))
      b.style.setProperty('--rise', rise + 'px')
      b.style.animation = 'ocean-rise ' + dur.toFixed(1) + 's linear forwards'
      b.addEventListener('animationend', () => { if (!alive) { b.remove(); return }; burst(b); b.remove(); spawn() }, { once: true })
      stage.appendChild(b)
    }

    const MAX = reduced ? 6 : 18
    for (let i = 0; i < MAX; i++) {
      const delay = i < 4 ? 0 : Math.random() * (reduced ? 4000 : 2500)
      timeouts.push(window.setTimeout(spawn, delay))
    }

    return () => {
      alive = false
      timeouts.forEach(clearTimeout)
      stage.querySelectorAll('.ocean-bb, .ocean-ring, .ocean-drop').forEach(e => e.remove())
    }
  }, [])

  if (!mounted) return null

  return (
    <div
      ref={ref}
      className="ocean-bg"
      style={{
        position: 'fixed', inset: 0, zIndex: 0, overflow: 'hidden', pointerEvents: 'none',
        background: 'linear-gradient(160deg, #14506b 0%, #11425e 35%, #0e3a52 65%, #0b2940 100%)',
      }}
    >
      {RAYS.map((r, i) => (
        <div key={i} style={{
          position: 'absolute', top: 0, left: r.left, width: r.width, height: r.height,
          background: 'rgba(255,255,255,0.07)', borderRadius: '2px', transformOrigin: 'top center',
          animation: `sway ${r.dur} ease-in-out ${r.delay} infinite`,
        }} />
      ))}
    </div>
  )
}
