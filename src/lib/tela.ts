import { useSyncExternalStore } from 'react'

/** Jeito de mostrar o app: "celular" (coluna estreita e barra embaixo) ou "pc" (menu fixo ao lado e tela larga). */
export type Tela = 'celular' | 'pc'

const CHAVE = 'tela'
const ouvintes = new Set<() => void>()

function inicial(): Tela {
  try {
    const salvo = localStorage.getItem(CHAVE)
    if (salvo === 'celular' || salvo === 'pc') return salvo
  } catch {
    /* sem localStorage: segue pelo tamanho da tela */
  }
  return typeof window !== 'undefined' && window.matchMedia?.('(min-width: 1024px)').matches ? 'pc' : 'celular'
}

let atual: Tela = inicial()
if (typeof document !== 'undefined') document.documentElement.dataset.tela = atual

export function escolherTela(tela: Tela) {
  atual = tela
  document.documentElement.dataset.tela = tela
  try {
    localStorage.setItem(CHAVE, tela)
  } catch {
    /* ignora */
  }
  ouvintes.forEach((f) => f())
}

export function useTela(): Tela {
  return useSyncExternalStore(
    (f) => {
      ouvintes.add(f)
      return () => ouvintes.delete(f)
    },
    () => atual,
  )
}
