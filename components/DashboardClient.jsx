'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { fetchTicker24h } from '../lib/binance'
import { requireSupabase, supabase, supabaseConfigured } from '../lib/supabaseClient'
import GraficoPreco from './GraficoPreco'
import CardPortfolio from './CardPortfolio'
import ChatIA from './ChatIA'

const TRACKED = ['BTC', 'ETH', 'SOL', 'BNB']

export default function DashboardClient() {
  const [user, setUser] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [holdings, setHoldings] = useState([])
  const [portfolioLoading, setPortfolioLoading] = useState(false)
  const [portfolioError, setPortfolioError] = useState('')
  const [saving, setSaving] = useState(false)
  const [removingId, setRemovingId] = useState('')
  const [symbol, setSymbol] = useState('BTC')
  const [quantity, setQuantity] = useState('')
  const [averagePrice, setAveragePrice] = useState('')
  const [market, setMarket] = useState({})
  const [marketLoading, setMarketLoading] = useState(true)
  const [marketError, setMarketError] = useState('')

  const loadHoldings = useCallback(async (currentUser) => {
    if (!currentUser || !supabase) {
      setHoldings([])
      return
    }
    setPortfolioLoading(true)
    setPortfolioError('')
    const { data, error } = await supabase
      .from('portfolio_holdings')
      .select('id,symbol,quantity,avg_buy_price,notes,created_at')
      .eq('user_id', currentUser.id)
      .order('created_at', { ascending: true })
    if (error) setPortfolioError(error.message)
    else setHoldings(data || [])
    setPortfolioLoading(false)
  }, [])

  useEffect(() => {
    if (!supabaseConfigured || !supabase) {
      setAuthLoading(false)
      return
    }
    let mounted = true
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return
      const currentUser = data.session?.user || null
      setUser(currentUser)
      setAuthLoading(false)
      loadHoldings(currentUser)
    })
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      const currentUser = session?.user || null
      setUser(currentUser)
      setAuthLoading(false)
      loadHoldings(currentUser)
    })
    return () => {
      mounted = false
      data.subscription.unsubscribe()
    }
  }, [loadHoldings])

  useEffect(() => {
    let active = true
    let controller = new AbortController()

    async function refreshMarket() {
      setMarketLoading(true)
      setMarketError('')
      try {
        const rows = await Promise.all(TRACKED.map((asset) => fetchTicker24h(asset, controller.signal)))
        if (!active) return
        setMarket(Object.fromEntries(rows.map((row) => [row.symbol, row])))
      } catch (error) {
        if (active && error?.name !== 'AbortError') setMarketError(error instanceof Error ? error.message : 'Falha ao carregar mercado.')
      } finally {
        if (active) setMarketLoading(false)
      }
    }

    refreshMarket()
    const interval = window.setInterval(() => {
      controller.abort()
      controller = new AbortController()
      refreshMarket()
    }, 30_000)

    return () => {
      active = false
      controller.abort()
      window.clearInterval(interval)
    }
  }, [])

  async function addHolding(event) {
    event.preventDefault()
    setPortfolioError('')
    if (!user) {
      setPortfolioError('Entre na sua conta antes de salvar uma posição.')
      return
    }
    const parsedQuantity = Number(quantity)
    const parsedAverage = Number(averagePrice)
    if (!symbol || !Number.isFinite(parsedQuantity) || parsedQuantity <= 0 || !Number.isFinite(parsedAverage) || parsedAverage < 0) {
      setPortfolioError('Informe moeda, quantidade e preço médio válidos.')
      return
    }
    setSaving(true)
    try {
      const client = requireSupabase()
      const { data, error } = await client
        .from('portfolio_holdings')
        .insert({
          user_id: user.id,
          symbol: symbol.toUpperCase(),
          quantity: parsedQuantity,
          avg_buy_price: parsedAverage,
        })
        .select('id,symbol,quantity,avg_buy_price,notes,created_at')
        .single()
      if (error) throw error
      setHoldings((current) => [...current, data])
      setQuantity('')
      setAveragePrice('')
    } catch (error) {
      setPortfolioError(error instanceof Error ? error.message : 'Não foi possível salvar a posição.')
    } finally {
      setSaving(false)
    }
  }

  async function removeHolding(id) {
    if (!user) return
    setRemovingId(id)
    setPortfolioError('')
    try {
      const client = requireSupabase()
      const { error } = await client.from('portfolio_holdings').delete().eq('id', id).eq('user_id', user.id)
      if (error) throw error
      setHoldings((current) => current.filter((item) => item.id !== id))
    } catch (error) {
      setPortfolioError(error instanceof Error ? error.message : 'Não foi possível remover a posição.')
    } finally {
      setRemovingId('')
    }
  }

  const marketContext = useMemo(() => TRACKED.map((asset) => market[asset]).filter(Boolean).map((item) => ({
    symbol: item.symbol,
    price_usd: item.price,
    change_24h_percent: item.change24h,
    volume_24h_usd: item.volume24h,
    source: 'Binance',
  })), [market])

  const total = holdings.reduce((sum, holding) => sum + Number(holding.quantity || 0) * Number(market[holding.symbol]?.price || 0), 0)

  return (
    <main className="app-shell">
      <header className="topbar">
        <Link href="/dashboard" className="brand"><span className="brand-mark">C</span><span>CryptoLens</span></Link>
        <nav className="topnav"><Link href="/dashboard">Dashboard</Link><Link href="/alertas">Alertas</Link></nav>
        <div className="account-slot">{authLoading ? <span className="muted">Verificando…</span> : user ? <span className="account-chip">{user.email}</span> : <Link className="primary-button small" href="/login">Entrar</Link>}</div>
      </header>

      <section className="hero-grid">
        <div><span className="eyebrow">PORTFÓLIO VIEW-ONLY</span><h1>Mercado, carteira e IA em um só painel.</h1><p>Sem custódia, sem conexão com exchange e sem execução automática de ordens.</p></div>
        <div className="metric-card"><span>Valor acompanhado</span><strong>US$ {total.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}</strong><small>{holdings.length} posição(ões) lançada(s) manualmente</small></div>
      </section>

      {!supabaseConfigured && <div className="async-state error">Configure NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY no ambiente da Vercel para habilitar login e dados privados.</div>}

      <section className="market-strip">
        {TRACKED.map((asset) => {
          const item = market[asset]
          return <button key={asset} className={symbol === asset ? 'market-tile active' : 'market-tile'} onClick={() => setSymbol(asset)}>
            <span>{asset}</span>
            <strong>{marketLoading && !item ? '…' : item ? `US$ ${item.price.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}` : '—'}</strong>
            <small className={item?.change24h >= 0 ? 'positive' : 'negative'}>{item ? `${item.change24h >= 0 ? '+' : ''}${item.change24h.toFixed(2)}%` : '24h'}</small>
          </button>
        })}
      </section>
      {marketError && <div className="async-state error" role="alert">{marketError}</div>}

      <section className="dashboard-grid">
        <GraficoPreco symbol={symbol} />
        <section className="panel portfolio-panel">
          <div className="panel-heading"><div><span className="eyebrow">MINHA CARTEIRA</span><h2>Posições manuais</h2></div>{!user && <Link href="/login">Entrar</Link>}</div>
          <form className="holding-form" onSubmit={addHolding}>
            <select value={symbol} onChange={(event) => setSymbol(event.target.value)} disabled={saving}>{TRACKED.map((asset) => <option key={asset}>{asset}</option>)}</select>
            <input type="number" step="any" min="0" value={quantity} onChange={(event) => setQuantity(event.target.value)} placeholder="Quantidade" disabled={saving} />
            <input type="number" step="any" min="0" value={averagePrice} onChange={(event) => setAveragePrice(event.target.value)} placeholder="Preço médio (US$)" disabled={saving} />
            <button className="primary-button" disabled={saving || !user}>{saving ? 'Salvando…' : 'Adicionar'}</button>
          </form>
          {portfolioLoading && <div className="async-state">Carregando sua carteira…</div>}
          {portfolioError && <div className="async-state error" role="alert">{portfolioError}</div>}
          {!portfolioLoading && user && holdings.length === 0 && <div className="empty-state">Sua carteira está vazia. Adicione a primeira posição acima.</div>}
          <div className="portfolio-list">{holdings.map((holding) => <CardPortfolio key={holding.id} holding={holding} market={market[holding.symbol]} onRemove={removeHolding} removing={removingId === holding.id} />)}</div>
        </section>
      </section>

      <ChatIA portfolio={holdings.map((item) => ({ symbol: item.symbol, quantity: Number(item.quantity), avg_buy_price: Number(item.avg_buy_price || 0) }))} marketContext={marketContext} />
    </main>
  )
}
