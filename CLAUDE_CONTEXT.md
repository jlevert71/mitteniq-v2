# MittenIQ — Claude Resume Context
Last Updated: 2026-04-16 (session 7 — drawing architecture research, discipline classifier, V2 clean room decision)

## Who I Am
Jim — electrical estimator/PM with 31 years in the trade, 22 as estimator.
Currently estimator/PM at CountyLine Power LLC (countylinepower.com) — a licensed electrical contractor
in Hope, MI focused on municipal, industrial, and infrastructure projects across Mid-Michigan since 2014.
NECA member, IBEW contractor, MDOT prequalified and L certified.
Founder and sole builder of MittenIQ.
Primary tools: Claude (architecture/guidance), Cursor (code generation), ChatGPT (second opinion).
Important: Jim is not a software developer. All instructions must be step-by-step and plain English.
Claude is the technical partner. Jim is the domain expert.
Cursor prompt format: always deliver as a single fenced code block — one tile, one copy button.

## What MittenIQ Is
AI-assisted estimating platform for electrical contractors specifically.
Long-term vision: estimating, project management, payroll, AP/AR, fleet management.
Current focus: estimating only.

Agent architecture models real estimating department roles:
- Estimating Assistant
- Junior Estimator
- Senior Estimator
- Chief Estimator

Domain framing uses CSI divisions — primarily 26, 27, 28.

CountyLine Power's project types (MittenIQ's primary target market):
- Water & wastewater infrastructure (treatment plants, lift stations, pump stations, towers)
- Roadway & streetscape electrical (MDOT work, parking lots, bridge lighting)
- Dam & hydraulic infrastructure electrical
- Manufacturing facilities
- Generator / transfer switch systems
- Airport electrical systems (FAA L-series)

## Tech Stack
- Next.js 16, React 19, TypeScript, Tailwind
- Prisma 7 + pg adapter
- Supabase (Postgres) — free tier, keep-alive workflow required
- Cloudflare R2 (file storage)
- Vercel (hosting, production branch: main)
- OpenAI gpt-4o-mini via Chat Completions
- pdf-parse, pdfjs-dist 5.4.296, @napi-rs/canvas 0.1.65
- tesseract.js (present but avoid using)

## Codebase Status — V2 CLEAN ROOM MIGRATION PENDING
The current repo carries V1 dead weight alongside working V2 code.
Decision made: create a clean new repo (MittenIQ V2), port only working V2 files, leave V1 behind.

### Files to PORT (keep in V2):
- `lib/intake_v2/` — all 5 files
- `lib/agents/pre-bid-checklist/` — all 4 files
- `app/projects/[projectId]/` — active project pages and intake UI
- `app/api/intake-v2/` — save and test routes
- `app/api/agents/` — checklist agent route
- `app/api/projects/` — project CRUD routes
- `app/api/uploads/[uploadId]/file/route.ts` — V2 file route (page jump support)
- `components/agents/PreBidChecklist.tsx`
- `lib/prisma.ts`, `lib/r2.ts`, `lib/auth.ts`, `middleware.ts`
- `prisma/schema.prisma` — write ONE clean initial migration, leave V1 migration history behind
- `public/pdf.worker.min.js`
- `app/page.tsx`, `app/login/page.tsx`, `app/layout.tsx`, `app/globals.css` — landing page stays in same repo
- `app/api/lead/route.ts`, `app/api/login/route.ts`, `app/api/logout/route.ts`
- `.github/workflows/keep-alive.yml` — MUST be fixed and verified working from day one
- `next.config.ts`, `tailwind.config.js`, `tsconfig.json`, `package.json`, etc.

### Files to LEAVE BEHIND (do not port):
- `lib/intake/` — all 29 V1 files, frozen forever
- `app/intake/page.tsx` — old V1 intake page
- `app/api/intake/route.ts` — V1 intake API
- `app/api/uploads/analyze/`, `complete/`, `get/`, `presign/`, `sheets/` — V1 upload pipeline
- `app/api/debug/` — debug route
- `app/agents/page.tsx`, `app/dashboard/page.tsx`, `app/setup/page.tsx`, `app/savings/page.tsx`
- `eng.traineddata` — tesseract, never use
- `checkSheets.js`, `checkUpload.js`, `describeSheet.js`, `enumLabels.js` — debug scripts
- `batch1-intake-core.txt`, `IntakeClient_good.tsx`, `repo-tree*.txt`, `source-files*.txt`
- `scripts/test-outline.ts` — V1 test script
- All migrations before `add_pre_bid_checklist`
- Most docs except V2_ARCHITECTURE.md, this file, DECISIONS.md

