import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useAuth } from "react-oidc-context";
import type { AuthContextProps } from "react-oidc-context";
import { renderWithProviders } from "../test/testUtils";
import { BillingPage } from "./BillingPage";
import * as billingApi from "../api/billing";
import { useActiveAccount } from "../context/ActiveAccountContext";
import type { AccountSummary, SubscriptionResponse } from "../api/types";

vi.mock("react-oidc-context", () => ({ useAuth: vi.fn() }));
vi.mock("../api/billing");
vi.mock("../context/ActiveAccountContext", () => ({ useActiveAccount: vi.fn() }));

const mockedUseAuth = vi.mocked(useAuth);
const mockedUseActiveAccount = vi.mocked(useActiveAccount);
const mockedBillingApi = vi.mocked(billingApi);

const OWNER_ACCOUNT: AccountSummary = { accountId: "account-1", name: "Anders Johansson", type: "PERSONAL", role: "OWNER" };
const MEMBER_ACCOUNT: AccountSummary = { accountId: "account-2", name: "Acme AB", type: "ORGANISATION", role: "MEMBER" };

const ACTIVE_SUBSCRIPTION: SubscriptionResponse = {
	accountId: "account-1",
	priceId: null,
	planScope: null,
	planCode: null,
	period: null,
	billingType: null,
	seatCount: null,
	status: "ACTIVE",
	currentPeriodEnd: "2026-06-01T00:00:00Z",
	provider: "PROMO_CODE",
};

describe("BillingPage", () => {
	beforeEach(() => {
		mockedUseAuth.mockReturnValue({ user: { access_token: "test-token" } } as AuthContextProps);
	});

	it("shows a no-subscription empty state", async () => {
		mockedUseActiveAccount.mockReturnValue({
			account: OWNER_ACCOUNT,
			accountId: OWNER_ACCOUNT.accountId,
			accounts: [OWNER_ACCOUNT],
			setAccountId: vi.fn(),
		});
		mockedBillingApi.getSubscription.mockResolvedValue(null);

		renderWithProviders(<BillingPage />);

		await screen.findByText("No active plan yet.");
	});

	it("shows the current subscription status", async () => {
		mockedUseActiveAccount.mockReturnValue({
			account: OWNER_ACCOUNT,
			accountId: OWNER_ACCOUNT.accountId,
			accounts: [OWNER_ACCOUNT],
			setAccountId: vi.fn(),
		});
		mockedBillingApi.getSubscription.mockResolvedValue(ACTIVE_SUBSCRIPTION);

		renderWithProviders(<BillingPage />);

		await screen.findByText(/Active until/);
	});

	it("lets an owner redeem a promo code", async () => {
		mockedUseActiveAccount.mockReturnValue({
			account: OWNER_ACCOUNT,
			accountId: OWNER_ACCOUNT.accountId,
			accounts: [OWNER_ACCOUNT],
			setAccountId: vi.fn(),
		});
		mockedBillingApi.getSubscription.mockResolvedValue(null);
		mockedBillingApi.redeemPromoCode.mockResolvedValue(ACTIVE_SUBSCRIPTION);
		const user = userEvent.setup();

		renderWithProviders(<BillingPage />);

		await screen.findByText("No active plan yet.");
		await user.type(screen.getByLabelText("Have a promo code?"), "ABCD-1234");
		await user.click(screen.getByRole("button", { name: "Redeem" }));

		await waitFor(() =>
			expect(mockedBillingApi.redeemPromoCode).toHaveBeenCalledWith("test-token", {
				accountId: "account-1",
				code: "ABCD-1234",
			}),
		);
		await screen.findByText("Redeemed! Your plan has been updated.");
	});

	it("shows an error instead of a silent blank area when the subscription fails to load", async () => {
		mockedUseActiveAccount.mockReturnValue({
			account: OWNER_ACCOUNT,
			accountId: OWNER_ACCOUNT.accountId,
			accounts: [OWNER_ACCOUNT],
			setAccountId: vi.fn(),
		});
		mockedBillingApi.getSubscription.mockRejectedValue(new Error("boom"));

		renderWithProviders(<BillingPage />);

		await screen.findByText("Couldn't load your subscription — try again.");
	});

	it("hides the redeem form from a non-owner member", async () => {
		mockedUseActiveAccount.mockReturnValue({
			account: MEMBER_ACCOUNT,
			accountId: MEMBER_ACCOUNT.accountId,
			accounts: [MEMBER_ACCOUNT],
			setAccountId: vi.fn(),
		});
		mockedBillingApi.getSubscription.mockResolvedValue(null);

		renderWithProviders(<BillingPage />);

		await screen.findByText("No active plan yet.");
		expect(screen.queryByLabelText("Have a promo code?")).not.toBeInTheDocument();
	});
});
