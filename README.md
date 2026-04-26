# MittenIQ V2

AI-assisted estimating platform for electrical contractors.

Built on Next.js 16, React 19, TypeScript, Tailwind, Prisma 7, Supabase, Cloudflare R2, and OpenAI.

## Project Documentation
Project docs live in the `docs/` folder:
- `docs/CONTEXT.md` — project identity, tech stack
- `docs/ARCHITECTURE.md` — design rules, drawing intelligence, conventions
- `docs/PROJECT.md` — current state and next priorities
- `docs/CLAUDE_INSTRUCTIONS.md` — how Claude works on this project

## Local Development
1. Copy `.env.local` from a teammate (contains secrets � never commit).
2. `npm install`
3. `npm run dev`
4. Open http://localhost:3000

## Production
Deployed on Vercel from the `main` branch. Database is Supabase. File storage is Cloudflare R2.
