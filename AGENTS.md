# CryptoLens project guidance

- GitHub repository `gsventurescomercial-ship-it/cryptolens` is the source of truth.
- Make changes on a branch and keep `main` deployable.
- Fixed runtime stack: JavaScript, Next.js 14 App Router, Vercel, Supabase, lightweight-charts, Binance REST/WebSocket, Anthropic server routes, web-push and Resend.
- Run `npm install` and `npm run build` before proposing or merging changes.
- Never commit `node_modules`, `.next`, local caches, `.env` files, API keys, service-role keys or other secrets.
- AI provider calls must run only in `app/api/` server routes; never expose Anthropic credentials to the browser.
- CryptoLens is view-only: it does not custody funds, store wallet private keys or execute trades.
- Vercel publishes production automatically after validated updates reach `main`.
