import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "react-oidc-context";
import { ErrorBoundary } from "@sentry/react";
import { oidcConfig } from "./auth/oidcConfig";
import { router } from "./router";
import { initSentry } from "./lib/sentry";
import "./i18n";
import "./index.css";

initSentry();

const queryClient = new QueryClient();

const rootElement = document.getElementById("root");
if (!rootElement) {
	throw new Error("#root element not found");
}

createRoot(rootElement).render(
	<StrictMode>
		<ErrorBoundary
			fallback={
				<div style={{ padding: "2rem", textAlign: "center" }}>
					<p>Something went wrong. Try reloading the page.</p>
				</div>
			}
		>
			<AuthProvider {...oidcConfig}>
				<QueryClientProvider client={queryClient}>
					<RouterProvider router={router} />
				</QueryClientProvider>
			</AuthProvider>
		</ErrorBoundary>
	</StrictMode>,
);
