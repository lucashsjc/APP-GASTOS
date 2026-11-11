import { useContagem } from './useContagem'

interface Props {
  /** Quanto já foi gasto, em centavos. */
  gasto: number
  /** O total do mês (100% do mostrador). */
  total: number
  /** Onde o ritmo ideal está hoje (a marca no mostrador). */
  ideal: number
  rotulo: string
}

const INICIO = -120
const FIM = 120

function ponto(angulo: number, raio: number) {
  const rad = ((angulo - 90) * Math.PI) / 180
  return { x: 100 + raio * Math.cos(rad), y: 100 + raio * Math.sin(rad) }
}

function arco(de: number, ate: number, raio: number) {
  const a = ponto(de, raio)
  const b = ponto(ate, raio)
  const grande = ate - de > 180 ? 1 : 0
  return `M ${a.x.toFixed(2)} ${a.y.toFixed(2)} A ${raio} ${raio} 0 ${grande} 1 ${b.x.toFixed(2)} ${b.y.toFixed(2)}`
}

/** Velocímetro do mês: o ponteiro é o que já foi gasto; a marca branca, onde o ritmo ideal está hoje. */
export function Velocimetro({ gasto, total, ideal, rotulo }: Props) {
  const fracao = total > 0 ? gasto / total : 0
  const animada = useContagem(Math.round(Math.min(1.1, Math.max(0, fracao)) * 1000), 1100) / 1000
  const angulo = INICIO + (FIM - INICIO) * Math.min(1, animada)
  const angIdeal = INICIO + (FIM - INICIO) * Math.min(1, total > 0 ? ideal / total : 0)
  const acima = gasto > ideal
  const marcas = Array.from({ length: 11 }, (_, i) => INICIO + ((FIM - INICIO) * i) / 10)
  const p = ponto(angulo, 66)
  const mi = ponto(angIdeal, 88)
  const mf = ponto(angIdeal, 70)
  const porcento = Math.round(animada * 100)

  return (
    <figure className={`velocimetro ${acima ? 'ruim' : 'bom'}`}>
      <svg viewBox="0 18 200 150" role="img" aria-label={`${rotulo}: ${Math.round(fracao * 100)}% do mês`}>
        <path d={arco(INICIO, FIM, 80)} className="velo-fundo" />
        <path
          d={arco(INICIO, Math.max(INICIO + 0.5, angulo), 80)}
          className="velo-faixa"
        />
        {marcas.map((a, i) => {
          const de = ponto(a, 94)
          const ate = ponto(a, i % 5 === 0 ? 86 : 90)
          return <line key={i} x1={de.x} y1={de.y} x2={ate.x} y2={ate.y} className="velo-marca" />
        })}
        <line x1={mi.x} y1={mi.y} x2={mf.x} y2={mf.y} className="velo-ideal" />
        <line x1={100} y1={100} x2={p.x} y2={p.y} className="velo-ponteiro" />
        <circle cx={100} cy={100} r={7} className="velo-eixo" />
        <text x={100} y={138} textAnchor="middle" className="velo-numero">
          {porcento}%
        </text>
        <text x={100} y={156} textAnchor="middle" className="velo-rotulo">
          {rotulo}
        </text>
      </svg>
    </figure>
  )
}
