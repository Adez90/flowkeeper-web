import { apiFetchJson } from "./client";
import type { GeneratePromoCodeRequest, PromoCodeResponse } from "./types";

export function generatePromoCode(token: string, body: GeneratePromoCodeRequest): Promise<PromoCodeResponse> {
	return apiFetchJson<PromoCodeResponse>("/api/v1/admin/promo-codes", {
		method: "POST",
		token,
		body: JSON.stringify(body),
	});
}

export function listPromoCodes(token: string): Promise<PromoCodeResponse[]> {
	return apiFetchJson<PromoCodeResponse[]>("/api/v1/admin/promo-codes", { token });
}

export function revokePromoCode(token: string, promoCodeId: string): Promise<void> {
	return apiFetchJson<void>(`/api/v1/admin/promo-codes/${promoCodeId}/revoke`, {
		method: "POST",
		token,
	});
}
