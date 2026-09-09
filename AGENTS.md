# CryptoLens project guidance

- GitHub repository `gsventurescomercial-ship-it/cryptolens` is the source of truth.
- Make changes on a branch and keep `main` deployable.
- Run `pnpm install` and `pnpm build` before proposing or merging changes.
- Never commit `node_modules`, `dist`, local caches, or TypeScript build artifacts.
- GitHub Pages publishes the production build after updates reach `main`.
