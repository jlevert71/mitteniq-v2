# MittenIQ — Project State
Last Updated: 2026-05-15 (Real-time SSE streaming shipped for pre-bid checklist agent)

## Where We Are Right Now
The V2 clean room migration is complete. The new repo at `github.com/jlevert71/mitteniq-v2` is the canonical codebase. The old repo is archived. mitteniq.com serves V2.

Most recent session shipped real-time SSE progress streaming for the pre-bid checklist agent — progress messages now appear live as the agent works rather than batching at the end, with 10-second heartbeat ticks filling the silent gaps during each ~28-30s OpenAI call. The implementation establishes a reusable heartbeat-during-AI-call design template for future long-running agents (Division 26 Scope Review, Chief Estimator, etc.).

## What's Built and Working

### Public Marketing Site — mitteniq.com
- Landing page, waitlist form, pricing, savings table, FAQ, footer

### Auth
- Login at `/login` — session cookie (`mitten-auth`) with secure:true
- `requireUserId()` guard on all API routes
- Logout button on Projects Dashboard — POSTs to `/api/logout`, then client-side redirect to `/login`

### Projects Dashboard — `/projects`
- Lists projects, Create/Delete modals working
- Logout button next to Create Project

### Project Page — `/projects/[projectId]`
- Project efficiency bar, four agent tiles, upload panel
- Upload list appears immediately under the purchased function card
- Status badges on uploads (PENDING → UPLOADED → READY) shown here

### Intake Page — `/projects/[projectId]/intake?uploadId=[id]`
- Project name is the page heading; "INTAKE" shown as small uppercase label above
- File card simplified — only filename shown when intake is READY
- Status row (Upload/Intake/Stage badges) and progress text hidden when READY
- Status row reappears for PROCESSING/FAILED states
- Server-side ownership check: invalid `projectId` redirects to `/projects`
- Inline PDF Viewer and Pre-Bid Checklist working

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
- Real-time progress streaming via SSE — messages appear as the agent emits them, not batched at the end
- 10-second heartbeat ticks during AI calls (rotating voiced messages: "Still working…", "Hang tight…", "Almost there…", "Still scanning, please stand by…", "Working through it…") fill the ~28-30s silent gap of each OpenAI call
- Mid-stream re-run handling via reference-identity guard on the EventSource ref
- Proper EventSource cleanup on unmount, completion, and error

### TOC Parser
- Located in `lib/intake_v2/parse-toc.ts`
- Three-tier page resolution, all Michigan spec book formats supported
- Performance: Fishbeck 946pp = 154 entries, 153 resolved, 18ms
- MDOT proposals: 0 entries (correct — no TOC in MDOT format)

### V2 Intake Result Caching
- `buildIntakeV2ClientPayload` helper normalizes raw and cached data identically
- Cache check on load: uses `meta.intakeReport?.v2` if present, skips fresh fetch
- POST to `/api/intake-v2/save` after fresh fetch (best-effort, errors ignored)

### Upload Pipeline
- `/api/uploads/presign` → presigned R2 URL
- Browser PUTs file directly to R2
- `/api/uploads/complete` → marks upload UPLOADED in DB
- `/api/uploads/analyze` → status-flipper only. Marks `intakeStatus: READY`, `intakeStage: v2_ready`. Idempotent. **Does NOT run analysis** — V2 intake runs lazily on Intake page load.
- `IntakeClient.tsx` calls `analyze` defensively if it lands on a not-yet-READY upload

### DB Schema
- `User`, `Project`, `Upload`, `Sheet`, `PreBidChecklist`, `PreBidChecklistAllowanceItem`
- `Upload.intakeReport` (Json) caches V2 result under `.v2` key
- Single clean baseline migration `0_init` (post-clean-room)

## Next Session Priorities
Trimmed to immediate work — far-future items live in ARCHITECTURE.md Roadmap.

1. **Add `qualificationsRequired` and `dbeSbeGoalPercent` to DB schema and save logic.** These fields exist in types and UI but aren't being persisted yet.

