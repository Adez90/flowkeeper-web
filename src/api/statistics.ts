import { apiFetchJson } from "./client";
import type { PersonalStatisticsResponse, StatisticsPeriod } from "./types";

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
