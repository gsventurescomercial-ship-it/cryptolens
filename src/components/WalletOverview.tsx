import { useEffect, useMemo, useState } from 'react'
import type { MarketAsset, TransactionKind } from '../types'
import TransactionModal from './TransactionModal'

const balances = [
  { symbol: 'BTC', quantity: 0.0824 },
  { symbol: 'ETH', quantity: 1.47 },
  { symbol: 'SOL', quantity: 18.2 },
]

function money(value: number) {
  if (!value) return '—'
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(value)
}

function WalletChart({ values }: { values: number[] }) {
  if (values.length < 2) return <div className="wallet-chart-empty">Carregando desempenho público…</div>
  const min = Math.min(...values)
  const max = Math.max(...values)
  const spread = max - min || 1
  const points = values.map((value, index) => `${(index / (values.length - 1)) * 720},${170 - ((value - min) / spread) * 130}`).join(' ')
  return <div className="wallet-chart" aria-label="Desempenho estimado da carteira demo nas últimas 24 horas"><svg viewBox="0 0 720 185" preserveAspectRatio="none"><defs><linearGradient id="walletArea" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#f0b90b" stopOpacity=".28"/><stop offset="100%" stopColor="#f0b90b" stopOpacity="0"/></linearGradient></defs><polyline points={`${points} 720,185 0,185`} fill="url(#walletArea)" stroke="none"/><polyline points={points} fill="none" stroke="#fcd535" strokeWidth="3" vectorEffect="non-scaling-stroke"/></svg><div><span>24h atrás</span><span>Agora</span></div></div>
}

export default function WalletOverview({ assets, onOpenAsset }: { assets: MarketAsset[]; onOpenAsset: (asset: MarketAsset) => void }) {
  const [hidden, setHidden] = useState(() => localStorage.getItem('cryptolens-hide-balance') === 'true')
  const [transaction, setTransaction] = useState<TransactionKind | null>(null)
  const [history, setHistory] = useState<number[]>([])
  const walletAssets = balances.map((balance) => ({ ...balance, asset: assets.find((asset) => asset.symbol === balance.symbol) })).filter((item): item is typeof item & { asset: MarketAsset } => Boolean(item.asset))
  const total = walletAssets.reduce((sum, item) => sum + item.quantity * item.asset.price, 0)
  const weightedChange = total ? walletAssets.reduce((sum, item) => sum + item.quantity * item.asset.price * item.asset.change, 0) / total : 0

  useEffect(() => {
    localStorage.setItem('cryptolens-hide-balance', String(hidden))
  }, [hidden])

  useEffect(() => {
    let active = true
    Promise.all(balances.map(async (balance) => {
      const response = await fetch(`https://api.binance.com/api/v3/klines?symbol=${balance.symbol}USDT&interval=1h&limit=24`)
      if (!response.ok) throw new Error('Histórico indisponível')
      const rows = await response.json() as Array<[number, string, string, string, string]>
      return rows.map((row) => Number(row[4]) * balance.quantity)
    })).then((series) => {
      if (!active) return
      setHistory(series[0].map((_, index) => series.reduce((sum, assetSeries) => sum + (assetSeries[index] ?? 0), 0)))
    }).catch(() => { if (active) setHistory([]) })
    return () => { active = false }
  }, [])

  const allocation = useMemo(() => walletAssets.map((item) => ({ symbol: item.symbol, share: total ? item.quantity * item.asset.price / total * 100 : 0 })), [total, walletAssets])

  return <section className="wallet-overview" aria-labelledby="wallet-title">
    <div className="wallet-title-row"><div><span>CARTEIRA DEMONSTRATIVA</span><h1 id="wallet-title">Visão geral da Wallet</h1><p>Saldos simulados com cotações públicas em tempo real. Nenhum fundo está conectado.</p></div><div className="wallet-status"><i/> Dados locais e privados</div></div>
    <div className="wallet-grid">
      <article className="balance-card"><header><span>SALDO TOTAL ESTIMADO</span><button onClick={() => setHidden((current) => !current)} aria-label={hidden ? 'Mostrar saldo' : 'Ocultar saldo'}>{hidden ? '◉' : '◌'} <small>{hidden ? 'Mostrar' : 'Ocultar'}</small></button></header><strong>{hidden ? '••••••••' : money(total)}</strong><div className={weightedChange >= 0 ? 'wallet-change positive' : 'wallet-change negative'}>{hidden ? '••••' : `${weightedChange >= 0 ? '+' : ''}${weightedChange.toFixed(2)}%`} <span>nas últimas 24h</span></div><div className="wallet-actions"><button onClick={() => setTransaction('send')}><i>↗</i><span>Enviar</span></button><button onClick={() => setTransaction('receive')}><i>↙</i><span>Receber</span></button><button onClick={() => setTransaction('swap')}><i>⇄</i><span>Trocar</span></button></div></article>
      <article className="portfolio-chart-card"><header><div><span>DESEMPENHO DA CARTEIRA</span><b>Últimas 24 horas</b></div><small>Binance Spot · 1h</small></header><WalletChart values={history}/><div className="allocation-strip">{allocation.map((item) => <span key={item.symbol}><i style={{ width: `${item.share}%` }}/><b>{item.symbol}</b><small>{item.share.toFixed(1)}%</small></span>)}</div></article>
    </div>
    <div className="wallet-assets"><header><div><span>MEUS ATIVOS</span><h2>Portfólio demonstrativo</h2></div><small>Atualização ao vivo</small></header><div className="wallet-assets-head"><span>Ativo</span><span>Saldo</span><span>Preço</span><span>Valor</span><span>24h</span><span/></div>{walletAssets.map((item) => <article key={item.symbol}><button className="wallet-asset-main" onClick={() => onOpenAsset(item.asset)}><span className="wallet-coin" style={{ '--wallet-coin': item.asset.color } as React.CSSProperties}>{item.symbol.slice(0, 1)}</span><span><b>{item.asset.name}</b><small>{item.symbol}</small></span></button><span>{hidden ? '••••' : `${item.quantity} ${item.symbol}`}</span><span>{money(item.asset.price)}</span><strong>{hidden ? '••••••' : money(item.quantity * item.asset.price)}</strong><em className={item.asset.change >= 0 ? 'positive' : 'negative'}>{item.asset.change >= 0 ? '+' : ''}{item.asset.change.toFixed(2)}%</em><button className="asset-open" onClick={() => onOpenAsset(item.asset)} aria-label={`Abrir gráfico de ${item.asset.name}`}>›</button></article>)}</div>
    {transaction && <TransactionModal kind={transaction} assets={assets} onClose={() => setTransaction(null)}/>}
  </section>
}
