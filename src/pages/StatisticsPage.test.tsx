import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useAuth } from "react-oidc-context";
import type { AuthContextProps } from "react-oidc-context";
import * as reactRouterDom from "react-router-dom";
import { renderWithProviders } from "../test/testUtils";
import { StatisticsPage } from "./StatisticsPage";
import * as statisticsApi from "../api/statistics";
import { useActiveAccount } from "../context/ActiveAccountContext";
import type { AccountSummary, MeResponse, PersonalStatisticsResponse } from "../api/types";

vi.mock("react-oidc-context", () => ({ useAuth: vi.fn() }));
vi.mock("../api/statistics");
vi.mock("../context/ActiveAccountContext", () => ({ useActiveAccount: vi.fn() }));
vi.mock("react-router-dom", async (importOriginal) => {
	const actual = await importOriginal<typeof reactRouterDom>();
	return { ...actual, useOutletContext: vi.fn() };
});

const mockedUseAuth = vi.mocked(useAuth);
const mockedUseOutletContext = vi.mocked(reactRouterDom.useOutletContext);
const mockedUseActiveAccount = vi.mocked(useActiveAccount);
const mockedStatisticsApi = vi.mocked(statisticsApi);

const ACCOUNT: AccountSummary = { accountId: "account-1", name: "Anders Johansson", type: "PERSONAL", role: "OWNER" };

const ME: MeResponse = {
	userId: "u1",
	displayName: "Anders Johansson",
	email: "anders@example.com",
	timezone: "UTC",
	locale: null,
	avatarUrl: null,
	notifyInApp: false,
	notifyPush: false,
	notifyEmail: false,
	accounts: [ACCOUNT],
};

function statsFor(overrides: Partial<PersonalStatisticsResponse> = {}): PersonalStatisticsResponse {
	return {
		period: "WEEK",
		rangeStart: "2026-03-09",
		rangeEndExclusive: "2026-03-16",
		totalEvents: 5,
		completedEvents: 3,
		openEvents: 2,
		averageIngoingEnergy: 3.4,
		averageEnergyDelta: -0.5,
		flowPercentage: 66.67,
		byType: [{ eventTypeId: "type-1", label: "Meeting", count: 2, averageEnergyDelta: -1 }],
		...overrides,
	};
}

describe("StatisticsPage", () => {
	beforeEach(() => {
		mockedUseAuth.mockReturnValue({ user: { access_token: "test-token" } } as AuthContextProps);
		mockedUseOutletContext.mockReturnValue(ME);
		mockedUseActiveAccount.mockReturnValue({
			account: ACCOUNT,
			accountId: ACCOUNT.accountId,
			accounts: [ACCOUNT],
			setAccountId: vi.fn(),
		});
	});

	it("defaults to the WEEK period and shows the totals", async () => {
		mockedStatisticsApi.fetchPersonalStatistics.mockResolvedValue(statsFor());

		renderWithProviders(<StatisticsPage />);

		await screen.findByText("5");
		expect(mockedStatisticsApi.fetchPersonalStatistics).toHaveBeenCalledWith("test-token", "account-1", "WEEK");
	});

	it("re-fetches with DAY when that period is selected", async () => {
		mockedStatisticsApi.fetchPersonalStatistics.mockResolvedValue(statsFor());
		const user = userEvent.setup();

		renderWithProviders(<StatisticsPage />);
		await screen.findByText("5");

		await user.click(screen.getByRole("button", { name: "Day" }));

		await waitFor(() =>
			expect(mockedStatisticsApi.fetchPersonalStatistics).toHaveBeenCalledWith("test-token", "account-1", "DAY"),
		);
	});

	it("shows an empty state for the type breakdown when there's nothing to show", async () => {
		mockedStatisticsApi.fetchPersonalStatistics.mockResolvedValue(statsFor({ byType: [] }));

		renderWithProviders(<StatisticsPage />);

		await screen.findByText("Nothing in this range yet.");
	});
});
