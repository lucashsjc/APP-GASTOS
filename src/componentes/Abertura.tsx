import { useEffect, useState } from 'react'

/** O logo LK: letras vermelhas, largas e inclinadas, com contorno branco, na frente de um sol amarelo. */
export function LogoLK({ largura = 220 }: { largura?: number }) {
  return (
    <svg className="logo-lk" viewBox="-6 -14 250 128" width={largura} role="img" aria-label="LK">
      <defs>
        <radialGradient id="lk-sol" cx="0.4" cy="0.35" r="0.7">
          <stop offset="0" stopColor="#ffe066" />
          <stop offset="0.6" stopColor="#ffc906" />
          <stop offset="1" stopColor="#f2a900" />
        </radialGradient>
      </defs>
      <circle cx="122" cy="50" r="62" fill="url(#lk-sol)" />
      <g transform="translate(24 0) skewX(-14)" fill="#e4002b" stroke="#fff" strokeWidth="5" strokeLinejoin="round" paintOrder="stroke">
        <path d="M0 0 H32 V70 H84 V100 H0 Z" />
        <path d="M96 0 H128 V40 L170 0 H212 L156 52 L214 100 H170 L128 64 V100 H96 Z" />
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