### Verify before cutting cord:
- Upload flow (presign → R2 write → complete) — confirm it goes through V2 routes not V1

## Codebase Structure (V2 active files)
- `lib/intake_v2/` — V2 intake, 5 modules including TOC parser
- `lib/agents/` — Agent layer, actively being built
- `app/api/` — API routes (intake-v2, uploads, projects, agents)
- `app/projects/[projectId]/` — Project pages including intake UI
- `app/projects/[projectId]/intake/IntakeClient.tsx` — Main intake page (active)
- `prisma/schema.prisma` — DB schema (User, Project, Upload, Sheet, PreBidChecklist, PreBidChecklistAllowanceItem)
- `components/agents/PreBidChecklist.tsx` — Pre-bid checklist UI
- `public/pdf.worker.min.js` — pdfjs worker

## Core Architectural Decisions
1. V1 intake is frozen. Do not touch it. V2 clean room migration will leave it behind entirely.
2. V2 philosophy: deterministic scorer first, AI only for fallback, fail loud not smart.
3. Speed is critical. Target: under 90 seconds even for 900+ page documents.
4. No registry systems, no reconciliation layers, no multi-layer confidence scoring in V2.
5. AI tier = text-based for digital PDFs. Vision only for scanned pages, async, never blocking.
6. Pre-bid checklist agent uses progressive scan — starts at 60 pages, doubles each pass.
7. Active intake page is app/projects/[projectId]/intake/ — NOT app/intake/ (old V1 page)
8. Warranty requirements belong in Division 26 scope review agent, not pre-bid checklist.
9. MittenIQ is built specifically for electrical contractors — domain knowledge baked in.
10. preBidMandatory: deterministic fallback if preBidHeld=true and no mandatory language found.
    "Encouraged" always means discretionary.
11. Special insurance only triggers for non-standard coverages.
12. DBE only triggers when explicit participation goals or GFE documentation required.
13. MDOT 2020 Standard Specs reference triggers buyAmerican=true (FHWA Buy America by reference).
14. breakDownsRequired=true when bid form requires pricing broken into separate named divisions.
15. TOC parser is deterministic — no AI. Null for unresolved pages — never guesses.
16. MDOT proposals have no TOC — TOC parser correctly returns zero entries.
17. Runtime DB: DATABASE_URL (pooler, port 6543). DIRECT_DATABASE_URL: CLI/migrations only.
18. V2 intake result cached in Upload.intakeReport.v2. On return visits loads instantly.
19. buyAmerican AI prompt explicitly excludes NSPE/ACEC/ASCE/EJCDC org name false positives.
20. Demo scope is a first-class takeoff category — estimators take demo off as its own line item.
21. Page size rule: 11×17 or larger = drawing page, always, no exceptions.
    8.5×11 and 8.5×14 = spec pages.
22. Airport projects use FAA L-series spec structure, not CSI divisions.
    Airport electrical scope: L-105 (demo), L-108 (cable), L-109 (vault), L-110 (conduit),
    L-115 (handholes), L-125 (fixtures), L-126 (maintenance), L-153 (sensors).
    Airport bid schedule pre-populates quantities — different workflow from W/WW.
23. Combined spec+drawings PDF: first page ≥ 11×17 marks where drawing section starts.
    Everything before = specs. Page size split is deterministic, no text scanning needed.

## Full App Status (as of 2026-04-16)

### Public Marketing Site — mitteniq.com — LIVE AND WORKING
- Landing page, waitlist form, pricing, savings table, FAQ, footer all working

### Auth — WORKING IN PRODUCTION
- Login at /login — session cookie (mitten-auth) with secure:true
- requireUserId() guard on all API routes

### Projects Dashboard — /projects — WORKING IN PRODUCTION
- Lists projects, Create/Delete modals working

### Project Page — /projects/[projectId] — WORKING IN PRODUCTION
- Project efficiency bar, four agent tiles, upload panel
- Upload list appears immediately under the purchased function card

### Intake Page — /projects/[projectId]/intake?uploadId=[id] — WORKING IN PRODUCTION
- File status bar, Intake Report, Inline PDF Viewer, Pre-Bid Checklist all working

### Intake Report — COMPLETE
- File Health, Page Summary, Specification Section Index
- All divisions collapsed by default, Expand/Collapse All button
- Section links open inline PDF viewer at correct page
- CSI_DIVISION_NAMES includes Division 0, 1-28, 31, 32, 33, 40, 43, 44, 46

