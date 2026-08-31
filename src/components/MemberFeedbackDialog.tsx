import { useState } from "react";
import type { FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createMemberFeedback, fetchMemberEvents, fetchMemberFeedback } from "../api/coachFeedback";

interface MemberFeedbackDialogProps {
	accountId: string;
	token: string;
	memberId: string;
	memberDisplayName: string;
	/** Whether the viewer supervises this member (and so can leave feedback) — false for a member viewing only their own. */
	canWrite: boolean;
	onClose: () => void;
}

export function MemberFeedbackDialog({ accountId, token, memberId, memberDisplayName, canWrite, onClose }: MemberFeedbackDialogProps) {
	const queryClient = useQueryClient();
	const { t } = useTranslation();
	const [note, setNote] = useState("");
	const [eventId, setEventId] = useState("");
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const feedbackQuery = useQuery({
		queryKey: ["member-feedback", accountId, memberId],
		queryFn: () => fetchMemberFeedback(token, accountId, memberId),
	});
	const eventsQuery = useQuery({
		queryKey: ["member-events", accountId, memberId],
		queryFn: () => fetchMemberEvents(token, accountId, memberId),
		enabled: canWrite,
	});

	async function handleSubmit(event: FormEvent) {
		event.preventDefault();
		setSubmitting(true);
		setError(null);
		try {
			await createMemberFeedback(token, accountId, memberId, { note: note.trim(), eventId: eventId || null });
			setNote("");
			setEventId("");
			await queryClient.invalidateQueries({ queryKey: ["member-feedback", accountId, memberId] });
		} catch {
			setError(t("memberFeedbackDialog.couldntSubmit"));
		} finally {
			setSubmitting(false);
		}
	}

	const feedback = feedbackQuery.data ?? [];
	const events = eventsQuery.data ?? [];

	return (
		<div className="dialog-backdrop" role="dialog" aria-modal="true">
			<div className="dialog dialog--wide">
				<h2>{t("memberFeedbackDialog.titleFor", { displayName: memberDisplayName })}</h2>

				{feedbackQuery.isLoading && <p className="page-loading">{t("memberFeedbackDialog.loading")}</p>}
				{feedbackQuery.isError && <p className="error-text">{t("memberFeedbackDialog.couldntLoad")}</p>}
				{feedback.length === 0 && !feedbackQuery.isLoading && !feedbackQuery.isError && (
					<p className="empty-state">{t("memberFeedbackDialog.noFeedbackYet")}</p>
				)}
				<ul className="feedback-thread">
					{feedback.map((item) => (
						<li key={item.id} className="feedback-thread__item">
							<div className="feedback-thread__meta">
								<span>{item.coachDisplayName}</span>
								<span>{new Date(item.createdAt).toLocaleDateString()}</span>
							</div>
							{item.eventTypeLabel && <p className="feedback-thread__event">{t("memberFeedbackDialog.onEvent", { eventType: item.eventTypeLabel })}</p>}
							<p>{item.note}</p>
						</li>
					))}
				</ul>

				{canWrite && (
					<form onSubmit={handleSubmit} className="profile-form">
						<label className="field">
							<span>{t("memberFeedbackDialog.newFeedback")}</span>
							<textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} required />
						</label>
						<label className="field">
							<span>{t("memberFeedbackDialog.attachToEvent", { optional: t("common.optional") })}</span>
							<select value={eventId} onChange={(e) => setEventId(e.target.value)}>
								<option value="">{t("memberFeedbackDialog.freeform")}</option>
								{events.map((event) => (
									<option key={event.id} value={event.id}>
										{event.eventTypeLabel} — {new Date(event.startedAt).toLocaleDateString()}
									</option>
								))}
							</select>
						</label>
						{error && <p className="error-text">{error}</p>}
						<button type="submit" className="button button--primary" disabled={submitting || !note.trim()}>
							{submitting ? t("memberFeedbackDialog.submitting") : t("memberFeedbackDialog.submit")}
						</button>
					</form>
				)}

				<div className="dialog__actions">
					<button type="button" className="button" onClick={onClose}>
						{t("common.close")}
					</button>
				</div>
			</div>
		</div>
	);
}
