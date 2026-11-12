// Avisos de dinheiro da tela Hoje: limite perto ou estourado, gasto acima do ritmo, meta do cofrinho e
// o recebido / depósito do mês que ainda não foi colocado. Testes em avisos.test.ts.

import type { Aba, Dados } from '../data/types'
import { depositosDoMes, recebidoDoMes } from './calculos'
import { resumoCofrinho } from './cofrinho'
import { diaDe, diasNoMes, mesDe } from './datas'
import { formatarReais } from './dinheiro'
import { usoDosLimites } from './extras'
import { ritmoDoMes } from './ritmo'

export interface AvisoDinheiro {
  chave: string
  titulo: string
  texto: string
  /** Para onde o toque leva. */
  rota: string
  grave: boolean
}

const NOME: Record<Aba, string> = { nubank: 'Nubank', caju: 'Caju' }

export function avisosDinheiro(dados: Dados, hoje: string): AvisoDinheiro[] {
  const mes = mesDe(hoje)
  const avisos: AvisoDinheiro[] = []

  if (recebidoDoMes(dados, mes) <= 0) {
    avisos.push({ chave: 'recebido', titulo: 'Nubank', texto: 'Coloque o recebido do mês para ver o livre para gastar', rota: '/nubank/detalhes', grave: false })
  }
  if (depositosDoMes(dados, mes).length === 0) {
    avisos.push({ chave: 'deposito', titulo: 'Caju', texto: 'Registre o depósito do Caju deste mês', rota: '/caju/detalhes', grave: false })
  }

  for (const aba of ['nubank', 'caju'] as Aba[]) {
    for (const u of usoDosLimites(dados, aba, mes, hoje)) {
      if (u.situacao === 'ok') continue
      avisos.push({
        chave: `limite-${aba}-${u.limite.categoria}`,
        titulo: `${u.limite.categoria} · ${NOME[aba]}`,
        texto:
          u.situacao === 'passou'
            ? `Passou ${formatarReais(-u.restante)} do limite de ${formatarReais(u.limite.valor_centavos)}`
            : `Restam ${formatarReais(u.restante)} do limite de ${formatarReais(u.limite.valor_centavos)}`,
        rota: `/${aba}/detalhes`,
        grave: u.situacao === 'passou',
      })
    }
    const r = ritmoDoMes(dados, aba, mes, hoje)
    // Só avisa a partir do 5º dia (no começo do mês, uma compra maior já passa do ritmo).
    if (r && r.delta > 0 && r.diaAtual >= 5) {
      avisos.push({
        chave: `ritmo-${aba}`,
        titulo: `Ritmo do ${NOME[aba]}`,
        texto:
          r.porDiaDaqui === null
            ? 'O dinheiro do dia a dia deste mês acabou'
            : `${formatarReais(r.delta)} acima do ritmo · até ${formatarReais(r.porDiaDaqui)}/dia daqui pra frente`,
        rota: `/${aba}/detalhes`,
        grave: r.porDiaDaqui === null,
      })
    }
  }

  // Meta do cofrinho: lembra nos últimos 10 dias do mês, se ainda não guardou tudo.
  const cofre = resumoCofrinho(dados, hoje, 0)
  if (cofre.meta && cofre.noMes < cofre.meta && diasNoMes(mes) - diaDe(hoje) < 10) {
    avisos.push({
      chave: 'cofrinho',
      titulo: 'Cofrinho',
      texto: `Faltam ${formatarReais(cofre.meta - Math.max(0, cofre.noMes))} para a meta de guardar deste mês`,
      rota: '/cofrinho',
      grave: false,
    })
  }

  return avisos.sort((a, b) => Number(b.grave) - Number(a.grave))
}
