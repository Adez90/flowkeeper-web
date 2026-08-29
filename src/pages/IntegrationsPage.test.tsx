import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useAuth } from "react-oidc-context";
import type { AuthContextProps } from "react-oidc-context";
import { renderWithProviders } from "../test/testUtils";
import { IntegrationsPage } from "./IntegrationsPage";
import * as integrationsApi from "../api/integrations";
import { useActiveAccount } from "../context/ActiveAccountContext";
import type { AccountSummary, ConnectionResponse, ProviderResponse } from "../api/types";

vi.mock("react-oidc-context", () => ({ useAuth: vi.fn() }));
vi.mock("../api/integrations");
vi.mock("../context/ActiveAccountContext", () => ({ useActiveAccount: vi.fn() }));

const mockedUseAuth = vi.mocked(useAuth);
const mockedUseActiveAccount = vi.mocked(useActiveAccount);
const mockedIntegrationsApi = vi.mocked(integrationsApi);

const ACCOUNT: AccountSummary = { accountId: "account-1", name: "Alex Karlsson", type: "PERSONAL", role: "OWNER" };

const ALL_AVAILABLE: ProviderResponse[] = [
	{ provider: "GOOGLE_CALENDAR", available: true },
	{ provider: "MICROSOFT_CALENDAR", available: true },
	{ provider: "APPLE_CALENDAR", available: false },
	{ provider: "STRAVA", available: true },
];
const NONE_AVAILABLE: ProviderResponse[] = ALL_AVAILABLE.map((p) => ({ ...p, available: false }));

const GOOGLE_CONNECTION: ConnectionResponse = {
	id: "conn-1",
	provider: "GOOGLE_CALENDAR",
	status: "CONNECTED",
	externalAccountLabel: "alex@example.com",
	lastSyncedAt: null,
	createdAt: "2026-08-01T00:00:00Z",
};

describe("IntegrationsPage", () => {
	beforeEach(() => {
		mockedUseAuth.mockReturnValue({ user: { access_token: "test-token" } } as AuthContextProps);
		mockedUseActiveAccount.mockReturnValue({
			account: ACCOUNT,
			accountId: ACCOUNT.accountId,
			accounts: [ACCOUNT],
			setAccountId: vi.fn(),
		});
	});

	it("shows Connect for a configured provider with no connection yet", async () => {
		mockedIntegrationsApi.listProviders.mockResolvedValue(ALL_AVAILABLE);
		mockedIntegrationsApi.listConnections.mockResolvedValue([]);

		renderWithProviders(<IntegrationsPage />);

		await screen.findByText("Google Calendar");
		expect(screen.getAllByRole("button", { name: "Connect" })).toHaveLength(3); // Google + Microsoft + Strava
	});

	it("shows 'Not available yet' and no button for an unconfigured provider", async () => {
		mockedIntegrationsApi.listProviders.mockResolvedValue(NONE_AVAILABLE);
		mockedIntegrationsApi.listConnections.mockResolvedValue([]);

		renderWithProviders(<IntegrationsPage />);

		await screen.findByText("Google Calendar");
		expect(screen.getAllByText("Not available yet")).toHaveLength(3); // Google + Microsoft + Strava
		expect(screen.queryByRole("button", { name: "Connect" })).not.toBeInTheDocument();
	});

	it("shows the connected account and a Disconnect button", async () => {
		mockedIntegrationsApi.listProviders.mockResolvedValue(ALL_AVAILABLE);
		mockedIntegrationsApi.listConnections.mockResolvedValue([GOOGLE_CONNECTION]);

		renderWithProviders(<IntegrationsPage />);

		await screen.findByText("Connected as alex@example.com");
		expect(screen.getByRole("button", { name: "Disconnect" })).toBeInTheDocument();
	});

	it("requests an authorization URL and redirects the browser to it on Connect", async () => {
		mockedIntegrationsApi.listProviders.mockResolvedValue(ALL_AVAILABLE);
		mockedIntegrationsApi.listConnections.mockResolvedValue([]);
		mockedIntegrationsApi.startAuthorization.mockResolvedValue({ authorizationUrl: "https://accounts.google.com/o/oauth2/v2/auth?..." });
		const hrefSpy = vi.fn();
		// jsdom throws "not implemented" on a real navigation — spy on the
		// setter instead of letting the assignment actually happen.
		Object.defineProperty(window, "location", {
			value: { get href() { return ""; }, set href(url: string) { hrefSpy(url); } },
			writable: true,
		});
		const user = userEvent.setup();

		renderWithProviders(<IntegrationsPage />);

		await screen.findByText("Google Calendar");
		await user.click(screen.getAllByRole("button", { name: "Connect" })[0]);

		await waitFor(() =>
			expect(mockedIntegrationsApi.startAuthorization).toHaveBeenCalledWith("test-token", "GOOGLE_CALENDAR", "account-1"),
		);
		await waitFor(() => expect(hrefSpy).toHaveBeenCalledWith("https://accounts.google.com/o/oauth2/v2/auth?..."));
	});

	it("disconnects after confirming, and refreshes the connection list", async () => {
		mockedIntegrationsApi.listProviders.mockResolvedValue(ALL_AVAILABLE);
		mockedIntegrationsApi.listConnections.mockResolvedValue([GOOGLE_CONNECTION]);
		mockedIntegrationsApi.disconnect.mockResolvedValue(undefined);
		vi.spyOn(window, "confirm").mockReturnValue(true);
		const user = userEvent.setup();

		renderWithProviders(<IntegrationsPage />);

		await screen.findByText("Connected as alex@example.com");
		await user.click(screen.getByRole("button", { name: "Disconnect" }));

		await waitFor(() => expect(mockedIntegrationsApi.disconnect).toHaveBeenCalledWith("test-token", "conn-1"));
	});

	it("does not disconnect if the confirmation is declined", async () => {
		mockedIntegrationsApi.listProviders.mockResolvedValue(ALL_AVAILABLE);
		mockedIntegrationsApi.listConnections.mockResolvedValue([GOOGLE_CONNECTION]);
		vi.spyOn(window, "confirm").mockReturnValue(false);
		const user = userEvent.setup();

		renderWithProviders(<IntegrationsPage />);

		await screen.findByText("Connected as alex@example.com");
		await user.click(screen.getByRole("button", { name: "Disconnect" }));

		expect(mockedIntegrationsApi.disconnect).not.toHaveBeenCalled();
	});

	it("shows a success banner after connected=success", async () => {
		mockedIntegrationsApi.listProviders.mockResolvedValue(ALL_AVAILABLE);
		mockedIntegrationsApi.listConnections.mockResolvedValue([]);

		renderWithProviders(<IntegrationsPage />, { route: "/app/integrations?connected=success" });

		await screen.findByText("Connected! You can disconnect at any time.");
	});

	it("always shows the Apple/iOS note regardless of provider availability", async () => {
		mockedIntegrationsApi.listProviders.mockResolvedValue(NONE_AVAILABLE);
		mockedIntegrationsApi.listConnections.mockResolvedValue([]);

		renderWithProviders(<IntegrationsPage />);

		await screen.findByText(/available in the FlowKeeper mobile app/);
	});
});