### Inline PDF Viewer — COMPLETE
- Defaults to fit-to-height scale (700px target) on load
- + / − zoom buttons, 0.25 step, min 0.5x max 3.0x, percentage readout
- Prev/Next navigation, page counter, Close button
- pdfjs-dist only, no new packages

### Pre-Bid Checklist — COMPLETE
- Run / Re-run button, progress log, ✓ Saved indicator
- Download PDF button
- All 6 sections with editable fields, alerts, static notes

### V2 Intake Result Caching — COMPLETE
- buildIntakeV2ClientPayload helper normalizes raw and cached data identically
- Cache check on load: uses meta.intakeReport?.v2 if present, skips fresh fetch
- POST to /api/intake-v2/save after fresh fetch (best-effort, errors ignored)

## Drawing Intelligence Architecture (DESIGNED, NOT YET BUILT)

### Document Type Detection
Three intake scenarios for drawing documents:
1. **Individual sheet PDFs** — one sheet per file, sheet number in filename. Highest confidence.
   Parse filename directly: `SHEETNO---Description.pdf` or `SHEETNO.pdf`
2. **Single drawing set PDF** — all sheets in one PDF. Parse cover page sheet index table.
3. **Combined spec+drawings PDF** — specs + drawings in one file.
   Split at first page ≥ 11×17. Treat drawing section as scenario 2.

### Page Size Rules (deterministic, no exceptions)
- 8.5×11 → spec page
- 8.5×14 → spec page (legal)
- 11×17 or larger → drawing page (always)
- Common drawing sizes seen in Michigan: 34×22, 36×24, 30×42
- 11×17 reduced drawings: image-only pages, text extraction not available — honest null

### Drawing Discipline Classifier
Two-step process:
1. Extract prefix (one or two letters before the sheet number)
2. Look up discipline family from prefix table
3. For ambiguous prefixes: run title keyword confirmation scan

#### Primary Single-Letter Prefixes (US National CAD Standard)
| Prefix | Discipline Family |
|--------|------------------|
| G | General (cover, index, legends, notes) |
| H | Hazardous Materials |
| V | Survey / Mapping |
| B | Geotechnical |
| C | Civil |
| L | Landscape (building projects) / Airfield Lighting (airport projects — FAA L-series) |
| S | Structural |
| A | Architectural |
| I | **AMBIGUOUS** — see disambiguation below |
| Q | Equipment |
| F | Fire Protection (or Facility — check title) |
| P | Plumbing |
| D | **AMBIGUOUS** — see disambiguation below |
| M | Mechanical |
| E | Electrical |
| W | Distributed Energy |
| T | Telecommunications |
| R | Reference / Record / As-Built |
| X | Other |
| Z | Contractor / Shop Drawings |
| O | Operations |

#### Two-Letter Prefixes (sub-disciplines and firm conventions)
| Prefix | Meaning | Notes |
|--------|---------|-------|
| GE | General Electrical (legend/notes) | F&V firm convention |
| AD | Architectural Demolition | NCS standard |
| CD | Civil Demolition | NCS standard |
| SD | Structural Demolition | NCS standard |
| ED | Electrical Demolition | F&V firm convention |
| MD | Mechanical Demolition | C2AE, Fishbeck |
| PD | Process Demolition | C2AE |
| DA | Architectural Demolition (alt) | Fishbeck convention |
| DC | Civil Demolition (alt) | Fishbeck convention |
| DE | Electrical Demolition (alt) | Fishbeck convention |
| DM | Mechanical Demolition (alt) | Fishbeck convention |
| DP | Process Demolition (alt) | C2AE, Fishbeck |
| DS | Structural Demolition (alt) | Fishbeck convention |
| EP | Electrical Power | NCS standard |
| EL | Electrical Lighting | NCS standard |
| EC | Electrical Controls | C2AE firm convention |
| EI | Electrical Instrumentation | C2AE firm convention |
| FA | Fire Alarm | NCS standard |
| FP | Fire Protection / Sprinkler | NCS standard |
| MP | Mechanical Plumbing / HVAC Piping | NCS standard |
| MH | Mechanical HVAC | NCS standard |
| CW | Control of Water / Construction Sequencing | Dam projects (GEI) |
| SG | Site / Grading / Survey | Dam projects (GEI) |
| TN | Telecom Network | NCS standard |
| TT | Telecom Telephone | NCS standard |
| RA | Architectural Record | NCS standard |

