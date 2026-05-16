import { describe, it, expect } from "vitest";
import { urlFingerprint } from "../url-fingerprint";

describe("urlFingerprint", () => {
    it("strips hash fragments", () => {
        expect(urlFingerprint("https://x.test/a#one"))
            .toBe(urlFingerprint("https://x.test/a#two"));
    });

    it("is order-insensitive across query params", () => {
        expect(urlFingerprint("https://x.test/a?b=2&a=1"))
            .toBe(urlFingerprint("https://x.test/a?a=1&b=2"));
    });

    it("distinguishes different paths", () => {
        expect(urlFingerprint("https://x.test/a"))
            .not.toBe(urlFingerprint("https://x.test/b"));
    });

    it("distinguishes different origins", () => {
        expect(urlFingerprint("https://x.test/a"))
            .not.toBe(urlFingerprint("https://y.test/a"));
    });

    it("distinguishes different param values", () => {
        expect(urlFingerprint("https://x.test/a?id=1"))
            .not.toBe(urlFingerprint("https://x.test/a?id=2"));
    });

    it("falls back to raw string for malformed URL", () => {
        expect(urlFingerprint("not a url")).toBe("not a url");
    });

    it("treats no-params and empty-params as equivalent", () => {
        expect(urlFingerprint("https://x.test/a"))
            .toBe(urlFingerprint("https://x.test/a?"));
    });
});
