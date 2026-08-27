import { useState } from "react";
import { useAuth } from "react-oidc-context";
import { useTranslation } from "react-i18next";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { listEvents } from "../api/events";
import { CreateEventDialog } from "../components/CreateEventDialog";
import { CompleteEventDialog } from "../components/CompleteEventDialog";
import { useActiveAccount } from "../context/ActiveAccountContext";
import { energyColor } from "../lib/energy";
import type { EventResponse } from "../api/types";

export function LandingPage() {
	const { account, accountId } = useActiveAccount();
	const auth = useAuth();
	const queryClient = useQueryClient();
	const { t } = useTranslation();
	const token = auth.user?.access_token ?? "";

	const [creating, setCreating] = useState(false);
	const [completingEvent, setCompletingEvent] = useState<EventResponse | null>(null);

	const eventsQuery = useQuery({
		queryKey: ["events", accountId, "OPEN"],
		queryFn: () => listEvents(token, accountId, "OPEN"),
		enabled: Boolean(accountId),
	});

	function refreshEvents() {
		void queryClient.invalidateQueries({ queryKey: ["events", accountId] });
	}

	if (!accountId) {
		return <p className="page-loading">{t("common.settingUpAccount")}</p>;
	}

	return (
		<div className="landing-page">
			<div className="landing-page__toolbar">
				<h1>{t("landing.title")}</h1>
				<button type="button" className="button button--primary" onClick={() => setCreating(true)}>
					{t("landing.logActivity")}
				</button>
			</div>

			{eventsQuery.isLoading && <p className="page-loading">{t("landing.loading")}</p>}
			{eventsQuery.isError && <p className="error-text">{t("landing.couldntLoadEvents")}</p>}
			{eventsQuery.data && eventsQuery.data.length === 0 && (
				<p className="empty-state">{t("landing.emptyState")}</p>
			)}

			<ul className="event-list">
				{eventsQuery.data?.map((event) => (
					<li key={event.id} className="event-list__item">
						<div>
							<strong>{event.eventTypeLabel}</strong>
							<span className="event-list__meta">
								<span
									className="energy-dot"
									style={{ background: energyColor(event.ingoingEnergy) }}
									aria-hidden="true"
								/>
								{t("landing.ingoingEnergy", { value: event.ingoingEnergy })}
							</span>
						</div>
						<button type="button" className="button" onClick={() => setCompletingEvent(event)}>
							{t("landing.complete")}
						</button>
					</li>
				))}
			</ul>

			{creating && (
				<CreateEventDialog
					accountId={accountId}
					token={token}
					onClose={() => setCreating(false)}
					onCreated={() => {
						setCreating(false);
						refreshEvents();
					}}
				/>
			)}
			{completingEvent && (
				<CompleteEventDialog
					event={completingEvent}
					token={token}
					showAnonymousSharing={account.type === "ORGANISATION"}
					onClose={() => setCompletingEvent(null)}
					onCompleted={() => {
						setCompletingEvent(null);
						refreshEvents();
					}}
				/>
			)}
		</div>
	);
}
