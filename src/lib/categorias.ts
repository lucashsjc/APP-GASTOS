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
  { nome: 'Vestuário', cor: '#e9c9f2' },
  { nome: 'Acessórios', cor: '#f2e2b6' },
  { nome: 'Eletrônicos', cor: '#c9d8f6' },
  { nome: 'Educação', cor: '#cdeec0' },
  { nome: 'Casa', cor: '#efd5c4' },
  { nome: 'Beleza', cor: '#f6cfe0' },
  { nome: 'Pets', cor: '#dfe8c4' },
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

// Sugestões de categoria pelo nome do gasto: mais de uma opção para escolher (ex.: "Boné" →
// Vestuário, Acessórios). Aparecem em destaque na hora de escolher a categoria.
const SUGESTOES: [RegExp, string[]][] = [
  [/\b(bone|chapeu|gorro|touca)\b/, ['Vestuário', 'Acessórios']],
  [/\b(camiseta|camisa|blusa|moletom|jaqueta|casaco|calca|bermuda|short|roupa|meia|cueca|vestido|jaleco|uniforme)\b/, ['Vestuário']],
  [/\b(tenis|sapato|chinelo|sandalia|bota)\b/, ['Vestuário', 'Acessórios']],
  [/\b(relogio|oculos|pulseira|colar|anel|brinco|carteira|mochila|bolsa|cinto|capinha|case|pelicula)\b/, ['Acessórios']],
  [/\b(fone|beats|airpods|celular|iphone|carregador|cabo|mouse|teclado|notebook|computador|monitor|ps5|playstation|xbox|controle|tablet|ipad|wi-?fi|roteador|tv|smartwatch|apple)\b/, ['Eletrônicos']],
  [/\b(livro|apostila|curso|xerox|copia|caderno|caneta|lapis|faculdade|univap|mensalidade|material|matricula)\b/, ['Educação']],
  [/\b(movel|cadeira|mesa|cama|travesseiro|lencol|toalha|panela|copo|prato|limpeza|lampada|cortina|decoracao)\b/, ['Casa']],
  [/\b(perfume|shampoo|creme|maquiagem|barbearia|barbeiro|cabelo|corte|desodorante|skincare|hidratante)\b/, ['Beleza']],
  [/\b(racao|pet|petshop|veterinario|vet|cachorro|gato)\b/, ['Pets']],
  [/\b(presente|aniversario|lembranca)\b/, ['Presentes']],
]

/**
 * Até 3 categorias que combinam com o nome do gasto, da mais provável para a menos: as das
 * sugestões e a categoria automática (sem "Outros").
 */
export function sugestoesDeCategoria(descricao: string): string[] {
  const texto = descricao.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()
  if (texto.length < 2) return []
  const lista: string[] = []
  for (const [regra, cats] of SUGESTOES) if (regra.test(texto)) lista.push(...cats)
  lista.push(sugerirCategoria(descricao))
  return [...new Set(lista)].filter((c) => c !== CATEGORIA_PADRAO).slice(0, 3)
}
