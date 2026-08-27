import { apiFetchJson } from "./client";
import type { MeResponse, UpdateNotificationPreferencesRequest, UpdateProfileRequest, UpdatePushTokenRequest } from "./types";

export function fetchMe(token: string): Promise<MeResponse> {
	return apiFetchJson<MeResponse>("/api/v1/me", { token });
}

export function updateProfile(token: string, body: UpdateProfileRequest): Promise<MeResponse> {
	return apiFetchJson<MeResponse>("/api/v1/me", {
		method: "PATCH",
		token,
		body: JSON.stringify(body),
	});
}

export function updateNotificationPreferences(token: string, body: UpdateNotificationPreferencesRequest): Promise<MeResponse> {
	return apiFetchJson<MeResponse>("/api/v1/me/notification-preferences", {
		method: "PATCH",
		token,
		body: JSON.stringify(body),
	});
}

export function updatePushToken(token: string, body: UpdatePushTokenRequest): Promise<MeResponse> {
	return apiFetchJson<MeResponse>("/api/v1/me/push-token", {
		method: "PATCH",
		token,
		body: JSON.stringify(body),
	});
}
