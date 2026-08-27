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
			shareAnonymously: false,
			startedAt: "2026-01-01T10:00:00Z",
			completedAt: null,
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
});
