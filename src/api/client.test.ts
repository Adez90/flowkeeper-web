import { describe, expect, it, vi, beforeEach } from "vitest";
import * as Sentry from "@sentry/react";
import { apiFetchJson, ApiError } from "./client";

vi.mock("@sentry/react", () => ({
	captureException: vi.fn(),
	addBreadcrumb: vi.fn(),
}));

describe("apiFetchJson", () => {
	beforeEach(() => {
		globalThis.fetch = vi.fn();
		vi.mocked(Sentry.captureException).mockClear();
		vi.mocked(Sentry.addBreadcrumb).mockClear();
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

	it("reports a 5xx to Sentry as a real event, not just a breadcrumb", async () => {
		vi.mocked(globalThis.fetch).mockResolvedValue(new Response("boom", { status: 500 }));

		await expect(apiFetchJson("/api/v1/events")).rejects.toThrow();

		expect(Sentry.captureException).toHaveBeenCalledWith(expect.any(ApiError), { tags: { endpoint: "/api/v1/events" } });
		expect(Sentry.addBreadcrumb).not.toHaveBeenCalled();
	});

	it("reports a 4xx as a breadcrumb only, not a Sentry event", async () => {
		vi.mocked(globalThis.fetch).mockResolvedValue(new Response("Not a member of this account", { status: 403 }));

		await expect(apiFetchJson("/api/v1/events")).rejects.toThrow();

		expect(Sentry.addBreadcrumb).toHaveBeenCalledWith(
			expect.objectContaining({ category: "api", message: "/api/v1/events → 403", level: "warning" }),
		);
		expect(Sentry.captureException).not.toHaveBeenCalled();
	});

	it("reports a raw network failure (fetch itself throwing) as a Sentry event", async () => {
		vi.mocked(globalThis.fetch).mockRejectedValue(new TypeError("Failed to fetch"));

		await expect(apiFetchJson("/api/v1/events")).rejects.toThrow("Failed to fetch");

		expect(Sentry.captureException).toHaveBeenCalledWith(expect.any(TypeError), { tags: { endpoint: "/api/v1/events" } });
	});
});
