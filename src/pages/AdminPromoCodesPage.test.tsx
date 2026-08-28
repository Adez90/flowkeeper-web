import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useAuth } from "react-oidc-context";
import type { AuthContextProps } from "react-oidc-context";
import { renderWithProviders } from "../test/testUtils";
import { AdminPromoCodesPage } from "./AdminPromoCodesPage";
import * as adminApi from "../api/admin";
import { ApiError } from "../api/client";
import type { PromoCodeResponse } from "../api/types";

vi.mock("react-oidc-context", () => ({ useAuth: vi.fn() }));
vi.mock("../api/admin");

const mockedUseAuth = vi.mocked(useAuth);
const mockedAdminApi = vi.mocked(adminApi);

const CODE: PromoCodeResponse = {
	id: "code-1",
	code: "ABCD-1234",
	durationDays: 90,
	maxRedemptions: 1,
	redemptionCount: 0,
	expiresAt: null,
	note: "Private trial",
	createdByEmail: "admin@flowkeeper.se",
	createdAt: "2026-01-01T00:00:00Z",
	revokedAt: null,
};

describe("AdminPromoCodesPage", () => {
	beforeEach(() => {
		mockedUseAuth.mockReturnValue({ user: { access_token: "test-token" } } as AuthContextProps);
	});

	it("shows an access-denied message when the caller is not a platform admin", async () => {
		mockedAdminApi.listPromoCodes.mockRejectedValue(new ApiError(403, "forbidden"));

		renderWithProviders(<AdminPromoCodesPage />);

		await screen.findByText("You don't have access to this page.");
	});

	it("never renders the generate form before admin status is known, even for a non-admin", async () => {
		// A deliberately unresolved promise — simulates the window between
		// mount and the admin check actually coming back.
		mockedAdminApi.listPromoCodes.mockReturnValue(new Promise(() => {}));

		renderWithProviders(<AdminPromoCodesPage />);

		await screen.findByText("Loading…");
		expect(screen.queryByLabelText("Duration (days)")).not.toBeInTheDocument();
		expect(screen.queryByRole("button", { name: "Generate code" })).not.toBeInTheDocument();
	});

	it("lists existing codes with their redemption counts", async () => {
		mockedAdminApi.listPromoCodes.mockResolvedValue([CODE]);

		renderWithProviders(<AdminPromoCodesPage />);

		await screen.findByText("ABCD-1234");
		expect(screen.getByText("0/1")).toBeInTheDocument();
		expect(screen.getByText("Private trial")).toBeInTheDocument();
	});

	it("shows an empty state with no codes yet", async () => {
		mockedAdminApi.listPromoCodes.mockResolvedValue([]);

		renderWithProviders(<AdminPromoCodesPage />);

		await screen.findByText("No codes generated yet.");
	});

	it("generates a code and shows it prominently", async () => {
		mockedAdminApi.listPromoCodes.mockResolvedValue([]);
		mockedAdminApi.generatePromoCode.mockResolvedValue(CODE);
		const user = userEvent.setup();

		renderWithProviders(<AdminPromoCodesPage />);

		await screen.findByText("No codes generated yet.");
		await user.clear(screen.getByLabelText("Duration (days)"));
		await user.type(screen.getByLabelText("Duration (days)"), "90");
		await user.type(screen.getByLabelText("Note (optional)"), "Private trial");
		await user.click(screen.getByRole("button", { name: "Generate code" }));

		await waitFor(() => expect(mockedAdminApi.generatePromoCode).toHaveBeenCalled());
		expect(mockedAdminApi.generatePromoCode).toHaveBeenCalledWith("test-token", {
			durationDays: 90,
			maxRedemptions: 1,
			note: "Private trial",
		});
		await screen.findByText("ABCD-1234", { selector: "code" });
	});

	it("revokes a code", async () => {
		mockedAdminApi.listPromoCodes.mockResolvedValue([CODE]);
		mockedAdminApi.revokePromoCode.mockResolvedValue(undefined);
		const user = userEvent.setup();

		renderWithProviders(<AdminPromoCodesPage />);

		await screen.findByText("ABCD-1234");
		await user.click(screen.getByRole("button", { name: "Revoke" }));

		await waitFor(() => expect(mockedAdminApi.revokePromoCode).toHaveBeenCalledWith("test-token", "code-1"));
	});
});
