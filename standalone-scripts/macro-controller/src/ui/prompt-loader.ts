/**
 * Prompt Loader — Loading, caching, config resolution, extension messaging
 *
 * Phase 5D split from ui/prompt-manager.ts.
 * See: spec/04-macro-controller/ts-migration-v2/05-module-splitting.md
 */

import { log, logSub } from '../logging';
import type { ExtensionResponse, PromptEntry, ResolvedPromptsConfig } from '../types';
import type { CachedPromptEntry } from './prompt-cache';
import {
  clearPromptCache,
  clearUISnapshot,
  readPromptCache,
  writePromptCache,
  writeHtmlCopy,
} from './prompt-cache';
import type { TaskNextDeps } from './task-next-ui';
import { normalizePromptEntries } from './prompt-utils';
import { logError } from '../error-utils';
import { showToast } from '../toast';
import { DEFAULT_PASTE_XPATH } from '../constants';
/** Editable prompt — a PromptEntry with an optional DB id. */
export interface EditablePrompt extends PromptEntry {
  id?: string;
}

/** Context type for DOM refs from createUI() */
export interface PromptContext {
  promptsDropdown: HTMLElement;
}

// ============================================
// Fallback prompts
// ============================================
export const DEFAULT_PROMPTS: PromptEntry[] = [
  { name: 'Start Prompt', text: 'Begin session with repository context scan and memory synthesis, then produce a reliability risk report before implementation.', slug: 'start-prompt', id: 'default-start' },
  { name: 'Rejog the Memory v1', text: "# Rejog the Memory v1\n\n> **Purpose:** Read and synthesize existing repository context from the Lovable memory folder and the full specification set, then produce a reliability risk report before any implementation work begins. Do not implement anything. Only produce a report and specification-side artifacts for memory, suggestions, and planning.\n\n---\n\n## Goals\n\n1. Reconstruct project requirements by reading:\n   1. the `.lovable` memory content\n   2. the existing spec files and idea files across all projects\n2. Produce a detailed risk and failure-chance report for handing the current specs to another AI.\n3. Establish a disciplined workflow for Lovable suggestions tracking and future planning so another AI can continue work reliably.\n\n---\n\n## Inputs to read\n\n1. `.lovable/`\n   1. `memories/`\n   2. `memory/`\n   3. `memory/suggestions/`\n   4. any other Lovable state folders present\n   5. What to do and what NOT to do \u2014 remember.\n   6. Do NOT touch any `skipped/` folder.\n2. Spec folder content for all projects:\n   1. ideas\n   2. backend and frontend specs\n   3. specs\n   4. instruction builder specs\n   5. seeding and configuration specs\n   6. data model specs\n   7. acceptance criteria specs\n   8. Read root `spec/` folder or get a general idea of files.\n\n---\n\n## Deliverable 1 \u2014 Reliability and Failure-Chance Report\n\n1. **Success probability estimates**\n   - by module complexity tier (simple, medium, complex agentic workflows, end-to-end)\n   - explicit assumptions behind each estimate\n2. **Failure map**\n   - where failures are likely (module and workflow)\n   - why failures occur (missing constraints, ambiguity, cross-file inconsistency)\n   - how failures would manifest (symptoms)\n3. **Corrective actions**\n   - prioritized list of spec fixes to reduce failure chance\n   - for each fix: what to change, where to change it, expected reliability gain\n4. **Readiness decision**\n   - whether the spec set is ready for implementation\n   - what must be fixed before starting implementation\n\n---\n\n## Deliverable 2 \u2014 Lovable Suggestions Workflow (filesystem contract)\n\n1. **Location** \u2014 Write each suggestion into `.lovable/memory/suggestions` as an individual file.\n2. **File naming** \u2014 `YYYYMMDD-HHMMSS-suggestion-<slug>.md`\n3. **Suggestion file content**\n   - suggestionId\n   - createdAt\n   - source (Lovable)\n   - affectedProject\n   - description\n   - rationale\n   - proposed change\n   - acceptance criteria\n   - status (open, inProgress, done)\n   - completion notes\n4. **Completion handling** \u2014 When a suggestion is completed, update status to `done`. Optionally archive completed items, or remove them if policy is to keep the folder for active items only.\n\n---\n\n## Deliverable 3 \u2014 `plan.md` Future Work Roadmap\n\nCreate a `plan.md` at the repository root that captures future work for hand-off to another AI model.\n\nRequirements:\n1. A prioritized backlog of tasks\n2. Grouping by phase and by project\n3. For each task:\n   1. objective\n   2. dependencies\n   3. expected outputs (spec file updates, UI changes, API changes)\n   4. acceptance criteria\n4. A section titled **Next task selection** where the next implementable items are listed so the user can pick what to implement next.\n\n---\n\n## Interaction rule\n\nAfter producing the report and creating the memory and plan artifacts, ask the user which specific task to implement next, since the specs should define what to build.\n\n---\n\n*Prompt v2.0. Trigger phrase: \"rejog the memory\".*\n", slug: 'rejog-the-memory-v1', id: 'default-rejog', category: 'onboarding' },
  { name: 'Unified AI Prompt v4', text: 'Read and synthesize existing repository context from the memory folder and the full specification set. Follow the Required Execution Order: 1) Scan repo tree, 2) Read memory folders, 3) Read workflow tracker, 4) Read specs, 5) Reconstruct context, 6) Produce reliability report, 7) Propose corrections, 8) Update memory, 9) Update plan, 10) Ask user which task to implement next.', slug: 'unified-ai-prompt-v4', id: 'default-unified' },
  { name: 'Issues Tracking', text: 'Update spec properly so that the mistake doesn\'t appear and update memory and also write the details how you fixed it. Create issue file at /spec/02-app/issues/{seq}-{issueSlugName}.md with: Issue summary, Root cause analysis, Fix description, Iterations history, Prevention and non-regression, TODO and follow-ups, Done checklist.', slug: 'issues-tracking', id: 'default-issues' },
  { name: 'Unit Test Failing', text: 'Fix failing tests: 1) Check code, 2) Check actual method implementation, 3) Check logical implementation of the test, 4) Check test case, 5) Fix logically either the implementation or the test. Document at /spec/05-failing-tests/{seq}-failing-test-name.md with root cause and solution.', slug: 'unit-test-failing', id: 'default-test' },
  { name: 'Audit Spec v1', text: 'Audit the current specification set against the implemented codebase. For each spec:\n\n1. Check if the spec accurately reflects the current implementation\n2. Identify any drift between spec and code\n3. Flag missing specs for implemented features\n4. Flag specs for features not yet implemented\n5. Score each spec on a 6-dimension rubric:\n   - Completeness (25%): Are all requirements documented?\n   - Consistency (25%): Do specs agree with each other?\n   - Alignment (20%): Does the spec match the code?\n   - Clarity (15%): Is the spec unambiguous?\n   - Maintainability (10%): Is the spec easy to update?\n   - Test Coverage (5%): Are acceptance criteria testable?\n\nOutput a report to `.lovable/memory/audit/` with severity and impact scores for each finding. Propose corrections for any inconsistencies found.', slug: 'audit-spec-v1', id: 'default-audit-spec', category: 'general' },
  { name: 'Minor Bump', text: "Bump all Minor versions for all.\n\nAlso pin the new version to the root readme.", category: 'versioning', slug: 'minor-bump', id: 'default-minor-bump' },
  { name: 'Major Bump', text: "Bump all Major versions for all.\n\nAlso pin the new version to the root readme.", category: 'versioning', slug: 'major-bump', id: 'default-major-bump' },
  { name: 'Patch Bump', text: 'Bump all Patch versions for all', category: 'versioning', slug: 'patch-bump', id: 'default-patch-bump' },
  { name: 'Code Coverage Basic', text: 'Based on low-coverage packages (>1000 lines), plan 200-line segments for coverage tests. Cover branches, logical segments. Follow AAA format, naming conventions, Should Be methods.', category: 'code-coverage', slug: 'code-coverage-basic', id: 'default-code-coverage-basic' },
  { name: 'Code Coverage Details', text: 'Plan 200-line segments for low-coverage packages. Follow AAA format, naming conventions. Identify packages >1000 lines, segment into 200-line chunks, cover branches and logical flows.', category: 'code-coverage', slug: 'code-coverage-details', id: 'default-code-coverage-details' },
  { name: 'Next Tasks', text: 'Next,\n\nList out the remaining tasks always, if you finish then in future `next` command, find any remaining tasks from memory and suggest', category: 'automation', slug: 'next-tasks', id: 'default-next-tasks' },
  { name: 'Unit Test Issues V2 Enhanced', text: 'Based on the packages that have low coverage, if a package has more than 1000 lines, then for that specific package we should split it into segments of 200 lines per task.\n\nYou should create a plan where each 200-line segment is treated as one task. Each task should focus on writing meaningful test coverage, including:\n- Branch coverage\n- Logical segment coverage\n- Edge cases\n\nFirst, create a detailed plan outlining:\n- Which packages will be handled\n- How many segments each package will be split into\n- The step-by-step execution plan\n\nEach time I say "next", you should proceed with the next package or segment and work towards achieving 100% code coverage.\n\nYou do not need to ask which package to prioritize. Choose based on logical ordering.\n\nEnsure that tests are written in a way that they are buildable in Go. Even if you cannot run them, ensure correctness through reasoning.\n\nFollow existing test patterns from the testing guideline spec folder.\n\nTesting requirements:\n- Follow AAA pattern (Arrange, Act, Assert)\n- Follow naming conventions (use "Should" style naming)\n- Maintain consistency with existing tests\n\nIf you have any questions or confusion, feel free to ask.\n\nYour task now is to create a detailed execution plan.', category: 'code-coverage', slug: 'unit-test-issues-v2-enhanced', id: 'default-unit-test-issues-v2-enhanced' },
  { name: "Read Memory", text: "# Read Memory\n\n> **Purpose:** Mandatory onboarding sequence for any AI assistant joining this project. Internalize all specifications, rules, and conventions before writing a single line of code.\n\n> **Rule #0:** Follow every phase sequentially. Do not skip, summarize prematurely, or assume knowledge from training data. The specs are the single source of truth.\n\n---\n\n## Phase 1 — AI Context Layer\n\nRead these files in EXACT order:\n\n1. `.lovable/overview.md` — project summary, tech stack, navigation map\n2. `.lovable/strictly-avoid.md` — hard prohibitions (violating any = critical failure)\n3. `.lovable/user-preferences` — how the human expects you to communicate\n4. `.lovable/memory/index.md` — index of all institutional knowledge files\n5. `.lovable/plan.md` — current active roadmap and priorities\n6. `.lovable/suggestions.md` — pending improvement ideas\n\nThen read EVERY file referenced in `.lovable/memory/index.md` (recursively). If a file is missing or empty, note it — do not silently skip.\n\nSelf-check: CODE RED rules? Naming conventions? Error handling philosophy? Active plan? Strictly forbidden patterns?\n\n⛔ DO NOT proceed to Phase 2 until every file above has been read.\n\n---\n\n## Phase 2 — Consolidated Guidelines\n\nRead `spec/17-consolidated-guidelines/` in numeric order. Each file is self-contained.\n\n⛔ DO NOT proceed to Phase 3 until all files have been read.\n\n---\n\n## Phase 3 — Spec Authoring Rules\n\nRead all files in `spec/01-spec-authoring-guide/` in numeric order.\n\nConfirm understanding of: file/folder naming conventions, required files in every spec folder (`00-overview.md`, `99-consistency-report.md`), `.lovable/` folder structure (`07-memory-folder-guide.md`), linter infrastructure requirements.\n\n⛔ DO NOT begin any task until Phases 1–3 are complete.\n\n---\n\n## Phase 4 — Deep-Dive Source Specs (Task-Driven)\n\nBefore any task, read the relevant spec(s):\n\n| Task involves... | Spec folder |\n|---|---|\n| Writing/reviewing code | `spec/02-coding-guidelines/` |\n| Error handling | `spec/03-error-manage/` |\n| Database schema/queries | `spec/04-database-conventions/` |\n| SQLite / multi-DB | `spec/05-split-db-architecture/` |\n| Configuration systems | `spec/06-seedable-config-architecture/` |\n| UI theming, design tokens | `spec/07-design-system/` |\n| Documentation viewer | `spec/08-docs-viewer-ui/` |\n| Code block rendering | `spec/09-code-block-system/` |\n| PowerShell scripts | `spec/11-powershell-integration/` |\n| CI/CD pipelines | `spec/12-cicd-pipeline-workflows/` |\n| Self-update | `spec/14-update/` |\n| App-specific features | `spec/21-app/` |\n| Known app bugs | `spec/22-app-issues/` |\n| App-specific database | `spec/23-database/` |\n\nReading order in each: `00-overview.md` → numbered files → `99-consistency-report.md`.\n\n---\n\n## Phase 5 — CI/CD Issues Review\n\nRead every `.lovable/cicd-issues/xx-*.md` and `.lovable/cicd-index.md`. Do not repeat these mistakes.\n\n---\n\n## Anti-Hallucination Contract\n\n1. **Never invent rules.** If a spec doesn't mention it, it doesn't exist.\n2. **Specs override training data.** Always.\n3. **Cite sources.** Reference file + section.\n4. **Ask when uncertain.** Unless No-Questions Mode is active — then log to `.lovable/question-and-ambiguity/`.\n5. **Never merge conventions** from other projects.\n6. **No filler.** Skip \"let me know if…\" / \"hope this helps!\".\n\n---\n\n## Memory Update Protocol\n\n```\nNew info?\n├─ Institutional (pattern/convention/decision) → write to `.lovable/memory/<subfolder>/` + update `.lovable/memory/index.md`\n├─ Must NEVER be done                          → add to `.lovable/strictly-avoid.md`\n├─ Suggestion not yet approved                 → add to `.lovable/suggestions.md`\n└─ None of the above                           → don't persist\n```\n\n- Memory folder is `.lovable/memory/` — NEVER `.lovable/memories/`.\n- New memory file ⇒ ALWAYS update the index.\n- Modifying memory ⇒ preserve all unrelated entries.\n\n---\n\n## Code-Change Rule\n\nAny change to code base always bumps the minor version across: `manifest.json`, `src/shared/constants.ts`, every `standalone-scripts/*/src/instruction.ts`, `macro-controller/src/shared-state.ts`, and SDK `index.ts` literal.\n\n(Pure-doc changes under `.lovable/` do not require a bump.)\n\n---\n\n## Completion Confirmation\n\nAfter Phases 1–3, respond exactly:\n\n```\n✅ Onboarding complete.\n- Memory files read: [X]\n- Consolidated guidelines read: [Y]\n- Spec authoring files read: [Z]\n\nI understand:\n- CODE RED rules: [top 3–5]\n- Naming conventions: [brief]\n- Error handling: [one sentence]\n- Active plan: [current focus]\n- Strict avoidances: [top 3–5]\n\nReady for tasks.\n```\n\nThen **stop and wait**. Don't suggest next steps.\n\n---\n\n*Prompt v1.0. Trigger phrase: \"read memory\".*", slug: "read-memory", id: "default-read-memory", category: "onboarding" },
  { name: "Write Memory", text: "# Write Memory\n\n> **Purpose:** After completing work or at session end, persist everything learned, done, and pending so the next AI session picks up with zero context loss.\n\n> **When to run:** End of session, after a task batch, or when asked to \"update memory\" / \"write memory\" / \"end memory\".\n\n---\n\n## Core Principle\n\nThe memory system is the project's brain. If you did something and didn't write it down, it didn't happen. Write as if the next AI has amnesia — because it does.\n\n---\n\n## Phase 1 — Audit Current State\n\nTake inventory before writing:\n\n- **Done this session:** features, fixes, refactors, files created/modified/deleted, decisions and why.\n- **Still pending:** tasks started but not finished, discussed but not started, blockers and dependencies.\n- **Learned:** new patterns/conventions, gotchas, edge cases, user preferences (explicit or implicit).\n- **Went wrong:** bugs + root causes, failed approaches, things that should never be repeated.\n\n---\n\n## Phase 2 — Update Memory Files\n\nTarget: `.lovable/memory/`\n\n1. Read `.lovable/memory/index.md` first. Do not create duplicates.\n2. Update existing memory files affected by this session — add new info in the right section, mark completed items `[x]` / ✅, **never truncate or overwrite unrelated entries**.\n3. Create new memory files (lowercase-hyphenated, numeric prefix `XX-name.md`) when knowledge doesn't fit any existing file. **Immediately update `index.md`**.\n4. Update workflow files in `.lovable/memory/workflow/` with status markers: ✅ Done, 🔄 In Progress, ⏳ Pending, 🚫 Blocked — [reason], 🚫 Blocked — [avoid].\n\n---\n\n## Phase 3 — Update Plans & Suggestions\n\n### 3A — Plans (`.lovable/plan.md`)\n- Update task statuses; add new tasks discovered this session.\n- Move fully-complete items to a `## Completed` section in the same file (do not delete).\n- Single source of truth for the roadmap.\n\n### 3B — Suggestions (`.lovable/suggestions.md`) — single file, with index folder for grouped suggestions\n\n```markdown\n## Active Suggestions\n### [Title]\n- **Status:** Pending | In Review | Approved | Rejected\n- **Priority:** High | Medium | Low\n- **Description:** What and why\n- **Added:** [date or session ref]\n\n## Implemented Suggestions\n### [Title]\n- **Implemented:** [date or session ref]\n- **Notes:** Implementation details\n```\n\nWhen implemented: move from Active → Implemented, add notes, reference commit/file/task.\n\nAlso write all Lovable suggestions in the appropriate folder with an index file for suggestions.\n\n---\n\n## Phase 4 — Update Issues\n\n### 4A — Pending (`.lovable/pending-issues/XX-short-description.md`)\n\n```markdown\n# [Issue Title]\n## Description\n## Root Cause   (or \"Under investigation.\")\n## Steps to Reproduce\n## Attempted Solutions\n- [ ] Approach 1 — [result]\n## Priority   (High | Medium | Low)\n## Blocked By  (if any)\n```\n\n### 4B — Solved (`.lovable/solved-issues/`)\n\nWhen resolved, MOVE the file from pending → solved and append:\n\n```markdown\n## Solution\n## Iteration Count\n## Learning\n## What NOT to Repeat\n```\n\n### 4C — Strictly Avoided (`.lovable/strictly-avoid.md`)\n\nIf a solved issue revealed a forbidden pattern:\n\n```markdown\n- **[Pattern Name]:** [Why forbidden]. See: `.lovable/solved-issues/XX-filename.md`\n```\n\nAnything explicitly told to skip/avoid → `avoid` folder in memory.\n\n### 4D — CI/CD Issues (`.lovable/cicd-issues/XX-issue-name.md`)\n\nFor every CI/CD problem encountered, write a numbered file (sequence starts from 01) and maintain `.lovable/cicd-index.md` as a summary index. Collect every CI/CD issue properly. Do not repeat them.\n\n---\n\n## Phase 5 — Consistency Validation\n\n- **Index integrity:** every file in `.lovable/memory/` (incl. subfolders) listed in `index.md`.\n- **Cross-reference:** every ✅ Done in `plan.md` has evidence (memory update / solved issue / code change). Every actionable item in `pending-issues/` reflected in `plan.md` or `suggestions.md`. No file in both `pending-issues/` and `solved-issues/`.\n- **Orphan check:** no memory file without an index entry; no \"Implemented\" suggestion without code evidence; no `solved-issues/` file without a `## Solution` section.\n\n### Final Confirmation\n\n```\n✅ Memory update complete.\n\nSession Summary:\n- Tasks completed: [X]\n- Tasks pending: [Y]\n- New memory files created: [Z]\n- Issues resolved: [N]\n- Issues opened: [M]\n- Suggestions added: [S]\n- Suggestions implemented: [T]\n\nFiles modified:\n- [list every file touched]\n\nInconsistencies found and fixed:\n- [list any, or \"None\"]\n\nThe next AI session can pick up from: [current state + next logical step]\n```\n\n---\n\n## Phase 6 — Verbatim Spec Capture\n\nReview current discussions. If a larger spec was given during the session, write it verbatim into the file system AND store the gist in memory so the next AI can find it. Recent specs and verbatims must land in the file system, not stay only in chat.\n\n---\n\n## File Naming & Structure Rules\n\n| Rule | Example |\n|------|---------|\n| Numeric prefix, lowercase, hyphen-separated | `01-auth-flow.md` ✅ / `01_Auth_Flow.md` ❌ |\n| Plans → single file | `.lovable/plan.md` |\n| Suggestions → single file (+ optional index folder) | `.lovable/suggestions.md` |\n| Pending/solved issues → one file per issue | `.lovable/pending-issues/01-login-crash.md` |\n| Memory → grouped by topic | `.lovable/memory/workflow/`, `.lovable/memory/decisions/` |\n| Completed → `## Completed` section in same file | NOT a separate `completed/` folder |\n\n### Folder Structure\n\n```\n.lovable/\n├── overview.md\n├── strictly-avoid.md\n├── user-preferences\n├── plan.md\n├── suggestions.md\n├── prompt.md                     # Index of canonical prompts\n├── prompts/                      # xx-name.md (lowercase hyphenated)\n├── cicd-index.md                 # Summary of CI/CD issues\n├── cicd-issues/                  # 01-issue.md, 02-issue.md, ...\n├── memory/\n│   ├── index.md\n│   ├── workflow/\n│   ├── decisions/\n│   ├── avoid/                    # things to skip/avoid\n│   └── [topic]/\n├── pending-issues/\n└── solved-issues/\n```\n\n> ⚠️ **NEVER** create `.lovable/memories/` (trailing `s`). The path is `.lovable/memory/`.\n\n---\n\n## Anti-Corruption Rules\n\n1. **Never delete history** — mark done, move to completed sections.\n2. **Never overwrite blindly** — read before write; preserve existing content.\n3. **Never leave orphans** — every file indexed; every reference resolves.\n4. **Never split what should be unified** — plans and suggestions live in ONE file each.\n5. **Never mix states** — an issue is pending OR solved, never both.\n6. **Never skip the index update** — new memory file ⇒ update `index.md` in the same operation.\n7. **Never assume the next AI knows anything** — write as if explaining to a stranger.\n\n---\n\n## Important\n\n- Save trigger phrases: **\"write memory\"**, **\"end memory\"**, **\"update memory\"**.\n- Lose as little of the conversation as possible.\n- This prompt lives at `.lovable/prompts/03-write-memory.md`; root index `.lovable/prompt.md` references it.\n- Restructure any folder that doesn't match this layout. All `.md` files lowercase-hyphenated.\n\n*Prompt v3.0.*", slug: "write-memory", id: "default-write-memory", category: "onboarding" },
  { name: "Coding Guidelines", text: "# Coding Guidelines\n\n> **Purpose:** Read and synthesize existing repository context from the Lovable memory folder and the full specification set, then produce a reliability risk report before any implementation work begins. Do not implement anything. Only produce a report and specification-side artifacts for memory, suggestions, and planning.\n\n---\n\n## Goals\n\n1. Reconstruct project requirements by reading the .lovable memory content and the existing spec files and idea files across all projects.\n2. Produce a detailed risk and failure-chance report for handing the current specs to another AI.\n3. Establish a disciplined workflow for Lovable suggestions tracking and future planning so another AI can continue work reliably.\n\n## Inputs to read\n\n- .lovable/ (memories/, memory/, memory/suggestions/, any other Lovable state folders). Do NOT touch any skipped/ folder.\n- Spec folder content for all projects: ideas, backend/frontend specs, instruction builder specs, seeding/configuration specs, data model specs, acceptance criteria. Read root spec/ folder for a general idea.\n\n## Deliverable 1 — Reliability and Failure-Chance Report\n\n1. Success probability estimates by module complexity tier (simple, medium, complex agentic workflows, end-to-end), with explicit assumptions.\n2. Failure map — where failures are likely (module + workflow), why (missing constraints, ambiguity, cross-file inconsistency), how they manifest.\n3. Corrective actions — prioritized list of spec fixes; for each: what to change, where, expected reliability gain.\n4. Readiness decision — whether the spec set is ready for implementation; what must be fixed first.\n\n## Deliverable 2 — Lovable Suggestions Workflow\n\n- Location: .lovable/memory/suggestions — one file per suggestion.\n- File naming: YYYYMMDD-HHMMSS-suggestion-<slug>.md.\n- Content: suggestionId, createdAt, source (Lovable), affectedProject, description, rationale, proposed change, acceptance criteria, status (open/inProgress/done), completion notes.\n- On completion → status done; archive or remove per policy.\n\n## Deliverable 3 — plan.md Future Work Roadmap\n\nCreate plan.md at repo root: prioritized backlog grouped by phase and project. Each task: objective, dependencies, expected outputs (spec/UI/API), acceptance criteria. Include a Next task selection section listing implementable items.\n\n## Interaction rule\n\nAfter producing the report and creating the memory and plan artifacts, ask the user which specific task to implement next.\n\n*Prompt v1.0. Trigger phrase: \"coding guidelines\".*", slug: "coding-guidelines", id: "default-coding-guidelines", category: "onboarding" },
];

