# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **Frontend**: React + Vite + Tailwind CSS + shadcn/ui

## Structure

```text
artifacts-monorepo/
├── artifacts/              # Deployable applications
│   ├── api-server/         # Express API server
│   └── yoga-studio/        # React Vite frontend (mobile-first)
├── lib/                    # Shared libraries
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   └── db/                 # Drizzle ORM schema + DB connection
├── scripts/                # Utility scripts
│   └── src/seed.ts         # Database seeding from CSV data
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── tsconfig.json
└── package.json
```

## Application: Yoga Studio Finance

Mobile-first web app for a yoga studio owner to track payments, view monthly P&L, manage customers, teachers, and costs.

### Features (V1)
- **Home**: Current month KPIs (revenue, costs, estimated profit) with "Add Payment" CTA
- **Payments**: Create/edit/delete payments with customer autocomplete, product selection, amount, payment method (Contanti/POS/Bonifico)
- **Customers**: Search with autocomplete, create new customers
- **Accounts (Conti)**: Monthly P&L breakdown (revenue, teacher costs, other costs, taxes, net profit)
- **History (Storico)**: Past months summary list with drill-down
- **Teachers**: Manage teachers, track monthly hours, cost calculation (hourly/manual)
- **Teacher Analysis**: Estimated revenue/margin per teacher (labeled as estimates)
- **Other Costs**: Monthly cost entries by category (affitto, bollette, etc.)
- **Settings**: Products/prices, tax rate, teacher management

### Data Model
- **customers**: id, full_name, phone, notes, timestamps
- **products**: id, name, default_price (cents), active, sort_order
- **payments**: id, customer_id, product_id, amount (cents), payment_method, date, note, timestamps
- **teachers**: id, name, compensation_type (hourly/manual), hourly_rate, active
- **teacher_monthly_hours**: id, teacher_id, month, hours_worked, manual_cost
- **other_costs**: id, month, category, amount, note
- **tax_settings**: id, tax_rate

### API Endpoints
All under `/api`:
- `GET/POST /customers`, `GET/PUT /customers/:id`
- `GET/POST /products`, `PUT /products/:id`
- `GET/POST /payments`, `GET/PUT/DELETE /payments/:id`
- `GET/POST /teachers`, `PUT /teachers/:id`
- `GET/PUT /teachers/:id/hours`
- `GET /teachers/analysis/:month`
- `GET/POST /other-costs`, `PUT/DELETE /other-costs/:id`
- `GET /summary/:month`, `GET /summary/history`
- `GET/PUT /settings/tax`
- `GET/PUT /settings/default-costs`

### Navigation
Bottom nav: Home | Clienti | Conti | Altro
Altro menu: Storico, Insegnanti, Altre Spese, Impostazioni

### UX Rules
- Mobile-first only (max-width 430px)
- One primary action per screen
- No tables - cards only
- Payment flow < 10 seconds
- All amounts in cents, displayed as EUR

## TypeScript & Composite Projects

Every package extends `tsconfig.base.json` which sets `composite: true`. The root `tsconfig.json` lists all packages as project references.

## Root Scripts

- `pnpm run build` — runs `typecheck` first, then recursively runs `build` in all packages that define it
- `pnpm run typecheck` — runs `tsc --build --emitDeclarationOnly` using project references

## Packages

### `artifacts/api-server` (`@workspace/api-server`)
Express 5 API server with all routes for the yoga studio app.

### `artifacts/yoga-studio` (`@workspace/yoga-studio`)
React + Vite mobile-first frontend with wouter routing, React Query, shadcn/ui components.

### `lib/db` (`@workspace/db`)
Drizzle ORM schema for all tables. Run `pnpm --filter @workspace/db run push` for migrations.

### `lib/api-spec` (`@workspace/api-spec`)
OpenAPI 3.1 spec. Run `pnpm --filter @workspace/api-spec run codegen` after spec changes.

### `scripts` (`@workspace/scripts`)
Seed script: `pnpm --filter @workspace/scripts run seed` - imports CSV data from attached_assets zip.
