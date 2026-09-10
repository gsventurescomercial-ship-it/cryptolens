import { createClient } from '@supabase/supabase-js'
import webpush from 'web-push'
import { Resend } from 'resend'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function conditionMet(alert, ticker) {
  const target = Number(alert.target_value)
  if (alert.condition_type === 'price_above') return ticker.price >= target
  if (alert.condition_type === 'price_below') return ticker.price <= target
  if (alert.condition_type === 'percent_change_up') return ticker.change24h >= target
  if (alert.condition_type === 'percent_change_down') return ticker.change24h <= target
  return false
}

function notificationMessage(alert, ticker) {
  const target = Number(alert.target_value)
  if (alert.condition_type === 'price_above') return `${alert.symbol} atingiu ou ultrapassou US$ ${target}. Preço atual: US$ ${ticker.price}.`
  if (alert.condition_type === 'price_below') return `${alert.symbol} atingiu ou caiu abaixo de US$ ${target}. Preço atual: US$ ${ticker.price}.`
  if (alert.condition_type === 'percent_change_up') return `${alert.symbol} atingiu variação de 24h acima de ${target}%. Atual: ${ticker.change24h.toFixed(2)}%.`
  return `${alert.symbol} atingiu variação de 24h abaixo de ${target}%. Atual: ${ticker.change24h.toFixed(2)}%.`
}

async function tickerFor(symbol) {
  const response = await fetch(`https://api.binance.com/api/v3/ticker/24hr?symbol=${symbol.toUpperCase()}USDT`, { cache: 'no-store' })
  if (!response.ok) throw new Error(`Binance HTTP ${response.status} para ${symbol}`)
  const data = await response.json()
  return { price: Number(data.lastPrice), change24h: Number(data.priceChangePercent) }
}

async function dispatchPush(subscriptions, message) {
  const publicKey = process.env.WEB_PUSH_PUBLIC_KEY
  const privateKey = process.env.WEB_PUSH_PRIVATE_KEY
  if (!publicKey || !privateKey || !subscriptions.length) return
  webpush.setVapidDetails('mailto:admin@cryptolens.app', publicKey, privateKey)
  await Promise.allSettled(subscriptions.map((subscription) => webpush.sendNotification({
    endpoint: subscription.endpoint,
    keys: { p256dh: subscription.p256dh, auth: subscription.auth },
  }, JSON.stringify({ title: 'CryptoLens', body: message, url: '/alertas' }))))
}

export async function GET(request) {
  try {
    const cronSecret = process.env.CRON_SECRET
    if (!cronSecret) return Response.json({ error: 'CRON_SECRET não configurado.' }, { status: 503 })
    if (request.headers.get('authorization') !== `Bearer ${cronSecret}`) return Response.json({ error: 'Não autorizado.' }, { status: 401 })

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !serviceKey) return Response.json({ error: 'Credenciais server-side do Supabase não configuradas.' }, { status: 503 })
    const supabase = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } })

    const { data: alerts, error: alertsError } = await supabase
      .from('alerts')
      .select('id,user_id,symbol,condition_type,target_value,status')
      .eq('status', 'active')
    if (alertsError) throw alertsError
    if (!alerts?.length) return Response.json({ checked: 0, triggered: 0 })

    const symbols = [...new Set(alerts.map((alert) => alert.symbol.toUpperCase()))]
    const tickerPairs = await Promise.all(symbols.map(async (symbol) => [symbol, await tickerFor(symbol)]))
    const tickers = Object.fromEntries(tickerPairs)
    const userIds = [...new Set(alerts.map((alert) => alert.user_id))]

    const [{ data: profiles }, { data: subscriptions }] = await Promise.all([
      supabase.from('users').select('id,email').in('id', userIds),
      supabase.from('push_subscriptions').select('user_id,endpoint,p256dh,auth').in('user_id', userIds),
    ])
    const emailByUser = Object.fromEntries((profiles || []).map((profile) => [profile.id, profile.email]))
    const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null
    let triggered = 0

    for (const alert of alerts) {
      const ticker = tickers[alert.symbol.toUpperCase()]
      if (!ticker || !conditionMet(alert, ticker)) continue

      const { data: updated, error: updateError } = await supabase
        .from('alerts')
        .update({ status: 'triggered', triggered_at: new Date().toISOString() })
        .eq('id', alert.id)
        .eq('status', 'active')
        .select('id')
      if (updateError) throw updateError
      if (!updated?.length) continue

      triggered += 1
      const message = notificationMessage(alert, ticker)
      await supabase.from('notifications').insert({
        user_id: alert.user_id,
        alert_id: alert.id,
        channel: 'in_app',
        message,
        sent_at: new Date().toISOString(),
      })

      const userSubscriptions = (subscriptions || []).filter((item) => item.user_id === alert.user_id)
      await dispatchPush(userSubscriptions, message)

      const email = emailByUser[alert.user_id]
      if (resend && email && process.env.RESEND_FROM_EMAIL) {
        await resend.emails.send({
          from: process.env.RESEND_FROM_EMAIL,
          to: email,
          subject: `Alerta CryptoLens: ${alert.symbol}`,
          text: `${message}\n\nEste alerta é informativo e não representa recomendação de investimento.`,
        })
      }
    }

    return Response.json({ checked: alerts.length, triggered })
  } catch (error) {
    console.error('alertas-cron:', error)
    return Response.json({ error: error instanceof Error ? error.message : 'Falha no processamento de alertas.' }, { status: 500 })
  }
}
