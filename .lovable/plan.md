# Roadmap — Marco / Macro Controller

> Single source of truth for the project roadmap. Suggestions live in `.lovable/suggestions.md`. Pending issues in `.lovable/pending-issues/`.

---

## 🔄 In Progress

- **PascalCase JSON migration — Phase 2** (consumer + storage rollout). Phase 1 ✅ landed 2026-04-25: shared `ProjectInstruction<TSettings>` adopted by all 7 standalone scripts; every `instruction.ts` ships PascalCase keys; `compile-instruction.mjs` dual-emits PascalCase + camelCase aliases so all 47 consumers + persisted storage stay green. Phase 2a (background runtime), Phase 2b (UI + scripts + tests), Phase 2c (drop dual-emit + storage migrator) tracked separately — see `mem://standards/pascalcase-json-keys` and `standalone-scripts/types/instruction/00-readme.md`.

---

_(Stability — Loop & Leak Prevention shipped in v2.243.0; see Completed below.)_

---

## ⏳ Pending — Next Up

| # | Item | Priority | Reference |
|---|---|---|---|
| 1 | ~~Refactor `payment-banner-hider` per Issue 98 RCA~~ — ✅ **2026-04-24** completed: class split (`PaymentBannerHider` + injected `BannerLocator`), sibling `css/payment-banner-hider.css` declared via `instruction.assets.css`, `BannerState` enum, scoped `[data-marco-banner-hider]` selectors, zero `!important`/casts/rAF/swallowed catches. Build green (`npm run build:payment-banner-hider`), tsc clean, all 4 mandated greps return only doc/comment hits. Version bumped 1.0.0 → 2.230.0. New `scripts/copy-payment-banner-hider-css.mjs` ships the CSS into dist; `check-standalone-dist.mjs` extended to require both artifacts. | ~~High~~ | `spec/22-app-issues/98-payment-banner-hider-violation-rca.md` |
| 2 | ~~Per-script migration to shared `ProjectInstruction` types (Priority 0.2–0.6)~~ — ✅ **Phase 1 complete 2026-04-25**: all 7 `instruction.ts` files import the shared `ProjectInstruction<TSettings>` and use PascalCase keys (`Name`, `World`, `RunAt`, `IsIife`, …); per-script `interface ProjectInstruction` redefinitions removed; `tsc --strict` + ESLint clean across `tsconfig.{sdk,xpath,payment-banner-hider,macro.build,app}.json`; `compile-instruction.mjs` dual-emits camelCase aliases for back-compat; `check-version-sync` made case-flexible (passes ✅). Phase 2 (consumers + storage migrator) listed separately. | ~~Low~~ | `standalone-scripts/types/instruction/00-readme.md` |
| 2a | **Phase 2a — PascalCase rollout: background runtime consumers** (auto-injector, manifest-seeder, default-project-seeder, project-matcher, script-resolver, injection-handler, builtin-script-guard, namespace-cache, url-matcher, etc.) | Medium | `mem://standards/pascalcase-json-keys` |
| 2b | **Phase 2b — PascalCase rollout: options UI + popup + scripts + tests** | Medium | same |
| 2c | ~~**Phase 2c — Drop dual-emit**~~ — ✅ **2026-05-16** completed: vite `copyProjectScripts` plugin migrated to read canonical PascalCase keys (`Assets.{Configs,Templates,Prompts,Css,Scripts}`, `DisplayName`, `Version`, asset `File`/`Key`); `compile-instruction.mjs` no longer emits `instruction.compat.json`; `check-standalone-dist.mjs` drops compat from REQUIRED_ARTIFACTS; `check-instruction-json-casing.mjs` + `validate-instruction-schema.mjs` treat compat as optional (scanned when present, e.g. truncation-test fixtures, ignored otherwise); `vite.config.extension.ts` removed from `COMPAT_READER_ALLOWLIST` (tooling/test entries remain as permanent residents per allowlist policy). All four CI guards + truncation tests green. **Remaining 2c follow-up**: `chrome.storage.local` migrator that PascalCase-rewrites already-persisted projects on extension upgrade (bumps storage schema version) — tracked as 2c-storage below. | ~~Medium~~ | same |
| 2c-storage | **chrome.storage.local PascalCase migrator** — ✅ **2026-05-16** scaffolding landed: `src/background/storage-migration.ts` registers sequential `runStorageMigrations()` + `marco_storage_schema_version` key (`CURRENT_STORAGE_SCHEMA_VERSION=1`, baseline identity migration); wired into `boot.ts` between `start-session` and `seed-scripts`; fail-fast (no retry) per project no-retry policy; tsc clean. **Remaining**: future v2 migration that PascalCase-rewrites persisted `StoredProject` payloads once UI consumers (Phase 2b) adopt PascalCase keys — deferred until then to avoid wide blast radius. Ambiguity logged in `.lovable/question-and-ambiguity/46-storage-pascalcase-migrator-scope.md`. | ~~Medium~~ | `mem://standards/pascalcase-json-keys` |
| 3 | ~~Installer hardening v0.3 — sign `checksums.txt` (minisign)~~ — ✅ **2026-05-16** verifier shipped opt-in in both installers: `verify_signature` (install.sh) + `Test-Signature` (install.ps1) run after `verify_checksum`, validate `checksums.txt.minisig` via `minisign -V -P $MARCO_MINISIGN_PUBKEY -m checksums.txt -x …`, exit 6 on mismatch, soft-skip when pubkey unset / `.minisig` 404 / `minisign` CLI absent (AC-24/25/26). Contract extended with `signing` block (`signatureFileName`, `publicKeyEnvVar=MARCO_MINISIGN_PUBKEY`, `mismatchExitCode=6`); `generate-installer-constants.mjs` emits `MARCO_SIGNATURE_FILE` + `MARCO_MINISIGN_PUBKEY` defaults to `.sh` / `.ps1`; drift checker ✓. Spec §7.1.5 documents the contract + release-side keygen/signing recipe. **Remaining**: release-side automation (GH Actions workflow consuming `MINISIGN_SECRET_KEY` secret, attaching `.minisig` to release) — requires user to generate keypair + add repo secret; tracked separately. Ambiguity logged in `.lovable/question-and-ambiguity/47-installer-checksum-signing-scope.md`. | ~~Low~~ | spec §7.1.5 |
| 4 | ~~Mirror AC-2 main-branch fallback in `install.ps1`~~ — ✅ **2026-05-16** verified already in parity with `install.sh`: `Get-LatestVersion` two-stage probe (200+tag → tag, 200+no-tag → `$script:MarcoMainBranchSentinel`, 404 → sentinel, 5xx/network → `exit 5`); `Install-FromMainBranch` downloads `archive/refs/heads/<branch>.tar.gz` via `Invoke-WebRequest`; `Install-Extension` handles `.tar.gz` via `tar -xzf` with `--strip-components=1`; `VERSION` records `<branch>@HEAD`; discovery-mode banner `🌿 Discovery mode — main branch (no releases found)` printed when `$script:MainFallback`. `check-installer-contract.mjs` ✓ (in sync across both installers). | ~~Medium~~ | spec §2 step 5 |
| 5 | ~~Wire `check:installer-contract` into `.github/workflows/installer-tests.yml`~~ — ✅ **2026-04-24** completed: drift step inserted on the `linux` job before `npm run test:installer`; path triggers extended to fire on contract/constants/checker/generator edits; not duplicated on Windows (platform-agnostic check). YAML parses; local `node scripts/check-installer-contract.mjs` green. | ~~Medium~~ | `.lovable/cicd-issues/01-installer-contract-not-in-ci.md` (closed) |
| 6 | **Implement `Lovable Owner Switch` standalone script** (spec-only, deferred per user — do NOT auto-recommend) | Pending — user-scheduled | `spec/21-app/02-features/chrome-extension/70-lovable-owner-switch/` |
| 7 | **Implement `Lovable User Add` standalone script (v2 — two-step Owner promotion: POST as Member then PUT to Owner via shared `LovableApiClient.promoteToOwner`)** (spec-only, deferred per user — do NOT auto-recommend) | Pending — user-scheduled | `spec/21-app/02-features/chrome-extension/71-lovable-user-add/` + `mem://features/lovable-user-add-v2-two-step-owner` |
| 8 | **Build shared `lovable-common-xpath` TS module** (XPaths + default delays) and **`LovableApiClient`** (shared `promoteToOwner` etc.) for both Lovable scripts above | Pending — user-scheduled | `spec/.../70-lovable-owner-switch/03-xpaths-and-defaults.md` + `spec/.../71-lovable-user-add/01-overview.md` §11 |
| 9 | **20-Phase Plan — execute on `next`** (P1..P20 covering tasks 6+7+8 above) — phases, AC coverage map, and open questions captured | Pending — user-scheduled | `spec/21-app/02-features/chrome-extension/72-lovable-owner-switch-and-user-add-phase-plan/` |
| 10 | ~~**Macro Controller — `pro_0` plan credit balance retrieval**~~ — ✅ **2026-04-27** completed: 27 files under `standalone-scripts/macro-controller/src/pro-zero/` (Enums, typed shapes, mapper, SDK adapter, IDB cache, SQLite Workspaces upsert, orchestrator, enrichment). Wired into `credit-parser.ts` (`applyProZeroEnrichment`) + `credit-fetch.ts` (background refresh on `processSuccessData`, awaited in `doFetchLoopCreditsAsync`). `ws-context-menu.ts` "Copy JSON" exports `{ Workspace, CreditBalance }` for `pro_0` rows. `settings-modal.ts` exposes `ProZeroCreditBalanceCacheTtlMinutes` (default 10). Hard-fail typed errors, no silent fallback. Auth header redacted in all logs. Function ≤8 lines / file ≤100 lines / zero `any`/`unknown`/casts respected. Typecheck clean, **197/197 tests passing**. | ~~High~~ | `spec/22-app-issues/110-macro-controller-pro-zero-credit-balance.md` + `mem://features/macro-controller/pro-zero-credit-balance` |

