# MittenIQ V2 Architecture

## Philosophy (Why V2 Exists)
V1 tried to be too smart. It built registries, reconciliation layers, multi-layer AI passes, and confidence scoring systems. It took an hour to process a file and still got things wrong. V2 starts over with a simpler approach: do less, do it fast, be honest about what you don't know.

## Core Architectural Decisions
1. **V1 is gone.** The clean room migration is complete. V2 is the only codebase.
2. **V2 philosophy:** deterministic scorer first, AI only for fallback, fail loud not smart.
3. **Speed is critical.** Target: under 90 seconds even for 900+ page documents.
4. **No registry systems**, no reconciliation layers, no multi-layer confidence scoring.
5. **AI tier = text-based** for digital PDFs. Vision only for scanned pages, async, never blocking.
6. **Pre-bid checklist agent** uses progressive scan — starts at 60 pages, doubles each pass.
7. **Active intake page is** `app/projects/[projectId]/intake/` — not `app/intake/`.
8. **Warranty requirements** belong in Division 26 scope review agent, not pre-bid checklist.
9. **MittenIQ is built specifically for electrical contractors** — domain knowledge baked in.
10. **Deterministic fallbacks** for ambiguous fields: `preBidMandatory` defaults true if `preBidHeld=true` and no mandatory language found. "Encouraged" always means discretionary.
11. **Special insurance** only triggers for non-standard coverages.
12. **DBE only triggers** when explicit participation goals or GFE documentation required.
13. **MDOT 2020 Standard Specs reference** triggers `buyAmerican=true` (FHWA Buy America by reference).
14. **`breakDownsRequired=true`** when bid form requires pricing broken into separate named divisions.
15. **TOC parser is deterministic** — no AI. Null for unresolved pages, never guesses.
16. **MDOT proposals have no TOC** — TOC parser correctly returns zero entries.
17. **Runtime DB:** `DATABASE_URL` (pooler, port 6543). **Migrations:** `DIRECT_DATABASE_URL` only.
18. **V2 intake result** cached in `Upload.intakeReport.v2`. On return visits loads instantly.
19. **`buyAmerican` AI prompt** explicitly excludes NSPE/ACEC/ASCE/EJCDC org-name false positives.
20. **Demo scope** is a first-class takeoff category — estimators take demo off as its own line item.
21. **Page size rule:** 11×17 or larger = drawing page, always, no exceptions. 8.5×11 and 8.5×14 = spec pages.
22. **Airport projects** use FAA L-series spec structure, not CSI divisions. Bid schedule pre-populates quantities.
23. **Combined spec+drawings PDF:** first page ≥ 11×17 marks where drawing section starts. Everything before = specs. Deterministic split, no text scanning needed.
24. **`/api/uploads/analyze` is a status-flipper only.** It marks `intakeStatus: READY` after a successful upload. It does NOT run analysis. V2 intake runs lazily via `/api/intake-v2/test` when the user opens the Intake page. Adding analysis work to the analyze route would resurrect V1's eager-processing pattern.

## The Three Layers

### Layer 1 — Upload
- User uploads PDF to Cloudflare R2
- Completes in ~1 second regardless of file size
- No processing at upload time

### Layer 2 — Intake (V2)
Located in `lib/intake_v2/`.
- PDF health check: readable, searchable, or scanned
- Page count and print sizes
- Rough page classification (drawing vs spec vs front-end)
- Simple line scorer for sheet numbers and titles
- TOC parser — section index with PDF page resolution
- Page dimension extraction — size and type classification per page
- No AI, no registry, no reconciliation
- Target: under 5 seconds

### Layer 3 — Agents
Located in `lib/agents/`.
- Each agent is a focused tool that does one job well
- Agents are stateless — one document in, one result out
- AI handles exceptions, not the primary path
- Human review is a feature, not a failure

## Document Type Detection — Drawings

