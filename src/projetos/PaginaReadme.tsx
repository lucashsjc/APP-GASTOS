import { Link, Navigate, useParams } from 'react-router-dom'
import { IconeAnterior } from '../componentes/icones'
import { PROJETOS, urlGithub } from './projetos'
import { useReadme } from './useReadme'

export default function PaginaReadme() {
  const { repo = '' } = useParams()
  const projeto = PROJETOS.find((p) => p.repo === repo)
  const { html, erro } = useReadme(projeto?.repo ?? PROJETOS[0].repo)
  if (!projeto) return <Navigate to="/projetos" replace />

  return (
    <div className="pagina">
      <header className="topo">
        <div className="topo-linha">
          <Link to="/projetos" className="voltar">
            <IconeAnterior tamanho={18} /> Projetos
          </Link>
          <a href={urlGithub(projeto.repo)} target="_blank" rel="noopener noreferrer" className="voltar">
            Abrir no GitHub
          </a>
        </div>
      </header>

      {erro && !html && (
        <section className="card aviso">
          <strong>Não foi possível carregar o README</strong>
          <p>Confira a internet e tente de novo, ou abra direto no GitHub.</p>
        </section>
      )}
      {!erro && !html && <p className="vazio">Carregando o README…</p>}
      {html && (
        // O HTML vem do README do repositório e passa pelo DOMPurify (ver useReadme).
        <article className="card markdown" dangerouslySetInnerHTML={{ __html: html }} />
      )}
      {erro && html && <p className="dica">Sem conexão: mostrando a última versão guardada.</p>}
    </div>
  )
}
