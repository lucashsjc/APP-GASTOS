// Função do Supabase (Edge Function) do assistente com IA do app: responde perguntas sobre os gastos
// ("quanto gastei com iFood?", "posso comprar um tênis de 300?") e lê fotos de comprovantes ou do
// extrato do Caju para virar gasto. Arquivo único: cole no painel do Supabase como está.
//
// Segredos (Supabase → Edge Functions → Secrets):
//   ANTHROPIC_API_KEY  a chave da API do Claude (console.anthropic.com). Nunca vai para o app nem para o GitHub.
//   GASTO_USUARIO      o ID (UID) do usuário do Lucas (o mesmo da função "gasto"): só ele pode usar.
// SUPABASE_URL e SUPABASE_ANON_KEY o próprio Supabase já fornece.

import Anthropic from 'npm:@anthropic-ai/sdk@1.8.0'

declare const Deno: {
  env: { get(nome: string): string | undefined }
  serve(handler: (req: Request) => Response | Promise<Response>): void
}

const MODELO = 'claude-opus-5-5'
const URL_BANCO = Deno.env.get('SUPABASE_URL') ?? ''
const CHAVE_PUBLICA = Deno.env.get('SUPABASE_ANON_KEY') ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const USUARIO = Deno.env.get('GASTO_USUARIO') ?? ''

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(corpo: unknown, status = 200): Response {
  return new Response(JSON.stringify(corpo), { status, headers: { ...CORS, 'Content-Type': 'application/json; charset=utf-8' } })
}

/** Confere o login de quem chamou (o token do app) e se é o Lucas. */
async function usuarioDoPedido(req: Request): Promise<string | null> {
  const auth = req.headers.get('Authorization') ?? ''
  if (!auth.startsWith('Bearer ')) return null
  const r = await fetch(`${URL_BANCO}/auth/v1/user`, { headers: { apikey: CHAVE_PUBLICA, Authorization: auth } })
  if (!r.ok) return null
  const u = (await r.json()) as { id?: string }
  if (!u.id) return null
  if (USUARIO && u.id !== USUARIO) return null
  return u.id
}

const INSTRUCOES_CHAT = `Você é o assistente do app "Minha rotina" do Lucas, que controla os gastos dele no Nubank (cartão, crédito e débito, com o recebido do mês) e no Caju (vale com as carteiras refeição e mobilidade, depositado no fim do mês para valer no mês seguinte).

Responda em português do Brasil, curto e direto, como numa conversa de celular: uma a quatro frases, ou uma lista curta quando ajudar. Valores sempre em reais no formato R$ 1.234,56. Use só os dados abaixo; some e compare com cuidado, e diga quando algo não está nos dados em vez de inventar.

Como as contas do app funcionam:
- Nubank "livre" = recebido do mês − fixos e parcelas − outros gastos − gastos à parte. Gastos "pagos com dinheiro à parte" ficam fora das contas.
- Caju: o saldo é só o dinheiro do mês (não acumula de um mês para o outro). Transporte sai da carteira mobilidade; o resto, de refeição.
- "Ritmo": o dinheiro do dia a dia (sem fixos e parcelas) dividido igualmente pelos dias do mês.

Para "posso comprar X?": diga se cabe no livre (Nubank) ou no saldo (Caju), quanto sobra e quanto passa a dar por dia até o fim do mês; numa compra parcelada no Nubank, conte só a parcela deste mês e lembre das próximas. Se o Lucas não disser o cartão, considere o Nubank e cite o Caju se for comida ou transporte.`

const INSTRUCOES_FOTO = `Você lê fotos e prints de comprovantes, notas fiscais, notificações de compra e extratos (Nubank ou Caju) e devolve os gastos que aparecem nela, para o Lucas lançar no app dele.

Para cada compra: descrição curta e reconhecível (o nome do estabelecimento, como o Lucas escreveria: "iFood", "Uber", "Padaria Pão Quente"), valor em centavos (R$ 12,50 → 1250), data AAAA-MM-DD e hora HH:MM se aparecerem (senão ""), cartão ("caju" se for um extrato ou comprovante do Caju, "nubank" se for do Nubank, senão "") e, no Caju, a carteira ("mobilidade" para transporte, "refeicao" para comida, senão "").
Ignore depósitos, estornos, saldos e totais: só compras. Se o ano não aparecer, use o ano da data de hoje informada. Se não houver nenhuma compra legível, devolva a lista vazia.`

const ESQUEMA_FOTO = {
  type: 'object',
  properties: {
    gastos: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          descricao: { type: 'string' },
          valor_centavos: { type: 'integer' },
          data: { type: 'string' },
          hora: { type: 'string' },
          aba: { type: 'string', enum: ['nubank', 'caju', ''] },
          carteira: { type: 'string', enum: ['refeicao', 'mobilidade', ''] },
        },
        required: ['descricao', 'valor_centavos', 'data', 'hora', 'aba', 'carteira'],
        additionalProperties: false,
      },
    },
  },
  required: ['gastos'],
  additionalProperties: false,
}

