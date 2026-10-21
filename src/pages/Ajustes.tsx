import { useState } from 'react'
import { Link } from 'react-router-dom'
import { IconeProximo } from '../componentes/icones'
import { modoDemonstracao, repo } from '../data/repo'
import { supabase } from '../data/supabaseRepo'
import { useEstado } from '../estado'
import { montarExportacao } from '../lib/exportar'
import { gerarXlsx } from '../lib/xlsx'

function baixar(bytes: Uint8Array, nome: string) {
  const blob = new Blob([bytes as BlobPart], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nome
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export default function Ajustes({ email }: { email: string | null }) {
  const { dados, hoje, executar, avisar } = useEstado()
  const [confirmandoRestaurar, setConfirmandoRestaurar] = useState(false)
  const total = dados.gastos.length + dados.recorrencias.length + dados.recebidos.length + dados.depositos.length

  const exportar = () => {
    baixar(gerarXlsx(montarExportacao(dados)), `gastos-${hoje}.xlsx`)
    avisar('Planilha baixada.')
  }

  return (
    <div className="pagina">
      <header className="topo">
        <h1>Ajustes</h1>
      </header>

      {modoDemonstracao && (
        <section className="card aviso">
          <strong>Modo demonstração</strong>
          <p>
            O Supabase não está configurado, então os dados são de exemplo (fictícios) e ficam só neste navegador.
            Veja no README como ligar o banco.
          </p>
        </section>
      )}

      <section className="secao">
        <h2>Dados</h2>
        <ul className="lista-menu">
          <li>
            <Link to="/ajustes/importar">
              <span>
                <strong>Importar da planilha</strong>
                <small>Traz o histórico do “Controle Financeiro.xlsx”.</small>
              </span>
              <IconeProximo />
            </Link>
          </li>
          <li>
            <button type="button" onClick={exportar}>
              <span>
                <strong>Exportar .xlsx</strong>
                <small>Cópia de segurança de tudo ({total} registros).</small>
              </span>
              <IconeProximo />
            </button>
          </li>
          {repo.restaurarExemplo && (
            <li>
              {confirmandoRestaurar ? (
                <div className="confirmar-inline">
                  <span>Apagar tudo neste navegador e voltar aos dados de exemplo?</span>
                  <div>
                    <button type="button" className="botao-texto" onClick={() => setConfirmandoRestaurar(false)}>
                      Não
                    </button>
                    <button
                      type="button"
                      className="botao-perigo"
                      onClick={async () => {
                        setConfirmandoRestaurar(false)
                        if (await executar(() => repo.restaurarExemplo!())) avisar('Dados de exemplo restaurados.')
                      }}
                    >
                      Restaurar
                    </button>
                  </div>
                </div>
              ) : (
                <button type="button" onClick={() => setConfirmandoRestaurar(true)}>
                  <span>
                    <strong>Restaurar dados de exemplo</strong>
                    <small>Só no modo demonstração.</small>
                  </span>
                  <IconeProximo />
                </button>
              )}
            </li>
          )}
        </ul>
      </section>

      {supabase && (
        <section className="secao">
          <h2>Conta</h2>
          <ul className="lista-menu">
            <li>
              <button type="button" onClick={() => supabase!.auth.signOut()}>
                <span>
                  <strong>Sair</strong>
                  <small>{email ?? ''}</small>
                </span>
              </button>
            </li>
          </ul>
        </section>
      )}

      <p className="rodape-ajustes">
        App de Gastos · código em{' '}
        <a href="https://github.com/lucashsjc/APP-GASTOS" target="_blank" rel="noreferrer">
          github.com/lucashsjc/APP-GASTOS
        </a>
      </p>
    </div>
  )
}
