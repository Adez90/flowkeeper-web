import { useTranslation } from "react-i18next";
import { useActiveAccount } from "../context/ActiveAccountContext";

/** Only rendered once there's more than one account to switch between — see AppHeader. */
export function AccountSwitcher() {
	const { accountId, accounts, setAccountId } = useActiveAccount();
	const { t } = useTranslation();

	return (
		<select
			className="account-switcher"
			aria-label={t("accountSwitcher.label")}
			value={accountId}
			onChange={(e) => setAccountId(e.target.value)}
		>
			{accounts.map((account) => (
				<option key={account.accountId} value={account.accountId}>
					{account.name} ({account.type === "ORGANISATION" ? t("common.organisation") : t("common.personal")})
				</option>
			))}
		</select>
	);
}