### Three Intake Scenarios
1. **Individual sheet PDFs** — one sheet per file, sheet number in filename. Highest confidence. Parse filename directly: `SHEETNO---Description.pdf` or `SHEETNO.pdf`.
2. **Single drawing set PDF** — all sheets in one PDF. Parse cover page sheet index table.
3. **Combined spec+drawings PDF** — specs + drawings in one file. Split at first page ≥ 11×17.

### Page Size Rules (Deterministic, No Exceptions)
- 8.5×11 → spec page
- 8.5×14 → spec page (legal)
- 11×17 or larger → drawing page (always)
- Common drawing sizes seen in Michigan: 34×22, 36×24, 30×42, 22×17
- 11×17 reduced drawings: image-only pages, text extraction not available — honest null

## Drawing Discipline Classifier

Two-step process:
1. Extract prefix (one or two letters before the sheet number)
2. Look up discipline family from prefix table
3. For ambiguous prefixes: run title keyword confirmation scan

### Primary Single-Letter Prefixes (US National CAD Standard)
| Prefix | Discipline Family |
|--------|------------------|
| G | General (cover, index, legends, notes) |
| H | Hazardous Materials |
| V | Survey / Mapping |
| B | Geotechnical |
| C | Civil |
| L | Landscape (building) / Airfield Lighting (airport — FAA L-series) |
| S | Structural |
| A | Architectural |
| I | **AMBIGUOUS** — Instrumentation OR Interiors |
| Q | Equipment |
| F | Fire Protection (or Facility — check title) |
| P | Plumbing |
| D | **AMBIGUOUS** — Process OR Demolition |
| M | Mechanical |
| E | Electrical |
| W | Distributed Energy |
| T | Telecommunications |
| R | Reference / Record / As-Built |
| X | Other |
| Z | Contractor / Shop Drawings |
| O | Operations |

### Two-Letter Prefixes
| Prefix | Meaning | Notes |
|--------|---------|-------|
| GE | General Electrical (legend/notes) | F&V firm convention |
| AD, CD, SD | Architectural/Civil/Structural Demolition | NCS standard |
| ED | Electrical Demolition | F&V firm convention |
| MD, PD | Mechanical/Process Demolition | C2AE, Fishbeck |
| DA, DC, DE, DM, DP, DS | Various Demolition (alt) | Fishbeck convention |
| EP, EL | Electrical Power, Electrical Lighting | NCS standard |
| EC, EI | Electrical Controls, Instrumentation | C2AE convention |
| FA, FP | Fire Alarm, Fire Protection/Sprinkler | NCS standard |
| MP, MH | Mechanical Plumbing/HVAC Piping, Mechanical HVAC | NCS standard |
| CW, SG | Control of Water, Site/Grading/Survey | Dam projects (GEI) |
| TN, TT | Telecom Network, Telephone | NCS standard |
| RA | Architectural Record | NCS standard |

### Multi-Site Prefix Convention (Dam / Multi-Structure Projects)
Format: `[SITE]-[DISCIPLINE]-[NUMBER]`
Example from Edenville Dam (GEI Consultants): ED- = Edenville Dam, TO- = Tobacco Dam spillway, TW- = Tittabawassee Dam, AS- = Auxiliary Spillway. Discipline code follows the site prefix using standard conventions.

### Ambiguous Prefix Disambiguation
| Prefix | Default | Instrumentation/Process signals | Alternate signals |
|--------|---------|--------------------------------|-------------------|
| I | Instrumentation | D sheets present, water/wastewater project, title has "I&C"/"SCADA"/"loop"/"control" | A sheets present, building project, title has "finish"/"interior"/"ceiling" |
| D (single) | Process | Title has "flow"/"hydraulic"/"P&ID"/"schematic" | Title has "demolition"/"demo"/"removal"/"existing conditions" |
| F | Fire Protection | Title has "sprinkler"/"suppression"/"alarm" | Title has "facility"/"site" |
| R | Reference/Record | Title has "record"/"as-built"/"existing" | Title has "renovation" |

**Critical D rule:**
- D as second letter (ED, CD, SD, MD, PD) = ALWAYS demolition of that discipline
- D as first letter of two-letter (DA, DC, DE, DM, DP, DS) = ALWAYS demolition
- Single D = check title — never guess. Flag for review if ambiguous.

