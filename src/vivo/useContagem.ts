import { useEffect, useRef, useState } from 'react'

const semAnimacao = () =>
  typeof window === 'undefined' || !window.matchMedia || window.matchMedia('(prefers-reduced-motion: reduce)').matches

/**
 * Número que "corre" até o valor (como um placar): começa do valor anterior (ou de zero, na primeira vez)
 * e chega ao novo em `duracao` ms, desacelerando no fim. Sem animação se o aparelho pede menos movimento.
 */
export function useContagem(alvo: number, duracao = 900): number {
  const [atual, setAtual] = useState(() => (semAnimacao() ? alvo : 0))
  const atualRef = useRef(atual)
  atualRef.current = atual

  useEffect(() => {
    if (semAnimacao()) {
      setAtual(alvo)
      return
    }
    const de = atualRef.current
    if (de === alvo) return
    const inicio = performance.now()
    let quadro = 0
    const passo = (agora: number) => {
      const t = Math.min(1, (agora - inicio) / duracao)
      const suave = 1 - Math.pow(1 - t, 3)
      setAtual(Math.round(de + (alvo - de) * suave))
      if (t < 1) quadro = requestAnimationFrame(passo)
    }
    quadro = requestAnimationFrame(passo)
    return () => cancelAnimationFrame(quadro)
  }, [alvo, duracao])

  return atual
}
