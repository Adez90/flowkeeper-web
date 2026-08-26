import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useAuth } from "react-oidc-context";
import type { AuthContextProps } from "react-oidc-context";
import * as reactRouterDom from "react-router-dom";
import { renderWithProviders } from "../test/testUtils";
import { LandingPage } from "./LandingPage";
import * as eventsApi from "../api/events";
import type { EventResponse, MeResponse } from "../api/types";

vi.mock("react-oidc-context", () => ({ useAuth: vi.fn() }));
vi.mock("../api/events");
vi.mock("react-router-dom", async (importOriginal) => {
	const actual = await importOriginal<typeof reactRouterDom>();
	return { ...actual, useOutletContext: vi.fn() };
});

const mockedUseAuth = vi.mocked(useAuth);
const mockedUseOutletContext = vi.mocked(reactRouterDom.useOutletContext);
const mockedEventsApi = vi.mocked(eventsApi);

const ME: MeResponse = {
	userId: "u1",
	displayName: "Anders Johansson",
	email: "anders@example.com",
	timezone: "UTC",
	locale: null,
	avatarUrl: null,
	accounts: [{ accountId: "account-1", name: "Anders Johansson", type: "PERSONAL", role: "OWNER" }],
};

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
	startedAt: "2026-01-01T10:00:00Z",
	completedAt: null,
};

describe("LandingPage", () => {
	beforeEach(() => {
		mockedUseAuth.mockReturnValue({ user: { access_token: "test-token" } } as AuthContextProps);
		mockedUseOutletContext.mockReturnValue(ME);
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
});
