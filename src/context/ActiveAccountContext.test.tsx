import { beforeEach, describe, expect, it } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { ActiveAccountProvider, useActiveAccount } from "./ActiveAccountContext";
import type { AccountSummary, MeResponse } from "../api/types";

const PERSONAL: AccountSummary = { accountId: "personal-1", name: "Anders Johansson", type: "PERSONAL", role: "OWNER" };
const ORG: AccountSummary = { accountId: "org-1", name: "Acme AB", type: "ORGANISATION", role: "MEMBER" };

function meWith(accounts: AccountSummary[]): MeResponse {
	return {
		userId: "u1",
		displayName: "Anders Johansson",
		email: "anders@example.com",
		timezone: "UTC",
		locale: null,
		avatarUrl: null,
		notifyInApp: false,
		notifyPush: false,
		notifyEmail: false,
		accounts,
	};
}

describe("ActiveAccountContext", () => {
	beforeEach(() => {
		window.localStorage.clear();
	});

	it("defaults to the first account when nothing's stored", () => {
		const { result } = renderHook(() => useActiveAccount(), {
			wrapper: ({ children }) => <ActiveAccountProvider me={meWith([PERSONAL, ORG])}>{children}</ActiveAccountProvider>,
		});

		expect(result.current.accountId).toBe("personal-1");
		expect(result.current.account.name).toBe("Anders Johansson");
	});

	it("switches accounts and remembers the choice for next time", () => {
		const { result } = renderHook(() => useActiveAccount(), {
			wrapper: ({ children }) => <ActiveAccountProvider me={meWith([PERSONAL, ORG])}>{children}</ActiveAccountProvider>,
		});

		act(() => result.current.setAccountId("org-1"));

		expect(result.current.accountId).toBe("org-1");
		expect(result.current.account.name).toBe("Acme AB");
		expect(window.localStorage.getItem("flowkeeper.activeAccountId")).toBe("org-1");
	});

	it("picks up a previously stored choice on the next mount", () => {
		window.localStorage.setItem("flowkeeper.activeAccountId", "org-1");

		const { result } = renderHook(() => useActiveAccount(), {
			wrapper: ({ children }) => <ActiveAccountProvider me={meWith([PERSONAL, ORG])}>{children}</ActiveAccountProvider>,
		});

		expect(result.current.accountId).toBe("org-1");
	});

	it("falls back to the first account when the stored one no longer exists", () => {
		window.localStorage.setItem("flowkeeper.activeAccountId", "some-deleted-account");

		const { result } = renderHook(() => useActiveAccount(), {
			wrapper: ({ children }) => <ActiveAccountProvider me={meWith([PERSONAL, ORG])}>{children}</ActiveAccountProvider>,
		});

		expect(result.current.accountId).toBe("personal-1");
	});

	it("throws when used outside the provider", () => {
		const { result } = renderHook(() => {
			try {
				return useActiveAccount();
			} catch (err) {
				return err;
			}
		});

		expect(result.current).toBeInstanceOf(Error);
	});
});
