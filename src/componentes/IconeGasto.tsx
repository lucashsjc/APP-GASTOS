import { IconeCategoria } from './icones'

/**
 * Ícone de cada gasto, como nos apps de banco: para lugares conhecidos, o logo que o Lucas mandou
 * (public/lugares) ou um quadradinho com a cor e a inicial do lugar; para o resto, o ícone da categoria.
 */
const LUGARES: { regra: RegExp; sigla: string; fundo: string; cor?: string; imagem?: string; desenho?: 'nuvem' }[] = [
  { regra: /\buber\b/, sigla: 'Uber', fundo: '#000', cor: '#fff' },
  { regra: /\b99\b/, sigla: '99', fundo: '#ffd400', cor: '#111' },
  { regra: /\bifood\b/, sigla: 'iF', fundo: '#ea1d2c' },
  { regra: /\bspotify\b/, sigla: 'S', fundo: '#1ed760', cor: '#111', imagem: '/lugares/spotify.png' },
  { regra: /\bnetflix\b/, sigla: 'N', fundo: '#e50914' },
  { regra: /\byoutube\b/, sigla: 'Y', fundo: '#ff0033' },
  { regra: /\bicloud\b/, sigla: '', fundo: '#fff', desenho: 'nuvem' },
  { regra: /\bapple\b/, sigla: '', fundo: '#2b8cff' },
  { regra: /\bamazon\b/, sigla: 'a', fundo: '#ff9900', cor: '#111' },
  { regra: /\bmercado livre\b/, sigla: 'ML', fundo: '#ffe600', cor: '#2d3277' },
  { regra: /\bshopee\b/, sigla: 'S', fundo: '#ee4d2d' },
  { regra: /\bporto\b/, sigla: 'P', fundo: '#0057b8', imagem: '/lugares/porto.png' },
  { regra: /\bgta\b|grand theft auto/, sigla: 'GTA', fundo: '#7b2d8f', imagem: '/lugares/gta.png' },
  { regra: /\bclaude\b/, sigla: 'C', fundo: '#d97757' },
  { regra: /\bsteam\b|\bpsn\b|\bplaystation\b/, sigla: '▶', fundo: '#1b2838' },
  { regra: /\bmc ?donalds\b/, sigla: 'M', fundo: '#da291c', cor: '#ffc72c' },
  { regra: /\bburger king\b|\bbk\b/, sigla: 'BK', fundo: '#d62300', cor: '#f5ebdc' },
]

function semAcento(texto: string) {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

export function IconeGasto({ descricao, categoria, icone }: { descricao: string; categoria: string; icone?: string }) {
  const lugar = icone ? undefined : LUGARES.find((l) => l.regra.test(semAcento(descricao)))
  if (lugar?.desenho === 'nuvem') {
    return (
      <span className="linha-icone icone-lugar com-imagem" aria-hidden="true">
        <Nuvem />
      </span>
    )
  }
  if (lugar?.imagem) {
    return (
      <span className="linha-icone icone-lugar com-imagem" aria-hidden="true">
        <img src={lugar.imagem} alt="" width={26} height={26} draggable={false} />
      </span>
    )
  }
  if (lugar) {
    return (
      <span
        className={`linha-icone icone-lugar${lugar.sigla.length > 2 ? ' sigla-longa' : ''}`}
        style={{ background: lugar.fundo, color: lugar.cor ?? '#fff' }}
        aria-hidden="true"
      >
        {lugar.sigla || <IconeCategoria nome={categoria} />}
      </span>
    )
  }
  return (
    <span className="linha-icone" aria-hidden="true">
      <IconeCategoria nome={icone ?? categoria} />
    </span>
  )
}

/** Nuvem azul em degradê (para o iCloud). */
function Nuvem() {
  return (
    <svg width="28" height="20" viewBox="0 0 64 42" aria-hidden="true">
      <defs>
        <linearGradient id="nuvem-degrade" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor="#93dbf7" />
          <stop offset="0.55" stopColor="#64a9f5" />
          <stop offset="1" stopColor="#3f82f5" />
        </linearGradient>
      </defs>
      <path
        d="M14 41a13 13 0 0 1-5.6-24.8A10 10 0 0 1 22 9.2 17.5 17.5 0 0 1 54 17a12.4 12.4 0 0 1-1.3 24.6Z"
        fill="url(#nuvem-degrade)"
      />
    </svg>
  )
}
