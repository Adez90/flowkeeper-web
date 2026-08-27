import { apiFetchJson } from "./client";
import type {
	AggregateStatisticsResponse,
	OrganisationFeedbackResponse,
	OrganisationTypeStatisticsResponse,
	PersonalStatisticsResponse,
	StatisticsPeriod,
} from "./types";

export function fetchPersonalStatistics(
	token: string,
	accountId: string,
	period: StatisticsPeriod,
	date?: string,
): Promise<PersonalStatisticsResponse> {
	const params = new URLSearchParams({ accountId, period });
	if (date) {
		params.set("date", date);
	}
	return apiFetchJson<PersonalStatisticsResponse>(`/api/v1/statistics/personal?${params.toString()}`, { token });
}

export function fetchGroupStatistics(
	token: string,
	accountId: string,
	groupId: string,
	period: StatisticsPeriod,
	date?: string,
): Promise<AggregateStatisticsResponse> {
	const params = new URLSearchParams({ accountId, groupId, period });
	if (date) {
		params.set("date", date);
	}
	return apiFetchJson<AggregateStatisticsResponse>(`/api/v1/statistics/group?${params.toString()}`, { token });
}

export function fetchDepartmentStatistics(
	token: string,
	accountId: string,
	departmentId: string,
	period: StatisticsPeriod,
	date?: string,
): Promise<AggregateStatisticsResponse> {
	const params = new URLSearchParams({ accountId, departmentId, period });
	if (date) {
		params.set("date", date);
	}
	return apiFetchJson<AggregateStatisticsResponse>(`/api/v1/statistics/department?${params.toString()}`, { token });
}

export function fetchOrganisationStatistics(
	token: string,
	accountId: string,
	period: StatisticsPeriod,
	date?: string,
): Promise<AggregateStatisticsResponse> {
	const params = new URLSearchParams({ accountId, period });
	if (date) {
		params.set("date", date);
	}
	return apiFetchJson<AggregateStatisticsResponse>(`/api/v1/statistics/organisation?${params.toString()}`, { token });
}

export function fetchOrganisationTypeStatistics(
	token: string,
	accountId: string,
	period: StatisticsPeriod,
	date?: string,
): Promise<OrganisationTypeStatisticsResponse> {
	const params = new URLSearchParams({ accountId, period });
	if (date) {
		params.set("date", date);
	}
	return apiFetchJson<OrganisationTypeStatisticsResponse>(`/api/v1/statistics/organisation/by-type?${params.toString()}`, {
		token,
	});
}

export function fetchOrganisationFeedback(token: string, accountId: string): Promise<OrganisationFeedbackResponse> {
	const params = new URLSearchParams({ accountId });
	return apiFetchJson<OrganisationFeedbackResponse>(`/api/v1/statistics/organisation/feedback?${params.toString()}`, {
		token,
	});
}