// ============================================
// PromptLoaderState — encapsulated module state (CQ11, CQ17)
//
// Conversion (CQ10):
//   Before: 5 module-level `let` vars (_loadedJsonPrompts, _jsonPromptsLoading,
//           _promptCategoryFilter, _revalidateCtx, _renderDropdownFn).
//   After:  `PromptLoaderState` singleton class with private fields and getters/setters.
// ============================================

class PromptLoaderState {
  private _loadedJsonPrompts: PromptEntry[] | null = null;
  private _jsonPromptsLoading = false;
  private _promptCategoryFilter: string | null = null;
  private _revalidateCtx: { ctx: PromptContext; taskNextDeps: TaskNextDeps } | null = null;
  private _renderDropdownFn: ((ctx: PromptContext, deps: TaskNextDeps) => void) | null = null;
  private _pendingCallbacks: Array<(prompts: PromptEntry[] | null) => void> = [];

  get loadedJsonPrompts(): PromptEntry[] | null { return this._loadedJsonPrompts; }
  set loadedJsonPrompts(value: PromptEntry[] | null) { this._loadedJsonPrompts = value; }

  get jsonPromptsLoading(): boolean { return this._jsonPromptsLoading; }
  set jsonPromptsLoading(value: boolean) { this._jsonPromptsLoading = value; }

