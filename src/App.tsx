import { useCallback, useEffect, useMemo, useState } from 'react'
import AuthScreen from './components/AuthScreen'
import SupportChat from './components/SupportChat'
import WalletOverview from './components/WalletOverview'
import type { DemoUser, MarketAsset } from './types'

type NavItem = 'Dashboard' | 'Mercado' | 'Radar' | 'Notícias' | 'Comunidade' | 'Watchlist' | 'Análises' | 'Alertas' | 'Minha Carteira'

type AlertRule = {
  id: string
  symbol: string
  metric?: 'price' | 'change'
  direction: 'above' | 'below'
  target: number
  read?: boolean
}

type PortfolioPosition = {
  id: string
  symbol: string
  quantity: number
  averagePrice: number
  createdAt?: string
}

type CommunityReply = {
  id: string
  author: string
  message: string
  createdAt: string
}

type CommunityPost = {
  id: string
  author: string
  topic: string
  message: string
  createdAt: string
  likes: number
  liked?: boolean
  replies: CommunityReply[]
}

type GlobalMarketMetrics = {
  totalMarketCap: number
  totalVolume: number
  bitcoinDominance: number
  marketCapChange: number
}

type DiscoveryProject = {
  id: string
  name: string
  symbol: string
  rank: number | null
  price: number | null
  change: number | null
}

const assetsMeta = [
  { symbol: 'BTC', name: 'Bitcoin', marketCap: 'Líder de mercado', color: '#f7a93b' },
  { symbol: 'ETH', name: 'Ethereum', marketCap: 'L1 · Smart contracts', color: '#8d8df1' },
  { symbol: 'BNB', name: 'BNB', marketCap: 'Ecossistema BNB', color: '#f2c94c' },
  { symbol: 'SOL', name: 'Solana', marketCap: 'L1 · Alta velocidade', color: '#8a65ed' },
  { symbol: 'XRP', name: 'XRP', marketCap: 'Pagamentos globais', color: '#d4d9e2' },
  { symbol: 'ADA', name: 'Cardano', marketCap: 'L1 · Pesquisa', color: '#4b9efa' },
]

const fallbackAssets: MarketAsset[] = assetsMeta.map((asset) => ({
  ...asset,
  price: 0,
  change: 0,
  volume: 0,
}))

const radar = [
  { symbol: 'SOL', name: 'Solana', score: 82, status: 'Tendência positiva', tone: 'positive', change: '+3,8%', reason: 'Volume consistente e atividade no ecossistema em expansão.', risk: 'Médio' },
  { symbol: 'LINK', name: 'Chainlink', score: 76, status: 'Alta atenção', tone: 'attention', change: '+2,1%', reason: 'Demanda por infraestrutura on-chain e atualizações de produto.', risk: 'Médio' },
  { symbol: 'ONDO', name: 'Ondo', score: 71, status: 'Acompanhamento', tone: 'watch', change: '+4,6%', reason: 'Narrativa RWA ativa, com volatilidade acima da média.', risk: 'Alto' },
  { symbol: 'TAO', name: 'Bittensor', score: 68, status: 'Em desenvolvimento', tone: 'development', change: '+1,3%', reason: 'Desenvolvimento técnico relevante; liquidez exige atenção.', risk: 'Alto' },
]

const navItems: NavItem[] = ['Dashboard', 'Mercado', 'Radar', 'Notícias', 'Comunidade', 'Watchlist', 'Análises', 'Alertas', 'Minha Carteira']

const routeByPage: Record<NavItem, string> = {
  Dashboard: 'dashboard',
  Mercado: 'mercado',
  Radar: 'radar',
  Notícias: 'noticias',
  Comunidade: 'comunidade',
  Watchlist: 'watchlist',
  Análises: 'analises',
  Alertas: 'alertas',
  'Minha Carteira': 'carteira',
}

function pageFromHash(): NavItem {
  const hash = window.location.hash.replace(/^#\/?/, '').toLowerCase()
  return navItems.find((page) => routeByPage[page] === hash) ?? 'Dashboard'
}

const periodConfig: Record<string, { interval: string; limit: number; label: string }> = {
  '1H': { interval: '1m', limit: 60, label: '60 candles · 1m' },
  '4H': { interval: '5m', limit: 48, label: '48 candles · 5m' },
  '1D': { interval: '1h', limit: 24, label: '24 candles · 1h' },
  '7D': { interval: '4h', limit: 42, label: '42 candles · 4h' },
  '30D': { interval: '1d', limit: 30, label: '30 candles · 1d' },
  '1Y': { interval: '1w', limit: 52, label: '52 candles · 1sem' },
}

function Icon({ name, size = 18, stroke = 1.8 }: { name: string; size?: number; stroke?: number }) {
  const paths: Record<string, React.ReactNode> = {
    grid: <><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></>,
    chart: <><path d="M3 3v18h18"/><path d="m7 15 4-4 3 2 5-6"/></>,
    radar: <><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/><path d="M12 2v2M22 12h-2M12 22v-2M2 12h2"/></>,
    news: <><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 8h7M7 12h10M7 16h6"/></>,
    users: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></>,
    bookmark: <path d="M6 3h12v18l-6-4-6 4V3Z"/>,
    pulse: <><path d="M3 12h4l2.2-6 4 12 2.1-6H21"/></>,
    bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/></>,
    wallet: <><path d="M4 7V5a2 2 0 0 1 2-2h12v4"/><rect x="3" y="7" width="18" height="14" rx="2"/><path d="M16 14h2"/></>,
    settings: <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.12 2.12-.06-.06a1.7 1.7 0 0 0-1.88-.34 1.7 1.7 0 0 0-1.03 1.56V20.3h-3v-.08A1.7 1.7 0 0 0 10.68 18.7a1.7 1.7 0 0 0-1.88.34l-.06.06-2.12-2.12.06-.06A1.7 1.7 0 0 0 7.02 15a1.7 1.7 0 0 0-1.56-1.03H5.4v-3h.06A1.7 1.7 0 0 0 7.02 9.94a1.7 1.7 0 0 0-.34-1.88l-.06-.06 2.12-2.12.06.06a1.7 1.7 0 0 0 1.88.34 1.7 1.7 0 0 0 1.03-1.56V4.7h3v.02a1.7 1.7 0 0 0 1.03 1.56 1.7 1.7 0 0 0 1.88-.34l.06-.06 2.12 2.12-.06.06a1.7 1.7 0 0 0-.34 1.88 1.7 1.7 0 0 0 1.56 1.03h.08v3h-.08A1.7 1.7 0 0 0 19.4 15Z"/></>,
    search: <><circle cx="11" cy="11" r="6"/><path d="m16 16 4 4"/></>,
    arrow: <><path d="M5 12h14"/><path d="m13 6 6 6-6 6"/></>,
    up: <><path d="m5 14 5-5 3 3 6-6"/><path d="M15 6h4v4"/></>,
    down: <><path d="m5 10 5 5 3-3 6 6"/><path d="M15 18h4v-4"/></>,
    plus: <><path d="M12 5v14M5 12h14"/></>,
    more: <><circle cx="5" cy="12" r="1" fill="currentColor"/><circle cx="12" cy="12" r="1" fill="currentColor"/><circle cx="19" cy="12" r="1" fill="currentColor"/></>,
    external: <><path d="M14 3h7v7"/><path d="m21 3-9 9"/><path d="M19 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h6"/></>,
    spark: <><path d="m4 19 5.5-7 3.2 3 6-9 1.3 13H4Z"/><path d="M3 21h18"/></>,
    chevron: <path d="m9 18 6-6-6-6"/>,
  }
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>
}

function formatMoney(value: number) {
  if (!value) return '—'
  if (value >= 1000) return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value)
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'USD', maximumFractionDigits: value < 1 ? 4 : 2 }).format(value)
}

function formatCompact(value: number) {
  if (!value) return '—'
  return new Intl.NumberFormat('pt-BR', { notation: 'compact', maximumFractionDigits: 1 }).format(value)
}

