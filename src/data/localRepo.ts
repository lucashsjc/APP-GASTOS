import { hojeSP } from '../lib/datas'
import { completarGasto, completarRecorrencia } from './completar'
import { dadosDeExemplo } from './exemplo'
import type { Repo } from './repo'
import type { Dados, Gasto, Recorrencia } from './types'

const CHAVE = 'gastos-demo'

function ler(): Dados {
  try {
    const salvo = localStorage.getItem(CHAVE)
    if (salvo) {
      const dados: Dados = { gastos: [], recorrencias: [], recebidos: [], depositos: [], ...JSON.parse(salvo) }
      // Dados guardados antes do "pago" existir.
      dados.gastos = dados.gastos.map((g) => ({ ...g, pago: g.pago ?? false, observacao: g.observacao ?? '', separado: g.separado ?? false }))
      dados.recorrencias = dados.recorrencias.map((r) => ({ ...r, observacao: r.observacao ?? '', separado: r.separado ?? false }))
      return dados
    }
  } catch {
    // sem armazenamento: usa os dados de exemplo
  }
  const exemplo = dadosDeExemplo(hojeSP())
  gravar(exemplo)
  return exemplo
}

function gravar(dados: Dados) {
  try {
    localStorage.setItem(CHAVE, JSON.stringify(dados))
  } catch {
    // modo demonstração: ignorar falha de armazenamento
  }
}

function alterar(fn: (dados: Dados) => void) {
  const dados = ler()
  fn(dados)
  gravar(dados)
}

export function criarRepoLocal(): Repo {
  return {
    async carregar() {
      return ler()
    },

    async criarGastos(novos) {
      const criados: Gasto[] = novos.map((g) => completarGasto(g, crypto.randomUUID()))
      alterar((d) => d.gastos.push(...criados))
      return criados
    },
    async atualizarGasto(id, dados) {
      alterar((d) => (d.gastos = d.gastos.map((g) => (g.id === id ? { ...g, ...dados } : g))))
    },
    async excluirGastos(ids) {
      alterar((d) => (d.gastos = d.gastos.filter((g) => !ids.includes(g.id))))
    },

    async criarRecorrencia(dados) {
      const r: Recorrencia = completarRecorrencia(dados, crypto.randomUUID())
      alterar((d) => d.recorrencias.push(r))
      return r
    },
    async atualizarRecorrencia(id, dados) {
      alterar((d) => (d.recorrencias = d.recorrencias.map((r) => (r.id === id ? { ...r, ...dados } : r))))
    },
    async excluirRecorrencia(id) {
      alterar((d) => {
        d.recorrencias = d.recorrencias.filter((r) => r.id !== id)
        // Como no banco (on delete cascade): os ajustes daquele "todo mês" vão junto.
        d.gastos = d.gastos.filter((g) => g.recorrencia_id !== id)
      })
    },

    async salvarRecebido(mes, valorCentavos) {
      alterar((d) => {
        d.recebidos = d.recebidos.filter((r) => r.mes !== mes)
        d.recebidos.push({ id: crypto.randomUUID(), aba: 'nubank', mes, valor_centavos: valorCentavos })
      })
    },

    async criarDeposito(dados) {
      const deposito = { ...dados, id: crypto.randomUUID() }
      alterar((d) => d.depositos.push(deposito))
      return deposito
    },
    async excluirDeposito(id) {
      alterar((d) => (d.depositos = d.depositos.filter((x) => x.id !== id)))
    },

    async restaurarExemplo() {
      gravar(dadosDeExemplo(hojeSP()))
    },
  }
}
