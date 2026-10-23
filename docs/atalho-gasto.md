# Atalho "Gasto": registrar um gasto com uma frase

Segure o **Botão de Ação** do iPhone (ou diga "E aí Siri, gasto"), digite **uber 17** e pronto: o
gasto aparece no app, com a resposta "✅ Uber · R$ 17,00 · Nubank crédito · Transporte".

## O que dá para escrever

| Frase | Vira |
| --- | --- |
| `uber 17` | Uber, R$ 17,00, Nubank, crédito |
| `mercado 85,90 caju` | Mercado, R$ 85,90, Caju |
| `ifood 42 débito` | iFood, R$ 42,00, Nubank, débito |
| `tênis 300 em 3x` | Tênis, R$ 300,00 em 3 parcelas |
| `17 reais de uber` | também funciona (jeito falado) |
| `desfazer` | apaga o último gasto registrado |

A categoria e a forma (crédito ou débito) são as da última vez que você usou a mesma descrição.
Sem histórico, a categoria vem das regras do app (Uber → Transporte…) e a forma é crédito.

## Como funciona

```
Atalho no iPhone ──(frase + senha)──▶ Função "gasto" no Supabase ──▶ tabela gastos
```

A função ([`supabase/functions/gasto`](../supabase/functions/gasto)) confere uma senha que só o
atalho conhece, entende a frase com as mesmas regras do app ([`src/lib/frase.ts`](../src/lib/frase.ts),
com testes) e grava o gasto na conta do dono.

## 1. Publicar a função no Supabase (uma vez, no computador)

1. No Supabase, abra o projeto e vá em **Edge Functions → Deploy a new function → Via Editor**.
2. Nome da função: **`gasto`**.
3. Apague o código de exemplo e cole todo o conteúdo de
   [`supabase/functions/gasto/index.ts`](../supabase/functions/gasto/index.ts) (no GitHub, botão
   **Raw** → selecionar tudo → copiar). Clique em **Deploy**.
4. Na página da função, em **Details** (ou **Settings**), **desligue "Verify JWT"** e salve.
   O atalho se identifica pela senha do passo 5, e não pelo login do app.
5. Vá em **Edge Functions → Secrets** e adicione dois segredos:
   - `GASTO_SENHA`: uma senha longa só de letras e números (30 caracteres ou mais). Anote: ela
     vai no atalho.
   - `GASTO_USUARIO`: o seu ID de usuário. Fica em **Authentication → Users** → clique no seu
     usuário → **User UID**.

Endereço da função: `https://SEU-PROJETO.supabase.co/functions/v1/gasto` (o mesmo endereço do
projeto que está em `VITE_SUPABASE_URL`, com `/functions/v1/gasto` no fim).

## 2. Montar o atalho no iPhone

No app **Atalhos** → **+** (novo atalho) → nome **Gasto**. Adicione três ações, nesta ordem:

1. **Pedir Entrada**
   - Tipo: **Texto**
   - Pergunta: `O que você gastou?`
2. **Obter Conteúdo do URL**
   - URL: o endereço da função (veja acima)
   - Toque em **Mostrar Mais**:
     - Método: **POST**
     - Cabeçalhos → **Adicionar Novo Cabeçalho**: chave `x-senha`, valor = a sua `GASTO_SENHA`
     - Corpo da Solicitação: **JSON** → **Adicionar Novo Campo** → **Texto**: chave `texto`, valor =
       a variável **Entrada Fornecida** (toque no campo e escolha nas sugestões acima do teclado)
3. **Mostrar Notificação**
   - Texto: a variável **Conteúdo do URL**

Teste tocando em ▶︎ (canto inferior direito): digite `teste 1` e veja a notificação. Depois,
mande `desfazer` para apagar o teste.

## 3. Ligar no Botão de Ação (iPhone 15 Pro ou mais novo)

**Ajustes → Botão de Ação** → deslize até **Atalho** → escolha **Gasto**.

Em outros modelos: **Ajustes → Acessibilidade → Toque → Tocar Atrás → Toque Duplo → Gasto**.
Também funciona falando "E aí Siri, gasto".

## Se algo der errado

| Mensagem | O que fazer |
| --- | --- |
| `❌ Senha do atalho incorreta.` | O cabeçalho `x-senha` do atalho não é igual ao segredo `GASTO_SENHA`. |
| `❌ Falta configurar os segredos da função.` | Falta o `GASTO_USUARIO` (ou a função foi publicada antes dos segredos: publique de novo). |
| Erro 401 com "JWT" ou "Invalid token" | O "Verify JWT" da função ainda está ligado (passo 1.4). |
| `❌ Não achei o valor.` | Escreva o valor com números: `uber 17`, `pizza 32,50`. |

## Para quem mexe no código

`index.ts` é gerado: edite `fonte.ts` (ou as regras em `src/lib`) e rode `npm run funcao`.