function formatPercent(value: number, available: boolean) {
  if (!available || !Number.isFinite(value)) return '—'
  return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`
}

function AssetMark({ symbol, color, size = 'md' }: { symbol: string; color: string; size?: 'sm' | 'md' | 'lg' }) {
  return <span className={`asset-mark ${size}`} style={{ '--coin-color': color } as React.CSSProperties}>{symbol === 'BTC' ? '₿' : symbol === 'ETH' ? '◆' : symbol.slice(0, 1)}</span>
}

function Sparkline({ positive = true, small = false }: { positive?: boolean; small?: boolean }) {
  const line = positive ? 'M1,32 C10,27 13,30 21,23 S34,26 42,18 S54,21 61,13 S76,17 87,5 S102,11 119,2' : 'M1,7 C11,4 16,11 25,9 S39,16 47,14 S58,23 68,20 S79,29 91,24 S105,32 119,29'
  return <svg className={`sparkline ${small ? 'small' : ''}`} viewBox="0 0 120 36" preserveAspectRatio="none"><path className={positive ? 'spark-fill up' : 'spark-fill down'} d={`${line} L119,36 L1,36 Z`}/><path className={positive ? 'spark-line up' : 'spark-line down'} d={line}/></svg>
}

function ScoreRing({ score }: { score: number }) {
  const circumference = 2 * Math.PI * 31
  return <div className="score-ring" style={{ '--score': `${(score / 100) * circumference}px`, '--circumference': `${circumference}px` } as React.CSSProperties}>
    <svg viewBox="0 0 72 72"><circle className="ring-track" cx="36" cy="36" r="31"/><circle className="ring-value" cx="36" cy="36" r="31"/></svg>
    <span>{score}</span>
  </div>
}

function PriceChart({ prices, price, interval = '1H', assetLabel = 'Bitcoin' }: { prices: number[]; price: number; interval?: string; assetLabel?: string }) {
  const grid = [15, 42, 69, 96, 123]
  const hasHistory = prices.length > 1
  const min = hasHistory ? Math.min(...prices) : 0
  const max = hasHistory ? Math.max(...prices) : 1
  const spread = max - min || 1
  const points = hasHistory ? prices.map((value, index) => `${(index / (prices.length - 1)) * 760},${194 - ((value - min) / spread) * 156}`) : []
  const line = points.length ? `M${points.join(' L')}` : ''
  const area = points.length ? `${line} L760,245 L0,245 Z` : ''
  const last = points.length ? points[points.length - 1].split(',') : ['0', '0']
  return <div className="price-chart" aria-label={`Gráfico de preço de ${assetLabel}`}>
    <svg viewBox="0 0 760 245" preserveAspectRatio="none">
      <defs>
        <linearGradient id="chartFill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#55d6a2" stopOpacity=".22"/><stop offset="100%" stopColor="#55d6a2" stopOpacity="0"/></linearGradient>
        <filter id="glow"><feGaussianBlur stdDeviation="3" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
      </defs>
      {grid.map((y) => <line key={y} x1="0" y1={y} x2="760" y2={y} className="chart-grid"/>)}
      {hasHistory && <><path className="chart-area" d={area}/><path className="chart-line-shadow" d={line}/><path className="chart-line" d={line}/><circle cx={last[0]} cy={last[1]} r="5" className="chart-dot" filter="url(#glow)"/></>}
    </svg>
    <div className="chart-tooltip"><span>{hasHistory ? `Último fechamento · ${interval}` : 'Carregando histórico...'}</span><strong>{formatMoney(prices.length ? prices[prices.length - 1] : price)}</strong></div>
    <div className="chart-labels"><span>06:00</span><span>10:00</span><span>14:00</span><span>18:00</span><span>Agora</span></div>
  </div>
}

function WorkspaceHeading({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: React.ReactNode }) {
  return <div className="workspace-heading"><div><div className="eyebrow compact"><span/>{eyebrow}</div><h1>{title}</h1><p>{description}</p></div>{action}</div>
}

function MarketWorkspace({ assets, watchlist, onToggle, onOpen, dataState, onRetry }: { assets: MarketAsset[]; watchlist: string[]; onToggle: (symbol: string) => void; onOpen: (asset: MarketAsset) => void; dataState: 'loading' | 'live' | 'unavailable' | 'offline'; onRetry: () => void }) {
  const hasLiveData = dataState === 'live'
  return <section className="workspace-page"><WorkspaceHeading eyebrow="DADOS SPOT · BINANCE" title="Mercado" description="Preços, variações e volume dos ativos que você acompanha." action={<span className={hasLiveData ? 'live-source' : 'source-status muted'}><i/> {hasLiveData ? 'Stream público ao vivo' : dataState === 'loading' ? 'Conectando…' : 'Fonte indisponível'}</span>}/>{!hasLiveData && <div className="source-message" role="status"><div><b>{dataState === 'loading' ? 'Conectando à fonte pública…' : dataState === 'offline' ? 'Sem conexão com a internet.' : 'Os dados de mercado não estão disponíveis agora.'}</b><span>{dataState === 'loading' ? 'Os valores aparecerão assim que a primeira atualização for confirmada.' : 'Não exibimos valores estimados. Verifique sua conexão ou tente novamente.'}</span></div>{dataState !== 'loading' && <button className="soft-btn" onClick={onRetry}>Tentar novamente</button>}</div>}<div className="workspace-stat-grid"><div><span>ATIVOS MONITORADOS</span><b>{hasLiveData ? assets.filter((asset) => asset.price > 0).length : '—'}</b><small>pares USDT</small></div><div><span>VOLUME COMBINADO 24H</span><b>{hasLiveData ? formatCompact(assets.reduce((total, asset) => total + asset.volume, 0)) : '—'}</b><small>ativos exibidos</small></div><div><span>MAIOR ALTA</span><b className="up-text">{hasLiveData && assets.length ? [...assets].sort((a, b) => b.change - a.change)[0].symbol : '—'}</b><small>entre os ativos monitorados</small></div><div><span>MAIOR BAIXA</span><b className="down-text">{hasLiveData && assets.length ? [...assets].sort((a, b) => a.change - b.change)[0].symbol : '—'}</b><small>entre os ativos monitorados</small></div></div><div className="data-table-panel"><div className="data-table-head"><span>ATIVO</span><span>PREÇO</span><span>24H</span><span>VOLUME 24H</span><span>TENDÊNCIA</span><span/></div>{assets.map((asset) => <article className="data-table-row" key={asset.symbol}><span className="table-asset"><AssetMark symbol={asset.symbol} color={asset.color}/><i><b>{asset.name}</b><small>{asset.symbol}/USDT</small></i></span><strong>{formatMoney(asset.price)}</strong><em className={asset.change >= 0 ? 'up-text' : 'down-text'}>{formatPercent(asset.change, hasLiveData)}</em><span>{formatCompact(asset.volume)}</span><Sparkline positive={asset.change >= 0} small/><span className="table-actions"><button className={watchlist.includes(asset.symbol) ? 'watch-toggle saved' : 'watch-toggle'} onClick={() => onToggle(asset.symbol)} aria-label={`Alternar ${asset.name} na watchlist`}><Icon name="bookmark" size={16}/></button><button className="row-detail" onClick={() => onOpen(asset)} aria-label={`Abrir detalhes de ${asset.name}`}><Icon name="chevron" size={16}/></button></span></article>)}</div></section>
}

function RadarWorkspace({ assets, onOpen }: { assets: MarketAsset[]; onOpen: (asset: MarketAsset) => void }) {
  const [direction, setDirection] = useState<'all' | 'up' | 'down'>(() => localStorage.getItem('cryptolens-radar-direction') as 'all' | 'up' | 'down' || 'all')
  const [liquidity, setLiquidity] = useState<'all' | '100m' | '500m'>(() => localStorage.getItem('cryptolens-radar-liquidity') as 'all' | '100m' | '500m' || 'all')
  const [order, setOrder] = useState<'score' | 'volume' | 'movement'>(() => localStorage.getItem('cryptolens-radar-order') as 'score' | 'volume' | 'movement' || 'score')
  const [discoveries, setDiscoveries] = useState<DiscoveryProject[]>([])
  const [discoveryState, setDiscoveryState] = useState<'loading' | 'ready' | 'unavailable'>('loading')
  useEffect(() => { localStorage.setItem('cryptolens-radar-direction', direction); localStorage.setItem('cryptolens-radar-liquidity', liquidity); localStorage.setItem('cryptolens-radar-order', order) }, [direction, liquidity, order])
  useEffect(() => {
    let active = true
    fetch('https://api.coingecko.com/api/v3/search/trending')
      .then((response) => response.ok ? response.json() : Promise.reject(new Error('Tendências indisponíveis')))
      .then((payload: { coins?: Array<{ item?: { id?: string; name?: string; symbol?: string; market_cap_rank?: number | null; data?: { price?: number; price_change_percentage_24h?: { usd?: number } } } }> }) => {
        if (!active) return
        setDiscoveries((payload.coins ?? []).map((entry) => entry.item).filter((item): item is NonNullable<typeof item> => Boolean(item?.id && item.name && item.symbol)).slice(0, 4).map((item) => ({ id: item.id!, name: item.name!, symbol: item.symbol!.toUpperCase(), rank: item.market_cap_rank ?? null, price: typeof item.data?.price === 'number' ? item.data.price : null, change: typeof item.data?.price_change_percentage_24h?.usd === 'number' ? item.data.price_change_percentage_24h.usd : null })))
        setDiscoveryState('ready')
      })
      .catch(() => { if (active) setDiscoveryState('unavailable') })
    return () => { active = false }
  }, [])
  const allItems = assets.filter((asset) => asset.price > 0).map((asset) => ({ ...asset, score: Math.round(Math.max(20, Math.min(95, 50 + asset.change * 8 + Math.log10(Math.max(asset.volume, 1)) * 1.4))) }))
  const items = allItems.filter((asset) => direction === 'all' || direction === 'up' && asset.change >= 0 || direction === 'down' && asset.change < 0).filter((asset) => liquidity === 'all' || asset.volume >= (liquidity === '100m' ? 100_000_000 : 500_000_000)).sort((a, b) => order === 'volume' ? b.volume - a.volume : order === 'movement' ? b.change - a.change : b.score - a.score)
  return <section className="workspace-page"><WorkspaceHeading eyebrow="SINAIS DE PESQUISA" title="Crypto Radar" description="Transforme preço e liquidez observados em uma fila de pesquisa que faz sentido para você." action={<span className="workspace-count">{items.length} sinais</span>}/><div className="radar-filterbar"><label>Movimento<select value={direction} onChange={(event) => setDirection(event.target.value as typeof direction)}><option value="all">Todos</option><option value="up">Em alta</option><option value="down">Em baixa</option></select></label><label>Liquidez observada<select value={liquidity} onChange={(event) => setLiquidity(event.target.value as typeof liquidity)}><option value="all">Qualquer volume</option><option value="100m">Acima de US$ 100 mi</option><option value="500m">Acima de US$ 500 mi</option></select></label><label>Ordenar por<select value={order} onChange={(event) => setOrder(event.target.value as typeof order)}><option value="score">Score parcial</option><option value="volume">Maior volume</option><option value="movement">Maior variação</option></select></label><button className="soft-btn" onClick={() => { setDirection('all'); setLiquidity('all'); setOrder('score') }}>Limpar filtros</button></div><div className="radar-method"><span className="small-orb">✦</span><p><b>Score parcial de pesquisa.</b> Calculado a partir de preço, variação e volume públicos da Binance. Os filtros ficam salvos neste navegador; eles ajudam a priorizar pesquisa, não são uma indicação de compra.</p></div>{items.length ? <div className="radar-cards">{items.map((asset, index) => { const status = asset.change >= 1 ? 'Tendência positiva' : asset.change <= -1 ? 'Alta atenção' : 'Acompanhamento'; return <button className="radar-detail-card" key={asset.symbol} onClick={() => onOpen(asset)}><div className="radar-card-top"><span className="rank">0{index + 1}</span><AssetMark symbol={asset.symbol} color={asset.color} size="lg"/><span><b>{asset.name}</b><small>{asset.symbol}/USDT</small></span><ScoreRing score={asset.score}/></div><div className="radar-card-price"><strong>{formatMoney(asset.price)}</strong><em className={asset.change >= 0 ? 'up-text' : 'down-text'}>{asset.change >= 0 ? '+' : ''}{asset.change.toFixed(2)}%</em></div><Sparkline positive={asset.change >= 0}/><div className="radar-card-meta"><span>{status}</span><small>Vol. {formatCompact(asset.volume)}</small></div><p>Abra o ativo para ver a linha do tempo e os limites desta leitura.</p></button>})}</div> : <div className="empty-state"><Icon name="radar" size={30}/><h2>Nenhum sinal para estes filtros</h2><p>Amplie o movimento ou o piso de liquidez para voltar a ver os ativos monitorados.</p></div>}<div className="discovery-section"><div className="discovery-heading"><div><span>DESCOBERTA DE PROJETOS</span><h2>Projetos para ficar de olho</h2><p>Projetos em tendência pública para iniciar uma investigação — não são recomendações nem sinais de compra.</p></div><small>Fonte: CoinGecko Trending</small></div>{discoveryState === 'loading' ? <div className="discovery-loading">Consultando projetos em tendência…</div> : discoveries.length ? <div className="discovery-grid">{discoveries.map((project, index) => <article key={project.id}><div><span className="discovery-rank">0{index + 1}</span><AssetMark symbol={project.symbol} color={['#7f9cff', '#89d9bb', '#e9b764', '#d98fb6'][index]} size="sm"/><b>{project.name}</b><small>{project.symbol}{project.rank ? ` · Rank #${project.rank}` : ''}</small></div><strong>{project.price ? formatMoney(project.price) : 'Preço indisponível'}</strong><em className={project.change === null || project.change >= 0 ? 'up-text' : 'down-text'}>{project.change === null ? '24h indisponível' : `${project.change >= 0 ? '+' : ''}${project.change.toFixed(2)}% 24h`}</em><a href={`https://www.coingecko.com/en/coins/${project.id}`} target="_blank" rel="noreferrer">Investigar fonte <Icon name="external" size={13}/></a></article>)}</div> : <div className="discovery-unavailable">A fonte de tendências está temporariamente indisponível. O Radar continua disponível com preço e volume da Binance.</div>}</div></section>
}

function NewsWorkspace() {
  const [category, setCategory] = useState('Todas')
  const categories = ['Todas', 'Bitcoin', 'Ethereum', 'Altcoins', 'DeFi', 'IA + Cripto', 'Regulação', 'ETFs', 'Tecnologia']
  return <section className="workspace-page"><WorkspaceHeading eyebrow="FONTES VERIFICÁVEIS" title="Crypto News" description="Um feed de notícias só é exibido quando a fonte, horário e link original puderem ser confirmados."/><div className="news-filters" aria-label="Filtrar notícias por assunto">{categories.map((item) => <button key={item} className={category === item ? 'selected' : ''} aria-pressed={category === item} onClick={() => setCategory(item)}>{item}</button>)}</div><div className="news-empty-large"><span className="news-empty-icon"><Icon name="news" size={28}/></span><div><h2>Feed de {category === 'Todas' ? 'notícias' : category} aguardando uma fonte conectada</h2><p>Conecte uma API de notícias ou RSS no backend para habilitar título, fonte, horário, imagem, impacto e link original. O CryptoLens não preenche este espaço com manchetes fictícias.</p><span className="integration-note">Integração de notícias requer backend seguro e uma fonte com licença apropriada.</span></div></div></section>
}

