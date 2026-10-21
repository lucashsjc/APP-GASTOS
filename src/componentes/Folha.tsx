import { useEffect, type ReactNode } from 'react'

/** Folha que sobe de baixo (bottom sheet). Fecha ao tocar fora ou com Esc. */
export function Folha({ titulo, aoFechar, children }: { titulo: string; aoFechar: () => void; children: ReactNode }) {
  useEffect(() => {
    const tecla = (e: KeyboardEvent) => e.key === 'Escape' && aoFechar()
    document.addEventListener('keydown', tecla)
    document.body.classList.add('com-folha')
    return () => {
      document.removeEventListener('keydown', tecla)
      document.body.classList.remove('com-folha')
    }
  }, [aoFechar])

  return (
    <div className="folha-fundo" onClick={aoFechar}>
      <div className="folha" role="dialog" aria-modal="true" aria-label={titulo} onClick={(e) => e.stopPropagation()}>
        <div className="folha-alca" />
        <div className="folha-topo">
          <h2>{titulo}</h2>
          <button type="button" className="botao-texto" onClick={aoFechar}>
            Cancelar
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
