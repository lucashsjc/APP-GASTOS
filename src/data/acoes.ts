// Operações que mexem em mais de uma linha (aplicam os planos de src/lib/calculos.ts).

import type { Certo, PlanoRecorrencia } from '../lib/calculos'
import { repo } from './repo'
import type { Gasto, NovoGasto, Recorrencia } from './types'

export async function aplicarPlanoRecorrencia(r: Recorrencia, plano: PlanoRecorrencia) {
  if (plano.excluirAjustes.length) await repo.excluirGastos(plano.excluirAjustes)
  if (plano.excluir) await repo.excluirRecorrencia(r.id)
  if (plano.atualizar) await repo.atualizarRecorrencia(r.id, plano.atualizar)
  if (plano.criar) await repo.criarRecorrencia(plano.criar)
}

/** Linha de ajuste de um "todo mês" naquele mês (guarda "caiu" e "pago" só daquele mês). */
function ajusteDeRecorrencia(c: Certo, campos: Partial<NovoGasto>): NovoGasto {
  return {
    aba: c.aba,
    forma: c.forma,
    descricao: c.descricao,
    valor_centavos: c.valor_centavos,
    data: c.data,
    categoria: c.categoria,
    tipo: 'certo_unico',
    recorrencia_id: c.recorrencia!.id,
    grupo_id: null,
    parcela_numero: null,
    parcela_total: null,
    caiu_manual: null,
    ...campos,
  }
}

/** Um ajuste de "todo mês" que já não marca nada é apagado: volta a ocorrência calculada. */
function ajusteVazio(g: Gasto, mudanca: Partial<Gasto>): boolean {
  const final = { ...g, ...mudanca }
  return Boolean(g.recorrencia_id) && !final.caiu_manual && !final.pago
}

/** Marca um gasto (ou um certo) como pago ou não pago. */
export async function definirPago(item: Gasto | Certo, pago: boolean) {
  const gasto = 'chave' in item ? item.gasto : item
  if (gasto) {
    if (gasto.pago === pago) return
    if (ajusteVazio(gasto, { pago })) return repo.excluirGastos([gasto.id])
    return repo.atualizarGasto(gasto.id, { pago })
  }
  if ('chave' in item && item.recorrencia && pago) await repo.criarGastos([ajusteDeRecorrencia(item, { pago: true })])
}
