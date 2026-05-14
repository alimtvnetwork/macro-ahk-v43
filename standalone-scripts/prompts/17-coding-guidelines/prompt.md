# Coding Guidelines

> **Purpose:** Read and synthesize existing repository context from the Lovable memory folder and the full specification set, then produce a reliability risk report before any implementation work begins. Do not implement anything. Only produce a report and specification-side artifacts for memory, suggestions, and planning.

---

## Goals

1. Reconstruct project requirements by reading:
   1. the `.lovable` memory content
   2. the existing spec files and idea files across all projects
2. Produce a detailed risk and failure-chance report for handing the current specs to another AI.
3. Establish a disciplined workflow for Lovable suggestions tracking and future planning so another AI can continue work reliably.

---

## Inputs to read

1. `.lovable/`
   1. `memories/`
   2. `memory/`
   3. `memory/suggestions/`
   4. any other Lovable state folders present
   5. What to do and what not to do — remember.
   6. Do NOT touch any `skipped/` folder.
2. Spec folder content for all projects:
   1. ideas
   2. backend and frontend specs
   3. specs
   4. instruction builder specs
   5. seeding and configuration specs
   6. data model specs
   7. acceptance criteria specs
   8. Read root `spec/` folder or get a general idea of files.

---

## Deliverable 1 — Reliability and Failure-Chance Report

1. **Success probability estimates**
   - by module complexity tier (simple, medium, complex agentic workflows, end-to-end)
   - explicit assumptions behind each estimate
2. **Failure map**
   - where failures are likely (module and workflow)
   - why failures occur (missing constraints, ambiguity, cross-file inconsistency)
   - how failures would manifest (symptoms)
3. **Corrective actions**
   - prioritized list of spec fixes to reduce failure chance
   - for each fix: what to change, where to change it, and the expected reliability gain
4. **Readiness decision**
   - whether the spec set is ready for implementation
   - what must be fixed before starting implementation

---

## Deliverable 2 — Lovable Suggestions Workflow (filesystem contract)

1. **Location** — Write each suggestion into `.lovable/memory/suggestions` as an individual file.
2. **File naming** — `YYYYMMDD-HHMMSS-suggestion-<slug>.md`
3. **Suggestion file content**
   - suggestionId
   - createdAt
   - source (Lovable)
   - affectedProject
   - description
   - rationale
   - proposed change
   - acceptance criteria
   - status (open, inProgress, done)
   - completion notes
4. **Completion handling** — When a suggestion is completed, update status to `done`. Optionally archive or remove per policy.

---

## Deliverable 3 — `plan.md` Future Work Roadmap

Create a `plan.md` at the repository root that captures future work for hand-off to another AI model.

Requirements:
1. A prioritized backlog of tasks
2. Grouping by phase and by project
3. For each task:
   1. objective
   2. dependencies
   3. expected outputs (spec file updates, UI changes, API changes)
   4. acceptance criteria
4. A section titled **Next task selection** where the next implementable items are listed so the user can pick what to implement next.

---

## Interaction rule

After producing the report and creating the memory and plan artifacts, ask the user which specific task to implement next, since the specs should define what to build.

---

*Prompt v1.0. Trigger phrase: "coding guidelines".*
