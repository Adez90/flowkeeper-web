import { useState } from "react";
import type { FormEvent } from "react";
import { useTranslation } from "react-i18next";
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
	const { t } = useTranslation();
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
			setError(t("events.create.couldntSubmit"));
		} finally {
			setSubmitting(false);
		}
	}

	return (
		<div className="dialog-backdrop" role="dialog" aria-modal="true">
			<form className="dialog" onSubmit={handleSubmit}>
				<h2>{t("events.create.title")}</h2>

				<label className="field">
					<span>{t("events.type")}</span>
					<select value={selectedTypeId} onChange={(e) => setEventTypeId(e.target.value)} required>
						{typesQuery.data?.map((type) => (
							<option key={type.id} value={type.id}>
								{type.label}
							</option>
						))}
					</select>
				</label>
				{typesQuery.isLoading && <p className="dialog__hint">{t("common.loading")}</p>}
				{typesQuery.isError && <p className="error-text">{t("events.create.couldntLoadTypes")}</p>}

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

				<label className="sharing-toggle">
					<input type="checkbox" checked={isHistorical} onChange={(e) => setIsHistorical(e.target.checked)} />
					{t("events.create.thisAlreadyHappened")}
				</label>

				{isHistorical && (
					<>
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

						<label className="sharing-toggle">
							<input
								type="checkbox"
								checked={isAlreadyComplete}
								onChange={(e) => setIsAlreadyComplete(e.target.checked)}
							/>
							{t("events.create.alreadyFinished")}
						</label>

						{isAlreadyComplete && (
							<>
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
							</>
						)}
					</>
				)}

				{error && <p className="error-text">{error}</p>}

				<div className="dialog__actions">
					<button type="button" className="button" onClick={onClose}>
						{t("common.cancel")}
					</button>
					<button type="submit" className="button button--primary" disabled={submitting || !selectedTypeId}>
						{submitting ? t("events.create.submitting") : t("events.create.submit")}
					</button>
				</div>
			</form>
		</div>
	);
}