function CommunityWorkspace({ posts, onCreate, onLike, onReply }: { posts: CommunityPost[]; onCreate: (topic: string, message: string) => void; onLike: (id: string) => void; onReply: (id: string, message: string) => void }) {
  const [topic, setTopic] = useState('Pesquisa')
  const [message, setMessage] = useState('')
  const [replyText, setReplyText] = useState<Record<string, string>>({})
  const submit = (event: React.FormEvent) => { event.preventDefault(); if (message.trim()) { onCreate(topic, message.trim()); setMessage('') } }
  const sendReply = (postId: string) => { const reply = replyText[postId]?.trim(); if (reply) { onReply(postId, reply); setReplyText((current) => ({ ...current, [postId]: '' })) } }
  return <section className="workspace-page"><WorkspaceHeading eyebrow="CONVERSAS DE PESQUISA" title="Comunidade CryptoLens" description="Troque hipóteses, fontes e perguntas de pesquisa sem transformar o painel em um feed de hype." action={<span className="workspace-count">{posts.length} {posts.length === 1 ? 'tópico' : 'tópicos'}</span>}/><div className="community-notice"><Icon name="users" size={19}/><p><b>Espaço local neste protótipo.</b> Publicações, curtidas e respostas funcionam agora neste navegador. Para conversas entre contas e moderação real, conecte login e banco de dados no backend.</p></div><div className="community-layout"><form className="community-composer" onSubmit={submit}><span>INICIAR UMA CONVERSA</span><h2>O que você está investigando?</h2><label>Assunto<select value={topic} onChange={(event) => setTopic(event.target.value)}><option>Pesquisa</option><option>Mercado</option><option>Risco</option><option>Ferramentas</option></select></label><label>Mensagem<textarea value={message} onChange={(event) => setMessage(event.target.value)} maxLength={500} placeholder="Ex.: alguém encontrou uma fonte confiável para acompanhar..."/></label><div><small>{message.length}/500</small><button className="primary-btn" type="submit"><Icon name="plus" size={16}/> Publicar</button></div><p>Evite promessas de retorno, sinais de compra ou dados pessoais. A publicação será identificada como “Você”.</p></form><div className="community-feed">{posts.length ? posts.map((post) => <article className="community-post" key={post.id}><header><span className="community-avatar">{post.author.slice(0, 1).toUpperCase()}</span><div><b>{post.author}</b><small>{post.topic} · {new Date(post.createdAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}</small></div></header><p>{post.message}</p><div className="post-actions"><button className={post.liked ? 'liked' : ''} onClick={() => onLike(post.id)}>♡ {post.likes}</button><span>{post.replies.length} {post.replies.length === 1 ? 'resposta' : 'respostas'}</span></div>{post.replies.length > 0 && <div className="reply-list">{post.replies.map((reply) => <div key={reply.id}><b>{reply.author}</b><p>{reply.message}</p></div>)}</div>}<div className="reply-box"><input value={replyText[post.id] || ''} onChange={(event) => setReplyText((current) => ({ ...current, [post.id]: event.target.value }))} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); sendReply(post.id) } }} placeholder="Adicionar uma resposta"/><button onClick={() => sendReply(post.id)}>Enviar</button></div></article>) : <div className="empty-state community-empty"><Icon name="users" size={30}/><h2>Comece a conversa</h2><p>Publique uma hipótese, uma dúvida ou uma fonte que merece ser conferida.</p></div>}</div></div></section>
}

function WatchlistWorkspace({ assets, watchlist, onToggle, onOpen }: { assets: MarketAsset[]; watchlist: string[]; onToggle: (symbol: string) => void; onOpen: (asset: MarketAsset) => void }) {
  const selected = assets.filter((asset) => watchlist.includes(asset.symbol))
  return <section className="workspace-page"><WorkspaceHeading eyebrow="SEUS ATIVOS" title="Watchlist" description="Acompanhe os ativos que você quer pesquisar sem misturar isso com uma decisão de compra." action={<span className="workspace-count">{watchlist.length} ativos</span>}/><div className="watchlist-layout"><div className="data-table-panel">{selected.length ? <><div className="data-table-head"><span>ATIVO</span><span>PREÇO</span><span>24H</span><span>VOLUME</span><span>TENDÊNCIA</span><span/></div>{selected.map((asset) => <article className="data-table-row" key={asset.symbol}><span className="table-asset"><AssetMark symbol={asset.symbol} color={asset.color}/><i><b>{asset.name}</b><small>{asset.symbol}/USDT</small></i></span><strong>{formatMoney(asset.price)}</strong><em className={asset.change >= 0 ? 'up-text' : 'down-text'}>{asset.price ? `${asset.change >= 0 ? '+' : ''}${asset.change.toFixed(2)}%` : '—'}</em><span>{formatCompact(asset.volume)}</span><Sparkline positive={asset.change >= 0} small/><span className="table-actions"><button className="watch-toggle saved" onClick={() => onToggle(asset.symbol)} aria-label={`Remover ${asset.name} da watchlist`}><Icon name="bookmark" size={16}/></button><button className="row-detail" onClick={() => onOpen(asset)} aria-label={`Abrir detalhes de ${asset.name}`}><Icon name="chevron" size={16}/></button></span></article>)}</> : <div className="empty-state"><Icon name="bookmark" size={30}/><h2>Sua watchlist está vazia</h2><p>Escolha ativos abaixo para começar a acompanhar.</p></div>}</div><aside className="add-assets-panel"><span>ADICIONAR ATIVOS</span><h2>Explore o mercado</h2><p>Os ativos ficam salvos neste navegador.</p>{assets.map((asset) => <button key={asset.symbol} onClick={() => onToggle(asset.symbol)}><AssetMark symbol={asset.symbol} color={asset.color} size="sm"/><b>{asset.name}</b><span>{watchlist.includes(asset.symbol) ? 'Adicionado' : 'Adicionar'}</span></button>)}</aside></div></section>
}

function IntelligenceWorkspace({ assets, fearGreed, marketOverview, onOpenAI }: { assets: MarketAsset[]; fearGreed: { value: number; label: string } | null; marketOverview: GlobalMarketMetrics | null; onOpenAI: () => void }) {
  const btc = assets.find((asset) => asset.symbol === 'BTC') ?? assets[0]
  const altcoins = assets.filter((asset) => asset.symbol !== 'BTC')
  const momentum = altcoins.length ? altcoins.reduce((sum, asset) => sum + asset.change, 0) / altcoins.length : 0
  return <section className="workspace-page"><WorkspaceHeading eyebrow="LEITURA DE DADOS" title="Market Intelligence" description="Contexto objetivo para sua pesquisa — não é recomendação financeira." action={<button className="primary-btn" onClick={onOpenAI}>Perguntar ao CryptoLens AI <span>✦</span></button>}/><div className="intelligence-metrics"><article><span>FEAR & GREED</span><b>{fearGreed ? fearGreed.value : '—'}</b><small>{fearGreed ? fearGreed.label : 'Dados temporariamente indisponíveis'}</small><i className="metric-source">alternative.me</i></article><article><span>DOMINÂNCIA BTC</span><b>{marketOverview ? `${marketOverview.bitcoinDominance.toFixed(1)}%` : '—'}</b><small>participação do Bitcoin no mercado</small><i className="metric-source">CoinGecko Global</i></article><article><span>MARKET CAP GLOBAL</span><b>{marketOverview ? formatCompact(marketOverview.totalMarketCap) : '—'}</b><small className={marketOverview && marketOverview.marketCapChange < 0 ? 'down-text' : 'up-text'}>{marketOverview ? `${marketOverview.marketCapChange >= 0 ? '+' : ''}${marketOverview.marketCapChange.toFixed(2)}% em 24h` : 'Dados temporariamente indisponíveis'}</small><i className="metric-source">CoinGecko Global</i></article><article><span>VOLUME GLOBAL 24H</span><b>{marketOverview ? formatCompact(marketOverview.totalVolume) : '—'}</b><small>todos os ativos acompanhados pela fonte</small><i className="metric-source">CoinGecko Global</i></article></div><div className="intelligence-reading"><div><span>LEITURA ATUAL</span><h2>Os ativos monitorados apresentam <em className={momentum >= 0 ? 'up-text' : 'down-text'}>{momentum >= 0 ? 'movimento levemente positivo' : 'pressão vendedora'}</em> nas últimas 24 horas.</h2><p>Entre os pares mostrados, {btc?.symbol ?? 'BTC'} variou {btc ? `${btc.change >= 0 ? '+' : ''}${btc.change.toFixed(2)}%` : '—'} e o momentum médio das altcoins é {altcoins.length ? `${momentum >= 0 ? '+' : ''}${momentum.toFixed(2)}%` : 'indisponível'}. Catalisadores, fluxo institucional, notícias e dados on-chain exigem fontes adicionais antes de qualquer conclusão.</p></div><div className="intelligence-actions"><button onClick={onOpenAI}>Como interpretar este cenário? <Icon name="arrow" size={15}/></button><button onClick={onOpenAI}>Quais ativos tiveram mais volume? <Icon name="arrow" size={15}/></button><button onClick={onOpenAI}>Quais riscos ainda não estão cobertos? <Icon name="arrow" size={15}/></button></div></div><div className="intelligence-coverage"><span>COBERTURA ATUAL</span><div><article><b>Preço e volume</b><small>Binance Spot</small></article><article><b>Humor de mercado</b><small>alternative.me</small></article><article><b>Visão global</b><small>CoinGecko Global</small></article><article><b>Notícias e on-chain</b><small>Aguardando fonte verificável</small></article></div></div></section>
}

function AlertsWorkspace({ assets, alerts, onAdd, onRemove }: { assets: MarketAsset[]; alerts: AlertRule[]; onAdd: (rule: Omit<AlertRule, 'id'>) => void; onRemove: (id: string) => void }) {
  const [symbol, setSymbol] = useState('BTC')
  const [metric, setMetric] = useState<'price' | 'change'>('price')
  const [direction, setDirection] = useState<AlertRule['direction']>('above')
  const [target, setTarget] = useState('')
  const submit = (event: React.FormEvent) => { event.preventDefault(); const value = Number(target); if (Number.isFinite(value) && (metric === 'change' || value > 0)) { onAdd({ symbol, metric, direction, target: value }); setTarget('') } }
  return <section className="workspace-page"><WorkspaceHeading eyebrow="MONITORAMENTO PESSOAL" title="Alertas" description="Crie condições de preço ou variação de 24h. O alerta é informativo e não executa operações."/><div className="alerts-layout"><form className="alert-builder" onSubmit={submit}><span>NOVO ALERTA</span><h2>Quando devo olhar de novo?</h2><label>Ativo<select value={symbol} onChange={(event) => setSymbol(event.target.value)}>{assets.map((asset) => <option key={asset.symbol} value={asset.symbol}>{asset.name} ({asset.symbol})</option>)}</select></label><label>Monitorar<select value={metric} onChange={(event) => setMetric(event.target.value as typeof metric)}><option value="price">Preço spot</option><option value="change">Variação nas últimas 24h</option></select></label><label>Condição<select value={direction} onChange={(event) => setDirection(event.target.value as AlertRule['direction'])}><option value="above">Subir acima de</option><option value="below">Cair abaixo de</option></select></label><label>{metric === 'price' ? 'Preço-alvo (US$)' : 'Variação-alvo (%)'}<input type="number" step="any" required value={target} onChange={(event) => setTarget(event.target.value)} placeholder={metric === 'price' ? 'Ex.: 100000' : 'Ex.: -5'}/></label><button className="primary-btn" type="submit"><Icon name="bell" size={16}/> Criar alerta</button><p>Preço e variação 24h são atualizados enquanto o painel está aberto. Notícias, volume e score exigem fontes e notificações no backend.</p></form><div className="alerts-list"><div className="list-caption"><span>ALERTAS ATIVOS</span><b>{alerts.length}</b></div>{alerts.length ? alerts.map((rule) => { const asset = assets.find((item) => item.symbol === rule.symbol); const isChange = rule.metric === 'change'; const current = isChange ? asset?.change ?? 0 : asset?.price ?? 0; const triggered = asset && (rule.direction === 'above' ? current >= rule.target : current <= rule.target); const targetLabel = isChange ? `${rule.target >= 0 ? '+' : ''}${rule.target.toFixed(2)}%` : formatMoney(rule.target); const currentLabel = isChange ? `${current >= 0 ? '+' : ''}${current.toFixed(2)}%` : formatMoney(current); return <article key={rule.id} className={triggered ? 'alert-row triggered' : 'alert-row'}><AssetMark symbol={rule.symbol} color={asset?.color ?? '#82d7b5'} size="sm"/><div><b>{rule.symbol} {isChange ? '24h' : 'preço'} {rule.direction === 'above' ? 'acima de' : 'abaixo de'} {targetLabel}</b><small>{isChange ? 'Variação atual' : 'Preço atual'}: {currentLabel}</small></div><span>{triggered ? 'Condição atingida' : 'Monitorando'}</span><button onClick={() => onRemove(rule.id)}>Remover</button></article> }) : <div className="empty-state compact"><Icon name="bell" size={26}/><h2>Nenhum alerta configurado</h2><p>Crie sua primeira condição ao lado.</p></div>}</div></div></section>
}

