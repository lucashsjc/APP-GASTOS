import { useState } from 'react'
import { diaDe, mesDe, nomeDoMes, somarMeses, tituloDoMes } from '../lib/datas'
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
  /** Mostra "Vale para o mês" (depósito do Caju): o mês da data ou o seguinte. */
  comMes?: boolean
  /** O terceiro argumento é o mês escolhido quando não é o da data (null = o mês da data). */
  aoSalvar: (centavos: number, data: string, mesConta: string | null) => Promise<boolean>
  aoFechar: () => void
  /** Aceita zero (ex.: recebido do mês). */
  aceitaZero?: boolean
}

/** Folha simples com um valor (e uma data, se precisar): recebido do mês e depósito do Caju. */
export function FolhaValor({ titulo, inicial, dataInicial, textoBotao, classeBotao, aoSalvar, aoFechar, aceitaZero, comMes }: Props) {
  const [texto, setTexto] = useState(inicial ? formatarReais(inicial).replace('R$ ', '') : '')
  const [data, setData] = useState(dataInicial ?? '')
  const dataValida = /^\d{4}-\d{2}-\d{2}$/.test(data)
  // O Caju cai no fim do mês valendo para o seguinte: do dia 20 em diante, já sugere o próximo mês.
  const [proximoMes, setProximoMes] = useState(Boolean(dataInicial && diaDe(dataInicial) >= 20))
  const mudarData = (nova: string) => {
    setData(nova)
    if (/^\d{4}-\d{2}-\d{2}$/.test(nova)) setProximoMes(diaDe(nova) >= 20)
  }
  const [erro, setErro] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)

  const salvar = async (e: React.FormEvent) => {
    e.preventDefault()
    const valor = texto.trim() === '' && aceitaZero ? 0 : lerReais(texto)
    if (valor === null || (!aceitaZero && valor <= 0)) return setErro('Digite um valor válido.')
    if (dataInicial !== undefined && !/^\d{4}-\d{2}-\d{2}$/.test(data)) return setErro('Escolha a data.')
    setSalvando(true)
    const ok = await aoSalvar(valor, data, comMes && proximoMes ? somarMeses(mesDe(data), 1) : null)
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
            <input type="date" value={data} onChange={(e) => mudarData(e.target.value)} />
          </label>
        )}
        {comMes && dataValida && (
          <div className="campo">
            <span>Vale para o mês</span>
            <div className="segmentado pequeno" role="radiogroup" aria-label="Mês para o qual o depósito vale">
              {[false, true].map((proximo) => (
                <button
                  key={String(proximo)}
                  type="button"
                  role="radio"
                  aria-checked={proximoMes === proximo}
                  className={proximoMes === proximo ? 'ativo' : ''}
                  onClick={() => setProximoMes(proximo)}
                >
                  {tituloDoMes(somarMeses(mesDe(data), proximo ? 1 : 0), mesDe(data))}
                </button>
              ))}
            </div>
            <small className="nota">
              Entra no saldo de {nomeDoMes(somarMeses(mesDe(data), proximoMes ? 1 : 0))}. Cada mês tem o seu saldo: o que
              sobra não passa para o mês seguinte.
            </small>
          </div>
        )}
        {erro && <p className="erro">{erro}</p>}
        <button type="submit" className={`botao-principal ${classeBotao}`} disabled={salvando}>
          {salvando ? 'Salvando…' : textoBotao}
        </button>
      </form>
    </Folha>
  )
}
