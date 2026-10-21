import { partesDoValor } from '../lib/dinheiro'

/** Valor em destaque: "R$ 1.019" grande e os centavos menores, em sobrescrito. */
export function Valor({ centavos, className = '' }: { centavos: number; className?: string }) {
  const { sinal, inteiro, centavos: c } = partesDoValor(centavos)
  return (
    <span className={`valor-grande ${className}`}>
      <span className="valor-moeda">{sinal}R$</span>
      {inteiro}
      <sup>,{c}</sup>
    </span>
  )
}
