/**
 * Marco Extension — Per-Tab Dismissed Origins (Step B / C)
 *
 * In-memory registry of (tabId, origin) pairs the user has explicitly
 * dismissed via the first-attach toast. While the entry is present the
 * auto-injector MUST short-circuit for that origin on that tab — no
 * re-evaluation, no probe, no injection.
 *
 * Scope: ephemeral, per-service-worker. Cleared on:
 *   - tab close (chrome.tabs.onRemoved)
 *   - top-level navigation to a different origin on the same tab
 *
 * Step C will add an optional chrome.storage.local persistence layer
 * keyed by origin only (cross-tab) — this module deliberately stays
 * tab-scoped to keep the contract narrow.
 *
 * See:
 *   - mem://features/auto-attach-policy.md (C1..C8 gates)
 *   - .lovable/audits/ link-click "opens the extension" investigation
 */

/** tabId -> Set<origin> the user dismissed on that tab. */
const dismissedByTab: Map<number, Set<string>> = new Map();

/** Normalizes a URL to its origin; returns "" when unparseable. */
function safeOrigin(url: string): string {
    try {
        return new URL(url).origin;
    } catch {
        return "";
    }
}

/** Records that the user dismissed the auto-attach prompt for this (tab, origin). */
export function dismissOriginForTab(tabId: number, url: string): void {
    const origin = safeOrigin(url);
    if (origin === "") return;
    let set = dismissedByTab.get(tabId);
    if (set === undefined) {
        set = new Set<string>();
        dismissedByTab.set(tabId, set);
    }
    set.add(origin);
}

/** Returns true when the user has dismissed this (tab, origin) pair. */
export function isOriginDismissedForTab(tabId: number, url: string): boolean {
    const origin = safeOrigin(url);
    if (origin === "") return false;
    const set = dismissedByTab.get(tabId);
    return set !== undefined && set.has(origin);
}

/** Clears all dismissed origins for a tab (call from tabs.onRemoved). */
export function clearDismissedOriginsForTab(tabId: number): void {
    dismissedByTab.delete(tabId);
}

/** Test-only inspector. */
export function _debugDumpDismissed(): Record<number, string[]> {
    const out: Record<number, string[]> = {};
    for (const [tabId, set] of dismissedByTab.entries()) {
        out[tabId] = Array.from(set);
    }
    return out;
}
