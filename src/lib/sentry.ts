import * as Sentry from "@sentry/react";

/** No-ops when VITE_SENTRY_DSN isn't set at build time — same "blank means off" posture as every other optional integration in this app. */
export function initSentry(): void {
	const dsn = import.meta.env.VITE_SENTRY_DSN;
	if (!dsn) {
		return;
	}
	Sentry.init({
		dsn,
		environment: import.meta.env.VITE_SENTRY_ENVIRONMENT || "development",
		release: import.meta.env.VITE_SENTRY_RELEASE || undefined,
		// Never send the visitor's IP, cookies, or headers by default — this
		// app logs personal notes and energy readings, and this is the
		// SDK's own privacy-conservative default; kept explicit on purpose.
		sendDefaultPii: false,
	});
}