function PortfolioWorkspace({ assets, positions, onAdd, onRemove }: { assets: MarketAsset[]; positions: PortfolioPosition[]; onAdd: (position: Omit<PortfolioPosition, 'id'>) => void; onRemove: (id: string) => void }) {
  const [symbol, setSymbol] = useState('BTC')
  const [quantity, setQuantity] = useState('')
  const [average, setAverage] = useState('')
  const [simulation, setSimulation] = useState({ amount: '1000', symbol: 'BTC', entry: '', future: '' })
  const submit = (event: React.FormEvent) => { event.preventDefault(); const q = Number(quantity); const p = Number(average); if (q > 0 && p > 0) { onAdd({ symbol, quantity: q, averagePrice: p }); setQuantity(''); setAverage('') } }
  const calculated = positions.map((position) => { const asset = assets.find((item) => item.symbol === position.symbol); const currentPrice = asset?.price ?? 0; const invested = position.quantity * position.averagePrice; const current = position.quantity * currentPrice; return { ...position, asset, invested, current, pnl: current - invested } })
  const totalInvested = calculated.reduce((sum, position) => sum + position.invested, 0)
  const totalCurrent = calculated.reduce((sum, position) => sum + position.current, 0)
  const simResult = Number(simulation.entry) > 0 && Number(simulation.future) > 0 ? Number(simulation.amount) * (Number(simulation.future) / Number(simulation.entry) - 1) : null
  return <section className="workspace-page"><WorkspaceHeading eyebrow="ACOMPANHAMENTO E SIMULAÇÃO" title="Minha Carteira" description="Registre posições manualmente. Esta área não guarda cripto, chaves ou saldo de exchange."/><div className="portfolio-summary"><div><span>VALOR ESTIMADO</span><b>{formatMoney(totalCurrent)}</b><small>baseado no preço spot atual</small></div><div><span>VALOR APORTADO</span><b>{formatMoney(totalInvested)}</b><small>preço médio informado por você</small></div><div><span>RESULTADO ESTIMADO</span><b className={totalCurrent - totalInvested >= 0 ? 'up-text' : 'down-text'}>{totalInvested ? `${totalCurrent - totalInvested >= 0 ? '+' : ''}${formatMoney(totalCurrent - totalInvested)}` : '—'}</b><small>não considera taxas ou impostos</small></div></div><div className="portfolio-grid"><div className="portfolio-positions"><div className="list-caption"><span>SUAS POSIÇÕES</span><b>{positions.length}</b></div>{calculated.length ? calculated.map((position) => <article className="position-row" key={position.id}><AssetMark symbol={position.symbol} color={position.asset?.color ?? '#82d7b5'} size="sm"/><div><b>{position.symbol}</b><small>{position.quantity} unidades · PM {formatMoney(position.averagePrice)}</small></div><strong>{formatMoney(position.current)}</strong><em className={position.pnl >= 0 ? 'up-text' : 'down-text'}>{position.invested ? `${position.pnl >= 0 ? '+' : ''}${((position.pnl / position.invested) * 100).toFixed(2)}%` : '—'}</em><button onClick={() => onRemove(position.id)}>Remover</button></article>) : <div className="empty-state compact"><Icon name="wallet" size={26}/><h2>Carteira vazia</h2><p>Adicione uma posição manualmente.</p></div>}</div><form className="portfolio-form" onSubmit={submit}><span>ADICIONAR POSIÇÃO</span><label>Ativo<select value={symbol} onChange={(event) => setSymbol(event.target.value)}>{assets.map((asset) => <option key={asset.symbol} value={asset.symbol}>{asset.name} ({asset.symbol})</option>)}</select></label><label>Quantidade<input type="number" min="0" step="any" required value={quantity} onChange={(event) => setQuantity(event.target.value)} placeholder="0,00"/></label><label>Preço médio (US$)<input type="number" min="0" step="any" required value={average} onChange={(event) => setAverage(event.target.value)} placeholder="0,00"/></label><button className="primary-btn" type="submit"><Icon name="plus" size={16}/> Adicionar à carteira</button></form></div><div className="simulator"><div><span>SIMULADOR DE INVESTIMENTO</span><h2>Explore cenários hipotéticos</h2><p>Não é promessa de retorno — apenas uma conta baseada nos valores que você informa.</p></div><label>Valor hipotético<input value={simulation.amount} onChange={(event) => setSimulation({ ...simulation, amount: event.target.value })} type="number" min="0"/></label><label>Preço de entrada<input value={simulation.entry} onChange={(event) => setSimulation({ ...simulation, entry: event.target.value })} type="number" min="0" placeholder="US$"/></label><label>Preço futuro<input value={simulation.future} onChange={(event) => setSimulation({ ...simulation, future: event.target.value })} type="number" min="0" placeholder="US$"/></label><div className="simulation-result"><span>RESULTADO HIPOTÉTICO</span><b className={simResult === null || simResult >= 0 ? 'up-text' : 'down-text'}>{simResult === null ? 'Informe os preços' : `${simResult >= 0 ? '+' : ''}${formatMoney(simResult)}`}</b></div></div></section>
}

function PortfolioDistribution({ assets, positions }: { assets: MarketAsset[]; positions: PortfolioPosition[] }) {
  const exposures = positions.map((position) => { const asset = assets.find((item) => item.symbol === position.symbol); return { ...position, asset, current: position.quantity * (asset?.price ?? 0) } }).filter((position) => position.current > 0)
  const total = exposures.reduce((sum, position) => sum + position.current, 0)
  let cursor = 0
  const spectrum = exposures.map((position) => { const share = total ? position.current / total * 100 : 0; const start = cursor; cursor += share; return `${position.asset?.color ?? '#82d7b5'} ${start}% ${cursor}%` }).join(', ')
  return <section className="portfolio-insights-section"><div className="portfolio-insights-heading"><div><span>VISUALIZAÇÃO DE EXPOSIÇÃO</span><h2>Como sua carteira está distribuída</h2><p>Estimativa com base no preço spot atual e nas posições informadas por você.</p></div><small>Sem conexão com exchange</small></div>{exposures.length ? <div className="portfolio-distribution"><div className="allocation-donut" style={{ background: `conic-gradient(${spectrum})` }}><div><b>{formatMoney(total)}</b><small>valor estimado</small></div></div><div className="allocation-list">{exposures.map((position) => { const share = total ? position.current / total * 100 : 0; return <article key={position.id}><div><span style={{ background: position.asset?.color ?? '#82d7b5' }}/><b>{position.symbol}</b><small>{share.toFixed(1)}% · {formatMoney(position.current)}</small></div><i><em style={{ width: `${share}%`, background: position.asset?.color ?? '#82d7b5' }}/></i></article> })}</div><aside><span>LEITURA RÁPIDA</span><h3>{exposures.length === 1 ? 'Uma única posição concentra toda a exposição.' : `${exposures[0].symbol} é sua maior exposição registrada.`}</h3><p>Essa leitura não considera ativos mantidos fora do painel, taxas, impostos ou rendimentos.</p></aside></div> : <div className="portfolio-empty-insight"><Icon name="wallet" size={24}/><p>Adicione uma posição para ver a distribuição e a exposição por ativo.</p></div>}</section>
}

function WorkspacePage({ page, assets, watchlist, onToggle, onOpenAsset, dataState, onRetryMarket, fearGreed, marketOverview, onOpenAI, alerts, onAddAlert, onRemoveAlert, positions, onAddPosition, onRemovePosition, communityPosts, onCreatePost, onLikePost, onReplyPost }: { page: NavItem; assets: MarketAsset[]; watchlist: string[]; onToggle: (symbol: string) => void; onOpenAsset: (asset: MarketAsset) => void; dataState: 'loading' | 'live' | 'unavailable' | 'offline'; onRetryMarket: () => void; fearGreed: { value: number; label: string } | null; marketOverview: GlobalMarketMetrics | null; onOpenAI: () => void; alerts: AlertRule[]; onAddAlert: (rule: Omit<AlertRule, 'id'>) => void; onRemoveAlert: (id: string) => void; positions: PortfolioPosition[]; onAddPosition: (position: Omit<PortfolioPosition, 'id'>) => void; onRemovePosition: (id: string) => void; communityPosts: CommunityPost[]; onCreatePost: (topic: string, message: string) => void; onLikePost: (id: string) => void; onReplyPost: (id: string, message: string) => void }) {
  if (page === 'Mercado') return <MarketWorkspace assets={assets} watchlist={watchlist} onToggle={onToggle} onOpen={onOpenAsset} dataState={dataState} onRetry={onRetryMarket}/>
  if (page === 'Radar') return <RadarWorkspace assets={assets} onOpen={onOpenAsset}/>
  if (page === 'Notícias') return <NewsWorkspace/>
  if (page === 'Comunidade') return <CommunityWorkspace posts={communityPosts} onCreate={onCreatePost} onLike={onLikePost} onReply={onReplyPost}/>
  if (page === 'Watchlist') return <WatchlistWorkspace assets={assets} watchlist={watchlist} onToggle={onToggle} onOpen={onOpenAsset}/>
  if (page === 'Análises') return <IntelligenceWorkspace assets={assets} fearGreed={fearGreed} marketOverview={marketOverview} onOpenAI={onOpenAI}/>
  if (page === 'Alertas') return <AlertsWorkspace assets={assets} alerts={alerts} onAdd={onAddAlert} onRemove={onRemoveAlert}/>
  return <><PortfolioWorkspace assets={assets} positions={positions} onAdd={onAddPosition} onRemove={onRemovePosition}/><PortfolioDistribution assets={assets} positions={positions}/></>
}

