# CryptoLens

Painel de acompanhamento de portfólio cripto VIEW-ONLY com dados da Binance, Supabase e IA educativa.

## Stack fixa

- JavaScript
- Next.js 14 com App Router
- Vercel
- Supabase Auth + Postgres + RLS
- lightweight-charts
- Binance REST + WebSocket
- Anthropic SDK somente no backend (`app/api`)
- web-push
- Resend

## Desenvolvimento

```bash
npm install
cp .env.example .env.local
npm run dev
```

Para validar produção:

```bash
npm run build
```

## Estrutura principal

```text
app/
  dashboard/page.js
  alertas/page.js
  login/page.js
  api/ai-analise/route.js
  api/alertas-cron/route.js
  api/push/route.js
components/
  GraficoPreco.jsx
  CardPortfolio.jsx
  ChatIA.jsx
lib/
  supabaseClient.js
  binance.js
```

## Segurança e privacidade

O CryptoLens não é uma wallet custodial. Nenhuma chave privada ou fundo é armazenado, e posições são informadas manualmente pelo usuário. O frontend usa somente as credenciais públicas do Supabase, enquanto as chaves da Anthropic, Resend, web-push e operações administrativas permanecem exclusivamente no servidor.

A rota `app/api/ai-analise/route.js` exige sessão Supabase válida, monta o prompt no backend, chama a Anthropic e salva a análise em `ai_suggestions`. Qualquer sugestão de compra, venda ou rebalanceamento é educativa e não representa recomendação formal de investimento.

## Banco e alertas

As tabelas de portfólio e alertas usam RLS para limitar cada usuário aos próprios dados. O job Supabase `cryptolens-price-alerts` continua ativo no banco para processar alertas mesmo com o app fechado. A rota Next.js `app/api/alertas-cron/route.js` também está preparada para processamento server-side e envio por Resend/web-push quando as credenciais operacionais forem configuradas.

## Variáveis de ambiente

Use `.env.example` como referência e nunca faça commit de valores reais. Para o frontend funcionar em produção, configure `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` na Vercel. Para IA, configure `ANTHROPIC_API_KEY`. Push/e-mail e a rota administrativa de cron exigem as demais variáveis server-only listadas no arquivo.

## Auth

E-mail/senha está implementado com Supabase Auth. Login Google usa `signInWithOAuth({ provider: 'google' })`; o provider Google também precisa estar habilitado no painel do Supabase com Client ID/Secret e a URL de callback autorizada.

## Deploy

A branch `main` é a fonte de verdade. O projeto Vercel conectado ao GitHub faz deploy automático após merge/push na `main`.