  get promptCategoryFilter(): string | null { return this._promptCategoryFilter; }
  set promptCategoryFilter(value: string | null) { this._promptCategoryFilter = value; }

  get revalidateCtx(): { ctx: PromptContext; taskNextDeps: TaskNextDeps } | null { return this._revalidateCtx; }
  set revalidateCtx(value: { ctx: PromptContext; taskNextDeps: TaskNextDeps } | null) { this._revalidateCtx = value; }

  get renderDropdownFn(): ((ctx: PromptContext, deps: TaskNextDeps) => void) | null { return this._renderDropdownFn; }
  set renderDropdownFn(value: ((ctx: PromptContext, deps: TaskNextDeps) => void) | null) { this._renderDropdownFn = value; }

  enqueuePendingCallback(callback: (prompts: PromptEntry[] | null) => void): void {
    this._pendingCallbacks.push(callback);
  }

  flushPendingCallbacks(prompts: PromptEntry[] | null): void {
    const pending = this._pendingCallbacks.slice();
    this._pendingCallbacks = [];
    for (const callback of pending) {
      try {
        callback(prompts);
      } catch (e) {
        logError('parsePromptFile', 'Prompt callback execution failed', e);
        showToast('❌ Prompt callback failed', 'error');
      }
    }
  }
}

