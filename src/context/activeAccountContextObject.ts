import { createContext } from "react";
import type { AccountSummary } from "../api/types";

export interface ActiveAccountContextValue {
	account: AccountSummary;
	accountId: string;
	accounts: AccountSummary[];
	setAccountId: (accountId: string) => void;
}

// Split from ActiveAccountContext.tsx (the Provider component) and
// useActiveAccount.ts (the hook) — a non-component export sharing a file
// with a component defeats Vite's fast refresh for that file.
export const ActiveAccountContext = createContext<ActiveAccountContextValue | null>(null);
