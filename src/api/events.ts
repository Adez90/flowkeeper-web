import { apiFetchJson } from "./client";
import type {
	CompleteEventRequest,
	CreateEventRequest,
	EventResponse,
	EventStatus,
	EventTypeResponse,
	StartEventRequest,
	UpdateEventRequest,
	UpdateEventSharingRequest,
} from "./types";

export function listEvents(token: string, accountId: string, status?: EventStatus): Promise<EventResponse[]> {
	const params = new URLSearchParams({ accountId });
	if (status) {
		params.set("status", status);
	}
	return apiFetchJson<EventResponse[]>(`/api/v1/events?${params.toString()}`, { token });
}

/** The caller's own completed events within [rangeStart, rangeEndExclusive) — dates as yyyy-MM-dd, resolved in the caller's own timezone server-side. */
export function listMyCompletedEvents(
	token: string,
	accountId: string,
	rangeStart: string,
	rangeEndExclusive: string,
): Promise<EventResponse[]> {
	const params = new URLSearchParams({ accountId, rangeStart, rangeEndExclusive });
	return apiFetchJson<EventResponse[]>(`/api/v1/events/completed?${params.toString()}`, { token });
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

export function updateEventSharing(token: string, eventId: string, body: UpdateEventSharingRequest): Promise<EventResponse> {
	return apiFetchJson<EventResponse>(`/api/v1/events/${eventId}/sharing`, {
		method: "PATCH",
		token,
		body: JSON.stringify(body),
	});
}

/** Full correction of an already-completed event. */
export function editEvent(token: string, eventId: string, body: UpdateEventRequest): Promise<EventResponse> {
	return apiFetchJson<EventResponse>(`/api/v1/events/${eventId}`, {
		method: "PATCH",
		token,
		body: JSON.stringify(body),
	});
}

/** The first interaction with an imported event — sets the ingoing energy a manually-created one already has from the start. */
export function startEvent(token: string, eventId: string, body: StartEventRequest): Promise<EventResponse> {
	return apiFetchJson<EventResponse>(`/api/v1/events/${eventId}/start`, {
		method: "PATCH",
		token,
		body: JSON.stringify(body),
	});
}

export function deleteEvent(token: string, eventId: string): Promise<void> {
	return apiFetchJson<void>(`/api/v1/events/${eventId}`, {
		method: "DELETE",
		token,
	});
}
