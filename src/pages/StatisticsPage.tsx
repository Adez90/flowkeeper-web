import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import { useAuth } from "react-oidc-context";
import { useQuery } from "@tanstack/react-query";
import { fetchPersonalStatistics } from "../api/statistics";
import { energyDeltaColor } from "../lib/energy";
import type { MeResponse, StatisticsPeriod } from "../api/types";

const PERIODS: StatisticsPeriod[] = ["DAY", "WEEK", "MONTH"];

export function StatisticsPage() {
	const me = useOutletContext<MeResponse>();
	const auth = useAuth();
	const token = auth.user?.access_token ?? "";
	const accountId = me.accounts[0]?.accountId;
	const [period, setPeriod] = useState<StatisticsPeriod>("WEEK");

	const statsQuery = useQuery({
		queryKey: ["statistics", accountId, period],
		queryFn: () => fetchPersonalStatistics(token, accountId ?? "", period),
		enabled: Boolean(accountId),
	});

	return (
		<div className="statistics-page">
			<div className="landing-page__toolbar">
				<h1>Your statistics</h1>
				<div className="period-switch">
					{PERIODS.map((p) => (
						<button
							key={p}
							type="button"
							className={`button ${period === p ? "button--primary" : ""}`}
							onClick={() => setPeriod(p)}
						>
							{p.charAt(0) + p.slice(1).toLowerCase()}
						</button>
					))}
				</div>
			</div>

			{statsQuery.isLoading && <p className="page-loading">Loading…</p>}

			{statsQuery.data && (
				<>
					<p className="statistics-page__range">
						{statsQuery.data.rangeStart} – {statsQuery.data.rangeEndExclusive}
					</p>

					<div className="stat-tiles">
						<div className="stat-tile">
							<span className="stat-tile__value">{statsQuery.data.totalEvents}</span>
							<span className="stat-tile__label">logged</span>
						</div>
						<div className="stat-tile">
							<span className="stat-tile__value">{statsQuery.data.openEvents}</span>
							<span className="stat-tile__label">ongoing</span>
						</div>
						<div className="stat-tile">
							<span
								className="stat-tile__value"
								style={{ color: energyDeltaColor(statsQuery.data.averageEnergyDelta) }}
							>
								{statsQuery.data.averageEnergyDelta != null ? statsQuery.data.averageEnergyDelta.toFixed(1) : "—"}
							</span>
							<span className="stat-tile__label">avg energy delta</span>
						</div>
					</div>

					<h2>By type</h2>
					{statsQuery.data.byType.length === 0 ? (
						<p className="empty-state">Nothing in this range yet.</p>
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
		</div>
	);
}