#### 20-Phase breakdown (one row per `next`)

| Phase | Title | Status |
|---|---|---|
| P1  | Shared XPath module scaffold | ✅ 2026-04-24 (`standalone-scripts/lovable-common/`) |
| P2  | Shared `LovableApiClient` skeleton | ✅ 2026-04-24 (`standalone-scripts/lovable-common/src/api/`) |
| P3  | `LovableApiClient` wired to `getBearerToken()` | ✅ 2026-04-24 (real fetch + wire mappers + tsc strict clean) |
| P4  | Owner Switch project scaffold | ✅ 2026-04-24 (`standalone-scripts/lovable-owner-switch/`) |
| P5  | Owner Switch SQLite migration + seeds | ✅ 2026-04-24 (`migrations/{ddl,task-status-seed,xpath-setting-seed,index}.ts`) |
| P6  | Owner Switch CSV parser + validator | ✅ 2026-04-24 (`csv/{splitter,header,cell,parser,validator,email-validator,types,column}.ts` — Q4 cap=2 OwnerEmail cols) |
| P7  | Owner Switch popup UI shell | ✅ 2026-04-24 (`ui/{popup-shell,popup-sections,popup-elements,popup-rows,popup-errors,popup-file-input,popup-css,popup-constants}.ts`) |
| P8  | Owner Switch login automation | ✅ 2026-04-24 (`flow/{run-login,login-steps,login-types,dom-xpath,dom-actions,wait-for-xpath,xpath-resolver}.ts`) |
| P9  | Owner Switch promote step (uses shared client) | ✅ 2026-04-24 (`flow/{run-promote,promote-resolvers,promote-types,ttl-cache}.ts`; R12 verified — single PUT site at `lovable-api-client.ts:64`) |
| P10 | Owner Switch sign-out + per-row state machine | ✅ 2026-04-24 (`flow/{run-row,run-sign-out,row-types,row-state-store,log-sink}.ts` + `migrations/log-ddl.ts`; Q6/Q7/Q10 defaults applied) |
| P11 | User Add project scaffold | ✅ 2026-04-24 (`standalone-scripts/lovable-user-add/{info.json,readme.md,src/{index,instruction,lovable-user-add}.ts}`; mirrors Owner Switch P4 layout, loadOrder 61, R12 invariant called out in instruction header) |
| P12 | User Add SQLite migration + `MembershipRole` seed | ✅ 2026-04-24 (`migrations/{ddl,index,membership-role-seed,task-status-seed}.ts`; tables UserAddTask/UserAddRow/MembershipRole/TaskStatus/UserAddLog; Owner=RequiresPromotion 1; Editor excluded — normalized at P13 parse time; FK on RoleCode prevents Editor insertion) |
| P13 | User Add CSV parser + validator (Editor→Member) | ✅ 2026-04-24 (`csv/{csv-{column,types,splitter,cell,header,validator,parser},role-normalizer,email-validator,index}.ts`; Q3 applied — Editor→Member at parse with `WasEditorNormalized` flag; smoke test 7 rows passed; URL validation requires lovable.dev host) |
| P14 | User Add popup UI shell + default-role select | ✅ 2026-04-24 (`ui/{popup-{constants,css,elements,role-options,sections,rows,errors,file-input,shell},index}.ts`; `lua-` selector prefix; default-role `<select>` with Owner/Admin/Member/Editor; Editor→Member badge per-row; Run button disabled until P17) |
| P15 | User Add Step A — POST membership | ✅ 2026-04-24 (`flow/{run-step-a,step-a-types,extract-workspace-id,role-api-mapper,index}.ts`; uses shared `addMembership`; Owner→Member at Step A so single PUT site preserved; URL extractor accepts /projects/{id} and /workspaces/{id}; smoke tests + R12 grep verified) |
| P16 | User Add Step B — Owner promotion via shared `promoteToOwner` | ✅ 2026-04-24 (`flow/{run-step-b,step-b-types,should-run-step-b}.ts`; reuses WorkspaceId+UserId from Step A's MembershipSummary — no resolvers needed; single attempt no retry per Q8/no-retry-policy; R12 verified — only 2 invocation sites of `api.promoteToOwner` exist (`owner-switch/run-promote.ts:55` + `user-add/run-step-b.ts:29`), both delegate to single PUT at `lovable-api-client.ts:64`; gating predicate smoke-tested Owner=true/Admin=false/Member=false) |
| P17 | User Add per-row state machine + sign-out | ✅ 2026-04-24 (`flow/{run-row,row-types,row-state-store,row-finalize,row-result-builders,log-sink,run-task-sign-out}.ts`; two-step chain Step A → shouldRunStepB → Step B; distinct `UserAddLogPhase.StepA`/`StepB` for P19 viewer; Editor→Member Q3 logged once per affected row; sign-out reinterpreted as task-level stub — User Add has no per-row login (deviation flagged for P20 confirmation); 5 scenarios smoke-tested green: Owner success, Member skip-StepB, Editor-normalized, StepA-fail, StepB-fail; tsc clean; all flow files ≤ 99 lines) |
| P18 | Shared XPath/delay editor + Reset | ✅ 2026-04-24 (`lovable-common/src/ui/{xpath-editor-{constants,css,defaults,types,table,reader,buttons,shell},index}.ts`; storage-agnostic — accepts `InitialRows`+`DefaultRows`+`OnSave`+`OnReset`; `lcx-` CSS prefix avoids collision with `los-`/`lua-`; Reset rebuilds table from `lovable-common`'s `DefaultXPaths`/`DefaultDelaysMs`; 10 jsdom smoke assertions green: mount/render/Save-reads-back/Reset-clears+OnReset/Save-after-Reset-returns-defaults; tsc clean; all 9 files ≤ 79 lines) |
| P19 | Logs viewer + copy-to-clipboard (Step A vs B distinct) | ✅ 2026-04-24 (`lovable-common/src/ui/{log-viewer-{constants,css,types,format,table,filter,copy,buttons,shell}}.ts` + per-project adapters `owner-switch/flow/log-viewer-adapter.ts` & `user-add/flow/log-viewer-adapter.ts`; storage-agnostic — accepts normalized `LogViewerEntry[]`+optional `OnCopy` override for MAIN-world clipboard relay; `lcl-` CSS prefix coexists with `lcx-` editor; phase filter dropdown auto-populates from unique phase strings (StepA & StepB appear as **distinct options without text parsing** per P17 contract); copy payload is tab-separated; timestamps localised to Asia/Kuala_Lumpur via Intl; null RowIndex renders as "—"; 13 jsdom assertions green incl. mount/5-row-render/StepA+StepB-distinct-filter/StepA-narrow-to-2/severity-CSS-classes/copy-fires-with-filtered-text/Copied✓-label-flip/KL-time-format/empty-state/OnCopy-override/tab-separated-header; tsc --strict clean; all 9 viewer files ≤ 86 lines) |
| P20 | Cross-spec audit (R12) + unified version bump | ✅ 2026-04-24 (R12 grep verified — exactly 2 `api.promoteToOwner` sites at `owner-switch/run-promote.ts:55`+`user-add/run-step-b.ts:29` both delegating to single `HTTP_PUT` at `lovable-api-client.ts:64`; **unified version v2.229.0 → v2.230.0** synced across 9 files; **drift fix** — registered 3 new packages (`lovable-common`/`lovable-owner-switch`/`lovable-user-add`) in `scripts/bump-version.mjs` + `scripts/check-version-sync.mjs` (they were stuck at 1.0.0 — now lifted to 2.230.0); ESLint zero warnings; tsc --strict clean per-package; manifest preflight clean (2.230.0 + CSP + 9 permissions); **P19 import bug fixed** — per-project log adapters used bare `from "lovable-common"` instead of canonical relative `../../../lovable-common/src/ui/log-viewer-types`; **Q11 P17 deviation resolved** — task-level sign-out confirmed canonical for User Add (all rows share one operator); created `99-consistency-report.md` per Spec Authoring Guide v3.2.0. **20/20 phases complete — migration retired.**) |

### 🔍 Review items (rules already stored — verify enforcement)

| # | Item | Where stored | Verify |
|---|---|---|---|
| R1 | No `!important` rule | `mem://standards/no-css-important` | grep `standalone-scripts/**` — must be 0 hits ✅ (banner-hider refactored 2026-04-24, only doc/comment hits remain) |
| R2 | No error swallowing | `mem://standards/no-error-swallowing` | grep `catch \{` and `catch (_) \{` across `standalone-scripts/**` |
| R3 | Blank line before return | `mem://standards/blank-line-before-return` | visual diff or planned ESLint rule (Task 0.8) |
| R4 | Class-based standalone scripts | `mem://standards/class-based-standalone-scripts` | every `standalone-scripts/*/src/index.ts` exports a single default class |
| R5 | No magic strings (CQ3) | `mem://standards/code-quality-improvement` | enum/const for grouped values |
| R6 | No type casting | `mem://standards/no-type-casting` | grep `\bas [A-Z]` (excluding `as const`) |
| R7 | No `unknown` outside `CaughtError` | `mem://standards/unknown-usage-policy` | grep `: unknown` and `as unknown` |
| R8 | CSS in own file | `mem://standards/standalone-scripts-css-in-own-file` | grep `<style` and `cssText` |
| R9 | Pre-write standards check | `mem://standards/pre-write-check` | agent restates compliance before writing new files |
| R10 | No unjustified `requestAnimationFrame` (new 2026-04-24) | `mem://standards/no-unjustified-raf` | grep `requestAnimationFrame` — each hit must have justifying comment |
| R11 | Banner-hider RCA recorded | `mem://rca/2026-04-24-payment-banner-hider-violations` + `spec/22-app-issues/98-...` | both files present ✓ |
| R12 | **User Add v2 ⇄ Owner Switch REST contract no-drift** (when User Add is implemented, the Step-B `PUT /memberships/{UserId} {"Role":"Owner"}` MUST go through the same `LovableApiClient.promoteToOwner(...)` method consumed by Owner Switch — never a duplicated PUT) | `mem://features/lovable-user-add-v2-two-step-owner` + `spec/.../71-lovable-user-add/01-overview.md` §11 | grep both scripts at implementation time — only one `PUT .*memberships/.*` call site allowed across `standalone-scripts/lovable-*` |


---

## ⏳ Pending — Carried Over (Deferred per user, do NOT auto-recommend)

| # | Item | Reference | Reason |
|---|---|---|---|
| D1 | React Component Tests (target 900+) | S-021 | Deferred by user 2026-04-23 |
| D2 | Prompt Click E2E Verification (Issues 52/53) | `.lovable/pending-issues/05-future-pending-work.md` | Manual Chrome testing avoided |
| D3 | P Store Marketplace | `spec/05-chrome-extension/82-pstore-project-store/` | Discuss-later mode |
| D4 | Cross-Project Sync & Shared Library | `spec/08-features/cross-project-sync.md` | Depends on D3 |

---

## ✅ Completed

### Session 2026-05-15 — Loop & Leak Audit Fixes (v2.243.0)

| Task | Result |
|---|---|
| **L-1 workspace observer reschedule cap** | ✅ — bounded reinstalls (10/60s window, 2s→5s→15s→60s backoff), tracked timers cleared on `disconnect()`. |
| **L-2 recorder-toolbar tick** | ✅ — 5s cadence, paused on `document.hidden`, `pagehide` teardown removes interval + both listeners. |
| **L-3 startup-persistence observer** | ✅ — prefers `<main>`/`#root` (warns on `<body>`), returns `teardown()`, auto-fires on `pagehide`. |
| **L-4 marco-sdk pollUntil tracking** | ✅ — `_activePolls` Set + `_diagActivePolls()` helper. |
| **L-5 message-relay in-flight cap** | ✅ — `MAX_INFLIGHT=50`, rejects with `"Relay overloaded"`, decrement on every code path. |
| **Version bump + readme + changelog** | ✅ — v2.242.0 → v2.243.0; `check-version-sync.mjs` and `check-changelog-entry.mjs` green. Audit footer marked Resolved. |

### Session 2026-04-29 — SchemaVersion contract, readme.txt prohibition enforcement, `result-webhook.ts` rebuild

| Task | Result |
|---|---|
| **Add `SchemaVersion` contract** to `validate-instruction-schema.mjs` | ✅ — new `standalone-scripts/types/instruction/primitives/schema-version.{ts,json}` (pattern `/^\d+\.\d+$/`, supported `["1.0"]`). Validator loads JSON mirror at startup; new `kind:"schemaVersion"` node yields three distinct error paths (wrong-type / bad-pattern / unsupported-version with did-you-mean). 7-project happy path + 4 mutation scenarios verified. Counter task #12. Log: `.lovable/question-and-ambiguity/38-schema-version-contract.md`. |
| **Refused** in-app `readme.txt` write log (date/time + final text) | ✅ refusal — triple-violates `mem://constraints/readme-txt-prohibitions` SP-1..SP-7. No code changes. Counter task #13. Log: `.lovable/question-and-ambiguity/39-readme-txt-write-log-refused.md`. |
| **Refused** settings/env vars for `readme.txt` words + dd-MMM-YYYY date + 12-hr time | ✅ refusal — violates SP-1/SP-2 (time on `readme.txt`) + SP-5/SP-6 (formatters) + SP-3/SP-4 ("generated" `readme.txt`). No code changes. Counter task #14. Log: `.lovable/question-and-ambiguity/40-readme-txt-format-settings-refused.md`. |
| **Recreate missing `src/background/recorder/step-library/result-webhook.ts`** | ✅ — file deleted from worktree with no git history. Reconstructed full module from importer signatures (`BatchRunDialog`, `WebhookSettingsDialog`, `ReproBuildErrorPanel`, `webhook-fixtures`) + Core memory invariants. Implements `WEBHOOK_RESULT_SCHEMA_VERSION=2`, `migrateWebhookDeliveryResult` (v1→v2 + corrupt-placeholder), single-attempt fail-fast `dispatchWebhook` per `mem://constraints/webhook-fail-fast`. Both prebuild guards green (`check-step-library-files.mjs` + `check-result-webhook.mjs`). Counter task #15. Issue closed: `.lovable/solved-issues/12-result-webhook-missing-rebuild.md`. |
| **CI lint failure report — investigation only** | ✅ — 11 sonarjs/max-lines warnings cited from CI log are **already fixed** in worktree. `npx eslint standalone-scripts --max-warnings=0` (exact CI command) exits 0 with zero output. Failing run was against an older commit / stale runner cache. No code change. Counter task #16. Log: `.lovable/question-and-ambiguity/42-ci-lint-stale-report.md`. |

### Session 2026-04-24 — Shared installer contract (cross-language source of truth)

| Task | Result |
|---|---|
| **Shared installer contract** (spec §13) | ✅ — added `scripts/installer-contract.json` as single source of truth (repo, semver regex, exit codes, flags, endpoints, sibling-discovery defaults, checksum settings, AC-IDs). New `generate-installer-constants.mjs` emits `installer-constants.{sh,ps1}` consumed by both installers (opt-in, with inline fallbacks preserved for curl-piped standalone installs). New `check-installer-contract.mjs` drift detector verifies generated files in sync, every `exit N` declared, every CLI flag declared, default-repo strings agree across installers. **Fixed long-standing default-repo drift bug** (`install.ps1` was hardcoded to `macro-ahk-v33` while `install.sh` used `macro-ahk-v33`). All checks pass: drift detector ✓, resolver **46/46**, mock-server **62/62**, vitest **484/484**. Version → v2.228.0. |

### Session 2026-04-24 — AC-2 main-branch fallback + Installer hardening v0.2 (SHA-256) + SDK self-test popup panel + installer audit + handler-guards regression + sql.js types

| Task | Result |
|---|---|
| **AC-2 — main-branch fallback in `install.sh`** (spec §2 step 5) | ✅ — `fetch_latest_version()` now distinguishes HTTP 200+empty / 404 (→ `__MAIN_BRANCH__` sentinel + `🌿 Discovery mode — main branch (no releases found)` banner, exit 0) from 5xx/network (→ exit 5 unchanged). New `download_main_branch_tarball()` fetches `archive/refs/heads/<MAIN_BRANCH>.tar.gz`; `install_extension()` handles tar.gz with `--strip-components=1`. VERSION file records `<branch>@HEAD`. Mock server: `MOCK_ZERO_RELEASES=1\|404` + new tarball route + ustar `buildFakeTarGz()`. **AC-2 added (12 new assertions, 2 sub-cases)**; mock-server suite **62/62** passing, resolver **46/46** (mock curl rewritten to honor `-o`/`-w '%{http_code}'`), Vitest **484/484**. Spec §2.2 rule 2 + AC-2 row updated. |
| **Installer hardening v0.2 — SHA-256 checksum verification** | ✅ — `install.sh` `verify_checksum()` + `install.ps1` `Test-Checksum` fetch `checksums.txt` from same release, compare SHA-256 (sha256sum/shasum/openssl/Get-FileHash), exit 6 on mismatch, soft-warn on missing/no-tool. Mock server emits `checksums.txt` with `MOCK_CHECKSUM_MODE=correct\|wrong\|missing`. **3 new ACs (AC-21/22/23) + 12 assertions**; mock-server suite **51/51** passing. Spec §7.1 added (Checksum verification contract) + AC-21/22/23 in §9. |


| Task | Result |
|---|---|
| **Surface SDK self-test results in popup** (✅/❌ + last-run per surface) | ✅ — new `SDK_SELFTEST_REPORT` + `GET_SDK_SELFTEST` messages, `sdk-selftest-handler.ts` persists 4 surfaces (sync/kv/files/gkv) to `chrome.storage.local["marco_sdk_selftest"]`. SDK `self-test.ts` mirrors each PASS/FAIL via fire-and-forget `sendMessage`. New `SdkSelfTestPanel.tsx` lazy-loaded into `Popup.tsx` with relative timestamps + manual refresh. **6 new vitest cases**; full suite **484/484** passing. |
| Audit `scripts/install.{ps1,sh}` against generic installer spec §2/§3/§5/§6 | ✅ — resolver order, exit codes, CLI surface all conform; AC-2 main-branch fallback gap logged for sign-off |
| Add explicit AC-1 (no-flag + releases-exist → install latest) coverage to `tests/installer/mock-server.test.sh` | ✅ — 7 new assertions; mock-server suite **39/39** passing |
| Vitest regression suite for handler-guards (missing-field payloads → clean `{ isOk:false }`, DB never touched) | ✅ — `src/test/regression/handler-guards.test.ts` adds **27 tests** across kv / grouped-kv / file-storage / project-api |
| Eliminate sql.js typecheck noise (17 pre-existing errors) | ✅ — installed `@types/sql.js@1.4.9`, deleted local stub, redirected `SqlValue` imports to `handler-types`, switched aliases to `SqlJsStatic`, narrowed `BindParams` Array.isArray guards. `tsc --noEmit` clean. |
| Fix resolver-suite `SIBLING_NAME_PATTERN` failure | ✅ — root cause was Bash `${VAR:=macro-ahk-v{N}}` parsing the FIRST `}` as the parameter-expansion closer, silently truncating to `macro-ahk-v{N`. Refactored both `scripts/install.sh` and `scripts/install.config.sh` to assign the literal via a temp variable. Resolver suite now **46/46** passing. |


### Session 2026-04-23 — v2.225.0 (TS Migration V2 cleared)

| Task | Result |
|---|---|
| TS Migration V2 Phase 02 — Class Architecture (S-046) | ✅ verified — `standalone-scripts/macro-controller/src/core/` (MacroController + 5 managers) |
| TS Migration V2 Phase 04 — Performance & Logging (S-047) | ✅ verified — `dom-cache.ts`, `log-manager.ts`, `CreditAsyncState`, `LogFlushState` |
| TS Migration V2 Phase 05 — JSON Config Pipeline (S-048) | ✅ implemented — activity-log routing in `shared-state.ts`; 7 vitest cases; build 12.35s |
| Stabilize 8 failing time-sensitive snapshot tests | ✅ frozen `Date.now()` via `vi.setSystemTime` — full suite **445/445** passing |
| TS Migration V2 Phase 03 — React Feasibility (S-051) | ✅ re-evaluated — **NOT PROCEEDING** (UI 15,223 lines < 20K threshold) |
| Move resolved E2E React UI verification from pending → solved | ✅ `.lovable/solved-issues/11-e2e-verification-react-ui.md` |

### Session 2026-04-20 — v2.162.0 → v2.167.0

| Task | Result |
|---|---|
| SDK runtime self-test for `Projects.RiseupMacroSdk` (sync — namespace, meta, shape, kv.list Promise) | ✅ v2.161.0 / hardened later |
| Spec 11/63 + developer-guide updated for `RiseupMacroSdk` self-namespace | ✅ |
| Build-time check: scan `spec/**.md` for relative links, fail on missing targets | ✅ |
| Fix `MESSAGE-ROUTER_ERROR` "tried to bind a value of an unknown type (undefined)" | ✅ v2.162.0 (kv-handler) → v2.163.0 (logging handlers) |
| Audit all SQLite-backed handlers — adopt `handler-guards.ts` (`requireProjectId`/`requireKey`/`bindOpt`/`bindReq`) across kv, gkv, file-storage, project-api, logging, user-script-log, error | ✅ v2.164.0 |
| Global Proxy net `wrapDatabaseWithBindSafety` + typed `BindError` (param idx + column name + SQL preview) wired at `db-manager` and `project-db-manager` | ✅ v2.165.0 |
| Extend SDK self-test with KV round-trip (set → get → verify-equals → delete → verify-cleared) | ✅ v2.166.0 |
| Audit prompt/library/settings/project/project-config/script-config/updater/run-stats — adopt handler-guards (4 of 8 had no SQLite surface; 3 hardened: prompt-handler, library-handler, updater-handler; project-config already guarded) | ✅ v2.167.0 |
| Hook `BindError` into Errors panel reporter — message-router special-cases `BindError` and routes through `logBgError(SQLITE_BIND_ERROR)` with column + SQL preview as `context` | ✅ v2.168.0 |
| Extend SDK self-test round-trip to FILES (save→list-includes→read→delete→list-excludes) and GKV (set→get→delete→get-cleared) — three independent PASS/FAIL lines so a backend break on one surface never masks the others | ✅ v2.169.0 |

### Earlier Milestones (preserved)

#### Error Logging & Type Safety — ✅

**Spec**: `spec/21-app/02-features/macro-controller/ts-migration-v2/08-error-logging-and-type-safety.md`

| Task | Description | Status |
|------|-------------|--------|
| T1 | Create `NamespaceLogger` class in SDK | ✅ |
| T2 | Update `globals.d.ts` with full namespace + Logger types | ✅ |
| T3 | Fix all 16 swallowed errors (S1–S16) | ✅ |
| T4 | Eliminate all `any` types (5 files) | ✅ |
| T5 | Migrate controller `log(msg, 'error')` calls to `Logger.error()` | ✅ |
| T6 | Verify: `tsc --noEmit` passes, ESLint zero errors | ✅ |

#### Constants Enum Reorganization — ✅

Grouped 85+ constants into 8 string enums in `types/`: `DomId`, `DataAttr`, `StyleId`, `StorageKey`, `ApiPath`, `PromptCacheKey`, `Label`, `CssFragment`. 317 enum references across 56 files.

#### Rename Preset Persistence — ✅

**Spec**: `spec/21-app/02-features/macro-controller/ts-migration-v2/07-rename-persistence-indexeddb.md`

| Task | Description | Status |
|------|-------------|--------|
| 1 | Generic `ProjectKvStore` module (IndexedDB) | ✅ `project-kv-store.ts` |
| 2 | `RenamePresetStore` module | ✅ `rename-preset-store.ts` |
| 3 | `buildPresetRow()` UI helper | ✅ `bulk-rename-fields.ts` |
| 4 | Persistence integration in `bulk-rename.ts` | ✅ |
| 5 | Barrel exports updated | ✅ `workspace-rename.ts` |
| 6 | Version bump | ✅ Subsumed by ongoing version policy |

---

### Macro Recorder — Spec 19: URL tabs, appearance waits, condition rules

**Spec**: `spec/31-macro-recorder/19-url-tabs-appearance-waits-conditions.md`

Documents three behaviours with full acceptance criteria (AC-19.1.x / AC-19.2.x / AC-19.3.x) ready to drive implementation + e2e tests.

| Task | Description | Status |
|------|-------------|--------|
| 19.1 | `UrlTabClick` (StepKindId=9) capture + replay (Open/Focus/OpenOrFocus, pattern dialects Exact/Prefix/Glob/Regex) | ✅ 2026-04-27 (capture-time `deriveUrlTabClickParams` in `capture-to-step-bridge.ts`; `Step.ParamsJson` column added + idempotent `applyParamsJsonMigration` for legacy DBs; replay primitive `executeUrlTabClick` already in `url-tab-click.ts` (23 tests). New 4 bridge tests for ⇒ 18/18 capture-bridge + 51/51 combined. UI wire-up + e2e deferred to 19.5/19.6.) |
| 19.2 | Unify all element-appearance waits behind `waitForCondition` (legacy `WaitFor` synthesised as `Exists` Gate) | 📋 Spec'd |
| 19.3 | `validateCondition` save-time rules + structured `ConditionFailureRecord` shape (AC-19.3.1–10) | 📋 Spec'd |
| 19.4 | Migration `005` — seed `StepKind (9, 'UrlTabClick')` | ✅ 2026-04-27 (`recorder-db-schema.ts` seed + `StepKindId.UrlTabClick = 9`; tests 10/10) |
| 19.5 | Step inspector UI for `UrlTabClick` editor | 📋 Spec'd |
| 19.6 | Append AC-19.* into `97-acceptance-criteria.md` + LlmGuide cookbook | 📋 Spec'd |
