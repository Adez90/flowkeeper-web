/** Formats a Date as a local yyyy-MM-dd string — the ISO date shape the API's LocalDate params expect. */
export function toIsoDate(date: Date): string {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, "0");
	const day = String(date.getDate()).padStart(2, "0");
	return `${year}-${month}-${day}`;
}

/** Adds (or subtracts, for a negative count) whole days to an ISO yyyy-MM-dd date string. */
export function addDaysIso(isoDate: string, days: number): string {
	const [year, month, day] = isoDate.split("-").map(Number);
	const date = new Date(year, month - 1, day);
	date.setDate(date.getDate() + days);
	return toIsoDate(date);
}
