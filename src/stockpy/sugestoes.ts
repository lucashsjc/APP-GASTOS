/**
 * Sugestões de categoria para o cadastro do StockPy. Não faz parte do StockPy.py:
 * é só uma ajuda na tela, quem decide a categoria continua sendo quem cadastra.
 */
const REGRAS: [RegExp, string[]][] = [
  [/\b(bone|chapeu|gorro|touca)\b/, ['Vestuário', 'Acessórios']],
  [/\b(camiseta|camisa|blusa|moletom|jaqueta|casaco|calca|bermuda|short|roupa|meia|cueca|vestido|uniforme|jaleco)\b/, ['Vestuário']],
  [/\b(tenis|sapato|chinelo|sandalia|bota)\b/, ['Calçados', 'Vestuário']],
  [/\b(relogio|oculos|pulseira|colar|anel|brinco|carteira|mochila|bolsa|cinto|capinha|pelicula)\b/, ['Acessórios']],
  [/\b(mouse|teclado|pendrive|pen ?drive|hd|ssd|notebook|computador|monitor|webcam|headset|impressora|roteador|cabo usb)\b/, ['Informática', 'Eletrônicos']],
  [/\b(fone|celular|iphone|carregador|cabo|tablet|ipad|tv|caixa de som|smartwatch|controle|videogame|console)\b/, ['Eletrônicos']],
  [/\b(caderno|caneta|lapis|borracha|apontador|regua|cola|tesoura|estojo|agenda|papel|sulfite|marca ?texto|fichario|livro|apostila)\b/, ['Papelaria']],
  [/\b(garrafa|copo|caneca|pote|marmita|panela|prato|talher|toalha|lanterna|guarda[- ]chuva)\b/, ['Utilidades', 'Casa']],
  [/\b(arroz|feijao|macarrao|biscoito|bolacha|chocolate|bala|salgadinho|pao|leite|cafe|acucar|chiclete|doce)\b/, ['Alimentos']],
  [/\b(agua|refrigerante|suco|energetico|cerveja|cha)\b/, ['Bebidas']],
  [/\b(sabonete|shampoo|creme|desodorante|perfume|escova|pasta de dente|papel higienico|absorvente)\b/, ['Higiene e beleza']],
  [/\b(detergente|sabao|desinfetante|esponja|vassoura|rodo|alvejante)\b/, ['Limpeza']],
  [/\b(bola|raquete|halter|corda|luva|chuteira|camisa de time)\b/, ['Esporte']],
  [/\b(boneca|carrinho|lego|brinquedo|quebra[- ]cabeca|pelucia)\b/, ['Brinquedos']],
  [/\b(racao|coleira|petisco|areia de gato)\b/, ['Pet']],
]

function semAcento(texto: string): string {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()
}

/**
 * Até 4 categorias para o produto: primeiro as que combinam com o nome,
 * depois as que já existem no estoque (para não criar "Papelaria" e "papelaria").
 */
export function sugerir_categorias(nome: string, existentes: string[] = []): string[] {
  const texto = semAcento(nome)
  const lista: string[] = []
  if (texto.length >= 2) for (const [regra, cats] of REGRAS) if (regra.test(texto)) lista.push(...cats)
  // Se a categoria sugerida já existe escrita de outro jeito, usa a que já está no estoque.
  const usadas = new Map(existentes.map((c) => [semAcento(c), c]))
  const resultado = lista.map((c) => usadas.get(semAcento(c)) ?? c)
  for (const c of existentes) resultado.push(c)
  const vistos = new Set<string>()
  return resultado.filter((c) => {
    const k = semAcento(c)
    if (!k || vistos.has(k)) return false
    vistos.add(k)
    return true
  }).slice(0, 4)
}
