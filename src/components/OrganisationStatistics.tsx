import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import type { UseQueryResult } from "@tanstack/react-query";
import { fetchMembers } from "../api/organisations";
import {
	fetchDepartmentStatistics,
	fetchDepartmentTrend,
	fetchGroupMemberFlow,
	fetchGroupStatistics,
	fetchGroupTrend,
	fetchOrganisationStatistics,
	fetchOrganisationTrend,
} from "../api/statistics";
import { energyDeltaColor } from "../lib/energy";
import { FlowGauge } from "./FlowGauge";
import { FlowTrendChart } from "./FlowTrendChart";
import type {
	AggregateStatisticsResponse,
	AggregateTrendResponse,
	GroupMemberFlowResponse,
	MemberRole,
	StatisticsPeriod,
} from "../api/types";

interface OrganisationStatisticsProps {
	accountId: string;
	meUserId: string;
	role: MemberRole;
	token: string;
	period: StatisticsPeriod;
	trendFrom: string;
	trendRangeEndExclusive: string;
}

/**
 * The supervisory statistics views: a group's own COACH sees that group's
 * rollup, a department's own ADMIN sees that department's, and the org
 * OWNER sees the whole organisation's — mirroring exactly who the backend
 * lets view each endpoint (a plain MEMBER never sees an aggregate, only
 * their own personal stats above). An org-wide ADMIN (no department scope)
 * can see any department/group's stats too, but has no single default
 * scope to show automatically here — browsing those is a follow-up on top
 * of the Organisation page's structure view.
 */
export function OrganisationStatistics({
	accountId,
	meUserId,
	role,
	token,
	period,
	trendFrom,
	trendRangeEndExclusive,
}: OrganisationStatisticsProps) {
	const membersQuery = useQuery({
		queryKey: ["organisation-members", accountId],
		queryFn: () => fetchMembers(token, accountId),
	});
	const me = membersQuery.data?.find((member) => member.userId === meUserId);

	const groupId = role === "COACH" ? me?.groupId : null;
	const departmentId = role === "ADMIN" ? me?.departmentId : null;
	// Unlike groupId above (the COACH's supervisory scope), this is anyone's
	// own group membership — a plain MEMBER has one too, and this is their
	// view onto teammates who've opted in, not an aggregate they supervise.
	const myGroupId = me?.groupId ?? null;

	const groupMemberFlowQuery = useQuery({
		queryKey: ["group-member-flow", accountId, myGroupId, period],
		queryFn: () => fetchGroupMemberFlow(token, accountId, myGroupId as string, period),
		enabled: Boolean(myGroupId),
	});

	const groupQuery = useQuery({
		queryKey: ["group-statistics", accountId, groupId, period],
		queryFn: () => fetchGroupStatistics(token, accountId, groupId as string, period),
		enabled: Boolean(groupId),
	});
	const departmentQuery = useQuery({
		queryKey: ["department-statistics", accountId, departmentId, period],
		queryFn: () => fetchDepartmentStatistics(token, accountId, departmentId as string, period),
		enabled: Boolean(departmentId),
	});
	const organisationQuery = useQuery({
		queryKey: ["organisation-statistics", accountId, period],
		queryFn: () => fetchOrganisationStatistics(token, accountId, period),
		enabled: role === "OWNER",
	});

	const groupTrendQuery = useQuery({
		queryKey: ["group-trend", accountId, groupId, trendFrom, trendRangeEndExclusive],
		queryFn: () => fetchGroupTrend(token, accountId, groupId as string, trendFrom, trendRangeEndExclusive),
		enabled: Boolean(groupId),
	});
	const departmentTrendQuery = useQuery({
		queryKey: ["department-trend", accountId, departmentId, trendFrom, trendRangeEndExclusive],
		queryFn: () => fetchDepartmentTrend(token, accountId, departmentId as string, trendFrom, trendRangeEndExclusive),
		enabled: Boolean(departmentId),
	});
	const organisationTrendQuery = useQuery({
		queryKey: ["organisation-trend", accountId, trendFrom, trendRangeEndExclusive],
		queryFn: () => fetchOrganisationTrend(token, accountId, trendFrom, trendRangeEndExclusive),
		enabled: role === "OWNER",
	});

	const { t } = useTranslation();

	if (!groupId && !departmentId && role !== "OWNER" && !myGroupId) {
		return null;
	}

	return (
		<>
			{groupId && <AggregateSection title={t("statistics.yourGroup")} query={groupQuery} />}
			{groupId && <AggregateTrendSection title={t("statistics.yourGroupTrend")} query={groupTrendQuery} />}
			{myGroupId && <GroupPeerFlowSection query={groupMemberFlowQuery} />}
			{departmentId && <AggregateSection title={t("statistics.yourDepartment")} query={departmentQuery} />}
			{departmentId && <AggregateTrendSection title={t("statistics.yourDepartmentTrend")} query={departmentTrendQuery} />}
			{role === "OWNER" && <AggregateSection title={t("statistics.yourOrganisation")} query={organisationQuery} />}
			{role === "OWNER" && <AggregateTrendSection title={t("statistics.yourOrganisationTrend")} query={organisationTrendQuery} />}
		</>
	);
}

