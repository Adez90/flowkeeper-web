import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "react-oidc-context";
import { useTranslation } from "react-i18next";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { listEvents } from "../api/events";
import { CreateEventDialog } from "../components/CreateEventDialog";
import { CompleteEventDialog } from "../components/CompleteEventDialog";
import { ImportEventsDialog } from "../components/ImportEventsDialog";
import { StartEventDialog } from "../components/StartEventDialog";
import { useActiveAccount } from "../context/useActiveAccount";
import { energyColor } from "../lib/energy";
import type { EventResponse } from "../api/types";

export function LandingPage() {
	const { account, accountId } = useActiveAccount();
	const auth = useAuth();
	const queryClient = useQueryClient();
	const { t } = useTranslation();
	const token = auth.user?.access_token ?? "";

	const [creating, setCreating] = useState(false);
	const [importing, setImporting] = useState(false);
	const [completingEvent, setCompletingEvent] = useState<EventResponse | null>(null);
	const [startingEvent, setStartingEvent] = useState<EventResponse | null>(null);

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
				<div className="landing-page__toolbar-actions">
					<Link to="/app/completed" className="button">
						{t("landing.viewCompleted")}
					</Link>
					<button type="button" className="button" onClick={() => setImporting(true)}>
						{t("events.import.button")}
					</button>
					<button type="button" className="button button--primary" onClick={() => setCreating(true)}>
						{t("landing.logActivity")}
					</button>
				</div>
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
							{event.ingoingEnergy == null ? (
								<span className="event-list__meta event-list__meta--needs-start">{t("landing.needsStart")}</span>
							) : (
								<span className="event-list__meta">
									<span
										className="energy-dot"
										style={{ background: energyColor(event.ingoingEnergy) }}
										aria-hidden="true"
									/>
									{t("landing.ingoingEnergy", { value: event.ingoingEnergy })}
								</span>
							)}
						</div>
						{event.ingoingEnergy == null ? (
							<button type="button" className="button button--primary" onClick={() => setStartingEvent(event)}>
								{t("landing.start")}
							</button>
						) : (
							<button type="button" className="button" onClick={() => setCompletingEvent(event)}>
								{t("landing.complete")}
							</button>
						)}
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
			{startingEvent && (
				<StartEventDialog
					event={startingEvent}
					token={token}
					onClose={() => setStartingEvent(null)}
					onStarted={() => {
						setStartingEvent(null);
						refreshEvents();
					}}
				/>
			)}
			{importing && (
				<ImportEventsDialog
					accountId={accountId}
					token={token}
					onClose={() => setImporting(false)}
					onImported={() => {
						setImporting(false);
						refreshEvents();
					}}
				/>
			)}
		</div>
	);
}
