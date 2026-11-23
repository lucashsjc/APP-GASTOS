import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Folha } from '../componentes/Folha'
import { IconeAnterior, IconeMais } from '../componentes/icones'
import {
  ESTADO_VAZIO,
  PERIODOS,
  alterar_produto,
  buscar_produto,
  buscar_produto_recursivo,
  cadastrar_produto,
  calcular_valor_estoque,
  calcular_valor_estoque_recursivo,
  excluir_produto,
  exemploStockPy,
  faturamento_do_produto,
  formatar_moeda,
  gerar_matriz_vendas,
  ordenar_ranking,
  produtos_em_alerta,
  registrar_entrada,
  registrar_venda,
  relatorio_consolidado,
  totais_por_periodo,
  verificar_estoque,
  type Estado,
  type Produto,
  type Resultado,
} from './regras'

const CHAVE = 'stockpy'

function ler(): Estado {
  try {
    const salvo = localStorage.getItem(CHAVE)
    if (salvo) return { ...ESTADO_VAZIO, ...JSON.parse(salvo) }
  } catch {
    // sem armazenamento: começa com a loja de exemplo
  }
  return exemploStockPy()
}

function gravar(e: Estado) {
  try {
    localStorage.setItem(CHAVE, JSON.stringify(e))
  } catch {
    // sem armazenamento: fica só na tela
  }
}

type Aba = 'estoque' | 'vender' | 'relatorios' | 'recursao'
const ABAS: { id: Aba; nome: string }[] = [
  { id: 'estoque', nome: 'Estoque' },
  { id: 'vender', nome: 'Vender' },
  { id: 'relatorios', nome: 'Relatórios' },
  { id: 'recursao', nome: 'Recursão' },
]

const numero = (t: string) => Number(t.replace(',', '.'))

/** O StockPy (Desafio 2) rodando como app, com as mesmas regras do StockPy.py. Os dados ficam neste aparelho. */
export default function PaginaStockPy() {
  const [estado, setEstado] = useState<Estado>(ler)
  const [aba, setAba] = useState<Aba>('estoque')
  const [aviso, setAviso] = useState<{ texto: string; erro: boolean } | null>(null)
  const [folha, setFolha] = useState<'novo' | Produto | null>(null)

  /** Roda uma das funções do StockPy numa cópia do estado; se deu certo, grava. */
  const executar = (acao: (e: Estado) => Resultado, sucesso: string): boolean => {
    const copia: Estado = structuredClone(estado)
    const erro = acao(copia)
    if (erro) {
      setAviso({ texto: erro, erro: true })
      return false
    }
    setEstado(copia)
    gravar(copia)
    setAviso({ texto: sucesso, erro: false })
    return true
  }

  return (
    <div className="pagina pagina-stockpy">
      <header className="topo">
        <div className="topo-linha">
          <Link to="/univap" className="voltar">
            <IconeAnterior tamanho={18} /> Projetos UNIVAP
          </Link>
        </div>
        <div className="topo-linha">
          <div>
            <h1>StockPy</h1>
            <p className="stockpy-sub">Desafio 2 · Algoritmos e Programação</p>
          </div>
          {aba === 'estoque' && (
            <button type="button" className="botao-mais stockpy-mais" onClick={() => setFolha('novo')} aria-label="Cadastrar produto">
              <IconeMais tamanho={20} />
            </button>
          )}
        </div>
        <nav className="pilulas-faculdade stockpy-abas" aria-label="StockPy">
          {ABAS.map((a) => (
            <button
              key={a.id}
              type="button"
              className={`chip${aba === a.id ? ' ativo' : ''}`}
              onClick={() => {
                setAba(a.id)
                setAviso(null)
              }}
            >
              {a.nome}
            </button>
          ))}
        </nav>
      </header>

      {aviso && <p className={`stockpy-aviso ${aviso.erro ? 'erro' : 'ok'}`}>{aviso.texto}</p>}

      {aba === 'estoque' && <AbaEstoque estado={estado} abrir={setFolha} />}
      {aba === 'vender' && <AbaVender estado={estado} executar={executar} />}
      {aba === 'relatorios' && <AbaRelatorios estado={estado} />}
      {aba === 'recursao' && <AbaRecursao estado={estado} />}

      <div className="stockpy-rodape">
        <button
          type="button"
          className="botao-texto"
          onClick={() => {
            const e = exemploStockPy()
            setEstado(e)
            gravar(e)
            setAviso({ texto: 'Loja de exemplo restaurada.', erro: false })
          }}
        >
          Restaurar exemplo
        </button>
        <button
          type="button"
          className="botao-texto"
          onClick={() => {
            const e = structuredClone(ESTADO_VAZIO)
            setEstado(e)
            gravar(e)
            setAviso({ texto: 'Tudo zerado: comece cadastrando um produto.', erro: false })
          }}
        >
          Começar do zero
        </button>
      </div>
      <p className="dica">Os dados do StockPy ficam só neste aparelho. O código original continua no GitHub, sem mudança.</p>

      {folha === 'novo' && (
        <FolhaCadastro
          aoFechar={() => setFolha(null)}
          aoSalvar={(p) => executar((e) => cadastrar_produto(e, p), `Produto '${p.nome}' cadastrado com sucesso!`)}
        />
      )}
      {folha && folha !== 'novo' && (
        <FolhaProduto
          produto={estado.produtos.find((p) => p.codigo === folha.codigo) ?? folha}
          aoFechar={() => setFolha(null)}
          executar={executar}
        />
      )}
    </div>
  )
}

