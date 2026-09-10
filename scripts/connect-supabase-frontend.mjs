import { readFileSync, writeFileSync } from 'node:fs'

const path = 'src/App.tsx'
let text = readFileSync(path, 'utf8')

if (text.includes("import AuthDialog from './AuthDialog'") && text.includes('user={authUser}')) {
  console.log('CryptoLens Supabase frontend integration already applied.')
  process.exit(0)
}

const mustReplace = (from, to, label) => {
  if (!text.includes(from)) throw new Error(`CryptoLens integration: ${label} not found`)
  text = text.replace(from, to)
}

mustReplace(
  "import { useCallback, useEffect, useMemo, useState } from 'react'",
  "import { useCallback, useEffect, useMemo, useState } from 'react'\nimport type { User } from '@supabase/supabase-js'\nimport AuthDialog from './AuthDialog'\nimport { analyzePortfolioWithAI, createRemoteAlert, createRemotePosition, deleteRemoteAlert, deleteRemotePosition, loadPrivateData, supabase } from './lib/cryptolensSupabase'",
  'React import',
)

mustReplace(
  "  read?: boolean\n}",
  "  read?: boolean\n  status?: 'active' | 'triggered' | 'disabled'\n  triggeredAt?: string\n}",
  'AlertRule type',
)

const aiBlock = `function ConversationalAiDialog({ assets, alerts, positions, user, onClose, onNavigate, onRequireAuth }: { assets: MarketAsset[]; alerts: AlertRule[]; positions: PortfolioPosition[]; user: User | null; onClose: () => void; onNavigate: (page: NavItem) => void; onRequireAuth: () => void }) {
  const [question, setQuestion] = useState('')
  const [loading, setLoading] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([{ id: 'welcome', role: 'assistant', text: 'Olá! Eu sou o CryptoLens AI. Posso analisar seu portfólio com os dados de mercado disponíveis. Eu nunca executo operações e não acesso sua corretora.', sources: ['CryptoLens AI · backend Supabase'] }])
  const ask = async (value: string) => {
    const trimmed = value.trim()
    if (!trimmed || loading) return
    setQuestion('')
    setMessages((current) => [...current, { id: \`${'${Date.now()}'}-u\`, role: 'user', text: trimmed }])
    if (!user) {
      setMessages((current) => [...current, { id: \`${'${Date.now()}'}-a\`, role: 'assistant', text: 'Entre na sua conta para eu analisar dados pessoais da sua carteira com segurança. O mercado público continua disponível sem login.', sources: ['Supabase Auth'] }])
      onRequireAuth()
      return
    }
    const marketContext = assets.filter((asset) => asset.price > 0).map((asset) => ({
      symbol: asset.symbol,
      name: asset.name,
      price_usd: asset.price,
      change_24h_percent: asset.change,
      volume_24h_usd: asset.volume,
      source: 'Binance Spot',
    }))
    if (!marketContext.length) {
      setMessages((current) => [...current, { id: \`${'${Date.now()}'}-a\`, role: 'assistant', text: 'Os dados públicos de mercado ainda não estão disponíveis. Tente novamente quando a conexão com a Binance estiver ativa.', sources: ['Binance Spot · aguardando conexão'] }])
      return
    }
    setLoading(true)
    try {
      const answer = await analyzePortfolioWithAI({
        userQuestion: trimmed,
        portfolio: positions.map((position) => ({ symbol: position.symbol, quantity: position.quantity, avg_buy_price: position.averagePrice })),
        marketContext,
        riskProfile: 'não informado',
      })
      setMessages((current) => [...current, { id: \`${'${Date.now()}'}-a\`, role: 'assistant', text: answer, sources: ['CryptoLens AI · backend Supabase', 'Binance Spot · contexto de mercado'] }])
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Não foi possível consultar o CryptoLens AI agora.'
      setMessages((current) => [...current, { id: \`${'${Date.now()}'}-a\`, role: 'assistant', text: message, sources: ['CryptoLens AI · backend Supabase'] }])
    } finally {
      setLoading(false)
    }
  }
  const shortcuts = [{ label: 'Ler o volume', prompt: 'Quais ativos têm mais volume?' }, { label: 'Checar riscos', prompt: 'Quais riscos o painel ainda não cobre?' }, { label: 'Minha carteira', prompt: 'Como está minha carteira?' }, { label: 'Ir à comunidade', prompt: 'Como funciona a comunidade?' }]
  return <div className="dialog-backdrop" role="presentation" onMouseDown={onClose}><section className="ai-dialog conversational-ai" role="dialog" aria-modal="true" aria-label="CryptoLens AI" onMouseDown={(event) => event.stopPropagation()}><button className="dialog-close" onClick={onClose} aria-label="Fechar assistente">×</button><div className="ai-dialog-heading"><span className="ai-orb">✦</span><div><span>CRYPTOLENS AI · BACKEND SEGURO</span><h2>Dados primeiro. Contexto sempre.</h2></div></div><p className="ai-disclosure">A análise roda no backend. Eu não acesso sua corretora, não executo ordens e qualquer possível operação é apenas uma sugestão educativa, não uma recomendação formal de investimento.</p><div className="chat-log" aria-live="polite">{messages.map((message) => <article className={\`chat-message ${'${message.role}'}\`} key={message.id}><span>{message.role === 'assistant' ? '✦' : 'Você'}</span><div><p>{message.text}</p>{message.sources && <small>Fontes: {message.sources.join(' · ')}</small>}</div></article>)}</div><div className="ai-suggestions">{shortcuts.map((item) => <button key={item.label} disabled={loading} onClick={() => { if (item.label === 'Ir à comunidade') { onNavigate('Comunidade'); onClose() } else void ask(item.prompt) }}>{item.label}</button>)}</div><form onSubmit={(event) => { event.preventDefault(); void ask(question) }}><input autoFocus value={question} disabled={loading} onChange={(event) => setQuestion(event.target.value)} aria-label="Pergunta para o CryptoLens AI" placeholder="Ex.: analise a concentração da minha carteira"/><button className="primary-btn" type="submit" disabled={loading}>{loading ? 'Analisando…' : 'Enviar'} <Icon name="arrow" size={16}/></button></form></section></div>
}`

