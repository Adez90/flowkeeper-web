import { useState } from "react";
import type { FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { startEvent } from "../api/events";
import { energyColor } from "../lib/energy";
import type { EventResponse } from "../api/types";

interface StartEventDialogProps {
	event: EventResponse;
	token: string;
	onClose: () => void;
	onStarted: () => void;
}

/** The first real interaction with an imported event — sets the ingoing reading a manually-logged one already has from the moment it's created. */
export function StartEventDialog({ event, token, onClose, onStarted }: StartEventDialogProps) {
	const { t } = useTranslation();
	const [ingoingEnergy, setIngoingEnergy] = useState(3);
	const [ingoingNote, setIngoingNote] = useState("");
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);

	async function handleSubmit(formEvent: FormEvent) {
		formEvent.preventDefault();
		setSubmitting(true);
		setError(null);
		try {
			await startEvent(token, event.id, { ingoingEnergy, ingoingNote: ingoingNote.trim() || null });
			onStarted();
		} catch {
			setError(t("events.start.couldntSubmit"));
		} finally {
			setSubmitting(false);
		}
	}

	return (
		<div className="dialog-backdrop" role="dialog" aria-modal="true">
			<form className="dialog" onSubmit={handleSubmit}>
				<h2>{t("events.start.title", { eventType: event.eventTypeLabel })}</h2>
				<p className="dialog__hint">{t("events.start.hint")}</p>

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

				{error && <p className="error-text">{error}</p>}

				<div className="dialog__actions">
					<button type="button" className="button" onClick={onClose}>
						{t("common.cancel")}
					</button>
					<button type="submit" className="button button--primary" disabled={submitting}>
						{submitting ? t("events.start.submitting") : t("events.start.submit")}
					</button>
				</div>
			</form>
		</div>
	);
}