const promptLoaderState = new PromptLoaderState();

/** @deprecated Use promptLoaderState.promptCategoryFilter directly. */
export const _promptCategoryFilter: string | null = null;
export function getPromptCategoryFilter(): string | null { return promptLoaderState.promptCategoryFilter; }
export function setPromptCategoryFilter(value: string | null): void {
  promptLoaderState.promptCategoryFilter = value;
}

/** Invalidate prompt cache (e.g. after save/delete) */
export function invalidatePromptCache(): void {
  promptLoaderState.loadedJsonPrompts = null;
  // Also invalidate SDK cache if available
  const sdk = window.marco as { prompts?: { invalidateCache(): Promise<void> } } | undefined;
  if (sdk && sdk.prompts && typeof sdk.prompts.invalidateCache === 'function') {
    sdk.prompts.invalidateCache().catch(function(e: unknown) { log('[PromptLoader] SDK cache invalidation failed: ' + (e instanceof Error ? e.message : String(e)), 'warn'); });
  }
  clearPromptCache().then(function() {
    log('[PromptCache] Cache cleared (invalidated)', 'info');
  });
  clearUISnapshot().then(function() {
    log('[UISnapshot] Snapshot cleared (invalidated)', 'info');
  });
}

/** Check if prompts are already loaded in memory */
export function isPromptsCached(): boolean {
  return promptLoaderState.loadedJsonPrompts !== null && promptLoaderState.loadedJsonPrompts.length > 0;
}

