# MittenIQ V2

AI-assisted estimating platform for electrical contractors.

Built on Next.js 16, React 19, TypeScript, Tailwind, Prisma 7, Supabase, Cloudflare R2, and OpenAI.

## Project Documentation
- See `CLAUDE_CONTEXT.md` for current state, decisions, and next priorities.
- See `V2_ARCHITECTURE.md` for the architectural philosophy and structure.

## Local Development
1. Copy `.env.local` from a teammate (contains secrets — never commit).
2. `npm install`
3. `npm run dev`
4. Open http://localhost:3000

## Production
Deployed on Vercel from the `main` branch. Database is Supabase. File storage is Cloudflare R2.
