import { apiFetchJson } from "./client";
import type {
	AuthorizationUrlResponse,
	ConnectionResponse,
	EventResponse,
	ExternalProvider,
	ImportableGroupResponse,
	ImportEventsRequest,
	ProviderResponse,
} from "./types";

export function listProviders(token: string): Promise<ProviderResponse[]> {
	return apiFetchJson<ProviderResponse[]>("/api/v1/integrations/providers", { token });
}

export function listConnections(token: string, accountId: string): Promise<ConnectionResponse[]> {
	const params = new URLSearchParams({ accountId });
	return apiFetchJson<ConnectionResponse[]>(`/api/v1/integrations/connections?${params.toString()}`, { token });
}

export function startAuthorization(token: string, provider: ExternalProvider, accountId: string): Promise<AuthorizationUrlResponse> {
	return apiFetchJson<AuthorizationUrlResponse>(`/api/v1/integrations/connections/${provider}/authorize`, {
		method: "POST",
		token,
		body: JSON.stringify({ accountId }),
	});
}

export function disconnect(token: string, connectionId: string): Promise<void> {
	return apiFetchJson<void>(`/api/v1/integrations/connections/${connectionId}`, {
		method: "DELETE",
		token,
	});
}

/** What's importable from every connected provider for one day (defaults to today, in the caller's own timezone) — grouped by provider, already-imported items excluded. */
export function listImportable(token: string, accountId: string, date?: string): Promise<ImportableGroupResponse[]> {
	const params = new URLSearchParams({ accountId });
	if (date) {
		params.set("date", date);
	}
	return apiFetchJson<ImportableGroupResponse[]>(`/api/v1/integrations/importable?${params.toString()}`, { token });
}

export function importEvents(token: string, body: ImportEventsRequest): Promise<EventResponse[]> {
	return apiFetchJson<EventResponse[]>("/api/v1/integrations/import", {
		method: "POST",
		token,
		body: JSON.stringify(body),
	});
}