/** Clear in-memory loaded prompts (used after save/delete) */
export function clearLoadedPrompts(): void {
  promptLoaderState.loadedJsonPrompts = null;
  // Also invalidate SDK cache
  const sdk = window.marco as { prompts?: { invalidateCache(): Promise<void> } } | undefined;
  if (sdk && sdk.prompts && typeof sdk.prompts.invalidateCache === 'function') {
    sdk.prompts.invalidateCache().catch(function(e: unknown) { log('[PromptLoader] SDK cache invalidation failed: ' + (e instanceof Error ? e.message : String(e)), 'warn'); });
  }
}

// ============================================
// CQ16: Extracted message relay context
// ============================================

interface RelayCtx {
  settled: boolean;
  requestId: string;
  timeout: ReturnType<typeof setTimeout>;
  resolve: (resp: ExtensionResponse) => void;
  _onResponse?: (event: MessageEvent) => void;
}

// CQ16: Extracted from sendToExtension closure
function finishRelay(ctx: RelayCtx, resp: ExtensionResponse): void {
  if (ctx.settled) return;
  ctx.settled = true;
  window.removeEventListener('message', ctx._onResponse!);
  clearTimeout(ctx.timeout);
  ctx.resolve(resp);
}

// CQ16: Extracted from sendToExtension closure
function handleRelayResponse(ctx: RelayCtx, event: MessageEvent): void {
  if (event.data && event.data.source === 'marco-extension' && event.data.requestId === ctx.requestId) {
    finishRelay(ctx, event.data.payload);
  }
}

