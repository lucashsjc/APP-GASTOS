import DOMPurify from 'dompurify'
import { useEffect, useState } from 'react'
import { readmeParaHtml, urlReadme } from './projetos'

// Links do README abrem fora do app.
DOMPurify.addHook('afterSanitizeAttributes', (no) => {
  if (no.tagName === 'A' && /^https?:/.test(no.getAttribute('href') ?? '')) {
    no.setAttribute('target', '_blank')
    no.setAttribute('rel', 'noopener noreferrer')
  }
})

const chave = (repo: string) => `readme:${repo}`

function lerCache(repo: string): string | null {
  try {
    return localStorage.getItem(chave(repo))
  } catch {
    return null
  }
}

/**
 * README do repositório já em HTML seguro. Mostra a última versão guardada (funciona sem internet)
 * e atualiza com a do GitHub.
 */
export function useReadme(repo: string): { html: string | null; erro: boolean } {
  const [markdown, setMarkdown] = useState<string | null>(() => lerCache(repo))
  const [erro, setErro] = useState(false)

  useEffect(() => {
    let ativo = true
    fetch(urlReadme(repo), { cache: 'no-cache' })
      .then((r) => {
        if (!r.ok) throw new Error(String(r.status))
        return r.text()
      })
      .then((texto) => {
        if (!ativo) return
        setMarkdown(texto)
        setErro(false)
        try {
          localStorage.setItem(chave(repo), texto)
        } catch {
          // sem armazenamento: só não guarda para depois
        }
      })
      .catch(() => ativo && setErro(true))
    return () => {
      ativo = false
    }
  }, [repo])

  return { html: markdown === null ? null : DOMPurify.sanitize(readmeParaHtml(markdown, repo)), erro }
}
