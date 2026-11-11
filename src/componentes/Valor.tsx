import { partesDoValor } from '../lib/dinheiro'
import { useContagem } from '../vivo/useContagem'

/** Valor em destaque: "R$ 1.019" grande e os centavos menores, em sobrescrito. O número corre até o valor. */
export function Valor({ centavos, className = '' }: { centavos: number; className?: string }) {
  const animado = useContagem(centavos)
  const { sinal, inteiro, centavos: c } = partesDoValor(animado)
  return (
    <span className={`valor-grande ${className}`} aria-label={`${sinal}R$ ${partesDoValor(centavos).inteiro},${partesDoValor(centavos).centavos}`}>
      <span className="valor-moeda" aria-hidden="true">{sinal}R$</span>
      <span aria-hidden="true">{inteiro}</span>
      <sup aria-hidden="true">,{c}</sup>
    </span>
  )
}
