import { describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import { renderWithProviders } from "../test/testUtils";
import { OrganisationStatistics } from "./OrganisationStatistics";
import * as organisationsApi from "../api/organisations";
import * as statisticsApi from "../api/statistics";
import type { MemberResponse } from "../api/types";

vi.mock("../api/organisations");
vi.mock("../api/statistics");

const mockedOrganisationsApi = vi.mocked(organisationsApi);
const mockedStatisticsApi = vi.mocked(statisticsApi);

const OWNER: MemberResponse = {
	userId: "u1",
	displayName: "Anders Johansson",
	email: "anders@example.com",
	role: "OWNER",
	departmentId: null,
	groupId: null,
	shareFlowWithPeers: false,
};

function renderTrend() {
	return renderWithProviders(
		<OrganisationStatistics
			accountId="org-1"
			meUserId="u1"
			role="OWNER"
			token="test-token"
			period="WEEK"
			trendFrom="2026-02-15"
			trendRangeEndExclusive="2026-03-17"
		/>,
	);
}

describe("OrganisationStatistics trend", () => {
	it("shows the organisation's Flow % trend chart once above the minimum size", async () => {
		mockedOrganisationsApi.fetchMembers.mockResolvedValue([OWNER]);
		mockedStatisticsApi.fetchOrganisationStatistics.mockResolvedValue({
			period: "WEEK",
			rangeStart: "2026-03-09",
			rangeEndExclusive: "2026-03-16",
			memberCount: 5,
			belowMinimumSize: false,
			totalEvents: 10,
			completedEvents: 8,
			flowPercentage: 75,
			averageEnergyDelta: 0.5,
		});
		mockedStatisticsApi.fetchOrganisationTrend.mockResolvedValue({
			rangeStart: "2026-02-15",
			rangeEndExclusive: "2026-03-17",
			memberCount: 5,
			belowMinimumSize: false,
			points: [{ date: "2026-03-16", totalEvents: 3, completedEvents: 2, flowPercentage: 50 }],
		});

		renderTrend();

		await screen.findByText("Your organisation's trend");
		await waitFor(() =>
			expect(mockedStatisticsApi.fetchOrganisationTrend).toHaveBeenCalledWith(
				"test-token",
				"org-1",
				"2026-02-15",
				"2026-03-17",
			),
		);
		expect(screen.getByRole("img", { name: "Flow percentage trend" })).toBeTruthy();
	});

	it("withholds the trend chart below the minimum member size", async () => {
		mockedOrganisationsApi.fetchMembers.mockResolvedValue([OWNER]);
		mockedStatisticsApi.fetchOrganisationStatistics.mockResolvedValue({
			period: "WEEK",
			rangeStart: "2026-03-09",
			rangeEndExclusive: "2026-03-16",
			memberCount: 2,
			belowMinimumSize: true,
			totalEvents: null,
			completedEvents: null,
			flowPercentage: null,
			averageEnergyDelta: null,
		});
		mockedStatisticsApi.fetchOrganisationTrend.mockResolvedValue({
			rangeStart: "2026-02-15",
			rangeEndExclusive: "2026-03-17",
			memberCount: 2,
			belowMinimumSize: true,
			points: null,
		});

		renderTrend();

		await screen.findByText("Not enough members yet (2) to show a trend without singling anyone out.");
		expect(screen.queryByRole("img", { name: "Flow percentage trend" })).toBeNull();
	});

	it("shows an error instead of an endless loading state when a query fails", async () => {
		mockedOrganisationsApi.fetchMembers.mockResolvedValue([OWNER]);
		mockedStatisticsApi.fetchOrganisationStatistics.mockRejectedValue(new Error("boom"));
		mockedStatisticsApi.fetchOrganisationTrend.mockRejectedValue(new Error("boom"));

		renderTrend();

		await screen.findAllByText("Couldn't load your statistics — try again.");
	});
});

const GROUP_MEMBER: MemberResponse = {
	userId: "u2",
	displayName: "Group Member",
	email: "member@example.com",
	role: "MEMBER",
	departmentId: null,
	groupId: "group-1",
	shareFlowWithPeers: true,
};

function renderForGroupMember() {
	return renderWithProviders(
		<OrganisationStatistics
			accountId="org-1"
			meUserId="u2"
			role="MEMBER"
			token="test-token"
			period="WEEK"
			trendFrom="2026-02-15"
			trendRangeEndExclusive="2026-03-17"
		/>,
	);
}

describe("OrganisationStatistics team flow gauges", () => {
	it("shows each opted-in teammate's own name and Flow % — visible to a plain MEMBER of the group, not just its coach", async () => {
		mockedOrganisationsApi.fetchMembers.mockResolvedValue([GROUP_MEMBER]);
		mockedStatisticsApi.fetchGroupMemberFlow.mockResolvedValue({
			period: "WEEK",
			rangeStart: "2026-03-09",
			rangeEndExclusive: "2026-03-16",
			members: [
				{ userId: "u2", displayName: "Group Member", completedEvents: 4, flowPercentage: 75 },
				{ userId: "u3", displayName: "Another Sharer", completedEvents: 2, flowPercentage: 50 },
			],
		});

		renderForGroupMember();

		await screen.findByText("Team Flow %");
		expect(await screen.findByRole("img", { name: "Group Member: 75% in flow" })).toBeTruthy();
		expect(screen.getByRole("img", { name: "Another Sharer: 50% in flow" })).toBeTruthy();
		await waitFor(() =>
			expect(mockedStatisticsApi.fetchGroupMemberFlow).toHaveBeenCalledWith("test-token", "org-1", "group-1", "WEEK"),
		);
	});

	it("shows an empty state when nobody in the group has opted in yet", async () => {
		mockedOrganisationsApi.fetchMembers.mockResolvedValue([GROUP_MEMBER]);
		mockedStatisticsApi.fetchGroupMemberFlow.mockResolvedValue({
			period: "WEEK",
			rangeStart: "2026-03-09",
			rangeEndExclusive: "2026-03-16",
			members: [],
		});

		renderForGroupMember();

		await screen.findByText("No one in the group has chosen to share their Flow % yet.");
	});
});
