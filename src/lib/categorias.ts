// Categorias iniciais (seção 8). Cada uma tem um ícone (IconeCategoria, pelo nome) e uma cor
// pastel, usada nos gráficos.

export interface Categoria {
  nome: string
  cor: string
}

export const CATEGORIAS: Categoria[] = [
  { nome: 'Alimentação', cor: '#f3d9a8' },
  { nome: 'Mercado', cor: '#bfe6cf' },
  { nome: 'Transporte', cor: '#cfe7f8' },
  { nome: 'Compras', cor: '#f1d0e6' },
  { nome: 'Fixos', cor: '#dcd2f6' },
  { nome: 'Saúde', cor: '#f5cbc6' },
  { nome: 'Lazer', cor: '#c6ecea' },
  { nome: 'Presentes', cor: '#f6dcc6' },
  { nome: 'Outros', cor: '#d6d6db' },
]

export const CATEGORIA_PADRAO = 'Outros'

export function categoria(nome: string): Categoria {
  return CATEGORIAS.find((c) => c.nome === nome) ?? { nome, cor: '#d6d6db' }
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
