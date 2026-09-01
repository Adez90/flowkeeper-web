import { describe, expect, it, vi, beforeEach } from "vitest";
import { apiFetchJson, ApiError } from "./client";

describe("apiFetchJson", () => {
	beforeEach(() => {
		globalThis.fetch = vi.fn();
	});

	it("attaches the bearer token and JSON content type", async () => {
		vi.mocked(globalThis.fetch).mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }));

		await apiFetchJson("/api/v1/me", { token: "test-token" });

		const [, init] = vi.mocked(globalThis.fetch).mock.calls[0];
		const headers = init?.headers as Record<string, string>;
		expect(headers.Authorization).toBe("Bearer test-token");
		expect(headers["Content-Type"]).toBe("application/json");
	});

	it("parses a successful JSON response", async () => {
		vi.mocked(globalThis.fetch).mockResolvedValue(new Response(JSON.stringify({ hello: "world" }), { status: 200 }));

		const result = await apiFetchJson<{ hello: string }>("/api/v1/me");

		expect(result).toEqual({ hello: "world" });
	});

	it("returns undefined for an empty body (e.g. 204)", async () => {
		vi.mocked(globalThis.fetch).mockResolvedValue(new Response(null, { status: 204 }));

		const result = await apiFetchJson("/api/v1/events/1/complete");

		expect(result).toBeUndefined();
	});

	it("throws ApiError with the raw body when the response isn't JSON", async () => {
		vi.mocked(globalThis.fetch).mockResolvedValue(new Response("Not a member of this account", { status: 403 }));

		await expect(apiFetchJson("/api/v1/events")).rejects.toMatchObject(new ApiError(403, "Not a member of this account"));
	});

	it("extracts just the message from the API's JSON error body, not the raw JSON", async () => {
		vi.mocked(globalThis.fetch).mockResolvedValue(
			new Response(
				JSON.stringify({ message: "File is too large — please choose a smaller image", status: 413, timestamp: "2026-08-31T10:00:00Z" }),
				{ status: 413 },
			),
		);

		await expect(apiFetchJson("/api/v1/me/avatar")).rejects.toMatchObject(
			new ApiError(413, "File is too large — please choose a smaller image"),
		);
	});
});
