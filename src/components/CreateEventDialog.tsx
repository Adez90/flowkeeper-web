import { useState } from "react";
import type { FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { createEvent, listEventTypes } from "../api/events";

interface CreateEventDialogProps {
	accountId: string;
	token: string;
	onClose: () => void;
	onCreated: () => void;
}

export function CreateEventDialog({ accountId, token, onClose, onCreated }: CreateEventDialogProps) {
	const typesQuery = useQuery({
		queryKey: ["event-types", accountId],
		queryFn: () => listEventTypes(token, accountId),
	});

	const [eventTypeId, setEventTypeId] = useState("");
	const [ingoingEnergy, setIngoingEnergy] = useState(3);
	const [ingoingNote, setIngoingNote] = useState("");
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const selectedTypeId = eventTypeId || typesQuery.data?.[0]?.id || "";

	async function handleSubmit(event: FormEvent) {
		event.preventDefault();
		if (!selectedTypeId) {
			return;
		}
		setSubmitting(true);
		setError(null);
		try {
			await createEvent(token, {
				accountId,
				eventTypeId: selectedTypeId,
				ingoingEnergy,
				ingoingNote: ingoingNote.trim() || null,
			});
			onCreated();
		} catch {
			setError("Couldn't log that activity — try again.");
		} finally {
			setSubmitting(false);
		}
	}

	return (
		<div className="dialog-backdrop" role="dialog" aria-modal="true">
			<form className="dialog" onSubmit={handleSubmit}>
				<h2>Log an activity</h2>

				<label className="field">
					<span>Type</span>
					<select value={selectedTypeId} onChange={(e) => setEventTypeId(e.target.value)} required>
						{typesQuery.data?.map((type) => (
							<option key={type.id} value={type.id}>
								{type.label}
							</option>
						))}
					</select>
				</label>

				<label className="field">
					<span>Ingoing energy: {ingoingEnergy}/5</span>
					<input
						type="range"
						min={1}
						max={5}
						value={ingoingEnergy}
						onChange={(e) => setIngoingEnergy(Number(e.target.value))}
					/>
				</label>

				<label className="field">
					<span>Note (optional)</span>
					<textarea value={ingoingNote} onChange={(e) => setIngoingNote(e.target.value)} rows={2} />
				</label>

				{error && <p className="error-text">{error}</p>}

				<div className="dialog__actions">
					<button type="button" className="button" onClick={onClose}>
						Cancel
					</button>
					<button type="submit" className="button button--primary" disabled={submitting || !selectedTypeId}>
						{submitting ? "Logging…" : "Log activity"}
					</button>
				</div>
			</form>
		</div>
	);
}
