# ShopWave — E-Commerce Marketplace

A full-stack Indian e-commerce marketplace app (similar to Amazon/Flipkart) with products, categories, cart, wishlist, orders, reviews, seller dashboard, and admin dashboard.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080, proxied at `/api`)
- `pnpm --filter @workspace/shop run dev` — run the React frontend (proxied at `/`)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React 19 + Vite, Tailwind CSS v4, shadcn/ui components, Wouter routing, TanStack Query
- API: Express 5 with Clerk middleware
- Auth: Clerk (Replit-managed), `x-clerk-user-id` header for API auth
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec at `lib/api-spec/openapi.yaml`)
- Build: esbuild (CJS bundle)

## Where things live

- `lib/api-spec/openapi.yaml` — source of truth for all API contracts
- `lib/db/src/schema/` — all Drizzle table definitions
- `lib/api-zod/src/generated/` — generated Zod schemas from OpenAPI
- `lib/api-client-react/src/generated/` — generated React Query hooks from OpenAPI
- `artifacts/api-server/src/routes/` — all Express route handlers
- `artifacts/shop/src/` — React frontend pages and components

## Architecture decisions

- **Contract-first API:** OpenAPI spec in `lib/api-spec/openapi.yaml` drives all Zod validation and React Query hooks via Orval codegen.
- **x-clerk-user-id auth pattern:** Frontend sends Clerk user ID as a request header; backend uses it to look up the local user record. User is synced to DB on first sign-in via `POST /api/users/sync`.
- **Numeric types as strings in Drizzle:** PostgreSQL `numeric` columns come back as strings from Drizzle — always `parseFloat()` before using them.
- **Reviews at top-level path:** Reviews are at `GET/POST /api/reviews?productId=X` (not nested) to avoid Orval hook naming collision.
- **GST + shipping:** Orders automatically apply 18% GST and ₹49 shipping (free above ₹499).
- **Flash sale timer:** `isFlashSale=true` products have a `flashSaleEnd` timestamp shown as a countdown.

## Product

- **Homepage:** Featured products, flash sale countdown, category grid, search
- **Product listing:** Filters (category, price, brand, rating, in-stock), pagination, sort
- **Product detail:** Image gallery, add to cart/wishlist, reviews, write review
- **Cart:** Quantity management, coupon application, order summary
- **Checkout:** Address selection, coupon, payment method (COD/UPI/Card), place order
- **Orders:** History list + detail with shipment tracking timeline
- **Wishlist:** Saved products with add-to-cart
- **Profile:** User info, saved addresses management
- **Seller dashboard:** Revenue/orders analytics, product management, order fulfillment (mark as shipped)
- **Admin dashboard:** Platform-wide analytics, user management (ban/unban), all orders

## User preferences

- Indian e-commerce context: all prices in ₹, GST-inclusive breakdown
- No Stripe/Razorpay yet — payment methods are UI-only
- Stack: PostgreSQL only (no MongoDB/Redis/Elasticsearch)

## Gotchas

- Always run `pnpm --filter @workspace/api-spec run codegen` after changing `openapi.yaml`
- Run `pnpm --filter @workspace/db run push` after schema changes
- `zod/v4` cannot be resolved by esbuild in api-server — use `import { z } from "zod"` for inline schemas
- Drizzle `numeric` columns return as strings — parseFloat() all price/discount values
- Reviews endpoint uses query param `?productId=X` not path param (Orval naming constraint)

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
- Seed data: 13 products across 6 categories; seller user `clerk_id=seed_seller_001`
- Coupons: `WELCOME20` (20% off, min ₹999, max ₹500 discount), `FLAT200` (₹200 flat, min ₹1999)
