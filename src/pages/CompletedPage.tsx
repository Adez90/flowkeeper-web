import { useState } from "react";
import { useAuth } from "react-oidc-context";
import { useTranslation } from "react-i18next";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { listMyCompletedEvents } from "../api/events";
import { EditEventDialog } from "../components/EditEventDialog";
import { useActiveAccount } from "../context/ActiveAccountContext";
import { energyColor } from "../lib/energy";
import { addDaysIso, toIsoDate } from "../lib/dates";
import type { EventResponse } from "../api/types";

const TODAY = toIsoDate(new Date());

export function CompletedPage() {
	const { accountId } = useActiveAccount();
	const auth = useAuth();
	const queryClient = useQueryClient();
	const { t } = useTranslation();
	const token = auth.user?.access_token ?? "";

	const [rangeStart, setRangeStart] = useState(TODAY);
	const [rangeEnd, setRangeEnd] = useState(TODAY);
	const [editingEvent, setEditingEvent] = useState<EventResponse | null>(null);
	const rangeEndExclusive = addDaysIso(rangeEnd, 1);

	const eventsQuery = useQuery({
		queryKey: ["completed-events", accountId, rangeStart, rangeEndExclusive],
		queryFn: () => listMyCompletedEvents(token, accountId, rangeStart, rangeEndExclusive),
		enabled: Boolean(accountId),
	});

	function refresh() {
		void queryClient.invalidateQueries({ queryKey: ["completed-events", accountId] });
	}

	return (
		<div className="completed-page">
			<div className="landing-page__toolbar">
				<h1>{t("completed.title")}</h1>
			</div>

			<div className="date-range-picker">
				<label>
					{t("statistics.from")}
					<input
						type="date"
						value={rangeStart}
						max={rangeEnd}
						onChange={(e) => setRangeStart(e.target.value)}
					/>
				</label>
				<label>
					{t("statistics.to")}
					<input type="date" value={rangeEnd} min={rangeStart} max={TODAY} onChange={(e) => setRangeEnd(e.target.value)} />
				</label>
				{(rangeStart !== TODAY || rangeEnd !== TODAY) && (
					<button
						type="button"
						className="button"
						onClick={() => {
							setRangeStart(TODAY);
							setRangeEnd(TODAY);
						}}
					>
						{t("statistics.today")}
					</button>
				)}
			</div>

			{eventsQuery.isLoading && <p className="page-loading">{t("completed.loading")}</p>}
			{eventsQuery.isError && <p className="error-text">{t("completed.couldntLoad")}</p>}
			{eventsQuery.data && eventsQuery.data.length === 0 && <p className="empty-state">{t("completed.emptyState")}</p>}

			<ul className="event-list">
				{eventsQuery.data?.map((event) => (
					<li key={event.id} className="event-list__item">
						<button type="button" className="event-list__item-button" onClick={() => setEditingEvent(event)}>
							<div>
								<strong>{event.eventTypeLabel}</strong>
								<span className="event-list__meta">
									<span
										className="energy-dot"
										style={{ background: energyColor(event.ingoingEnergy) }}
										aria-hidden="true"
									/>
									{t("landing.ingoingEnergy", { value: event.ingoingEnergy })}
									{event.outgoingEnergy != null && (
										<>
											{" → "}
											<span
												className="energy-dot"
												style={{ background: energyColor(event.outgoingEnergy) }}
												aria-hidden="true"
											/>
											{event.outgoingEnergy}/5
										</>
									)}
								</span>
							</div>
						</button>
					</li>
				))}
			</ul>

			{editingEvent && (
				<EditEventDialog
					event={editingEvent}
					accountId={accountId}
					token={token}
					onClose={() => setEditingEvent(null)}
					onSaved={() => {
						setEditingEvent(null);
						refresh();
					}}
				/>
			)}
		</div>
	);
}
