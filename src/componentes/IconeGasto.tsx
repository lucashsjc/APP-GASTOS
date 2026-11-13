import { IconeCategoria } from './icones'

/**
 * Ícone de cada gasto, como nos apps de banco: para lugares conhecidos, um quadradinho com a cor e a
 * inicial do lugar (não é o logo da empresa); para o resto, o ícone da categoria.
 */
const LUGARES: { regra: RegExp; sigla: string; fundo: string; cor?: string }[] = [
  { regra: /\buber\b/, sigla: 'U', fundo: '#000', cor: '#fff' },
  { regra: /\b99\b/, sigla: '99', fundo: '#ffd400', cor: '#111' },
  { regra: /\bifood\b/, sigla: 'iF', fundo: '#ea1d2c' },
  { regra: /\bspotify\b/, sigla: 'S', fundo: '#1ed760', cor: '#111' },
  { regra: /\bnetflix\b/, sigla: 'N', fundo: '#e50914' },
  { regra: /\byoutube\b/, sigla: 'Y', fundo: '#ff0033' },
  { regra: /\bicloud\b|\bapple\b/, sigla: '', fundo: '#2b8cff' },
  { regra: /\bamazon\b/, sigla: 'a', fundo: '#ff9900', cor: '#111' },
  { regra: /\bmercado livre\b/, sigla: 'ML', fundo: '#ffe600', cor: '#2d3277' },
  { regra: /\bshopee\b/, sigla: 'S', fundo: '#ee4d2d' },
  { regra: /\bporto\b/, sigla: 'P', fundo: '#0057b8' },
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
  if (lugar) {
    return (
      <span className="linha-icone icone-lugar" style={{ background: lugar.fundo, color: lugar.cor ?? '#fff' }} aria-hidden="true">
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
