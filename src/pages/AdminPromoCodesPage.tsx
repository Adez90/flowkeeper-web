import { useState } from "react";
import type { FormEvent } from "react";
import { useAuth } from "react-oidc-context";
import { useTranslation } from "react-i18next";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { generatePromoCode, listPromoCodes, revokePromoCode } from "../api/admin";
import { ApiError } from "../api/client";
import type { PromoCodeResponse } from "../api/types";

function statusOf(code: PromoCodeResponse, t: (key: string) => string): string {
	if (code.revokedAt) {
		return t("adminPromoCodes.status.revoked");
	}
	if (code.redemptionCount >= code.maxRedemptions) {
		return t("adminPromoCodes.status.exhausted");
	}
	if (code.expiresAt && new Date(code.expiresAt) < new Date()) {
		return t("adminPromoCodes.status.expired");
	}
	return t("adminPromoCodes.status.active");
}

export function AdminPromoCodesPage() {
	const auth = useAuth();
	const { t } = useTranslation();
	const queryClient = useQueryClient();
	const token = auth.user?.access_token ?? "";

	const [durationDays, setDurationDays] = useState(90);
	const [maxRedemptions, setMaxRedemptions] = useState(1);
	const [note, setNote] = useState("");
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [justGenerated, setJustGenerated] = useState<string | null>(null);

	const codesQuery = useQuery({
		queryKey: ["admin-promo-codes"],
		queryFn: () => listPromoCodes(token),
		enabled: Boolean(token),
	});

	async function handleGenerate(event: FormEvent) {
		event.preventDefault();
		setSubmitting(true);
		setError(null);
		setJustGenerated(null);
		try {
			const created = await generatePromoCode(token, {
				durationDays,
				maxRedemptions,
				note: note.trim() || null,
			});
			setJustGenerated(created.code);
			setNote("");
			await queryClient.invalidateQueries({ queryKey: ["admin-promo-codes"] });
		} catch {
			setError(t("adminPromoCodes.couldntGenerate"));
		} finally {
			setSubmitting(false);
		}
	}

	async function handleRevoke(promoCodeId: string) {
		try {
			await revokePromoCode(token, promoCodeId);
			await queryClient.invalidateQueries({ queryKey: ["admin-promo-codes"] });
		} catch {
			setError(t("adminPromoCodes.couldntRevoke"));
		}
	}

	// Admin status isn't known until this resolves — the generate form (and
	// the rest of the page) must wait for it rather than rendering
	// optimistically, or a non-admin briefly sees an admin-only form before
	// the 403 comes back.
	if (codesQuery.isLoading) {
		return (
			<div className="admin-promo-codes-page">
				<h1>{t("adminPromoCodes.title")}</h1>
				<p className="page-loading">{t("common.loading")}</p>
			</div>
		);
	}

	if (codesQuery.isError && codesQuery.error instanceof ApiError && codesQuery.error.status === 403) {
		return (
			<div className="admin-promo-codes-page">
				<h1>{t("adminPromoCodes.title")}</h1>
				<p className="error-text">{t("adminPromoCodes.notAnAdmin")}</p>
			</div>
		);
	}

	if (codesQuery.isError) {
		return (
			<div className="admin-promo-codes-page">
				<h1>{t("adminPromoCodes.title")}</h1>
				<p className="error-text">{t("adminPromoCodes.couldntLoad")}</p>
			</div>
		);
	}

	return (
		<div className="admin-promo-codes-page">
			<h1>{t("adminPromoCodes.title")}</h1>

			<form onSubmit={handleGenerate} className="profile-form">
				<label className="field">
					<span>{t("adminPromoCodes.durationDays")}</span>
					<input
						type="number"
						min={1}
						value={durationDays}
						onChange={(e) => setDurationDays(Number(e.target.value))}
						required
					/>
				</label>
				<label className="field">
					<span>{t("adminPromoCodes.maxRedemptions")}</span>
					<input
						type="number"
						min={1}
						value={maxRedemptions}
						onChange={(e) => setMaxRedemptions(Number(e.target.value))}
						required
					/>
				</label>
				<label className="field">
					<span>{t("adminPromoCodes.note", { optional: t("common.optional") })}</span>
					<input value={note} onChange={(e) => setNote(e.target.value)} placeholder={t("adminPromoCodes.notePlaceholder")} />
				</label>
				{error && <p className="error-text">{error}</p>}
				<button type="submit" className="button button--primary" disabled={submitting}>
					{submitting ? t("adminPromoCodes.generating") : t("adminPromoCodes.generate")}
				</button>
			</form>

			{justGenerated && (
				<p className="admin-promo-codes-page__generated">
					{t("adminPromoCodes.generated")} <code>{justGenerated}</code>
				</p>
			)}

			<h2>{t("adminPromoCodes.existingCodes")}</h2>
			{codesQuery.data && codesQuery.data.length === 0 && (
				<p className="empty-state">{t("adminPromoCodes.noneYet")}</p>
			)}
			{codesQuery.data && codesQuery.data.length > 0 && (
				<div className="admin-promo-codes-page__table-wrap">
					<table className="admin-promo-codes-page__table">
						<thead>
							<tr>
								<th>{t("adminPromoCodes.code")}</th>
								<th>{t("adminPromoCodes.status.label")}</th>
								<th>{t("adminPromoCodes.durationDays")}</th>
								<th>{t("adminPromoCodes.redemptions")}</th>
								<th>{t("adminPromoCodes.note")}</th>
								<th />
							</tr>
						</thead>
						<tbody>
							{codesQuery.data.map((code) => (
								<tr key={code.id}>
									<td>
										<code>{code.code}</code>
									</td>
									<td>{statusOf(code, t)}</td>
									<td>{code.durationDays}</td>
									<td>
										{code.redemptionCount}/{code.maxRedemptions}
									</td>
									<td>{code.note ?? "—"}</td>
									<td>
										{!code.revokedAt && (
											<button type="button" className="button" onClick={() => handleRevoke(code.id)}>
												{t("adminPromoCodes.revoke")}
											</button>
										)}
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			)}
		</div>
	);
}