const aiPattern = /function ConversationalAiDialog\([\s\S]*?\n}\n\nfunction CommandPalette/
if (!aiPattern.test(text)) throw new Error('CryptoLens integration: AI dialog block not found')
text = text.replace(aiPattern, `${aiBlock}\n\nfunction CommandPalette`)

text = text.replace('Tudo fica neste navegador enquanto não houver login.', 'Carteira, alertas e análises pessoais ficam sincronizados com sua conta no Supabase e protegidos por RLS.')
text = text.replace('Preço e variação 24h são atualizados enquanto o painel está aberto. Notícias, volume e score exigem fontes e notificações no backend.', 'Os alertas de preço e variação são processados no backend a cada poucos minutos e continuam funcionando mesmo com o app fechado.')
text = text.replace("const triggered = asset && (rule.direction === 'above' ? current >= rule.target : current <= rule.target);", "const triggered = rule.status === 'triggered' || Boolean(asset && (rule.direction === 'above' ? current >= rule.target : current <= rule.target));")

mustReplace(
`  const [marketOverview, setMarketOverview] = useState<GlobalMarketMetrics | null>(null)
  const [alerts, setAlerts] = useState<AlertRule[]>(() => {
    try { return JSON.parse(localStorage.getItem('cryptolens-alerts') || '[]') } catch { return [] }
  })
  const [positions, setPositions] = useState<PortfolioPosition[]>(() => {
    try { return JSON.parse(localStorage.getItem('cryptolens-portfolio') || '[]') } catch { return [] }
  })`,
`  const [marketOverview, setMarketOverview] = useState<GlobalMarketMetrics | null>(null)
  const [authUser, setAuthUser] = useState<User | null>(null)
  const [authOpen, setAuthOpen] = useState(false)
  const [alerts, setAlerts] = useState<AlertRule[]>([])
  const [positions, setPositions] = useState<PortfolioPosition[]>([])`,
  'private state block',
)

const authLogic = `  const syncPrivateData = useCallback(async (user: User | null) => {
    if (!user) {
      setAlerts([])
      setPositions([])
      return
    }
    try {
      const data = await loadPrivateData()
      setAlerts(data.alerts)
      setPositions(data.positions)
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Não foi possível carregar seus dados privados.')
      window.setTimeout(() => setNotice(''), 3500)
    }
  }, [])

  useEffect(() => {
    let active = true
    void supabase.auth.getSession().then(({ data }) => {
      if (!active) return
      const user = data.session?.user ?? null
      setAuthUser(user)
      void syncPrivateData(user)
    })
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      const user = session?.user ?? null
      setAuthUser(user)
      window.setTimeout(() => { void syncPrivateData(user) }, 0)
    })
    return () => {
      active = false
      listener.subscription.unsubscribe()
    }
  }, [syncPrivateData])

  useEffect(() => {
    if (!authUser) return
    const interval = window.setInterval(() => { void syncPrivateData(authUser) }, 60_000)
    return () => window.clearInterval(interval)
  }, [authUser, syncPrivateData])

`

mustReplace("  useEffect(() => {\n    const syncHash = () => setActiveNav(pageFromHash())", authLogic + "  useEffect(() => {\n    const syncHash = () => setActiveNav(pageFromHash())", 'auth effect insertion point')

const localPrivateEffects = /\n  useEffect\(\(\) => \{\n    localStorage\.setItem\('cryptolens-alerts', JSON\.stringify\(alerts\)\)\n  \}, \[alerts\]\)\n\n  useEffect\(\(\) => \{\n    localStorage\.setItem\('cryptolens-portfolio', JSON\.stringify\(positions\)\)\n  \}, \[positions\]\)\n/
if (!localPrivateEffects.test(text)) throw new Error('CryptoLens integration: local private storage effects not found')
text = text.replace(localPrivateEffects, '\n')

