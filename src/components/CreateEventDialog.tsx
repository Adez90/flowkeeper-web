import { useState } from "react";
import type { FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { createEvent, listEventTypes } from "../api/events";
import { energyColor } from "../lib/energy";
import { fromDatetimeLocalValue, toDatetimeLocalValue } from "../lib/datetimeLocal";

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
	const [isHistorical, setIsHistorical] = useState(false);
	const [startedAt, setStartedAt] = useState(() => toDatetimeLocalValue(new Date()));
	const [isAlreadyComplete, setIsAlreadyComplete] = useState(false);
	const [outgoingEnergy, setOutgoingEnergy] = useState(3);
	const [outgoingNote, setOutgoingNote] = useState("");
	const [completedAt, setCompletedAt] = useState(() => toDatetimeLocalValue(new Date()));
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const selectedTypeId = eventTypeId || typesQuery.data?.[0]?.id || "";
	const nowLocal = toDatetimeLocalValue(new Date());

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
				startedAt: isHistorical ? fromDatetimeLocalValue(startedAt).toISOString() : undefined,
				outgoingEnergy: isHistorical && isAlreadyComplete ? outgoingEnergy : undefined,
				outgoingNote: isHistorical && isAlreadyComplete ? outgoingNote.trim() || null : undefined,
				completedAt: isHistorical && isAlreadyComplete ? fromDatetimeLocalValue(completedAt).toISOString() : undefined,
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

				<label className="field field--energy">
					<span>
						Ingoing energy
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
						aria-label={`Ingoing energy: ${ingoingEnergy}/5`}
					/>
				</label>

				<label className="field">
					<span>Note (optional)</span>
					<textarea value={ingoingNote} onChange={(e) => setIngoingNote(e.target.value)} rows={2} />
				</label>

				<label className="sharing-toggle">
					<input type="checkbox" checked={isHistorical} onChange={(e) => setIsHistorical(e.target.checked)} />
					This already happened
				</label>

				{isHistorical && (
					<>
						<label className="field">
							<span>Started at</span>
							<input
								type="datetime-local"
								value={startedAt}
								max={nowLocal}
								onChange={(e) => setStartedAt(e.target.value)}
								required
							/>
						</label>

						<label className="sharing-toggle">
							<input
								type="checkbox"
								checked={isAlreadyComplete}
								onChange={(e) => setIsAlreadyComplete(e.target.checked)}
							/>
							Already finished — log the outcome too
						</label>

						{isAlreadyComplete && (
							<>
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
									<span>Outcome note (optional)</span>
									<textarea value={outgoingNote} onChange={(e) => setOutgoingNote(e.target.value)} rows={2} />
								</label>

								<label className="field">
									<span>Completed at</span>
									<input
										type="datetime-local"
										value={completedAt}
										min={startedAt}
										max={nowLocal}
										onChange={(e) => setCompletedAt(e.target.value)}
										required
									/>
								</label>
							</>
						)}
					</>
				)}

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
