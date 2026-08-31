import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import { listEvents } from "../api/events";
import { exportDiaryPdf } from "../lib/exportDiaryPdf";
import { toIsoDate } from "../lib/dates";

const TODAY = toIsoDate(new Date());

interface DiaryExportSectionProps {
	accountId: string;
	token: string;
	displayName: string;
}

/** On-demand, client-side PDF export of the caller's own event diary — mirrors the old FlowKeeper client's pdfmake export. Personal accounts only: the events endpoint this reads from is account-wide, which only means "my own events" when the account has exactly one member. */
export function DiaryExportSection({ accountId, token, displayName }: DiaryExportSectionProps) {
	const queryClient = useQueryClient();
	const { t } = useTranslation();
	const [from, setFrom] = useState(TODAY);
	const [to, setTo] = useState(TODAY);
	const [exporting, setExporting] = useState(false);
	const [error, setError] = useState<string | null>(null);

	async function handleExport() {
		setExporting(true);
		setError(null);
		try {
			const events = await queryClient.fetchQuery({
				queryKey: ["diary-events", accountId],
				queryFn: () => listEvents(token, accountId),
			});
			const inRange = events.filter((event) => {
				// Local calendar day, not the UTC date the ISO string's own
				// digits show — matches the local-day bucketing
				// exportDiaryPdf itself uses, so an event near local
				// midnight lands on the same day here as it does in the PDF.
				const eventDate = new Date(event.startedAt).toLocaleDateString("sv-SE");
				return eventDate >= from && eventDate <= to;
			});
			await exportDiaryPdf(inRange, displayName, from, to);
		} catch {
			setError(t("statistics.couldntExport"));
		} finally {
			setExporting(false);
		}
	}

	return (
		<section className="trend-section">
			<h2>{t("statistics.exportDiary")}</h2>
			<div className="date-range-picker">
				<label>
					{t("statistics.exportFrom")}
					<input type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} />
				</label>
				<label>
					{t("statistics.exportTo")}
					<input type="date" value={to} min={from} max={TODAY} onChange={(e) => setTo(e.target.value)} />
				</label>
			</div>
			{error && <p className="error-text">{error}</p>}
			<button type="button" className="button button--primary" onClick={() => void handleExport()} disabled={exporting}>
				{exporting ? t("statistics.generatingPdf") : t("statistics.downloadPdf")}
			</button>
		</section>
	);
}
