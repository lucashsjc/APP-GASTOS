// StockPy (Desafio 2 da UNIVAP, Algoritmos e Programação) como app: as mesmas regras do StockPy.py do
// Lucas (github.com/lucashsjc/Programacao-e-Algoritmo-UNIVAP, pasta DESAFIO2), passadas para TypeScript.
// Os nomes das funções seguem os do Python. Testes em regras.test.ts.

export const PERIODOS = ['Manhã', 'Tarde', 'Noite', 'Madrugada'] as const

export interface Produto {
  codigo: number
  nome: string
  categoria: string
  preco: number
  quantidade: number
  minimo: number
  vendidos: number
}

export interface Venda {
  codigo: number
  nome: string
  categoria: string
  quantidade: number
  preco: number
  valor: number
  /** 0 = manhã … 3 = madrugada. */
  periodo: number
}

export interface Estado {
  produtos: Produto[]
  vendas: Venda[]
  faturamento_total: number
  total_operacoes: number
  total_unidades_vendidas: number
}

export const ESTADO_VAZIO: Estado = { produtos: [], vendas: [], faturamento_total: 0, total_operacoes: 0, total_unidades_vendidas: 0 }

/** R$ 1.234,56 */
export function formatar_moeda(valor: number): string {
  return 'R$ ' + valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

// ---------- Etapa 1 ----------

/** Busca convencional (com for) pelo código. */
export function buscar_produto(lista: Produto[], codigo: number): Produto | null {
  for (const produto of lista) if (produto.codigo === codigo) return produto
  return null
}

export function verificar_estoque(p: Produto): 'Sem estoque' | 'Estoque baixo' | 'Estoque adequado' {
  if (p.quantidade === 0) return 'Sem estoque'
  if (p.quantidade <= p.minimo) return 'Estoque baixo'
  return 'Estoque adequado'
}

/** Erro (texto) ou null se deu certo. */
export type Resultado = string | null

export function cadastrar_produto(e: Estado, p: Omit<Produto, 'vendidos'>): Resultado {
  if (!Number.isInteger(p.codigo)) return 'Digite um código inteiro válido.'
  if (buscar_produto(e.produtos, p.codigo)) return 'Já existe um produto com esse código. Cadastro cancelado.'
  if (!p.nome.trim()) return 'O nome é obrigatório.'
  if (!p.categoria.trim()) return 'A categoria é obrigatória.'
  if (!(p.preco > 0)) return 'O preço deve ser maior que zero.'
  if (!Number.isInteger(p.quantidade) || p.quantidade < 0) return 'A quantidade inicial deve ser um inteiro maior ou igual a 0.'
  if (!Number.isInteger(p.minimo) || p.minimo < 0) return 'O estoque mínimo deve ser um inteiro maior ou igual a 0.'
  e.produtos.push({ ...p, nome: p.nome.trim(), categoria: p.categoria.trim(), vendidos: 0 })
  return null
}

export function registrar_entrada(e: Estado, codigo: number, quantidade: number): Resultado {
  const produto = buscar_produto(e.produtos, codigo)
  if (!produto) return 'Produto não encontrado.'
  if (!Number.isInteger(quantidade) || quantidade <= 0) return 'A quantidade deve ser um inteiro positivo. Operação rejeitada.'
  produto.quantidade += quantidade
  return null
}

export function registrar_venda(e: Estado, codigo: number, quantidade: number, periodo: number): Resultado {
  const produto = buscar_produto(e.produtos, codigo)
  if (!produto) return 'Produto não encontrado. Venda não realizada.'
  if (!Number.isInteger(quantidade) || quantidade <= 0) return 'A quantidade deve ser um inteiro positivo.'
  if (quantidade > produto.quantidade) return `Estoque insuficiente (disponível: ${produto.quantidade}).`
  if (periodo < 0 || periodo > 3) return 'Escolha um período entre 1 e 4.'
  const valor = produto.preco * quantidade
  produto.quantidade -= quantidade
  produto.vendidos += quantidade
  e.faturamento_total += valor
  e.total_unidades_vendidas += quantidade
  e.total_operacoes += 1
  e.vendas.push({ codigo: produto.codigo, nome: produto.nome, categoria: produto.categoria, quantidade, preco: produto.preco, valor, periodo })
  return null
}

export function produtos_em_alerta(lista: Produto[]): Produto[] {
  return lista.filter((p) => p.quantidade <= p.minimo)
}

/** Faturamento / operações, ou null sem vendas (evita divisão por zero). */
export function calcular_ticket_medio(faturamento: number, operacoes: number): number | null {
  return operacoes === 0 ? null : faturamento / operacoes
}

// ---------- Etapa 2 ----------

export function alterar_produto(
  e: Estado,
  codigo: number,
  campos: Partial<Pick<Produto, 'nome' | 'categoria' | 'preco' | 'minimo'>>,
): Resultado {
  const produto = buscar_produto(e.produtos, codigo)
  if (!produto) return 'Produto não encontrado.'
  if (campos.nome !== undefined && !campos.nome.trim()) return 'O nome é obrigatório.'
  if (campos.categoria !== undefined && !campos.categoria.trim()) return 'A categoria é obrigatória.'
  if (campos.preco !== undefined && !(campos.preco > 0)) return 'O preço deve ser maior que zero.'
  if (campos.minimo !== undefined && (!Number.isInteger(campos.minimo) || campos.minimo < 0)) return 'O estoque mínimo deve ser ≥ 0.'
  Object.assign(produto, campos)
  return null
}

export function excluir_produto(e: Estado, codigo: number): Resultado {
  const produto = buscar_produto(e.produtos, codigo)
  if (!produto) return 'Produto não encontrado.'
  if (produto.vendidos > 0) return 'Produto possui histórico de vendas e não pode ser excluído.'
  e.produtos.splice(e.produtos.indexOf(produto), 1)
  return null
}

/** Linha i = produto i; coluna j = período j. */
export function gerar_matriz_vendas(lista: Produto[], historico: Venda[]): number[][] {
  const matriz = lista.map(() => [0, 0, 0, 0])
  for (const venda of historico) {
    for (let i = 0; i < lista.length; i++) if (lista[i].codigo === venda.codigo) matriz[i][venda.periodo] += venda.quantidade
  }
  return matriz
}

export function totais_por_periodo(matriz: number[][]): number[] {
  const totais = [0, 0, 0, 0]
  for (const linha of matriz) for (let j = 0; j < 4; j++) totais[j] += linha[j]
  return totais
}

export function faturamento_do_produto(vendas: Venda[], codigo: number): number {
  let total = 0
  for (const v of vendas) if (v.codigo === codigo) total += v.valor
  return total
}

const antesNome = (a: Produto, b: Produto) => a.nome.toLowerCase() < b.nome.toLowerCase()

export function produto_mais_vendido(lista: Produto[]): Produto | null {
  let melhor: Produto | null = null
  for (const p of lista) {
    if (p.vendidos > 0 && (!melhor || p.vendidos > melhor.vendidos || (p.vendidos === melhor.vendidos && antesNome(p, melhor)))) melhor = p
  }
  return melhor
}

export function produto_menos_vendido(lista: Produto[]): Produto | null {
  let pior: Produto | null = null
  for (const p of lista) {
    if (p.vendidos > 0 && (!pior || p.vendidos < pior.vendidos || (p.vendidos === pior.vendidos && antesNome(p, pior)))) pior = p
  }
  return pior
}

export function calcular_valor_estoque(lista: Produto[]): number {
  let total = 0
  for (const p of lista) total += p.preco * p.quantidade
  return total
}

/** Mais unidades vendidas primeiro; empate: nome em ordem alfabética. */
export function vem_antes(a: Produto, b: Produto): boolean {
  if (a.vendidos !== b.vendidos) return a.vendidos > b.vendidos
  return antesNome(a, b)
}

/** Ordenação por inserção sobre uma cópia (não muda a ordem do cadastro). */
export function ordenar_ranking(lista: Produto[]): Produto[] {
  const ordenada = [...lista]
  for (let i = 1; i < ordenada.length; i++) {
    const atual = ordenada[i]
    let j = i - 1
    while (j >= 0 && vem_antes(atual, ordenada[j])) {
      ordenada[j + 1] = ordenada[j]
      j--
    }
    ordenada[j + 1] = atual
  }
  return ordenada
}

/** Busca recursiva (sem for/while). Também devolve quantas chamadas fez, para mostrar no app. */
export function buscar_produto_recursivo(lista: Produto[], codigo: number, indice = 0, chamadas = 1): { produto: Produto | null; chamadas: number } {
  if (indice >= lista.length) return { produto: null, chamadas }
  if (lista[indice].codigo === codigo) return { produto: lista[indice], chamadas }
  return buscar_produto_recursivo(lista, codigo, indice + 1, chamadas + 1)
}

/** Soma recursiva de preço × quantidade (sem for/while). */
export function calcular_valor_estoque_recursivo(lista: Produto[], indice = 0): number {
  if (indice >= lista.length) return 0
  const p = lista[indice]
  return p.preco * p.quantidade + calcular_valor_estoque_recursivo(lista, indice + 1)
}

export interface Relatorio {
  produtos: number
  categorias: number
  unidadesDisponiveis: number
  unidadesVendidas: number
  operacoes: number
  faturamento: number
  ticket: number | null
  valorEstoque: number
  emAlerta: number
  maisVendido: Produto | null
  menosVendido: Produto | null
  maiorVenda: Venda | null
  menorVenda: Venda | null
  maiorFaturamento: { produto: Produto; valor: number } | null
  melhorCategoria: { categoria: string; valor: number } | null
  melhorPeriodo: { periodo: number; unidades: number } | null
}

/** Os números do resumo, da análise estatística e do relatório consolidado, num lugar só. */
export function relatorio_consolidado(e: Estado): Relatorio {
  const lista = e.produtos
  const categorias = new Set(lista.map((p) => p.categoria))
  let maiorVenda: Venda | null = null
  let menorVenda: Venda | null = null
  for (const v of e.vendas) {
    if (!maiorVenda || v.valor > maiorVenda.valor) maiorVenda = v
    if (!menorVenda || v.valor < menorVenda.valor) menorVenda = v
  }
  let maiorFaturamento: Relatorio['maiorFaturamento'] = null
  for (const p of lista) {
    const valor = faturamento_do_produto(e.vendas, p.codigo)
    if (valor > 0 && (!maiorFaturamento || valor > maiorFaturamento.valor || (valor === maiorFaturamento.valor && antesNome(p, maiorFaturamento.produto)))) {
      maiorFaturamento = { produto: p, valor }
    }
  }
  const porCategoria = new Map<string, number>()
  for (const v of e.vendas) porCategoria.set(v.categoria, (porCategoria.get(v.categoria) ?? 0) + v.valor)
  let melhorCategoria: Relatorio['melhorCategoria'] = null
  for (const [categoria, valor] of porCategoria) {
    if (!melhorCategoria || valor > melhorCategoria.valor || (valor === melhorCategoria.valor && categoria.toLowerCase() < melhorCategoria.categoria.toLowerCase())) {
      melhorCategoria = { categoria, valor }
    }
  }
  let melhorPeriodo: Relatorio['melhorPeriodo'] = null
  if (e.vendas.length) {
    const totais = totais_por_periodo(gerar_matriz_vendas(lista, e.vendas))
    let j = 0
    for (let k = 1; k < 4; k++) if (totais[k] > totais[j]) j = k
    melhorPeriodo = { periodo: j, unidades: totais[j] }
  }
  return {
    produtos: lista.length,
    categorias: categorias.size,
    unidadesDisponiveis: lista.reduce((s, p) => s + p.quantidade, 0),
    unidadesVendidas: e.total_unidades_vendidas,
    operacoes: e.total_operacoes,
    faturamento: e.faturamento_total,
    ticket: calcular_ticket_medio(e.faturamento_total, e.total_operacoes),
    valorEstoque: calcular_valor_estoque_recursivo(lista),
    emAlerta: produtos_em_alerta(lista).length,
    maisVendido: produto_mais_vendido(lista),
    menosVendido: produto_menos_vendido(lista),
    maiorVenda,
    menorVenda,
    maiorFaturamento,
    melhorCategoria,
    melhorPeriodo,
  }
}

/** Uma loja de exemplo, para ver o app funcionando sem cadastrar tudo. */
export function exemploStockPy(): Estado {
  const e: Estado = structuredClone(ESTADO_VAZIO)
  cadastrar_produto(e, { codigo: 101, nome: 'Caderno 10 matérias', categoria: 'Papelaria', preco: 32.9, quantidade: 40, minimo: 10 })
  cadastrar_produto(e, { codigo: 102, nome: 'Caneta azul', categoria: 'Papelaria', preco: 2.5, quantidade: 120, minimo: 30 })
  cadastrar_produto(e, { codigo: 201, nome: 'Mouse sem fio', categoria: 'Informática', preco: 79.9, quantidade: 8, minimo: 5 })
  cadastrar_produto(e, { codigo: 202, nome: 'Pendrive 64GB', categoria: 'Informática', preco: 45, quantidade: 3, minimo: 5 })
  cadastrar_produto(e, { codigo: 301, nome: 'Garrafa térmica', categoria: 'Utilidades', preco: 59.9, quantidade: 0, minimo: 2 })
  registrar_venda(e, 101, 5, 0)
  registrar_venda(e, 102, 30, 1)
  registrar_venda(e, 201, 2, 2)
  registrar_venda(e, 102, 10, 0)
  registrar_venda(e, 202, 1, 3)
  return e
}
