import { useState } from "react";
import type { FormEvent } from "react";
import { completeEvent } from "../api/events";
import { energyColor } from "../lib/energy";
import type { EventResponse } from "../api/types";

interface CompleteEventDialogProps {
	event: EventResponse;
	token: string;
	onClose: () => void;
	onCompleted: () => void;
}

export function CompleteEventDialog({ event, token, onClose, onCompleted }: CompleteEventDialogProps) {
	const [outgoingEnergy, setOutgoingEnergy] = useState(3);
	const [outgoingNote, setOutgoingNote] = useState("");
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
			});
			onCompleted();
		} catch {
			setError("Couldn't complete that activity — try again.");
		} finally {
			setSubmitting(false);
		}
	}

	return (
		<div className="dialog-backdrop" role="dialog" aria-modal="true">
			<form className="dialog" onSubmit={handleSubmit}>
				<h2>Complete &ldquo;{event.eventTypeLabel}&rdquo;</h2>
				<p className="dialog__hint">Ingoing energy was {event.ingoingEnergy}/5.</p>

				<label className="field field--energy">
					<span>
						Outgoing energy
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
						aria-label={`Outgoing energy: ${outgoingEnergy}/5`}
					/>
				</label>

				<label className="field">
					<span>Note (optional)</span>
					<textarea value={outgoingNote} onChange={(e) => setOutgoingNote(e.target.value)} rows={2} />
				</label>

				{error && <p className="error-text">{error}</p>}

				<div className="dialog__actions">
					<button type="button" className="button" onClick={onClose}>
						Cancel
					</button>
					<button type="submit" className="button button--primary" disabled={submitting}>
						{submitting ? "Saving…" : "Complete"}
					</button>
				</div>
			</form>
		</div>
	);
}
