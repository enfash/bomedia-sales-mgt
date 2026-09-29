# BOMedia Sales Manager

Internal sales, customer-debt and cash app for BOMedia, a large-format printing business in Lagos, Nigeria. Staff use it mainly on Android phones; the admin uses desktop web for oversight. One codebase: **Expo SDK 57 + Expo Router + React Native Paper**, backed by **Supabase (Postgres)**.

> Status: development build against a development Supabase project. It is not yet a complete, released accounting system — see [What's implemented](#whats-implemented) and [docs/BACKEND_SETUP.md](docs/BACKEND_SETUP.md).

## What's implemented

| Area | Summary |
| --- | --- |
| Auth | Email/password login for admin-created accounts (no public signup). Active-profile check; staff (orange) and admin (blue) role themes. |
| New sale | Multi-item invoices (up to 200 items), feet/inches entry, exact pricing, live invoice rail, review sheet, atomic `create_sale` with optional opening payment. |
| Durability | Account-scoped drafts and an immutable submission outbox (SQLite on native, IndexedDB on web). Retries reuse the same operation ID; confirmed receipts are kept. |
| Records | Sales history by Lagos date with server day totals. Staff see today plus the preceding six days; admin sees full history. |
| Customers | Customer count and debt totals, search, sort by name/balance/oldest debt, outstanding invoices per customer. |
| Payments | Debt receipts with oldest-first allocation or invoice-only scope, review, local recovery, daily collections, admin unapplied-receipt alert. |
| Cash | Shared-drawer expected balance, opening count, expenses and withdrawals with attribution and recovery. |

**Not yet built:** cash closing counts and admin day finalization, audited corrections/voids, admin user and catalogue/rate management, offline access policy, multi-tab ownership, release builds. Production scheduling, analytics, notifications and a customer portal are out of scope for v1.

## Quick start

Requires **Node.js 22.13+**.

```bash
npm ci
cp .env.example .env.local   # fill in the public Supabase URL and publishable key
npm start                    # Expo dev server (try Expo Go first)
npm run android              # or: npm run ios / npm run web
```

`.env.local` is git-ignored and must only contain **public** client configuration. Never put service-role keys or passwords in `EXPO_PUBLIC_*` variables or anywhere in the app. Web sessions are per browser tab, so each new tab needs a fresh sign-in.

Native splash/icon changes need a native build to verify.

## Checks

| Command | What it does |
| --- | --- |
| `npm run check` | TypeScript (`tsc --noEmit`) + Expo lint |
| `npm test` | Node test suite in `tests/` (pricing, money, submission/recovery, local storage, access policy, reads) |
| `npx expo-doctor` | Project health |
| `npx expo install --check` | SDK-compatible dependency versions |
| `node scripts/test-database-local.mjs <pglite-path>` | Applies every migration to an isolated PGlite database and runs the SQL suites in `supabase/tests/`. No network or credentials. PGlite is installed outside the repo — see the script header for the exact commands. |

Run `npm run check` and `npm test` before committing.

## Project layout

```
src/
  app/                 Thin Expo Router routes only
    _layout.tsx        Auth gate, role theme, status bar
    (tabs)/            New sale (index), records, customers, payments, cash
  features/            Domain logic, data services and screens per feature
    auth/ sales/ records/ customers/ payments/ cash/
  components/
    ui/                Shared primitives (page, review sheet, choice buttons, tables, …)
    layout/            App shell (desktop sidebar / phone tabs)
  services/            Supabase client, local SQLite/IndexedDB storage, cancellable reads
  hooks/               Workspace layout, focus/foreground-refreshed reads
  theme/               tokens.ts (spacing, palettes, sizes) and theme.ts (Paper themes)
supabase/
  migrations/          Ordered SQL migrations (never edit one after it is applied)
  tests/               Rollback-only SQL test suites
tests/                 Node tests
docs/                  Product, design, backend and handoff documents
```

## Conventions

- **Routes stay thin.** Business logic lives in `src/features/*` domain/service modules; UI uses shared components and theme tokens — no per-screen palettes, spacing or type scales.
- **Money is exact.** JSON amounts are integer-kobo strings; client math uses BigInt rationals, Postgres uses exact numeric. No floats.
- **Pricing:** per-square-foot rates come from the server. Each item is rounded **up** to the next ₦10; the ₦1,000 minimum applies to the whole invoice. Payments and expenses are exact to the kobo.
- **The server is the authority.** RLS and RPC functions enforce permissions; UI role colours are presentation only.
- Kebab-case file names; import source with the `@/` alias.
- UI work follows [docs/skills/bomedia-ui/SKILL.md](docs/skills/bomedia-ui/SKILL.md) and [docs/DESIGN_SYSTEM.md](docs/DESIGN_SYSTEM.md). Verify both desktop web and phone layouts.

## Database

Migrations are applied to the linked development project with the Supabase CLI:

```bash
npx supabase migration list --linked
npx supabase db push --dry-run
npx supabase db push
```

Run CLI database commands one at a time — parallel commands fail on the CLI's temporary login rotation. Add a new migration to change deployed behaviour instead of editing an applied one. Deployment status and test evidence are in [docs/BACKEND_SETUP.md](docs/BACKEND_SETUP.md).

## Documentation

Read these before changing anything (required for every contributor, human or AI — see [AGENTS.md](AGENTS.md)):

1. [docs/HANDOFF.md](docs/HANDOFF.md) — current state, pending approvals, next task, session history
2. [docs/PRODUCT_SPECIFICATION.md](docs/PRODUCT_SPECIFICATION.md) — approved product rules
3. [docs/DESIGN_SYSTEM.md](docs/DESIGN_SYSTEM.md) — shared components and presentation contracts
4. [docs/DATABASE_AND_SYNC_DESIGN.md](docs/DATABASE_AND_SYNC_DESIGN.md) — architecture, including planned workflows
5. [docs/BACKEND_SETUP.md](docs/BACKEND_SETUP.md) — what is deployed and verified

Update `docs/HANDOFF.md` at the end of every work session.

## Before release

- Export a 1024×1024 app icon (the current 40×40 icon is temporary) and purpose-made Android adaptive/monochrome icons; don't stretch the wide wordmark.
- Normalize the `BOmedia logo Icon.*` asset names (spaces, capitalization) together with their references once new exports exist.
- Choose iOS bundle / Android package identifiers and configure EAS build profiles and signing.
- Physical-device QA: light/dark, large text, keyboard, safe areas, sheet gestures, splash, interrupted-save recovery.
- Review the 14 moderate transitive `npm audit` findings (no forced Expo downgrade) and plan a coordinated ESLint upgrade with the Expo config.
