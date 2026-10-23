// Ícones em SVG (traço fino) e os logos dos cartões (imagens em public/logos, escolhidas pelo Lucas).

import type { Aba } from '../data/types'

type Props = { tamanho?: number }

function Svg({ tamanho = 20, children }: Props & { children: React.ReactNode }) {
  return (
    <svg
      width={tamanho}
      height={tamanho}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  )
}

export const IconeMais = (p: Props) => (
  <Svg {...p}>
    <path d="M12 5v14M5 12h14" />
  </Svg>
)

export const IconeAnterior = (p: Props) => (
  <Svg {...p}>
    <path d="M15 18l-6-6 6-6" />
  </Svg>
)

export const IconeProximo = (p: Props) => (
  <Svg {...p}>
    <path d="M9 18l6-6-6-6" />
  </Svg>
)

export const IconeAjustes = (p: Props) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
  </Svg>
)

export const IconeLapis = (p: Props) => (
  <Svg {...p}>
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />
  </Svg>
)

export const IconeCheck = (p: Props) => (
  <Svg {...p}>
    <path d="M20 6L9 17l-5-5" />
  </Svg>
)

export const IconeSeta = (p: Props) => (
  <Svg {...p}>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </Svg>
)

export function Logo({ aba, tamanho = 26 }: { aba: Aba; tamanho?: number }) {
  return (
    <img
      className={`logo logo-${aba}`}
      src={`/logos/${aba}.png`}
      width={tamanho}
      height={tamanho}
      alt=""
      aria-hidden="true"
      draggable={false}
    />
  )
}

/** Ícones das categorias, no mesmo traço fino dos outros. */
export function IconeCategoria({ nome, tamanho = 20 }: { nome: string; tamanho?: number }) {
  const p = { tamanho }
  switch (nome) {
    case 'Alimentação':
      return (
        <Svg {...p}>
          <path d="M7 3v8M4.5 3v5a2.5 2.5 0 0 0 5 0V3M7 11v10M17 21V3c-2.2 1.4-3 4-3 7v4h3" />
        </Svg>
      )
    case 'Mercado':
      return (
        <Svg {...p}>
          <circle cx="9" cy="20" r="1.3" />
          <circle cx="18" cy="20" r="1.3" />
          <path d="M2.5 3h3l2.4 12h11l2-8H6.6" />
        </Svg>
      )
    case 'Transporte':
      return (
        <Svg {...p}>
          <path d="M5 17h14M5 17v2M19 17v2M4 13l1.8-5.2A2 2 0 0 1 7.7 6.5h8.6a2 2 0 0 1 1.9 1.3L20 13M4 13h16v4H4z" />
          <circle cx="7.5" cy="15" r=".6" />
          <circle cx="16.5" cy="15" r=".6" />
        </Svg>
      )
    case 'Compras':
      return (
        <Svg {...p}>
          <path d="M5 8h14l-1 13H6zM9 8V6a3 3 0 0 1 6 0v2" />
        </Svg>
      )
    case 'Fixos':
      return (
        <Svg {...p}>
          <path d="M17 2l3 3-3 3M3 11V9a4 4 0 0 1 4-4h13M7 22l-3-3 3-3M21 13v2a4 4 0 0 1-4 4H4" />
        </Svg>
      )
    case 'Saúde':
      return (
        <Svg {...p}>
          <path d="M3 12h4l2-5 4 10 2-5h6" />
        </Svg>
      )
    case 'Lazer':
      return (
        <Svg {...p}>
          <path d="M3 9a2 2 0 0 0 0 6v3h18v-3a2 2 0 0 1 0-6V6H3zM14 6v12" />
        </Svg>
      )
    case 'Presentes':
      return (
        <Svg {...p}>
          <path d="M3 9h18v4H3zM5 13v8h14v-8M12 9v12M12 9C10 5 6.5 5.5 7.5 8 8 9 12 9 12 9zM12 9c2-4 5.5-3.5 4.5-1-.5 1-4.5 1-4.5 1z" />
        </Svg>
      )
    case 'Depósito':
      return (
        <Svg {...p}>
          <path d="M12 4v12M6 10l6 6 6-6M5 20h14" />
        </Svg>
      )
    default:
      return (
        <Svg {...p}>
          <circle cx="6" cy="12" r="1" />
          <circle cx="12" cy="12" r="1" />
          <circle cx="18" cy="12" r="1" />
        </Svg>
      )
  }
}

export const IconeNota = (p: Props) => (
  <Svg {...p}>
    <path d="M4 5h16v11H8l-4 4z" />
  </Svg>
)

export const IconeCarteira = (p: Props) => (
  <Svg {...p}>
    <path d="M3 7a2 2 0 0 1 2-2h13v4M3 7v11a2 2 0 0 0 2 2h15V9H5a2 2 0 0 1-2-2zM16 14.5h.01" />
  </Svg>
)

export const IconeMenu = (p: Props) => (
  <Svg {...p}>
    <path d="M4 7h16M4 12h16M4 17h16" />
  </Svg>
)

export const IconeFaculdade = (p: Props) => (
  <Svg {...p}>
    <path d="M2 9l10-5 10 5-10 5z" />
    <path d="M6 11v5c3 2.5 9 2.5 12 0v-5" />
  </Svg>
)

export const IconeTrabalho = (p: Props) => (
  <Svg {...p}>
    <rect x="3" y="7" width="18" height="13" rx="2" />
    <path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M3 13h18" />
  </Svg>
)

export const IconeBanco = (p: Props) => (
  <Svg {...p}>
    <rect x="2" y="5" width="20" height="14" rx="3" />
    <path d="M2 10h20M6 15h4" />
  </Svg>
)

export const IconeProjetos = (p: Props) => (
  <Svg {...p}>
    <path d="M12 3l2.6 5.6L20 9.5l-4 4 1 5.5-5-2.7-5 2.7 1-5.5-4-4 5.4-.9z" />
  </Svg>
)

export const IconeNotas = (p: Props) => (
  <Svg {...p}>
    <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
  </Svg>
)

export const IconeFaltas = (p: Props) => (
  <Svg {...p}>
    <rect x="3" y="5" width="18" height="16" rx="3" />
    <path d="M3 10h18M8 3v4M16 3v4M10 13.5l4 4M14 13.5l-4 4" />
  </Svg>
)

export const IconeAtividades = (p: Props) => (
  <Svg {...p}>
    <path d="M9 6h11M9 12h11M9 18h11" />
    <path d="M3.5 6l1.5 1.5L7.5 5M3.5 12l1.5 1.5 2.5-2.5" />
    <circle cx="5" cy="18" r="1.2" />
  </Svg>
)

export const IconeLivros = (p: Props) => (
  <Svg {...p}>
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5z" />
    <path d="M4 19.5A2.5 2.5 0 0 0 6.5 22H20v-5" />
  </Svg>
)

export const IconeHoje = (p: Props) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
  </Svg>
)
