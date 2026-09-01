import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { MeResponse } from "../api/types";
import { ActiveAccountContext } from "./activeAccountContextObject";
import type { ActiveAccountContextValue } from "./activeAccountContextObject";

const STORAGE_KEY = "flowkeeper.activeAccountId";

function readStoredAccountId(): string | null {
	try {
		return window.localStorage.getItem(STORAGE_KEY);
	} catch {
		return null;
	}
}

function writeStoredAccountId(accountId: string) {
	try {
		window.localStorage.setItem(STORAGE_KEY, accountId);
	} catch {
		// Best-effort only — a fresh default on the next load is fine.
	}
}

/**
 * Which of the user's accounts (their Personal one, or any Organisation
 * they belong to) the rest of the app shell should act in. Remembered
 * per-browser so switching doesn't reset every navigation; falls back to
 * the first account whenever the stored choice no longer applies (e.g. the
 * very first load, or the account list changed underneath it).
 */
export function ActiveAccountProvider({ me, children }: { me: MeResponse; children: ReactNode }) {
	const [accountId, setAccountIdState] = useState<string>(() => {
		const stored = readStoredAccountId();
		return stored && me.accounts.some((a) => a.accountId === stored) ? stored : (me.accounts[0]?.accountId ?? "");
	});

	function setAccountId(nextAccountId: string) {
		setAccountIdState(nextAccountId);
		writeStoredAccountId(nextAccountId);
	}

	const resolvedId = me.accounts.some((a) => a.accountId === accountId) ? accountId : (me.accounts[0]?.accountId ?? "");
	const account = me.accounts.find((a) => a.accountId === resolvedId) ?? me.accounts[0];

	const value = useMemo<ActiveAccountContextValue>(
		() => ({ account, accountId: resolvedId, accounts: me.accounts, setAccountId }),
		[account, resolvedId, me.accounts],
	);

	if (!account) {
		// Every user always has at least their Personal account from
		// registration — this shouldn't be reachable, but fail loudly
		// rather than silently rendering a broken account switcher.
		throw new Error("ActiveAccountProvider: no accounts available");
	}

	return <ActiveAccountContext.Provider value={value}>{children}</ActiveAccountContext.Provider>;
}
