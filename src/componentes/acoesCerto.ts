// Editar e apagar um gasto fixo (todo mês), uma parcela ou um certo só deste mês. Usado na lista do
// mês e na página "Fixos e parcelas".

import { aplicarPlanoRecorrencia } from '../data/acoes'
import { repo } from '../data/repo'
import type { Aba } from '../data/types'
import { useEstado } from '../estado'
import { certosDoMes, planejarEncerramento, type Certo } from '../lib/calculos'
import { mesDe, nomeDoMes, somarMeses } from '../lib/datas'
import { formatarReais } from '../lib/dinheiro'
import type { ModoGasto } from './FolhaGasto'

export function useAcoesCerto(aba: Aba, abrirFolha: (modo: ModoGasto) => void) {
  const { dados, hoje, mes, executar } = useEstado()
  const mesAtual = mesDe(hoje)

  const editar = (c: Certo) => abrirFolha(c.recorrencia ? { aba, recorrencia: c.recorrencia } : { aba, gasto: c.gasto! })

  /** Para um "todo mês", apagar = parar de contar: os meses que já passaram não mudam. */
  const encerramento = (c: Certo) => {
    const r = c.recorrencia!
    const aPartirDe = mes > mesAtual ? mes : mesAtual
    const ocorrencia = certosDoMes(dados, aba, aPartirDe, hoje).find((x) => x.recorrencia?.id === r.id)
    // Se a cobrança deste mês já aconteceu, este mês continua contando.
    const ultimoMes = ocorrencia?.caiu ? aPartirDe : somarMeses(aPartirDe, -1)
    return { ultimoMes, plano: planejarEncerramento(dados, r, ultimoMes) }
  }

  const pergunta = (c: Certo) => {
    if (c.recorrencia) {
      const { ultimoMes, plano } = encerramento(c)
      return plano.excluir
        ? `Apagar “${c.descricao}”?`
        : `Parar de contar “${c.descricao}” a partir de ${nomeDoMes(somarMeses(ultimoMes, 1))}? Os meses anteriores não mudam.`
    }
    if (c.grupo === 'parcelas') {
      const n = dados.gastos.filter((g) => g.grupo_id && g.grupo_id === c.gasto?.grupo_id).length
      return n > 1 ? `Apagar a compra “${c.descricao}” inteira (${n} parcelas)?` : `Apagar esta parcela de “${c.descricao}”?`
    }
    return `Apagar “${c.descricao}” (${formatarReais(c.valor_centavos)})?`
  }

  const apagar = (c: Certo) =>
    executar(async () => {
      if (c.recorrencia) return aplicarPlanoRecorrencia(c.recorrencia, encerramento(c).plano)
      const g = c.gasto!
      const ids = g.grupo_id ? dados.gastos.filter((x) => x.grupo_id === g.grupo_id).map((x) => x.id) : [g.id]
      return repo.excluirGastos(ids)
    })

  const rotuloApagar = (c: Certo) => (c.recorrencia ? 'Encerrar' : 'Apagar')

  return { editar, pergunta, apagar, rotuloApagar }
}

/** Etiqueta curta do tipo do gasto, ao lado da data. */
export function etiquetaCerto(c: Certo): string {
  if (c.grupo === 'todo_mes') return 'Todo mês'
  if (c.grupo === 'parcelas') return `Parcela ${c.parcela_numero} de ${c.parcela_total}`
  return 'Previsto'
}
