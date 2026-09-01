import { apiFetchJson } from "./client";

/** Always throws — a deliberate 500 the API raises on purpose so we can confirm Sentry receives it. */
export function triggerTestError(token: string): Promise<void> {
	return apiFetchJson<void>("/api/v1/diagnostics/test-error", { method: "POST", token });
}