/**
 * Send a message to the extension via chrome.runtime or window.postMessage relay.
 * Returns a Promise that resolves with the extension response.
 */
export function sendToExtension(type: string, payload: Record<string, unknown>): Promise<ExtensionResponse> {
  return new Promise<ExtensionResponse>(function(resolve) {
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
      try {
        const msg = Object.assign({ type: type }, payload);
        chrome.runtime.sendMessage(msg, function(resp: ExtensionResponse) {
          const lastError = chrome.runtime?.lastError;
          if (lastError) {
            log('Extension message error: ' + (lastError.message || ''), 'warn');
            resolve({ isOk: false, errorMessage: lastError.message || 'runtime error' });
            return;
          }
          resolve(resp);
        });
        return;
      } catch (e) { logSub('chrome.runtime.sendMessage unavailable, falling through to relay: ' + (e instanceof Error ? e.message : String(e)), 1); }
    }

    // Relay via window.postMessage (content script bridge)
    const requestId = 'pr-' + Date.now() + '-' + Math.random().toString(36).substr(2, 6);

    const ctx: RelayCtx = {
      settled: false,
      requestId,
      timeout: setTimeout(function() {
        log('Extension relay timed out for ' + type, 'warn');
        finishRelay(ctx, { isOk: false, errorMessage: 'Extension relay timeout' });
      }, 5000),
      resolve,
    };

    ctx._onResponse = function(event: MessageEvent) { handleRelayResponse(ctx, event); };

    window.addEventListener('message', ctx._onResponse);
    window.postMessage({ source: 'marco-controller', requestId: requestId, ...(payload || {}), type: type }, '*');
  });
}

