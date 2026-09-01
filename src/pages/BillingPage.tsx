import { useState } from "react";
import type { FormEvent } from "react";
import { useAuth } from "react-oidc-context";
import { useTranslation } from "react-i18next";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getSubscription, redeemPromoCode } from "../api/billing";
import { useActiveAccount } from "../context/useActiveAccount";

export function BillingPage() {
	const auth = useAuth();
	const { t } = useTranslation();
	const queryClient = useQueryClient();
	const { account, accountId } = useActiveAccount();
	const token = auth.user?.access_token ?? "";
	const isOwner = account.role === "OWNER";

	const [code, setCode] = useState("");
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [redeemed, setRedeemed] = useState(false);

	const subscriptionQuery = useQuery({
		queryKey: ["subscription", accountId],
		queryFn: () => getSubscription(token, accountId),
		enabled: Boolean(accountId),
	});

	async function handleRedeem(event: FormEvent) {
		event.preventDefault();
		setSubmitting(true);
		setError(null);
		setRedeemed(false);
		try {
			await redeemPromoCode(token, { accountId, code: code.trim() });
			setCode("");
			setRedeemed(true);
			await queryClient.invalidateQueries({ queryKey: ["subscription", accountId] });
		} catch {
			setError(t("billing.couldntRedeem"));
		} finally {
			setSubmitting(false);
		}
	}

	const subscription = subscriptionQuery.data;

	return (
		<div className="billing-page">
			<h1>{t("billing.title")}</h1>

			{subscriptionQuery.isLoading && <p className="page-loading">{t("common.loading")}</p>}
			{subscriptionQuery.isError && <p className="error-text">{t("billing.couldntLoadSubscription")}</p>}

			{subscriptionQuery.data === null && <p className="empty-state">{t("billing.noSubscription")}</p>}

			{subscription && (
				<p className="billing-page__status">
					{t("billing.statusLine", {
						status: t(`billing.status.${subscription.status}`),
						until: subscription.currentPeriodEnd ? new Date(subscription.currentPeriodEnd).toLocaleDateString() : "—",
					})}
				</p>
			)}

			{isOwner && (
				<form onSubmit={handleRedeem} className="profile-form">
					<label className="field">
						<span>{t("billing.redeemCode")}</span>
						<input
							value={code}
							onChange={(e) => setCode(e.target.value)}
							placeholder={t("billing.redeemCodePlaceholder")}
							required
						/>
					</label>
					{error && <p className="error-text">{error}</p>}
					{redeemed && <p className="billing-page__redeemed">{t("billing.redeemed")}</p>}
					<button type="submit" className="button button--primary" disabled={submitting || !code.trim()}>
						{submitting ? t("billing.redeeming") : t("billing.redeem")}
					</button>
				</form>
			)}
		</div>
	);
}
