import { useMemo, useState } from 'react'
import type { DemoUser } from '../types'

type StoredAccount = DemoUser & { salt: string; passwordHash: string }

const ACCOUNT_KEY = 'cryptolens-demo-account'

function bytesToHex(bytes: Uint8Array) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
}

async function hashPassword(password: string, saltHex: string) {
  const salt = new Uint8Array(saltHex.match(/.{1,2}/g)?.map((byte) => Number.parseInt(byte, 16)) ?? [])
  const material = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits'])
  const result = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations: 120_000, hash: 'SHA-256' }, material, 256)
  return bytesToHex(new Uint8Array(result))
}

function passwordScore(password: string) {
  return [password.length >= 8, /[A-Z]/.test(password), /[a-z]/.test(password), /\d/.test(password), /[^\w\s]/.test(password)].filter(Boolean).length
}

export default function AuthScreen({ onAuthenticated }: { onAuthenticated: (user: DemoUser, persist: boolean) => void }) {
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [remember, setRemember] = useState(true)
  const [status, setStatus] = useState<{ tone: 'error' | 'info'; text: string } | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const strength = useMemo(() => passwordScore(password), [password])

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setStatus(null)
    if (!email.includes('@')) { setStatus({ tone: 'error', text: 'Informe um e-mail válido.' }); return }
    if (mode === 'signup' && strength < 4) { setStatus({ tone: 'error', text: 'Use ao menos 8 caracteres, maiúscula, minúscula, número e, de preferência, símbolo.' }); return }
    setSubmitting(true)
    try {
      if (mode === 'signup') {
        const salt = crypto.getRandomValues(new Uint8Array(16))
        const account: StoredAccount = { email: email.trim().toLowerCase(), name: name.trim() || email.split('@')[0], salt: bytesToHex(salt), passwordHash: await hashPassword(password, bytesToHex(salt)) }
        localStorage.setItem(ACCOUNT_KEY, JSON.stringify(account))
        onAuthenticated({ email: account.email, name: account.name }, remember)
        return
      }
      const raw = localStorage.getItem(ACCOUNT_KEY)
      if (!raw) { setStatus({ tone: 'error', text: 'Nenhuma conta local encontrada. Crie uma conta de demonstração primeiro.' }); return }
      const account = JSON.parse(raw) as StoredAccount
      const valid = account.email === email.trim().toLowerCase() && account.passwordHash === await hashPassword(password, account.salt)
      if (!valid) { setStatus({ tone: 'error', text: 'E-mail ou senha incorretos para esta conta local.' }); return }
      onAuthenticated({ email: account.email, name: account.name }, remember)
    } catch {
      setStatus({ tone: 'error', text: 'Não foi possível validar a sessão neste navegador.' })
    } finally {
      setSubmitting(false)
    }
  }

  const useDemo = () => onAuthenticated({ email: 'demo@cryptolens.local', name: 'Investidor demo' }, false)

  return <main className="auth-shell">
    <section className="auth-story" aria-label="Apresentação do CryptoLens">
      <div className="auth-brand"><span className="brand-mark"><i/><i/><i/></span><b>Crypto<span>Lens</span></b></div>
      <div className="auth-story-copy"><span>WALLET INTELLIGENCE</span><h1>Seus ativos, seus dados, <em>suas decisões.</em></h1><p>Explore uma carteira demonstrativa, acompanhe preços públicos em tempo real e converse com um assistente orientado por dados.</p><div className="auth-feature-grid"><article><b>Dados públicos</b><span>Preços e volume via Binance Spot</span></article><article><b>Privado por padrão</b><span>Dados pessoais ficam neste navegador</span></article><article><b>Sem custódia</b><span>A demonstração não movimenta cripto</span></article></div></div>
      <small>Ambiente demonstrativo · Não envie fundos nem use senhas reais</small>
    </section>
    <section className="auth-panel">
      <div className="auth-card">
        <div className="auth-mobile-brand"><span className="brand-mark"><i/><i/><i/></span>Crypto<span>Lens</span></div>
        <span className="auth-kicker">ACESSO SEGURO LOCAL</span>
        <h2>{mode === 'login' ? 'Bem-vindo de volta' : 'Crie sua wallet demo'}</h2>
        <p>{mode === 'login' ? 'Entre na conta salva neste navegador.' : 'Sua senha será transformada em hash e nunca será armazenada em texto.'}</p>
        <div className="auth-tabs" role="tablist" aria-label="Tipo de acesso"><button role="tab" aria-selected={mode === 'login'} className={mode === 'login' ? 'active' : ''} onClick={() => { setMode('login'); setStatus(null) }}>Entrar</button><button role="tab" aria-selected={mode === 'signup'} className={mode === 'signup' ? 'active' : ''} onClick={() => { setMode('signup'); setStatus(null) }}>Criar conta</button></div>
        <form onSubmit={submit}>
          {mode === 'signup' && <label>Nome<input autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Como devemos chamar você?"/></label>}
          <label>E-mail<input type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="voce@exemplo.com"/></label>
          <label>Senha<div className="password-field"><input type={showPassword ? 'text' : 'password'} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} required minLength={mode === 'signup' ? 8 : 1} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Sua senha local"/><button type="button" onClick={() => setShowPassword((current) => !current)} aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}>{showPassword ? 'Ocultar' : 'Mostrar'}</button></div></label>
          {mode === 'signup' && <div className="password-strength"><div aria-label={`Força da senha: ${strength} de 5`}>{[1, 2, 3, 4, 5].map((level) => <i key={level} className={strength >= level ? 'filled' : ''}/>)}</div><span>{strength < 3 ? 'Senha fraca' : strength < 5 ? 'Senha boa' : 'Senha forte'}</span></div>}
          <div className="auth-options"><label><input type="checkbox" checked={remember} onChange={(event) => setRemember(event.target.checked)}/> Manter sessão neste dispositivo</label><button type="button" onClick={() => setStatus({ tone: 'info', text: 'Como não há servidor de e-mail, recupere a conta criando uma nova conta local.' })}>Esqueci minha senha</button></div>
          {status && <div className={`auth-status ${status.tone}`} role="status">{status.text}</div>}
          <button className="auth-submit" type="submit" disabled={submitting}>{submitting ? 'Validando…' : mode === 'login' ? 'Entrar na wallet' : 'Criar conta local'}</button>
        </form>
        <div className="auth-divider"><span>ou</span></div>
        <button className="social-demo" onClick={useDemo}><span>G</span> Continuar com Google <small>modo demo</small></button>
        <p className="auth-legal">Autenticação simulada para protótipo. Não use a senha de sua exchange, e-mail ou banco.</p>
      </div>
    </section>
  </main>
}
