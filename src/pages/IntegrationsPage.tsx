import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "react-oidc-context";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { disconnect, listConnections, listProviders, startAuthorization } from "../api/integrations";
import { useActiveAccount } from "../context/ActiveAccountContext";
import type { ConnectionResponse, ExternalProvider } from "../api/types";

// Apple/iOS calendar (EventKit) is mobile-only by design — reading the
// phone's own calendar has no server-side OAuth step at all, so there's
// nothing for this page to offer; see the "Available on mobile" note below
// instead. Fixed display order, not alphabetical or enum order.
const WEB_PROVIDERS: ExternalProvider[] = ["GOOGLE_CALENDAR", "MICROSOFT_CALENDAR", "STRAVA"];

export function IntegrationsPage() {
	const auth = useAuth();
	const { t } = useTranslation();
	const queryClient = useQueryClient();
	const { accountId } = useActiveAccount();
	const token = auth.user?.access_token ?? "";
	const [searchParams, setSearchParams] = useSearchParams();
	const [connectingProvider, setConnectingProvider] = useState<ExternalProvider | null>(null);
	const [error, setError] = useState<string | null>(null);
	// Captured once from the initial URL, not re-read from searchParams —
	// the effect below strips the query param right after mount for a
	// clean URL, which would otherwise erase the banner before anyone saw it.
	const [connectedResult] = useState(() => searchParams.get("connected"));

	// The OAuth callback's own success/error lands here as a query param —
	// clear it so a page refresh doesn't keep re-showing the banner.
	useEffect(() => {
		if (connectedResult) {
			setSearchParams((params) => {
				params.delete("connected");
				return params;
			});
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	const providersQuery = useQuery({
		queryKey: ["integration-providers"],
		queryFn: () => listProviders(token),
	});
	const connectionsQuery = useQuery({
		queryKey: ["integration-connections", accountId],
		queryFn: () => listConnections(token, accountId),
		enabled: Boolean(accountId),
	});

	const disconnectMutation = useMutation({
		mutationFn: (connectionId: string) => disconnect(token, connectionId),
		onSuccess: () => {
			setError(null);
			return queryClient.invalidateQueries({ queryKey: ["integration-connections", accountId] });
		},
		onError: () => setError(t("integrations.couldntDisconnect")),
	});

	async function handleConnect(provider: ExternalProvider) {
		setError(null);
		setConnectingProvider(provider);
		try {
			const { authorizationUrl } = await startAuthorization(token, provider, accountId);
			// A real redirect, not a fetch — the provider's own consent
			// screen needs the full page, not an XHR response.
			window.location.href = authorizationUrl;
		} catch {
			setError(t("integrations.couldntStart"));
			setConnectingProvider(null);
		}
	}

	function connectionFor(provider: ExternalProvider): ConnectionResponse | undefined {
		return connectionsQuery.data?.find((c) => c.provider === provider);
	}

	if (providersQuery.isLoading) {
		return (
			<div className="integrations-page">
				<h1>{t("integrations.title")}</h1>
				<p className="page-loading">{t("common.loading")}</p>
			</div>
		);
	}

	if (providersQuery.isError) {
		return (
			<div className="integrations-page">
				<h1>{t("integrations.title")}</h1>
				<p className="error-text">{t("integrations.couldntLoadProviders")}</p>
			</div>
		);
	}

	return (
		<div className="integrations-page">
			<h1>{t("integrations.title")}</h1>
			<p className="integrations-page__intro">{t("integrations.intro")}</p>

			{connectedResult === "success" && <p className="integrations-page__banner integrations-page__banner--success">{t("integrations.connectedSuccess")}</p>}
			{connectedResult === "error" && <p className="integrations-page__banner integrations-page__banner--error">{t("integrations.connectedError")}</p>}
			{connectionsQuery.isError && <p className="error-text">{t("integrations.couldntLoadConnections")}</p>}
			{error && <p className="error-text">{error}</p>}

			<ul className="integrations-page__list">
				{WEB_PROVIDERS.map((provider) => {
					const providerInfo = providersQuery.data?.find((p) => p.provider === provider);
					const available = providerInfo?.available ?? false;
					const connection = connectionFor(provider);
					const isConnected = connection?.status === "CONNECTED";
					const isError = connection?.status === "ERROR";
					const isConnecting = connectingProvider === provider;

					return (
						<li key={provider} className="integrations-page__item">
							<div>
								<strong>{t(`integrations.providers.${provider}`)}</strong>
								{isConnected && (
									<span className="integrations-page__status integrations-page__status--connected">
										{connection.externalAccountLabel
											? t("integrations.connectedAs", { label: connection.externalAccountLabel })
											: t("integrations.connected")}
									</span>
								)}
								{isError && <span className="integrations-page__status integrations-page__status--error">{t("integrations.errorState")}</span>}
								{!available && <span className="integrations-page__status">{t("integrations.notAvailable")}</span>}
							</div>

							{available && isConnected && (
								<button
									type="button"
									className="button"
									onClick={() => {
										if (window.confirm(t("integrations.disconnectConfirm"))) {
											disconnectMutation.mutate(connection.id);
										}
									}}
									disabled={disconnectMutation.isPending}
								>
									{disconnectMutation.isPending ? t("integrations.disconnecting") : t("integrations.disconnect")}
								</button>
							)}
							{available && !isConnected && (
								<button
									type="button"
									className="button button--primary"
									onClick={() => handleConnect(provider)}
									disabled={isConnecting}
								>
									{isConnecting ? t("integrations.connecting") : isError ? t("integrations.reconnect") : t("integrations.connect")}
								</button>
							)}
						</li>
					);
				})}
			</ul>

			<p className="integrations-page__apple-note">{t("integrations.appleNote")}</p>
		</div>
	);
}
