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
  [/\b(uber|99|gasolina|posto|combustivel|estacionamento|pedagio|onibus|metro)\b/, 'Transporte'],
  [/\b(porto|spotify|icloud|netflix|youtube|amazon prime|academia)\b/, 'Fixos'],
  [/\b(remedio|farmacia|drogaria|consulta|dentista)/, 'Saúde'],
  [/\b(mercado|supermercado|atacadao|assai|emporio|hortifruti|padaria|tauste)\b/, 'Mercado'],
  [
    /\b(lanche|ifood|acai|agua|coca|refri|refrigerante|mango|cafe|pizza|hamburguer|burger|restaurante|cantina|almoco|janta|jantar|sorvete|salgado|pastel|suco|cerveja|chopp|bebida|espetinho|marmita|chocolate|mc ?donalds|bk|subway)\b/,
    'Alimentação',
  ],
  [/\b(gta|jogo|game|steam|playstation|psn|xbox|cinema|show|ingresso|bar|balada)\b/, 'Lazer'],
  [/\b(americanas|shopee|mercado livre|amazon|magalu|tampa|ps5|roupa|tenis|camiseta|bone|capinha|loja|shopping)\b/, 'Compras'],
  [/\b(presente|aniversario)\b/, 'Presentes'],
]

export function sugerirCategoria(descricao: string): string {
  const texto = descricao.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
  return REGRAS.find(([regra]) => regra.test(texto))?.[1] ?? CATEGORIA_PADRAO
}
