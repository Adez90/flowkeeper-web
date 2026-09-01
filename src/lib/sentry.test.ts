import { describe, expect, it, vi, afterEach } from "vitest";
import * as Sentry from "@sentry/react";
import { initSentry } from "./sentry";

vi.mock("@sentry/react", () => ({ init: vi.fn() }));

describe("initSentry", () => {
	afterEach(() => {
		vi.unstubAllEnvs();
		vi.mocked(Sentry.init).mockClear();
	});

	it("does not initialize Sentry when no DSN is configured", () => {
		vi.stubEnv("VITE_SENTRY_DSN", "");

		initSentry();

		expect(Sentry.init).not.toHaveBeenCalled();
	});

	it("initializes Sentry with the configured DSN, environment, and release", () => {
		vi.stubEnv("VITE_SENTRY_DSN", "https://examplePublicKey@o0.ingest.sentry.io/0");
		vi.stubEnv("VITE_SENTRY_ENVIRONMENT", "staging");
		vi.stubEnv("VITE_SENTRY_RELEASE", "abc123");

		initSentry();

		expect(Sentry.init).toHaveBeenCalledWith({
			dsn: "https://examplePublicKey@o0.ingest.sentry.io/0",
			environment: "staging",
			release: "abc123",
			sendDefaultPii: false,
		});
	});
});
