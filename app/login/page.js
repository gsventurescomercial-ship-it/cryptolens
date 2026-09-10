'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { requireSupabase, supabase, supabaseConfigured } from '../../lib/supabaseClient'

export default function LoginPage() {
  const router = useRouter()
  const [mode, setMode] = useState('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!supabase) return
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) router.replace('/dashboard')
    })
  }, [router])

  async function submit(event) {
    event.preventDefault()
    setError('')
    setMessage('')
    setLoading(true)
    try {
      const client = requireSupabase()
      if (mode === 'signup') {
        const { data, error: signUpError } = await client.auth.signUp({
          email: email.trim(),
          password,
          options: { data: { name: name.trim() || undefined } },
        })
        if (signUpError) throw signUpError
        if (!data.session) setMessage('Conta criada. Confirme o e-mail e depois faça login.')
        else router.replace('/dashboard')
      } else {
        const { error: signInError } = await client.auth.signInWithPassword({ email: email.trim(), password })
        if (signInError) throw signInError
        router.replace('/dashboard')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível autenticar.')
    } finally {
      setLoading(false)
    }
  }

  async function googleLogin() {
    setError('')
    setMessage('')
    setGoogleLoading(true)
    try {
      const client = requireSupabase()
      const { error: oauthError } = await client.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${window.location.origin}/dashboard` },
      })
      if (oauthError) throw oauthError
    } catch (err) {
      setGoogleLoading(false)
      setError(err instanceof Error ? err.message : 'Não foi possível iniciar o login com Google.')
    }
  }

  return (
    <main className="auth-page">
      <Link href="/dashboard" className="brand auth-brand"><span className="brand-mark">C</span><span>CryptoLens</span></Link>
      <section className="auth-card">
        <span className="eyebrow">SUPABASE AUTH</span>
        <h1>{mode === 'login' ? 'Entre na sua conta' : 'Crie sua conta'}</h1>
        <p>Sincronize carteira, alertas e análises sem conectar uma wallet ou custodiar fundos.</p>

        {!supabaseConfigured && <div className="async-state error">As variáveis do Supabase ainda não foram configuradas neste ambiente.</div>}
        {error && <div className="async-state error" role="alert">{error}</div>}
        {message && <div className="async-state success" role="status">{message}</div>}

        <form className="auth-form" onSubmit={submit}>
          {mode === 'signup' && <label>Nome<input value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" disabled={loading} /></label>}
          <label>E-mail<input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" disabled={loading} /></label>
          <label>Senha<input type="password" required minLength={6} value={password} onChange={(event) => setPassword(event.target.value)} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} disabled={loading} /></label>
          <button className="primary-button full" type="submit" disabled={loading || googleLoading || !supabaseConfigured}>{loading ? 'Aguarde…' : mode === 'login' ? 'Entrar' : 'Criar conta'}</button>
        </form>

        <div className="divider"><span>ou</span></div>
        <button className="secondary-button full" onClick={googleLogin} disabled={loading || googleLoading || !supabaseConfigured}>{googleLoading ? 'Abrindo Google…' : 'Continuar com Google'}</button>
        <button className="text-button" onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(''); setMessage('') }}>{mode === 'login' ? 'Ainda não tenho conta' : 'Já tenho uma conta'}</button>
      </section>
    </main>
  )
}
