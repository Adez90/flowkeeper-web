import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useAuth } from "react-oidc-context";
import type { AuthContextProps } from "react-oidc-context";
import * as reactRouterDom from "react-router-dom";
import { renderWithProviders } from "../test/testUtils";
import { ProfilePage } from "./ProfilePage";
import * as meApi from "../api/me";
import i18n from "../i18n";
import type { MeResponse } from "../api/types";

vi.mock("react-oidc-context", () => ({ useAuth: vi.fn() }));
vi.mock("../api/me");
vi.mock("react-router-dom", async (importOriginal) => {
	const actual = await importOriginal<typeof reactRouterDom>();
	return { ...actual, useOutletContext: vi.fn() };
});

const mockedUseAuth = vi.mocked(useAuth);
const mockedUseOutletContext = vi.mocked(reactRouterDom.useOutletContext);
const mockedMeApi = vi.mocked(meApi);

const ME: MeResponse = {
	userId: "u1",
	displayName: "Anders Johansson",
	email: "anders@example.com",
	timezone: "UTC",
	locale: null,
	avatarUrl: null,
	notifyInApp: false,
	notifyPush: false,
	notifyEmail: false,
	accounts: [],
};

describe("ProfilePage", () => {
	beforeEach(() => {
		mockedUseAuth.mockReturnValue({ user: { access_token: "test-token" } } as AuthContextProps);
		mockedUseOutletContext.mockReturnValue(ME);
	});

	afterEach(() => {
		void i18n.changeLanguage("en");
	});

	it("pre-fills the form from the current profile", () => {
		renderWithProviders(<ProfilePage />);

		expect(screen.getByLabelText("Display name")).toHaveValue("Anders Johansson");
		expect(screen.getByLabelText("Timezone")).toHaveValue("UTC");
	});

	it("submits the edited fields and shows a saved confirmation", async () => {
		mockedMeApi.updateProfile.mockResolvedValue({ ...ME, timezone: "Europe/Stockholm" });
		const user = userEvent.setup();

		renderWithProviders(<ProfilePage />);

		await user.selectOptions(screen.getByLabelText("Timezone"), "Europe/Stockholm");
		await user.click(screen.getByRole("button", { name: "Save changes" }));

		await screen.findByText("Saved.");
		expect(mockedMeApi.updateProfile).toHaveBeenCalledWith("test-token", {
			displayName: "Anders Johansson",
			timezone: "Europe/Stockholm",
			locale: "en",
			avatarUrl: null,
		});
	});

	it("shows an error message when saving fails", async () => {
		mockedMeApi.updateProfile.mockRejectedValue(new Error("invalid timezone"));
		const user = userEvent.setup();

		renderWithProviders(<ProfilePage />);

		await user.click(screen.getByRole("button", { name: "Save changes" }));

		await screen.findByText("Couldn't save — try again.");
	});

	it("offers a real IANA timezone dropdown, not free text", () => {
		renderWithProviders(<ProfilePage />);

		const select = screen.getByLabelText("Timezone") as HTMLSelectElement;
		expect(select.tagName).toBe("SELECT");
		const values = Array.from(select.options).map((option) => option.value);
		expect(values).toContain("Europe/Stockholm");
		expect(values).toContain("America/New_York");
	});

	it("shows the current reminder-channel preferences", () => {
		renderWithProviders(<ProfilePage />);

		expect(screen.getByLabelText("In-app")).not.toBeChecked();
		expect(screen.getByLabelText("Push notification")).not.toBeChecked();
		expect(screen.getByLabelText("Email")).not.toBeChecked();
	});

	it("toggling a reminder channel saves only that channel", async () => {
		mockedMeApi.updateNotificationPreferences.mockResolvedValue({ ...ME, notifyInApp: true });
		const user = userEvent.setup();

		renderWithProviders(<ProfilePage />);

		await user.click(screen.getByLabelText("In-app"));

		await waitFor(() =>
			expect(mockedMeApi.updateNotificationPreferences).toHaveBeenCalledWith("test-token", {
				notifyInApp: true,
				notifyPush: false,
				notifyEmail: false,
			}),
		);
	});

	it("has no avatar preview when no avatar is set, and uploads a selected file", async () => {
		mockedMeApi.uploadAvatar.mockResolvedValue({ ...ME, avatarUrl: "https://api.example.com/api/v1/avatars/abc.jpg" });
		const user = userEvent.setup();

		renderWithProviders(<ProfilePage />);

		expect(screen.queryByAltText("Your avatar")).not.toBeInTheDocument();

		const file = new File(["fake-bytes"], "me.jpg", { type: "image/jpeg" });
		await user.upload(screen.getByLabelText("Avatar image (optional)"), file);

		await waitFor(() => expect(mockedMeApi.uploadAvatar).toHaveBeenCalledWith("test-token", file));
	});

	it("shows the current avatar as a preview when one is set", () => {
		mockedUseOutletContext.mockReturnValue({ ...ME, avatarUrl: "https://api.example.com/api/v1/avatars/abc.jpg" });

		renderWithProviders(<ProfilePage />);

		expect(screen.getByAltText("Your avatar")).toHaveAttribute("src", "https://api.example.com/api/v1/avatars/abc.jpg");
	});

	it("shows an error when the avatar upload fails", async () => {
		mockedMeApi.uploadAvatar.mockRejectedValue(new Error("too big"));
		const user = userEvent.setup();

		renderWithProviders(<ProfilePage />);

		const file = new File(["fake-bytes"], "me.jpg", { type: "image/jpeg" });
		await user.upload(screen.getByLabelText("Avatar image (optional)"), file);

		await screen.findByText("Couldn't upload that image — try again.");
	});

	it("offers all five supported languages, defaulting to English", () => {
		renderWithProviders(<ProfilePage />);

		const select = screen.getByLabelText("Language") as HTMLSelectElement;
		expect(select).toHaveValue("en");
		const values = Array.from(select.options).map((option) => option.value);
		expect(values).toEqual(["en", "sv", "es", "de", "fr"]);
	});

	it("switches the UI language immediately on selection, and saves the new locale", async () => {
		mockedMeApi.updateProfile.mockResolvedValue({ ...ME, locale: "sv" });
		const user = userEvent.setup();

		renderWithProviders(<ProfilePage />);

		await user.selectOptions(screen.getByLabelText("Language"), "sv");

		await screen.findByText("Spara ändringar");
		await user.click(screen.getByRole("button", { name: "Spara ändringar" }));

		expect(mockedMeApi.updateProfile).toHaveBeenCalledWith("test-token", {
			displayName: "Anders Johansson",
			timezone: "UTC",
			locale: "sv",
			avatarUrl: null,
		});
	});

	it("pre-selects the language dropdown from an already-set supported locale", () => {
		mockedUseOutletContext.mockReturnValue({ ...ME, locale: "de" });

		renderWithProviders(<ProfilePage />);

		expect(screen.getByLabelText("Language")).toHaveValue("de");
	});
});
