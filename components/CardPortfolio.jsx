export default function CardPortfolio({ holding, market, onRemove, removing }) {
  const price = market?.price || 0
  const currentValue = Number(holding.quantity || 0) * price
  const invested = Number(holding.quantity || 0) * Number(holding.avg_buy_price || 0)
  const pnl = invested > 0 ? ((currentValue - invested) / invested) * 100 : 0

  return (
    <article className="portfolio-card">
      <div className="coin-mark">{holding.symbol.slice(0, 1)}</div>
      <div className="portfolio-main">
        <div className="row-between">
          <div><strong>{holding.symbol}</strong><span>{Number(holding.quantity).toLocaleString('pt-BR')} unidades</span></div>
          <div className="portfolio-value"><strong>US$ {currentValue.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}</strong><span className={pnl >= 0 ? 'positive' : 'negative'}>{pnl >= 0 ? '+' : ''}{pnl.toFixed(2)}%</span></div>
        </div>
        <small>Preço médio: US$ {Number(holding.avg_buy_price || 0).toLocaleString('pt-BR', { maximumFractionDigits: 4 })}</small>
      </div>
      <button className="icon-button danger" onClick={() => onRemove(holding.id)} disabled={removing} aria-label={`Remover ${holding.symbol}`}>×</button>
    </article>
  )
}