### Sheet Top-Level Tags (Multi-Valued)
Every sheet gets one or more of:
- **New Work** — proposed construction
- **Demo** — removal, demolition, abandonment (CRITICAL — own takeoff line item)
- **Reference** — record/as-built drawings included for information only
- **General** — cover, legend, notes, symbols
- **Process/Diagram** — P&IDs, flow diagrams, hydraulic profiles

A sheet can carry multiple tags. Title keyword scan is the safety net — scan all sheet titles for "demo"/"demolition"/"removal" regardless of prefix convention.

### Discipline Family Groupings (For Vendor Package Assembly)
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

### Electrical Sub Default Vendor Package
E family + D family (process, for scope context) + relevant C sheets (site plan) + G sheets (legend). Estimator can add or remove disciplines from the package.

## Engineer/Firm Conventions Observed (Michigan)
| Firm | Prefix Style | Demo Convention | Notes |
|------|-------------|-----------------|-------|
| Fishbeck | No hyphen (E101) | DA, DC, DE, DM, DP, DS | Large municipal W/WW |
| F&V | Hyphenated (E-101) | ED, CD | GE for electrical legend |
| C2AE | Hyphenated (E-001) | ED, PD, MD | Sub-disciplines: EC, EI |
| Wade Trim | Sequential integers | In title text | No letter prefix |
| GFA | C1.1 / M1.1 / E1.1 | In title text | Small projects |
| MDOT | Sequential + section | "Removal" in title | Road/lighting projects |
| GEI Consultants | Site-disc-num (ED-G-000) | TO-D-xxx = demo | Multi-dam projects |
| RS&H | FAA L-series | L-105 = demo | Airport, 11×17 image-only |
| Spicer Group | Sequential integers | Sheet title "Demolition" | Combined spec+drawings PDF |

## Project Type Detection
| Signal | Project Type | Pipeline |
|--------|-------------|----------|
| CSI Division 26/27/28 in TOC | Water/Wastewater/Building | Standard V2 |
| FAA L-series items (L-105, L-108, L-125) in TOC/bid schedule | Airport | Airport agent (future) |
| MDOT 2020 Standard Specs reference + zero Div 26 TOC | MDOT highway | MDOT agent (future) |
| Dam terminology + multi-site prefix convention | Dam/hydraulic | Dam pipeline (future) |

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
- `lib/intake_v2/` — intake pipeline files
- `lib/agents/[agent-name]/` — one folder per agent
  - `types.ts`, `extract-[thing].ts`, `run-[agent-name].ts`, `save-[thing].ts`
- `app/api/agents/[agent-name]/route.ts` — API endpoint (GET + POST)
- `components/agents/[ComponentName].tsx` — UI component

## Roadmap (Far-Future)
These items are deliberately deferred. Not next session, not next month — but on the radar.

- **Airport Electrical Agent** — FAA L-series pay item parser (post-Division 26 scope review)
- **MDOT Electrical Agent** — Schedule of Items pay items parser, cross-references MDOT 2020 Standard Specs
- **Dam/Hydraulic project pipeline** — handles multi-site prefix convention and CW/SG disciplines
- **Drawing sheet index parser** — cover page parser for single drawing set PDFs
- **Drawing discipline classifier implementation** — the architecture in this doc, built into code
- **Background job architecture** — so scans don't get abandoned when user leaves page mid-run
- **Real-time streaming progress via SSE** — replace the "all messages appear at end" UX
- **Prime vs sub role path** — `biddingAs` field per project, different pre-bid extraction logic
- **Multi-file / batch upload UX** — needed for individual sheet PDF scenario
- **Bid form agent** — low priority, far roadmap
- **Vision API for scanned pages** — text-only for now
- **TOC tertiary resolution** — EJCDC running page header "Section XX XX XX" mixed-case format
- **CWSRF boilerplate stamp resolution** — malformed stamps not cleanly parseable