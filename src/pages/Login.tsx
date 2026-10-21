import { useState } from 'react'
import { Logo } from '../componentes/icones'
import { supabase } from '../data/supabaseRepo'

export default function Login() {
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [entrando, setEntrando] = useState(false)

  const entrar = async (e: React.FormEvent) => {
    e.preventDefault()
    setEntrando(true)
    setErro(null)
    const { error } = await supabase!.auth.signInWithPassword({ email: email.trim(), password: senha })
    setEntrando(false)
    if (error) setErro(error.message === 'Invalid login credentials' ? 'E-mail ou senha incorretos.' : error.message)
  }

  return (
    <div className="login">
      <div className="login-logos">
        <Logo aba="nubank" tamanho={44} />
        <Logo aba="caju" tamanho={44} />
      </div>
      <h1>Gastos</h1>
      <p>Entre para ver seus gastos do Nubank e do Caju.</p>
      <form onSubmit={entrar} className="form-gasto">
        <label className="campo">
          <span>E-mail</span>
          <input type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <label className="campo">
          <span>Senha</span>
          <input
            type="password"
            autoComplete="current-password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            required
          />
        </label>
        {erro && <p className="erro">{erro}</p>}
        <button type="submit" className="botao-principal botao-nubank" disabled={entrando}>
          {entrando ? 'Entrando…' : 'Entrar'}
        </button>
      </form>
    </div>
  )
}
