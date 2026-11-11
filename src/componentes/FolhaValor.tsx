import { useState } from 'react'
import { lerReais, formatarReais } from '../lib/dinheiro'
import { Folha } from './Folha'

interface Props {
  titulo: string
  /** Valor atual, em centavos (para editar). */
  inicial?: number
  textoBotao: string
  classeBotao: string
  aoSalvar: (centavos: number) => Promise<boolean>
  aoFechar: () => void
  /** Aceita zero (ex.: recebido do mês). */
  aceitaZero?: boolean
}

/** Folha simples com um valor: o recebido do mês. */
export function FolhaValor({ titulo, inicial, textoBotao, classeBotao, aoSalvar, aoFechar, aceitaZero }: Props) {
  const [texto, setTexto] = useState(inicial ? formatarReais(inicial).replace('R$ ', '') : '')
  const [erro, setErro] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)

  const salvar = async (e: React.FormEvent) => {
    e.preventDefault()
    const valor = texto.trim() === '' && aceitaZero ? 0 : lerReais(texto)
    if (valor === null || (!aceitaZero && valor <= 0)) return setErro('Digite um valor válido.')
    setSalvando(true)
    const ok = await aoSalvar(valor)
    setSalvando(false)
    if (ok) aoFechar()
  }

  return (
    <Folha titulo={titulo} aoFechar={aoFechar}>
      <form className="form-gasto" onSubmit={salvar} noValidate>
        <label className="campo-valor">
          <span>Valor</span>
          <div>
            <span className="campo-valor-moeda">R$</span>
            <input
              inputMode="decimal"
              placeholder="0,00"
              value={texto}
              onChange={(e) => setTexto(e.target.value.replace(/[^\d.,]/g, ''))}
              autoFocus
              aria-label="Valor"
            />
          </div>
        </label>
        {erro && <p className="erro">{erro}</p>}
        <button type="submit" className={`botao-principal ${classeBotao}`} disabled={salvando}>
          {salvando ? 'Salvando…' : textoBotao}
        </button>
      </form>
    </Folha>
  )
}
