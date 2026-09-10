# CryptoLens

Painel de inteligência e acompanhamento de criptomoedas.

## Desenvolvimento

```bash
pnpm install
pnpm dev
```

## Verificação

```bash
pnpm build
```

## Arquitetura

O GitHub é a fonte de verdade do código. O frontend permanece uma aplicação Vite/React e o backend usa Supabase para autenticação, banco PostgreSQL, RLS, análise por IA e processamento de alertas.

### Banco de dados

A migration em `supabase/migrations/20260910020000_cryptolens_backend.sql` cria e protege:

- `users`, vinculada a `auth.users`;
- `portfolio_holdings` para posições informadas manualmente;
- `alerts` para condições de preço e variação;
- `notifications` para notificações de alerta e do app;
- `ai_suggestions` para armazenar o contexto e a resposta das análises.

Todas as tabelas usam Row Level Security. Cada usuário acessa apenas os próprios registros. O CryptoLens não é uma wallet custodial e não armazena chaves privadas nem fundos.

### Alertas em segundo plano

A migration instala um job `pg_cron` que executa `public.process_active_price_alerts()` a cada 5 minutos. O job consulta o ticker público da Binance no backend, marca alertas atingidos como `triggered` e cria uma notificação `in_app`. Assim, a verificação não depende da aba do navegador estar aberta.

### Análise com IA

A Edge Function `supabase/functions/analyze-portfolio/index.ts`:

- exige um JWT válido do Supabase;
- recebe `portfolio_json`, `market_context`, `risk_profile` e `user_question`;
- monta o prompt exclusivamente no backend;
- usa apenas o contexto de mercado recebido e não inventa preço ou notícia;
- nunca executa ordens, compras ou vendas;
- salva a análise em `ai_suggestions` respeitando RLS.

Configure `OPENAI_API_KEY` como secret da Edge Function. Opcionalmente use `OPENAI_MODEL`; sem ele, a função usa `gpt-5-mini`.

## Dados e privacidade

- Preços, volume e histórico do painel usam endpoints públicos da Binance Spot.
- Indicadores globais usam CoinGecko e Alternative.me.
- A carteira é de acompanhamento: posições são lançadas manualmente pelo usuário.
- Nenhuma integração com corretora executa operações.
- Sugestões da IA são educativas e não substituem aconselhamento financeiro profissional.

## Publicação

Atualizações enviadas para a branch `main` continuam sendo compiladas e publicadas pelo fluxo existente do projeto.
