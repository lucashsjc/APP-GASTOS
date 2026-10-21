# App de Gastos (Nubank e Caju): descrição

Data: 21/10/2026 · Autor: Lucas Henrique

## 1. Por que existe

O Lucas controla os gastos numa planilha do Excel (`Controle Financeiro.xlsx`): um bloco por mês,
cada gasto numa coluna com data, descrição e valor, mais o valor recebido no mês. Os gastos que
se repetem (PORTO, Spotify, iCloud) e as parcelas (Tampa PS5) ele lança à mão nos meses seguintes.

O cartão Caju (benefício que a empresa deposita, sem dia fixo) não é controlado hoje.

O app substitui a planilha no celular: registrar um gasto na hora, em poucos toques, separado
por cartão, e saber a qualquer momento **quanto ainda está livre** no Nubank e **quanto tem de
saldo** no Caju.

Também é um projeto de portfólio, publicado no GitHub como o app da doceria
(`github.com/lucashsjc/APP-DOCERIA`).

## 2. Objetivos

- Duas abas fixas na parte de baixo, **Nubank** (roxo) e **Caju** (vermelho). Um gasto pertence
  a uma aba e nunca aparece na outra.
- Registrar um gasto (valor, descrição, data, categoria) em poucos segundos.
- Nubank: mostrar o **livre para gastar** no mês = recebido − certos do mês − outros gastos.
- Caju: mostrar o **saldo** no cartão e **quanto dá para gastar por dia** até o fim do mês.
- **Certos do mês**: gastos que já se sabe que vão acontecer (todo mês, parcelas e únicos com
  data), com o que **já caiu** e o que **vai cair**.
- Ver **para onde foi o dinheiro**: categorias, comparação entre meses e o gasto que mais se repete.
- **Importar** o histórico da planilha atual uma vez.
- Dados na nuvem, com acesso só do Lucas, funcionando no iPhone como app instalado.

## 3. Fora do escopo (desta versão)

Ficam para depois, nesta ordem sugerida:

1. Importar o arquivo CSV da fatura do Nubank.
2. Registrar com uma frase só ("uber 17").
3. Ler print do extrato do Caju com IA (Claude).
4. Previsão do fim do mês, raio-X das assinaturas, limites por categoria, busca.
5. Notificações no celular (lembrete diário, resumo semanal).

Também fora: meta de economia (o Lucas pediu para tirar), outros cartões ou contas, vários
usuários, conexão automática com o banco (Open Finance).

## 4. O que tornaria o app um fracasso, mesmo funcionando

- Registrar um gasto ser mais lento que abrir o Excel.
- Os números não baterem com a conta feita à mão (ex.: o livre ou o saldo do Caju errados).
- Um gasto do Caju aparecer no Nubank, ou o contrário.
- Perder dados ou alguém além do Lucas conseguir ver os gastos.

## 5. Como é feito (decidido)

Mesma base do app da doceria, a pedido do Lucas:

| Camada | Tecnologia |
| --- | --- |
| Interface | React 19, TypeScript, Vite, CSS próprio |
| Banco e login | Supabase: PostgreSQL, Auth (e-mail e senha), cadastro de novas contas desligado |
| Segurança | Row Level Security em todas as tabelas (`user_id = auth.uid()`) |
| Hospedagem | Vercel, deploy automático a partir do GitHub |
| Celular | PWA instalado pela tela de início do iPhone |
| Código | Repositório `lucashsjc/APP-GASTOS` no GitHub |

Da doceria também vem a camada de dados com duas implementações (Supabase e `localStorage`):
sem as variáveis do Supabase, o app abre em **modo demonstração** com dados de exemplo.

## 6. Telas

Visual: tema escuro, cards grandes, fonte Manrope. Nubank roxo (`#8a2be2`), Caju vermelho
(`#e5142b`). Logos simplificados ("nu" e "caju" em quadrados coloridos), não os logos oficiais.

**Barra de baixo (sempre visível):** botões Nubank e Caju.

