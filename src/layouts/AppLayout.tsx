import { Outlet } from "react-router-dom";
import { useAuth } from "react-oidc-context";
import { useQuery } from "@tanstack/react-query";
import { AppHeader } from "../components/AppHeader";
import { fetchMe } from "../api/me";
import { register } from "../api/registration";
import { ApiError } from "../api/client";
import { ActiveAccountProvider, useActiveAccount } from "../context/ActiveAccountContext";
import type { MeResponse } from "../api/types";

/** The AppHeader needs the active account's role/type for the Feedback nav link — pulled from context once inside the provider. */
function AppHeaderWithActiveAccount({ me }: { me: MeResponse }) {
	const { account } = useActiveAccount();
	return <AppHeader me={me} activeAccountRole={account.role} activeAccountType={account.type} />;
}

/**
 * Fetches the current profile exactly once per session. A 404 means this
 * is the very first login ever — register() is idempotent server-side, so
 * calling it here and only here (not on every load) is enough.
 */
export function AppLayout() {
	const auth = useAuth();
	const token = auth.user?.access_token ?? "";

	const meQuery = useQuery<MeResponse>({
		queryKey: ["me"],
		queryFn: async () => {
			try {
				return await fetchMe(token);
			} catch (err) {
				if (err instanceof ApiError && err.status === 404) {
					await register(token);
					return fetchMe(token);
				}
				throw err;
			}
		},
		enabled: Boolean(token),
	});

	if (!meQuery.data) {
		return (
			<div className="app-shell">
				<AppHeader />
				<main className="app-shell__content">
					{meQuery.isLoading && <p className="page-loading">Setting up your account…</p>}
					{meQuery.isError && <p className="error-text">Couldn't load your account. Try refreshing.</p>}
				</main>
			</div>
		);
	}

	return (
		<ActiveAccountProvider me={meQuery.data}>
			<div className="app-shell">
				<AppHeaderWithActiveAccount me={meQuery.data} />
				<main className="app-shell__content">
					<Outlet context={meQuery.data} />
				</main>
			</div>
		</ActiveAccountProvider>
	);
}
