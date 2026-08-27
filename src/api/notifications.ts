import { apiFetchJson } from "./client";
import type { NotificationResponse } from "./types";

export function fetchNotifications(token: string): Promise<NotificationResponse[]> {
	return apiFetchJson<NotificationResponse[]>("/api/v1/notifications", { token });
}

export function markNotificationRead(token: string, notificationId: string): Promise<NotificationResponse> {
	return apiFetchJson<NotificationResponse>(`/api/v1/notifications/${notificationId}/read`, {
		method: "PATCH",
		token,
	});
}
