# MittenIQ V2 Architecture
Last Updated: 2026-04-16 (session 7 — drawing architecture, discipline classifier, V2 clean room decision)

## The Philosophy (Why V2 Exists)
V1 tried to be too smart. It built registries, reconciliation layers,
multi-layer AI passes, and confidence scoring systems. It took an hour
to process a file and still got things wrong. V2 starts over with a
simpler approach: do less, do it fast, be honest about what you don't know.

## V2 Clean Room Migration
The current repo carries V1 dead weight alongside working V2 code.
Decision: create a clean new repo. Port ~25-30 working V2 files. Leave V1 behind entirely.
The new repo IS MittenIQ V2. Old repo stays as archive.
See CLAUDE_CONTEXT.md for the full port/leave-behind file list.
First priority next session.

## The Three Layers

### Layer 1 — Upload
- User uploads PDF to Cloudflare R2
- Completes in ~1 second regardless of file size
- No processing at upload time
- V1 intake is disabled (MITTENIQ_V1_INTAKE_ENABLED=false)

### Layer 2 — Intake (V2)
Located in: lib/intake_v2/
- PDF health check: is it readable, searchable, or scanned?
- Page count and print sizes
- Rough page classification (drawing vs spec vs front-end)
- Simple line scorer for sheet numbers and titles
- TOC parser — section index with PDF page resolution
- Page dimension extraction — size and type classification per page
- No AI, no registry, no reconciliation
- Target: under 5 seconds

#### Document Type Detection (DESIGNED, NOT YET BUILT)
Three intake scenarios for drawing documents:

**Scenario 1 — Individual sheet PDFs**
One sheet per file. Sheet number embedded in filename.
Pattern: `SHEETNO---Description.pdf` or `SHEETNO.pdf`
Parse filename directly — highest confidence source, no PDF reading needed for classification.

**Scenario 2 — Single drawing set PDF**
All sheets combined. Parse cover page (G-001 or equivalent) for sheet index table.
Cover page reliably contains: discipline group headers + sheet number + sheet title.

**Scenario 3 — Combined spec+drawings PDF**
Specs and drawings in one file (Flook Dam / Spicer Group style — not uncommon).
Detection: scan page sizes. First page ≥ 11×17 = drawings start here.
Everything before = specs. Everything from that point = drawings.
Treat drawing section as Scenario 2.

#### Page Size Rules (deterministic, no exceptions)
- 8.5×11 → spec page
- 8.5×14 → spec page (legal size)
- **11×17 or larger → drawing page. Always. No exceptions.**
- Common Michigan drawing sizes: 34×22, 36×24, 30×42, 22×17
- 11×17 reduced drawings: image-only (raster), text extraction not available — honest null

#### Critical Fix — lib/intake/pdf-text-extraction.ts
`cleanText()` was collapsing ALL whitespace including newlines into a single space.
Fixed: `.replace(/[^\S\n]+/g, " ")` — collapses spaces/tabs only, preserves newlines.
This fix is in lib/intake/pdf-text-extraction.ts (shared by V1 and V2).

#### Page Dimension Extraction — BUILT, WORKING
pdfjs-dist extracts viewport dimensions for each page.
Each page: view array [x, y, w, h] in points ÷ 72 = inches, rounded to 1 decimal.
Stored as pageDimensions: { widthIn, heightIn } | null on IntakeV2PageTextInput.
pageSizes summary on IntakeV2RunResult: grouped by unique size, labeled, sorted by count desc.
Label rule: 8.5×11 or 11×8.5 → "Specifications". All other sizes → "Drawings".

#### TOC Parser — BUILT, TESTED, WORKING
Located in: lib/intake_v2/parse-toc.ts
Called from: lib/intake_v2/run-intake-v2.ts

Supports all real-world TOC formats found in Michigan construction docs.
Three-tier page resolution system. Performance: Fishbeck 946pp = 154 entries, 153 resolved, 18ms.
MDOT proposals: 0 entries (correct — no TOC in MDOT format).

#### Intake Report UI — BUILT, WORKING
Three sub-sections: File Health, Page Summary, Specification Section Index.
CSI Division names map includes Divisions 0, 1-28, 31, 32, 33, 40, 43, 44, 46.
buildIntakeV2ClientPayload() normalizes both cached and fresh API data identically.

#### Inline PDF Viewer — BUILT, WORKING
pdfjs-dist only. Default zoom: fit-to-height (700px target).
Zoom controls: + / − buttons, 0.25 step, min 0.5x max 3.0x, percentage readout.
Prev/Next navigation, page counter, Close button.

