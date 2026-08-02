# SehatBook

Doctor discovery + appointment booking platform for Pakistan.
Next.js (App Router) · TypeScript strict · Supabase (Postgres/Auth/Storage) · Tailwind + shadcn/ui.

> Project rules live in [CLAUDE.md](./CLAUDE.md) (→ AGENTS.md); the build roadmap in [BUILD_PLAN.md](./BUILD_PLAN.md).

## Setup

1. `npm install`
2. Copy `.env.example` to `.env.local` and fill in the Supabase keys
   (Dashboard → Project Settings → API).
3. Link the Supabase project and apply migrations:

   ```sh
   npx supabase login
   npx supabase link --project-ref <your-project-ref>
   npx supabase db push
   npx supabase gen types typescript --linked > src/lib/supabase/database.types.ts
   ```

4. `npm run dev`

## Commands

| Command                                              | Purpose                           |
| ---------------------------------------------------- | --------------------------------- |
| `npm run dev`                                        | local dev server                  |
| `npm run build && npm run lint && npm run typecheck` | must pass before any commit       |
| `npm run format`                                     | prettier write                    |
| `npx supabase db push`                               | apply migrations (linked project) |

After **any** schema change: `db push` + regenerate `database.types.ts` + build.