interface Mensagem {
  papel: 'usuario' | 'assistente'
  texto: string
}

const TIPOS_IMAGEM = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'] as const
type TipoImagem = (typeof TIPOS_IMAGEM)[number]

const cliente = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY') ?? '' })

function textoDa(resposta: Anthropic.Beta.BetaMessage): string {
  return resposta.content
    .map((b) => (b.type === 'text' ? b.text : ''))
    .join('')
    .trim()
}

async function conversar(contexto: string, mensagens: Mensagem[]): Promise<string> {
  const resposta = await cliente.beta.messages.create({
    model: MODELO,
    max_tokens: 4000,
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    output_config: { effort: 'low' },
    system: [
      { type: 'text', text: INSTRUCOES_CHAT },
      { type: 'text', text: `Dados do Lucas:\n\n${contexto}`, cache_control: { type: 'ephemeral' } },
    ],
    messages: mensagens.map((m) => ({ role: m.papel === 'usuario' ? 'user' : 'assistant', content: m.texto })),
  })
  if (resposta.stop_reason === 'refusal') return 'Não consegui responder essa. Tente perguntar de outro jeito.'
  return textoDa(resposta) || 'Não consegui responder agora.'
}

async function lerFoto(hoje: string, tipo: TipoImagem, base64: string): Promise<unknown[]> {
  const resposta = await cliente.beta.messages.create({
    model: MODELO,
    max_tokens: 4000,
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    output_config: { effort: 'low', format: { type: 'json_schema', schema: ESQUEMA_FOTO } },
    system: INSTRUCOES_FOTO,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: tipo, data: base64 } },
          { type: 'text', text: `Hoje é ${hoje}. Quais compras aparecem nesta imagem?` },
        ],
      },
    ],
  })
  if (resposta.stop_reason === 'refusal' || resposta.stop_reason === 'max_tokens') return []
  try {
    const lido = JSON.parse(textoDa(resposta)) as { gastos?: unknown[] }
    return Array.isArray(lido.gastos) ? lido.gastos : []
  } catch {
    return []
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return json({ erro: 'Use POST.' }, 405)
  if (!Deno.env.get('ANTHROPIC_API_KEY')) return json({ erro: 'Falta o segredo ANTHROPIC_API_KEY no Supabase.' }, 500)
  if (!(await usuarioDoPedido(req))) return json({ erro: 'Entre no app para usar o assistente.' }, 401)

  let corpo: Record<string, unknown>
  try {
    corpo = await req.json()
  } catch {
    return json({ erro: 'Pedido inválido.' }, 400)
  }

  try {
    if (corpo.modo === 'foto') {
      const imagem = corpo.imagem as { tipo?: string; base64?: string } | undefined
      const tipo = TIPOS_IMAGEM.find((t) => t === imagem?.tipo)
      const base64 = typeof imagem?.base64 === 'string' ? imagem.base64 : ''
      if (!tipo || !base64 || base64.length > 8_000_000) return json({ erro: 'Imagem inválida ou grande demais.' }, 400)
      const hoje = typeof corpo.hoje === 'string' ? corpo.hoje.slice(0, 10) : new Date().toISOString().slice(0, 10)
      return json({ gastos: await lerFoto(hoje, tipo, base64) })
    }

    const contexto = typeof corpo.contexto === 'string' ? corpo.contexto.slice(0, 400_000) : ''
    const mensagens = (Array.isArray(corpo.mensagens) ? corpo.mensagens : [])
      .filter(
        (m): m is Mensagem =>
          !!m && (m.papel === 'usuario' || m.papel === 'assistente') && typeof m.texto === 'string' && m.texto.trim() !== '',
      )
      .slice(-20)
      .map((m) => ({ papel: m.papel, texto: m.texto.slice(0, 4000) }))
    // A conversa precisa começar com o Lucas e terminar com uma pergunta dele.
    while (mensagens.length && mensagens[0].papel !== 'usuario') mensagens.shift()
    if (!mensagens.length || mensagens[mensagens.length - 1].papel !== 'usuario') return json({ erro: 'Faça uma pergunta.' }, 400)
    return json({ resposta: await conversar(contexto, mensagens) })
  } catch (e) {
    if (e instanceof Anthropic.RateLimitError) return json({ erro: 'Muitas perguntas seguidas. Espere um pouco.' }, 429)
    if (e instanceof Anthropic.AuthenticationError) return json({ erro: 'A chave ANTHROPIC_API_KEY do Supabase não vale.' }, 500)
    if (e instanceof Anthropic.APIError) return json({ erro: `A IA não respondeu (${e.status}).` }, 502)
    return json({ erro: 'A IA não respondeu. Tente de novo.' }, 502)
  }
})
