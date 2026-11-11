import { describe, expect, it } from 'vitest'
import { dadosDeExemplo } from '../data/exemplo'
import { contextoParaIA, limparGastosLidos } from './assistente'

describe('contextoParaIA', () => {
  const hoje = '2026-11-11'
  const texto = contextoParaIA(dadosDeExemplo(hoje), hoje)

  it('traz o mês atual, o ritmo e a lista de gastos', () => {
    expect(texto).toContain('Hoje: 2026-11-11')
    expect(texto).toContain('Nubank: recebido')
    expect(texto).toContain('Caju: saldo')
    expect(texto).toContain('## Gastos dos últimos 6 meses')
    expect(texto).toMatch(/2026-11 \| 2026-11-\d\d \| .* \| Caju \|/)
  })

  it('não inclui ids nem dados de conta', () => {
    expect(texto).not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}-/)
    expect(texto).not.toContain('user_id')
  })
})

describe('limparGastosLidos', () => {
  it('fica só com o que tem descrição e valor e limpa data e hora inválidas', () => {
    expect(
      limparGastosLidos([
        { descricao: ' Padaria ', valor_centavos: 1250, data: '2026-11-10', hora: '08:15', aba: 'caju', carteira: 'refeicao' },
        { descricao: 'Uber', valor_centavos: 2390.4, data: '10/11', hora: '25:00', aba: 'x', carteira: '' },
        { descricao: '', valor_centavos: 100 },
        { descricao: 'Nada', valor_centavos: 0 },
        'lixo',
      ]),
    ).toEqual([
      { descricao: 'Padaria', valor_centavos: 1250, data: '2026-11-10', hora: '08:15', aba: 'caju', carteira: 'refeicao' },
      { descricao: 'Uber', valor_centavos: 2390, data: '', hora: '', aba: '', carteira: '' },
    ])
    expect(limparGastosLidos(null)).toEqual([])
  })
})
