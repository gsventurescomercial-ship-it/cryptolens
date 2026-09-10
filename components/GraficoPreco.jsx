'use client'

import { useEffect, useRef, useState } from 'react'
import { createChart, CrosshairMode } from 'lightweight-charts'
import { fetchKlines, subscribeTicker } from '../lib/binance'

export default function GraficoPreco({ symbol = 'BTC' }) {
  const hostRef = useRef(null)
  const seriesRef = useRef(null)
  const lastCandleRef = useRef(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!hostRef.current) return
    const host = hostRef.current
    const chart = createChart(host, {
      width: host.clientWidth,
      height: host.clientWidth < 480 ? 280 : 360,
      layout: { background: { color: '#0a1020' }, textColor: '#9aa8bd' },
      grid: { vertLines: { color: '#182235' }, horzLines: { color: '#182235' } },
      crosshair: { mode: CrosshairMode.Normal },
      rightPriceScale: { borderColor: '#27324a' },
      timeScale: { borderColor: '#27324a', timeVisible: true },
    })
    const series = chart.addCandlestickSeries({
      upColor: '#31d0aa',
      downColor: '#ff6b7a',
      borderUpColor: '#31d0aa',
      borderDownColor: '#ff6b7a',
      wickUpColor: '#31d0aa',
      wickDownColor: '#ff6b7a',
    })
    seriesRef.current = series

    const observer = new ResizeObserver(([entry]) => {
      const width = Math.floor(entry.contentRect.width)
      chart.applyOptions({ width, height: width < 480 ? 280 : 360 })
    })
    observer.observe(host)

    return () => {
      observer.disconnect()
      chart.remove()
      seriesRef.current = null
    }
  }, [])

  useEffect(() => {
    let active = true
    const controller = new AbortController()
    setLoading(true)
    setError('')

    fetchKlines(symbol, '1h', 200, controller.signal)
      .then((rows) => {
        if (!active || !seriesRef.current) return
        const candles = rows.map(({ time, open, high, low, close }) => ({ time, open, high, low, close }))
        seriesRef.current.setData(candles)
        lastCandleRef.current = candles.at(-1) || null
        setLoading(false)
      })
      .catch((err) => {
        if (!active || err?.name === 'AbortError') return
        setError(err instanceof Error ? err.message : 'Não foi possível carregar o gráfico.')
        setLoading(false)
      })

    const unsubscribe = subscribeTicker(symbol, {
      onPrice: ({ price }) => {
        if (!seriesRef.current || !lastCandleRef.current || !Number.isFinite(price)) return
        const previous = lastCandleRef.current
        const next = {
          ...previous,
          close: price,
          high: Math.max(previous.high, price),
          low: Math.min(previous.low, price),
        }
        lastCandleRef.current = next
        seriesRef.current.update(next)
      },
      onError: (err) => {
        if (active) setError(err.message)
      },
    })

    return () => {
      active = false
      controller.abort()
      unsubscribe()
    }
  }, [symbol])

  return (
    <div className="chart-shell">
      <div className="chart-head">
        <div><span className="eyebrow">PREÇO EM TEMPO REAL</span><h2>{symbol}/USDT</h2></div>
        <span className="live-pill"><i /> Binance</span>
      </div>
      {loading && <div className="async-state">Carregando histórico da Binance…</div>}
      {error && <div className="async-state error" role="alert">{error}</div>}
      <div ref={hostRef} className="chart-host" aria-label={`Gráfico de preço de ${symbol}`} />
    </div>
  )
}