### Layer 3 — Agents
Located in: lib/agents/
Each agent is a focused tool that does one job well.
Agents are stateless — one document in, one result out.
AI handles exceptions, not the primary path.
Human review is a feature, not a failure.

#### Pre-Bid Checklist Agent (BUILT, TESTED, PRODUCTION-READY)
Located in: lib/agents/pre-bid-checklist/
Purpose: Extract all critical bid requirements from spec book front-end documents.
Tested against 9 real Michigan spec books. All known false positive issues resolved.
Progressive scan, dynamic char limits, deterministic post-processing, auto-save/load.

#### Drawing Sheet Index Parser (PLANNED — NEXT DRAWING FEATURE)
Located in: lib/agents/drawing-index/ (not yet created)
Purpose: Parse the sheet index from a drawing set cover page.
Input: Cover page text (from TOC parser or direct extraction).
Output: Structured sheet list with discipline, sheet number, title, PDF page number.
Approach: Deterministic pattern matching — no AI needed.

Supported cover page formats (confirmed from real Michigan drawing sets):
- F&V style: `SHEET TITLE | SHEET NO.` table — one entry per line, clean
- Fishbeck style: discipline group header + `SHEETNO TITLE` per line
- C2AE style: two-column layout, discipline group headers + entries
- GEI dam style: `SHT No | SUBSET | DWG No | SHEET TITLE` four-column table
- Wade Trim / sequential: plain integers, title carries discipline signal

#### Drawing Discipline Classifier (PLANNED)
Located in: lib/agents/drawing-index/ (alongside sheet index parser)
Purpose: Assign discipline family and sub-discipline to each sheet.
Two-step: prefix lookup → title keyword confirmation for ambiguous cases.

**Full prefix table and disambiguation rules: see CLAUDE_CONTEXT.md**

Key rules:
- D as second letter (ED, CD, MD, etc.) = ALWAYS demolition
- D as first of two-letter (DA, DC, DE, etc.) = ALWAYS demolition
- Single D = check title — Process if "flow/hydraulic/P&ID", Demo if "demolition/removal"
- I = Instrumentation in water/wastewater context, Interiors in building context
- 11×17 or larger = drawing, always

Demo sheets MUST be hard-tagged as first-class category regardless of prefix convention.
Title keyword safety net: scan all sheet titles for "demo"/"demolition"/"removal".

Sheet top-level tags (multi-valued):
- New Work, Demo, Reference, General, Process/Diagram

#### Division 26 Scope Review Agent (PLANNED — NEXT MAJOR FEATURE)
Located in: lib/agents/division-26-scope-review/ (not yet created)
Purpose: Read Division 26 electrical spec sections, extract everything affecting bid price.
Uses TOC parser output to navigate directly to Division 26 sections.

Planned features:
- Warranty extraction by spec section — flag >1 year with dollar impact warning
- Scope items and inclusions
- Exclusions and furnished-by-owner equipment
- Special testing and commissioning requirements
- RFQ language generation

#### Airport Electrical Agent (PLANNED — ROADMAP)
Located in: lib/agents/airport-electrical/ (not yet created)
Trigger: FAA L-series pay items detected in TOC/bid schedule.
Purpose: Parse L-series pay items from airport bid schedule, pre-populate takeoff template.
Similar concept to MDOT Electrical Agent but for FAA work.
L-series scope: L-105 (demo), L-108 (cable), L-109 (vault), L-110 (conduit),
L-115 (handholes), L-125 (fixtures), L-126 (maintenance), L-153 (sensors).
Note: Airport plans often 11×17 image-only — text extraction not available for drawings.

#### MDOT Electrical Agent (PLANNED — ROADMAP)
Located in: lib/agents/mdot-electrical/ (not yet created)
Trigger: Zero Division 26 TOC entries + MDOT 2020 governing phrase detected.
Purpose: Parse Schedule of Items pay items, cross-reference MDOT 2020 Standard Specs.

## Project Type Detection
| Signal | Project Type | Pipeline |
|--------|-------------|----------|
| CSI Division 26/27/28 in TOC | Water/Wastewater/Building | Standard V2 |
| FAA L-series items (L-105, L-108, L-125) in TOC/bid schedule | Airport | Airport agent (future) |
| MDOT 2020 Standard Specs reference + zero Div 26 TOC | MDOT highway | MDOT agent (future) |
| Dam terminology + multi-site prefix convention | Dam/hydraulic | Dam pipeline (future) |

