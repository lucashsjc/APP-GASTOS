// Operações que mexem em mais de uma linha (aplicam os planos de src/lib/calculos.ts).

import type { Certo, PlanoRecorrencia } from '../lib/calculos'
import { repo } from './repo'
import type { Recorrencia } from './types'

export async function aplicarPlanoRecorrencia(r: Recorrencia, plano: PlanoRecorrencia) {
  if (plano.excluirAjustes.length) await repo.excluirGastos(plano.excluirAjustes)
  if (plano.excluir) await repo.excluirRecorrencia(r.id)
  if (plano.atualizar) await repo.atualizarRecorrencia(r.id, plano.atualizar)
  if (plano.criar) await repo.criarRecorrencia(plano.criar)
}

/** Marca (ou desmarca) à mão um certo como já caído. */
export async function alternarCaiu(c: Certo) {
  if (c.gasto) {
    // Ajuste de "todo mês" desmarcado: some a linha e volta a ocorrência calculada.
    if (c.gasto.recorrencia_id && c.gasto.caiu_manual) return repo.excluirGastos([c.gasto.id])
    return repo.atualizarGasto(c.gasto.id, { caiu_manual: !c.gasto.caiu_manual })
  }
  if (c.recorrencia) {
    await repo.criarGastos([
      {
        aba: c.aba,
        forma: c.forma,
        descricao: c.descricao,
        valor_centavos: c.valor_centavos,
        data: c.data,
        categoria: c.categoria,
        tipo: 'certo_unico',
        recorrencia_id: c.recorrencia.id,
        grupo_id: null,
        parcela_numero: null,
        parcela_total: null,
        caiu_manual: true,
      },
    ])
  }
}
