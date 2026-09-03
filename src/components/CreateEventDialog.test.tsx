import { describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "../test/testUtils";
import { CreateEventDialog } from "./CreateEventDialog";
import * as eventsApi from "../api/events";
import type { EventTypeResponse } from "../api/types";

vi.mock("../api/events");

const mockedEventsApi = vi.mocked(eventsApi);

const TYPES: EventTypeResponse[] = [
	{ id: "type-1", code: "meeting", label: "Meeting", icon: "meeting", isDefault: true },
	{ id: "type-2", code: "physical", label: "Physical activity", icon: "physical", isDefault: true },
];

describe("CreateEventDialog", () => {
	it("submits the selected type, energy, and note", async () => {
		mockedEventsApi.listEventTypes.mockResolvedValue(TYPES);
		mockedEventsApi.createEvent.mockResolvedValue({
			id: "event-1",
			accountId: "account-1",
			eventTypeId: "type-2",
			eventTypeLabel: "Physical activity",
			status: "OPEN",
			ingoingEnergy: 4,
			ingoingNote: "quick run",
			outgoingEnergy: null,
			outgoingNote: null,
			shareIngoingNoteAnonymously: false,
			shareOutgoingNoteAnonymously: false,
			startedAt: "2026-01-01T10:00:00Z",
			completedAt: null,
			externalProvider: null,
			externalEndedAt: null,
		});

		const onCreated = vi.fn();
		const user = userEvent.setup();

		renderWithProviders(
			<CreateEventDialog accountId="account-1" token="test-token" onClose={vi.fn()} onCreated={onCreated} />,
		);

		await screen.findByText("Meeting");
		await user.selectOptions(screen.getByLabelText("Type"), "type-2");
		await user.type(screen.getByLabelText("Note (optional)"), "quick run");
		await user.click(screen.getByRole("button", { name: "Log activity" }));

		await waitFor(() => expect(onCreated).toHaveBeenCalled());
		expect(mockedEventsApi.createEvent).toHaveBeenCalledWith("test-token", {
			accountId: "account-1",
			eventTypeId: "type-2",
			ingoingEnergy: 3,
			ingoingNote: "quick run",
		});
	});

	it("shows an error and does not close if the API call fails", async () => {
		mockedEventsApi.listEventTypes.mockResolvedValue(TYPES);
		mockedEventsApi.createEvent.mockRejectedValue(new Error("boom"));

		const onCreated = vi.fn();
		const user = userEvent.setup();

		renderWithProviders(
			<CreateEventDialog accountId="account-1" token="test-token" onClose={vi.fn()} onCreated={onCreated} />,
		);

		await screen.findByText("Meeting");
		await user.click(screen.getByRole("button", { name: "Log activity" }));

		await screen.findByText("Couldn't log that activity — try again.");
		expect(onCreated).not.toHaveBeenCalled();
	});

	it("shows an error, not a silently-stuck disabled button, when event types fail to load", async () => {
		mockedEventsApi.listEventTypes.mockRejectedValue(new Error("boom"));

		renderWithProviders(
			<CreateEventDialog accountId="account-1" token="test-token" onClose={vi.fn()} onCreated={vi.fn()} />,
		);

		await screen.findByText("Couldn't load activity types — try again.");
		expect(screen.getByRole("button", { name: "Log activity" })).toBeDisabled();
		expect(mockedEventsApi.createEvent).not.toHaveBeenCalled();
	});

	it("calls onClose without submitting when Cancel is clicked", async () => {
		mockedEventsApi.listEventTypes.mockResolvedValue(TYPES);
		const onClose = vi.fn();
		const user = userEvent.setup();

		renderWithProviders(
			<CreateEventDialog accountId="account-1" token="test-token" onClose={onClose} onCreated={vi.fn()} />,
		);

		await screen.findByText("Meeting");
		await user.click(screen.getByRole("button", { name: "Cancel" }));

		expect(onClose).toHaveBeenCalled();
		expect(mockedEventsApi.createEvent).not.toHaveBeenCalled();
	});

	it("logs a backdated but still-open activity when only 'this already happened' is checked", async () => {
		mockedEventsApi.listEventTypes.mockResolvedValue(TYPES);
		mockedEventsApi.createEvent.mockResolvedValue({
			id: "event-2",
			accountId: "account-1",
			eventTypeId: "type-1",
			eventTypeLabel: "Meeting",
			status: "OPEN",
			ingoingEnergy: 3,
			ingoingNote: null,
			outgoingEnergy: null,
			outgoingNote: null,
			shareIngoingNoteAnonymously: false,
			shareOutgoingNoteAnonymously: false,
			startedAt: "2026-01-01T09:00:00Z",
			completedAt: null,
			externalProvider: null,
			externalEndedAt: null,
		});

		const onCreated = vi.fn();
		const user = userEvent.setup();

		renderWithProviders(
			<CreateEventDialog accountId="account-1" token="test-token" onClose={vi.fn()} onCreated={onCreated} />,
		);

		await screen.findByText("Meeting");
		await user.click(screen.getByLabelText("This already happened"));

		const startedAtInput = screen.getByLabelText("Started at");
		await user.clear(startedAtInput);
		await user.type(startedAtInput, "2026-01-01T09:00");

		expect(screen.queryByLabelText("Already finished — log the outcome too")).not.toBeChecked();
		expect(screen.queryByText("Completed at")).not.toBeInTheDocument();

		await user.click(screen.getByRole("button", { name: "Log activity" }));

		await waitFor(() => expect(onCreated).toHaveBeenCalled());
		expect(mockedEventsApi.createEvent).toHaveBeenCalledWith("test-token", {
			accountId: "account-1",
			eventTypeId: "type-1",
			ingoingEnergy: 3,
			ingoingNote: null,
			startedAt: new Date("2026-01-01T09:00").toISOString(),
		});
	});

	it("logs a fully historical, already-completed activity in one step", async () => {
		mockedEventsApi.listEventTypes.mockResolvedValue(TYPES);
		mockedEventsApi.createEvent.mockResolvedValue({
			id: "event-3",
			accountId: "account-1",
			eventTypeId: "type-1",
			eventTypeLabel: "Meeting",
			status: "COMPLETED",
			ingoingEnergy: 3,
			ingoingNote: "felt rushed",
			outgoingEnergy: 4,
			outgoingNote: "better after",
			shareIngoingNoteAnonymously: false,
			shareOutgoingNoteAnonymously: false,
			startedAt: "2026-01-01T08:00:00Z",
			completedAt: "2026-01-01T09:00:00Z",
			externalProvider: null,
			externalEndedAt: null,
		});

		const onCreated = vi.fn();
		const user = userEvent.setup();

		renderWithProviders(
			<CreateEventDialog accountId="account-1" token="test-token" onClose={vi.fn()} onCreated={onCreated} />,
		);

		await screen.findByText("Meeting");
		await user.type(screen.getByLabelText("Note (optional)"), "felt rushed");
		await user.click(screen.getByLabelText("This already happened"));

		const startedAtInput = screen.getByLabelText("Started at");
		await user.clear(startedAtInput);
		await user.type(startedAtInput, "2026-01-01T08:00");

		await user.click(screen.getByLabelText("Already finished — log the outcome too"));

		const completedAtInput = screen.getByLabelText("Completed at");
		await user.clear(completedAtInput);
		await user.type(completedAtInput, "2026-01-01T09:00");
		await user.type(screen.getByLabelText("Outcome note (optional)"), "better after");

		await user.click(screen.getByRole("button", { name: "Log activity" }));

		await waitFor(() => expect(onCreated).toHaveBeenCalled());
		expect(mockedEventsApi.createEvent).toHaveBeenCalledWith("test-token", {
			accountId: "account-1",
			eventTypeId: "type-1",
			ingoingEnergy: 3,
			ingoingNote: "felt rushed",
			startedAt: new Date("2026-01-01T08:00").toISOString(),
			outgoingEnergy: 3,
			outgoingNote: "better after",
			completedAt: new Date("2026-01-01T09:00").toISOString(),
		});
	});
});
