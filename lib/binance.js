const REST_BASE = 'https://api.binance.com/api/v3'
const WS_BASE = 'wss://stream.binance.com:9443/ws'

async function parseJson(response) {
  const body = await response.json().catch(() => null)
  if (!response.ok) {
    throw new Error(body?.msg || `Binance respondeu com HTTP ${response.status}`)
  }
  return body
}

export async function fetchTicker24h(symbol, signal) {
  const pair = `${String(symbol).toUpperCase()}USDT`
  const response = await fetch(`${REST_BASE}/ticker/24hr?symbol=${pair}`, { signal, cache: 'no-store' })
  const data = await parseJson(response)
  return {
    symbol: String(symbol).toUpperCase(),
    price: Number(data.lastPrice),
    change24h: Number(data.priceChangePercent),
    volume24h: Number(data.quoteVolume),
  }
}

export async function fetchKlines(symbol, interval = '1h', limit = 200, signal) {
  const pair = `${String(symbol).toUpperCase()}USDT`
  const params = new URLSearchParams({ symbol: pair, interval, limit: String(limit) })
  const response = await fetch(`${REST_BASE}/klines?${params.toString()}`, { signal, cache: 'no-store' })
  const rows = await parseJson(response)
  return rows.map((row) => ({
    time: Math.floor(Number(row[0]) / 1000),
    open: Number(row[1]),
    high: Number(row[2]),
    low: Number(row[3]),
    close: Number(row[4]),
    volume: Number(row[5]),
  }))
}

export function subscribeTicker(symbol, { onPrice, onError } = {}) {
  if (typeof window === 'undefined') return () => {}
  const pair = `${String(symbol).toLowerCase()}usdt@ticker`
  const socket = new WebSocket(`${WS_BASE}/${pair}`)

  socket.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data)
      onPrice?.({
        symbol: String(symbol).toUpperCase(),
        price: Number(data.c),
        change24h: Number(data.P),
        volume24h: Number(data.q),
      })
    } catch (error) {
      onError?.(error)
    }
  }

  socket.onerror = () => onError?.(new Error('Falha na conexão em tempo real com a Binance.'))

  return () => {
    if (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING) socket.close()
  }
}