function AssetDetailDialog({ asset, watchlist, onClose, onToggle }: { asset: MarketAsset; watchlist: string[]; onClose: () => void; onToggle: (symbol: string) => void }) {
  const score = Math.round(Math.max(20, Math.min(95, 50 + asset.change * 8 + Math.log10(Math.max(asset.volume, 1)) * 1.4)))
  const [detailPeriod, setDetailPeriod] = useState('1D')
  const [history, setHistory] = useState<number[]>([])
  const [historyState, setHistoryState] = useState<'loading' | 'ready' | 'unavailable'>('loading')
  useEffect(() => {
    let active = true
    const config = periodConfig[detailPeriod]
    setHistoryState('loading')
    fetch(`https://api.binance.com/api/v3/klines?symbol=${asset.symbol}USDT&interval=${config.interval}&limit=${config.limit}`)
      .then((response) => response.ok ? response.json() : Promise.reject(new Error('Histórico indisponível')))
      .then((rows: Array<[number, string, string, string, string]>) => { if (active) { setHistory(rows.map((row) => Number(row[4])).filter(Number.isFinite)); setHistoryState('ready') } })
      .catch(() => { if (active) { setHistory([]); setHistoryState('unavailable') } })
    return () => { active = false }
  }, [asset.symbol, detailPeriod])
  useEffect(() => {
    if (!asset.price) return
    setHistory((current) => current.length ? [...current.slice(0, -1), asset.price] : current)
  }, [asset.price])
  const hourChange = history.length > 1 && history[history.length - 2] ? (asset.price / history[history.length - 2] - 1) * 100 : null
  return <div className="dialog-backdrop" role="presentation" onMouseDown={onClose}><section className="asset-dialog" role="dialog" aria-modal="true" aria-label={`Análise de ${asset.name}`} onMouseDown={(event) => event.stopPropagation()}><button className="dialog-close" onClick={onClose} aria-label="Fechar detalhes">×</button><div className="asset-dialog-hero"><AssetMark symbol={asset.symbol} color={asset.color} size="lg"/><div><span>MERCADO SPOT · TEMPO REAL</span><h2>{asset.name} <small>{asset.symbol}/USDT</small></h2></div><button className={watchlist.includes(asset.symbol) ? 'watch-toggle saved dialog-watch' : 'watch-toggle dialog-watch'} onClick={() => onToggle(asset.symbol)}><Icon name="bookmark" size={17}/> {watchlist.includes(asset.symbol) ? 'Na watchlist' : 'Adicionar à watchlist'}</button></div><div className="asset-detail-numbers"><div><span>PREÇO</span><b>{formatMoney(asset.price)}</b></div><div><span>ÚLTIMO INTERVALO</span><b className={hourChange === null || hourChange >= 0 ? 'up-text' : 'down-text'}>{hourChange === null ? '—' : `${hourChange >= 0 ? '+' : ''}${hourChange.toFixed(2)}%`}</b></div><div><span>VARIAÇÃO 24H</span><b className={asset.change >= 0 ? 'up-text' : 'down-text'}>{asset.change >= 0 ? '+' : ''}{asset.change.toFixed(2)}%</b></div><div><span>VOLUME 24H</span><b>{formatCompact(asset.volume)}</b></div><div><span>SCORE PARCIAL</span><b>{score}/100</b></div></div><div className="detail-chart-toolbar"><div><b>Gráfico de preço</b><span>{periodConfig[detailPeriod].label} · Binance Spot</span></div><div className="periods" aria-label="Período do gráfico">{Object.keys(periodConfig).map((item) => <button key={item} className={detailPeriod === item ? 'selected' : ''} aria-pressed={detailPeriod === item} onClick={() => setDetailPeriod(item)}>{item}</button>)}</div></div>{historyState === 'ready' && history.length ? <div className="asset-detail-chart"><PriceChart prices={history} price={asset.price} interval={detailPeriod} assetLabel={asset.name}/></div> : <div className="asset-history-pending" role="status"><Icon name="chart" size={22}/><p>{historyState === 'loading' ? 'Carregando a linha do tempo pública deste ativo…' : 'O histórico deste ativo está temporariamente indisponível. Nenhum dado estimado será exibido.'}</p></div>}<div className="asset-research-grid"><article><span>LEITURA DO MERCADO</span><p>{asset.name} registra {asset.change >= 0 ? 'alta' : 'queda'} de {Math.abs(asset.change).toFixed(2)}% em 24h e volume de {formatCompact(asset.volume)} no par {asset.symbol}/USDT. Isso descreve o mercado, não prevê o próximo movimento.</p></article><article><span>ANTES DE INVESTIR</span><p>Compare fundamentos, liquidez em outras fontes, tokenomics, segurança, regulação e quanto uma perda afetaria sua carteira.</p></article></div><div className="external-links"><a href={`https://www.binance.com/en/trade/${asset.symbol}_USDT`} target="_blank" rel="noreferrer">Ver mercado de origem <Icon name="external" size={14}/></a><a href={`https://www.tradingview.com/symbols/${asset.symbol}USDT/?exchange=BINANCE`} target="_blank" rel="noreferrer">TradingView <Icon name="external" size={14}/></a><a href={`https://www.coingecko.com/en/search?query=${asset.name}`} target="_blank" rel="noreferrer">CoinGecko <Icon name="external" size={14}/></a></div></section></div>
}

function AiDialog({ assets, onClose }: { assets: MarketAsset[]; onClose: () => void }) {
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState('')
  const ask = (value: string) => { const top = [...assets].sort((a, b) => b.change - a.change)[0]; const volume = [...assets].sort((a, b) => b.volume - a.volume)[0]; const text = value.toLowerCase(); if (!assets.some((asset) => asset.price > 0)) { setAnswer('Os dados de mercado ainda estão carregando. Tente novamente em alguns segundos.'); return } if (text.includes('volume')) setAnswer(`Nos ativos monitorados, ${volume.name} (${volume.symbol}) tem o maior volume observado: ${formatCompact(volume.volume)} em 24h. Isso descreve atividade de negociação, não uma recomendação.`); else if (text.includes('bitcoin') || text.includes('btc')) { const btc = assets.find((asset) => asset.symbol === 'BTC')!; setAnswer(`O Bitcoin está em ${formatMoney(btc.price)}, com variação de ${btc.change.toFixed(2)}% em 24h e volume de ${formatCompact(btc.volume)} na Binance. Para explicar o movimento, ainda seriam necessárias fontes de notícias e dados on-chain.`); } else setAnswer(`Entre os ativos acompanhados, ${top.name} (${top.symbol}) apresenta a maior variação de 24h: ${top.change >= 0 ? '+' : ''}${top.change.toFixed(2)}%. É um sinal para pesquisa, não uma previsão. Fontes usadas: preços e volumes públicos da Binance.`) }
  return <div className="dialog-backdrop" role="presentation" onMouseDown={onClose}><section className="ai-dialog" role="dialog" aria-modal="true" aria-label="CryptoLens AI" onMouseDown={(event) => event.stopPropagation()}><button className="dialog-close" onClick={onClose}>×</button><div className="ai-dialog-heading"><span className="ai-orb">✦</span><div><span>CRYPTOLENS AI</span><h2>Interprete dados, com contexto.</h2></div></div><p>A resposta usa apenas os dados disponíveis no painel e identifica a fonte. Não faz promessas sobre o futuro.</p><div className="ai-suggestions"><button onClick={() => ask('Quais ativos tiveram mais volume?')}>Quais ativos tiveram mais volume?</button><button onClick={() => ask('Por que o Bitcoin está em movimento?')}>Por que o Bitcoin está em movimento?</button><button onClick={() => ask('Quais projetos chamam atenção?')}>Quais projetos chamam atenção?</button></div>{answer && <div className="ai-answer"><span>RESPOSTA BASEADA EM DADOS</span><p>{answer}</p><small>Fontes: Binance Spot · preços e volume 24h</small></div>}<form onSubmit={(event) => { event.preventDefault(); if (question.trim()) ask(question) }}><input value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="Pergunte sobre os dados disponíveis"/><button className="primary-btn" type="submit">Analisar <Icon name="arrow" size={16}/></button></form></section></div>
}

type ChatMessage = { id: string; role: 'assistant' | 'user'; text: string; sources?: string[] }

function ConversationalAiDialog({ assets, alerts, positions, onClose, onNavigate }: { assets: MarketAsset[]; alerts: AlertRule[]; positions: PortfolioPosition[]; onClose: () => void; onNavigate: (page: NavItem) => void }) {
  const [question, setQuestion] = useState('')
  const [messages, setMessages] = useState<ChatMessage[]>([{ id: 'welcome', role: 'assistant', text: 'Olá! Eu sou o CryptoLens AI. Posso transformar os dados que estão no painel em uma leitura clara, apontar limites e sugerir o próximo passo de pesquisa. Por onde começamos?', sources: ['Painel CryptoLens'] }])
  const getReply = (value: string): ChatMessage => {
    const text = value.toLowerCase()
    const available = assets.filter((asset) => asset.price > 0)
    if (!available.length) return { id: `${Date.now()}-a`, role: 'assistant', text: 'Ainda estou aguardando os dados públicos do mercado. Assim que a Binance responder, consigo comparar preço, variação e volume com você.', sources: ['Binance Spot · aguardando conexão'] }
    const btc = available.find((asset) => asset.symbol === 'BTC') ?? available[0]
    const top = [...available].sort((a, b) => b.change - a.change)[0]
    const volume = [...available].sort((a, b) => b.volume - a.volume)[0]
    const mentioned = available.find((asset) => text.includes(asset.symbol.toLowerCase()) || text.includes(asset.name.toLowerCase()))
    if (text.includes('carteira') || text.includes('posição') || text.includes('portfólio')) return { id: `${Date.now()}-a`, role: 'assistant', text: positions.length ? `Você tem ${positions.length} ${positions.length === 1 ? 'posição registrada' : 'posições registradas'} para acompanhamento. Eu usaria a tela Minha Carteira para separar preço médio, valor atual e exposição por ativo antes de tirar qualquer conclusão. Lembrete: o painel não inclui taxas, impostos ou saldo de exchange.` : 'Ainda não há posições registradas. Se quiser acompanhar uma exposição, você pode adicionar quantidade e preço médio em Minha Carteira; nada é conectado à sua exchange.', sources: ['Minha Carteira · dados informados por você'] }
    if (text.includes('alerta')) return { id: `${Date.now()}-a`, role: 'assistant', text: alerts.length ? `Há ${alerts.length} ${alerts.length === 1 ? 'alerta' : 'alertas'} salvo${alerts.length === 1 ? '' : 's'} neste navegador. Um alerta serve para chamar sua atenção quando uma condição acontece; ele não compra, vende ou envia ordem para nenhuma corretora.` : 'Você ainda não configurou alertas. Uma boa regra é definir um nível que mudaria sua pesquisa — e não apenas acompanhar qualquer oscilação diária.', sources: ['Alertas · armazenamento local'] }
    if (text.includes('volume') || text.includes('liquidez')) return { id: `${Date.now()}-a`, role: 'assistant', text: `Entre os ativos exibidos, ${volume.name} (${volume.symbol}) apresenta o maior volume observado: ${formatCompact(volume.volume)} em 24h. Volume indica atividade naquele par da Binance, mas não mede por si só qualidade do projeto nem garante que o movimento continuará. O próximo passo é abrir o Radar e comparar o ativo com o seu filtro de liquidez.`, sources: ['Binance Spot · volume 24h'] }
    if (text.includes('risco') || text.includes('seguro') || text.includes('comprar')) return { id: `${Date.now()}-a`, role: 'assistant', text: `Posso ajudar a estruturar a análise, mas não dizer se é hora de comprar. Para ${btc.name}, o painel mostra ${formatMoney(btc.price)} e ${btc.change >= 0 ? '+' : ''}${btc.change.toFixed(2)}% em 24h. O que ainda não está coberto aqui: notícias verificadas, fundamentos, tokenomics, liquidez fora da Binance, perfil de risco e seu horizonte. Antes de agir, vale checar esses pontos e definir o que invalidaria sua tese.`, sources: ['Binance Spot · preço e variação 24h'] }
    if ((text.includes('compar') || text.includes('versus') || text.includes(' vs ')) && available.length > 1) {
      const ordered = [...available].sort((a, b) => b.volume - a.volume).slice(0, 3)
      return { id: `${Date.now()}-a`, role: 'assistant', text: `Comparação objetiva por volume observado: ${ordered.map((asset) => `${asset.symbol} ${formatCompact(asset.volume)} (${asset.change >= 0 ? '+' : ''}${asset.change.toFixed(2)}% em 24h)`).join('; ')}. Volume e variação ajudam a comparar atividade e momento, mas não substituem fundamentos, segurança, tokenomics e adequação ao seu risco.`, sources: ['Binance Spot · preço, variação e volume 24h'] }
    }
    if (mentioned) return { id: `${Date.now()}-a`, role: 'assistant', text: `${mentioned.name} (${mentioned.symbol}) está em ${formatMoney(mentioned.price)}, com ${mentioned.change >= 0 ? 'alta' : 'queda'} de ${Math.abs(mentioned.change).toFixed(2)}% e volume de ${formatCompact(mentioned.volume)} nas últimas 24h. Abra o ativo para explorar o gráfico por período. Antes de considerar um investimento, confira fundamentos, oferta do token, liquidez, segurança do protocolo e defina um limite de perda compatível com você.`, sources: [`Binance Spot · ${mentioned.symbol}/USDT`] }
    if (text.includes('btc') || text.includes('bitcoin')) return { id: `${Date.now()}-a`, role: 'assistant', text: `${btc.name} está em ${formatMoney(btc.price)}, com ${btc.change >= 0 ? '+' : ''}${btc.change.toFixed(2)}% nas últimas 24 horas e volume de ${formatCompact(btc.volume)} no par BTC/USDT. Isso descreve o momento observado, não explica a causa. Quer que eu ajude a listar as fontes que faltam para investigar o movimento?`, sources: ['Binance Spot · BTC/USDT'] }
    if (text.includes('comunidade') || text.includes('pessoas')) return { id: `${Date.now()}-a`, role: 'assistant', text: 'A Comunidade já permite publicar, curtir e responder dentro deste navegador. Para que outras pessoas vejam e participem, o próximo passo técnico é conectar autenticação, banco de dados e moderação — sem isso, não é seguro nem verdadeiro chamar de comunidade multiusuário.', sources: ['Comunidade CryptoLens · modo local'] }
    return { id: `${Date.now()}-a`, role: 'assistant', text: `${top.name} (${top.symbol}) é o ativo com maior variação entre os monitorados agora: ${top.change >= 0 ? '+' : ''}${top.change.toFixed(2)}% em 24h. Eu trataria isso como um convite à pesquisa, não como uma previsão. Posso seguir por três caminhos: comparar volume, mapear riscos que o painel ainda não cobre, ou organizar uma pergunta para a comunidade.`, sources: ['Binance Spot · ativos monitorados'] }
  }
  const ask = (value: string) => { const trimmed = value.trim(); if (!trimmed) return; setMessages((current) => [...current, { id: `${Date.now()}-u`, role: 'user', text: trimmed }, getReply(trimmed)]); setQuestion('') }
  const shortcuts = [{ label: 'Ler o volume', prompt: 'Quais ativos têm mais volume?' }, { label: 'Checar riscos', prompt: 'Quais riscos o painel ainda não cobre?' }, { label: 'Minha carteira', prompt: 'Como está minha carteira?' }, { label: 'Ir à comunidade', prompt: 'Como funciona a comunidade?' }]
  return <div className="dialog-backdrop" role="presentation" onMouseDown={onClose}><section className="ai-dialog conversational-ai" role="dialog" aria-modal="true" aria-label="CryptoLens AI" onMouseDown={(event) => event.stopPropagation()}><button className="dialog-close" onClick={onClose} aria-label="Fechar assistente">×</button><div className="ai-dialog-heading"><span className="ai-orb">✦</span><div><span>CRYPTOLENS AI · ASSISTENTE DE PESQUISA</span><h2>Dados primeiro. Contexto sempre.</h2></div></div><p className="ai-disclosure">Eu comparo os dados ao vivo disponíveis, explico riscos e sugiro o que pesquisar. Não acesso sua corretora, não executo ordens e não substituo aconselhamento financeiro profissional.</p><div className="chat-log" aria-live="polite">{messages.map((message) => <article className={`chat-message ${message.role}`} key={message.id}><span>{message.role === 'assistant' ? '✦' : 'Você'}</span><div><p>{message.text}</p>{message.sources && <small>Fontes: {message.sources.join(' · ')}</small>}</div></article>)}</div><div className="ai-suggestions">{shortcuts.map((item) => <button key={item.label} onClick={() => { if (item.label === 'Ir à comunidade') { onNavigate('Comunidade'); onClose() } else ask(item.prompt) }}>{item.label}</button>)}</div><form onSubmit={(event) => { event.preventDefault(); ask(question) }}><input autoFocus value={question} onChange={(event) => setQuestion(event.target.value)} aria-label="Pergunta para o CryptoLens AI" placeholder="Ex.: compare BTC e ETH ou explique os riscos de SOL"/><button className="primary-btn" type="submit">Enviar <Icon name="arrow" size={16}/></button></form></section></div>
}

