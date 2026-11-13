import { useEffect, useState } from 'react'

/** O logo LK: letras prateadas e inclinadas, com a linha de velocidade verde-água por dentro do L. */
export function LogoLK({ largura = 220 }: { largura?: number }) {
  return (
    <svg className="logo-lk" viewBox="-10 -10 330 120" width={largura} role="img" aria-label="LK">
      <defs>
        <linearGradient id="lk-prata" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor="#f1f5f6" />
          <stop offset="1" stopColor="#9aa5aa" />
        </linearGradient>
      </defs>
      <g fill="url(#lk-prata)" transform="translate(58 0) skewX(-32)">
        <path d="M0 0 H26 V58 Q26 72 40 72 H124 V100 H34 Q0 100 0 66 Z" />
        <path d="M34 0 H42 V52 Q42 62 52 62 H124 V68 H50 Q34 68 34 52 Z" fill="#ec3a52" />
        <path d="M138 0 H164 V100 H138 Z" />
        <path d="M164 52 L216 0 H252 L182 70 H164 Z" />
        <path d="M186 52 L252 100 H214 L166 66 Z" />
      </g>
    </svg>
  )
}

/**
 * Tela de abertura: o logo entra como numa largada e fica esperando um toque para abrir o app (que já vai
 * carregando por trás). Aparece uma vez a cada vez que o app é aberto.
 */
export function Abertura() {
  const [fase, setFase] = useState<'esperando' | 'saindo' | 'fim'>('esperando')

  useEffect(() => {
    if (fase !== 'saindo') return
    const fim = window.setTimeout(() => setFase('fim'), 450)
    return () => window.clearTimeout(fim)
  }, [fase])

  useEffect(() => {
    if (fase !== 'esperando') return
    const tecla = (e: KeyboardEvent) => (e.key === 'Enter' || e.key === ' ') && setFase('saindo')
    document.addEventListener('keydown', tecla)
    return () => document.removeEventListener('keydown', tecla)
  }, [fase])

  if (fase === 'fim') return null
  return (
    <button
      type="button"
      className={`abertura${fase === 'saindo' ? ' saindo' : ''}`}
      onClick={() => setFase('saindo')}
      aria-label="Toque para começar"
      autoFocus
    >
      <span className="abertura-logo">
        <LogoLK largura={240} />
        <span className="abertura-rastro" />
      </span>
      <span className="abertura-toque">Toque para começar</span>
    </button>
  )
}
