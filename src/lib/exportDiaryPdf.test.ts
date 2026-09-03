import { describe, expect, it, vi } from "vitest";
import { exportDiaryPdf } from "./exportDiaryPdf";
import type { EventResponse } from "../api/types";

const mockedDownload = vi.fn();
const mockedCreatePdf = vi.fn((_docDefinition: { content: unknown[] }) => ({ download: mockedDownload }));
const mockedAddVirtualFileSystem = vi.fn();

vi.mock("pdfmake/build/pdfmake", () => ({
	default: { createPdf: mockedCreatePdf, addVirtualFileSystem: mockedAddVirtualFileSystem },
}));
vi.mock("pdfmake/build/vfs_fonts", () => ({ default: {} }));

const COMPLETED_EVENT: EventResponse = {
	id: "event-1",
	accountId: "acc-1",
	eventTypeId: "type-1",
	eventTypeLabel: "Meeting",
	status: "COMPLETED",
	ingoingEnergy: 3,
	ingoingNote: "Felt rushed",
	outgoingEnergy: 4,
	outgoingNote: "Better by the end",
	shareIngoingNoteAnonymously: false,
	shareOutgoingNoteAnonymously: false,
	startedAt: "2026-03-10T09:00:00Z",
	completedAt: "2026-03-10T10:00:00Z",
	externalProvider: null,
	externalEndedAt: null,
};

describe("exportDiaryPdf", () => {
	it("registers the font virtual filesystem and downloads a PDF with the range in its filename", async () => {
		await exportDiaryPdf([COMPLETED_EVENT], "Anders Johansson", "2026-03-10", "2026-03-10");

		expect(mockedAddVirtualFileSystem).toHaveBeenCalled();
		expect(mockedCreatePdf).toHaveBeenCalled();
		expect(mockedDownload).toHaveBeenCalledWith("flowkeeper-diary-2026-03-10-to-2026-03-10.pdf");
	});

	it("includes the event's notes in the document content", async () => {
		await exportDiaryPdf([COMPLETED_EVENT], "Anders Johansson", "2026-03-10", "2026-03-10");

		const docDefinition = mockedCreatePdf.mock.calls.at(-1)![0];
		const serialized = JSON.stringify(docDefinition.content);
		expect(serialized).toContain("Felt rushed");
		expect(serialized).toContain("Better by the end");
		expect(serialized).toContain("Meeting");
	});

	it("shows an empty-range message when there are no events", async () => {
		await exportDiaryPdf([], "Anders Johansson", "2026-03-10", "2026-03-10");

		const docDefinition = mockedCreatePdf.mock.calls.at(-1)![0];
		expect(JSON.stringify(docDefinition.content)).toContain("Nothing logged in this range");
	});
});
