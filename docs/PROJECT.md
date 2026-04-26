# MittenIQ — Project State
Last Updated: 2026-04-26 (V2 clean room migration complete)

## Where We Are Right Now
The V2 clean room migration is complete. The new repo at `github.com/jlevert71/mitteniq-v2` is the canonical codebase. The old repo is archived. mitteniq.com serves V2.

## What's Built and Working

### Public Marketing Site — mitteniq.com
- Landing page, waitlist form, pricing, savings table, FAQ, footer

### Auth
- Login at `/login` — session cookie (`mitten-auth`) with secure:true
- `requireUserId()` guard on all API routes

### Projects Dashboard — `/projects`
- Lists projects, Create/Delete modals working

### Project Page — `/projects/[projectId]`
- Project efficiency bar, four agent tiles, upload panel
- Upload list appears immediately under the purchased function card

### Intake Page — `/projects/[projectId]/intake?uploadId=[id]`
- File status bar, Intake Report, Inline PDF Viewer, Pre-Bid Checklist all working

### Intake Report
- File Health, Page Summary, Specification Section Index
- All divisions collapsed by default, Expand/Collapse All button
- Section links open inline PDF viewer at correct page
- CSI division names map: Division 0, 1-28, 31, 32, 33, 40, 43, 44, 46

### Inline PDF Viewer
- Defaults to fit-to-height scale (700px target) on load
- + / − zoom buttons, 0.25 step, min 0.5x max 3.0x, percentage readout
- Prev/Next navigation, page counter, Close button
- pdfjs-dist only

### Pre-Bid Checklist Agent (Production-Ready)
- Tested against 9 real Michigan spec books
- Run / Re-run button, progress log, ✓ Saved indicator
- Download PDF button
- All 6 sections with editable fields, alerts, static notes
- Auto-save/load
- Progressive scan, dynamic char limits, deterministic post-processing

### TOC Parser
- Located in `lib/intake_v2/parse-toc.ts`
- Three-tier page resolution, all Michigan spec book formats supported
- Performance: Fishbeck 946pp = 154 entries, 153 resolved, 18ms
- MDOT proposals: 0 entries (correct — no TOC in MDOT format)

### V2 Intake Result Caching
- `buildIntakeV2ClientPayload` helper normalizes raw and cached data identically
- Cache check on load: uses `meta.intakeReport?.v2` if present, skips fresh fetch
- POST to `/api/intake-v2/save` after fresh fetch (best-effort, errors ignored)

### DB Schema
- `User`, `Project`, `Upload`, `Sheet`, `PreBidChecklist`, `PreBidChecklistAllowanceItem`
- `Upload.intakeReport` (Json) caches V2 result under `.v2` key
- Single clean baseline migration `0_init` (post-clean-room)

## Next Session Priorities
Trimmed to immediate work — far-future items live in ARCHITECTURE.md Roadmap.

1. **Add `qualificationsRequired` and `dbeSbeGoalPercent` to DB schema and save logic.** These fields exist in types and UI but aren't being persisted yet.

2. **Division 26 Scope Review Agent — second agent.** Located in `lib/agents/division-26-scope-review/` (not yet created). Uses TOC parser output to navigate directly to Division 26 sections. Features:
   - Warranty extraction by spec section — flag >1 year, dollar impact warning
   - Scope items, exclusions, furnished-by-owner equipment
   - Special testing and commissioning requirements
   - RFQ language generation

3. **Drawing sheet index parser** — cover page parser for single drawing set PDFs. Located in `lib/agents/drawing-index/` (not yet created). Deterministic pattern matching, no AI. Supports F&V, Fishbeck, C2AE, GEI, Wade Trim cover page formats.

## Known Issues / Open Problems
- Progress messages show all at once after scan completes — streaming deferred (see Roadmap)
- `qualificationsRequired` field added to types/extract but not yet in DB schema or save logic
- `dbeSbeGoalPercent` field added to types/extract/UI but not yet in DB schema or save logic
- EJCDC running page header "Section 00 72 00" format not yet resolved in TOC tertiary resolution
- CWSRF boilerplate sections have malformed stamps — not cleanly parseable
- Next.js 16 deprecation warning: `middleware` file convention should become `proxy`. Not blocking — warning only. Clean up at some point.

## Decisions Still Pending
- Prime vs. sub role path — `biddingAs` field per project (would change pre-bid extraction logic)
- Real-time streaming progress via SSE
- Background job architecture so scans aren't abandoned when user leaves page

## Notes for Next Session
- `prisma.config.ts` at repo root routes the Prisma CLI to `DIRECT_DATABASE_URL`. Do not modify the empty datasource block in `prisma/schema.prisma` — it's intentional under Prisma 7.
- Build script in `package.json` is `"prisma generate && next build"` — required so Vercel always regenerates Prisma types on deploy.
- The `Prisma` namespace import was replaced with direct `InputJsonValue` import from `@prisma/client/runtime/client` — Prisma 7's correct path.
- Tailwind v4 reads theme tokens from `app/globals.css` via `@theme` block, not from `tailwind.config.js`. The config file was deleted.