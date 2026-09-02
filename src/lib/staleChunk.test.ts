import { describe, expect, it } from "vitest";
import { isStaleChunkError } from "./staleChunk";

describe("isStaleChunkError", () => {
	it("matches Chromium's dynamic-import failure message", () => {
		expect(isStaleChunkError(new Error("Failed to fetch dynamically imported module: https://example.com/assets/pdfmake-abc123.js"))).toBe(
			true,
		);
	});

	it("matches Firefox's phrasing", () => {
		expect(isStaleChunkError(new Error("error loading dynamically imported module"))).toBe(true);
	});

	it("matches Safari's phrasing", () => {
		expect(isStaleChunkError(new Error("Importing a module script failed"))).toBe(true);
	});

	it("is false for an unrelated error", () => {
		expect(isStaleChunkError(new Error("Network request failed"))).toBe(false);
	});

	it("is false for a non-Error value", () => {
		expect(isStaleChunkError("just a string")).toBe(false);
	});
});