#### Multi-Site Prefix Convention (dam / multi-structure projects)
Format: `[SITE]-[DISCIPLINE]-[NUMBER]`
Example from Edenville Dam (GEI Consultants):
- ED- = Edenville Dam
- TO- = Tobacco Dam spillway
- TW- = Tittabawassee Dam
- AS- = Auxiliary Spillway
Discipline code follows the site prefix using standard single/double letter conventions.

#### Ambiguous Prefix Disambiguation
| Prefix | Default | Instrumentation signals | Alternate signals |
|--------|---------|------------------------|-------------------|
| I | Instrumentation | D sheets present, water/wastewater project, title has "I&C"/"SCADA"/"loop"/"control" | A sheets present, building project, title has "finish"/"interior"/"ceiling" |
| D (single) | Process | Title has "flow"/"hydraulic"/"P&ID"/"schematic" | Title has "demolition"/"demo"/"removal"/"existing conditions" |
| F | Fire Protection | Title has "sprinkler"/"suppression"/"alarm" | Title has "facility"/"site" |
| R | Reference/Record | Title has "record"/"as-built"/"existing" | Title has "renovation" |

**Critical D rule:** D as second letter (ED, CD, SD, MD, PD) = ALWAYS demolition of that discipline.
D as first letter of two-letter (DA, DC, DE, DM, DP, DS) = ALWAYS demolition.
Single D = check title — never guess. Flag for review if ambiguous.

#### Sheet Top-Level Tags (for takeoff and package assembly)
Every sheet gets one or more of:
- **New Work** — proposed construction
- **Demo** — removal, demolition, abandonment (CRITICAL — own takeoff line item)
- **Reference** — record/as-built drawings included for information only
- **General** — cover, legend, notes, symbols
- **Process/Diagram** — P&IDs, flow diagrams, hydraulic profiles

A sheet can carry multiple tags (e.g., "Site Plans w/Demolition" = Demo + New Work).
Title keyword scan is the safety net — scan all sheet titles for "demo"/"demolition"/"removal"
regardless of prefix convention used by the engineer.

#### Discipline Family Groupings (for vendor package assembly)
- **Electrical** — E, EL, EP, EC, EI, ED, GE, I (confirmed instrumentation)
- **Process** — D (confirmed process), DP
- **Civil** — C, CD, DC, V
- **Structural** — S, SD, DS
- **Architectural** — A, AD, DA, I (confirmed interiors)
- **Mechanical** — M, MD, DM, MH, MP
- **Plumbing** — P
- **General** — G, GE
- **Reference** — R
- **Dam/Sequencing** — CW, SG (dam projects)

#### Electrical Sub Default Vendor Package
E family + D family (process, for scope context) + relevant C sheets (site plan) + G sheets (legend)
Estimator can add or remove disciplines from the package.

### Engineer/Firm Conventions Observed (Michigan)
| Firm | Prefix Style | Notes |
|------|-------------|-------|
| Fishbeck | No hyphen (E101, C101) | Demolition: DA, DC, DE, DM, DP, DS |
| F&V | Hyphenated (E-101, C-101) | Demolition: ED, CD. GE for electrical legend |
| C2AE | Hyphenated (E-001, G-001) | Sub-disciplines: EC, EI, ED, PD, MD |
| Wade Trim | Sequential integers (1, 2, 3...) | No letter prefix — title text carries discipline |
| GFA | C1.1, M1.1, E1.1 style | Small projects, minimal sheets |
| MDOT | Sequential integers, section-based | "Removal" in title = demo |
| GEI Consultants | Site-discipline-number (ED-G-000) | Multi-dam projects |
| RS&H | FAA L-series | Airport projects, image-only 11×17 plans |
| Spicer Group | Combined spec+drawings PDF | Sequential integers for drawings |

### Project Type Detection
| Signal | Project Type | Routing |
|--------|-------------|---------|
| CSI Division 26/27/28 in TOC | Water/Wastewater/Building | Standard V2 pipeline |
| FAA L-series items in TOC (L-105, L-108, L-125, etc.) | Airport | Airport pipeline (future) |
| MDOT 2020 Standard Specs reference | MDOT highway | MDOT pipeline (future) |
| Zero Division 26 TOC entries + dam terminology | Dam/hydraulic | Dam pipeline (future) |

## What's Built and Working

### TOC Parser — BUILT, TESTED, WORKING
Located in: lib/intake_v2/parse-toc.ts
Three-tier page resolution, all Michigan spec book formats supported.
Performance: Fishbeck 946pp = 154 entries, 153 resolved, 18ms.

