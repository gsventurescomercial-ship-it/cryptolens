import { createClient, type User } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://jikfvhzdzcowgngvivqh.supabase.co'
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_Bc_mos0ti4HWzEfKi0n6eA_PhzHhcDS'

export const supabase = createClient(supabaseUrl, supabasePublishableKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})

export type RemoteAlert = {
  id: string
  symbol: string
  metric: 'price' | 'change'
  direction: 'above' | 'below'
  target: number
  status: 'active' | 'triggered' | 'disabled'
  triggeredAt?: string
}

export type RemotePosition = {
  id: string
  symbol: string
  quantity: number
  averagePrice: number
  createdAt?: string
}

type AlertRow = {
  id: string
  symbol: string
  condition_type: 'price_above' | 'price_below' | 'percent_change_up' | 'percent_change_down'
  target_value: number | string
  status: 'active' | 'triggered' | 'disabled'
  triggered_at: string | null
}

type HoldingRow = {
  id: string
  symbol: string
  quantity: number | string
  avg_buy_price: number | string | null
  created_at: string
}

function alertFromRow(row: AlertRow): RemoteAlert {
  const isChange = row.condition_type.startsWith('percent_change_')
  const direction = row.condition_type.endsWith('_above') || row.condition_type.endsWith('_up') ? 'above' : 'below'
  return {
    id: row.id,
    symbol: row.symbol,
    metric: isChange ? 'change' : 'price',
    direction,
    target: Number(row.target_value),
    status: row.status,
    triggeredAt: row.triggered_at ?? undefined,
  }
}

function positionFromRow(row: HoldingRow): RemotePosition {
  return {
    id: row.id,
    symbol: row.symbol,
    quantity: Number(row.quantity),
    averagePrice: Number(row.avg_buy_price ?? 0),
    createdAt: row.created_at,
  }
}

async function requireUser(): Promise<User> {
  const { data, error } = await supabase.auth.getUser()
  if (error || !data.user) throw new Error('Entre na sua conta para usar carteira, alertas e análises pessoais.')
  return data.user
}

export async function loadPrivateData() {
  const user = await requireUser()
  const [holdingsResult, alertsResult] = await Promise.all([
    supabase
      .from('portfolio_holdings')
      .select('id,symbol,quantity,avg_buy_price,created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true }),
    supabase
      .from('alerts')
      .select('id,symbol,condition_type,target_value,status,triggered_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true }),
  ])

  if (holdingsResult.error) throw holdingsResult.error
  if (alertsResult.error) throw alertsResult.error

  return {
    positions: ((holdingsResult.data ?? []) as HoldingRow[]).map(positionFromRow),
    alerts: ((alertsResult.data ?? []) as AlertRow[]).map(alertFromRow),
  }
}

export async function createRemoteAlert(rule: Omit<RemoteAlert, 'id' | 'status' | 'triggeredAt'>) {
  const user = await requireUser()
  const conditionType = rule.metric === 'change'
    ? rule.direction === 'above' ? 'percent_change_up' : 'percent_change_down'
    : rule.direction === 'above' ? 'price_above' : 'price_below'

  const { data, error } = await supabase
    .from('alerts')
    .insert({
      user_id: user.id,
      symbol: rule.symbol.toUpperCase(),
      condition_type: conditionType,
      target_value: rule.target,
      status: 'active',
    })
    .select('id,symbol,condition_type,target_value,status,triggered_at')
    .single()

  if (error) throw error
  return alertFromRow(data as AlertRow)
}

export async function deleteRemoteAlert(id: string) {
  await requireUser()
  const { error } = await supabase.from('alerts').delete().eq('id', id)
  if (error) throw error
}

export async function createRemotePosition(position: Omit<RemotePosition, 'id' | 'createdAt'>) {
  const user = await requireUser()
  const { data, error } = await supabase
    .from('portfolio_holdings')
    .insert({
      user_id: user.id,
      symbol: position.symbol.toUpperCase(),
      quantity: position.quantity,
      avg_buy_price: position.averagePrice,
    })
    .select('id,symbol,quantity,avg_buy_price,created_at')
    .single()

  if (error) throw error
  return positionFromRow(data as HoldingRow)
}

export async function deleteRemotePosition(id: string) {
  await requireUser()
  const { error } = await supabase.from('portfolio_holdings').delete().eq('id', id)
  if (error) throw error
}

export async function analyzePortfolioWithAI(input: {
  userQuestion: string
  portfolio: Array<{ symbol: string; quantity: number; avg_buy_price: number }>
  marketContext: Array<{ symbol: string; name: string; price_usd: number; change_24h_percent: number; volume_24h_usd: number; source: string }>
  riskProfile?: string
}) {
  await requireUser()
  const { data, error } = await supabase.functions.invoke('analyze-portfolio', {
    body: {
      portfolio_json: input.portfolio,
      market_context: input.marketContext,
      risk_profile: input.riskProfile || 'não informado',
      user_question: input.userQuestion,
    },
  })

  if (error) throw error
  if (!data?.answer) throw new Error(data?.error || 'A IA não retornou uma resposta utilizável.')
  return String(data.answer)
}
