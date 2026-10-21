import { useState } from 'react'
import { lerReais, formatarReais } from '../lib/dinheiro'
import { Folha } from './Folha'

interface Props {
  titulo: string
  /** Valor atual, em centavos (para editar). */
  inicial?: number
  /** Mostra também o campo de data. */
  dataInicial?: string
  textoBotao: string
  classeBotao: string
  aoSalvar: (centavos: number, data: string) => Promise<boolean>
  aoFechar: () => void
  /** Aceita zero (ex.: recebido do mês). */
  aceitaZero?: boolean
}

/** Folha simples com um valor (e uma data, se precisar): recebido do mês e depósito do Caju. */
export function FolhaValor({ titulo, inicial, dataInicial, textoBotao, classeBotao, aoSalvar, aoFechar, aceitaZero }: Props) {
  const [texto, setTexto] = useState(inicial ? formatarReais(inicial).replace('R$ ', '') : '')
  const [data, setData] = useState(dataInicial ?? '')
  const [erro, setErro] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)

  const salvar = async (e: React.FormEvent) => {
    e.preventDefault()
    const valor = texto.trim() === '' && aceitaZero ? 0 : lerReais(texto)
    if (valor === null || (!aceitaZero && valor <= 0)) return setErro('Digite um valor válido.')
    if (dataInicial !== undefined && !/^\d{4}-\d{2}-\d{2}$/.test(data)) return setErro('Escolha a data.')
    setSalvando(true)
    const ok = await aoSalvar(valor, data)
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
        {dataInicial !== undefined && (
          <label className="campo">
            <span>Data</span>
            <input type="date" value={data} onChange={(e) => setData(e.target.value)} />
          </label>
        )}
        {erro && <p className="erro">{erro}</p>}
        <button type="submit" className={`botao-principal ${classeBotao}`} disabled={salvando}>
          {salvando ? 'Salvando…' : textoBotao}
        </button>
      </form>
    </Folha>
  )
}
