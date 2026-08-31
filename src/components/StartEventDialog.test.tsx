import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StartEventDialog } from "./StartEventDialog";
import * as eventsApi from "../api/events";
import type { EventResponse } from "../api/types";

vi.mock("../api/events");

const mockedEventsApi = vi.mocked(eventsApi);

const IMPORTED_EVENT: EventResponse = {
	id: "event-1",
	accountId: "account-1",
	eventTypeId: "type-2",
	eventTypeLabel: "Physical activity",
	status: "OPEN",
	ingoingEnergy: null,
	ingoingNote: null,
	outgoingEnergy: null,
	outgoingNote: null,
	shareAnonymously: false,
	startedAt: "2026-01-01T10:00:00Z",
	completedAt: null,
	externalProvider: "STRAVA",
	externalEndedAt: "2026-01-01T11:00:00Z",
};

describe("StartEventDialog", () => {
	it("submits the ingoing energy and note for the given event", async () => {
		mockedEventsApi.startEvent.mockResolvedValue({ ...IMPORTED_EVENT, ingoingEnergy: 3 });
		const onStarted = vi.fn();
		const user = userEvent.setup();

		render(<StartEventDialog event={IMPORTED_EVENT} token="test-token" onClose={vi.fn()} onStarted={onStarted} />);

		await user.type(screen.getByLabelText("Note (optional)"), "felt good at the start");
		await user.click(screen.getByRole("button", { name: "Start" }));

		await waitFor(() => expect(onStarted).toHaveBeenCalled());
		expect(mockedEventsApi.startEvent).toHaveBeenCalledWith("test-token", "event-1", {
			ingoingEnergy: 3,
			ingoingNote: "felt good at the start",
		});
	});

	it("shows the event type in the title", () => {
		render(<StartEventDialog event={IMPORTED_EVENT} token="test-token" onClose={vi.fn()} onStarted={vi.fn()} />);

		expect(screen.getByText('Start "Physical activity"')).toBeInTheDocument();
	});

	it("closes without starting when Cancel is pressed", async () => {
		const onClose = vi.fn();
		const user = userEvent.setup();

		render(<StartEventDialog event={IMPORTED_EVENT} token="test-token" onClose={onClose} onStarted={vi.fn()} />);

		await user.click(screen.getByRole("button", { name: "Cancel" }));

		expect(onClose).toHaveBeenCalled();
		expect(mockedEventsApi.startEvent).not.toHaveBeenCalled();
	});

	it("shows an error and does not call onStarted if the API call fails", async () => {
		mockedEventsApi.startEvent.mockRejectedValue(new Error("boom"));
		const onStarted = vi.fn();
		const user = userEvent.setup();

		render(<StartEventDialog event={IMPORTED_EVENT} token="test-token" onClose={vi.fn()} onStarted={onStarted} />);

		await user.click(screen.getByRole("button", { name: "Start" }));

		await screen.findByText("Couldn't start that activity — try again.");
		expect(onStarted).not.toHaveBeenCalled();
	});
});
