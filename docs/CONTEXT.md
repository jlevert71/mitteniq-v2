# MittenIQ — Context

## Who I Am
Jim — electrical estimator/PM with 31 years in the trade, 22 as estimator.
Currently estimator/PM at CountyLine Power LLC (countylinepower.com) — a licensed electrical contractor in Hope, MI focused on municipal, industrial, and infrastructure projects across Mid-Michigan since 2014. NECA member, IBEW contractor, MDOT prequalified and L certified.

Founder and sole builder of MittenIQ. Not a software developer. Claude is the technical partner; I'm the domain expert.

## Tools
- Claude (architecture, guidance, code review, planning)
- Cursor (code generation in the IDE)
- ChatGPT (occasional second opinion)

## What MittenIQ Is
AI-assisted estimating platform for electrical contractors specifically.

**Long-term vision:** estimating, project management, payroll, AP/AR, fleet management — a full digital estimating office for mid-to-large electrical contractors.

**Current focus:** estimating only.

## Agent Architecture (Models Real Estimating Department Roles)
- Estimating Assistant
- Junior Estimator
- Senior Estimator
- Chief Estimator

## Domain Framing
Built around CSI divisions, primarily 26 (electrical), 27 (communications), 28 (electronic safety/security). Plus Division 0/1 (front-end), and key non-26 divisions where electrical scope hides.

## Target Market — CountyLine Power's Project Types
- Water & wastewater infrastructure (treatment plants, lift stations, pump stations, towers)
- Roadway & streetscape electrical (MDOT work, parking lots, bridge lighting)
- Dam & hydraulic infrastructure electrical
- Manufacturing facilities
- Generator / transfer switch systems
- Airport electrical systems (FAA L-series)

## Tech Stack
- Next.js 16, React 19, TypeScript, Tailwind v4
- Prisma 7 + pg adapter
- Supabase (Postgres) — Pro tier
- Cloudflare R2 (file storage)
- Vercel (hosting, production branch: `main`)
- OpenAI gpt-4o-mini via Chat Completions
- pdf-parse, pdfjs-dist 5.4.296, @napi-rs/canvas 0.1.65

## Repos & Infrastructure
- **Live repo:** github.com/jlevert71/mitteniq-v2
- **Archived V1 repo:** github.com/jlevert71/mitteniq-v1-archive (read-only)
- **Production URL:** mitteniq.com
- **Vercel project:** mitteniq-v2
- **Database:** Supabase Pro — DATABASE_URL (pooler) for app, DIRECT_DATABASE_URL (direct) for migrations
- **R2 bucket:** mitteniq-uploads (CORS allows mitteniq.com, www.mitteniq.com, mitteniq-v2.vercel.app, localhost:3000)