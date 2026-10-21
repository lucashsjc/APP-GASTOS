import { useState } from 'react'
import { Link } from 'react-router-dom'
import { IconeAnterior } from '../componentes/icones'
import { repo } from '../data/repo'
import { useEstado } from '../estado'
import { dataCurta, tituloDoMes, mesDe } from '../lib/datas'
import { formatarReais } from '../lib/dinheiro'
import {
  gravacaoDaSugestao,
  lerPlanilhaDeGastos,
  planejarImportacao,
  type PlanoImportacao,
  type SugestaoCerto,
} from '../lib/importarPlanilha'

const TIPO_SUGESTAO: Record<SugestaoCerto['tipo'], string> = {
  todo_mes: 'Todo mês',
  parcela: 'Parcela',
  certo_unico: 'Só este mês',
}

export default function Importar() {
  const { dados, hoje, executar, avisar } = useEstado()
  const [plano, setPlano] = useState<PlanoImportacao | null>(null)
  const [nomeArquivo, setNomeArquivo] = useState('')
  const [escolhidas, setEscolhidas] = useState<Set<string>>(new Set())
  const [erro, setErro] = useState<string | null>(null)
  const [gravando, setGravando] = useState(false)
  const [concluido, setConcluido] = useState<string | null>(null)
  const mesAtual = mesDe(hoje)

  const abrir = async (arquivo: File | undefined) => {
    if (!arquivo) return
    setErro(null)
    setConcluido(null)
    setPlano(null)
    try {
      // Lido aqui mesmo, no navegador: o arquivo não é enviado para lugar nenhum.
      const meses = lerPlanilhaDeGastos(new Uint8Array(await arquivo.arrayBuffer()))
      const novo = planejarImportacao(meses, dados, hoje)
      setPlano(novo)
      setNomeArquivo(arquivo.name)
      setEscolhidas(new Set(novo.sugestoes.map((s) => s.chave)))
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e))
    }
  }

  const alternar = (chave: string) =>
    setEscolhidas((atual) => {
      const novo = new Set(atual)
      if (novo.has(chave)) novo.delete(chave)
      else novo.add(chave)
      return novo
    })

  const gravar = async () => {
    if (!plano) return
    setGravando(true)
    const sugestoes = plano.sugestoes.filter((s) => escolhidas.has(s.chave))
    const ok = await executar(async () => {
      await repo.criarGastos(plano.gastos)
      for (const r of plano.recebidos) await repo.salvarRecebido(r.mes, r.valor_centavos)
      for (const s of sugestoes) {
        const { recorrencia, gastos } = gravacaoDaSugestao(s, crypto.randomUUID())
        if (recorrencia) await repo.criarRecorrencia(recorrencia)
        if (gastos.length) await repo.criarGastos(gastos)
      }
    })
    setGravando(false)
    if (ok) {
      const texto = `Importados ${plano.gastos.length} gastos, ${plano.recebidos.length} recebidos e ${sugestoes.length} certos.`
      setConcluido(texto)
      avisar(texto)
      setPlano(null)
    }
  }

  return (
    <div className="pagina">
      <header className="topo">
        <div className="topo-linha">
          <Link to="/ajustes" className="voltar">
            <IconeAnterior tamanho={18} /> Ajustes
          </Link>
        </div>
        <h1>Importar da planilha</h1>
      </header>

      <section className="card">
        <p className="texto">
          Escolha o <strong>Controle Financeiro.xlsx</strong>. O app lê a aba SALÁRIO aqui mesmo no aparelho e mostra
          um resumo antes de gravar. Importar de novo não duplica nada.
        </p>
        <label className="botao-arquivo">
          <input type="file" accept=".xlsx" onChange={(e) => abrir(e.target.files?.[0])} />
          {nomeArquivo ? `Trocar arquivo (${nomeArquivo})` : 'Escolher arquivo .xlsx'}
        </label>
        {erro && <p className="erro">{erro}</p>}
        {concluido && <p className="sucesso">{concluido}</p>}
      </section>

      {plano && (
        <>
          <section className="secao">
            <h2>Meses encontrados</h2>
            <div className="card tabela-wrap">
              <table className="tabela">
                <thead>
                  <tr>
                    <th>Mês</th>
                    <th>Gastos</th>
                    <th>Total</th>
                    <th>Recebido</th>
                  </tr>
                </thead>
                <tbody>
                  {plano.meses.map((m) => (
                    <tr key={m.mes} className={m.futuro ? 'futuro' : undefined}>
                      <td>
                        {tituloDoMes(m.mes, mesAtual)}
                        {m.futuro && <small> · futuro</small>}
                      </td>
                      <td>{m.quantidade}</td>
                      <td>{formatarReais(m.total_centavos)}</td>
                      <td>{m.recebido_centavos ? formatarReais(m.recebido_centavos) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="dica">
              Até {tituloDoMes(mesAtual, mesAtual).toLowerCase()}: {plano.gastos.length} gastos novos entram como “uma
              vez” no Nubank (Crédito)
              {plano.duplicados > 0 && `; ${plano.duplicados} já existiam e serão ignorados`}. Os meses futuros não viram
              gastos soltos: veja os certos abaixo.
            </p>
          </section>

          {plano.sugestoes.length > 0 && (
            <section className="secao">
              <h2>Certos encontrados nos meses futuros</h2>
              <ul className="lista-sugestoes">
                {plano.sugestoes.map((s) => (
                  <li key={s.chave}>
                    <label className="alternar">
                      <input type="checkbox" checked={escolhidas.has(s.chave)} onChange={() => alternar(s.chave)} />
                      <span>
                        <strong>
                          {s.descricao} · {formatarReais(s.valor_centavos)}
                        </strong>
                        <small>
                          {TIPO_SUGESTAO[s.tipo]}
                          {s.tipo === 'todo_mes' && `, dia ${s.dia}, a partir de ${tituloDoMes(s.inicio, mesAtual).toLowerCase()}`}
                          {s.tipo === 'parcela' &&
                            `: ${s.parcelas.map((p) => `${p.numero} de ${s.parcela_total} em ${dataCurta(p.data)}`).join(', ')}`}
                          {s.tipo === 'certo_unico' && ` em ${dataCurta(s.data)}`} · {s.categoria}
                        </small>
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <button
            type="button"
            className="botao-principal botao-nubank"
            disabled={gravando || (plano.gastos.length === 0 && plano.recebidos.length === 0 && escolhidas.size === 0)}
            onClick={gravar}
          >
            {gravando ? 'Importando…' : 'Importar'}
          </button>
        </>
      )}
    </div>
  )
}
