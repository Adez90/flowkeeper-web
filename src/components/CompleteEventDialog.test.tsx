import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CompleteEventDialog } from "./CompleteEventDialog";
import * as eventsApi from "../api/events";
import type { EventResponse } from "../api/types";

vi.mock("../api/events");

const mockedEventsApi = vi.mocked(eventsApi);

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

describe("CompleteEventDialog", () => {
	it("submits the outgoing energy and note for the given event", async () => {
		mockedEventsApi.completeEvent.mockResolvedValue({ ...OPEN_EVENT, status: "COMPLETED" });
		const onCompleted = vi.fn();
		const user = userEvent.setup();

		render(
			<CompleteEventDialog event={OPEN_EVENT} token="test-token" onClose={vi.fn()} onCompleted={onCompleted} />,
		);

		await user.type(screen.getByLabelText("Note (optional)"), "felt drained");
		await user.click(screen.getByRole("button", { name: "Complete" }));

		await waitFor(() => expect(onCompleted).toHaveBeenCalled());
		expect(mockedEventsApi.completeEvent).toHaveBeenCalledWith("test-token", "event-1", {
			outgoingEnergy: 3,
			outgoingNote: "felt drained",
		});
	});

	it("shows the ingoing energy as a hint for context", () => {
		render(<CompleteEventDialog event={OPEN_EVENT} token="test-token" onClose={vi.fn()} onCompleted={vi.fn()} />);

		expect(screen.getByText("Ingoing energy was 4/5.")).toBeInTheDocument();
	});

	it("shows an error and does not call onCompleted if the API call fails", async () => {
		mockedEventsApi.completeEvent.mockRejectedValue(new Error("boom"));
		const onCompleted = vi.fn();
		const user = userEvent.setup();

		render(
			<CompleteEventDialog event={OPEN_EVENT} token="test-token" onClose={vi.fn()} onCompleted={onCompleted} />,
		);

		await user.click(screen.getByRole("button", { name: "Complete" }));

		await screen.findByText("Couldn't complete that activity — try again.");
		expect(onCompleted).not.toHaveBeenCalled();
	});
});
