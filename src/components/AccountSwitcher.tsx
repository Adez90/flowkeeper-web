import { useActiveAccount } from "../context/ActiveAccountContext";

/** Only rendered once there's more than one account to switch between — see AppHeader. */
export function AccountSwitcher() {
	const { accountId, accounts, setAccountId } = useActiveAccount();

	return (
		<select
			className="account-switcher"
			aria-label="Active account"
			value={accountId}
			onChange={(e) => setAccountId(e.target.value)}
		>
			{accounts.map((account) => (
				<option key={account.accountId} value={account.accountId}>
					{account.name} ({account.type === "ORGANISATION" ? "Organisation" : "Personal"})
				</option>
			))}
		</select>
	);
}