**Aba Nubank**
- Topo: nome da aba, seletor de mês (‹ Novembro ›) e botão **+**.
- Card roxo: **Livre para gastar** no mês, barra com quanto do recebido já é certo, valor recebido,
  link "Para onde foi o dinheiro".
- Card **Certos do mês**: barra e valores de "já caiu" e "vai cair"; abre a lista completa.
- Lista **Outros gastos** do mês, do mais recente para o mais antigo.
- O valor recebido no mês é editável (um valor por mês).

**Aba Caju** (com a área de certos igual à do Nubank)
- Card vermelho: **Saldo no cartão**.
- Aviso: "Até o fim de outubro (11 dias): dá para gastar R$ X por dia" = saldo ÷ dias restantes
  no mês, contando hoje.
- Botão para **registrar um depósito** (valor e data), já que não há dia fixo.
- Card de certos do mês e lista de gastos, como no Nubank.

**Certos do mês**: agrupados em **Todo mês**, **Parcelas** (com "2 de 2") e
**Só este mês**. Cada um com o status "caiu" ou "dia X".

**Novo gasto**: valor em destaque, descrição com sugestões das
mais usadas, data (hoje por padrão), categoria e tipo: **Uma vez**, **Parcelado** (total e
número de parcelas, mostrando "2x de R$ 84,38") ou **Todo mês**. Na aba Nubank, também
**Crédito** ou **Débito** (padrão: Crédito; o app lembra a última escolha para cada descrição).
Pelo + do topo, o padrão é "Uma vez" com data de hoje; pela lista de certos, o padrão é um gasto certo.

**Editar e apagar:** deslizar o gasto para a esquerda mostra Editar e Apagar. Apagar pede
confirmação na própria tela.

**Para onde foi o dinheiro**, por aba e por mês: gráfico de rosca por
categoria com percentuais, lista das categorias com os principais gastos, barras dos últimos
meses e um destaque do gasto mais frequente no mês ("Uber: 10 vezes, R$ 160,81").

**Importar da planilha**: ver seção 9.

**Exportar** (em Ajustes): baixa todos os dados num arquivo .xlsx, como cópia de segurança.

## 7. Regras de cálculo

- **Mês** = mês do calendário, pela data do gasto (como na planilha), tanto no crédito quanto no
  débito.
- **Crédito e débito (Nubank)**: o Lucas usa os dois. Os dois entram no mesmo "livre" do mês. O
  card do Nubank mostra também quanto foi no crédito e quanto no débito, e a lista marca cada gasto.
- **Certos do mês (Nubank ou Caju)** = soma dos gastos certos daquele mês: os "todo mês"
  ativos, a parcela daquele mês e os "só este mês" com data no mês.
- **Já caiu** = certos com data até hoje ou marcados à mão como caídos. **Vai cair** = o resto.
- **Outros gastos** = gastos de "uma vez" com data no mês.
- **Livre (Nubank)** = recebido no mês − certos do mês − outros gastos. Pode ficar negativo e
  aparece em vermelho.
- **Saldo (Caju)** = todos os depósitos até hoje − todos os gastos do Caju já caídos até hoje.
  O saldo **acumula entre os meses**.
- **Por dia (Caju)** = saldo ÷ dias que faltam no mês, contando hoje. Se o saldo for zero ou
  negativo, mostrar "Saldo esgotado".
- **Parcelado**: o total é dividido igualmente, e a diferença de centavos fica na primeira
  parcela. Cada parcela cai no mesmo dia do mês da compra (ou no último dia, se o mês for mais
  curto).
- **Todo mês**: cai no mesmo dia todo mês, a partir do mês de início, até ser encerrado. Editar o
  valor vale do mês atual em diante; os meses passados não mudam.
- Dinheiro guardado em **centavos (inteiros)**, nunca em ponto flutuante. Mostrado em formato
  brasileiro (R$ 1.019,05).
- "Hoje" e as datas seguem o fuso de São Paulo (`America/Sao_Paulo`).
- **Navegando para outros meses**: o "por dia" do Caju só aparece no mês atual.
  Num mês passado, o card do Caju mostra o saldo no fim daquele mês. Num mês futuro, mostra o
  saldo de hoje menos os certos do Caju previstos até aquele mês.