## Drawing Set Upload Scenarios
Three scenarios MittenIQ must handle:

**1. Individual sheet PDFs (e.g., Farwell WWTP — F&V)**
- 45 separate PDFs, one sheet each
- Filenames: `E-101---Proposed_Electrical_Site_Plan.pdf`
- Sheet number and title fully available from filename
- Upload UX: batch/multi-file upload needed (design pending)
- Classification: filename parse only — no PDF reading required

**2. Single drawing set PDF (e.g., Owosso WTP — Fishbeck)**
- All sheets combined in one PDF
- Cover page has sheet index
- Classification: cover page parse + page size confirmation

**3. Combined spec+drawings PDF (e.g., Flook Dam — Spicer Group)**
- Specs (8.5×11) followed by drawings (≥11×17) in one file
- Split at first page ≥ 11×17
- Spec section processed by existing V2 intake
- Drawing section processed by drawing index parser

## Engineer/Firm Conventions (Michigan — confirmed from real drawing sets)
| Firm | Prefix Style | Demo Convention | Notes |
|------|-------------|-----------------|-------|
| Fishbeck | No hyphen (E101) | DA, DC, DE, DM, DP, DS | Large municipal W/WW |
| F&V | Hyphenated (E-101) | ED, CD | GE for electrical legend |
| C2AE | Hyphenated (E-001) | ED, PD, MD | Sub-disciplines: EC, EI |
| Wade Trim | Sequential integers | In title text | No letter prefix |
| GFA | C1.1/M1.1/E1.1 | In title text | Small projects |
| MDOT | Sequential + section | "Removal" in title | Road/lighting projects |
| GEI Consultants | Site-disc-num (ED-G-000) | TO-D-xxx = demo | Multi-dam projects |
| RS&H | FAA L-series | L-105 = demo | Airport, 11×17 image-only |
| Spicer Group | Sequential integers | Sheet title "Demolition" | Combined spec+drawings PDF |

## Production Infrastructure
- Production branch: main — auto-deploys on push
- Runtime DB: DATABASE_URL (Supabase pooler, port 6543) via PrismaPg in lib/prisma.ts
- Migrations DB: DIRECT_DATABASE_URL (Supabase direct) via prisma.config.ts — CLI only
- Vercel serverless cannot reach direct Supabase — pooler required at runtime
- R2 CORS: mitteniq.com + localhost:3000, all methods
- Supabase free tier: keep-alive GitHub Actions workflow — MUST be fixed in V2 clean room

## Key Architectural Rules
1. Agents are stateless — one document in, one result out
2. No document-wide intelligence in intake — that belongs in agents
3. Speed over completeness — null is better than a wrong answer
4. AI handles exceptions, not the primary path
5. Human review is a feature, not a failure
6. Fail loud (explicit nulls) not smart (bad guesses)
7. Keyword scan controls deep page access — never bulk-send full documents
8. Deterministic rules take precedence over AI interpretation where possible
9. Deterministic rules must match on specific governing phrases only
10. Demo scope is first-class — never a sub-discipline variant
11. 11×17 or larger = drawing page, no exceptions

## File Naming Convention
- lib/intake_v2/ — intake pipeline files
- lib/agents/[agent-name]/ — one folder per agent
  - types.ts, extract-[thing].ts, run-[agent-name].ts, save-[thing].ts
- app/api/agents/[agent-name]/route.ts — API endpoint (GET + POST)
- components/agents/[ComponentName].tsx — UI component

## What's Deferred
- Real-time streaming progress via SSE
- Background job architecture — scan abandoned if user leaves page
- Prime vs. sub role path — biddingAs field per project
- Vision API for scanned pages — text-only for now
- Bid form agent — low priority, far roadmap
- V2 scorer fixes — pure numeric sheet numbers and page stamp prefix issues
- TOC tertiary resolution — EJCDC running page header "Section XX XX XX" mixed case
- CWSRF boilerplate stamp resolution — malformed stamps not cleanly parseable
- Landing page separation from app — deferred, keep together for now
- Supabase Pro upgrade — deferred until paying customers
- Airport electrical agent — post-Division 26
- MDOT Electrical Agent — post-Division 26
- Dam/hydraulic project pipeline — roadmap
- Multi-file / batch upload UX — needed for individual sheet PDF scenario