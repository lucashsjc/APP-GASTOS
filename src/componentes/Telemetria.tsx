import { useState } from 'react'
import type { Aba } from '../data/types'
import { useEstado } from '../estado'
import { cardCaju, resumoNubank } from '../lib/calculos'
import { diasRestantesNoMes, mesDe, nomeDoMes } from '../lib/datas'
import { formatarReais, lerReais } from '../lib/dinheiro'
import { ideal, ritmoDoMes, simularCompra, type Ritmo } from '../lib/ritmo'
import { Folha } from './Folha'

/** Card "Telemetria do mês": o delta contra o ritmo ideal e o gráfico, com o botão "Posso comprar?". */
export function CardTelemetria({ aba, aoLancar }: { aba: Aba; aoLancar: (valor: number, parcelas: number) => void }) {
  const { dados, hoje, mes } = useEstado()
  const [simulando, setSimulando] = useState(false)
  const r = ritmoDoMes(dados, aba, mes, hoje)
  const atual = mes === mesDe(hoje)

  return (
    <section className="card telemetria">
      {r ? (
        <>
          <div className="telemetria-topo">
            <span className="telemetria-rotulo">Telemetria · {nomeDoMes(mes)}</span>
            <span className={`telemetria-selo ${r.delta <= 0 ? 'bom' : 'ruim'}`}>
              {r.delta <= 0 ? 'Abaixo do ritmo' : 'Acima do ritmo'}
            </span>
          </div>
          <strong className={`telemetria-delta ${r.delta <= 0 ? 'bom' : 'ruim'}`}>
            {r.delta <= 0 ? '−' : '+'}
            {formatarReais(Math.abs(r.delta))}
          </strong>
          <p className="telemetria-legenda">
            {atual ? 'Até hoje' : `No fim de ${nomeDoMes(mes)}`}: você gastou {formatarReais(r.real[r.real.length - 1] ?? 0)} no dia
            a dia; o ritmo ideal era {formatarReais(ideal(r, r.diaAtual))}.
          </p>
          <Grafico r={r} />
          {atual && (
            <p className="telemetria-legenda">
              {r.porDiaDaqui === null
                ? 'O dinheiro do dia a dia deste mês já acabou.'
                : <>Para fechar no ritmo: até <b>{formatarReais(r.porDiaDaqui)}</b> por dia até o fim do mês.</>}
            </p>
          )}
        </>
      ) : (
        <p className="telemetria-legenda">
          {aba === 'nubank' ? 'Coloque o recebido do mês' : 'Registre o depósito do Caju'} para ver a telemetria do mês.
        </p>
      )}
      {atual && (
        <button type="button" className="botao-posso" onClick={() => setSimulando(true)}>
          Posso comprar?
        </button>
      )}
      {simulando && (
        <FolhaPossoComprar
          aba={aba}
          orcamento={r?.orcamento ?? 0}
          aoFechar={() => setSimulando(false)}
          aoLancar={(v, p) => {
            setSimulando(false)
            aoLancar(v, p)
          }}
        />
      )}
    </section>
  )
}

/** Gráfico de telemetria: a linha do ritmo ideal (tracejada) e a do gasto real, dia a dia. */
function Grafico({ r }: { r: Ritmo }) {
  const L = 320
  const A = 110
  const topo = Math.max(r.orcamento, r.real[r.real.length - 1] ?? 0, 1)
  const x = (d: number) => ((d - 1) / Math.max(1, r.dias - 1)) * L
  const y = (v: number) => A - (Math.max(0, v) / topo) * (A - 8)
  const pontos = r.real.map((v, i) => `${x(i + 1).toFixed(1)},${y(v).toFixed(1)}`).join(' ')
  const ultimo = r.real.length
  const cor = r.delta <= 0 ? 'var(--pastel-azul)' : 'var(--negativo)'
  return (
    <svg className="telemetria-grafico" viewBox={`-4 -4 ${L + 8} ${A + 22}`} role="img" aria-label="Gasto do mês contra o ritmo ideal">
      {[0.25, 0.5, 0.75].map((f) => (
        <line key={f} x1={0} x2={L} y1={A * f} y2={A * f} className="telemetria-grade" />
      ))}
      <line x1={x(1)} y1={y(ideal(r, 1))} x2={x(r.dias)} y2={y(r.orcamento)} className="telemetria-ideal" />
      {ultimo > 1 && <polyline points={pontos} fill="none" stroke={cor} strokeWidth={3} strokeLinejoin="round" strokeLinecap="round" />}
      {ultimo > 0 && <circle cx={x(ultimo)} cy={y(r.real[ultimo - 1])} r={5} fill={cor} />}
      <text x={0} y={A + 16} className="telemetria-eixo">
        1
      </text>
      <text x={L} y={A + 16} textAnchor="end" className="telemetria-eixo">
        {r.dias}
      </text>
      <text x={x(ultimo)} y={A + 16} textAnchor="middle" className="telemetria-eixo forte">
        {ultimo < r.dias - 2 && ultimo > 2 ? `dia ${ultimo}` : ''}
      </text>
    </svg>
  )
}

