import type { ReactElement, ReactNode } from "react";
import { render } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";

/** Fresh QueryClient per render — no caching leaking between tests. */
function createTestQueryClient() {
	return new QueryClient({
		defaultOptions: {
			queries: { retry: false },
			mutations: { retry: false },
		},
	});
}

// Triggers oxlint's "only export components" fast-refresh rule below,
// which doesn't apply here — this file is a test helper, never hot-reloaded.
function makeProviders(initialEntries: string[]) {
	return function Providers({ children }: { children: ReactNode }) {
		return (
			<QueryClientProvider client={createTestQueryClient()}>
				<MemoryRouter initialEntries={initialEntries}>{children}</MemoryRouter>
			</QueryClientProvider>
		);
	};
}

/** `route` sets the MemoryRouter's starting location — only needed by a test whose component reads the URL itself (useSearchParams, useLocation). */
export function renderWithProviders(ui: ReactElement, options?: { route?: string }) {
	return render(ui, { wrapper: makeProviders(options?.route ? [options.route] : ["/"]) });
}
