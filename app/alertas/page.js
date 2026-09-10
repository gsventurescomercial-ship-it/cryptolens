'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { requireSupabase, supabase, supabaseConfigured } from '../../lib/supabaseClient'

const SYMBOLS = ['BTC', 'ETH', 'SOL', 'BNB']

function mapCondition(metric, direction) {
  if (metric === 'change') return direction === 'above' ? 'percent_change_up' : 'percent_change_down'
  return direction === 'above' ? 'price_above' : 'price_below'
}

export default function AlertasPage() {
  const [user, setUser] = useState(null)
  const [alerts, setAlerts] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [removingId, setRemovingId] = useState('')
  const [error, setError] = useState('')
  const [symbol, setSymbol] = useState('BTC')
  const [metric, setMetric] = useState('price')
  const [direction, setDirection] = useState('above')
  const [target, setTarget] = useState('')

  const loadAlerts = useCallback(async (currentUser) => {
    if (!currentUser || !supabase) {
      setAlerts([])
      setLoading(false)
      return
    }
    setLoading(true)
    setError('')
    const { data, error: loadError } = await supabase
      .from('alerts')
      .select('id,symbol,condition_type,target_value,status,triggered_at,created_at')
      .eq('user_id', currentUser.id)
      .order('created_at', { ascending: false })
    if (loadError) setError(loadError.message)
    else setAlerts(data || [])
    setLoading(false)
  }, [])

  useEffect(() => {
    if (!supabaseConfigured || !supabase) {
      setLoading(false)
      return
    }
    let mounted = true
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return
      const currentUser = data.session?.user || null
      setUser(currentUser)
      loadAlerts(currentUser)
    })
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      const currentUser = session?.user || null
      setUser(currentUser)
      loadAlerts(currentUser)
    })
    const interval = window.setInterval(() => {
      if (user) loadAlerts(user)
    }, 60_000)
    return () => {
      mounted = false
      data.subscription.unsubscribe()
      window.clearInterval(interval)
    }
  }, [loadAlerts, user])

  async function createAlert(event) {
    event.preventDefault()
    setError('')
    if (!user) {
      setError('Entre na sua conta para criar alertas persistentes.')
      return
    }
    const parsedTarget = Number(target)
    if (!Number.isFinite(parsedTarget)) {
      setError('Informe um valor-alvo válido.')
      return
    }
    setSaving(true)
    try {
      const client = requireSupabase()
      const { data, error: saveError } = await client
        .from('alerts')
        .insert({
          user_id: user.id,
          symbol,
          condition_type: mapCondition(metric, direction),
          target_value: parsedTarget,
          status: 'active',
        })
        .select('id,symbol,condition_type,target_value,status,triggered_at,created_at')
        .single()
      if (saveError) throw saveError
      setAlerts((current) => [data, ...current])
      setTarget('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível salvar o alerta.')
    } finally {
      setSaving(false)
    }
  }

  async function removeAlert(id) {
    if (!user) return
    setRemovingId(id)
    setError('')
    try {
      const client = requireSupabase()
      const { error: removeError } = await client.from('alerts').delete().eq('id', id).eq('user_id', user.id)
      if (removeError) throw removeError
      setAlerts((current) => current.filter((item) => item.id !== id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível remover o alerta.')
    } finally {
      setRemovingId('')
    }
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <Link href="/dashboard" className="brand"><span className="brand-mark">C</span><span>CryptoLens</span></Link>
        <nav className="topnav"><Link href="/dashboard">Dashboard</Link><Link href="/alertas" className="active">Alertas</Link></nav>
        <div className="account-slot">{user ? <span className="account-chip">{user.email}</span> : <Link className="primary-button small" href="/login">Entrar</Link>}</div>
      </header>

      <section className="page-heading"><span className="eyebrow">ALERTAS</span><h1>Monitore preços mesmo com o app fechado.</h1><p>Os alertas ficam no Supabase e o backend faz a verificação periódica. O navegador não precisa permanecer aberto.</p></section>

      {!supabaseConfigured && <div className="async-state error">Configure as variáveis públicas do Supabase na Vercel para habilitar esta tela.</div>}

      <section className="panel">
        <div className="panel-heading"><div><span className="eyebrow">NOVO ALERTA</span><h2>Defina a condição</h2></div><span className="secure-pill">Backend</span></div>
        <form className="alert-form" onSubmit={createAlert}>
          <select value={symbol} onChange={(event) => setSymbol(event.target.value)} disabled={saving}>{SYMBOLS.map((item) => <option key={item}>{item}</option>)}</select>
          <select value={metric} onChange={(event) => setMetric(event.target.value)} disabled={saving}><option value="price">Preço</option><option value="change">Variação 24h</option></select>
          <select value={direction} onChange={(event) => setDirection(event.target.value)} disabled={saving}><option value="above">Acima</option><option value="below">Abaixo</option></select>
          <input type="number" step="any" value={target} onChange={(event) => setTarget(event.target.value)} placeholder={metric === 'price' ? 'Valor em US$' : 'Percentual'} disabled={saving} />
          <button className="primary-button" disabled={saving || !user}>{saving ? 'Salvando…' : 'Criar alerta'}</button>
        </form>
        {error && <div className="async-state error" role="alert">{error}</div>}
      </section>

      <section className="panel">
        <div className="panel-heading"><div><span className="eyebrow">SEUS ALERTAS</span><h2>Regras ativas e disparadas</h2></div></div>
        {loading && <div className="async-state">Carregando alertas…</div>}
        {!loading && !user && <div className="empty-state">Entre na sua conta para visualizar e criar alertas.</div>}
        {!loading && user && alerts.length === 0 && <div className="empty-state">Nenhum alerta criado ainda.</div>}
        <div className="alert-list">
          {alerts.map((alert) => (
            <article className="alert-card" key={alert.id}>
              <div><strong>{alert.symbol}</strong><span>{alert.condition_type.replaceAll('_', ' ')}</span></div>
              <div><strong>{Number(alert.target_value).toLocaleString('pt-BR')}</strong><span className={`status ${alert.status}`}>{alert.status}</span></div>
              <button className="icon-button danger" onClick={() => removeAlert(alert.id)} disabled={removingId === alert.id}>×</button>
            </article>
          ))}
        </div>
      </section>
    </main>
  )
}
