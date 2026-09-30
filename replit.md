# Dorévielle Storefront

An editorial storefront for Dorévielle, a women-in-tech lifestyle brand selling physical and digital products through Shopify-hosted checkout.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/dorevielle-storefront/src/pages/home.tsx` — storefront UI, product filtering, loading screen, cart drawer, and public chat surface.
- `artifacts/dorevielle-storefront/src/index.css` — Dorévielle typography, blush/ink/cream visual system, motion, and responsive styling.
- `artifacts/api-server/src/lib/shopifyStorefrontClient.ts` — server-only Shopify Storefront API connection and token refresh boundary.
- `artifacts/api-server/src/routes/shopify.ts` — product, cart, and Shopify checkout API routes.
- `lib/api-spec/openapi.yaml` — source of truth for generated Shopify API hooks and schemas.

## Architecture decisions

- Shopify is the system of record for products, inventory, carts, orders, and checkout; the app keeps no duplicate commerce catalog.
- Buyer-facing Shopify calls stay behind the API server so connector settings never enter browser code.
- Checkout redirects to Shopify-hosted checkout so Shopify Payments handles payment collection and sensitive checkout data.
- The storefront keeps a local cart ID for continuity while Shopify owns cart contents and pricing.

## Product

- Editorial Dorévielle storefront with live Shopify product listing and search/filter controls.
- Shopify cart creation, line updates, removal, subtotal, and hosted checkout handoff.
- First-visit or one-hour loading curtain, newsletter capture UI, and public chat entry point.

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- Shopify products must be active and published to a storefront-visible publication before they appear in the app.
- Do not add product, inventory, or publication IDs by hand; resolve them from Shopify.
- Do not collect payment information in this app; keep payment and shipping inside Shopify checkout.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
