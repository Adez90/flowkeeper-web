import { apiFetchJson } from "./client";
import type { PlanResponse, RedeemPromoCodeRequest, SubscriptionResponse } from "./types";

export function listPlans(token: string): Promise<PlanResponse[]> {
	return apiFetchJson<PlanResponse[]>("/api/v1/billing/plans", { token });
}

/** Null means the account has never subscribed — free, not an error. */
export function getSubscription(token: string, accountId: string): Promise<SubscriptionResponse | null> {
	const params = new URLSearchParams({ accountId });
	return apiFetchJson<SubscriptionResponse | null>(`/api/v1/billing/subscription?${params.toString()}`, { token });
}

export function redeemPromoCode(token: string, body: RedeemPromoCodeRequest): Promise<SubscriptionResponse> {
	return apiFetchJson<SubscriptionResponse>("/api/v1/billing/redeem-promo-code", {
		method: "POST",
		token,
		body: JSON.stringify(body),
	});
}
