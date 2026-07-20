# Beyos Clothing — E-commerce

A modern, full-featured e-commerce storefront for **Beyos Clothing** ("Style Is Forever").
A complete redesign and rebuild of [beyosclothing.com](https://beyosclothing.com/) with a
premium navy + orange brand identity.

## Tech Stack

- **Next.js 14** (App Router) + **TypeScript**
- **Tailwind CSS** for styling (custom navy/brand-orange theme)
- **Zustand** for cart state (persisted to `localStorage`)
- **Next.js Route Handlers** as the TypeScript backend (`/api/*`)
- **MySQL** database (`mysql2`) — users, products, orders
- **Auth**: bcrypt password hashing + JWT session in an httpOnly cookie (`jose`)

## Features

- 🏠 **Home** — auto-rotating hero carousel, category grid, featured products, custom-printing banner, "Why choose us", testimonials, newsletter
- 🛍️ **Shop** — category filtering (Men / Women / Accessories) + sorting (price, rating, newest), URL-synced
- 👕 **Product detail** — image gallery, size/color/quantity selectors, add-to-cart, related products
- 🛒 **Cart** — slide-out drawer + full cart page, quantity editing, free-shipping progress
- 💳 **Checkout** — shipping form, order summary, server-validated order placement, confirmation screen
- 🔐 **Login / Register** — styled auth pages (demo, not wired to a real auth backend)
- ℹ️ **About** — brand story, stats, values, contact
- 💰 Prices in **LKR** (matching the real store)

## Backend API (TypeScript)

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/products` | GET | List products (`?category=`, `?featured=true`) |
| `/api/products/[slug]` | GET | Single product |
| `/api/auth/register` | POST | Create account, start session |
| `/api/auth/login` | POST | Sign in, start session |
| `/api/auth/logout` | POST | Clear session |
| `/api/auth/me` | GET | Current user (or `null`) |
| `/api/checkout` | POST | **Auth required** — validate cart & persist order to MySQL |

## Getting Started

```bash
npm install

# 1. Configure the database — copy the example and set your MySQL password
cp .env.example .env.local
#   then edit .env.local -> DB_PASSWORD=...

# 2. Create the `beyos` database, tables, and seed products
npm run db:setup

# 3. Run the dev server
npm run dev      # http://localhost:3000
```

### Auth & Checkout flow
- Register / sign in at `/register` and `/login`.
- Pressing **Checkout** while logged out redirects to `/login?redirect=/checkout`; after signing in you return to checkout automatically.
- Placing an order writes to the `orders` + `order_items` tables (linked to the user) inside a transaction; totals are recomputed server-side.

### Database scripts
- `npm run db:setup` — create DB + tables + seed products (reads `.env.local`).
- `npm run db:seed:gen` — regenerate `db/products.seed.json` from `src/lib/products.ts` (run after editing the catalog, then `db:setup` again).

Build for production:

```bash
npm run build
npm start
```

## Project Structure

```
src/
  app/
    page.tsx              # Home
    shop/                 # Shop listing (+ ShopClient)
    product/[slug]/       # Product detail (SSG)
    cart/  checkout/      # Cart & checkout
    about/ login/ register/
    api/                  # TypeScript backend route handlers
  components/             # Header, Footer, CartDrawer, ProductCard, HeroCarousel, ...
  lib/                    # products (catalog), types, utils
  store/cart.ts           # Zustand cart store
public/images/            # Logos, hero images, product & category art
```

## Notes / Next Steps

- Product catalog lives in `src/lib/products.ts` — swap for a real DB (Prisma/Postgres) when ready.
- Auth pages are UI-only; wire up NextAuth or a custom auth backend for real accounts.
- Checkout uses Cash-on-Delivery mock; integrate a payment gateway (Stripe / PayHere) for live payments.
- Fonts use system stacks so the app runs fully offline. To use Google Fonts (Inter / Playfair Display),
  re-add `next/font/google` in `src/app/layout.tsx` (requires network at build time).
```
