import { Link } from 'react-router-dom'
import { IconeProximo, Logo } from '../componentes/icones'
import { BotaoMenu } from '../componentes/MenuLateral'
import { useEstado } from '../estado'
import { useFaculdade } from '../faculdade/estado'
import { aulasDoDia, formatarNota, prazoAtividade, provasProximas } from '../faculdade/regras'
import { repoFaculdade } from '../faculdade/repo'
import { avisosDinheiro } from '../lib/avisos'
import { cardCaju, resumoNubank } from '../lib/calculos'
import { dataCurta, mesDe } from '../lib/datas'
import { formatarReais, partesDoValor } from '../lib/dinheiro'
import { Carrossel, type Slide } from './Carrossel'
import { alertasFaculdade, atividadesUrgentes, dataPorExtenso, saudacao } from './resumo'

/** Tela inicial: o resumo do dia (dinheiro, o que vai cair e a faculdade). */
export default function PaginaHoje() {
  const { dados, hoje } = useEstado()
  const faculdade = useFaculdade()
  const nubank = resumoNubank(dados, mesDe(hoje), hoje)
  const livre = nubank.livre
  const caju = cardCaju(dados, mesDe(hoje), hoje)
  const atividades = atividadesUrgentes(faculdade.dados.atividades, hoje)
  const aulas = aulasDoDia(faculdade.dados.aulas, hoje)
  const provas = provasProximas(faculdade.dados, hoje)
  // O aviso de nota não se repete quando a prova da matéria já aparece na lista.
  const comProva = new Set(provas.filter((p) => p.precisa !== null).map((p) => p.disciplina?.id))
  const avisos = avisosDinheiro(dados, hoje)
  const alertas = alertasFaculdade(faculdade.dados).filter((a) => !(a.tipo === 'nota' && comProva.has(a.disciplina.id)))

  // Os cards do carrossel: a próxima prova (se tiver), o livre do Nubank, o saldo do Caju e as aulas de hoje.
  const valor = (centavos: number) => {
    const p = partesDoValor(centavos)
    return (
      <>
        {p.sinal}R$ {p.inteiro}
        <small>,{p.centavos}</small>
      </>
    )
  }
  const gasto = nubank.certos.total + nubank.outros
  const prova = provas[0]
  const slides: Slide[] = [
    ...(prova
      ? [
          {
            chave: 'prova',
            para: '/faculdade/calendario',
            etiqueta: `Próxima prova · ${prova.dias === 0 ? 'hoje' : prova.dias === 1 ? 'amanhã' : `em ${prova.dias} dias`}`,
            numero: prova.precisa !== null ? formatarNota(prova.precisa) : dataCurta(prova.nota.data!),
            titulo:
              prova.precisa !== null
                ? `${prova.nota.descricao} de ${prova.disciplina?.nome ?? ''}: é o que você precisa para passar`
                : `${prova.nota.descricao} de ${prova.disciplina?.nome ?? ''}`,
            detalhe: dataPorExtenso(prova.nota.data!),
          },
        ]
      : []),
    {
      chave: 'nubank',
      para: '/nubank',
      etiqueta: (
        <>
          <Logo aba="nubank" tamanho={18} /> Nubank · livre no mês
        </>
      ),
      numero: valor(livre),
      negativo: livre < 0,
      titulo: livre < 0 ? 'Passou do que recebeu neste mês' : 'Livre para gastar até o fim do mês',
      detalhe: `Gasto ${formatarReais(gasto)}${nubank.recebido > 0 ? ` · ${Math.round((gasto / nubank.recebido) * 100)}% do recebido` : ''}`,
    },
    {
      chave: 'caju',
      para: '/caju',
      etiqueta: (
        <>
          <Logo aba="caju" tamanho={18} /> Caju · saldo do mês
        </>
      ),
      numero: valor(caju.saldo),
      negativo: caju.saldo < 0,
      titulo:
        caju.modo === 'atual' && caju.porDia !== null
          ? `Dá para gastar ${formatarReais(caju.porDia)} por dia`
          : 'Saldo do Caju esgotado neste mês',
      detalhe: caju.modo === 'atual' ? `Até o fim do mês (${caju.diasRestantes} ${caju.diasRestantes === 1 ? 'dia' : 'dias'})` : undefined,
    },
    ...(aulas.length
      ? [
          {
            chave: 'aulas',
            para: '/faculdade/faltas',
            etiqueta: 'Aulas de hoje',
            numero: aulas[0].inicio ?? `${aulas.length}`,
            titulo: aulas
              .map((a) => faculdade.dados.disciplinas.find((x) => x.id === a.disciplina_id)?.nome)
              .filter(Boolean)
              .join(' e '),
            detalhe: aulas.map((a) => `${a.inicio ?? ''} ${a.quantidade} ${a.quantidade === 1 ? 'aula' : 'aulas'}`.trim()).join(' · '),
          },
        ]
      : []),
  ]
  const semFaculdade = !faculdade.carregando && !faculdade.erro && !faculdade.dados.disciplinas.length && !faculdade.dados.atividades.length

  return (
    <div className="pagina pagina-hoje">
      <header className="topo">
        <div className="topo-com-menu">
          <BotaoMenu />
          <h1>{saudacao()}, Lucas!</h1>
        </div>
        <p className="data-hoje">{dataPorExtenso(hoje)}</p>
      </header>

      <Carrossel slides={slides} />

      {avisos.length > 0 && (
        <section className="secao">
          <h2>Avisos</h2>
          <ul className="lista lista-alertas">
            {avisos.map((a) => (
              <li key={a.chave}>
                <Link to={a.rota} className={`alerta-linha${a.grave ? ' grave' : ''}`}>
                  <i className={`ponto ponto-grande ${a.grave ? 'ponto-grave' : 'ponto-atencao'}`} />
                  <span>
                    <strong>{a.titulo}</strong>
                    <small>{a.texto}</small>
                  </span>
                  <IconeProximo tamanho={16} />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="secao">
        <h2>
          Faculdade
          <Link to="/faculdade/calendario" className="link-secao">
            Abrir <IconeProximo tamanho={14} />
          </Link>
        </h2>

        {faculdade.erro ? (
          <p className="vazio">A Faculdade ainda não está configurada no banco.</p>
        ) : semFaculdade ? (
          <Link to="/faculdade" className="card vazio-link">
            Cadastre suas disciplinas e atividades para ver aqui o que vence e os avisos de notas e faltas.
          </Link>
        ) : (
          <>
            {provas.length > 0 && (
              <ul className="lista">
                {provas.map((p) => (
                  <li key={p.nota.id}>
                    <Link to="/faculdade/calendario" className="linha-atividade">
                      <span className="etiqueta-prova">Prova</span>
                      <span className="linha-texto">
                        <strong>
                          {p.nota.descricao}
                          {p.disciplina && ` · ${p.disciplina.nome}`}
                        </strong>
                        <small>{p.precisa !== null ? `Precisa de ${formatarNota(p.precisa)} para passar` : 'Bons estudos!'}</small>
                      </span>
                      <span className={`prazo prazo-${p.dias <= 3 ? 'hoje' : 'perto'}`}>
                        {p.dias === 0 ? 'Hoje' : p.dias === 1 ? 'Amanhã' : `Em ${p.dias} dias`}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}

            {atividades.length > 0 ? (
              <ul className="lista">
                {atividades.map((a) => {
                  const disc = faculdade.dados.disciplinas.find((d) => d.id === a.disciplina_id)
                  const prazo = prazoAtividade(a, hoje)
                  return (
                    <li key={a.id}>
                      <div className="linha-atividade">
                        <button
                          type="button"
                          className="marcar"
                          aria-label="Marcar como entregue"
                          onClick={() => faculdade.executar(() => repoFaculdade.atualizar('atividades', a.id, { feita: true }))}
                        />
                        <Link to="/faculdade/calendario" className="linha-texto">
                          <strong>{a.titulo}</strong>
                          <small>
                            {disc && (
                              <>
                                <i className="ponto" style={{ background: disc.cor }} /> {disc.nome}
                              </>
                            )}
                          </small>
                        </Link>
                        <span className={`prazo prazo-${prazo.nivel}`}>{prazo.texto}</span>
                      </div>
                    </li>
                  )
                })}
              </ul>
            ) : (
              <p className="vazio">Nenhuma atividade para os próximos 7 dias.</p>
            )}

            {alertas.length > 0 && (
              <ul className="lista lista-alertas">
                {alertas.map((al) => (
                  <li key={`${al.tipo}-${al.disciplina.id}`}>
                    <Link
                      to={al.tipo === 'faltas' ? '/faculdade/faltas' : '/faculdade/notas'}
                      className={`alerta-linha${al.grave ? ' grave' : ''}`}
                    >
                      <i className="ponto ponto-grande" style={{ background: al.disciplina.cor }} />
                      <span>
                        <strong>{al.disciplina.nome}</strong>
                        <small>{al.texto}</small>
                      </span>
                      <IconeProximo tamanho={16} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </section>
    </div>
  )
}
