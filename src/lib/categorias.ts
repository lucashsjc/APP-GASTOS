// Categorias iniciais (seção 8), cada uma com um ícone e uma cor.

export interface Categoria {
  nome: string
  icone: string
  cor: string
}

export const CATEGORIAS: Categoria[] = [
  { nome: 'Alimentação', icone: '🍔', cor: '#f5b942' },
  { nome: 'Mercado', icone: '🛒', cor: '#3ccf8e' },
  { nome: 'Transporte', icone: '🚗', cor: '#4ea8f5' },
  { nome: 'Compras', icone: '🛍️', cor: '#e46fd1' },
  { nome: 'Fixos', icone: '📌', cor: '#a78bfa' },
  { nome: 'Saúde', icone: '💊', cor: '#f2716b' },
  { nome: 'Lazer', icone: '🎮', cor: '#2ec4c4' },
  { nome: 'Presentes', icone: '🎁', cor: '#f39a4d' },
  { nome: 'Outros', icone: '•', cor: '#8b8b93' },
]

export const CATEGORIA_PADRAO = 'Outros'

export function categoria(nome: string): Categoria {
  return CATEGORIAS.find((c) => c.nome === nome) ?? { nome, icone: '•', cor: '#8b8b93' }
}

// Regras de categoria da importação (seção 9). O que não se encaixa vai para Outros.
const REGRAS: [RegExp, string][] = [
  [/\b(uber|gasolina)\b/, 'Transporte'],
  [/\b(porto|spotify|icloud)\b/, 'Fixos'],
  [/\bremedio/, 'Saúde'],
]

export function sugerirCategoria(descricao: string): string {
  const texto = descricao.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
  return REGRAS.find(([regra]) => regra.test(texto))?.[1] ?? CATEGORIA_PADRAO
}
