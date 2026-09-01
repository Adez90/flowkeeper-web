import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import { useAuth } from "react-oidc-context";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { fetchPersonalStatistics, fetchPersonalTrend } from "../api/statistics";
import { useActiveAccount } from "../context/useActiveAccount";
import { energyDeltaColor } from "../lib/energy";
import { addDaysIso, toIsoDate } from "../lib/dates";
import { OrganisationStatistics } from "../components/OrganisationStatistics";
import { FlowTrendChart } from "../components/FlowTrendChart";
import { DiaryExportSection } from "../components/DiaryExportSection";
import type { MeResponse, StatisticsPeriod } from "../api/types";

const PERIODS: StatisticsPeriod[] = ["DAY", "WEEK", "MONTH"];

const TODAY = toIsoDate(new Date());
const DEFAULT_TREND_FROM = addDaysIso(TODAY, -29);

export function StatisticsPage() {
	const me = useOutletContext<MeResponse>();
	const { account, accountId } = useActiveAccount();
	const auth = useAuth();
	const { t } = useTranslation();
	const token = auth.user?.access_token ?? "";
	const [period, setPeriod] = useState<StatisticsPeriod>("WEEK");
	const [referenceDate, setReferenceDate] = useState(TODAY);
	const [trendFrom, setTrendFrom] = useState(DEFAULT_TREND_FROM);
	const [trendTo, setTrendTo] = useState(TODAY);
	const trendRangeEndExclusive = addDaysIso(trendTo, 1);

	const statsQuery = useQuery({
		queryKey: ["statistics", accountId, period, referenceDate],
		queryFn: () => fetchPersonalStatistics(token, accountId, period, referenceDate),
		enabled: Boolean(accountId),
	});
	const trendQuery = useQuery({
		queryKey: ["personal-trend", accountId, trendFrom, trendRangeEndExclusive],
		queryFn: () => fetchPersonalTrend(token, accountId, trendFrom, trendRangeEndExclusive),
		enabled: Boolean(accountId) && trendFrom < trendRangeEndExclusive,
	});

	const periodLabels: Record<StatisticsPeriod, string> = {
		DAY: t("statistics.day"),
		WEEK: t("statistics.week"),
		MONTH: t("statistics.month"),
	};

	return (
		<div className="statistics-page">
			<div className="landing-page__toolbar">
				<h1>{t("statistics.title")}</h1>
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
			<div className="date-range-picker statistics-page__date-picker">
				<label>
					{period === "DAY" ? t("statistics.dayLabel") : period === "WEEK" ? t("statistics.weekContaining") : t("statistics.monthContaining")}
					<input type="date" value={referenceDate} max={TODAY} onChange={(e) => setReferenceDate(e.target.value)} />
				</label>
				{referenceDate !== TODAY && (
					<button type="button" className="button" onClick={() => setReferenceDate(TODAY)}>
						{t("statistics.today")}
					</button>
				)}
			</div>

			{statsQuery.isLoading && <p className="page-loading">{t("statistics.loading")}</p>}
			{statsQuery.isError && <p className="error-text">{t("statistics.couldntLoad")}</p>}

			{statsQuery.data && (
				<>
					<p className="statistics-page__range">
						{statsQuery.data.rangeStart} – {statsQuery.data.rangeEndExclusive}
					</p>

					<div className="stat-tiles">
						<div className="stat-tile">
							<span className="stat-tile__value">{statsQuery.data.totalEvents}</span>
							<span className="stat-tile__label">{t("statistics.logged")}</span>
						</div>
						<div className="stat-tile">
							<span className="stat-tile__value">{statsQuery.data.openEvents}</span>
							<span className="stat-tile__label">{t("statistics.ongoing")}</span>
						</div>
						<div className="stat-tile">
							<span className="stat-tile__value">{statsQuery.data.flowPercentage.toFixed(0)}%</span>
							<span className="stat-tile__label">{t("statistics.inFlow")}</span>
						</div>
						<div className="stat-tile">
							<span
								className="stat-tile__value"
								style={{ color: energyDeltaColor(statsQuery.data.averageEnergyDelta) }}
							>
								{statsQuery.data.averageEnergyDelta != null ? statsQuery.data.averageEnergyDelta.toFixed(1) : "—"}
							</span>
							<span className="stat-tile__label">{t("statistics.avgEnergyDelta")}</span>
						</div>
					</div>

					<h2>{t("statistics.byType")}</h2>
					{statsQuery.data.byType.length === 0 ? (
						<p className="empty-state">{t("statistics.nothingInRange")}</p>
					) : (
						<ul className="type-breakdown">
							{statsQuery.data.byType.map((type) => (
								<li key={type.eventTypeId}>
									<span>{type.label}</span>
									<span>{type.count}×</span>
									<span
										className="type-breakdown__delta"
										style={{ color: energyDeltaColor(type.averageEnergyDelta) }}
									>
										{type.averageEnergyDelta != null ? type.averageEnergyDelta.toFixed(1) : "—"}
									</span>
								</li>
							))}
						</ul>
					)}
				</>
			)}

			<section className="trend-section">
				<div className="landing-page__toolbar">
					<h2>{t("statistics.flowTrend")}</h2>
					<div className="date-range-picker">
						<label>
							{t("statistics.from")}
							<input
								type="date"
								value={trendFrom}
								max={trendTo}
								onChange={(event) => setTrendFrom(event.target.value)}
							/>
						</label>
						<label>
							{t("statistics.to")}
							<input
								type="date"
								value={trendTo}
								min={trendFrom}
								max={TODAY}
								onChange={(event) => setTrendTo(event.target.value)}
							/>
						</label>
					</div>
				</div>
				{trendQuery.isLoading && <p className="page-loading">{t("statistics.loading")}</p>}
				{trendQuery.isError && <p className="error-text">{t("statistics.couldntLoad")}</p>}
				{trendQuery.data && <FlowTrendChart points={trendQuery.data.points} />}
			</section>

			{account.type === "PERSONAL" && <DiaryExportSection accountId={accountId} token={token} displayName={me.displayName} />}

			{account.type === "ORGANISATION" && (
				<OrganisationStatistics
					accountId={accountId}
					meUserId={me.userId}
					role={account.role}
					token={token}
					period={period}
					trendFrom={trendFrom}
					trendRangeEndExclusive={trendRangeEndExclusive}
				/>
			)}
		</div>
	);
}
