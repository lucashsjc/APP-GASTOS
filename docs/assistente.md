# Assistente com IA

O botão **✦ IA** no topo do app abre o assistente. Ele responde perguntas sobre os gastos
("quanto gastei com iFood?", "posso comprar um tênis de 300?") e lê a foto ou o print de um
comprovante ou do extrato do Caju para virar gasto (você confere tudo antes de salvar).

Quem responde é o Claude, pela função `assistente` do Supabase. A chave da API fica só nos
segredos do Supabase: nunca vai para o app, para a Vercel nem para o GitHub.

## Como ligar (uma vez)

1. **Chave da API**: em [console.anthropic.com](https://console.anthropic.com) → *API Keys* → *Create Key*.
   Coloque um limite de gasto em *Billing → Limits* (ex.: US$ 5 por mês). A chave começa com `sk-ant-`.
2. **Segredo no Supabase**: no painel do projeto → *Edge Functions → Secrets* → *Add new secret*:
   - `ANTHROPIC_API_KEY` = a chave do passo 1.
   - `GASTO_USUARIO` já existe (o mesmo da função `gasto`): só a sua conta pode usar o assistente.
3. **Publicar a função**: *Edge Functions → Deploy a new function → Via Editor*, nome `assistente`,
   cole o conteúdo de `supabase/functions/assistente/index.ts` e clique em *Deploy*.
   Deixe **Verify JWT** ligado (o app manda o seu login).

Pronto: abra o app, toque em **✦ IA** e pergunte.

## Custo

Cada pergunta manda para o Claude um resumo dos seus dados dos últimos 6 meses. Fica por volta de
alguns centavos de dólar por pergunta (menos quando você faz várias seguidas, pelo cache), e uma
foto custa parecido. O limite de gasto do passo 1 garante que nunca passa do que você definir.
