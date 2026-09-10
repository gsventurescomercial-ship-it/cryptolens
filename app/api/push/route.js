import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function serverSupabase(token) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) throw new Error('Supabase não configurado no servidor.')
  return createClient(url, key, {
    global: { headers: token ? { Authorization: `Bearer ${token}` } : {} },
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

export async function GET() {
  const publicKey = process.env.WEB_PUSH_PUBLIC_KEY
  if (!publicKey) return Response.json({ error: 'WEB_PUSH_PUBLIC_KEY não configurada.' }, { status: 503 })
  return Response.json({ publicKey })
}

export async function POST(request) {
  try {
    const authorization = request.headers.get('authorization') || ''
    const token = authorization.startsWith('Bearer ') ? authorization.slice(7) : ''
    if (!token) return Response.json({ error: 'Autenticação obrigatória.' }, { status: 401 })

    const supabase = serverSupabase(token)
    const { data: { user }, error: userError } = await supabase.auth.getUser(token)
    if (userError || !user) return Response.json({ error: 'Sessão inválida.' }, { status: 401 })

    const subscription = await request.json()
    const endpoint = subscription?.endpoint
    const p256dh = subscription?.keys?.p256dh
    const auth = subscription?.keys?.auth
    if (!endpoint || !p256dh || !auth) return Response.json({ error: 'Assinatura push inválida.' }, { status: 400 })

    const { error } = await supabase.from('push_subscriptions').upsert({
      user_id: user.id,
      endpoint,
      p256dh,
      auth,
    }, { onConflict: 'user_id,endpoint' })
    if (error) throw error

    return Response.json({ ok: true })
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : 'Falha ao salvar assinatura push.' }, { status: 500 })
  }
}
