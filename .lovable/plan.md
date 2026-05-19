# Macro Controller — Workspace Hover Tooltip & Members Panel Overhaul

Scope: the workspace chip/section in the Macro Controller floating UI. Today there are **two tooltips** stacked, both verbose. Goal: one compact, colorful, scannable tooltip with progressive disclosure, plus a real Members management popup (add / remove / promote-to-owner) and removal of the unused Settings button.

No code is written in this pass — this file is the spec + 15-step task list. Implementation begins on the next `next`.

---

## Problems observed

1. **Two tooltips** appear on hover over the workspace in the macro-controller script section. Confusing — only one should exist.
2. Tooltip is **too tall / too wide**, hard to read at a glance.
3. Information is laid out one-fact-per-line. Credits (available / daily / used) take 3 lines but belong on one.
4. **Priority / "letter, top wins"** explainer is always-visible noise — should be collapsed by default.
5. **Refill date** and **expiry date** are the high-value facts but are buried.
6. Visual style is monochrome — needs color cues (green = healthy, amber = low, red = exhausted, blue = info).
7. A **Settings (gear) button** is rendered that opens a "Macro Settings" dialog with credit / grace-period fields the user cannot actually modify. It is dead UI and should be removed (or justified).
8. **Show Members** currently renders a plain list. It should be a **popup panel** (same shape as the Rename panel) with:
   - List of members
   - **Add user** (by email)
   - **Remove user**
   - **Promote to Owner**
   The relevant workspace member-management JSON APIs were already shared by the user previously.

---

## Target design — compact tooltip

Single tooltip, ~280px wide, 3 zones:

```text
┌──────────────────────────────────────────┐
│ ● Workspace Name              [Pro plan] │  ← header (status dot + name + plan chip)
├──────────────────────────────────────────┤
│ Credits  142 avail / 50 daily / 8 used   │  ← one line, color-coded numbers
│ Refill   in 3d (May 22)                  │  ← high-priority
│ Expires  in 27d (Jun 15)                 │  ← high-priority
├──────────────────────────────────────────┤
│ ▸ Priority rules                         │  ← collapsed; click to expand
└──────────────────────────────────────────┘
```

Color rules:
- Available credits ≥ 50% daily → `--success`
- 10–50% → `--warning`
- < 10% → `--destructive`
- Refill/expiry within 24h → `--warning`; expired → `--destructive`
- Plan chip uses `--accent`

Expanded "Priority rules" reveals the existing letter/top-wins explainer verbatim — no information loss, just hidden by default.

---

## Target design — Members popup

Reuse the Rename panel chrome (same position, animation, dismissal). Sections:

1. Header: "Members — <workspace name>" + close
2. List rows: avatar/initials · display name · email · role chip · row actions (`⋯` → Promote to Owner / Remove)
3. Footer: `+ Add member` → inline email input + role select (member/owner) + Send invite

Calls (already provided by user previously; confirm in step 02):
- `GET /workspaces/{wsId}/memberships/search` (already wired in `ws-members-fetch.ts`)
- `POST` invite member
- `DELETE` membership
- `PATCH` change role → owner

---

## 15-step task list

| # | Task | Outcome |
|---|------|---------|
| 01 | Write the spec under `spec/22-app-issues/` covering tooltip + members popup + settings-button removal | Reviewable spec, single source of truth |
| 02 | Audit current code: locate both tooltip renderers, the settings button, and the members list component; document call sites | RCA note in spec |
| 03 | Confirm the four workspace member-management API endpoints (search / invite / remove / promote) from prior chat + sdk surface | API contract section in spec |
| 04 | Remove the duplicate (second) tooltip so only one renders on hover | Single tooltip on hover |
| 05 | Restructure tooltip markup into 3 zones (header / priority facts / collapsible) with compact CSS (~280px) | New compact layout, no info loss |
| 06 | Combine credits into one line: `N avail / N daily / N used` with per-number color tokens | One-line credits row |
| 07 | Promote **Refill in** and **Expires in** to the priority zone with relative + absolute date | Refill/expiry visible at a glance |
| 08 | Move the "Priority — letter, top wins" block into a collapsed `<details>` (closed by default) | Noise hidden, available on demand |
| 09 | Apply color tokens (success / warning / destructive / accent) per the rules above | Colorful, semantic states |
| 10 | Remove the Settings (gear) button + its modal from the workspace section (dead UI) | Cleaner header |
| 11 | Convert "Show Members" trigger to open a popup panel using the Rename-panel chrome | Members popup shell |
| 12 | Render member rows: avatar/initials, name, email, role chip, row action menu | Readable list |
| 13 | Implement **Add member** (email + role) wired to invite endpoint, with optimistic insert + error toast | Add works |
| 14 | Implement **Remove member** and **Promote to Owner** with confirm step + cache invalidation via `clearMembersCache` | Remove + promote work |
| 15 | Tests: vitest for tooltip layout (single instance, collapsed priority, color classes) + members panel (add/remove/promote dispatch correct API). Update `ws-members-fetch` test if surface changed. | Regression coverage |

---

## Out of scope

- Backend changes (none — only consuming existing endpoints).
- Restyling of the rest of the Macro Controller UI.
- Adding new credit/grace-period editing (user explicitly says these aren't modifiable).

---

## Next

Awaiting `next` to begin task 01.
