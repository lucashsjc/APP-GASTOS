import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'

const LARGURA_ACOES = 152

// Só um item fica aberto por vez.
let fecharOAberto: (() => void) | null = null

interface Props {
  children: ReactNode
  aoEditar?: () => void
  aoApagar: () => void
  /** Texto do botão de apagar ("Apagar" ou "Encerrar"). */
  rotuloApagar?: string
  /** Pergunta da confirmação, mostrada na própria linha. */
  pergunta: string
  aoTocar?: () => void
}

/** Linha que, deslizada para a esquerda, mostra Editar e Apagar. Apagar pede confirmação na própria linha. */
export function ItemDeslizavel({ children, aoEditar, aoApagar, rotuloApagar = 'Apagar', pergunta, aoTocar }: Props) {
  const [deslocamento, setDeslocamento] = useState(0)
  const [arrastando, setArrastando] = useState(false)
  const [confirmando, setConfirmando] = useState(false)
  const toque = useRef<{ x: number; y: number; base: number; horizontal: boolean | null } | null>(null)
  const arrastou = useRef(false)

  const fechar = useCallback(() => {
    setDeslocamento(0)
    setConfirmando(false)
  }, [])

  useEffect(
    () => () => {
      if (fecharOAberto === fechar) fecharOAberto = null
    },
    [fechar],
  )

  const abrir = () => {
    if (fecharOAberto && fecharOAberto !== fechar) fecharOAberto()
    fecharOAberto = fechar
    setDeslocamento(-LARGURA_ACOES)
  }

  const aoApertar = (e: React.PointerEvent) => {
    if (confirmando) return
    toque.current = { x: e.clientX, y: e.clientY, base: deslocamento, horizontal: null }
    arrastou.current = false
  }

  const aoMover = (e: React.PointerEvent) => {
    const t = toque.current
    if (!t) return
    const dx = e.clientX - t.x
    const dy = e.clientY - t.y
    if (t.horizontal === null) {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return
      t.horizontal = Math.abs(dx) > Math.abs(dy)
      if (t.horizontal) {
        ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
        setArrastando(true)
      }
    }
    if (!t.horizontal) return
    arrastou.current = true
    setDeslocamento(Math.max(-LARGURA_ACOES - 24, Math.min(0, t.base + dx)))
  }

  const aoSoltar = () => {
    const t = toque.current
    toque.current = null
    setArrastando(false)
    if (!t?.horizontal) return
    if (deslocamento < -LARGURA_ACOES / 2) abrir()
    else fechar()
  }

  const aoClicar = () => {
    if (arrastou.current) return
    if (deslocamento !== 0) fechar()
    else aoTocar?.()
  }

  return (
    <div className="deslizavel">
      <div className="deslizavel-acoes" style={{ width: LARGURA_ACOES }} aria-hidden={deslocamento === 0}>
        {aoEditar && (
          <button
            type="button"
            className="acao-editar"
            tabIndex={deslocamento === 0 ? -1 : 0}
            onClick={() => {
              fechar()
              aoEditar()
            }}
          >
            Editar
          </button>
        )}
        <button
          type="button"
          className="acao-apagar"
          tabIndex={deslocamento === 0 ? -1 : 0}
          onClick={() => setConfirmando(true)}
        >
          {rotuloApagar}
        </button>
      </div>
      <div
        className={`deslizavel-frente${arrastando ? ' arrastando' : ''}`}
        style={{ transform: `translateX(${deslocamento}px)` }}
        onPointerDown={aoApertar}
        onPointerMove={aoMover}
        onPointerUp={aoSoltar}
        onPointerCancel={aoSoltar}
        onClick={aoClicar}
        onKeyDown={(e) => {
          // No teclado: Delete/Backspace abre as ações.
          if (e.key === 'Delete' || e.key === 'Backspace') abrir()
        }}
        tabIndex={0}
      >
        {children}
      </div>
      {confirmando && (
        <div className="deslizavel-confirmar" role="alertdialog" aria-label={pergunta}>
          <span>{pergunta}</span>
          <div>
            <button type="button" className="botao-texto" onClick={fechar}>
              Não
            </button>
            <button
              type="button"
              className="botao-perigo"
              onClick={() => {
                fechar()
                aoApagar()
              }}
            >
              {rotuloApagar}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
