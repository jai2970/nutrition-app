# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

```bash
npm run dev      # start dev server (Turbopack) at localhost:3000
npm run build    # production build
npm run start    # serve the production build
npm run lint     # eslint (flat config, eslint-config-next)
npx tsc --noEmit # type-check without emitting
```

Database (Prisma, SQLite via `dev.db`):

```bash
npx prisma migrate dev --name <description>  # create + apply a migration after editing schema.prisma
npx prisma generate                           # regenerate the client into src/generated/prisma (do this after every schema change or fresh clone)
npx prisma studio                             # browse/edit data in a GUI
```

There is no test runner configured yet.

## Architecture

- **Next.js 16, App Router, TypeScript, Tailwind v4.** Routes/layouts live in `src/app`; the `@/*` path alias resolves to `src/*`.
- **This Next.js version postdates the training data of most models.** Before writing framework code (routing, data fetching, config), check `node_modules/next/dist/docs/01-app/` for current APIs rather than assuming older conventions.
- **Database access goes through Prisma.** Schema is `prisma/schema.prisma`; SQL migrations live in `prisma/migrations/`. `prisma.config.ts` (not `schema.prisma`) is where `DATABASE_URL` is wired up, loaded via `dotenv/config`.
- **Prisma Client is generated, not committed.** The generator writes to `src/generated/prisma` (gitignored) — run `npx prisma generate` after cloning or whenever `schema.prisma` changes, or imports from `@/generated/prisma/client` will fail to resolve.
- **Prisma 7 requires an explicit driver adapter** (no more implicit query engine binary). This project uses `@prisma/adapter-better-sqlite3`. The shared client instance lives in `src/lib/prisma.ts`, cached on `globalThis` in dev to survive Turbopack/Fast Refresh reloads — always import `prisma` from there rather than instantiating `PrismaClient` directly.
- **Current data model** (`prisma/schema.prisma`): `User` — `FoodEntry` (many-to-one) — `FoodItem`, where a `FoodEntry` records `grams` of a `FoodItem` consumed by a `User` at a point in time; per-100g macros (calories/protein/carbs/fat) live on `FoodItem` and are scaled by `grams` at query/display time.
- Claude Code skills for Prisma CLI/client/database-setup workflows are installed under `.claude/skills/` (mirrored in `.agents/skills/`, `.windsurf/skills/`) — consult them for anything beyond the basics above (adapters for other databases, migrations edge cases, etc.) rather than guessing at Prisma 7 syntax.
