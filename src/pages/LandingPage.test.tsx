import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useAuth } from "react-oidc-context";
import type { AuthContextProps } from "react-oidc-context";
import { renderWithProviders } from "../test/testUtils";
import { LandingPage } from "./LandingPage";
import * as eventsApi from "../api/events";
import * as integrationsApi from "../api/integrations";
import { useActiveAccount } from "../context/useActiveAccount";
import type { AccountSummary, EventResponse } from "../api/types";

vi.mock("react-oidc-context", () => ({ useAuth: vi.fn() }));
vi.mock("../api/events");
vi.mock("../api/integrations");
vi.mock("../context/useActiveAccount", () => ({ useActiveAccount: vi.fn() }));

const mockedUseAuth = vi.mocked(useAuth);
const mockedUseActiveAccount = vi.mocked(useActiveAccount);
const mockedEventsApi = vi.mocked(eventsApi);
const mockedIntegrationsApi = vi.mocked(integrationsApi);

const ACCOUNT: AccountSummary = { accountId: "account-1", name: "Anders Johansson", type: "PERSONAL", role: "OWNER" };

const OPEN_EVENT: EventResponse = {
	id: "event-1",
	accountId: "account-1",
	eventTypeId: "type-1",
	eventTypeLabel: "Meeting",
	status: "OPEN",
	ingoingEnergy: 4,
	ingoingNote: null,
	outgoingEnergy: null,
	outgoingNote: null,
	shareAnonymously: false,
	startedAt: "2026-01-01T10:00:00Z",
	completedAt: null,
	externalProvider: null,
	externalEndedAt: null,
};

const IMPORTED_UNSTARTED_EVENT: EventResponse = {
	...OPEN_EVENT,
	id: "event-2",
	ingoingEnergy: null,
	externalProvider: "STRAVA",
};

describe("LandingPage", () => {
	beforeEach(() => {
		mockedUseAuth.mockReturnValue({ user: { access_token: "test-token" } } as AuthContextProps);
		mockedUseActiveAccount.mockReturnValue({
			account: ACCOUNT,
			accountId: ACCOUNT.accountId,
			accounts: [ACCOUNT],
			setAccountId: vi.fn(),
		});
	});

	it("shows an empty state when there are no ongoing events", async () => {
		mockedEventsApi.listEvents.mockResolvedValue([]);

		renderWithProviders(<LandingPage />);

		await screen.findByText("Nothing ongoing right now — log an activity to get started.");
	});

	it("lists ongoing events with a Complete action each", async () => {
		mockedEventsApi.listEvents.mockResolvedValue([OPEN_EVENT]);

		renderWithProviders(<LandingPage />);

		await screen.findByText("Meeting");
		expect(screen.getByText("ingoing energy 4/5")).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Complete" })).toBeInTheDocument();
	});

	it("queries this account's OPEN events specifically", async () => {
		mockedEventsApi.listEvents.mockResolvedValue([]);

		renderWithProviders(<LandingPage />);

		await screen.findByText("Nothing ongoing right now — log an activity to get started.");
		expect(mockedEventsApi.listEvents).toHaveBeenCalledWith("test-token", "account-1", "OPEN");
	});

	it("opens the create-event dialog from the toolbar button", async () => {
		mockedEventsApi.listEvents.mockResolvedValue([]);
		mockedEventsApi.listEventTypes.mockResolvedValue([]);
		const user = userEvent.setup();

		renderWithProviders(<LandingPage />);

		await user.click(screen.getByRole("button", { name: "+ Log activity" }));

		expect(screen.getByText("Log an activity")).toBeInTheDocument();
	});

	it("shows a Start action instead of Complete for an imported event that hasn't been started yet", async () => {
		mockedEventsApi.listEvents.mockResolvedValue([IMPORTED_UNSTARTED_EVENT]);

		renderWithProviders(<LandingPage />);

		await screen.findByText("Meeting");
		expect(screen.getByText("Tap Start to add your energy")).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Start" })).toBeInTheDocument();
		expect(screen.queryByRole("button", { name: "Complete" })).not.toBeInTheDocument();
	});

	it("opens the start dialog for an imported event", async () => {
		mockedEventsApi.listEvents.mockResolvedValue([IMPORTED_UNSTARTED_EVENT]);
		const user = userEvent.setup();

		renderWithProviders(<LandingPage />);

		await user.click(await screen.findByRole("button", { name: "Start" }));

		expect(screen.getByText('Start "Meeting"')).toBeInTheDocument();
	});

	it("opens the import-events dialog from the toolbar button", async () => {
		mockedEventsApi.listEvents.mockResolvedValue([]);
		mockedEventsApi.listEventTypes.mockResolvedValue([]);
		mockedIntegrationsApi.listImportable.mockResolvedValue([]);
		const user = userEvent.setup();

		renderWithProviders(<LandingPage />);

		await user.click(screen.getByRole("button", { name: "Import events" }));

		expect(screen.getByText("Import today's activities")).toBeInTheDocument();
	});
});
