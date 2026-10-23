import { describe, expect, it } from 'vitest'
import { confirmacao, ehDesfazer, gastosDaFrase, lerFrase } from './frase'

const ler = (t: string) => {
  const r = lerFrase(t)
  if (!r.ok) throw new Error(r.erro)
  return r.frase
}

describe('registrar com uma frase', () => {
  it('descrição e valor, no Nubank por padrão', () => {
    expect(ler('uber 17')).toEqual({ descricao: 'Uber', valor_centavos: 1700, aba: 'nubank', forma: null, parcelas: 1 })
    expect(ler('Mercado 85,90')).toMatchObject({ descricao: 'Mercado', valor_centavos: 8590 })
  })

  it('aceita o jeito falado (ditado da Siri)', () => {
    expect(ler('17 reais de uber')).toMatchObject({ descricao: 'Uber', valor_centavos: 1700 })
    expect(ler('gastei 42,50 no ifood')).toMatchObject({ descricao: 'Ifood', valor_centavos: 4250 })
    expect(ler('R$17,90 lanche')).toMatchObject({ descricao: 'Lanche', valor_centavos: 1790 })
    expect(ler('pizza 32.50')).toMatchObject({ descricao: 'Pizza', valor_centavos: 3250 })
    expect(ler('presente da ana 1.200,00')).toMatchObject({ descricao: 'Presente da ana', valor_centavos: 120000 })
    expect(ler('pão de queijo 8')).toMatchObject({ descricao: 'Pão de queijo', valor_centavos: 800 })
    expect(ler('uber 17 reais')).toMatchObject({ descricao: 'Uber', valor_centavos: 1700 })
  })

  it('cartão e forma', () => {
    expect(ler('mercado 85,90 caju')).toMatchObject({ aba: 'caju', forma: null })
    expect(ler('ifood 42 débito')).toMatchObject({ aba: 'nubank', forma: 'debito' })
    expect(ler('gasolina 50 credito')).toMatchObject({ forma: 'credito' })
    // No Caju não existe crédito/débito.
    expect(ler('restaurante 30 caju debito')).toMatchObject({ aba: 'caju', forma: null })
  })

  it('parcelas', () => {
    expect(ler('tênis 300 em 3x')).toMatchObject({ descricao: 'Tênis', valor_centavos: 30000, parcelas: 3 })
    expect(ler('fone 250 10 vezes')).toMatchObject({ descricao: 'Fone', parcelas: 10 })
    expect(ler('celular 2.400 em 12 parcelas')).toMatchObject({ valor_centavos: 240000, parcelas: 12 })
  })

  it('números no meio da descrição não viram valor depois do primeiro', () => {
    expect(ler('tampa ps5 84,38')).toMatchObject({ descricao: 'Tampa ps5', valor_centavos: 8438 })
  })

  it('erros com exemplo', () => {
    expect(lerFrase('uber')).toMatchObject({ ok: false })
    expect(lerFrase('17')).toMatchObject({ ok: false })
    expect(lerFrase('')).toMatchObject({ ok: false })
    expect(lerFrase('uber 0')).toMatchObject({ ok: false })
  })

  it('monta o gasto e as parcelas', () => {
    const extras = { data: '2026-10-23', categoria: 'Compras', forma: 'credito' as const, grupoId: 'g' }
    expect(gastosDaFrase(ler('uber 17'), extras)).toEqual([
      expect.objectContaining({ descricao: 'Uber', valor_centavos: 1700, tipo: 'unico', forma: 'credito', data: '2026-10-23' }),
    ])
    const parcelas = gastosDaFrase(ler('tênis 100 em 3x'), extras)
    expect(parcelas.map((p) => [p.valor_centavos, p.data, p.parcela_numero])).toEqual([
      [3334, '2026-10-23', 1],
      [3333, '2026-11-23', 2],
      [3333, '2026-12-23', 3],
    ])
    expect(gastosDaFrase(ler('mercado 50 caju'), extras)[0].forma).toBeNull()
  })

  it('confirmação curta', () => {
    expect(confirmacao(ler('uber 17'), 'credito', 'Transporte')).toBe('✅ Uber · R$ 17,00 · Nubank crédito · Transporte')
    expect(confirmacao(ler('mercado 85,90 caju'), 'credito', 'Mercado')).toBe('✅ Mercado · R$ 85,90 · Caju · Mercado')
    expect(confirmacao(ler('tênis 300 3x'), 'debito', 'Compras')).toBe('✅ Tênis · R$ 300,00 em 3x · Nubank débito · Compras')
  })

  it('desfazer', () => {
    expect(ehDesfazer('desfazer')).toBe(true)
    expect(ehDesfazer('Apagar o último')).toBe(true)
    expect(ehDesfazer('uber 17')).toBe(false)
  })
})
