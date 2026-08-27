import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useAuth } from "react-oidc-context";
import type { AuthContextProps } from "react-oidc-context";
import { renderWithProviders } from "../test/testUtils";
import { NotificationBell } from "./NotificationBell";
import * as notificationsApi from "../api/notifications";
import type { NotificationResponse } from "../api/types";

vi.mock("react-oidc-context", () => ({ useAuth: vi.fn() }));
vi.mock("../api/notifications");

const mockedUseAuth = vi.mocked(useAuth);
const mockedNotificationsApi = vi.mocked(notificationsApi);

const UNREAD: NotificationResponse = {
	id: "notif-1",
	type: "UNFINISHED_EVENT",
	message: "You have an activity still open",
	createdAt: "2026-03-12T18:00:00Z",
	readAt: null,
};
const READ: NotificationResponse = {
	id: "notif-2",
	type: "UNUSED_ACCOUNT",
	message: "Nothing logged yet today",
	createdAt: "2026-03-11T08:00:00Z",
	readAt: "2026-03-11T09:00:00Z",
};

describe("NotificationBell", () => {
	beforeEach(() => {
		mockedUseAuth.mockReturnValue({ user: { access_token: "test-token" } } as AuthContextProps);
	});

	it("shows an unread-count badge only when there's something unread", async () => {
		mockedNotificationsApi.fetchNotifications.mockResolvedValue([UNREAD, READ]);

		renderWithProviders(<NotificationBell />);

		await waitFor(() => expect(screen.getByText("1")).toBeInTheDocument());
	});

	it("shows no badge when everything is read", async () => {
		mockedNotificationsApi.fetchNotifications.mockResolvedValue([READ]);

		renderWithProviders(<NotificationBell />);

		await waitFor(() => expect(mockedNotificationsApi.fetchNotifications).toHaveBeenCalled());
		expect(screen.queryByText("1")).not.toBeInTheDocument();
	});

	it("opens the panel and lists notifications on click", async () => {
		mockedNotificationsApi.fetchNotifications.mockResolvedValue([UNREAD, READ]);
		const user = userEvent.setup();

		renderWithProviders(<NotificationBell />);

		await user.click(screen.getByRole("button", { name: /Notifications/ }));

		await screen.findByText("You have an activity still open");
		expect(screen.getByText("Nothing logged yet today")).toBeInTheDocument();
	});

	it("marks a notification read", async () => {
		mockedNotificationsApi.fetchNotifications.mockResolvedValue([UNREAD]);
		mockedNotificationsApi.markNotificationRead.mockResolvedValue({ ...UNREAD, readAt: "2026-03-12T19:00:00Z" });
		const user = userEvent.setup();

		renderWithProviders(<NotificationBell />);

		await user.click(screen.getByRole("button", { name: /Notifications/ }));
		await user.click(await screen.findByRole("button", { name: "Mark read" }));

		await waitFor(() => expect(mockedNotificationsApi.markNotificationRead).toHaveBeenCalledWith("test-token", "notif-1"));
	});
});
