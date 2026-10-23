// Gerado por npm run funcao a partir de fonte.ts. Não edite à mão: cole este arquivo no painel do Supabase.

// src/lib/categorias.ts
var CATEGORIA_PADRAO = "Outros";
var REGRAS = [
  [/\b(uber|gasolina)\b/, "Transporte"],
  [/\b(porto|spotify|icloud)\b/, "Fixos"],
  [/\bremedio/, "Sa\xFAde"]
];
function sugerirCategoria(descricao) {
  const texto2 = descricao.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  return REGRAS.find(([regra]) => regra.test(texto2))?.[1] ?? CATEGORIA_PADRAO;
}

// src/lib/datas.ts
var FUSO = "America/Sao_Paulo";
function hojeSP(agora = /* @__PURE__ */ new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: FUSO,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(agora);
}
function mesDe(data) {
  return data.slice(0, 7);
}
function partes(mes) {
  const [a, m] = mes.split("-").map(Number);
  return [a, m];
}
function diasNoMes(mes) {
  const [a, m] = partes(mes);
  return new Date(Date.UTC(a, m, 0)).getUTCDate();
}
function doisDigitos(n) {
  return String(n).padStart(2, "0");
}
function dataNoMes(mes, dia) {
  return `${mes}-${doisDigitos(Math.min(dia, diasNoMes(mes)))}`;
}
function somarMeses(mes, n) {
  const [a, m] = partes(mes);
  const total = a * 12 + (m - 1) + n;
  return `${Math.floor(total / 12)}-${doisDigitos(total % 12 + 1)}`;
}
function diaDe(data) {
  return Number(data.slice(8, 10));
}
function semAcento(texto2) {
  return texto2.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

// src/lib/dinheiro.ts
function formatarReais(centavos) {
  const { sinal, inteiro, centavos: c } = partesDoValor(centavos);
  return `${sinal}R$ ${inteiro},${c}`;
}
function partesDoValor(centavos) {
  if (!Number.isInteger(centavos)) throw new Error(`Valor em centavos n\xE3o inteiro: ${centavos}`);
  const abs = Math.abs(centavos);
  const inteiro = String(Math.floor(abs / 100)).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return { sinal: centavos < 0 ? "\u2212" : "", inteiro, centavos: String(abs % 100).padStart(2, "0") };
}
function lerReais(texto2) {
  const limpo = texto2.replace(/R\$|\s/g, "");
  if (!/^\d{1,3}(\.\d{3})*(,\d{1,2})?$|^\d+(,\d{1,2})?$/.test(limpo)) return null;
  const [inteiro, decimal = ""] = limpo.replace(/\./g, "").split(",");
  return Number(inteiro) * 100 + Number(decimal.padEnd(2, "0"));
}

// src/lib/calculos.ts
function dividirParcelas(total, parcelas) {
  if (!Number.isInteger(total) || total <= 0) throw new Error("O total precisa ser um valor positivo em centavos.");
  if (!Number.isInteger(parcelas) || parcelas < 1) throw new Error("N\xFAmero de parcelas inv\xE1lido.");
  const base = Math.floor(total / parcelas);
  const sobra = total - base * parcelas;
  return Array.from({ length: parcelas }, (_, i) => i === 0 ? base + sobra : base);
}
function datasDasParcelas(dataCompra, parcelas) {
  const dia = diaDe(dataCompra);
  return Array.from({ length: parcelas }, (_, i) => dataNoMes(somarMeses(mesDe(dataCompra), i), dia));
}
function gerarParcelas(compra, grupoId) {
  const valores = dividirParcelas(compra.total_centavos, compra.parcelas);
  const datas = datasDasParcelas(compra.data, compra.parcelas);
  return valores.map((valor, i) => ({
    aba: compra.aba,
    forma: compra.aba === "nubank" ? compra.forma : null,
    descricao: compra.descricao,
    valor_centavos: valor,
    data: datas[i],
    categoria: compra.categoria,
    tipo: "parcela",
    recorrencia_id: null,
    grupo_id: grupoId,
    parcela_numero: i + 1,
    parcela_total: compra.parcelas,
    caiu_manual: null
  }));
}
function normalizarDescricao(texto2) {
  return texto2.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase().replace(/\s+/g, " ");
}

// src/lib/frase.ts
var EXEMPLO = 'Exemplos: "uber 17", "mercado 85,90 caju", "ifood 42 d\xE9bito", "t\xEAnis 300 em 3x".';
var VAZIAS = /* @__PURE__ */ new Set(["reais", "real", "r$", "rs", "de", "do", "da", "no", "na", "em", "com", "gastei", "paguei", "comprei", "um", "uma", "e"]);
function valorDoToken(token) {
  let t = token.replace(/^r\$/i, "");
  if (/^\d+\.\d{1,2}$/.test(t)) t = t.replace(".", ",");
  return lerReais(t);
}
function lerFrase(texto2) {
  let resto = ` ${texto2.trim().replace(/\s+/g, " ")} `;
  if (!resto.trim()) return { ok: false, erro: `Escreva o gasto. ${EXEMPLO}` };
  let parcelas = 1;
  resto = resto.replace(/\s(?:em\s)?(\d{1,2})\s?(?:x|vezes|parcelas)(?=\s)/i, (_, n) => {
    parcelas = Number(n);
    return " ";
  });
  if (parcelas < 1 || parcelas > 48) return { ok: false, erro: "Parcelas: de 1 a 48." };
  let aba = "nubank";
  let forma = null;
  let valor = null;
  const palavras = [];
  for (const token of resto.trim().split(" ")) {
    const chave = semAcento(token).toLowerCase().replace(/[.,!?;:]+$/, "");
    if (chave === "caju") aba = "caju";
    else if (chave === "nubank" || chave === "nu") aba = "nubank";
    else if (chave === "debito") forma = "debito";
    else if (chave === "credito") forma = "credito";
    else if (valor === null && /\d/.test(token) && valorDoToken(token.replace(/[!?;:]+$/, "")) !== null) {
      valor = valorDoToken(token.replace(/[!?;:]+$/, ""));
    } else palavras.push(token);
  }
  const vazia = (p) => VAZIAS.has(semAcento(p).toLowerCase());
  while (palavras.length && vazia(palavras[0])) palavras.shift();
  while (palavras.length && vazia(palavras[palavras.length - 1])) palavras.pop();
  if (valor === null || valor <= 0) return { ok: false, erro: `N\xE3o achei o valor. ${EXEMPLO}` };
  if (!palavras.length) return { ok: false, erro: `Faltou dizer o que foi. ${EXEMPLO}` };
  if (parcelas > 1 && valor < parcelas) return { ok: false, erro: "O valor \xE9 menor que um centavo por parcela." };
  const descricao = palavras.join(" ");
  return {
    ok: true,
    frase: {
      descricao: descricao[0].toUpperCase() + descricao.slice(1),
      valor_centavos: valor,
      aba,
      forma: aba === "caju" ? null : forma,
      parcelas
    }
  };
}
function gastosDaFrase(f, extras) {
  const forma = f.aba === "nubank" ? extras.forma : null;
  if (f.parcelas > 1) {
    return gerarParcelas(
      {
        aba: f.aba,
        forma,
        descricao: f.descricao,
        categoria: extras.categoria,
        total_centavos: f.valor_centavos,
        data: extras.data,
        parcelas: f.parcelas
      },
      extras.grupoId
    );
  }
  return [
    {
      aba: f.aba,
      forma,
      descricao: f.descricao,
      valor_centavos: f.valor_centavos,
      data: extras.data,
      categoria: extras.categoria,
      tipo: "unico",
      recorrencia_id: null,
      grupo_id: null,
      parcela_numero: null,
      parcela_total: null,
      caiu_manual: null
    }
  ];
}
function confirmacao(f, forma, categoria) {
  const cartao = f.aba === "caju" ? "Caju" : `Nubank ${forma === "debito" ? "d\xE9bito" : "cr\xE9dito"}`;
  const valor = f.parcelas > 1 ? `${formatarReais(f.valor_centavos)} em ${f.parcelas}x` : formatarReais(f.valor_centavos);
  return `\u2705 ${f.descricao} \xB7 ${valor} \xB7 ${cartao} \xB7 ${categoria}`;
}
function ehDesfazer(texto2) {
  return /^(desfazer|desfaz|apagar|apaga|cancelar|cancela)( o)?( ultimo)?$/.test(semAcento(texto2).trim().toLowerCase());
}

// supabase/functions/gasto/fonte.ts
var URL_BANCO = Deno.env.get("SUPABASE_URL") ?? "";
var CHAVE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
var SENHA = Deno.env.get("GASTO_SENHA") ?? "";
var USUARIO = Deno.env.get("GASTO_USUARIO") ?? "";
function texto(corpo, status = 200) {
  return new Response(corpo, { status, headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
function senhaConfere(recebida) {
  if (!SENHA || recebida.length !== SENHA.length) return false;
  let diferenca = 0;
  for (let i = 0; i < SENHA.length; i++) diferenca |= recebida.charCodeAt(i) ^ SENHA.charCodeAt(i);
  return diferenca === 0;
}
async function banco(caminho, init = {}) {
  const resposta = await fetch(`${URL_BANCO}/rest/v1/${caminho}`, {
    ...init,
    headers: {
      apikey: CHAVE,
      Authorization: `Bearer ${CHAVE}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
      ...init.headers
    }
  });
  if (!resposta.ok) throw new Error(`banco ${resposta.status}: ${await resposta.text()}`);
  return resposta.status === 204 ? null : resposta.json();
}
async function lerTexto(req) {
  const corpo = await req.text();
  try {
    const json = JSON.parse(corpo);
    if (typeof json === "string") return json;
    return String(json.texto ?? json.text ?? "");
  } catch {
    return corpo;
  }
}
async function desfazer() {
  const [ultimo] = await banco(
    `gastos?select=id,descricao,valor_centavos,grupo_id&user_id=eq.${USUARIO}&order=criado_em.desc&limit=1`
  );
  if (!ultimo) return "Nada para desfazer.";
  if (!ultimo.grupo_id) {
    await banco(`gastos?id=eq.${ultimo.id}`, { method: "DELETE" });
    return `\u21A9\uFE0F Apagado: ${ultimo.descricao} \xB7 ${formatarReais(ultimo.valor_centavos)}`;
  }
  const filtro = `grupo_id=eq.${ultimo.grupo_id}&user_id=eq.${USUARIO}`;
  const parcelas = await banco(`gastos?select=valor_centavos&${filtro}`);
  await banco(`gastos?${filtro}`, { method: "DELETE" });
  const total = parcelas.reduce((s, p) => s + p.valor_centavos, 0);
  return `\u21A9\uFE0F Apagado: ${ultimo.descricao} \xB7 ${formatarReais(total)} em ${parcelas.length}x`;
}
Deno.serve(async (req) => {
  if (req.method !== "POST") return texto("Use POST.", 405);
  if (!senhaConfere(req.headers.get("x-senha") ?? "")) return texto("\u274C Senha do atalho incorreta.", 401);
  if (!URL_BANCO || !CHAVE || !USUARIO) return texto("\u274C Falta configurar os segredos da fun\xE7\xE3o.", 500);
  try {
    const entrada = (await lerTexto(req)).trim();
    if (ehDesfazer(entrada)) return texto(await desfazer());
    const lido = lerFrase(entrada);
    if (!lido.ok) return texto(`\u274C ${lido.erro}`);
    const f = lido.frase;
    const historico = await banco(
      `gastos?select=descricao,categoria,forma&user_id=eq.${USUARIO}&aba=eq.${f.aba}&order=data.desc,criado_em.desc&limit=1000`
    );
    const anterior = historico.find((g) => normalizarDescricao(g.descricao) === normalizarDescricao(f.descricao));
    const categoria = anterior?.categoria ?? sugerirCategoria(f.descricao);
    const forma = f.forma ?? anterior?.forma ?? "credito";
    const gastos = gastosDaFrase(f, { data: hojeSP(), categoria, forma, grupoId: crypto.randomUUID() });
    await banco("gastos", { method: "POST", body: JSON.stringify(gastos.map((g) => ({ ...g, user_id: USUARIO }))) });
    return texto(confirmacao(f, forma, categoria));
  } catch (e) {
    console.error(e);
    return texto("\u274C N\xE3o deu para gravar agora. Tente de novo.", 500);
  }
});
