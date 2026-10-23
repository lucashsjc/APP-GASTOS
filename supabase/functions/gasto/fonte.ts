// Função do Supabase (Edge Function) que o atalho "Gasto" do iPhone chama: recebe uma frase como
// "uber 17", grava o gasto na conta do Lucas e responde com um texto curto de confirmação.
//
// Este é o código-fonte. O arquivo publicado é o index.ts ao lado, gerado com `npm run funcao`
// (junta este arquivo com as regras de src/lib num arquivo só, para colar no painel do Supabase).
//
// Segredos (Supabase → Edge Functions → Secrets):
//   GASTO_SENHA    senha longa que só o atalho conhece (vai no cabeçalho x-senha)
//   GASTO_USUARIO  o ID (UID) do usuário do Lucas em Authentication → Users
// SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY o próprio Supabase já fornece.

import { sugerirCategoria } from '../../../src/lib/categorias'
import { normalizarDescricao } from '../../../src/lib/calculos'
import { hojeSP } from '../../../src/lib/datas'
import { formatarReais } from '../../../src/lib/dinheiro'
import { confirmacao, ehDesfazer, gastosDaFrase, lerFrase } from '../../../src/lib/frase'

declare const Deno: {
  env: { get(nome: string): string | undefined }
  serve(handler: (req: Request) => Response | Promise<Response>): void
}

const URL_BANCO = Deno.env.get('SUPABASE_URL') ?? ''
const CHAVE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const SENHA = Deno.env.get('GASTO_SENHA') ?? ''
const USUARIO = Deno.env.get('GASTO_USUARIO') ?? ''

function texto(corpo: string, status = 200): Response {
  return new Response(corpo, { status, headers: { 'Content-Type': 'text/plain; charset=utf-8' } })
}

/** Compara sem revelar, pelo tempo de resposta, quantos caracteres da senha estão certos. */
function senhaConfere(recebida: string): boolean {
  if (!SENHA || recebida.length !== SENHA.length) return false
  let diferenca = 0
  for (let i = 0; i < SENHA.length; i++) diferenca |= recebida.charCodeAt(i) ^ SENHA.charCodeAt(i)
  return diferenca === 0
}

/** Chamada à API do banco com a chave de serviço (a função grava em nome do Lucas). */
async function banco(caminho: string, init: RequestInit = {}): Promise<unknown> {
  const resposta = await fetch(`${URL_BANCO}/rest/v1/${caminho}`, {
    ...init,
    headers: {
      apikey: CHAVE,
      Authorization: `Bearer ${CHAVE}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
      ...init.headers,
    },
  })
  if (!resposta.ok) throw new Error(`banco ${resposta.status}: ${await resposta.text()}`)
  return resposta.status === 204 ? null : resposta.json()
}

async function lerTexto(req: Request): Promise<string> {
  const corpo = await req.text()
  try {
    const json = JSON.parse(corpo)
    if (typeof json === 'string') return json
    return String(json.texto ?? json.text ?? '')
  } catch {
    return corpo
  }
}

async function desfazer(): Promise<string> {
  const [ultimo] = (await banco(
    `gastos?select=id,descricao,valor_centavos,grupo_id&user_id=eq.${USUARIO}&order=criado_em.desc&limit=1`,
  )) as { id: string; descricao: string; valor_centavos: number; grupo_id: string | null }[]
  if (!ultimo) return 'Nada para desfazer.'
  if (!ultimo.grupo_id) {
    await banco(`gastos?id=eq.${ultimo.id}`, { method: 'DELETE' })
    return `↩️ Apagado: ${ultimo.descricao} · ${formatarReais(ultimo.valor_centavos)}`
  }
  // Compra parcelada: apaga todas as parcelas.
  const filtro = `grupo_id=eq.${ultimo.grupo_id}&user_id=eq.${USUARIO}`
  const parcelas = (await banco(`gastos?select=valor_centavos&${filtro}`)) as { valor_centavos: number }[]
  await banco(`gastos?${filtro}`, { method: 'DELETE' })
  const total = parcelas.reduce((s, p) => s + p.valor_centavos, 0)
  return `↩️ Apagado: ${ultimo.descricao} · ${formatarReais(total)} em ${parcelas.length}x`
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return texto('Use POST.', 405)
  if (!senhaConfere(req.headers.get('x-senha') ?? '')) return texto('❌ Senha do atalho incorreta.', 401)
  if (!URL_BANCO || !CHAVE || !USUARIO) return texto('❌ Falta configurar os segredos da função.', 500)

  try {
    const entrada = (await lerTexto(req)).trim()
    if (ehDesfazer(entrada)) return texto(await desfazer())

    const lido = lerFrase(entrada)
    if (!lido.ok) return texto(`❌ ${lido.erro}`)
    const f = lido.frase

    // Categoria e forma: as da última vez que a mesma descrição foi usada naquele cartão.
    const historico = (await banco(
      `gastos?select=descricao,categoria,forma&user_id=eq.${USUARIO}&aba=eq.${f.aba}&order=data.desc,criado_em.desc&limit=1000`,
    )) as { descricao: string; categoria: string; forma: 'credito' | 'debito' | null }[]
    const anterior = historico.find((g) => normalizarDescricao(g.descricao) === normalizarDescricao(f.descricao))
    const categoria = anterior?.categoria ?? sugerirCategoria(f.descricao)
    const forma = f.forma ?? anterior?.forma ?? 'credito'

    const gastos = gastosDaFrase(f, { data: hojeSP(), categoria, forma, grupoId: crypto.randomUUID() })
    await banco('gastos', { method: 'POST', body: JSON.stringify(gastos.map((g) => ({ ...g, user_id: USUARIO }))) })
    return texto(confirmacao(f, forma, categoria))
  } catch (e) {
    console.error(e)
    return texto('❌ Não deu para gravar agora. Tente de novo.', 500)
  }
})
