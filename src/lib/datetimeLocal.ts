/** "2026-03-10T14:30" — the value shape an <input type="datetime-local"> expects/produces, in the browser's own local time. */
export function toDatetimeLocalValue(date: Date): string {
	const pad = (n: number) => String(n).padStart(2, "0");
	return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** A datetime-local value has no timezone suffix, so the Date constructor parses it as local time — exactly what the input represents. */
export function fromDatetimeLocalValue(value: string): Date {
	return new Date(value);
}