### Pre-Bid Checklist Agent — COMPLETE, BATTLE-TESTED, PRODUCTION-READY
Located in: lib/agents/pre-bid-checklist/
Tested against 9 real Michigan spec books. All known false positive issues resolved.

### DB Schema
- PreBidChecklist + PreBidChecklistAllowanceItem models
- Upload.intakeReport (Json) caches V2 result under .v2 key
- Migrations applied through 20260324212755_add_project_name_to_pre_bid_checklist

## Known Issues / Open Problems
- Progress messages show all at once after scan completes — streaming deferred
- Old app/intake/ page still exists — will be dropped in V2 clean room
- Background job architecture needed — scan abandoned if user leaves page mid-run
- qualificationsRequired field added to types/extract but not yet in DB schema or save logic
- dbeSbeGoalPercent field added to types/extract/UI but not yet in DB schema or save logic
- EJCDC running page header "Section 00 72 00" format not yet resolved — roadmap
- CWSRF boilerplate sections have malformed stamps — not cleanly parseable
- Supabase free tier pauses after 7 days inactivity — keep-alive workflow must be fixed in V2

## Next Session Priorities (in order)
1. **V2 clean room migration** — new repo, port working files, fix keep-alive, verify upload flow
2. Add qualificationsRequired and dbeSbeGoalPercent to DB schema and save logic
3. Division 26 scope review agent — second agent
   - Warranty extraction by spec section — flag >1 year, dollar impact warning
   - Scope items, exclusions, furnished-by-owner equipment
   - RFQ language generation
   - Uses TOC parser output to navigate directly to Division 26 sections
4. Drawing sheet index parser — cover page parser for single drawing set PDFs
5. Drawing discipline classifier — implement the architecture designed this session
6. TOC resolution improvement — EJCDC running page header format
7. Streaming progress — real-time pass messages
8. Background job architecture
9. Prime vs. sub role path — biddingAs field per project
10. Airport electrical agent — FAA L-series pay item parser (post-Division 26)

## Decisions Still Pending
- [ ] Verify V1 vs V2 upload flow before clean room migration
- [ ] Prime vs. sub role path — biddingAs field per project
- [ ] Real-time streaming progress via SSE
- [ ] MDOT Electrical Agent (roadmap)
- [ ] Airport Electrical Agent — FAA L-series (roadmap)
- [ ] Dam/hydraulic project type handling (roadmap)
- [ ] Landing page separation from app (deferred — keep together for now)
- [ ] Supabase Pro upgrade (deferred until paying customers)
- [ ] Bid form agent (low priority, far roadmap)

## Production Infrastructure Notes
- Vercel production branch: main — auto-deploys on push
- Runtime DB: DATABASE_URL (Supabase transaction pooler, port 6543)
- Migrations DB: DIRECT_DATABASE_URL — CLI only
- R2 CORS: mitteniq.com + localhost:3000, all methods
- All env vars synced to Vercel
- Supabase free tier: keep-alive GitHub Actions workflow required to prevent pause

## Rules Claude Must Always Follow For This Project
1. Do not modify lib/intake/ — it is frozen V1 (will be dropped in V2 clean room)
2. Do not add registry, reconciliation, or multi-layer confidence systems
3. Do not use vision API for digital PDFs — text extraction only
4. Speed over completeness — flag unknowns, never block on them
5. Fail loud (explicit nulls) not smart (bad guesses)
6. One file, one responsibility
7. No `any` types
8. Surgical fixes only — never refactor working code while fixing something else
9. Always give Jim Cursor prompts for code changes, never raw code to edit manually
10. Cursor prompts must always be a single fenced code block — one tile, one copy button.
    Never split instructions and code across multiple blocks.
11. Always explain what we are doing and why in plain English before giving Cursor prompts
12. MittenIQ is for electrical contractors specifically — all domain decisions must reflect
    how an electrical estimator/subcontractor actually works in the field
13. Demo scope is always a first-class category — never bury it as a sub-discipline variant
14. 11×17 or larger = drawing page, always. Never classify as spec page.

## How To Use This File
Paste this file + V2_ARCHITECTURE.md at the start of each new Claude conversation.
Then say "here's where we left off" in one sentence.
Claude will have everything needed to pick up mid-stride.

Update this file at the end of every work session:
- Move completed items to "Built and Working"
- Update "Next Session Priorities"
- Add new known issues
- Add new decisions made