// ============================================
// Prompt loading
// ============================================

/**
 * Try loading prompts via chrome.runtime or relay, returns Promise.
 */
function tryLoadByMessage(type: string): Promise<PromptEntry[] | null> {
  return sendToExtension(type, {}).then(function(response: ExtensionResponse) {
    if (!response) return null;
    const prompts = normalizePromptEntries((response.prompts) as Partial<PromptEntry>[]);
    return prompts.length > 0 ? prompts : null;
  });
}

export function setRevalidateContext(ctx: PromptContext, taskNextDeps: TaskNextDeps): void {
  promptLoaderState.revalidateCtx = { ctx, taskNextDeps };
}

/** Register the renderPromptsDropdown function (called from prompt-dropdown to break circular dep) */
export function setRenderDropdownFn(fn: (ctx: PromptContext, deps: TaskNextDeps) => void): void {
  promptLoaderState.renderDropdownFn = fn;
}

// CQ16: Extracted from loadPromptsFromJson legacy path closure
function finishLegacyLoad(
  prompts: PromptEntry[] | null,
  source: string,
): PromptEntry[] | null {
  promptLoaderState.jsonPromptsLoading = false;
  if (prompts && prompts.length > 0) {
    promptLoaderState.loadedJsonPrompts = prompts;
    log('Loaded ' + prompts.length + ' prompts from ' + source, 'success');
    writePromptCache(prompts as CachedPromptEntry[]).then(function() {
      log('[PromptCache] Cached ' + prompts.length + ' prompts to IndexedDB', 'info');
    });
    promptLoaderState.flushPendingCallbacks(promptLoaderState.loadedJsonPrompts);
    return promptLoaderState.loadedJsonPrompts;
  }
  promptLoaderState.flushPendingCallbacks(null);
  return null;
}

 
export function loadPromptsFromJson(): Promise<PromptEntry[] | null> {
  const loadStartMs = Date.now();

  // ── SDK delegation (preferred path) ──
  const sdk = window.marco as { prompts?: { getAll(): Promise<unknown[]> } } | undefined;
  if (sdk && sdk.prompts && typeof sdk.prompts.getAll === 'function') {
    if (promptLoaderState.loadedJsonPrompts) {
      log('[PromptLoad] ✅ In-memory cache hit (' + promptLoaderState.loadedJsonPrompts.length + ' prompts, 0ms)', 'info');
      return Promise.resolve(promptLoaderState.loadedJsonPrompts);
    }
    log('[PromptLoad] Fetching via SDK marco.prompts.getAll()...', 'info');
    return sdk.prompts.getAll().then(function(entries: unknown[]) {
      const prompts = normalizePromptEntries(entries as Partial<PromptEntry>[]);
      const elapsed = Date.now() - loadStartMs;
      if (prompts.length > 0) {
        promptLoaderState.loadedJsonPrompts = prompts;
        log('[PromptLoad] ✅ SDK returned ' + prompts.length + ' prompts (' + elapsed + 'ms)', 'success');
        promptLoaderState.flushPendingCallbacks(prompts);
        return prompts;
      }
      log('[PromptLoad] ⚠️ SDK returned empty — falling back to defaults (' + elapsed + 'ms)', 'warn');
      promptLoaderState.loadedJsonPrompts = DEFAULT_PROMPTS;
      promptLoaderState.flushPendingCallbacks(DEFAULT_PROMPTS);
      return DEFAULT_PROMPTS;
    }).catch(function(e: unknown) {
      const elapsed = Date.now() - loadStartMs;
      log('[PromptLoad] ❌ SDK prompts.getAll() failed (' + elapsed + 'ms): ' + (e instanceof Error ? e.message : String(e)) + ' — using defaults', 'warn');
      promptLoaderState.loadedJsonPrompts = DEFAULT_PROMPTS;
      promptLoaderState.flushPendingCallbacks(DEFAULT_PROMPTS);
      return DEFAULT_PROMPTS;
    });
  }

  // ── Legacy path (SDK not available) ──
  log('[PromptLoad] SDK not available — using legacy load path', 'info');

  // 1. In-memory cache
  if (promptLoaderState.loadedJsonPrompts) {
    log('[PromptLoad] ✅ In-memory cache hit (' + promptLoaderState.loadedJsonPrompts.length + ' prompts, 0ms)', 'info');
    return Promise.resolve(promptLoaderState.loadedJsonPrompts);
  }
  if (promptLoaderState.jsonPromptsLoading) {
    return new Promise<PromptEntry[] | null>(function(resolve) {
      promptLoaderState.enqueuePendingCallback(resolve);
    });
  }
  promptLoaderState.jsonPromptsLoading = true;

  // 2. Try IndexedDB cache first (instant) — no SWR, no background revalidation
  return readPromptCache().then(function(cached) {
    if (cached && cached.entries && cached.entries.length > 0) {
      promptLoaderState.loadedJsonPrompts = cached.entries as PromptEntry[];
      promptLoaderState.jsonPromptsLoading = false;
      const age = Math.round((Date.now() - cached.fetchedAt) / 1000);
      log('[PromptCache] Loaded ' + cached.entries.length + ' prompts from IndexedDB JsonCopy (age=' + age + 's)', 'success');
      promptLoaderState.flushPendingCallbacks(promptLoaderState.loadedJsonPrompts);

      return promptLoaderState.loadedJsonPrompts;
    }

    // No cache — fetch directly from extension
    log('[PromptCache] No IndexedDB cache — fetching from extension...', 'info');

    return fetchAndCacheFromExtension();
  }).catch(function(e: unknown) {
    logError('loadPrompts', 'Prompt loading failed', e);
    showToast('❌ Prompt loading failed', 'error');
    return fetchAndCacheFromExtension();
  });
}

