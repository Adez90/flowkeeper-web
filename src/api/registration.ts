import { apiFetchJson } from "./client";
import type { RegistrationResponse } from "./types";

export function register(token: string): Promise<RegistrationResponse> {
	return apiFetchJson<RegistrationResponse>("/api/v1/registration", { method: "POST", token });
}
