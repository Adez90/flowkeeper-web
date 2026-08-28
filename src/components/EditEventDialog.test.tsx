import { describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "../test/testUtils";
import { EditEventDialog } from "./EditEventDialog";
import * as eventsApi from "../api/events";
import type { EventResponse, EventTypeResponse } from "../api/types";

vi.mock("../api/events");

const mockedEventsApi = vi.mocked(eventsApi);

const TYPES: EventTypeResponse[] = [
	{ id: "type-1", code: "meeting", label: "Meeting", icon: "meeting", isDefault: true },
	{ id: "type-2", code: "physical", label: "Physical activity", icon: "physical", isDefault: true },
];

const COMPLETED_EVENT: EventResponse = {
	id: "event-1",
	accountId: "account-1",
	eventTypeId: "type-1",
	eventTypeLabel: "Meeting",
	status: "COMPLETED",
	ingoingEnergy: 3,
	ingoingNote: "felt rushed",
	outgoingEnergy: 4,
	outgoingNote: "went fine",
	shareAnonymously: false,
	startedAt: "2026-01-01T08:00:00Z",
	completedAt: "2026-01-01T09:00:00Z",
};

describe("EditEventDialog", () => {
	it("pre-fills every field from the event being edited", async () => {
		mockedEventsApi.listEventTypes.mockResolvedValue(TYPES);

		renderWithProviders(
			<EditEventDialog
				event={COMPLETED_EVENT}
				accountId="account-1"
				token="test-token"
				onClose={vi.fn()}
				onSaved={vi.fn()}
			/>,
		);

		await screen.findByText("Meeting");
		expect(screen.getByLabelText("Type")).toHaveValue("type-1");
		expect(screen.getByDisplayValue("felt rushed")).toBeInTheDocument();
		expect(screen.getByDisplayValue("went fine")).toBeInTheDocument();
	});

	it("submits every field, including a changed type, as a full update", async () => {
		mockedEventsApi.listEventTypes.mockResolvedValue(TYPES);
		mockedEventsApi.editEvent.mockResolvedValue({ ...COMPLETED_EVENT, eventTypeId: "type-2" });

		const onSaved = vi.fn();
		const user = userEvent.setup();

		renderWithProviders(
			<EditEventDialog
				event={COMPLETED_EVENT}
				accountId="account-1"
				token="test-token"
				onClose={vi.fn()}
				onSaved={onSaved}
			/>,
		);

		await screen.findByText("Meeting");
		await user.selectOptions(screen.getByLabelText("Type"), "type-2");

		const ingoingNoteInput = screen.getByDisplayValue("felt rushed");
		await user.clear(ingoingNoteInput);
		await user.type(ingoingNoteInput, "actually calm");

		await user.click(screen.getByRole("button", { name: "Save changes" }));

		await waitFor(() => expect(onSaved).toHaveBeenCalled());
		expect(mockedEventsApi.editEvent).toHaveBeenCalledWith(
			"test-token",
			"event-1",
			expect.objectContaining({
				eventTypeId: "type-2",
				ingoingNote: "actually calm",
				outgoingNote: "went fine",
			}),
		);
	});

	it("shows an error and does not call onSaved if the API call fails", async () => {
		mockedEventsApi.listEventTypes.mockResolvedValue(TYPES);
		mockedEventsApi.editEvent.mockRejectedValue(new Error("boom"));

		const onSaved = vi.fn();
		const user = userEvent.setup();

		renderWithProviders(
			<EditEventDialog
				event={COMPLETED_EVENT}
				accountId="account-1"
				token="test-token"
				onClose={vi.fn()}
				onSaved={onSaved}
			/>,
		);

		await screen.findByText("Meeting");
		await user.click(screen.getByRole("button", { name: "Save changes" }));

		await screen.findByText("Couldn't save that activity — try again.");
		expect(onSaved).not.toHaveBeenCalled();
	});

	it("calls onClose without submitting when Cancel is clicked", async () => {
		mockedEventsApi.listEventTypes.mockResolvedValue(TYPES);
		const onClose = vi.fn();
		const user = userEvent.setup();

		renderWithProviders(
			<EditEventDialog
				event={COMPLETED_EVENT}
				accountId="account-1"
				token="test-token"
				onClose={onClose}
				onSaved={vi.fn()}
			/>,
		);

		await screen.findByText("Meeting");
		await user.click(screen.getByRole("button", { name: "Cancel" }));

		expect(onClose).toHaveBeenCalled();
		expect(mockedEventsApi.editEvent).not.toHaveBeenCalled();
	});
});
