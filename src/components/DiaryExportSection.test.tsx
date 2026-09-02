import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import * as Sentry from "@sentry/react";
import { renderWithProviders } from "../test/testUtils";
import { DiaryExportSection } from "./DiaryExportSection";
import * as eventsApi from "../api/events";
import * as exportDiaryPdfModule from "../lib/exportDiaryPdf";
import { addDaysIso, toIsoDate } from "../lib/dates";
import type { EventResponse } from "../api/types";

vi.mock("../api/events");
vi.mock("../lib/exportDiaryPdf");
vi.mock("@sentry/react", () => ({ captureException: vi.fn() }));

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
		externalProvider: null,
		externalEndedAt: null,
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

	it("buckets events by the viewer's local calendar day, not the UTC date in the ISO string", async () => {
		// 09:00 UTC on the 10th is still the evening of the 9th in
		// Honolulu — the range filter must agree with exportDiaryPdf's own
		// local-day grouping, or an event can silently vanish from the
		// export despite falling within the selected local date range.
		vi.stubEnv("TZ", "Pacific/Honolulu");
		try {
			const lateEvent = eventOn(TODAY); // 09:00Z on TODAY -> local date is "the day before" in Honolulu
			const localDayBefore = addDaysIso(TODAY, -1);
			mockedEventsApi.listEvents.mockResolvedValue([lateEvent]);
			mockedExportDiaryPdf.mockResolvedValue();
			const user = userEvent.setup();

			renderWithProviders(<DiaryExportSection accountId="acc-1" token="test-token" displayName="Anders Johansson" />);

			fireEvent.change(screen.getByLabelText("Export from"), { target: { value: localDayBefore } });
			fireEvent.change(screen.getByLabelText("Export to"), { target: { value: localDayBefore } });
			await user.click(screen.getByRole("button", { name: "Download PDF" }));

			await waitFor(() =>
				expect(mockedExportDiaryPdf).toHaveBeenCalledWith([lateEvent], "Anders Johansson", localDayBefore, localDayBefore),
			);
		} finally {
			vi.unstubAllEnvs();
		}
	});

	it("shows an error if the export fails", async () => {
		mockedEventsApi.listEvents.mockRejectedValue(new Error("network error"));
		const user = userEvent.setup();

		renderWithProviders(<DiaryExportSection accountId="acc-1" token="test-token" displayName="Anders Johansson" />);

		await user.click(screen.getByRole("button", { name: "Download PDF" }));

		await screen.findByText(/couldn.t generate that pdf/i);
	});

	it("reports a genuine pdf-build failure to Sentry", async () => {
		mockedEventsApi.listEvents.mockResolvedValue([eventOn(TODAY)]);
		mockedExportDiaryPdf.mockRejectedValue(new Error("pdfmake blew up"));
		const user = userEvent.setup();

		renderWithProviders(<DiaryExportSection accountId="acc-1" token="test-token" displayName="Anders Johansson" />);

		await user.click(screen.getByRole("button", { name: "Download PDF" }));

		await screen.findByText(/couldn.t generate that pdf/i);
		expect(Sentry.captureException).toHaveBeenCalledWith(expect.any(Error), { tags: { feature: "diary-export" } });
	});

	describe("when this tab is running a stale build", () => {
		const originalLocation = window.location;
		let reload: ReturnType<typeof vi.fn>;

		beforeEach(() => {
			reload = vi.fn();
			Object.defineProperty(window, "location", { configurable: true, value: { ...originalLocation, reload } });
		});

		afterEach(() => {
			Object.defineProperty(window, "location", { configurable: true, value: originalLocation });
		});

		it("reloads instead of showing an error or reporting to Sentry", async () => {
			mockedEventsApi.listEvents.mockResolvedValue([eventOn(TODAY)]);
			mockedExportDiaryPdf.mockRejectedValue(
				new Error("Failed to fetch dynamically imported module: https://example.com/assets/pdfmake-abc123.js"),
			);
			const user = userEvent.setup();

			renderWithProviders(<DiaryExportSection accountId="acc-1" token="test-token" displayName="Anders Johansson" />);

			await user.click(screen.getByRole("button", { name: "Download PDF" }));

			await waitFor(() => expect(reload).toHaveBeenCalled());
			expect(Sentry.captureException).not.toHaveBeenCalled();
			expect(screen.queryByText(/couldn.t generate that pdf/i)).not.toBeInTheDocument();
		});
	});
});
