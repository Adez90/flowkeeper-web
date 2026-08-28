import { useState } from "react";
import type { FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { editEvent, listEventTypes } from "../api/events";
import { energyColor } from "../lib/energy";
import { toDatetimeLocalValue, fromDatetimeLocalValue } from "../lib/datetimeLocal";
import type { EventResponse } from "../api/types";

interface EditEventDialogProps {
	event: EventResponse;
	accountId: string;
	token: string;
	onClose: () => void;
	onSaved: () => void;
}

/** Full correction of an already-completed event — every field editable, including which activity type it was. */
export function EditEventDialog({ event, accountId, token, onClose, onSaved }: EditEventDialogProps) {
	const { t } = useTranslation();
	const typesQuery = useQuery({
		queryKey: ["event-types", accountId],
		queryFn: () => listEventTypes(token, accountId),
	});

	const [eventTypeId, setEventTypeId] = useState(event.eventTypeId);
	const [ingoingEnergy, setIngoingEnergy] = useState(event.ingoingEnergy);
	const [ingoingNote, setIngoingNote] = useState(event.ingoingNote ?? "");
	const [startedAt, setStartedAt] = useState(() => toDatetimeLocalValue(new Date(event.startedAt)));
	const [outgoingEnergy, setOutgoingEnergy] = useState(event.outgoingEnergy ?? 3);
	const [outgoingNote, setOutgoingNote] = useState(event.outgoingNote ?? "");
	const [completedAt, setCompletedAt] = useState(() =>
		toDatetimeLocalValue(event.completedAt ? new Date(event.completedAt) : new Date()),
	);
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const nowLocal = toDatetimeLocalValue(new Date());

	async function handleSubmit(formEvent: FormEvent) {
		formEvent.preventDefault();
		setSubmitting(true);
		setError(null);
		try {
			await editEvent(token, event.id, {
				eventTypeId,
				ingoingEnergy,
				ingoingNote: ingoingNote.trim() || null,
				startedAt: fromDatetimeLocalValue(startedAt).toISOString(),
				outgoingEnergy,
				outgoingNote: outgoingNote.trim() || null,
				completedAt: fromDatetimeLocalValue(completedAt).toISOString(),
			});
			onSaved();
		} catch {
			setError(t("editEvent.couldntSubmit"));
		} finally {
			setSubmitting(false);
		}
	}

	return (
		<div className="dialog-backdrop" role="dialog" aria-modal="true">
			<form className="dialog" onSubmit={handleSubmit}>
				<h2>{t("editEvent.title")}</h2>

				<label className="field">
					<span>{t("events.type")}</span>
					<select value={eventTypeId} onChange={(e) => setEventTypeId(e.target.value)} required>
						{typesQuery.data?.map((type) => (
							<option key={type.id} value={type.id}>
								{type.label}
							</option>
						))}
					</select>
				</label>

				<label className="field field--energy">
					<span>
						{t("events.ingoingEnergy")}
						<span className="energy-badge" style={{ background: energyColor(ingoingEnergy) }} aria-hidden="true">
							{ingoingEnergy}
						</span>
					</span>
					<input
						type="range"
						min={1}
						max={5}
						value={ingoingEnergy}
						onChange={(e) => setIngoingEnergy(Number(e.target.value))}
						aria-label={t("events.ingoingEnergyAria", { value: ingoingEnergy })}
					/>
				</label>

				<label className="field">
					<span>{t("events.note", { optional: t("common.optional") })}</span>
					<textarea value={ingoingNote} onChange={(e) => setIngoingNote(e.target.value)} rows={2} />
				</label>

				<label className="field">
					<span>{t("events.create.startedAt")}</span>
					<input
						type="datetime-local"
						value={startedAt}
						max={nowLocal}
						onChange={(e) => setStartedAt(e.target.value)}
						required
					/>
				</label>

				<label className="field field--energy">
					<span>
						{t("events.create.outgoingEnergy")}
						<span className="energy-badge" style={{ background: energyColor(outgoingEnergy) }} aria-hidden="true">
							{outgoingEnergy}
						</span>
					</span>
					<input
						type="range"
						min={1}
						max={5}
						value={outgoingEnergy}
						onChange={(e) => setOutgoingEnergy(Number(e.target.value))}
						aria-label={t("events.outgoingEnergyAria", { value: outgoingEnergy })}
					/>
				</label>

				<label className="field">
					<span>{t("events.create.outcomeNote", { optional: t("common.optional") })}</span>
					<textarea value={outgoingNote} onChange={(e) => setOutgoingNote(e.target.value)} rows={2} />
				</label>

				<label className="field">
					<span>{t("events.create.completedAt")}</span>
					<input
						type="datetime-local"
						value={completedAt}
						min={startedAt}
						max={nowLocal}
						onChange={(e) => setCompletedAt(e.target.value)}
						required
					/>
				</label>

				{error && <p className="error-text">{error}</p>}

				<div className="dialog__actions">
					<button type="button" className="button" onClick={onClose}>
						{t("common.cancel")}
					</button>
					<button type="submit" className="button button--primary" disabled={submitting || !eventTypeId}>
						{submitting ? t("editEvent.submitting") : t("editEvent.submit")}
					</button>
				</div>
			</form>
		</div>
	);
}
