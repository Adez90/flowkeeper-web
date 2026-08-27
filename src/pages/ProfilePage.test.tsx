import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useAuth } from "react-oidc-context";
import type { AuthContextProps } from "react-oidc-context";
import * as reactRouterDom from "react-router-dom";
import { renderWithProviders } from "../test/testUtils";
import { ProfilePage } from "./ProfilePage";
import * as meApi from "../api/me";
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

	it("pre-fills the form from the current profile", () => {
		renderWithProviders(<ProfilePage />);

		expect(screen.getByLabelText("Display name")).toHaveValue("Anders Johansson");
		expect(screen.getByLabelText("Timezone")).toHaveValue("UTC");
	});

	it("submits the edited fields and shows a saved confirmation", async () => {
		mockedMeApi.updateProfile.mockResolvedValue({ ...ME, timezone: "Europe/Stockholm" });
		const user = userEvent.setup();

		renderWithProviders(<ProfilePage />);

		const timezoneInput = screen.getByLabelText("Timezone");
		await user.clear(timezoneInput);
		await user.type(timezoneInput, "Europe/Stockholm");
		await user.click(screen.getByRole("button", { name: "Save changes" }));

		await screen.findByText("Saved.");
		expect(mockedMeApi.updateProfile).toHaveBeenCalledWith("test-token", {
			displayName: "Anders Johansson",
			timezone: "Europe/Stockholm",
			locale: null,
			avatarUrl: null,
		});
	});

	it("shows an error message when saving fails", async () => {
		mockedMeApi.updateProfile.mockRejectedValue(new Error("invalid timezone"));
		const user = userEvent.setup();

		renderWithProviders(<ProfilePage />);

		await user.click(screen.getByRole("button", { name: "Save changes" }));

		await waitFor(() =>
			expect(
				screen.getByText("Couldn't save — check the timezone is a real one (e.g. Europe/Stockholm) and try again."),
			).toBeInTheDocument(),
		);
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
});
