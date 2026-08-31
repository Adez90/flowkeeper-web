import { describe, expect, it, vi } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "../test/testUtils";
import { ImportEventsDialog } from "./ImportEventsDialog";
import * as eventsApi from "../api/events";
import * as integrationsApi from "../api/integrations";
import type { EventTypeResponse, ImportableGroupResponse } from "../api/types";

vi.mock("../api/events");
vi.mock("../api/integrations");

const mockedEventsApi = vi.mocked(eventsApi);
const mockedIntegrationsApi = vi.mocked(integrationsApi);

const TYPES: EventTypeResponse[] = [
	{ id: "type-meeting", code: "meeting", label: "Meeting", icon: "meeting", isDefault: true },
	{ id: "type-physical", code: "physical", label: "Physical activity", icon: "physical", isDefault: true },
];

const GROUPS: ImportableGroupResponse[] = [
	{
		provider: "STRAVA",
		needsReconnect: false,
		items: [{ externalId: "strava-1", title: "Morning run", startedAt: "2026-01-01T07:00:00Z", endedAt: "2026-01-01T07:30:00Z" }],
	},
	{
		provider: "GOOGLE_CALENDAR",
		needsReconnect: false,
		items: [{ externalId: "cal-1", title: "Team standup", startedAt: "2026-01-01T09:00:00Z", endedAt: "2026-01-01T09:15:00Z" }],
	},
];

function renderDialog() {
	return renderWithProviders(
		<ImportEventsDialog accountId="account-1" token="test-token" onClose={vi.fn()} onImported={vi.fn()} />,
	);
}

