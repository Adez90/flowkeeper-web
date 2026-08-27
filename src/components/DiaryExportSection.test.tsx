import { describe, expect, it, vi } from "vitest";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "../test/testUtils";
import { DiaryExportSection } from "./DiaryExportSection";
import * as eventsApi from "../api/events";
import * as exportDiaryPdfModule from "../lib/exportDiaryPdf";
import { addDaysIso, toIsoDate } from "../lib/dates";
import type { EventResponse } from "../api/types";

vi.mock("../api/events");
vi.mock("../lib/exportDiaryPdf");

const mockedEventsApi = vi.mocked(eventsApi);
const mockedExportDiaryPdf = vi.mocked(exportDiaryPdfModule.exportDiaryPdf);

const TODAY = toIsoDate(new Date());

function eventOn(date: string): EventResponse {
	return {
		id: `event-${date}`,
		accountId: "acc-1",
		eventTypeId: "type-1",
		eventTypeLabel: "Meeting",
		status: "COMPLETED",
		ingoingEnergy: 3,
		ingoingNote: null,
		outgoingEnergy: 3,
		outgoingNote: null,
		shareAnonymously: false,
		startedAt: `${date}T09:00:00Z`,
		completedAt: `${date}T10:00:00Z`,
	};
}

describe("DiaryExportSection", () => {
	it("defaults the range to today and exports only events within it", async () => {
		const todaysEvent = eventOn(TODAY);
		const yesterdaysEvent = eventOn(addDaysIso(TODAY, -1));
		mockedEventsApi.listEvents.mockResolvedValue([yesterdaysEvent, todaysEvent]);
		mockedExportDiaryPdf.mockResolvedValue();
		const user = userEvent.setup();

		renderWithProviders(<DiaryExportSection accountId="acc-1" token="test-token" displayName="Anders Johansson" />);

		await user.click(screen.getByRole("button", { name: "Download PDF" }));

		await waitFor(() =>
			expect(mockedExportDiaryPdf).toHaveBeenCalledWith([todaysEvent], "Anders Johansson", TODAY, TODAY),
		);
	});

	it("widening the range includes more days' events", async () => {
		const todaysEvent = eventOn(TODAY);
		const yesterdaysEvent = eventOn(addDaysIso(TODAY, -1));
		mockedEventsApi.listEvents.mockResolvedValue([yesterdaysEvent, todaysEvent]);
		mockedExportDiaryPdf.mockResolvedValue();
		const user = userEvent.setup();

		renderWithProviders(<DiaryExportSection accountId="acc-1" token="test-token" displayName="Anders Johansson" />);

		fireEvent.change(screen.getByLabelText("Export from"), { target: { value: addDaysIso(TODAY, -1) } });
		await user.click(screen.getByRole("button", { name: "Download PDF" }));

		await waitFor(() =>
			expect(mockedExportDiaryPdf).toHaveBeenCalledWith(
				[yesterdaysEvent, todaysEvent],
				"Anders Johansson",
				addDaysIso(TODAY, -1),
				TODAY,
			),
		);
	});

	it("shows an error if the export fails", async () => {
		mockedEventsApi.listEvents.mockRejectedValue(new Error("network error"));
		const user = userEvent.setup();

		renderWithProviders(<DiaryExportSection accountId="acc-1" token="test-token" displayName="Anders Johansson" />);

		await user.click(screen.getByRole("button", { name: "Download PDF" }));

		await screen.findByText(/couldn.t generate that pdf/i);
	});
});
