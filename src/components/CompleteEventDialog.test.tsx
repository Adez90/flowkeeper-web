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
	shareIngoingNoteAnonymously: false,
	shareOutgoingNoteAnonymously: false,
	startedAt: "2026-01-01T10:00:00Z",
	completedAt: null,
	externalProvider: null,
	externalEndedAt: null,
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

	it("shows the ingoing note so it's clear what's being finished", () => {
		const withNote = { ...OPEN_EVENT, ingoingNote: "quick sync with the design team" };
		render(<CompleteEventDialog event={withNote} token="test-token" onClose={vi.fn()} onCompleted={vi.fn()} />);

		expect(screen.getByText("“quick sync with the design team”")).toBeInTheDocument();
	});

	it("shows nothing extra when there was no ingoing note", () => {
		render(<CompleteEventDialog event={OPEN_EVENT} token="test-token" onClose={vi.fn()} onCompleted={vi.fn()} />);

		expect(screen.queryByText(/^“.*”$/)).not.toBeInTheDocument();
	});

	it("uses the provider's known end time for an imported event instead of leaving it to default to now", async () => {
		const imported = { ...OPEN_EVENT, externalProvider: "STRAVA" as const, externalEndedAt: "2026-01-01T11:00:00Z" };
		mockedEventsApi.completeEvent.mockResolvedValue({ ...imported, status: "COMPLETED" });
		const user = userEvent.setup();

		render(<CompleteEventDialog event={imported} token="test-token" onClose={vi.fn()} onCompleted={vi.fn()} />);

		await user.click(screen.getByRole("button", { name: "Complete" }));

		await waitFor(() =>
			expect(mockedEventsApi.completeEvent).toHaveBeenCalledWith("test-token", "event-1", {
				outgoingEnergy: 3,
				outgoingNote: null,
				completedAt: "2026-01-01T11:00:00Z",
			}),
		);
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

	describe("anonymous sharing, per note", () => {
		it("only offers to share the pre-activity note when there is one", () => {
			render(
				<CompleteEventDialog event={OPEN_EVENT} token="test-token" showAnonymousSharing onClose={vi.fn()} onCompleted={vi.fn()} />,
			);

			expect(screen.queryByText("Share the pre-activity note anonymously as organisation feedback")).not.toBeInTheDocument();
			expect(screen.getByText("Share the post-activity note anonymously as organisation feedback")).toBeInTheDocument();
		});

		it("shows both toggles, independently checkable, when there's a pre-activity note", async () => {
			const withNote = { ...OPEN_EVENT, ingoingNote: "quick sync" };
			const user = userEvent.setup();

			render(
				<CompleteEventDialog event={withNote} token="test-token" showAnonymousSharing onClose={vi.fn()} onCompleted={vi.fn()} />,
			);

			const shareIngoing = screen.getByText("Share the pre-activity note anonymously as organisation feedback")
				.closest("label")!.querySelector("input")!;
			const shareOutgoing = screen.getByText("Share the post-activity note anonymously as organisation feedback")
				.closest("label")!.querySelector("input")!;

			await user.click(shareIngoing);

			expect(shareIngoing).toBeChecked();
			expect(shareOutgoing).not.toBeChecked();
		});

		it("shares only the note that was checked", async () => {
			const withNote = { ...OPEN_EVENT, ingoingNote: "quick sync" };
			mockedEventsApi.completeEvent.mockResolvedValue({ ...withNote, status: "COMPLETED" });
			const user = userEvent.setup();

			render(
				<CompleteEventDialog event={withNote} token="test-token" showAnonymousSharing onClose={vi.fn()} onCompleted={vi.fn()} />,
			);

			await user.click(screen.getByText("Share the pre-activity note anonymously as organisation feedback"));
			await user.click(screen.getByRole("button", { name: "Complete" }));

			await waitFor(() =>
				expect(mockedEventsApi.updateEventSharing).toHaveBeenCalledWith("test-token", "event-1", {
					shareIngoingNoteAnonymously: true,
					shareOutgoingNoteAnonymously: false,
				}),
			);
		});

		it("never calls the sharing endpoint when neither toggle is checked", async () => {
			mockedEventsApi.completeEvent.mockResolvedValue({ ...OPEN_EVENT, status: "COMPLETED" });
			const user = userEvent.setup();

			render(
				<CompleteEventDialog event={OPEN_EVENT} token="test-token" showAnonymousSharing onClose={vi.fn()} onCompleted={vi.fn()} />,
			);

			await user.click(screen.getByRole("button", { name: "Complete" }));

			await waitFor(() => expect(mockedEventsApi.completeEvent).toHaveBeenCalled());
			expect(mockedEventsApi.updateEventSharing).not.toHaveBeenCalled();
		});
	});
});
