import { useState } from "react";
import { useAuth } from "react-oidc-context";
import { useTranslation } from "react-i18next";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchNotifications, markNotificationRead } from "../api/notifications";

/** Polls rather than pushing — simple and good enough for a low-frequency reminder inbox, no websocket infrastructure needed. */
const POLL_INTERVAL_MS = 60_000;

export function NotificationBell() {
	const auth = useAuth();
	const queryClient = useQueryClient();
	const { t } = useTranslation();
	const token = auth.user?.access_token ?? "";
	const [open, setOpen] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const notificationsQuery = useQuery({
		queryKey: ["notifications"],
		queryFn: () => fetchNotifications(token),
		refetchInterval: POLL_INTERVAL_MS,
	});

	const notifications = notificationsQuery.data ?? [];
	const unreadCount = notifications.filter((n) => !n.readAt).length;

	async function handleMarkRead(notificationId: string) {
		setError(null);
		try {
			await markNotificationRead(token, notificationId);
			await queryClient.invalidateQueries({ queryKey: ["notifications"] });
		} catch {
			setError(t("notifications.couldntMarkRead"));
		}
	}

	return (
		<div className="notification-bell">
			<button
				type="button"
				className="notification-bell__button"
				onClick={() => setOpen((o) => !o)}
				aria-label={unreadCount > 0 ? t("notifications.labelWithUnread", { count: unreadCount }) : t("notifications.label")}
			>
				🔔
				{unreadCount > 0 && <span className="notification-bell__badge">{unreadCount}</span>}
			</button>

			{open && (
				<div className="notification-bell__panel">
					{notificationsQuery.isError && <p className="error-text">{t("notifications.couldntLoad")}</p>}
					{error && <p className="error-text">{error}</p>}
					{!notificationsQuery.isError && notifications.length === 0 && (
						<p className="empty-state">{t("notifications.nothingYet")}</p>
					)}
					<ul className="notification-bell__list">
						{notifications.map((notification) => (
							<li
								key={notification.id}
								className={notification.readAt ? "notification-bell__item" : "notification-bell__item notification-bell__item--unread"}
							>
								<p>{notification.message}</p>
								{!notification.readAt && (
									<button type="button" className="button" onClick={() => void handleMarkRead(notification.id)}>
										{t("notifications.markRead")}
									</button>
								)}
							</li>
						))}
					</ul>
				</div>
			)}
		</div>
	);
}
