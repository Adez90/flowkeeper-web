import { useState } from "react";
import type { FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { completeEvent, updateEventSharing } from "../api/events";
import { energyColor } from "../lib/energy";
import type { EventResponse } from "../api/types";

interface CompleteEventDialogProps {
	event: EventResponse;
	token: string;
	/** Only meaningful for an Organisation account — the anonymous-feedback endpoint is organisation-scoped. */
	showAnonymousSharing?: boolean;
	onClose: () => void;
	onCompleted: () => void;
}

export function CompleteEventDialog({
	event,
	token,
	showAnonymousSharing = false,
	onClose,
	onCompleted,
}: CompleteEventDialogProps) {
	const { t } = useTranslation();
	const [outgoingEnergy, setOutgoingEnergy] = useState(3);
	const [outgoingNote, setOutgoingNote] = useState("");
	const [shareIngoingNoteAnonymously, setShareIngoingNoteAnonymously] = useState(false);
	const [shareOutgoingNoteAnonymously, setShareOutgoingNoteAnonymously] = useState(false);
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);

	async function handleSubmit(formEvent: FormEvent) {
		formEvent.preventDefault();
		setSubmitting(true);
		setError(null);
		try {
			await completeEvent(token, event.id, {
				outgoingEnergy,
				outgoingNote: outgoingNote.trim() || null,
				// An imported event already has a known end time from its
				// provider — use it instead of "now" so the record reflects
				// when the activity actually finished, not when it happened
				// to be finalized in the app.
				completedAt: event.externalEndedAt ?? undefined,
			});
			if (shareIngoingNoteAnonymously || shareOutgoingNoteAnonymously) {
				await updateEventSharing(token, event.id, { shareIngoingNoteAnonymously, shareOutgoingNoteAnonymously });
			}
			onCompleted();
		} catch {
			setError(t("events.complete.couldntSubmit"));
		} finally {
			setSubmitting(false);
		}
	}

	return (
		<div className="dialog-backdrop" role="dialog" aria-modal="true">
			<form className="dialog" onSubmit={handleSubmit}>
				<h2>{t("events.complete.title", { eventType: event.eventTypeLabel })}</h2>
				<p className="dialog__hint">{t("events.complete.ingoingWas", { value: event.ingoingEnergy })}</p>
				{event.ingoingNote && <p className="dialog__hint dialog__hint--note">&ldquo;{event.ingoingNote}&rdquo;</p>}

				<label className="field field--energy">
					<span>
						{t("events.complete.outgoingEnergy")}
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
					<span>{t("events.complete.note", { optional: t("common.optional") })}</span>
					<textarea value={outgoingNote} onChange={(e) => setOutgoingNote(e.target.value)} rows={2} />
				</label>

				{showAnonymousSharing && event.ingoingNote && (
					<label className="sharing-toggle">
						<input
							type="checkbox"
							checked={shareIngoingNoteAnonymously}
							onChange={(e) => setShareIngoingNoteAnonymously(e.target.checked)}
						/>
						{t("events.complete.shareIngoingNoteAnonymously")}
					</label>
				)}
				{showAnonymousSharing && (
					<label className="sharing-toggle">
						<input
							type="checkbox"
							checked={shareOutgoingNoteAnonymously}
							onChange={(e) => setShareOutgoingNoteAnonymously(e.target.checked)}
						/>
						{t("events.complete.shareOutgoingNoteAnonymously")}
					</label>
				)}

				{error && <p className="error-text">{error}</p>}

				<div className="dialog__actions">
					<button type="button" className="button" onClick={onClose}>
						{t("common.cancel")}
					</button>
					<button type="submit" className="button button--primary" disabled={submitting}>
						{submitting ? t("events.complete.submitting") : t("events.complete.submit")}
					</button>
				</div>
			</form>
		</div>
	);
}
