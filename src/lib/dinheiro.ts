// Dinheiro é sempre um número inteiro de centavos. Nada de ponto flutuante nas contas.

/** R$ 1.019,05 (negativos como −R$ 12,30). */
export function formatarReais(centavos: number): string {
  const { sinal, inteiro, centavos: c } = partesDoValor(centavos)
  return `${sinal}R$ ${inteiro},${c}`
}

/** Partes para mostrar o valor grande com os centavos menores: { sinal: '', inteiro: '1.019', centavos: '05' }. */
export function partesDoValor(centavos: number): { sinal: string; inteiro: string; centavos: string } {
  if (!Number.isInteger(centavos)) throw new Error(`Valor em centavos não inteiro: ${centavos}`)
  const abs = Math.abs(centavos)
  const inteiro = String(Math.floor(abs / 100)).replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return { sinal: centavos < 0 ? '−' : '', inteiro, centavos: String(abs % 100).padStart(2, '0') }
}

/**
 * Lê um valor digitado ("1.019,05", "84,38", "12", "R$ 7,5") e devolve centavos, ou null se não
 * for um valor válido.
 */
export function lerReais(texto: string): number | null {
  const limpo = texto.replace(/R\$|\s/g, '')
  if (!/^\d{1,3}(\.\d{3})*(,\d{1,2})?$|^\d+(,\d{1,2})?$/.test(limpo)) return null
  const [inteiro, decimal = ''] = limpo.replace(/\./g, '').split(',')
  return Number(inteiro) * 100 + Number(decimal.padEnd(2, '0'))
}

/** Converte um número em reais vindo de fora (planilha) para centavos, sem erro de arredondamento. */
export function reaisParaCentavos(reais: number): number {
  // toFixed corrige casos como 1.005 * 100 = 100.49999999999999.
  return Math.round(Number((reais * 100).toFixed(6)))
}

export function somar(valores: number[]): number {
  return valores.reduce((s, v) => s + v, 0)
}
