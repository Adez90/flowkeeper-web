import { useQuery } from "@tanstack/react-query";
import { fetchMembers } from "../api/organisations";
import { fetchDepartmentStatistics, fetchGroupStatistics, fetchOrganisationStatistics } from "../api/statistics";
import { energyDeltaColor } from "../lib/energy";
import type { AggregateStatisticsResponse, MemberRole, StatisticsPeriod } from "../api/types";

interface OrganisationStatisticsProps {
	accountId: string;
	meUserId: string;
	role: MemberRole;
	token: string;
	period: StatisticsPeriod;
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
export function OrganisationStatistics({ accountId, meUserId, role, token, period }: OrganisationStatisticsProps) {
	const membersQuery = useQuery({
		queryKey: ["organisation-members", accountId],
		queryFn: () => fetchMembers(token, accountId),
	});
	const me = membersQuery.data?.find((member) => member.userId === meUserId);

	const groupId = role === "COACH" ? me?.groupId : null;
	const departmentId = role === "ADMIN" ? me?.departmentId : null;

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

	if (!groupId && !departmentId && role !== "OWNER") {
		return null;
	}

	return (
		<>
			{groupId && <AggregateSection title="Your group" data={groupQuery.data} />}
			{departmentId && <AggregateSection title="Your department" data={departmentQuery.data} />}
			{role === "OWNER" && <AggregateSection title="Your organisation" data={organisationQuery.data} />}
		</>
	);
}

function AggregateSection({ title, data }: { title: string; data?: AggregateStatisticsResponse }) {
	return (
		<section className="aggregate-section">
			<h2>{title}</h2>
			{!data && <p className="page-loading">Loading…</p>}
			{data?.belowMinimumSize && (
				<p className="empty-state">
					Not enough members yet ({data.memberCount}) to show a total without singling anyone out.
				</p>
			)}
			{data && !data.belowMinimumSize && (
				<div className="stat-tiles">
					<div className="stat-tile">
						<span className="stat-tile__value">{data.memberCount}</span>
						<span className="stat-tile__label">members</span>
					</div>
					<div className="stat-tile">
						<span className="stat-tile__value">{data.flowPercentage != null ? `${data.flowPercentage.toFixed(0)}%` : "—"}</span>
						<span className="stat-tile__label">in flow</span>
					</div>
					<div className="stat-tile">
						<span className="stat-tile__value" style={{ color: energyDeltaColor(data.averageEnergyDelta) }}>
							{data.averageEnergyDelta != null ? data.averageEnergyDelta.toFixed(1) : "—"}
						</span>
						<span className="stat-tile__label">avg energy delta</span>
					</div>
				</div>
			)}
		</section>
	);
}
