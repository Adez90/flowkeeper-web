import type { EventResponse } from "../api/types";

function energyLabel(ingoing: number, outgoing: number | null): string {
	return outgoing != null ? `${ingoing} → ${outgoing}` : `${ingoing} (ongoing)`;
}

function formatTime(iso: string): string {
	return new Date(iso).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

function formatDayHeading(dateKey: string): string {
	return new Date(`${dateKey}T00:00:00`).toLocaleDateString(undefined, {
		weekday: "long",
		year: "numeric",
		month: "long",
		day: "numeric",
	});
}

/** Groups events by their local calendar day (yyyy-MM-dd, in the browser's own timezone) — same day-bucketing shape as the trend chart's points, just for display rather than a chart. */
function groupByDay(events: EventResponse[]): Map<string, EventResponse[]> {
	const byDay = new Map<string, EventResponse[]>();
	for (const event of events) {
		const dateKey = new Date(event.startedAt).toLocaleDateString("sv-SE"); // sv-SE formats as yyyy-MM-dd
		const dayEvents = byDay.get(dateKey) ?? [];
		dayEvents.push(event);
		byDay.set(dateKey, dayEvents);
	}
	return byDay;
}

/**
 * Builds and downloads a PDF diary of the given events, one section per
 * day — mirrors the old FlowKeeper client's pdfmake-based personal diary
 * export. Purely client-side: no data leaves the browser beyond what's
 * already been fetched. pdfmake (and its ~1.8MB embedded-font payload) is
 * dynamically imported here rather than at module scope, so it's only
 * ever fetched once someone actually exports, not on every page load.
 */
export async function exportDiaryPdf(
	events: EventResponse[], displayName: string, rangeStart: string, rangeEndInclusive: string,
): Promise<void> {
	const [{ default: pdfMake }, { default: vfsFonts }] = await Promise.all([
		import("pdfmake/build/pdfmake"),
		import("pdfmake/build/vfs_fonts"),
	]);
	pdfMake.addVirtualFileSystem(vfsFonts);

	const byDay = groupByDay(events);
	const sortedDays = [...byDay.keys()].sort();

	const content: object[] = [
		{ text: "FlowKeeper — Personal Diary", style: "title" },
		{ text: `${displayName} · ${rangeStart} to ${rangeEndInclusive}`, style: "subtitle" },
	];

	if (sortedDays.length === 0) {
		content.push({ text: "Nothing logged in this range.", style: "empty", margin: [0, 16, 0, 0] });
	}

	for (const dateKey of sortedDays) {
		const dayEvents = [...byDay.get(dateKey)!].sort((a, b) => a.startedAt.localeCompare(b.startedAt));
		content.push({ text: formatDayHeading(dateKey), style: "dayHeading", margin: [0, 16, 0, 6] });

		for (const event of dayEvents) {
			content.push({
				columns: [
					{ text: formatTime(event.startedAt), width: 50, style: "eventTime" },
					{
						stack: [
							{ text: `${event.eventTypeLabel} — ${energyLabel(event.ingoingEnergy, event.outgoingEnergy)}`, style: "eventTitle" },
							...(event.ingoingNote ? [{ text: `In: ${event.ingoingNote}`, style: "eventNote" }] : []),
							...(event.outgoingNote ? [{ text: `Out: ${event.outgoingNote}`, style: "eventNote" }] : []),
						],
					},
				],
				margin: [0, 0, 0, 8],
			});
		}
	}

	pdfMake
		.createPdf({
			content,
			styles: {
				title: { fontSize: 18, bold: true },
				subtitle: { fontSize: 11, color: "#5b6b85", margin: [0, 4, 0, 0] },
				dayHeading: { fontSize: 13, bold: true, color: "#152a42" },
				eventTime: { fontSize: 10, color: "#5b6b85" },
				eventTitle: { fontSize: 11 },
				eventNote: { fontSize: 10, italics: true, color: "#5b6b85", margin: [0, 2, 0, 0] },
				empty: { fontSize: 11, color: "#5b6b85" },
			},
			defaultStyle: { fontSize: 11 },
			pageMargins: [40, 40, 40, 40],
		})
		.download(`flowkeeper-diary-${rangeStart}-to-${rangeEndInclusive}.pdf`);
}
