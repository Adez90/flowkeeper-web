import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useAuth } from "react-oidc-context";
import type { AuthContextProps } from "react-oidc-context";
import * as reactRouterDom from "react-router-dom";
import { renderWithProviders } from "../test/testUtils";
import { StatisticsPage } from "./StatisticsPage";
import * as statisticsApi from "../api/statistics";
import { useActiveAccount } from "../context/useActiveAccount";
import { addDaysIso, toIsoDate } from "../lib/dates";
import type { AccountSummary, MeResponse, PersonalStatisticsResponse } from "../api/types";

vi.mock("react-oidc-context", () => ({ useAuth: vi.fn() }));
vi.mock("../api/statistics");
vi.mock("../context/useActiveAccount", () => ({ useActiveAccount: vi.fn() }));
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
		expect(mockedStatisticsApi.fetchPersonalStatistics).toHaveBeenCalledWith(
			"test-token",
			"account-1",
			"WEEK",
			toIsoDate(new Date()),
		);
	});

	it("re-fetches with DAY when that period is selected", async () => {
		mockedStatisticsApi.fetchPersonalStatistics.mockResolvedValue(statsFor());
		const user = userEvent.setup();

		renderWithProviders(<StatisticsPage />);
		await screen.findByText("5");

		await user.click(screen.getByRole("button", { name: "Day" }));

		await waitFor(() =>
			expect(mockedStatisticsApi.fetchPersonalStatistics).toHaveBeenCalledWith(
				"test-token",
				"account-1",
				"DAY",
				toIsoDate(new Date()),
			),
		);
	});

	it("re-fetches for a past reference date chosen via the date picker, and offers a jump back to today", async () => {
		mockedStatisticsApi.fetchPersonalStatistics.mockResolvedValue(statsFor());

		renderWithProviders(<StatisticsPage />);
		await screen.findByText("5");

		expect(screen.queryByRole("button", { name: "Today" })).not.toBeInTheDocument();

		const pastDate = addDaysIso(toIsoDate(new Date()), -10);
		fireEvent.change(screen.getByLabelText(/week containing/i), { target: { value: pastDate } });

		await waitFor(() =>
			expect(mockedStatisticsApi.fetchPersonalStatistics).toHaveBeenCalledWith(
				"test-token",
				"account-1",
				"WEEK",
				pastDate,
			),
		);
		const todayButton = await screen.findByRole("button", { name: "Today" });

		const user = userEvent.setup();
		await user.click(todayButton);

		await waitFor(() =>
			expect(mockedStatisticsApi.fetchPersonalStatistics).toHaveBeenLastCalledWith(
				"test-token",
				"account-1",
				"WEEK",
				toIsoDate(new Date()),
			),
		);
	});

	it("shows an empty state for the type breakdown when there's nothing to show", async () => {
		mockedStatisticsApi.fetchPersonalStatistics.mockResolvedValue(statsFor({ byType: [] }));

		renderWithProviders(<StatisticsPage />);

		await screen.findByText("Nothing in this range yet.");
	});

	it("fetches and renders the personal Flow % trend for the default 30-day range", async () => {
		mockedStatisticsApi.fetchPersonalStatistics.mockResolvedValue(statsFor());
		mockedStatisticsApi.fetchPersonalTrend.mockResolvedValue({
			rangeStart: "2026-02-15",
			rangeEndExclusive: "2026-03-17",
			points: [
				{ date: "2026-03-15", totalEvents: 2, completedEvents: 2, flowPercentage: 50 },
				{ date: "2026-03-16", totalEvents: 1, completedEvents: 1, flowPercentage: 100 },
			],
		});

		renderWithProviders(<StatisticsPage />);

		await screen.findByText("Flow % trend");
		await waitFor(() => expect(mockedStatisticsApi.fetchPersonalTrend).toHaveBeenCalled());
		expect(screen.getByRole("img", { name: "Flow percentage trend" })).toBeTruthy();
	});

	it("shows an error instead of an endless loading state when statistics fail to load", async () => {
		mockedStatisticsApi.fetchPersonalStatistics.mockRejectedValue(new Error("boom"));
		mockedStatisticsApi.fetchPersonalTrend.mockResolvedValue({ rangeStart: "2026-02-15", rangeEndExclusive: "2026-03-17", points: [] });

		renderWithProviders(<StatisticsPage />);

		await screen.findByText("Couldn't load your statistics — try again.");
	});

	it("changing the trend 'to' date re-fetches with the new range", async () => {
		mockedStatisticsApi.fetchPersonalStatistics.mockResolvedValue(statsFor());
		mockedStatisticsApi.fetchPersonalTrend.mockResolvedValue({
			rangeStart: "2026-02-15",
			rangeEndExclusive: "2026-03-17",
			points: [],
		});

		renderWithProviders(<StatisticsPage />);
		await waitFor(() => expect(mockedStatisticsApi.fetchPersonalTrend).toHaveBeenCalled());

		// A day still within the default 30-day window but earlier than today,
		// so the range stays valid (trendFrom < new "to") regardless of what
		// today happens to be when this test runs.
		const newTo = addDaysIso(toIsoDate(new Date()), -3);
		fireEvent.change(screen.getByLabelText("To"), { target: { value: newTo } });

		await waitFor(() =>
			expect(mockedStatisticsApi.fetchPersonalTrend).toHaveBeenLastCalledWith(
				"test-token",
				"account-1",
				expect.any(String),
				addDaysIso(newTo, 1),
			),
		);
	});
});