2. **Projects Dashboard polish.** Currently a flat list of cards. Discussion deferred from this session — design ideas TBD.

3. **TOC unresolved sections — Palmer 3A Juniper case.** Some sections are correctly identified in the TOC but get no PDF page link. Will block folder-separation feature when that arrives. Needs dedicated debug session with a real failing example.

4. **Division 26 Scope Review Agent — second agent.** Located in `lib/agents/division-26-scope-review/` (not yet created). Uses TOC parser output to navigate directly to Division 26 sections. Features:
   - Warranty extraction by spec section — flag >1 year, dollar impact warning
   - Scope items, exclusions, furnished-by-owner equipment
   - Special testing and commissioning requirements
   - RFQ language generation

5. **Drawing sheet index parser** — cover page parser for single drawing set PDFs. Located in `lib/agents/drawing-index/` (not yet created). Deterministic pattern matching, no AI. Supports F&V, Fishbeck, C2AE, GEI, Wade Trim cover page formats.

## Known Issues / Open Problems
- Some TOC sections correctly identified but missing PDF page link (priority 3)
- `qualificationsRequired` field added to types/extract but not yet in DB schema or save logic
- `dbeSbeGoalPercent` field added to types/extract/UI but not yet in DB schema or save logic
- EJCDC running page header "Section 00 72 00" format not yet resolved in TOC tertiary resolution
- CWSRF boilerplate sections have malformed stamps — not cleanly parseable
- Next.js 16 deprecation warning: `middleware` file convention should become `proxy`. Not blocking — warning only. Clean up at some point.
- Intake Report card shows no progress indicator while running (30-40s on typical specs). User can't tell if it's working or crashed. Apply the SSE + heartbeat pattern established for the pre-bid checklist agent (ARCHITECTURE.md #27).
- Per-page processing time on drawing PDFs is ~2.7x slower than on spec book pages (60 drawing pages scanned in 113s vs 87 spec pages scanned in 63s). Possibly pdfjs-dist text extraction overhead on large-format graphic-heavy pages. Worth investigating before drawing intake work begins, since drawing intake will process drawing pages as the primary path.
- Pre-bid checklist agent produces silent confident wrong answers when run on drawing-only PDFs. Mt Pleasant Plans test (123 pages, 3 passes, 113s) returned fabricated values for Bid Due Date, Bid Due Time, Deliver Bid To, and Documents Available At — including an Autodesk Revit source path read from PDF metadata. Resolved architecturally by routing drawings to a separate intake pipeline (ARCHITECTURE.md decision #25) — pre-bid checklist won't be offered for drawing-only PDFs. No agent-level fix needed once routing is in place.

## Decisions Still Pending
- Prime vs. sub role path — `biddingAs` field per project (would change pre-bid extraction logic)
- Background job architecture so scans aren't abandoned when user leaves page (may be forced by Vercel duration limits when SSE work begins)

## Notes for Next Session
- `prisma.config.ts` at repo root routes the Prisma CLI to `DIRECT_DATABASE_URL`. Do not modify the empty datasource block in `prisma/schema.prisma` — it's intentional under Prisma 7.
- Build script in `package.json` is `"prisma generate && next build"` — required so Vercel always regenerates Prisma types on deploy.
- The `Prisma` namespace import was replaced with direct `InputJsonValue` import from `@prisma/client/runtime/client` — Prisma 7's correct path.
- Tailwind v4 reads theme tokens from `app/globals.css` via `@theme` block, not from `tailwind.config.js`. The config file was deleted.
- **Next.js 16 + Turbopack cache flakiness:** Observed twice in one session. Build is clean, dev server restarts, but stale route table or stale page state served. Fix: stop dev server → `rmdir /S /Q .next` → `npm run dev`. Try this first when "code is right but page won't load it" symptoms appear.
- **`/api/uploads/analyze` is a status-flipper, not an analysis runner.** Don't add analysis work to it. V2 intake is lazy by design — runs in `/api/intake-v2/test` when the user opens the Intake page.