// ============================================
// Extension fetch with fallback chain
// ============================================

/** Fetch from extension, fall back to preamble or defaults. */
function fetchAndCacheFromExtension(): Promise<PromptEntry[] | null> {
  return tryLoadByMessage('GET_PROMPTS').then(function(prompts: PromptEntry[] | null) {
    if (prompts && prompts.length > 0) {
      return finishLegacyLoad(prompts, 'extension bridge GET_PROMPTS (SQLite)');
    }

    return loadFromPreambleOrDefaults();
  });
}

/** Try __MARCO_PROMPTS__ preamble, then hardcoded defaults. */
function loadFromPreambleOrDefaults(): PromptEntry[] | null {
  const preamble = window.__MARCO_PROMPTS__;
  const hasPreamble = preamble && Array.isArray(preamble) && preamble.length > 0;

  if (hasPreamble) {
    return finishLegacyLoad(normalizePromptEntries(preamble), '__MARCO_PROMPTS__ preamble');
  }

  log('No prompts from bridge or preamble — using hardcoded defaults', 'warn');

  return finishLegacyLoad(DEFAULT_PROMPTS, 'hardcoded DEFAULT_PROMPTS');
}

// ============================================
// Manual Load — forceLoadFromDb
// ============================================

/**
 * Force-load prompts from the extension DB (bypasses in-memory + IndexedDB cache).
 * Called by the "Load" button in the prompt dropdown header.
 */
export function forceLoadFromDb(): Promise<PromptEntry[] | null> {
  log('[PromptLoad] Manual load triggered — clearing caches and fetching from DB...', 'check');
  promptLoaderState.loadedJsonPrompts = null;
  promptLoaderState.jsonPromptsLoading = false;

  return clearPromptCache()
    .then(function() { return clearUISnapshot(); })
    .then(function() { return tryLoadByMessage('GET_PROMPTS'); })
    .then(function(prompts: PromptEntry[] | null) {
      return handleForceLoadResult(prompts);
    });
}

/** Process force-load result and cache it. */
function handleForceLoadResult(prompts: PromptEntry[] | null): PromptEntry[] | null {
  if (prompts && prompts.length > 0) {
    return finishLegacyLoad(prompts, 'manual load from DB');
  }

  log('[PromptLoad] Manual load returned empty — using defaults', 'warn');

  return finishLegacyLoad(DEFAULT_PROMPTS, 'defaults (manual load empty)');
}

// ============================================
// HTML Copy — save rendered dropdown HTML for MacroController
// ============================================

/** Save rendered dropdown HTML as HtmlCopy in IndexedDB. */
export function saveHtmlCopy(options: { html: string; promptCount: number; dataHash: string }): Promise<void> {
  return writeHtmlCopy(options);
}

/**
 * Resolve prompts config from multiple sources.
 */
export function getPromptsConfig(): ResolvedPromptsConfig {
  const promptsCfg = (window.__MARCO_CONFIG__ || {}).prompts || {};
  const rawEntries = (promptsCfg.entries || promptsCfg.prompts || []) as Array<Partial<PromptEntry> & { id?: string; isDefault?: boolean }>;
  let entries: PromptEntry[] = normalizePromptEntries(Array.isArray(rawEntries) ? rawEntries : []);

  const loaded = promptLoaderState.loadedJsonPrompts;

  if (loaded && loaded.length > 0) {
    const merged: PromptEntry[] = loaded.slice();
    const seen: Record<string, boolean> = {};
    for (const prompt of merged) {
      seen[(prompt.name || '').toLowerCase()] = true;
    }

    for (const p of entries) {
      const key = (p.name || '').toLowerCase();

      if (p.name && p.text && !seen[key]) {
        merged.push(p);
        seen[key] = true;
      }
    }
    entries = merged;
  }

  if (entries.length === 0) {
    entries = DEFAULT_PROMPTS;
  }

  return {
    entries: entries,
    pasteTargetXPath: promptsCfg.pasteTargetXPath || (promptsCfg.pasteTarget && promptsCfg.pasteTarget.xpath) || DEFAULT_PASTE_XPATH,
    pasteTargetSelector: promptsCfg.pasteTargetSelector || (promptsCfg.pasteTarget && promptsCfg.pasteTarget.selector) || ''
  };
}
