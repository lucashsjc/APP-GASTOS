import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { IconeAnterior, IconeProximo } from '../componentes/icones'

export interface Slide {
  chave: string
  para: string
  etiqueta: ReactNode
  numero: ReactNode
  negativo?: boolean
  titulo: string
  detalhe?: string
}

/** Cards grandes que deslizam para o lado, com os vizinhos aparecendo, setas e bolinhas. */
export function Carrossel({ slides }: { slides: Slide[] }) {
  const trilho = useRef<HTMLDivElement>(null)
  const [atual, setAtual] = useState(0)

  // Os dados chegam em partes (a prova entra na frente depois): ao mudar os cards, volta para o primeiro.
  const chaves = slides.map((s) => s.chave).join(',')
  useEffect(() => {
    trilho.current?.scrollTo({ left: 0 })
    setAtual(0)
  }, [chaves])

  const irPara = (i: number) => {
    const el = trilho.current
    const card = el?.children[i] as HTMLElement | undefined
    if (!el || !card) return
    el.scrollTo({ left: card.offsetLeft - (el.clientWidth - card.clientWidth) / 2, behavior: 'smooth' })
  }

  const aoRolar = () => {
    const el = trilho.current
    if (!el) return
    const largura = (el.children[0] as HTMLElement | undefined)?.clientWidth ?? el.clientWidth
    setAtual(Math.min(slides.length - 1, Math.max(0, Math.round(el.scrollLeft / (largura + 12)))))
  }

  if (!slides.length) return null
  return (
    <section className="carrossel" aria-roledescription="carrossel">
      <div className="carrossel-trilho" ref={trilho} onScroll={aoRolar}>
        {slides.map((s) => (
          <Link key={s.chave} to={s.para} className="carrossel-card">
            <span className="carrossel-etiqueta">{s.etiqueta}</span>
            <strong className={`carrossel-numero${s.negativo ? ' negativo' : ''}`}>{s.numero}</strong>
            <p className="carrossel-titulo">{s.titulo}</p>
            {s.detalhe && <p className="carrossel-detalhe">{s.detalhe}</p>}
          </Link>
        ))}
      </div>
      {slides.length > 1 && (
        <div className="carrossel-controles">
          <button type="button" className="carrossel-seta" aria-label="Anterior" onClick={() => irPara(Math.max(0, atual - 1))}>
            <IconeAnterior tamanho={18} />
          </button>
          <span className="carrossel-bolinhas" aria-hidden="true">
            {slides.map((s, i) => (
              <i key={s.chave} className={i === atual ? 'ativa' : undefined} />
            ))}
          </span>
          <button
            type="button"
            className="carrossel-seta"
            aria-label="Próximo"
            onClick={() => irPara(Math.min(slides.length - 1, atual + 1))}
          >
            <IconeProximo tamanho={18} />
          </button>
        </div>
      )}
    </section>
  )
}