function CommandPalette({ assets, onOpenAsset, onNavigate, onClose }: { assets: MarketAsset[]; onOpenAsset: (asset: MarketAsset) => void; onNavigate: (page: NavItem) => void; onClose: () => void }) {
  const [term, setTerm] = useState('')
  const normalized = term.toLowerCase()
  const pages = navItems.filter((page) => page.toLowerCase().includes(normalized))
  const matches = assets.filter((asset) => `${asset.name} ${asset.symbol}`.toLowerCase().includes(normalized))
  return <div className="dialog-backdrop command-backdrop" role="presentation" onMouseDown={onClose}><section className="command-palette" role="dialog" aria-modal="true" aria-label="Ir para uma área ou ativo" onMouseDown={(event) => event.stopPropagation()}><div className="command-input"><Icon name="search" size={19}/><input autoFocus value={term} onChange={(event) => setTerm(event.target.value)} placeholder="Ir para uma área ou abrir um ativo…"/><kbd>Esc</kbd></div><div className="command-results"><span>ÁREAS</span>{pages.map((page) => <button key={page} onClick={() => { onNavigate(page); onClose() }}><Icon name={page === 'Comunidade' ? 'users' : page === 'Minha Carteira' ? 'wallet' : page === 'Alertas' ? 'bell' : page === 'Análises' ? 'pulse' : page === 'Watchlist' ? 'bookmark' : page === 'Radar' ? 'radar' : page === 'Mercado' ? 'chart' : page === 'Notícias' ? 'news' : 'grid'} size={16}/>{page}<Icon name="chevron" size={15}/></button>)}<span>ATIVOS</span>{matches.map((asset) => <button key={asset.symbol} onClick={() => { onOpenAsset(asset); onClose() }}><AssetMark symbol={asset.symbol} color={asset.color} size="sm"/><b>{asset.name}</b><small>{asset.symbol}/USDT · {formatMoney(asset.price)}</small></button>)}{!pages.length && !matches.length && <p>Nenhum resultado para “{term}”.</p>}</div><footer><span>⌘ / Ctrl + K para abrir</span><span>↵ para selecionar</span></footer></section></div>
}

function OnboardingDialog({ onDone, onNavigate }: { onDone: () => void; onNavigate: (page: NavItem) => void }) {
  const [step, setStep] = useState(0)
  const steps = [{ tag: '1 DE 3 · ORIENTAÇÃO', title: 'Seu painel, sem ruído.', text: 'Use Mercado para olhar os dados públicos, Radar para ordenar a pesquisa e a lupa ou Ctrl + K para chegar rápido a qualquer área.' }, { tag: '2 DE 3 · ORGANIZAÇÃO', title: 'Faça o painel trabalhar para você.', text: 'Salve ativos na Watchlist, crie alertas de preço e registre posições manualmente. Tudo fica neste navegador enquanto não houver login.' }, { tag: '3 DE 3 · CONTEXTO', title: 'Converse antes de concluir.', text: 'O CryptoLens AI explica o que os dados mostram e os limites da leitura. A Comunidade é o espaço para perguntas e fontes — sem promessas de retorno.' }]
  const current = steps[step]
  return <div className="dialog-backdrop onboarding-backdrop" role="presentation"><section className="onboarding-dialog" role="dialog" aria-modal="true" aria-label="Boas-vindas ao CryptoLens"><span className="ai-orb">✦</span><div className="onboarding-progress"><i style={{ width: `${((step + 1) / steps.length) * 100}%` }}/></div><span>{current.tag}</span><h2>{current.title}</h2><p>{current.text}</p><div><button className="soft-btn" onClick={onDone}>Pular introdução</button><button className="primary-btn" onClick={() => { if (step < steps.length - 1) setStep(step + 1); else { onNavigate('Mercado'); onDone() } }}>{step < steps.length - 1 ? 'Continuar' : 'Explorar o mercado'} <Icon name="arrow" size={16}/></button></div></section></div>
}

