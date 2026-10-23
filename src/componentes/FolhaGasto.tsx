import { useMemo, useState } from 'react'
import { aplicarPlanoRecorrencia } from '../data/acoes'
import { repo } from '../data/repo'
import type { Aba, Forma, Gasto, NovoGasto, Recorrencia } from '../data/types'
import { useEstado } from '../estado'
import {
  descricoesMaisUsadas,
  observacoesMaisUsadas,
  dividirParcelas,
  gerarParcelas,
  lembrarPorDescricao,
  planejarEdicaoRecorrencia,
} from '../lib/calculos'
import { CATEGORIAS, sugerirCategoria } from '../lib/categorias'
import { dataNoMes, diaDe, mesDe, nomeDoMes, tituloDoMes } from '../lib/datas'
import { formatarReais, lerReais } from '../lib/dinheiro'
import { Folha } from './Folha'

export type ModoGasto =
  | { aba: Aba; origem: 'topo' | 'certos' }
  | { aba: Aba; gasto: Gasto }
  | { aba: Aba; recorrencia: Recorrencia }

type Tipo = 'uma' | 'parcelado' | 'todo_mes'

const TIPOS: { id: Tipo; rotulo: string }[] = [
  { id: 'uma', rotulo: 'Uma vez' },
  { id: 'parcelado', rotulo: 'Parcelado' },
  { id: 'todo_mes', rotulo: 'Todo mês' },
]

function reaisDigitados(centavos: number): string {
  return formatarReais(centavos).replace('R$ ', '')
}

