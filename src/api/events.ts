import { apiFetchJson } from "./client";
import type { CompleteEventRequest, CreateEventRequest, EventResponse, EventStatus, EventTypeResponse } from "./types";

export function listEvents(token: string, accountId: string, status?: EventStatus): Promise<EventResponse[]> {
	const params = new URLSearchParams({ accountId });
	if (status) {
		params.set("status", status);
	}
	return apiFetchJson<EventResponse[]>(`/api/v1/events?${params.toString()}`, { token });
}

export function listEventTypes(token: string, accountId: string): Promise<EventTypeResponse[]> {
	const params = new URLSearchParams({ accountId });
	return apiFetchJson<EventTypeResponse[]>(`/api/v1/event-types?${params.toString()}`, { token });
}

export function createEvent(token: string, body: CreateEventRequest): Promise<EventResponse> {
	return apiFetchJson<EventResponse>("/api/v1/events", {
		method: "POST",
		token,
		body: JSON.stringify(body),
	});
}

export function completeEvent(token: string, eventId: string, body: CompleteEventRequest): Promise<EventResponse> {
	return apiFetchJson<EventResponse>(`/api/v1/events/${eventId}/complete`, {
		method: "POST",
		token,
		body: JSON.stringify(body),
	});
}
