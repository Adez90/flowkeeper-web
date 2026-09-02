/**
 * True for a dynamic import() failure caused by the browser trying to fetch
 * a hashed chunk file that a newer deploy has since replaced (404 — the old
 * filename no longer exists on the server). The tab is just running a stale
 * bundle, not actually broken; a full reload re-fetches index.html, which
 * points at the current asset hashes, and the same action works again.
 * Browsers phrase the underlying error differently, so this matches the
 * common variants rather than one exact string.
 */
export function isStaleChunkError(error: unknown): boolean {
	if (!(error instanceof Error)) return false;
	return /failed to fetch dynamically imported module|error loading dynamically imported module|importing a module script failed/i.test(
		error.message,
	);
}