- Gastos parcelados e "todo mês" aparecem só em **Certos do mês**, nunca em "Outros gastos", para
  não serem contados duas vezes.

**Conferência (outubro/2026, Nubank):** 17 gastos somam R$ 1.019,05. Agosto soma R$ 679,58 e
setembro R$ 975,12. Em setembro, Uber aparece 10 vezes, somando R$ 160,81. Novembro já tem
R$ 485,10 certos (PORTO 367,92 + Tampa PS5 84,38 + Spotify 12,90 + iCloud 19,90).

## 8. Categorias

Lista inicial: Alimentação, Mercado, Transporte, Compras, Fixos, Saúde, Lazer, Presentes, Outros.
Cada uma com ícone e cor. O app lembra a última categoria usada para cada descrição (ex.: "Uber"
→ Transporte) e sugere sozinho na próxima vez.

## 9. Importar a planilha

Formato do arquivo atual (aba `SALÁRIO`, com um espaço no fim do nome; aceite com ou sem ele):

- Cada mês é um bloco: na linha do mês, a coluna **B** tem o nome do mês (ABRIL…DEZEMBRO) e a
  coluna **C** tem o valor recebido.
- Colunas **D a Z**: na linha do mês, a data; na linha de baixo, a descrição; na seguinte, o valor.
  Células com 0 são vazias.
- A coluna **AA** (rótulo "MÊS") e a meta em C2 são ignoradas.
- Ano: 2026.

O que o app faz:

- Lê o arquivo no próprio navegador e mostra o resumo antes de gravar (meses, quantidade de
  gastos, recebido de cada mês).
- Meses até o atual: cada gasto vira um gasto "uma vez" no Nubank (forma Crédito); o valor da
  coluna C vira o recebido do mês.
- Meses futuros (novembro e dezembro) não viram gastos soltos. O app sugere os certos que
  encontrou: mesma descrição e valor em meses seguidos viram "todo mês" (PORTO, Spotify, iCloud),
  e o que aparece um número limitado de vezes vira parcela (Tampa PS5, 2x). O Lucas confirma
  antes de gravar.
- Importar de novo não duplica: um gasto com mesma data, descrição, valor e aba é ignorado.
- Categorias da importação: sugeridas pela descrição (Uber/Gasolina → Transporte; PORTO, Spotify,
  iCloud → Fixos; Remédio → Saúde); o resto vai para Outros.

## 10. Dados (tabelas no Supabase)

Todas com `user_id` e RLS.

- `gastos`: id, aba (`nubank` | `caju`), forma (`credito` | `debito`, só no Nubank), descricao,
  valor_centavos, data, categoria, tipo (`unico` | `certo_unico` | `parcela`), recorrencia_id
  (opcional), parcela_numero, parcela_total, caiu_manual (boolean, opcional).
- `recorrencias`: id, aba, forma, descricao, valor_centavos, dia, categoria, inicio (mês), fim (mês,
  opcional). As ocorrências de cada mês são calculadas a partir delas, sem gravar uma linha por mês.
- `recebidos`: aba `nubank`, mes, valor_centavos (um por mês).
- `depositos`: aba `caju`, data, valor_centavos.

Migrações SQL versionadas na pasta `supabase/`, como na doceria.

## 11. Decisões tomadas

1. **Mês do calendário, e não fatura do Nubank.** Crédito e débito contam pelo mês da compra, como
   na planilha. Acompanhar a fatura do crédito fica para uma versão seguinte. Na importação, todos
   os gastos entram como Crédito, e dá para trocar depois.
2. **O saldo do Caju acumula** de um mês para o outro.
3. A lista inicial de **categorias** e as regras de categoria na importação.
4. **Repositório público.** O código não leva dados pessoais. Planilhas reais não vão para o
   repositório; as imagens do README usam dados de exemplo.

## 12. Deixado para quem constrói

Organização dos componentes, a biblioteca de leitura de .xlsx, o desenho exato do gesto de
deslizar, os ícones de cada categoria, os textos de estados vazios e de erro, e os testes das
regras de cálculo (seção 7), que devem existir.
