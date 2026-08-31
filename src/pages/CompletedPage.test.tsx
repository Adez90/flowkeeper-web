import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useAuth } from "react-oidc-context";
import type { AuthContextProps } from "react-oidc-context";
import { renderWithProviders } from "../test/testUtils";
import { CompletedPage } from "./CompletedPage";
import * as eventsApi from "../api/events";
import { useActiveAccount } from "../context/ActiveAccountContext";
import { addDaysIso, toIsoDate } from "../lib/dates";
import type { AccountSummary, EventResponse, EventTypeResponse } from "../api/types";

vi.mock("react-oidc-context", () => ({ useAuth: vi.fn() }));
vi.mock("../api/events");
vi.mock("../context/ActiveAccountContext", () => ({ useActiveAccount: vi.fn() }));

const mockedUseAuth = vi.mocked(useAuth);
const mockedUseActiveAccount = vi.mocked(useActiveAccount);
const mockedEventsApi = vi.mocked(eventsApi);

const ACCOUNT: AccountSummary = { accountId: "account-1", name: "Anders Johansson", type: "PERSONAL", role: "OWNER" };

const TYPES: EventTypeResponse[] = [
	{ id: "type-1", code: "meeting", label: "Meeting", icon: "meeting", isDefault: true },
];

const COMPLETED_EVENT: EventResponse = {
	id: "event-1",
	accountId: "account-1",
	eventTypeId: "type-1",
	eventTypeLabel: "Meeting",
	status: "COMPLETED",
	ingoingEnergy: 3,
	ingoingNote: null,
	outgoingEnergy: 4,
	outgoingNote: null,
	shareAnonymously: false,
	startedAt: "2026-01-01T08:00:00Z",
	completedAt: "2026-01-01T09:00:00Z",
};

const TODAY = toIsoDate(new Date());

describe("CompletedPage", () => {
	beforeEach(() => {
		mockedUseAuth.mockReturnValue({ user: { access_token: "test-token" } } as AuthContextProps);
		mockedUseActiveAccount.mockReturnValue({
			account: ACCOUNT,
			accountId: ACCOUNT.accountId,
			accounts: [ACCOUNT],
			setAccountId: vi.fn(),
		});
	});

	it("defaults the range to today and shows an empty state when nothing completed", async () => {
		mockedEventsApi.listMyCompletedEvents.mockResolvedValue([]);

		renderWithProviders(<CompletedPage />);

		await screen.findByText("Nothing completed in this range.");
		expect(mockedEventsApi.listMyCompletedEvents).toHaveBeenCalledWith(
			"test-token",
			"account-1",
			TODAY,
			addDaysIso(TODAY, 1),
		);
		expect(screen.queryByRole("button", { name: "Today" })).not.toBeInTheDocument();
	});

	it("lists completed events with ingoing and outgoing energy", async () => {
		mockedEventsApi.listMyCompletedEvents.mockResolvedValue([COMPLETED_EVENT]);

		renderWithProviders(<CompletedPage />);

		await screen.findByText("Meeting");
		expect(screen.getByText(/ingoing energy 3\/5/)).toBeInTheDocument();
		expect(screen.getByText(/4\/5/)).toBeInTheDocument();
	});

	it("re-queries when the date range is changed, and shows a Today reset button", async () => {
		mockedEventsApi.listMyCompletedEvents.mockResolvedValue([]);

		renderWithProviders(<CompletedPage />);

		await screen.findByText("Nothing completed in this range.");

		const pastDate = addDaysIso(TODAY, -7);
		fireEvent.change(screen.getByLabelText("From"), { target: { value: pastDate } });

		const todayButton = await screen.findByRole("button", { name: "Today" });

		await waitFor(() =>
			expect(mockedEventsApi.listMyCompletedEvents).toHaveBeenCalledWith(
				"test-token",
				"account-1",
				pastDate,
				addDaysIso(TODAY, 1),
			),
		);

		const user = userEvent.setup();
		await user.click(todayButton);

		expect(screen.getByLabelText("From")).toHaveValue(TODAY);
		expect(screen.queryByRole("button", { name: "Today" })).not.toBeInTheDocument();
	});

	it("shows an error instead of a silent empty list when completed events fail to load", async () => {
		mockedEventsApi.listMyCompletedEvents.mockRejectedValue(new Error("boom"));

		renderWithProviders(<CompletedPage />);

		await screen.findByText("Couldn't load your completed activities — try again.");
		expect(screen.queryByText("Nothing completed in this range.")).not.toBeInTheDocument();
	});

	it("opens the edit dialog for a clicked event and refreshes the list once saved", async () => {
		mockedEventsApi.listMyCompletedEvents.mockResolvedValue([COMPLETED_EVENT]);
		mockedEventsApi.listEventTypes.mockResolvedValue(TYPES);
		mockedEventsApi.editEvent.mockResolvedValue(COMPLETED_EVENT);
		const user = userEvent.setup();

		renderWithProviders(<CompletedPage />);

		await screen.findByText("Meeting");
		await user.click(screen.getByRole("button", { name: /Meeting/ }));

		expect(screen.getByText("Edit activity")).toBeInTheDocument();

		mockedEventsApi.listMyCompletedEvents.mockClear();
		await user.click(screen.getByRole("button", { name: "Save changes" }));

		await waitFor(() => expect(screen.queryByText("Edit activity")).not.toBeInTheDocument());
		await waitFor(() => expect(mockedEventsApi.listMyCompletedEvents).toHaveBeenCalled());
	});
});
