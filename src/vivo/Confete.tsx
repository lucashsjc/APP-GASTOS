import { useEffect, useRef } from 'react'

const CORES = ['#ff6b2c', '#f6a93b', '#c9213a', '#ffffff', '#9ca1ae']

/** Chuva de confete por cima da tela, uma vez (some sozinha). Respeita "reduzir movimento". */
export function Confete({ aoTerminar }: { aoTerminar?: () => void }) {
  const tela = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const c = tela.current
    if (!c) return
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      aoTerminar?.()
      return
    }
    const ctx = c.getContext('2d')
    if (!ctx) return
    const dpr = window.devicePixelRatio || 1
    const L = window.innerWidth
    const A = window.innerHeight
    c.width = L * dpr
    c.height = A * dpr
    ctx.scale(dpr, dpr)
    const pecas = Array.from({ length: 140 }, () => ({
      x: L / 2 + (Math.random() - 0.5) * L * 0.3,
      y: A * 0.35,
      vx: (Math.random() - 0.5) * 14,
      vy: -Math.random() * 14 - 4,
      giro: Math.random() * Math.PI,
      vg: (Math.random() - 0.5) * 0.4,
      l: 6 + Math.random() * 6,
      cor: CORES[Math.floor(Math.random() * CORES.length)],
    }))
    const inicio = performance.now()
    let quadro = 0
    const passo = (agora: number) => {
      const t = agora - inicio
      ctx.clearRect(0, 0, L, A)
      ctx.globalAlpha = Math.max(0, 1 - Math.max(0, t - 1800) / 900)
      for (const p of pecas) {
        p.vy += 0.35
        p.vx *= 0.99
        p.x += p.vx
        p.y += p.vy
        p.giro += p.vg
        ctx.save()
        ctx.translate(p.x, p.y)
        ctx.rotate(p.giro)
        ctx.fillStyle = p.cor
        ctx.fillRect(-p.l / 2, -p.l / 4, p.l, p.l / 2)
        ctx.restore()
      }
      if (t < 2700) quadro = requestAnimationFrame(passo)
      else aoTerminar?.()
    }
    quadro = requestAnimationFrame(passo)
    return () => cancelAnimationFrame(quadro)
  }, [aoTerminar])

  return <canvas ref={tela} className="confete" aria-hidden="true" />
}
