import { afterEach, beforeEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import "../i18n";

// Without Vitest's `globals: true`, @testing-library/react's automatic
// afterEach(cleanup) never registers, so the DOM from one test leaks into
// the next within the same file — this makes that explicit instead.
afterEach(() => {
	cleanup();
});

// vi.mock() call history otherwise persists across tests in the same file,
// so an assertion can pass or fail based on what an earlier test did.
beforeEach(() => {
	vi.clearAllMocks();
});
