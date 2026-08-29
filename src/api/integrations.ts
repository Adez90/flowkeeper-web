import { apiFetchJson } from "./client";
import type { AuthorizationUrlResponse, ConnectionResponse, ExternalProvider, ProviderResponse } from "./types";

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
