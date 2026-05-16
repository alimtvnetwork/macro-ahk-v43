/**
 * Marco Extension — URL utility helpers
 *
 * Single source of truth for URL classification used across background,
 * matcher, and injection layers.
 *
 * See:
 *   - mem://features/new-tab-no-url-guard
 *   - spec/21-app/02-features/chrome-extension/05-content-script-adaptation.md §4a
 */

/**
 * Returns true when the URL represents a "new tab" or otherwise has no real
 * page address — i.e. there is nothing for the auto-injector or matcher to
 * act on. Always treat as a hard no-op upstream.
 *
 * Covered cases:
 *   - empty string, undefined, null
 *   - `about:blank` (any casing, with/without trailing slash, with hash/query)
 *   - `chrome://newtab/`, `chrome://new-tab-page/`
 *   - `chrome-search://local-ntp*` (the embedded Google new-tab page)
 *   - `edge://newtab/`, `brave://newtab/`, `opera://startpage/`
 *
 * Real `http(s)://` URLs always return false, even on the host root.
 */
export function isNewTabOrBlankUrl(url: string | undefined | null): boolean {
    const isMissing = url === undefined || url === null || url === "";
    if (isMissing) {
        return true;
    }

    const lower = url.trim().toLowerCase();

    if (lower === "") {
        return true;
    }

    // about:blank with optional /, ?query, #hash
    if (lower === "about:blank" || lower.startsWith("about:blank?") || lower.startsWith("about:blank#") || lower.startsWith("about:blank/")) {
        return true;
    }

    const NEW_TAB_PREFIXES = [
        "chrome://newtab",
        "chrome://new-tab-page",
        "chrome-search://local-ntp",
        "edge://newtab",
        "brave://newtab",
        "opera://startpage",
    ];

    for (const prefix of NEW_TAB_PREFIXES) {
        if (lower === prefix || lower.startsWith(`${prefix}/`) || lower.startsWith(`${prefix}?`) || lower.startsWith(`${prefix}#`)) {
            return true;
        }
    }

    return false;
}
