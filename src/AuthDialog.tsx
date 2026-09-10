import { useState, type FormEvent } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from './lib/cryptolensSupabase'

type Props = {
  user: User | null
  onClose: () => void
}

export default function AuthDialog({ user, onClose }: Props) {
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState(user?.email ?? '')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setLoading(true)
    setError('')
    setMessage('')
    try {
      if (mode === 'signup') {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { data: { name: name.trim() || undefined } },
        })
        if (signUpError) throw signUpError
        if (!data.session) {
          setMessage('Conta criada. Confira seu e-mail para confirmar o cadastro e depois entre no CryptoLens.')
        } else {
          onClose()
        }
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
        if (signInError) throw signInError
        onClose()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível autenticar agora.')
    } finally {
      setLoading(false)
    }
  }

  const signOut = async () => {
    setLoading(true)
    setError('')
    const { error: signOutError } = await supabase.auth.signOut()
    setLoading(false)
    if (signOutError) setError(signOutError.message)
    else onClose()
  }

  const displayName = user?.user_metadata?.name || user?.user_metadata?.full_name || user?.email || 'Conta CryptoLens'

  return <div className="dialog-backdrop" role="presentation" onMouseDown={onClose}>
    <section className="ai-dialog auth-dialog" role="dialog" aria-modal="true" aria-label="Conta CryptoLens" onMouseDown={(event) => event.stopPropagation()}>
      <button className="dialog-close" onClick={onClose} aria-label="Fechar">×</button>
      <div className="ai-dialog-heading"><span className="ai-orb">✦</span><div><span>CONTA CRYPTOLENS</span><h2>{user ? 'Sua conta está conectada.' : mode === 'login' ? 'Entre para sincronizar seus dados.' : 'Crie sua conta.'}</h2></div></div>
      {user ? <>
        <p><b>{displayName}</b><br/>{user.email}</p>
        <p>Carteira, alertas e análises de IA ficam vinculados à sua conta e protegidos pelas políticas de acesso do Supabase.</p>
        {error && <div className="source-message" role="alert"><div><b>Não foi possível sair.</b><span>{error}</span></div></div>}
        <button className="soft-btn" onClick={signOut} disabled={loading}>{loading ? 'Saindo…' : 'Sair da conta'}</button>
      </> : <>
        <p>O CryptoLens não guarda chaves nem fundos. A conta serve somente para proteger e sincronizar os dados de acompanhamento.</p>
        <form onSubmit={submit}>
          {mode === 'signup' && <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Seu nome" autoComplete="name"/>}
          <input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="E-mail" autoComplete="email"/>
          <input type="password" required minLength={6} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Senha" autoComplete={mode === 'login' ? 'current-password' : 'new-password'}/>
          {error && <div className="source-message" role="alert"><div><b>Não foi possível continuar.</b><span>{error}</span></div></div>}
          {message && <div className="source-message" role="status"><div><b>Quase pronto.</b><span>{message}</span></div></div>}
          <button className="primary-btn" type="submit" disabled={loading}>{loading ? 'Aguarde…' : mode === 'login' ? 'Entrar' : 'Criar conta'}</button>
        </form>
        <button className="text-link" onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(''); setMessage('') }}>{mode === 'login' ? 'Ainda não tenho conta' : 'Já tenho uma conta'}</button>
      </>}
    </section>
  </div>
}
