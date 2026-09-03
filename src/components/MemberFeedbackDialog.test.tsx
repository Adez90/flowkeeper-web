import { describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "../test/testUtils";
import { MemberFeedbackDialog } from "./MemberFeedbackDialog";
import * as coachFeedbackApi from "../api/coachFeedback";
import type { CoachFeedbackResponse, EventResponse } from "../api/types";

vi.mock("../api/coachFeedback");

const mockedCoachFeedbackApi = vi.mocked(coachFeedbackApi);

const FREEFORM_NOTE: CoachFeedbackResponse = {
	id: "fb-1",
	coachId: "coach-1",
	coachDisplayName: "Coach Carter",
	eventId: null,
	eventTypeLabel: null,
	note: "Keep up the daily check-ins",
	createdAt: "2026-03-10T09:00:00Z",
};

const MEMBER_EVENT: EventResponse = {
	id: "event-1",
	accountId: "org-1",
	eventTypeId: "type-1",
	eventTypeLabel: "Meeting",
	status: "COMPLETED",
	ingoingEnergy: 3,
	ingoingNote: null,
	outgoingEnergy: 3,
	outgoingNote: null,
	shareIngoingNoteAnonymously: false,
	shareOutgoingNoteAnonymously: false,
	startedAt: "2026-03-09T10:00:00Z",
	completedAt: "2026-03-09T11:00:00Z",
	externalProvider: null,
	externalEndedAt: null,
};

function renderDialog(canWrite: boolean) {
	return renderWithProviders(
		<MemberFeedbackDialog
			accountId="org-1"
			token="test-token"
			memberId="member-1"
			memberDisplayName="Alex Member"
			canWrite={canWrite}
			onClose={vi.fn()}
		/>,
	);
}

describe("MemberFeedbackDialog", () => {
	it("lists existing feedback, including which event it's attached to", async () => {
		mockedCoachFeedbackApi.fetchMemberFeedback.mockResolvedValue([FREEFORM_NOTE]);
		mockedCoachFeedbackApi.fetchMemberEvents.mockResolvedValue([]);

		renderDialog(false);

		await screen.findByText("Keep up the daily check-ins");
		expect(screen.getByText("Coach Carter")).toBeInTheDocument();
	});

	it("shows no write form for a member viewing only their own feedback", async () => {
		mockedCoachFeedbackApi.fetchMemberFeedback.mockResolvedValue([]);

		renderDialog(false);

		await screen.findByText("No feedback yet.");
		expect(screen.queryByLabelText("New feedback")).not.toBeInTheDocument();
	});

	it("shows an error instead of a false 'no feedback yet' when loading feedback fails", async () => {
		mockedCoachFeedbackApi.fetchMemberFeedback.mockRejectedValue(new Error("boom"));

		renderDialog(false);

		await screen.findByText("Couldn't load feedback — try again.");
		expect(screen.queryByText("No feedback yet.")).not.toBeInTheDocument();
	});

	it("lets a supervisor add freeform feedback", async () => {
		mockedCoachFeedbackApi.fetchMemberFeedback.mockResolvedValue([]);
		mockedCoachFeedbackApi.fetchMemberEvents.mockResolvedValue([]);
		mockedCoachFeedbackApi.createMemberFeedback.mockResolvedValue({ ...FREEFORM_NOTE, id: "fb-2" });
		const user = userEvent.setup();

		renderDialog(true);

		await screen.findByLabelText("New feedback");
		await user.type(screen.getByLabelText("New feedback"), "Great progress this week");
		await user.click(screen.getByRole("button", { name: "Add feedback" }));

		await waitFor(() =>
			expect(mockedCoachFeedbackApi.createMemberFeedback).toHaveBeenCalledWith("test-token", "org-1", "member-1", {
				note: "Great progress this week",
				eventId: null,
			}),
		);
	});

	it("lets a supervisor attach feedback to one of the member's events", async () => {
		mockedCoachFeedbackApi.fetchMemberFeedback.mockResolvedValue([]);
		mockedCoachFeedbackApi.fetchMemberEvents.mockResolvedValue([MEMBER_EVENT]);
		mockedCoachFeedbackApi.createMemberFeedback.mockResolvedValue({ ...FREEFORM_NOTE, id: "fb-3", eventId: "event-1" });
		const user = userEvent.setup();

		renderDialog(true);

		await screen.findByLabelText("New feedback");
		await user.type(screen.getByLabelText("New feedback"), "Nice recovery on this one");
		await user.selectOptions(screen.getByLabelText("Attach to an event (optional)"), "event-1");
		await user.click(screen.getByRole("button", { name: "Add feedback" }));

		await waitFor(() =>
			expect(mockedCoachFeedbackApi.createMemberFeedback).toHaveBeenCalledWith("test-token", "org-1", "member-1", {
				note: "Nice recovery on this one",
				eventId: "event-1",
			}),
		);
	});
});
