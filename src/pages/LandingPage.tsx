import { useState } from "react";
import { useAuth } from "react-oidc-context";
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
		return <p className="page-loading">Setting up your account…</p>;
	}

	return (
		<div className="landing-page">
			<div className="landing-page__toolbar">
				<h1>Ongoing</h1>
				<button type="button" className="button button--primary" onClick={() => setCreating(true)}>
					+ Log activity
				</button>
			</div>

			{eventsQuery.isLoading && <p className="page-loading">Loading…</p>}
			{eventsQuery.isError && <p className="error-text">Couldn't load your events.</p>}
			{eventsQuery.data && eventsQuery.data.length === 0 && (
				<p className="empty-state">Nothing ongoing right now — log an activity to get started.</p>
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
								ingoing energy {event.ingoingEnergy}/5
							</span>
						</div>
						<button type="button" className="button" onClick={() => setCompletingEvent(event)}>
							Complete
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
