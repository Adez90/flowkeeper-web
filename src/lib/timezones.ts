// A curated fallback for environments without Intl.supportedValuesOf (older
// browsers) — the common IANA zone for each populated region, so the
// dropdown never comes up empty.
const FALLBACK_TIMEZONES = [
	"UTC",
	"Europe/London",
	"Europe/Stockholm",
	"Europe/Paris",
	"Europe/Berlin",
	"Europe/Madrid",
	"Europe/Rome",
	"Europe/Helsinki",
	"Europe/Moscow",
	"America/New_York",
	"America/Chicago",
	"America/Denver",
	"America/Los_Angeles",
	"America/Sao_Paulo",
	"America/Mexico_City",
	"Africa/Cairo",
	"Africa/Johannesburg",
	"Asia/Dubai",
	"Asia/Kolkata",
	"Asia/Shanghai",
	"Asia/Tokyo",
	"Asia/Singapore",
	"Australia/Sydney",
	"Pacific/Auckland",
] as const;

/** Every real IANA timezone name, or the curated fallback above if the runtime doesn't support Intl.supportedValuesOf. */
export function listTimezones(): string[] {
	try {
		return Intl.supportedValuesOf("timeZone");
	} catch {
		return [...FALLBACK_TIMEZONES];
	}
}

/** "Europe/Stockholm" -> "Europe/Stockholm (UTC+02:00)" using that zone's real current offset (accounts for daylight saving). */
export function timezoneLabel(zone: string): string {
	try {
		const offset = new Intl.DateTimeFormat("en", { timeZone: zone, timeZoneName: "shortOffset" })
			.formatToParts(new Date())
			.find((part) => part.type === "timeZoneName")?.value;
		return offset ? `${zone} (${offset})` : zone;
	} catch {
		return zone;
	}
}
