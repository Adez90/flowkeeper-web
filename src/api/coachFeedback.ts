import { apiFetchJson } from "./client";
import type { CoachFeedbackResponse, CreateCoachFeedbackRequest, EventResponse } from "./types";

export function fetchMemberFeedback(token: string, accountId: string, memberId: string): Promise<CoachFeedbackResponse[]> {
	return apiFetchJson<CoachFeedbackResponse[]>(`/api/v1/organisations/${accountId}/members/${memberId}/feedback`, { token });
}

export function createMemberFeedback(
	token: string,
	accountId: string,
	memberId: string,
	body: CreateCoachFeedbackRequest,
): Promise<CoachFeedbackResponse> {
	return apiFetchJson<CoachFeedbackResponse>(`/api/v1/organisations/${accountId}/members/${memberId}/feedback`, {
		method: "POST",
		token,
		body: JSON.stringify(body),
	});
}

/** That member's own events, newest first — what the "attach to an event" picker offers. */
export function fetchMemberEvents(token: string, accountId: string, memberId: string): Promise<EventResponse[]> {
	return apiFetchJson<EventResponse[]>(`/api/v1/organisations/${accountId}/members/${memberId}/events`, { token });
}
