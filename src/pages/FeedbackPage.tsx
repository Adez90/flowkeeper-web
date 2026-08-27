import { useState } from "react";
import { useAuth } from "react-oidc-context";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { fetchOrganisationFeedback, fetchOrganisationTypeStatistics } from "../api/statistics";
import { useActiveAccount } from "../context/ActiveAccountContext";
import { energyDeltaColor } from "../lib/energy";
import type { StatisticsPeriod } from "../api/types";

const PERIODS: StatisticsPeriod[] = ["DAY", "WEEK", "MONTH"];

/**
 * The organisation OWNER's "what's working, what's not" view: an anonymous
 * by-type breakdown and the anonymous feedback notes members have opted
 * in. Both are withheld by the API below their own minimum headcount
 * (10 members) — this page just renders whatever it gets back, including
 * the "not enough members yet" case.
 */
export function FeedbackPage() {
	const { account, accountId } = useActiveAccount();
	const auth = useAuth();
	const { t } = useTranslation();
	const token = auth.user?.access_token ?? "";
	const [period, setPeriod] = useState<StatisticsPeriod>("WEEK");

	const byTypeQuery = useQuery({
		queryKey: ["organisation-by-type", accountId, period],
		queryFn: () => fetchOrganisationTypeStatistics(token, accountId, period),
		enabled: account.role === "OWNER",
	});
	const feedbackQuery = useQuery({
		queryKey: ["organisation-feedback", accountId],
		queryFn: () => fetchOrganisationFeedback(token, accountId),
		enabled: account.role === "OWNER",
	});

	const periodLabels: Record<StatisticsPeriod, string> = {
		DAY: t("statistics.day"),
		WEEK: t("statistics.week"),
		MONTH: t("statistics.month"),
	};

	if (account.role !== "OWNER") {
		return <p className="empty-state">{t("feedback.onlyOwnerCanSee")}</p>;
	}

	return (
		<div className="feedback-page">
			<div className="landing-page__toolbar">
				<h1>{t("feedback.title")}</h1>
				<div className="period-switch">
					{PERIODS.map((p) => (
						<button
							key={p}
							type="button"
							className={`button ${period === p ? "button--primary" : ""}`}
							onClick={() => setPeriod(p)}
						>
							{periodLabels[p]}
						</button>
					))}
				</div>
			</div>

			<h2>{t("feedback.byType")}</h2>
			{byTypeQuery.data?.belowMinimumSize && (
				<p className="empty-state">{t("feedback.notEnoughMembers", { count: byTypeQuery.data.memberCount })}</p>
			)}
			{byTypeQuery.data && !byTypeQuery.data.belowMinimumSize && byTypeQuery.data.byType.length === 0 && (
				<p className="empty-state">{t("feedback.nothingInRange")}</p>
			)}
			{byTypeQuery.data && !byTypeQuery.data.belowMinimumSize && byTypeQuery.data.byType.length > 0 && (
				<ul className="type-breakdown">
					{byTypeQuery.data.byType.map((type) => (
						<li key={type.eventTypeId}>
							<span>{type.label}</span>
							<span>{type.count}×</span>
							<span className="type-breakdown__delta" style={{ color: energyDeltaColor(type.averageEnergyDelta) }}>
								{type.averageEnergyDelta != null ? type.averageEnergyDelta.toFixed(1) : "—"}
							</span>
						</li>
					))}
				</ul>
			)}

			<h2>{t("feedback.anonymousNotes")}</h2>
			{feedbackQuery.data?.belowMinimumSize && (
				<p className="empty-state">{t("feedback.notEnoughMembers", { count: feedbackQuery.data.memberCount })}</p>
			)}
			{feedbackQuery.data && !feedbackQuery.data.belowMinimumSize && feedbackQuery.data.items.length === 0 && (
				<p className="empty-state">{t("feedback.nobodySharedYet")}</p>
			)}
			{feedbackQuery.data && !feedbackQuery.data.belowMinimumSize && feedbackQuery.data.items.length > 0 && (
				<ul className="feedback-list">
					{feedbackQuery.data.items.map((item, index) => (
						// No id in the response by design (nothing traceable back to
						// whoever wrote it) — index is stable enough for this static list.
						<li key={index} className="feedback-list__item">
							<strong>{item.eventTypeLabel}</strong>
							{item.ingoingNote && <p>{item.ingoingNote}</p>}
							{item.outgoingNote && <p>{item.outgoingNote}</p>}
						</li>
					))}
				</ul>
			)}
		</div>
	);
}