function AuthenticatedApp({ user, onLogout }: { user: DemoUser; onLogout: () => void }) {
  const [activeNav, setActiveNav] = useState<NavItem>(() => pageFromHash())
  const [assets, setAssets] = useState<MarketAsset[]>(fallbackAssets)
  const [dataState, setDataState] = useState<'loading' | 'live' | 'unavailable' | 'offline'>(() => navigator.onLine ? 'loading' : 'offline')
  const [streamState, setStreamState] = useState<'connecting' | 'live' | 'paused'>('connecting')
  const [watchlist, setWatchlist] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('cryptolens-watchlist') || '["BTC", "ETH"]') } catch { return ['BTC', 'ETH'] }
  })
  const [period, setPeriod] = useState('1D')
  const [btcHistory, setBtcHistory] = useState<number[]>([])
  const [query, setQuery] = useState('')
  const [notice, setNotice] = useState('')
  const [selectedAsset, setSelectedAsset] = useState<MarketAsset | null>(null)
  const [aiOpen, setAiOpen] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [commandOpen, setCommandOpen] = useState(false)
  const [onboardingOpen, setOnboardingOpen] = useState(() => localStorage.getItem('cryptolens-onboarded') !== 'true')
  const [fearGreed, setFearGreed] = useState<{ value: number; label: string } | null>(null)
  const [marketOverview, setMarketOverview] = useState<GlobalMarketMetrics | null>(null)
  const [alerts, setAlerts] = useState<AlertRule[]>(() => {
    try { return JSON.parse(localStorage.getItem('cryptolens-alerts') || '[]') } catch { return [] }
  })
  const [positions, setPositions] = useState<PortfolioPosition[]>(() => {
    try { return JSON.parse(localStorage.getItem('cryptolens-portfolio') || '[]') } catch { return [] }
  })
  const [communityPosts, setCommunityPosts] = useState<CommunityPost[]>(() => {
    try { return JSON.parse(localStorage.getItem('cryptolens-community') || '[]') } catch { return [] }
  })

  useEffect(() => {
    const syncHash = () => setActiveNav(pageFromHash())
    window.addEventListener('hashchange', syncHash)
    return () => window.removeEventListener('hashchange', syncHash)
  }, [])

  useEffect(() => {
    const route = `#/${routeByPage[activeNav]}`
    if (window.location.hash !== route) window.location.hash = route
  }, [activeNav])

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); setCommandOpen(true) }
      if (event.key === 'Escape') { setCommandOpen(false); setAiOpen(false); setSelectedAsset(null); setMobileMenuOpen(false) }
    }
    window.addEventListener('keydown', handleShortcut)
    return () => window.removeEventListener('keydown', handleShortcut)
  }, [])

  const refreshMarket = useCallback(async () => {
    if (!navigator.onLine) { setDataState('offline'); return }
    setDataState('loading')
    const pairs = assetsMeta.map((asset) => `${asset.symbol}USDT`)
    try {
      const response = await fetch(`https://api.binance.com/api/v3/ticker/24hr?symbols=${encodeURIComponent(JSON.stringify(pairs))}`)
      if (!response.ok) throw new Error('Binance indisponível')
      const rows = await response.json() as Array<{ symbol: string; lastPrice: string; priceChangePercent: string; quoteVolume: string }>
      setAssets(assetsMeta.map((asset) => {
        const row = rows.find((item) => item.symbol === `${asset.symbol}USDT`)
        return { ...asset, price: Number(row?.lastPrice || 0), change: Number(row?.priceChangePercent || 0), volume: Number(row?.quoteVolume || 0) }
      }))
      setDataState('live')
    } catch { setDataState(navigator.onLine ? 'unavailable' : 'offline') }
  }, [])

  useEffect(() => {
    void refreshMarket()
    const onOnline = () => { void refreshMarket() }
    const onOffline = () => setDataState('offline')
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    const interval = window.setInterval(() => { if (document.visibilityState === 'visible') void refreshMarket() }, 60_000)
    return () => { window.removeEventListener('online', onOnline); window.removeEventListener('offline', onOffline); window.clearInterval(interval) }
  }, [refreshMarket])

  useEffect(() => {
    let socket: WebSocket | null = null
    let reconnectTimer = 0
    let disposed = false
    const streams = assetsMeta.map((asset) => `${asset.symbol.toLowerCase()}usdt@ticker`).join('/')
    const connect = () => {
      if (disposed || !navigator.onLine || document.visibilityState !== 'visible') { setStreamState('paused'); return }
      setStreamState('connecting')
      socket = new WebSocket(`wss://stream.binance.com:9443/stream?streams=${streams}`)
      socket.onopen = () => setStreamState('live')
      socket.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data) as { data?: { s?: string; c?: string; P?: string; q?: string } }
          const ticker = payload.data
          if (!ticker?.s) return
          setAssets((current) => current.map((asset) => ticker.s === `${asset.symbol}USDT` ? { ...asset, price: Number(ticker.c), change: Number(ticker.P), volume: Number(ticker.q) } : asset))
          setDataState('live')
        } catch { /* aguarda o próximo evento válido */ }
      }
      socket.onclose = () => {
        if (!disposed && navigator.onLine && document.visibilityState === 'visible') {
          setStreamState('connecting')
          reconnectTimer = window.setTimeout(connect, 5000)
        }
      }
      socket.onerror = () => socket?.close()
    }
    const handleVisibility = () => {
      window.clearTimeout(reconnectTimer)
      socket?.close()
      if (document.visibilityState === 'visible') connect()
      else setStreamState('paused')
    }
    connect()
    document.addEventListener('visibilitychange', handleVisibility)
    return () => { disposed = true; window.clearTimeout(reconnectTimer); document.removeEventListener('visibilitychange', handleVisibility); socket?.close() }
  }, [])

  const liveBtcPrice = assets[0]?.price ?? 0
  useEffect(() => {
    if (!btcHistory.length || !liveBtcPrice) return
    setBtcHistory((current) => [...current.slice(0, -1), liveBtcPrice])
  }, [liveBtcPrice, btcHistory.length])

  useEffect(() => {
    let active = true
    const config = periodConfig[period]
    fetch(`https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=${config.interval}&limit=${config.limit}`)
      .then((response) => {
        if (!response.ok) throw new Error('Histórico indisponível')
        return response.json()
      })
      .then((rows: Array<[number, string, string, string, string]>) => {
        if (active) setBtcHistory(rows.map((row) => Number(row[4])).filter(Number.isFinite))
      })
      .catch(() => { if (active) setBtcHistory([]) })
    return () => { active = false }
  }, [period])

  useEffect(() => {
    localStorage.setItem('cryptolens-watchlist', JSON.stringify(watchlist))
  }, [watchlist])

  useEffect(() => {
    localStorage.setItem('cryptolens-alerts', JSON.stringify(alerts))
  }, [alerts])

  useEffect(() => {
    localStorage.setItem('cryptolens-portfolio', JSON.stringify(positions))
  }, [positions])

  useEffect(() => {
    localStorage.setItem('cryptolens-community', JSON.stringify(communityPosts))
  }, [communityPosts])

  useEffect(() => {
    let active = true
    fetch('https://api.alternative.me/fng/?limit=1')
      .then((response) => response.ok ? response.json() : Promise.reject(new Error('Índice indisponível')))
      .then((data: { data?: Array<{ value: string; value_classification: string }> }) => {
        const latest = data.data?.[0]
        if (active && latest) setFearGreed({ value: Number(latest.value), label: latest.value_classification })
      })
      .catch(() => { if (active) setFearGreed(null) })
    return () => { active = false }
  }, [])

  useEffect(() => {
    let active = true
    fetch('https://api.coingecko.com/api/v3/global')
      .then((response) => response.ok ? response.json() : Promise.reject(new Error('Visão global indisponível')))
      .then((payload: { data?: { total_market_cap?: { usd?: number }; total_volume?: { usd?: number }; market_cap_percentage?: { btc?: number }; market_cap_change_percentage_24h_usd?: number } }) => {
        const data = payload.data
        if (active && data?.total_market_cap?.usd && data.total_volume?.usd && data.market_cap_percentage?.btc !== undefined && data.market_cap_change_percentage_24h_usd !== undefined) setMarketOverview({ totalMarketCap: data.total_market_cap.usd, totalVolume: data.total_volume.usd, bitcoinDominance: data.market_cap_percentage.btc, marketCapChange: data.market_cap_change_percentage_24h_usd })
      })
      .catch(() => { if (active) setMarketOverview(null) })
    return () => { active = false }
  }, [])

  const btc = assets[0]
  const matches = useMemo(() => assets.filter((asset) => `${asset.name} ${asset.symbol}`.toLowerCase().includes(query.toLowerCase())), [assets, query])
  const radarItems = useMemo(() => assets.filter((asset) => asset.price > 0).sort((a, b) => b.change - a.change).slice(0, 4).map((asset) => {
    const score = Math.round(Math.max(20, Math.min(95, 50 + asset.change * 8 + Math.log10(Math.max(asset.volume, 1)) * 1.4)))
    const positive = asset.change >= 0
    return {
      ...asset,
      score,
      status: asset.change >= 1 ? 'Tendência positiva' : asset.change <= -1 ? 'Atenção' : 'Acompanhamento',
      tone: asset.change >= 1 ? 'positive' : asset.change <= -1 ? 'attention' : 'watch',
      reason: `Variação de ${asset.change >= 0 ? '+' : ''}${asset.change.toFixed(2)}% e volume de ${formatCompact(asset.volume)} nas últimas 24h.`,
    }
  }), [assets])
  const btcPulse = Math.round(Math.max(0, Math.min(100, 50 + btc.change * 5)))
  const btcDirection = btc.change >= 0 ? 'movimento positivo' : 'pressão vendedora'
  const gaugeAngle = -75 + btcPulse * 1.5

  const toggleWatchlist = (symbol: string) => {
    setWatchlist((current) => current.includes(symbol) ? current.filter((item) => item !== symbol) : [...current, symbol])
    setNotice(watchlist.includes(symbol) ? `${symbol} removido da sua watchlist.` : `${symbol} adicionado à sua watchlist.`)
    window.setTimeout(() => setNotice(''), 2800)
  }

  const showSoon = (label: string) => {
    setNotice(`${label} estará disponível na próxima etapa do painel.`)
    window.setTimeout(() => setNotice(''), 3000)
  }

  const openAsset = (asset: MarketAsset) => setSelectedAsset(asset)
  const addAlert = (rule: Omit<AlertRule, 'id'>) => {
    setAlerts((current) => [...current, { ...rule, id: `${Date.now()}-${rule.symbol}` }])
    setNotice(`Alerta para ${rule.symbol} criado e salvo neste navegador.`)
    window.setTimeout(() => setNotice(''), 2800)
  }
  const addPosition = (position: Omit<PortfolioPosition, 'id'>) => {
    setPositions((current) => [...current, { ...position, id: `${Date.now()}-${position.symbol}`, createdAt: new Date().toISOString() }])
    setNotice(`${position.symbol} adicionado à carteira de acompanhamento.`)
    window.setTimeout(() => setNotice(''), 2800)
  }
  const addCommunityPost = (topic: string, message: string) => {
    setCommunityPosts((current) => [{ id: `${Date.now()}-post`, author: 'Você', topic, message, createdAt: new Date().toISOString(), likes: 0, replies: [] }, ...current])
    setNotice('Publicação criada neste navegador.')
    window.setTimeout(() => setNotice(''), 2800)
  }
  const toggleCommunityLike = (id: string) => setCommunityPosts((current) => current.map((post) => post.id === id ? { ...post, liked: !post.liked, likes: post.likes + (post.liked ? -1 : 1) } : post))
  const addCommunityReply = (id: string, message: string) => {
    setCommunityPosts((current) => current.map((post) => post.id === id ? { ...post, replies: [...post.replies, { id: `${Date.now()}-reply`, author: 'Você', message, createdAt: new Date().toISOString() }] } : post))
  }
  const finishOnboarding = () => { localStorage.setItem('cryptolens-onboarded', 'true'); setOnboardingOpen(false) }

  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><span className="brand-mark"><i/><i/><i/></span><span>Crypto<span>Lens</span></span></div>
      <div className="sidebar-caption">INTELIGÊNCIA DE MERCADO</div>
      <nav className="main-nav" aria-label="Navegação principal">
        {navItems.map((item) => {
          const icons: Record<NavItem, string> = { Dashboard: 'grid', Mercado: 'chart', Radar: 'radar', Notícias: 'news', Comunidade: 'users', Watchlist: 'bookmark', Análises: 'pulse', Alertas: 'bell', 'Minha Carteira': 'wallet' }
          return <button className={activeNav === item ? 'nav-item active' : 'nav-item'} key={item} onClick={() => { setActiveNav(item); window.scrollTo({ top: 0, behavior: 'smooth' }) }}><Icon name={icons[item]}/><span>{item}</span>{item === 'Alertas' && alerts.length > 0 && <em>{alerts.length}</em>}</button>
        })}
      </nav>
      <div className="sidebar-bottom">
        <button className="assistant-launch" onClick={() => setAiOpen(true)}><span className="ai-orb">✦</span><span><b>CryptoLens AI</b><small>Assistente de pesquisa</small></span><Icon name="chevron" size={15}/></button>
        <div className="disclaimer-mini"><span>i</span> Ferramenta informativa.<br/>Não constitui recomendação.</div>
      </div>
    </aside>

    <main className="main-content">
      <header className="topbar">
        <div className="mobile-brand"><span className="brand-mark"><i/><i/><i/></span>Crypto<span>Lens</span></div>
        <div className="breadcrumb"><span>Visão geral</span><b>/</b><strong>{activeNav}</strong></div>
        <div className="top-actions">
          <div className={`market-online ${dataState !== 'live' ? 'muted' : ''}`} aria-live="polite"><i/>{dataState === 'live' ? streamState === 'live' ? 'Preços em tempo real' : 'Mercado online' : dataState === 'loading' ? 'Atualizando mercado' : dataState === 'offline' ? 'Sem conexão' : 'Mercado indisponível'}</div>
          <div className="search-wrap"><Icon name="search" size={17}/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar ativo" aria-label="Buscar ativo"/>{query && <div className="search-results">{matches.length ? matches.map((asset) => <button key={asset.symbol} onClick={() => { setQuery(''); openAsset(asset) }}><AssetMark symbol={asset.symbol} color={asset.color} size="sm"/>{asset.name}<span>{asset.symbol}</span></button>) : <p>Nenhum ativo encontrado</p>}</div>}</div>
          <button className="round-action" aria-label="Configurações" onClick={() => showSoon('Configurações')}><Icon name="settings" size={18}/></button>
          <button className="profile" onClick={onLogout} aria-label={`Sair da conta de ${user.name}`} title="Encerrar sessão"><span>{user.name.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase()}</span><i/></button>
        </div>
      </header>

      {activeNav === 'Dashboard' ? <>
      <WalletOverview assets={assets} onOpenAsset={openAsset}/>
      <section className="hero-section">
        <div className="hero-copy">
          <div className="eyebrow"><span/> SIGNAL-FIRST RESEARCH</div>
          <h2>Sua inteligência pessoal<br/>para o <em>mercado cripto.</em></h2>
          <p>Monitore o mercado, descubra projetos promissores e tome decisões baseadas em dados — sem ruído, sem hype.</p>
          <div className="hero-actions"><button className="primary-btn" onClick={() => setActiveNav('Mercado')}>Explorar mercado <Icon name="arrow" size={17}/></button><button className="quiet-btn" onClick={() => setActiveNav('Radar')}><span className="play-icon">▶</span> Ver oportunidades</button></div>
          <div className="data-source"><span className={dataState === 'live' ? 'live-dot' : 'muted-dot'}/>{dataState === 'live' ? 'Dados de mercado via Binance · Atualizados agora' : dataState === 'loading' ? 'Conectando aos dados de mercado...' : 'Dados de mercado temporariamente indisponíveis'}</div>
        </div>
        <div className="hero-terminal">
          <div className="terminal-glow"/>
          <div className="terminal-topline"><div className="asset-title"><AssetMark symbol="BTC" color="#f7a93b"/><span><b>Bitcoin</b><small>BTC / USDT</small></span></div><div className="terminal-price"><strong>{formatMoney(btc.price)}</strong><span className={btc.change >= 0 ? 'up-text' : 'down-text'}>{btc.change >= 0 ? '+' : ''}{btc.change.toFixed(2)}% <Icon name={btc.change >= 0 ? 'up' : 'down'} size={14}/></span></div></div>
          <div className="terminal-stats"><div><span>24H VOLUME</span><b>{formatCompact(btc.volume)}</b></div><div><span>VARIAÇÃO 24H</span><b className={btc.change >= 0 ? 'up-text' : 'down-text'}>{btc.change >= 0 ? '+' : ''}{btc.change.toFixed(2)}%</b></div><div><span>DIREÇÃO DO DIA</span><b className={btc.change >= 0 ? 'trend' : 'trend down-trend'}><Icon name={btc.change >= 0 ? 'up' : 'down'} size={14}/>{btc.change >= 0 ? 'Positiva' : 'Negativa'}</b></div></div>
          <div className="terminal-chart-head"><div><b>Visão do preço</b><span>Spot · Binance</span></div><div className="periods">{['1H', '4H', '1D', '7D', '30D', '1Y'].map((item) => <button key={item} className={period === item ? 'selected' : ''} onClick={() => setPeriod(item)}>{item}</button>)}</div></div>
          <PriceChart prices={btcHistory} price={btc.price} interval={period}/>
          <div className="terminal-footer"><div><span>FONTE</span><b>Binance Spot</b></div><div><span>SÉRIE</span><b>{periodConfig[period].label}</b></div><div><span>VOLUME 24H</span><b>{formatCompact(btc.volume)}</b></div><button onClick={() => window.open('https://www.binance.com/en/trade/BTC_USDT', '_blank', 'noopener,noreferrer')}>Ver na Binance <Icon name="external" size={14}/></button></div>
        </div>
      </section>

      <section className="market-strip section-block">
        <div className="section-heading inline-heading"><div><div className="eyebrow compact"><span/> PULSO DO MERCADO</div><h2>Resumo em tempo real</h2></div><button className="text-link" onClick={() => setActiveNav('Mercado')}>Ver todos os ativos <Icon name="arrow" size={16}/></button></div>
        <div className="asset-ticker-grid">{assets.map((asset) => <article className="asset-ticker" key={asset.symbol}><div className="ticker-main"><AssetMark symbol={asset.symbol} color={asset.color}/><div><b>{asset.name}</b><span>{asset.symbol}</span></div><button className={watchlist.includes(asset.symbol) ? 'watch-toggle saved' : 'watch-toggle'} onClick={() => toggleWatchlist(asset.symbol)} aria-label={`Adicionar ${asset.name} à watchlist`}><Icon name="bookmark" size={15}/></button></div><div className="ticker-value"><strong>{formatMoney(asset.price)}</strong><span className={asset.change >= 0 ? 'up-text' : 'down-text'}>{asset.change >= 0 ? '+' : ''}{asset.change.toFixed(2)}%</span></div><div className="ticker-bottom"><span>Vol. {formatCompact(asset.volume)}</span><Sparkline positive={asset.change >= 0} small/></div></article>)}</div>
      </section>

      <section className="intelligence-grid section-block">
        <div className="radar-panel panel">
          <div className="section-heading"><div><div className="eyebrow compact"><span/> MOVIMENTOS 24H · BINANCE</div><h2>Crypto Radar</h2><p>Ativos com sinais de preço e volume que justificam pesquisa adicional.</p></div><button className="icon-link" onClick={() => setActiveNav('Radar')}>Abrir Radar <Icon name="arrow" size={16}/></button></div>
          <div className="radar-list">{radarItems.length ? radarItems.map((item, index) => <article className="radar-row" key={item.symbol}><div className="rank">0{index + 1}</div><div className="radar-asset"><AssetMark symbol={item.symbol} color={item.color}/><div><b>{item.name}</b><span>{item.symbol} <i/> {item.change >= 0 ? '+' : ''}{item.change.toFixed(2)}%</span></div></div><div className="radar-reason"><span>POR QUE CHAMOU ATENÇÃO</span><p>{item.reason}</p></div><div className="risk"><span>COBERTURA</span><b>Parcial</b></div><div className="status-col"><span className={`status ${item.tone}`}>{item.status}</span></div><ScoreRing score={item.score}/><button className="row-more" onClick={() => showSoon(`Análise de ${item.name}`)}><Icon name="more" size={18}/></button></article>) : <div className="radar-loading">Aguardando dados de mercado verificáveis…</div>}</div>
          <div className="score-disclaimer"><span className="small-orb">✦</span><p><b>Score parcial</b> usa preço, variação e volume públicos da Binance. Desenvolvimento, notícias e risco aparecem quando fontes verificáveis forem conectadas.</p><button onClick={() => setActiveNav('Análises')}>Metodologia <Icon name="arrow" size={14}/></button></div>
        </div>

        <aside className="insight-column">
          <div className="market-mood panel"><div className="mini-head"><span>PULSO BTC · 24H</span><button onClick={() => setActiveNav('Análises')}><Icon name="more" size={18}/></button></div><div className="mood-content"><div className="gauge"><div className="gauge-arrow" style={{ transform: `rotate(${gaugeAngle}deg)` }}/><div className="gauge-center"><strong>{btc.price ? btcPulse : '—'}</strong><span>VARIAÇÃO</span></div></div><p>O Bitcoin mostra <b className={btc.change >= 0 ? 'up-text' : 'down-text'}>{btcDirection}</b> nas últimas 24h, conforme dados públicos da Binance.</p></div><div className="mood-scale"><span>Pressão</span><span>Equilíbrio</span><span>Impulso</span></div></div>
          <div className="watchlist-panel panel"><div className="mini-head"><div><span>SUA WATCHLIST</span><b>{watchlist.length} ativos</b></div><button className="add-watch" onClick={() => showSoon('Busca para watchlist')}><Icon name="plus" size={16}/> Adicionar</button></div>{watchlist.length ? <div className="watch-assets">{assets.filter((asset) => watchlist.includes(asset.symbol)).slice(0, 3).map((asset) => <div className="watch-asset" key={asset.symbol}><AssetMark symbol={asset.symbol} color={asset.color} size="sm"/><span><b>{asset.symbol}</b><small>{formatMoney(asset.price)}</small></span><Sparkline positive={asset.change >= 0} small/><em className={asset.change >= 0 ? 'up-text' : 'down-text'}>{asset.change >= 0 ? '+' : ''}{asset.change.toFixed(1)}%</em></div>)}</div> : <div className="empty-watch"><Icon name="bookmark" size={22}/><p>Sua watchlist está vazia.</p><button onClick={() => toggleWatchlist('BTC')}>Adicionar Bitcoin</button></div>}<button className="view-watch" onClick={() => setActiveNav('Watchlist')}>Ver watchlist <Icon name="arrow" size={14}/></button></div>
        </aside>
      </section>

      <section className="lower-grid section-block">
        <article className="ai-card"><div className="ai-card-backdrop"/><div className="ai-card-content"><div className="ai-label"><span className="ai-orb">✦</span> CRYPTOLENS AI</div><h2>Entenda o sinal.<br/><em>Não apenas o preço.</em></h2><p>Pergunte sobre movimentos, riscos e projetos — a IA explica com base nos dados e nas fontes disponíveis.</p><div className="ai-prompts"><button onClick={() => setAiOpen(true)}>Por que o volume de SOL aumentou? <Icon name="arrow" size={14}/></button><button onClick={() => setAiOpen(true)}>Quais são os riscos do BTC agora? <Icon name="arrow" size={14}/></button></div></div><button className="ask-ai" onClick={() => setAiOpen(true)}>Abrir assistente <Icon name="arrow" size={16}/></button></article>
        <article className="news-panel panel"><div className="section-heading"><div><div className="eyebrow compact"><span/> CONTEXTO VERIFICADO</div><h2>Crypto News</h2></div><button className="text-link" onClick={() => setActiveNav('Notícias')}>Abrir notícias <Icon name="arrow" size={15}/></button></div><div className="news-empty"><span className="news-empty-icon"><Icon name="news" size={22}/></span><div><b>Feed de notícias aguardando uma fonte conectada</b><p>O CryptoLens só exibirá manchetes quando título, fonte, horário e link original puderem ser verificados. Nenhuma notícia é inventada.</p><button onClick={() => showSoon('Integração de notícias')}>Configurar fonte <Icon name="arrow" size={14}/></button></div></div></article>
      </section>
      </> : <WorkspacePage page={activeNav} assets={assets} watchlist={watchlist} onToggle={toggleWatchlist} onOpenAsset={openAsset} dataState={dataState} onRetryMarket={() => void refreshMarket()} fearGreed={fearGreed} marketOverview={marketOverview} onOpenAI={() => setAiOpen(true)} alerts={alerts} onAddAlert={addAlert} onRemoveAlert={(id) => setAlerts((current) => current.filter((item) => item.id !== id))} positions={positions} onAddPosition={addPosition} onRemovePosition={(id) => setPositions((current) => current.filter((item) => item.id !== id))} communityPosts={communityPosts} onCreatePost={addCommunityPost} onLikePost={toggleCommunityLike} onReplyPost={addCommunityReply}/>}
      <footer><span>© 2026 CryptoLens</span><span>See the market. Understand the signal.</span><span>Dados públicos · Não é aconselhamento financeiro</span></footer>
    </main>
    <nav className="mobile-nav">{navItems.slice(0, 4).map((item) => { const icon: Record<string, string> = { Dashboard: 'grid', Mercado: 'chart', Radar: 'radar', Notícias: 'news', Watchlist: 'bookmark' }; return <button key={item} className={activeNav === item ? 'active' : ''} onClick={() => { setActiveNav(item); window.scrollTo({ top: 0, behavior: 'smooth' }) }}><Icon name={icon[item]}/><span>{item === 'Dashboard' ? 'Início' : item}</span></button> })}<button className={mobileMenuOpen || navItems.slice(4).includes(activeNav) ? 'active' : ''} onClick={() => setMobileMenuOpen(true)}><Icon name="more"/><span>Mais</span></button></nav>
    {mobileMenuOpen && <div className="mobile-menu-backdrop" onMouseDown={() => setMobileMenuOpen(false)}><div className="mobile-menu" onMouseDown={(event) => event.stopPropagation()}><div><span>MAIS ÁREAS</span><button onClick={() => setMobileMenuOpen(false)}>×</button></div>{navItems.slice(4).map((item) => { const icons: Record<NavItem, string> = { Dashboard: 'grid', Mercado: 'chart', Radar: 'radar', Notícias: 'news', Comunidade: 'users', Watchlist: 'bookmark', Análises: 'pulse', Alertas: 'bell', 'Minha Carteira': 'wallet' }; return <button key={item} onClick={() => { setActiveNav(item); setMobileMenuOpen(false); window.scrollTo({ top: 0, behavior: 'smooth' }) }}><Icon name={icons[item]}/><span>{item}</span>{item === 'Alertas' && alerts.length > 0 && <em>{alerts.length}</em>}<Icon name="chevron" size={16}/></button> })}</div></div>}
    {selectedAsset && <AssetDetailDialog asset={assets.find((asset) => asset.symbol === selectedAsset.symbol) ?? selectedAsset} watchlist={watchlist} onClose={() => setSelectedAsset(null)} onToggle={toggleWatchlist}/>}
    {aiOpen && <ConversationalAiDialog assets={assets} alerts={alerts} positions={positions} onClose={() => setAiOpen(false)} onNavigate={setActiveNav}/>}
    {commandOpen && <CommandPalette assets={assets} onOpenAsset={openAsset} onNavigate={setActiveNav} onClose={() => setCommandOpen(false)}/>}
    {onboardingOpen && <OnboardingDialog onDone={finishOnboarding} onNavigate={setActiveNav}/>}
    {notice && <div className="toast"><span>✓</span>{notice}</div>}
    <SupportChat/>
  </div>
}

function App() {
  const readSession = () => {
    try { return JSON.parse(sessionStorage.getItem('cryptolens-session') || localStorage.getItem('cryptolens-session') || 'null') as DemoUser | null } catch { return null }
  }
  const [user, setUser] = useState<DemoUser | null>(readSession)
  const authenticate = (nextUser: DemoUser, persist: boolean) => {
    sessionStorage.removeItem('cryptolens-session')
    localStorage.removeItem('cryptolens-session')
    const storage = persist ? localStorage : sessionStorage
    storage.setItem('cryptolens-session', JSON.stringify(nextUser))
    setUser(nextUser)
  }
  const logout = () => {
    sessionStorage.removeItem('cryptolens-session')
    localStorage.removeItem('cryptolens-session')
    setUser(null)
  }
  return user ? <AuthenticatedApp user={user} onLogout={logout}/> : <AuthScreen onAuthenticated={authenticate}/>
}

export default App
