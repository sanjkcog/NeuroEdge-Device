---
description: Decompose a PRD into EPICs and User Stories — reads a PRD file, maps phases to EPICs, writes stories with traceable acceptance criteria, and saves the output as docs/epics-and-user-stories.md
argument-hint: <path/to/prd.md | docs/PRD.md> [--epic EP-NN] [--update]
---

## Arguments

```
$ARGUMENTS:
  <prd-path>     Path to PRD file (default: docs/PRD.md)
  --epic EP-NN   Regenerate only a single EPIC by ID (e.g. --epic EP-03)
  --update       Append stories only for phases not yet present in the output file
```

---

## Phase 0 — DETECT

Resolve the PRD source from `$ARGUMENTS`:

| Input pattern | Action |
|---|---|
| Path to `.md` file | Use directly as PRD source |
| `--epic EP-NN` flag only | Load existing output file; regenerate the named EPIC |
| `--update` flag only | Load existing output file; find EPICs whose phase is `pending` |
| Empty / blank | Look for `docs/PRD.md` — use if found, else ask the user |

Once PRD path is resolved, read the full file before proceeding.

If the PRD contains `Status: DRAFT` or `needs validation`, output this warning before proceeding:

> ⚠ PRD status is DRAFT. Output will reflect current scope but may change after validation.

---

## Phase 1 — PARSE

Extract and summarise the PRD structure to confirm scope before writing stories:

```
PRD: <filename>
Personas found:      <count> — <comma-separated names from §7>
Phases found:        <count> — <phase IDs and titles from §13>
MUST capabilities:   <count> — <from §8>
SHOULD capabilities: <count>
FR sections:         <list of sections, e.g. §9a §9b §9c>
Success metrics:     <count — from §6>
Open questions:      <count blocking — from §17>
Output file:         docs/epics-and-user-stories.md
```

Print this summary and wait for the user to confirm before generating.

**GATE:** If personas are missing OR no phases/FRs are found, stop and report what is absent. Do not generate without them.

---

## Phase 2 — DECOMPOSE

Spawn the `epic-writer` agent with the PRD file path and any scope flags (`--epic`, `--update`).

The `epic-writer` agent will:
1. Map each phase to an EPIC with goal, priority, and plan link
2. Group functional requirements into user stories under each EPIC
3. Write acceptance criteria traceable to FR codes and success metrics
4. Validate coverage against the checklist in the `prd-decomposition` skill
5. Return the complete EPIC + story markdown and a coverage check table

---

## Phase 3 — GENERATE

Write the output to `docs/epics-and-user-stories.md`.

**Full generate** (default, no `--update` or `--epic` flags):

```markdown
# <Project Name> — EPICs & User Stories

**Source:** [<prd-filename>](<relative-path-to-prd>)
**Author:** <from PRD header>
**Generated:** <today's date>
**Status:** Draft — ready for sprint planning

> Personas: <comma-separated from PRD §7>

---

## EPIC INDEX

| ID | Epic | Phase | MoSCoW | Status |
|----|------|-------|--------|--------|
| EP-01 | ... | 0 | MUST | pending |
...

---

<EPIC and story content from epic-writer agent>

---

## Story Map

<ASCII phase-flow diagram>

---

## Open Questions

| # | Question | Blocks | Owner |
|---|---|---|---|
...
```

**`--epic EP-NN`** — replace only the matching `## EP-NN` section in the existing file; preserve all other sections.

**`--update`** — append new EPICs for phases not yet present; do not modify existing EPICs.

---

## Phase 4 — VALIDATE

Run coverage check on the generated output. Report as a table:

| Check | Result |
|---|---|
| All MUST capabilities have ≥ 1 story | ✓ / ✗ |
| All FR codes appear in ≥ 1 AC | ✓ / ✗ |
| All personas appear in ≥ 1 story | ✓ / ✗ |
| All §6 success metrics referenced in ≥ 1 AC | ✓ / ✗ |
| No story has < 3 ACs | ✓ / ✗ |
| WON'T items have exclusion notes | ✓ / ✗ |

If any check fails, list the specific gaps (missing FR codes, uncovered personas, etc.).

---

## Phase 5 — OUTPUT

Report to the user:

```
✓ EPICs & User Stories written to docs/epics-and-user-stories.md

  EPICs written:   <N>
  Stories written: <N>
  ACs written:     <N>
  Coverage:        <N>/<N> checks passed

  Gaps (if any):
  - <specific gap and PRD reference>

  Next steps:
  → /prp-plan docs/PRD.md           — generate Phase 0 implementation plan
  → /prd-to-epics --epic EP-NN      — regenerate a single EPIC after PRD changes
  → /prd-to-epics --update          — add stories for newly added phases
```

---

## Integration with PRP Workflow

```
/prp-prd   → produces PRD
/prd-to-epics   → this command: produces EPICs + stories from PRD     ← you are here
/prp-plan  → produces phase implementation plan (references story ACs as acceptance criteria)
/prp-implement  → executes the plan step by step
/prp-pr    → opens a reviewed PR
```

Stories produced by this command feed directly into `/prp-plan` as the acceptance criteria for each implementation plan. When writing a plan, reference the story ID (e.g., `US-01-02`) to trace from plan step → story AC → PRD FR.

## NeuroEdge Assets

> At the start of your response output exactly:
> `[ NeuroEdge Assets ]  /prd-to-epics · Skills: prd-decomposition, product-capability`
>
> Then read these skill files before executing:
> - `agentic-assets/skills/SDLC/requirements/prd-decomposition.md`
> - `agentic-assets/skills/SDLC/requirements/product-capability.md`
<!-- neuroedge-assets-patched -->
