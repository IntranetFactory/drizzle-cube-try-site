# Drizzle Cube Try Site

Public demo site for drizzle-cube, deployed to Cloudflare Workers.

## Dual Entry Points

This project has **two separate server configurations** — changes must be made in both:

| File | Used By | Purpose |
|------|---------|---------|
| `app.ts` | Local dev (`wrangler dev`, `npm run dev:worker`) | Hono app for local development |
| `src/worker.ts` | **Cloudflare deployment** (`wrangler deploy`) | Hono app for production Workers |

**These files are independent.** The `tsconfig.worker.json` only compiles files listed in its `include` array — `app.ts` is NOT included. Wrangler bundles from `dist/src/worker.js`, so `app.ts` changes have **zero effect on deployment**.

When adding features (e.g., `mcp: { app: true }`), update BOTH files.

## Build & Deploy

```
npm run dev:worker     # Local dev (uses app.ts via wrangler dev)
npm run deploy         # Production deploy (uses src/worker.ts)
```

## Key Differences Between Entry Points

- `app.ts` — connects to local PostgreSQL, no KV/R2/Hyperdrive bindings
- `src/worker.ts` — uses Cloudflare bindings (KV cache, Hyperdrive, R2 thumbnails), Neon database