/** "Posso comprar?": digita o valor (e as parcelas) e vê se cabe no mês. */
function FolhaPossoComprar({
  aba,
  orcamento,
  aoFechar,
  aoLancar,
}: {
  aba: Aba
  orcamento: number
  aoFechar: () => void
  aoLancar: (valor: number, parcelas: number) => void
}) {
  const { dados, hoje, mes } = useEstado()
  const [texto, setTexto] = useState('')
  const [parcelas, setParcelas] = useState(1)
  const valor = lerReais(texto)
  const disponivel = aba === 'nubank' ? resumoNubank(dados, mes, hoje).livre : cardCaju(dados, mes, hoje).saldo
  const s = valor && valor > 0 ? simularCompra(disponivel, orcamento, valor, aba === 'nubank' ? parcelas : 1, diasRestantesNoMes(hoje)) : null
  const titulo = aba === 'nubank' ? 'Livre no mês' : 'Saldo do Caju'

  return (
    <Folha titulo="Posso comprar?" aoFechar={aoFechar}>
      <div className="form-gasto">
        <label className="campo-valor">
          <span>Quanto custa</span>
          <div>
            <span className="campo-valor-moeda">R$</span>
            <input
              inputMode="decimal"
              placeholder="0,00"
              value={texto}
              onChange={(e) => setTexto(e.target.value.replace(/[^\d.,]/g, ''))}
              autoFocus
              aria-label="Valor da compra"
            />
          </div>
        </label>
        {aba === 'nubank' && (
          <div className="campo">
            <span>Parcelas</span>
            <div className="contador">
              <button type="button" aria-label="Menos parcelas" onClick={() => setParcelas((p) => Math.max(1, p - 1))}>
                −
              </button>
              <strong>{parcelas === 1 ? 'À vista' : `${parcelas}x`}</strong>
              <button type="button" aria-label="Mais parcelas" onClick={() => setParcelas((p) => Math.min(24, p + 1))}>
                +
              </button>
            </div>
          </div>
        )}

        {s ? (
          <section className={`veredito veredito-${s.veredito}`}>
            <strong className="veredito-titulo">
              {s.veredito === 'cabe' ? '✅ Cabe no mês' : s.veredito === 'aperta' ? '⚠️ Cabe, mas aperta' : '❌ Estoura o mês'}
            </strong>
            <div className="veredito-linha">
              <span>{titulo}</span>
              <span>
                {formatarReais(s.antes)} → <b>{formatarReais(s.depois)}</b>
              </span>
            </div>
            {(s.porDiaAntes !== null || s.porDiaDepois !== null) && (
              <div className="veredito-linha">
                <span>Por dia até o fim do mês</span>
                <span>
                  {s.porDiaAntes === null ? '—' : formatarReais(s.porDiaAntes)} →{' '}
                  <b>{s.porDiaDepois === null ? 'acabou' : formatarReais(s.porDiaDepois)}</b>
                </span>
              </div>
            )}
            {s.parcelaSeguinte !== null && (
              <div className="veredito-linha">
                <span>Nos próximos {s.mesesSeguintes} {s.mesesSeguintes === 1 ? 'mês' : 'meses'}</span>
                <span>
                  <b>{formatarReais(s.parcelaSeguinte)}</b> por mês
                </span>
              </div>
            )}
            <button type="button" className="botao-principal botao-nubank" onClick={() => aoLancar(valor!, parcelas)}>
              Lançar esta compra
            </button>
          </section>
        ) : (
          <p className="nota">Digite o valor para ver se cabe no {aba === 'nubank' ? 'livre do mês' : 'saldo do Caju'}.</p>
        )}
      </div>
    </Folha>
  )
}