describe("ImportEventsDialog", () => {
	it("groups importable items by provider and defaults each one's type sensibly", async () => {
		mockedEventsApi.listEventTypes.mockResolvedValue(TYPES);
		mockedIntegrationsApi.listImportable.mockResolvedValue(GROUPS);

		renderDialog();

		expect(await screen.findByText("Morning run")).toBeInTheDocument();
		expect(screen.getByText("Team standup")).toBeInTheDocument();
		expect(screen.getByText("Strava")).toBeInTheDocument();
		expect(screen.getByText("Google Calendar")).toBeInTheDocument();

		// Strava's activity defaults to "Physical activity", the calendar entry to "Meeting".
		const runItem = screen.getByText("Morning run").closest("li") as HTMLElement;
		expect(within(runItem).getByRole("combobox")).toHaveValue("type-physical");
		const standupItem = screen.getByText("Team standup").closest("li") as HTMLElement;
		expect(within(standupItem).getByRole("combobox")).toHaveValue("type-meeting");
	});

	it("shows a reconnect message for a provider whose token refresh failed, without losing the other provider's items", async () => {
		mockedEventsApi.listEventTypes.mockResolvedValue(TYPES);
		mockedIntegrationsApi.listImportable.mockResolvedValue([
			{ provider: "MICROSOFT_CALENDAR", needsReconnect: true, items: [] },
			GROUPS[0],
		]);

		renderDialog();

		expect(await screen.findByText("This connection needs reconnecting — visit Calendar sync.")).toBeInTheDocument();
		expect(screen.getByText("Morning run")).toBeInTheDocument();
	});

	it("shows an empty state when there's nothing new to import", async () => {
		mockedEventsApi.listEventTypes.mockResolvedValue(TYPES);
		mockedIntegrationsApi.listImportable.mockResolvedValue([{ provider: "STRAVA", needsReconnect: false, items: [] }]);

		renderDialog();

		expect(await screen.findByText("Nothing new to import right now.")).toBeInTheDocument();
	});

	it("disables importing until at least one item is checked", async () => {
		mockedEventsApi.listEventTypes.mockResolvedValue(TYPES);
		mockedIntegrationsApi.listImportable.mockResolvedValue(GROUPS);

		renderDialog();
		await screen.findByText("Morning run");

		expect(screen.getByRole("button", { name: /Import \d+ selected/ })).toBeDisabled();
	});

	it("imports only the checked items, with their chosen type and the provider's own start/end time", async () => {
		mockedEventsApi.listEventTypes.mockResolvedValue(TYPES);
		mockedIntegrationsApi.listImportable.mockResolvedValue(GROUPS);
		mockedIntegrationsApi.importEvents.mockResolvedValue([]);
		const onImported = vi.fn();
		const user = userEvent.setup();

		renderWithProviders(<ImportEventsDialog accountId="account-1" token="test-token" onClose={vi.fn()} onImported={onImported} />);

		const runItem = (await screen.findByText("Morning run")).closest("li") as HTMLElement;
		await user.click(within(runItem).getByRole("checkbox"));
		await user.click(screen.getByRole("button", { name: "Import 1 selected" }));

		await waitFor(() =>
			expect(mockedIntegrationsApi.importEvents).toHaveBeenCalledWith("test-token", {
				accountId: "account-1",
				selections: [
					{
						provider: "STRAVA",
						externalId: "strava-1",
						eventTypeId: "type-physical",
						startedAt: "2026-01-01T07:00:00Z",
						endedAt: "2026-01-01T07:30:00Z",
					},
				],
			}),
		);
		await waitFor(() => expect(onImported).toHaveBeenCalled());
	});

	it("imports with a manually-picked type when the default is overridden", async () => {
		mockedEventsApi.listEventTypes.mockResolvedValue(TYPES);
		mockedIntegrationsApi.listImportable.mockResolvedValue(GROUPS);
		mockedIntegrationsApi.importEvents.mockResolvedValue([]);
		const user = userEvent.setup();

		renderDialog();

		const standupItem = (await screen.findByText("Team standup")).closest("li") as HTMLElement;
		await user.click(within(standupItem).getByRole("checkbox"));
		await user.selectOptions(within(standupItem).getByRole("combobox"), "type-physical");
		await user.click(screen.getByRole("button", { name: "Import 1 selected" }));

		await waitFor(() =>
			expect(mockedIntegrationsApi.importEvents).toHaveBeenCalledWith(
				"test-token",
				expect.objectContaining({
					selections: [expect.objectContaining({ externalId: "cal-1", eventTypeId: "type-physical" })],
				}),
			),
		);
	});

	it("shows an error and does not call onImported if the API call fails", async () => {
		mockedEventsApi.listEventTypes.mockResolvedValue(TYPES);
		mockedIntegrationsApi.listImportable.mockResolvedValue(GROUPS);
		mockedIntegrationsApi.importEvents.mockRejectedValue(new Error("boom"));
		const onImported = vi.fn();
		const user = userEvent.setup();

		renderWithProviders(<ImportEventsDialog accountId="account-1" token="test-token" onClose={vi.fn()} onImported={onImported} />);

		const runItem = (await screen.findByText("Morning run")).closest("li") as HTMLElement;
		await user.click(within(runItem).getByRole("checkbox"));
		await user.click(screen.getByRole("button", { name: "Import 1 selected" }));

		await screen.findByText("Couldn't import those activities — try again.");
		expect(onImported).not.toHaveBeenCalled();
	});

	it("shows an error when the importable list fails to load", async () => {
		mockedEventsApi.listEventTypes.mockResolvedValue(TYPES);
		mockedIntegrationsApi.listImportable.mockRejectedValue(new Error("network down"));

		renderDialog();

		await screen.findByText("Couldn't load importable activities — try again.");
	});

	it("closes without importing when Cancel is pressed", async () => {
		mockedEventsApi.listEventTypes.mockResolvedValue(TYPES);
		mockedIntegrationsApi.listImportable.mockResolvedValue(GROUPS);
		const onClose = vi.fn();
		const user = userEvent.setup();

		renderWithProviders(<ImportEventsDialog accountId="account-1" token="test-token" onClose={onClose} onImported={vi.fn()} />);
		await screen.findByText("Morning run");

		await user.click(screen.getByRole("button", { name: "Cancel" }));

		expect(onClose).toHaveBeenCalled();
		expect(mockedIntegrationsApi.importEvents).not.toHaveBeenCalled();
	});
});
