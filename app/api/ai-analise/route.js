import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function systemPrompt(portfolio, marketContext, riskProfile, question) {
  return `Você é o assistente de análise de portfólio do CryptoLens, um app brasileiro de acompanhamento de criptoativos.

REGRAS OBRIGATÓRIAS:
- Você nunca executa operações. Você apenas analisa e sugere — quem decide e executa é sempre o usuário, em uma exchange própria dele.
- Toda resposta que mencionar uma possível operação (comprar, vender, rebalancear) deve deixar claro que é uma sugestão educativa, não uma recomendação formal de investimento, e que o usuário deve validar por conta própria ou com um profissional habilitado.
- Não invente preços, dados ou notícias. Use apenas os dados fornecidos abaixo em CONTEXTO DE MERCADO ATUAL.
- Considere sempre a diversificação e o perfil de risco informado pelo usuário antes de sugerir qualquer mudança.
- Seja direto e didático. Evite jargão sem explicar.

DADOS DO PORTFÓLIO DO USUÁRIO:
${JSON.stringify(portfolio)}

CONTEXTO DE MERCADO ATUAL (preços, variação 24h, volume):
${JSON.stringify(marketContext)}

PERFIL DE RISCO DECLARADO PELO USUÁRIO:
${riskProfile || 'não informado'}

PERGUNTA DO USUÁRIO:
${question}

Responda em português, de forma estruturada:
1. Resumo rápido da situação atual do portfólio (1-2 frases)
2. Pontos de atenção (concentração excessiva, exposição a um único ativo, etc.)
3. Sugestões possíveis, cada uma com o raciocínio por trás
4. Lembrete de que a decisão final e a execução são do usuário.`
}

export async function POST(request) {
  try {
    const anthropicKey = process.env.ANTHROPIC_API_KEY
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!anthropicKey) return Response.json({ error: 'ANTHROPIC_API_KEY não configurada no servidor.' }, { status: 503 })
    if (!supabaseUrl || !supabaseAnonKey) return Response.json({ error: 'Supabase não configurado no servidor.' }, { status: 503 })

    const authorization = request.headers.get('authorization') || ''
    const token = authorization.startsWith('Bearer ') ? authorization.slice(7) : ''
    if (!token) return Response.json({ error: 'Autenticação obrigatória.' }, { status: 401 })

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    })
    const { data: { user }, error: userError } = await supabase.auth.getUser(token)
    if (userError || !user) return Response.json({ error: 'Sessão inválida ou expirada.' }, { status: 401 })

    const body = await request.json()
    const portfolio = Array.isArray(body.portfolio) ? body.portfolio : []
    const marketContext = Array.isArray(body.marketContext) ? body.marketContext : []
    const riskProfile = String(body.riskProfile || 'não informado')
    const question = String(body.question || '').trim()
    if (!question) return Response.json({ error: 'Pergunta obrigatória.' }, { status: 400 })
    if (!marketContext.length) return Response.json({ error: 'Contexto de mercado indisponível. Aguarde a Binance carregar e tente novamente.' }, { status: 400 })

    const anthropic = new Anthropic({ apiKey: anthropicKey })
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1000,
      system: systemPrompt(portfolio, marketContext, riskProfile, question),
      messages: [{ role: 'user', content: question }],
    })

    const resposta = message.content
      .filter((block) => block.type === 'text')
      .map((block) => block.text)
      .join('\n')
      .trim()

    if (!resposta) return Response.json({ error: 'A IA não retornou uma resposta utilizável.' }, { status: 502 })

    const { error: saveError } = await supabase.from('ai_suggestions').insert({
      user_id: user.id,
      portfolio_snapshot: portfolio,
      market_context: marketContext,
      suggestion_text: resposta,
    })
    if (saveError) console.error('Falha ao salvar ai_suggestions:', saveError.message)

    return Response.json({ resposta })
  } catch (error) {
    console.error('ai-analise:', error)
    return Response.json({ error: error instanceof Error ? error.message : 'Erro inesperado na análise.' }, { status: 500 })
  }
}
