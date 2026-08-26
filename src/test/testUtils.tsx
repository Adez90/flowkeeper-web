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
function Providers({ children }: { children: ReactNode }) {
	return (
		<QueryClientProvider client={createTestQueryClient()}>
			<MemoryRouter>{children}</MemoryRouter>
		</QueryClientProvider>
	);
}

export function renderWithProviders(ui: ReactElement) {
	return render(ui, { wrapper: Providers });
}