/** Each teammate who's opted to share their Flow % with the group, by name — never anyone above group level. */
function GroupPeerFlowSection({ query }: { query: UseQueryResult<GroupMemberFlowResponse> }) {
	const { t } = useTranslation();
	const members = query.data?.members;
	return (
		<section className="aggregate-section">
			<h2>{t("statistics.teamFlow")}</h2>
			{query.isLoading && <p className="page-loading">{t("statistics.loading")}</p>}
			{query.isError && <p className="error-text">{t("statistics.couldntLoad")}</p>}
			{members && members.length === 0 && <p className="empty-state">{t("statistics.noOneSharingYet")}</p>}
			{members && members.length > 0 && (
				<div className="flow-gauge-row">
					{members.map((member) => (
						<FlowGauge key={member.userId} displayName={member.displayName} flowPercentage={member.flowPercentage} />
					))}
				</div>
			)}
		</section>
	);
}

function AggregateTrendSection({ title, query }: { title: string; query: UseQueryResult<AggregateTrendResponse> }) {
	const { t } = useTranslation();
	const data = query.data;
	return (
		<section className="trend-section">
			<h2>{title}</h2>
			{query.isLoading && <p className="page-loading">{t("statistics.loading")}</p>}
			{query.isError && <p className="error-text">{t("statistics.couldntLoad")}</p>}
			{data?.belowMinimumSize && (
				<p className="empty-state">{t("statistics.notEnoughMembersForTrend", { count: data.memberCount })}</p>
			)}
			{data && !data.belowMinimumSize && data.points && <FlowTrendChart points={data.points} />}
		</section>
	);
}

function AggregateSection({ title, query }: { title: string; query: UseQueryResult<AggregateStatisticsResponse> }) {
	const { t } = useTranslation();
	const data = query.data;
	return (
		<section className="aggregate-section">
			<h2>{title}</h2>
			{query.isLoading && <p className="page-loading">{t("statistics.loading")}</p>}
			{query.isError && <p className="error-text">{t("statistics.couldntLoad")}</p>}
			{data?.belowMinimumSize && (
				<p className="empty-state">{t("statistics.notEnoughMembersForTotal", { count: data.memberCount })}</p>
			)}
			{data && !data.belowMinimumSize && (
				<div className="stat-tiles">
					<div className="stat-tile">
						<span className="stat-tile__value">{data.memberCount}</span>
						<span className="stat-tile__label">{t("statistics.members")}</span>
					</div>
					<div className="stat-tile">
						<span className="stat-tile__value">{data.flowPercentage != null ? `${data.flowPercentage.toFixed(0)}%` : "—"}</span>
						<span className="stat-tile__label">{t("statistics.inFlow")}</span>
					</div>
					<div className="stat-tile">
						<span className="stat-tile__value" style={{ color: energyDeltaColor(data.averageEnergyDelta) }}>
							{data.averageEnergyDelta != null ? data.averageEnergyDelta.toFixed(1) : "—"}
						</span>
						<span className="stat-tile__label">{t("statistics.avgEnergyDelta")}</span>
					</div>
				</div>
			)}
		</section>
	);
}