// ---------- Estoque (requisitos 1, 2, 3, 4, 6, 8 e 9) ----------

function situacaoClasse(p: Produto) {
  const s = verificar_estoque(p)
  return s === 'Sem estoque' ? 'sem' : s === 'Estoque baixo' ? 'baixo' : 'ok'
}

function AbaEstoque({ estado, abrir }: { estado: Estado; abrir: (p: Produto) => void }) {
  const [soAlerta, setSoAlerta] = useState(false)
  const alerta = produtos_em_alerta(estado.produtos)
  const lista = soAlerta ? alerta : estado.produtos
  return (
    <>
      <div className="univap-resumo">
        <div>
          <strong>{estado.produtos.length}</strong>
          <small>Produtos</small>
        </div>
        <div>
          <strong className={alerta.length ? 'atencao-texto' : undefined}>{alerta.length}</strong>
          <small>Em alerta</small>
        </div>
        <div>
          <strong>{estado.produtos.reduce((s, p) => s + p.quantidade, 0)}</strong>
          <small>Unidades</small>
        </div>
      </div>
      <label className="alternar stockpy-filtro">
        <input type="checkbox" checked={soAlerta} onChange={(e) => setSoAlerta(e.target.checked)} />
        <span>Só produtos com estoque baixo</span>
      </label>
      {lista.length === 0 ? (
        <p className="vazio">{soAlerta ? 'Não existem produtos em situação de alerta.' : 'Nenhum produto cadastrado. Toque no + para cadastrar.'}</p>
      ) : (
        <ul className="lista-materias">
          {lista.map((p) => (
            <li key={p.codigo}>
              <button type="button" className="card stockpy-produto" onClick={() => abrir(p)}>
                <span className="stockpy-codigo">{p.codigo}</span>
                <span className="stockpy-produto-texto">
                  <strong>{p.nome}</strong>
                  <small>
                    {p.categoria} · {formatar_moeda(p.preco)}
                  </small>
                </span>
                <span className="stockpy-produto-qtd">
                  <strong>{p.quantidade}</strong>
                  <small className={`stockpy-situacao ${situacaoClasse(p)}`}>{verificar_estoque(p)}</small>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}

function FolhaCadastro({ aoFechar, aoSalvar }: { aoFechar: () => void; aoSalvar: (p: Omit<Produto, 'vendidos'>) => boolean }) {
  const [c, setC] = useState({ codigo: '', nome: '', categoria: '', preco: '', quantidade: '0', minimo: '0' })
  const campo = (k: keyof typeof c, rotulo: string, modo: 'text' | 'numeric' | 'decimal' = 'text') => (
    <label className="campo">
      <span>{rotulo}</span>
      <input inputMode={modo} value={c[k]} onChange={(e) => setC({ ...c, [k]: e.target.value })} />
    </label>
  )
  return (
    <Folha titulo="Cadastrar produto" aoFechar={aoFechar}>
      <form
        className="form-gasto"
        noValidate
        onSubmit={(e) => {
          e.preventDefault()
          const ok = aoSalvar({
            codigo: numero(c.codigo),
            nome: c.nome,
            categoria: c.categoria,
            preco: numero(c.preco),
            quantidade: numero(c.quantidade),
            minimo: numero(c.minimo),
          })
          if (ok) aoFechar()
        }}
      >
        {campo('codigo', 'Código do produto', 'numeric')}
        {campo('nome', 'Nome do produto')}
        {campo('categoria', 'Categoria')}
        {campo('preco', 'Preço unitário de venda (R$)', 'decimal')}
        <div className="campos-lado">
          {campo('quantidade', 'Quantidade inicial', 'numeric')}
          {campo('minimo', 'Estoque mínimo', 'numeric')}
        </div>
        <button type="submit" className="botao-principal">
          Cadastrar
        </button>
      </form>
    </Folha>
  )
}

/** Ficha do produto (requisito 3) com entrada no estoque (4), alterar (8) e excluir (9). */
function FolhaProduto({
  produto,
  aoFechar,
  executar,
}: {
  produto: Produto
  aoFechar: () => void
  executar: (acao: (e: Estado) => Resultado, sucesso: string) => boolean
}) {
  const [entrada, setEntrada] = useState('')
  const [editando, setEditando] = useState(false)
  const [c, setC] = useState({ nome: produto.nome, categoria: produto.categoria, preco: String(produto.preco).replace('.', ','), minimo: String(produto.minimo) })
  const [confirmando, setConfirmando] = useState(false)
  const linha = (rotulo: string, valor: string) => (
    <div className="stockpy-ficha-linha">
      <span>{rotulo}</span>
      <strong>{valor}</strong>
    </div>
  )
  return (
    <Folha titulo={`${produto.codigo} · ${produto.nome}`} aoFechar={aoFechar}>
      <div className="form-gasto">
        {!editando ? (
          <div className="card stockpy-ficha">
            {linha('Categoria', produto.categoria)}
            {linha('Preço unitário', formatar_moeda(produto.preco))}
            {linha('Quantidade atual', String(produto.quantidade))}
            {linha('Estoque mínimo', String(produto.minimo))}
            {linha('Situação', verificar_estoque(produto).toUpperCase())}
            {linha('Unidades vendidas', String(produto.vendidos))}
            <button type="button" className="botao-texto" onClick={() => setEditando(true)}>
              Alterar cadastro
            </button>
          </div>
        ) : (
          <>
            {(['nome', 'categoria'] as const).map((k) => (
              <label key={k} className="campo">
                <span>{k === 'nome' ? 'Nome' : 'Categoria'}</span>
                <input value={c[k]} onChange={(e) => setC({ ...c, [k]: e.target.value })} />
              </label>
            ))}
            <div className="campos-lado">
              <label className="campo">
                <span>Preço (R$)</span>
                <input inputMode="decimal" value={c.preco} onChange={(e) => setC({ ...c, preco: e.target.value })} />
              </label>
              <label className="campo">
                <span>Estoque mínimo</span>
                <input inputMode="numeric" value={c.minimo} onChange={(e) => setC({ ...c, minimo: e.target.value })} />
              </label>
            </div>
            <button
              type="button"
              className="botao-principal"
              onClick={() => {
                const ok = executar(
                  (e) => alterar_produto(e, produto.codigo, { nome: c.nome, categoria: c.categoria, preco: numero(c.preco), minimo: numero(c.minimo) }),
                  'Dado alterado com sucesso.',
                )
                if (ok) setEditando(false)
              }}
            >
              Salvar alterações
            </button>
            <p className="nota">O código e a quantidade não mudam por aqui (como no StockPy).</p>
          </>
        )}

        <div className="campo">
          <span>Registrar entrada no estoque</span>
          <div className="stockpy-entrada">
            <input inputMode="numeric" placeholder="Quantidade recebida" value={entrada} onChange={(e) => setEntrada(e.target.value)} />
            <button
              type="button"
              className="botao-lancar"
              onClick={() => {
                const antes = produto.quantidade
                const q = numero(entrada)
                if (executar((e) => registrar_entrada(e, produto.codigo, q), `Entrada registrada: ${antes} + ${q} = ${antes + q} unidades.`)) setEntrada('')
              }}
            >
              Adicionar
            </button>
          </div>
        </div>

        {confirmando ? (
          <div className="confirmar-apagar">
            <span>Confirma a exclusão de '{produto.nome}'?</span>
            <div>
              <button type="button" className="botao-texto" onClick={() => setConfirmando(false)}>
                Não
              </button>
              <button
                type="button"
                className="botao-perigo"
                onClick={() => {
                  if (executar((e) => excluir_produto(e, produto.codigo), 'Produto excluído.')) aoFechar()
                  else setConfirmando(false)
                }}
              >
                Excluir
              </button>
            </div>
          </div>
        ) : (
          <button type="button" className="botao-texto botao-apagar-falta" onClick={() => setConfirmando(true)}>
            Excluir produto
          </button>
        )}
      </div>
    </Folha>
  )
}

// ---------- Vender (requisito 5) ----------

function AbaVender({ estado, executar }: { estado: Estado; executar: (acao: (e: Estado) => Resultado, sucesso: string) => boolean }) {
  const [codigo, setCodigo] = useState(estado.produtos[0]?.codigo ?? 0)
  const [quantidade, setQuantidade] = useState('1')
  const [periodo, setPeriodo] = useState(0)
  const produto = buscar_produto(estado.produtos, codigo)
  const q = numero(quantidade)
  const ultimas = [...estado.vendas].reverse().slice(0, 8)

  if (!estado.produtos.length) return <p className="vazio">Cadastre um produto no Estoque antes de vender.</p>
  return (
    <>
      <section className="card stockpy-venda">
        <label className="campo">
          <span>Produto</span>
          <select value={codigo} onChange={(e) => setCodigo(Number(e.target.value))}>
            {estado.produtos.map((p) => (
              <option key={p.codigo} value={p.codigo}>
                {p.codigo} · {p.nome} ({p.quantidade} em estoque)
              </option>
            ))}
          </select>
        </label>
        <label className="campo">
          <span>Quantidade</span>
          <input inputMode="numeric" value={quantidade} onChange={(e) => setQuantidade(e.target.value)} />
        </label>
        <div className="campo">
          <span>Período da venda</span>
          <div className="segmentado pequeno" role="radiogroup" aria-label="Período">
            {PERIODOS.map((nome, i) => (
              <button key={nome} type="button" role="radio" aria-checked={periodo === i} className={periodo === i ? 'ativo' : ''} onClick={() => setPeriodo(i)}>
                {nome}
              </button>
            ))}
          </div>
        </div>
        {produto && q > 0 && <p className="stockpy-total">Valor total: <b>{formatar_moeda(produto.preco * q)}</b></p>}
        <button
          type="button"
          className="botao-principal"
          onClick={() =>
            executar(
              (e) => registrar_venda(e, codigo, q, periodo),
              produto ? `Venda realizada: ${q} × ${produto.nome} = ${formatar_moeda(produto.preco * q)} (${PERIODOS[periodo]}). Estoque restante: ${produto.quantidade - q}.` : '',
            )
          }
        >
          Registrar venda
        </button>
      </section>

      <section className="secao">
        <h2>Últimas vendas</h2>
        {ultimas.length === 0 ? (
          <p className="vazio">Nenhuma venda ainda.</p>
        ) : (
          <ul className="lista">
            {ultimas.map((v, i) => (
              <li key={i} className="linha-simples">
                <span>
                  <strong>{v.nome}</strong>
                  <small>
                    {v.quantidade} un. · {PERIODOS[v.periodo]}
                  </small>
                </span>
                <strong>{formatar_moeda(v.valor)}</strong>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  )
}

// ---------- Relatórios (requisitos 7, 10, 11, 12 e 15) ----------

function AbaRelatorios({ estado }: { estado: Estado }) {
  const r = relatorio_consolidado(estado)
  const matriz = gerar_matriz_vendas(estado.produtos, estado.vendas)
  const totais = totais_por_periodo(matriz)
  const ranking = ordenar_ranking(estado.produtos.filter((p) => p.vendidos > 0))
  const kpi = (rotulo: string, valor: string) => (
    <div>
      <small>{rotulo}</small>
      <strong>{valor}</strong>
    </div>
  )
  return (
    <>
      <section className="stockpy-kpis">
        {kpi('Faturamento', formatar_moeda(r.faturamento))}
        {kpi('Ticket médio', r.ticket === null ? '—' : formatar_moeda(r.ticket))}
        {kpi('Vendas', String(r.operacoes))}
        {kpi('Unidades vendidas', String(r.unidadesVendidas))}
        {kpi('Valor do estoque', formatar_moeda(r.valorEstoque))}
        {kpi('Categorias', String(r.categorias))}
      </section>

      <section className="card stockpy-ficha">
        <h2 className="resumo-titulo">Relatório consolidado</h2>
        {r.operacoes === 0 ? (
          <p className="nota">Sem vendas: indicadores de desempenho indisponíveis.</p>
        ) : (
          <>
            <div className="stockpy-ficha-linha"><span>Mais vendido</span><strong>{r.maisVendido!.nome} ({r.maisVendido!.vendidos} un.)</strong></div>
            <div className="stockpy-ficha-linha"><span>Menos vendido</span><strong>{r.menosVendido!.nome} ({r.menosVendido!.vendidos} un.)</strong></div>
            <div className="stockpy-ficha-linha"><span>Maior venda</span><strong>{formatar_moeda(r.maiorVenda!.valor)} ({r.maiorVenda!.nome})</strong></div>
            <div className="stockpy-ficha-linha"><span>Menor venda</span><strong>{formatar_moeda(r.menorVenda!.valor)} ({r.menorVenda!.nome})</strong></div>
            <div className="stockpy-ficha-linha"><span>Maior faturamento</span><strong>{r.maiorFaturamento!.produto.nome} ({formatar_moeda(r.maiorFaturamento!.valor)})</strong></div>
            <div className="stockpy-ficha-linha"><span>Melhor categoria</span><strong>{r.melhorCategoria!.categoria} ({formatar_moeda(r.melhorCategoria!.valor)})</strong></div>
            <div className="stockpy-ficha-linha"><span>Melhor período</span><strong>{PERIODOS[r.melhorPeriodo!.periodo]} ({r.melhorPeriodo!.unidades} un.)</strong></div>
          </>
        )}
        <div className="stockpy-ficha-linha"><span>Produtos em estoque baixo</span><strong>{r.emAlerta}</strong></div>
      </section>

      <section className="secao">
        <h2>Matriz de vendas</h2>
        <div className="stockpy-matriz">
          <table>
            <thead>
              <tr>
                <th>Produto</th>
                {PERIODOS.map((p) => (
                  <th key={p}>{p.slice(0, 5)}</th>
                ))}
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {estado.produtos.map((p, i) => (
                <tr key={p.codigo}>
                  <td>{p.nome}</td>
                  {matriz[i].map((n, j) => (
                    <td key={j} className={n ? 'cheio' : undefined}>{n}</td>
                  ))}
                  <td><b>{matriz[i].reduce((a, b) => a + b, 0)}</b></td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td>Total</td>
                {totais.map((t, j) => (
                  <td key={j}>{t}</td>
                ))}
                <td>{totais.reduce((a, b) => a + b, 0)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>

      <section className="secao">
        <h2>Ranking (ordenação por inserção)</h2>
        {ranking.length === 0 ? (
          <p className="vazio">Nenhum produto vendido ainda.</p>
        ) : (
          <ol className="lista stockpy-ranking">
            {ranking.map((p, i) => (
              <li key={p.codigo} className="linha-simples">
                <span>
                  <strong>
                    {i + 1}º · {p.nome}
                  </strong>
                  <small>
                    {p.categoria} · {p.vendidos} vendidos
                  </small>
                </span>
                <strong>{formatar_moeda(faturamento_do_produto(estado.vendas, p.codigo))}</strong>
              </li>
            ))}
          </ol>
        )}
      </section>
    </>
  )
}

// ---------- Recursão (requisitos 13 e 14) ----------

function AbaRecursao({ estado }: { estado: Estado }) {
  const [texto, setTexto] = useState('')
  const [busca, setBusca] = useState<ReturnType<typeof buscar_produto_recursivo> | null>(null)
  const [convencional, setConvencional] = useState<Produto | null>(null)
  const valorRec = calcular_valor_estoque_recursivo(estado.produtos)
  const valorLaco = calcular_valor_estoque(estado.produtos)
  return (
    <>
      <section className="card stockpy-venda">
        <h2 className="resumo-titulo">Busca recursiva</h2>
        <p className="nota">Procura o produto pelo código chamando a função de novo, índice por índice (sem for/while), e compara com a busca convencional.</p>
        <div className="stockpy-entrada">
          <input inputMode="numeric" placeholder="Código a buscar" value={texto} onChange={(e) => setTexto(e.target.value)} />
          <button
            type="button"
            className="botao-lancar"
            onClick={() => {
              const c = numero(texto)
              setBusca(buscar_produto_recursivo(estado.produtos, c))
              setConvencional(buscar_produto(estado.produtos, c))
            }}
          >
            Buscar
          </button>
        </div>
        {busca && (
          <div className="stockpy-ficha">
            <div className="stockpy-ficha-linha"><span>Busca recursiva</span><strong>{busca.produto?.nome ?? 'não encontrado'}</strong></div>
            <div className="stockpy-ficha-linha"><span>Chamadas da função</span><strong>{busca.chamadas}</strong></div>
            <div className="stockpy-ficha-linha"><span>Busca convencional</span><strong>{convencional?.nome ?? 'não encontrado'}</strong></div>
            <p className={`stockpy-aviso ${busca.produto === convencional ? 'ok' : 'erro'}`}>
              {busca.produto === convencional ? 'As duas buscas retornaram o mesmo resultado.' : 'Atenção: as buscas retornaram resultados diferentes!'}
            </p>
          </div>
        )}
      </section>

      <section className="card stockpy-ficha">
        <h2 className="resumo-titulo">Valor do estoque por recursão</h2>
        <div className="stockpy-ficha-linha"><span>Recursivo</span><strong>{formatar_moeda(valorRec)}</strong></div>
        <div className="stockpy-ficha-linha"><span>Conferência (com laço)</span><strong>{formatar_moeda(valorLaco)}</strong></div>
        <p className="nota">Soma preço × quantidade de cada produto: o valor do atual + a chamada para o próximo, até o fim da lista.</p>
      </section>
    </>
  )
}
