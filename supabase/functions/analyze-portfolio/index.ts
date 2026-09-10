import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function systemPrompt(portfolio: unknown, marketContext: unknown, riskProfile: string, userQuestion: string) {
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
${riskProfile || "não informado"}

PERGUNTA DO USUÁRIO:
${userQuestion}

Responda em português, de forma estruturada:
1. Resumo rápido da situação atual do portfólio (1-2 frases)
2. Pontos de atenção (concentração excessiva, exposição a um único ativo, etc.)
3. Sugestões possíveis, cada uma com o raciocínio por trás
4. Lembrete de que a decisão final e a execução são do usuário`;
}

function getPublicApiKey() {
  try {
    const keys = JSON.parse(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS") || "{}");
    if (keys.default) return String(keys.default);
  } catch {
    // fallback para projetos que ainda usam as chaves legadas
  }
  return Deno.env.get("SUPABASE_ANON_KEY") || "";
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const authorization = req.headers.get("Authorization");
    if (!authorization) throw new Error("Usuário não autenticado.");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const publicApiKey = getPublicApiKey();
    if (!publicApiKey) throw new Error("Configuração pública do Supabase indisponível.");

    const supabase = createClient(supabaseUrl, publicApiKey, {
      global: { headers: { Authorization: authorization } },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) throw new Error("Sessão inválida.");

    const body = await req.json();
    const portfolio = body.portfolio_json ?? body.portfolio ?? [];
    const marketContext = body.market_context ?? [];
    const riskProfile = String(body.risk_profile ?? "não informado");
    const userQuestion = String(body.user_question ?? "Analise meu portfólio.").trim();
    if (!userQuestion) throw new Error("Pergunta obrigatória.");

    const apiKey = Deno.env.get("OPENAI_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "OPENAI_API_KEY não configurada no backend." }), {
        status: 503,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const model = Deno.env.get("OPENAI_MODEL") || "gpt-5.6-terra";
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        input: [
          {
            role: "system",
            content: [{ type: "input_text", text: systemPrompt(portfolio, marketContext, riskProfile, userQuestion) }],
          },
          {
            role: "user",
            content: [{ type: "input_text", text: userQuestion }],
          },
        ],
      }),
    });

    const payload = await response.json();
    if (!response.ok) throw new Error(payload?.error?.message || "Falha ao consultar a IA.");

    const answer = payload.output_text || payload.output
      ?.flatMap((item: any) => item.content || [])
      .find((item: any) => item.type === "output_text")?.text;

    if (!answer) throw new Error("A IA não retornou uma resposta utilizável.");

    const { error: insertError } = await supabase.from("ai_suggestions").insert({
      user_id: user.id,
      portfolio_snapshot: portfolio,
      market_context: marketContext,
      suggestion_text: answer,
    });
    if (insertError) console.error("Falha ao salvar sugestão:", insertError.message);

    return new Response(JSON.stringify({ answer }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Erro inesperado." }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
