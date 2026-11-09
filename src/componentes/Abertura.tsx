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
        <path d="M34 0 H42 V52 Q42 62 52 62 H124 V68 H50 Q34 68 34 52 Z" fill="#2ee59d" />
        <path d="M138 0 H164 V100 H138 Z" />
        <path d="M164 52 L216 0 H252 L182 70 H164 Z" />
        <path d="M186 52 L252 100 H214 L166 66 Z" />
      </g>
    </svg>
  )
}

/**
 * Tela de abertura: o logo entra como numa largada e, depois de um instante, a tela some e mostra o
 * app (que já vai carregando por trás). Aparece uma vez a cada vez que o app é aberto.
 */
export function Abertura() {
  const [fase, setFase] = useState<'entrando' | 'saindo' | 'fim'>('entrando')

  useEffect(() => {
    const sair = window.setTimeout(() => setFase('saindo'), 1300)
    const fim = window.setTimeout(() => setFase('fim'), 1750)
    return () => {
      window.clearTimeout(sair)
      window.clearTimeout(fim)
    }
  }, [])

  if (fase === 'fim') return null
  return (
    <div className={`abertura${fase === 'saindo' ? ' saindo' : ''}`} aria-hidden="true">
      <div className="abertura-logo">
        <LogoLK largura={240} />
        <span className="abertura-rastro" />
      </div>
    </div>
  )
}
