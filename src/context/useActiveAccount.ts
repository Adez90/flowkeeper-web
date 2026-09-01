import { useContext } from "react";
import { ActiveAccountContext } from "./activeAccountContextObject";
import type { ActiveAccountContextValue } from "./activeAccountContextObject";

export function useActiveAccount(): ActiveAccountContextValue {
	const ctx = useContext(ActiveAccountContext);
	if (!ctx) {
		throw new Error("useActiveAccount must be used within an ActiveAccountProvider");
	}
	return ctx;
}
