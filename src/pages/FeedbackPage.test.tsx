import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import { useAuth } from "react-oidc-context";
import type { AuthContextProps } from "react-oidc-context";
import { renderWithProviders } from "../test/testUtils";
import { FeedbackPage } from "./FeedbackPage";
import * as statisticsApi from "../api/statistics";
import { useActiveAccount } from "../context/useActiveAccount";
import type { AccountSummary, OrganisationFeedbackResponse, OrganisationTypeStatisticsResponse } from "../api/types";

vi.mock("react-oidc-context", () => ({ useAuth: vi.fn() }));
vi.mock("../api/statistics");
vi.mock("../context/useActiveAccount", () => ({ useActiveAccount: vi.fn() }));

const mockedUseAuth = vi.mocked(useAuth);
const mockedUseActiveAccount = vi.mocked(useActiveAccount);
const mockedStatisticsApi = vi.mocked(statisticsApi);

const OWNER_ACCOUNT: AccountSummary = { accountId: "org-1", name: "Acme AB", type: "ORGANISATION", role: "OWNER" };

function setActiveAccount(account: AccountSummary) {
	mockedUseActiveAccount.mockReturnValue({ account, accountId: account.accountId, accounts: [account], setAccountId: vi.fn() });
}

describe("FeedbackPage", () => {
	beforeEach(() => {
		mockedUseAuth.mockReturnValue({ user: { access_token: "test-token" } } as AuthContextProps);
	});

	it("is restricted to the organisation owner", () => {
		setActiveAccount({ ...OWNER_ACCOUNT, role: "MEMBER" });

		renderWithProviders(<FeedbackPage />);

		expect(screen.getByText("Only the organisation owner can see this.")).toBeInTheDocument();
	});

	it("shows the by-type breakdown and anonymous notes once above the minimum size", async () => {
		setActiveAccount(OWNER_ACCOUNT);
		const byType: OrganisationTypeStatisticsResponse = {
			period: "WEEK",
			rangeStart: "2026-03-09",
			rangeEndExclusive: "2026-03-16",
			memberCount: 12,
			belowMinimumSize: false,
			byType: [{ eventTypeId: "type-1", label: "Meeting", count: 4, averageEnergyDelta: -0.5 }],
		};
		const feedback: OrganisationFeedbackResponse = {
			memberCount: 12,
			belowMinimumSize: false,
			items: [{ eventTypeLabel: "Meeting", ingoingNote: "felt rushed", outgoingNote: "still rushed", startedAt: "2026-03-10T10:00:00Z" }],
		};
		mockedStatisticsApi.fetchOrganisationTypeStatistics.mockResolvedValue(byType);
		mockedStatisticsApi.fetchOrganisationFeedback.mockResolvedValue(feedback);

		renderWithProviders(<FeedbackPage />);

		await screen.findByText("Meeting", { selector: "strong" });
		expect(screen.getAllByText("Meeting")).toHaveLength(2); // the by-type breakdown row, plus the feedback note's event type
		expect(screen.getByText("felt rushed")).toBeInTheDocument();
		expect(screen.getByText("still rushed")).toBeInTheDocument();
	});

	it("shows an error instead of a silently empty page when the stats fail to load", async () => {
		setActiveAccount(OWNER_ACCOUNT);
		mockedStatisticsApi.fetchOrganisationTypeStatistics.mockRejectedValue(new Error("boom"));
		mockedStatisticsApi.fetchOrganisationFeedback.mockRejectedValue(new Error("boom"));

		renderWithProviders(<FeedbackPage />);

		const messages = await screen.findAllByText("Couldn't load this — try again.");
		expect(messages).toHaveLength(2);
	});

	it("shows the withheld message below the minimum size", async () => {
		setActiveAccount(OWNER_ACCOUNT);
		mockedStatisticsApi.fetchOrganisationTypeStatistics.mockResolvedValue({
			period: "WEEK",
			rangeStart: "2026-03-09",
			rangeEndExclusive: "2026-03-16",
			memberCount: 3,
			belowMinimumSize: true,
			byType: [],
		});
		mockedStatisticsApi.fetchOrganisationFeedback.mockResolvedValue({ memberCount: 3, belowMinimumSize: true, items: [] });

		renderWithProviders(<FeedbackPage />);

		const messages = await screen.findAllByText("Not enough members yet (3) to show this anonymously.");
		expect(messages).toHaveLength(2);
	});
});
