import { useState } from 'react'
import type { Carteira } from '../data/types'
import { CARTEIRAS } from '../lib/calculos'
import { diaDe, mesDe, nomeDoMes, somarMeses, tituloDoMes } from '../lib/datas'
import { formatarReais, lerReais, somar } from '../lib/dinheiro'
import { Folha } from './Folha'

/**
 * Depósito do Caju: quanto caiu em cada carteira (refeição e mobilidade) de uma vez, na mesma data e
 * valendo para o mesmo mês. Grava um depósito para cada carteira com valor.
 */
export function FolhaDeposito({
  dataInicial,
  aoSalvar,
  aoFechar,
}: {
  dataInicial: string
  aoSalvar: (depositos: { carteira: Carteira; valor: number }[], data: string, mesConta: string | null) => Promise<boolean>
  aoFechar: () => void
}) {
  const [textos, setTextos] = useState<Record<Carteira, string>>({ refeicao: '', mobilidade: '' })
  const [data, setData] = useState(dataInicial)
  const dataValida = /^\d{4}-\d{2}-\d{2}$/.test(data)
  // O Caju cai no fim do mês valendo para o seguinte: do dia 20 em diante, já sugere o próximo mês.
  const [proximoMes, setProximoMes] = useState(diaDe(dataInicial) >= 20)
  const [erro, setErro] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)

  const mudarData = (nova: string) => {
    setData(nova)
    if (/^\d{4}-\d{2}-\d{2}$/.test(nova)) setProximoMes(diaDe(nova) >= 20)
  }
  const valores = CARTEIRAS.map((c) => ({ carteira: c.id, valor: textos[c.id].trim() ? lerReais(textos[c.id]) : 0 }))
  const total = somar(valores.map((v) => v.valor ?? 0))

  const salvar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (valores.some((v) => v.valor === null || v.valor < 0)) return setErro('Algum valor está inválido (ex.: 450,00).')
    if (total <= 0) return setErro('Coloque quanto caiu em pelo menos uma carteira.')
    if (!dataValida) return setErro('Escolha a data.')
    setSalvando(true)
    const ok = await aoSalvar(
      valores.filter((v): v is { carteira: Carteira; valor: number } => (v.valor ?? 0) > 0),
      data,
      proximoMes ? somarMeses(mesDe(data), 1) : null,
    )
    setSalvando(false)
    if (ok) aoFechar()
  }

  return (
    <Folha titulo="Depósito no Caju" aoFechar={aoFechar}>
      <form className="form-gasto" onSubmit={salvar} noValidate>
        <div className="deposito-carteiras">
          {CARTEIRAS.map((c, i) => (
            <label key={c.id} className="campo">
              <span>{c.nome}</span>
              <div className="campo-reais">
                <span>R$</span>
                <input
                  inputMode="decimal"
                  placeholder="0,00"
                  value={textos[c.id]}
                  onChange={(e) => setTextos((t) => ({ ...t, [c.id]: e.target.value.replace(/[^\d.,]/g, '') }))}
                  autoFocus={i === 0}
                  aria-label={`Valor de ${c.nome}`}
                />
              </div>
            </label>
          ))}
        </div>
        <p className="deposito-total">
          Total do depósito <strong>{formatarReais(total)}</strong>
        </p>
        <label className="campo">
          <span>Data</span>
          <input type="date" value={data} onChange={(e) => mudarData(e.target.value)} />
        </label>
        {dataValida && (
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
        <button type="submit" className="botao-principal botao-caju" disabled={salvando}>
          {salvando ? 'Salvando…' : 'Registrar depósito'}
        </button>
      </form>
    </Folha>
  )
}