mustReplace(
`  const openAsset = (asset: MarketAsset) => setSelectedAsset(asset)
  const addAlert = (rule: Omit<AlertRule, 'id'>) => {
    setAlerts((current) => [...current, { ...rule, id: \`${'${Date.now()}'}-${'${rule.symbol}'}\` }])
    setNotice(\`Alerta para ${'${rule.symbol}'} criado e salvo neste navegador.\`)
    window.setTimeout(() => setNotice(''), 2800)
  }
  const addPosition = (position: Omit<PortfolioPosition, 'id'>) => {
    setPositions((current) => [...current, { ...position, id: \`${'${Date.now()}'}-${'${position.symbol}'}\`, createdAt: new Date().toISOString() }])
    setNotice(\`${'${position.symbol}'} adicionado à carteira de acompanhamento.\`)
    window.setTimeout(() => setNotice(''), 2800)
  }`,
`  const openAsset = (asset: MarketAsset) => setSelectedAsset(asset)
  const requireAccount = () => {
    setAuthOpen(true)
    setNotice('Entre na sua conta para sincronizar carteira, alertas e análises pessoais.')
    window.setTimeout(() => setNotice(''), 3000)
  }
  const addAlert = async (rule: Omit<AlertRule, 'id'>) => {
    if (!authUser) { requireAccount(); return }
    try {
      const created = await createRemoteAlert({ symbol: rule.symbol, metric: rule.metric ?? 'price', direction: rule.direction, target: rule.target })
      setAlerts((current) => [...current, created])
      setNotice(\`Alerta para ${'${rule.symbol}'} criado no backend. Ele continuará sendo monitorado com o app fechado.\`)
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Não foi possível criar o alerta.')
    }
    window.setTimeout(() => setNotice(''), 3500)
  }
  const removeAlert = async (id: string) => {
    if (!authUser) { requireAccount(); return }
    try {
      await deleteRemoteAlert(id)
      setAlerts((current) => current.filter((item) => item.id !== id))
      setNotice('Alerta removido da sua conta.')
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Não foi possível remover o alerta.')
    }
    window.setTimeout(() => setNotice(''), 3000)
  }
  const addPosition = async (position: Omit<PortfolioPosition, 'id'>) => {
    if (!authUser) { requireAccount(); return }
    try {
      const created = await createRemotePosition({ symbol: position.symbol, quantity: position.quantity, averagePrice: position.averagePrice })
      setPositions((current) => [...current, created])
      setNotice(\`${'${position.symbol}'} foi salvo na sua carteira sincronizada.\`)
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Não foi possível salvar a posição.')
    }
    window.setTimeout(() => setNotice(''), 3000)
  }
  const removePosition = async (id: string) => {
    if (!authUser) { requireAccount(); return }
    try {
      await deleteRemotePosition(id)
      setPositions((current) => current.filter((item) => item.id !== id))
      setNotice('Posição removida da sua carteira sincronizada.')
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Não foi possível remover a posição.')
    }
    window.setTimeout(() => setNotice(''), 3000)
  }`,
  'private mutation block',
)

mustReplace("  const toggleWatchlist = (symbol: string) => {", "  const profileSource = authUser?.user_metadata?.name || authUser?.user_metadata?.full_name || authUser?.email || 'Entrar'\n  const profileInitials = profileSource.split(/\\s|@/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || 'IN'\n\n  const toggleWatchlist = (symbol: string) => {", 'profile initials insertion')
mustReplace("<button className=\"profile\" onClick={() => showSoon('Perfil')}><span>AM</span><i/></button>", "<button className=\"profile\" onClick={() => setAuthOpen(true)} title={authUser?.email ?? 'Entrar na conta'}><span>{profileInitials}</span><i/></button>", 'profile button')
mustReplace("onRemoveAlert={(id) => setAlerts((current) => current.filter((item) => item.id !== id))}", "onRemoveAlert={removeAlert}", 'remote alert removal')
mustReplace("onRemovePosition={(id) => setPositions((current) => current.filter((item) => item.id !== id))}", "onRemovePosition={removePosition}", 'remote portfolio removal')
mustReplace("{aiOpen && <ConversationalAiDialog assets={assets} alerts={alerts} positions={positions} onClose={() => setAiOpen(false)} onNavigate={setActiveNav}/>}", "{aiOpen && <ConversationalAiDialog assets={assets} alerts={alerts} positions={positions} user={authUser} onClose={() => setAiOpen(false)} onNavigate={setActiveNav} onRequireAuth={() => setAuthOpen(true)}/>}\n    {authOpen && <AuthDialog user={authUser} onClose={() => setAuthOpen(false)}/>}" , 'AI/auth render')

writeFileSync(path, text)
console.log('CryptoLens frontend connected to Supabase for auth, portfolio, alerts and backend AI.')
