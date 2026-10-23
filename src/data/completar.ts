// Preenche os campos opcionais de um gasto ou recorrência novos com os valores padrão.

import type { Gasto, NovaRecorrencia, NovoGasto, Recorrencia } from './types'

export function completarGasto(g: NovoGasto, id: string): Gasto {
  return { ...g, id, pago: g.pago ?? false, observacao: g.observacao ?? '', separado: g.separado ?? false }
}

export function completarRecorrencia(r: NovaRecorrencia, id: string): Recorrencia {
  return { ...r, id, observacao: r.observacao ?? '', separado: r.separado ?? false }
}
