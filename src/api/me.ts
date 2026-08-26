import { apiFetchJson } from "./client";
import type { MeResponse, UpdateProfileRequest } from "./types";

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