export function FolhaGasto({ modo, aoFechar }: { modo: ModoGasto; aoFechar: () => void }) {
  const { dados, hoje, mes, executar, avisar } = useEstado()
  const aba = modo.aba
  const mesAtual = mesDe(hoje)

  const gastoEditado = 'gasto' in modo ? modo.gasto : null
  const recEditada = 'recorrencia' in modo ? modo.recorrencia : null

  // Parcelas da mesma compra. Só dá para mudar total e parcelas se a compra estiver completa
  // (na importação, às vezes só as parcelas futuras existem).
  const grupo = useMemo(
    () =>
      gastoEditado?.tipo === 'parcela' && gastoEditado.grupo_id
        ? dados.gastos
            .filter((g) => g.grupo_id === gastoEditado.grupo_id)
            .sort((a, b) => (a.parcela_numero ?? 0) - (b.parcela_numero ?? 0))
        : [],
    [dados.gastos, gastoEditado],
  )
  const grupoCompleto = grupo.length > 0 && grupo.length === grupo[0].parcela_total && grupo[0].parcela_numero === 1

  const inicial = (() => {
    if (recEditada) {
      return {
        tipo: 'todo_mes' as Tipo,
        valor: reaisDigitados(recEditada.valor_centavos),
        descricao: recEditada.descricao,
        data: dataNoMes(mes, recEditada.dia),
        categoria: recEditada.categoria,
        observacao: recEditada.observacao,
        separado: recEditada.separado,
        dinheiroAParte: recEditada.dinheiro_a_parte,
        forma: recEditada.forma ?? 'credito',
        certo: true,
        parcelas: 2,
      }
    }
    if (gastoEditado) {
      const comoGrupo = gastoEditado.tipo === 'parcela' && grupoCompleto
      return {
        tipo: (comoGrupo ? 'parcelado' : 'uma') as Tipo,
        valor: reaisDigitados(comoGrupo ? grupo.reduce((s, g) => s + g.valor_centavos, 0) : gastoEditado.valor_centavos),
        descricao: gastoEditado.descricao,
        data: comoGrupo ? grupo[0].data : gastoEditado.data,
        categoria: gastoEditado.categoria,
        observacao: gastoEditado.observacao,
        separado: gastoEditado.separado,
        dinheiroAParte: gastoEditado.dinheiro_a_parte,
        forma: gastoEditado.forma ?? 'credito',
        certo: gastoEditado.tipo !== 'unico',
        parcelas: gastoEditado.parcela_total ?? 2,
      }
    }
    const origem = 'origem' in modo ? modo.origem : 'topo'
    return {
      tipo: (origem === 'certos' ? 'todo_mes' : 'uma') as Tipo,
      valor: '',
      descricao: '',
      // Pelo + do topo, a data é hoje; pela lista de certos, um dia do mês que está aberto.
      data: origem === 'topo' || mes === mesAtual ? hoje : dataNoMes(mes, diaDe(hoje)),
      categoria: '',
      observacao: '',
      separado: false,
      dinheiroAParte: false,
      forma: 'credito' as Forma,
      certo: origem === 'certos',
      parcelas: 2,
    }
  })()

  const [tipo, setTipo] = useState<Tipo>(inicial.tipo)
  const [valorTexto, setValorTexto] = useState(inicial.valor)
  const [descricao, setDescricao] = useState(inicial.descricao)
  const [data, setData] = useState(inicial.data)
  const [dia, setDia] = useState(recEditada?.dia ?? diaDe(inicial.data))
  const [categoria, setCategoria] = useState(inicial.categoria)
  const [categoriaEscolhida, setCategoriaEscolhida] = useState(Boolean(inicial.categoria))
  const [forma, setForma] = useState<Forma>(inicial.forma)
  const [formaEscolhida, setFormaEscolhida] = useState(Boolean(gastoEditado || recEditada))
  // "Uma vez" aberto pela página de fixos vira um previsto só deste mês.
  const [certo] = useState(inicial.certo)
  const [parcelas, setParcelas] = useState(inicial.parcelas)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const editando = Boolean(gastoEditado || recEditada)
  const valor = lerReais(valorTexto)
  const sugestoes = useMemo(() => descricoesMaisUsadas(dados, aba), [dados, aba])
  const sugestoesObs = useMemo(() => observacoesMaisUsadas(dados), [dados])
  const [observacao, setObservacao] = useState(inicial.observacao)
  const [separado, setSeparado] = useState(inicial.separado)
  const [dinheiroAParte, setDinheiroAParte] = useState(inicial.dinheiroAParte)
  const aPartirDe = mes > mesAtual ? mes : mesAtual

  /** Ao escrever a descrição, sugere a categoria e a forma usadas da última vez. */
  const mudarDescricao = (texto: string) => {
    setDescricao(texto)
    const lembrado = lembrarPorDescricao(dados, aba, texto)
    if (!categoriaEscolhida) setCategoria(lembrado.categoria ?? (texto.trim() ? sugerirCategoria(texto) : ''))
    if (!formaEscolhida && lembrado.forma) setForma(lembrado.forma)
  }

  const textoParcelas = (() => {
    if (tipo !== 'parcelado' || !valor || parcelas < 2) return null
    const valores = dividirParcelas(valor, parcelas)
    if (valores[0] === valores[1]) return `${parcelas}x de ${formatarReais(valores[1])}`
    return `${parcelas}x de ${formatarReais(valores[1])} (a 1ª de ${formatarReais(valores[0])})`
  })()

  const salvar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!valor || valor <= 0) return setErro('Digite um valor maior que zero.')
    if (!descricao.trim()) return setErro('Escreva uma descrição.')
    if (tipo === 'parcelado' && (parcelas < 2 || parcelas > 48)) return setErro('Parcelas: de 2 a 48.')
    if (tipo === 'parcelado' && valor < parcelas) return setErro('O total é menor que um centavo por parcela.')
    if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) return setErro('Escolha a data.')
    setErro(null)

    const comum = {
      aba,
      forma: aba === 'nubank' ? forma : null,
      descricao: descricao.trim(),
      categoria: categoria || sugerirCategoria(descricao),
    }
    const extras = { observacao: observacao.trim(), separado, dinheiro_a_parte: aba === 'nubank' && dinheiroAParte }
    const unico = (tipoGasto: NovoGasto['tipo']): NovoGasto => ({
      ...comum,
      ...extras,
      valor_centavos: valor,
      data,
      tipo: tipoGasto,
      recorrencia_id: null,
      grupo_id: null,
      parcela_numero: null,
      parcela_total: null,
      caiu_manual: null,
    })

    setSalvando(true)
    const ok = await executar(async () => {
      if (recEditada) {
        const alteracoes = { ...comum, ...extras, valor_centavos: valor, dia }
        await aplicarPlanoRecorrencia(recEditada, planejarEdicaoRecorrencia(dados, recEditada, alteracoes, aPartirDe))
      } else if (gastoEditado && tipo === 'parcelado') {
        // Refaz a compra inteira com o novo total e número de parcelas.
        // Mantém o "pago" de cada parcela que continua existindo.
        const pagas = new Set(grupo.filter((g) => g.pago).map((g) => g.parcela_numero))
        await repo.excluirGastos(grupo.map((g) => g.id))
        await repo.criarGastos(
          gerarParcelas({ ...comum, total_centavos: valor, data, parcelas }, gastoEditado.grupo_id ?? crypto.randomUUID()).map(
            (p) => ({ ...p, ...extras, pago: pagas.has(p.parcela_numero) }),
          ),
        )
      } else if (gastoEditado) {
        const tipoGasto = gastoEditado.tipo === 'parcela' ? 'parcela' : certo ? 'certo_unico' : 'unico'
        await repo.atualizarGasto(gastoEditado.id, { ...comum, ...extras, valor_centavos: valor, data, tipo: tipoGasto })
      } else if (tipo === 'uma') {
        await repo.criarGastos([unico(certo ? 'certo_unico' : 'unico')])
      } else if (tipo === 'parcelado') {
        await repo.criarGastos(
          gerarParcelas({ ...comum, total_centavos: valor, data, parcelas }, crypto.randomUUID()).map((p) => ({ ...p, ...extras })),
        )
      } else {
        await repo.criarRecorrencia({
          ...comum,
          ...extras,
          valor_centavos: valor,
          dia: diaDe(data),
          inicio: mesDe(data),
          fim: null,
        })
      }
    })
    setSalvando(false)
    if (!ok) return
    if (!editando && mesDe(data) !== mes && tipo === 'uma') {
      avisar(`Gasto salvo em ${nomeDoMes(mesDe(data))}.`)
    }
    aoFechar()
  }

  const titulo = recEditada
    ? 'Editar gasto de todo mês'
    : gastoEditado
      ? gastoEditado.tipo === 'parcela'
        ? 'Editar compra parcelada'
        : 'Editar gasto'
      : 'Novo gasto'

  return (
    <Folha titulo={titulo} aoFechar={aoFechar}>
      <form className="form-gasto" onSubmit={salvar} noValidate>
        <label className="campo-valor">
          <span>{tipo === 'parcelado' ? 'Total da compra' : 'Valor'}</span>
          <div>
            <span className="campo-valor-moeda">R$</span>
            <input
              inputMode="decimal"
              placeholder="0,00"
              value={valorTexto}
              onChange={(e) => setValorTexto(e.target.value.replace(/[^\d.,]/g, ''))}
              autoFocus={!editando}
              aria-label="Valor"
            />
          </div>
          {textoParcelas && <small className="destaque-parcelas">{textoParcelas}</small>}
        </label>

        {!editando && (
          <div className="segmentado" role="radiogroup" aria-label="Tipo">
            {TIPOS.map((t) => (
              <button
                key={t.id}
                type="button"
                role="radio"
                aria-checked={tipo === t.id}
                className={tipo === t.id ? 'ativo' : ''}
                onClick={() => setTipo(t.id)}
              >
                {t.rotulo}
              </button>
            ))}
          </div>
        )}

        <label className="campo">
          <span>Descrição</span>
          <input
            value={descricao}
            onChange={(e) => mudarDescricao(e.target.value)}
            placeholder="Ex.: Uber, Mercado"
            autoCapitalize="sentences"
            enterKeyHint="done"
          />
        </label>
        {!editando && sugestoes.length > 0 && (
          <div className="chips" aria-label="Sugestões de descrição">
            {sugestoes.map((s) => (
              <button
                key={s}
                type="button"
                className={`chip${descricao === s ? ' ativo' : ''}`}
                onClick={() => mudarDescricao(s)}
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {tipo === 'parcelado' && (
          <div className="campo">
            <span>Parcelas</span>
            <div className="contador">
              <button type="button" aria-label="Menos parcelas" onClick={() => setParcelas((p) => Math.max(2, p - 1))}>
                −
              </button>
              <strong>{parcelas}x</strong>
              <button type="button" aria-label="Mais parcelas" onClick={() => setParcelas((p) => Math.min(48, p + 1))}>
                +
              </button>
            </div>
          </div>
        )}

        {recEditada ? (
          <label className="campo">
            <span>Dia do mês em que cai</span>
            <input
              type="number"
              inputMode="numeric"
              min={1}
              max={31}
              value={dia}
              onChange={(e) => setDia(Math.min(31, Math.max(1, Number(e.target.value) || 1)))}
            />
          </label>
        ) : (
          <label className="campo">
            <span>{tipo === 'parcelado' ? 'Data da compra' : tipo === 'todo_mes' ? 'Primeira vez' : 'Data'}</span>
            <input type="date" value={data} onChange={(e) => setData(e.target.value)} required />
          </label>
        )}

        {tipo === 'todo_mes' && !recEditada && /^\d{4}-\d{2}-\d{2}$/.test(data) && (
          <p className="nota">
            Cai todo dia {diaDe(data)}, a partir de {tituloDoMes(mesDe(data), mesAtual).toLowerCase()} (no último dia,
            nos meses mais curtos).
          </p>
        )}
        {recEditada && (
          <p className="nota">
            A mudança vale de {tituloDoMes(aPartirDe, mesAtual).toLowerCase()} em diante. Os meses anteriores não
            mudam.
          </p>
        )}
        {gastoEditado?.tipo === 'parcela' && !grupoCompleto && (
          <p className="nota">
            Parcela {gastoEditado.parcela_numero} de {gastoEditado.parcela_total}. As outras parcelas desta compra
            não estão no app, então só esta é editada.
          </p>
        )}

        <label className="campo">
          <span>Observação (opcional)</span>
          <input
            value={observacao}
            onChange={(e) => setObservacao(e.target.value)}
            placeholder="Ex.: pago com o salário, Pix da mãe"
            maxLength={120}
          />
        </label>
        {sugestoesObs.length > 0 && (
          <div className="chips" aria-label="Sugestões de observação">
            {sugestoesObs.map((o) => (
              <button
                key={o}
                type="button"
                className={`chip${observacao === o ? ' ativo' : ''}`}
                onClick={() => setObservacao(observacao === o ? '' : o)}
              >
                {o}
              </button>
            ))}
          </div>
        )}

        {aba === 'nubank' && (
          <button
            type="button"
            className={`botao-dinheiro${dinheiroAParte ? ' ativo' : ''}`}
            aria-pressed={dinheiroAParte}
            onClick={() => setDinheiroAParte((v) => !v)}
          >
            <span className="botao-dinheiro-icone">{dinheiroAParte ? '✓' : '💵'}</span>
            <span>
              Paguei com dinheiro à parte
              <small>Fica na lista, mas não entra no livre para gastar nem na barra do card.</small>
            </span>
          </button>
        )}

        <label className="alternar">
          <input type="checkbox" checked={separado} onChange={(e) => setSeparado(e.target.checked)} />
          <span>
            Gasto à parte
            <small>Aparece separado e não soma com os outros gastos do mês (mas desconta do livre).</small>
          </span>
        </label>

        {aba === 'nubank' && (
          <div className="campo">
            <span>Forma</span>
            <div className="segmentado pequeno" role="radiogroup" aria-label="Crédito ou débito">
              {(['credito', 'debito'] as Forma[]).map((f) => (
                <button
                  key={f}
                  type="button"
                  role="radio"
                  aria-checked={forma === f}
                  className={forma === f ? 'ativo' : ''}
                  onClick={() => {
                    setForma(f)
                    setFormaEscolhida(true)
                  }}
                >
                  {f === 'credito' ? 'Crédito' : 'Débito'}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="campo">
          <span>Categoria</span>
          <div className="chips chips-categorias">
            {CATEGORIAS.map((c) => (
              <button
                key={c.nome}
                type="button"
                className={`chip${categoria === c.nome ? ' ativo' : ''}`}
                style={categoria === c.nome ? { borderColor: c.cor, background: `${c.cor}26` } : undefined}
                onClick={() => {
                  setCategoria(c.nome)
                  setCategoriaEscolhida(true)
                }}
              >
                <span aria-hidden="true">{c.icone}</span> {c.nome}
              </button>
            ))}
          </div>
        </div>

        {erro && <p className="erro">{erro}</p>}

        <button type="submit" className={`botao-principal botao-${aba}`} disabled={salvando}>
          {salvando ? 'Salvando…' : editando ? 'Salvar alterações' : 'Salvar gasto'}
        </button>
      </form>
    </Folha>
  )
}
