import { useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { useOutletContext } from "react-router-dom";
import { useAuth } from "react-oidc-context";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import { updateNotificationPreferences, updateProfile, uploadAvatar } from "../api/me";
import { triggerTestError } from "../api/diagnostics";
import { listTimezones, timezoneLabel } from "../lib/timezones";
import { LOCALE_LABELS, SUPPORTED_LOCALES, isSupportedLocale } from "../i18n";
import type { SupportedLocale } from "../i18n";
import type { MeResponse } from "../api/types";

const TIMEZONES = listTimezones();

export function ProfilePage() {
	const me = useOutletContext<MeResponse>();
	const auth = useAuth();
	const queryClient = useQueryClient();
	const { t, i18n } = useTranslation();
	const token = auth.user?.access_token ?? "";

	const [notificationError, setNotificationError] = useState<string | null>(null);

	async function toggleNotificationChannel(channel: "notifyInApp" | "notifyPush" | "notifyEmail", enabled: boolean) {
		setNotificationError(null);
		try {
			await updateNotificationPreferences(token, {
				notifyInApp: channel === "notifyInApp" ? enabled : me.notifyInApp,
				notifyPush: channel === "notifyPush" ? enabled : me.notifyPush,
				notifyEmail: channel === "notifyEmail" ? enabled : me.notifyEmail,
			});
			await queryClient.invalidateQueries({ queryKey: ["me"] });
		} catch {
			setNotificationError(t("profile.couldntUpdateNotifications"));
		}
	}

	const [displayName, setDisplayName] = useState(me.displayName);
	const [timezone, setTimezone] = useState(me.timezone);
	const [locale, setLocale] = useState<SupportedLocale>(isSupportedLocale(me.locale) ? me.locale : "en");
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [saved, setSaved] = useState(false);

	const [avatarUploading, setAvatarUploading] = useState(false);
	const [avatarError, setAvatarError] = useState<string | null>(null);

	const [sendingTestError, setSendingTestError] = useState(false);
	const [testErrorSent, setTestErrorSent] = useState(false);

	async function handleSendTestError() {
		setSendingTestError(true);
		setTestErrorSent(false);
		try {
			await triggerTestError(token);
		} catch {
			// Expected — the endpoint always throws. The failed request is the point: it's what should show up in Sentry.
			setTestErrorSent(true);
		} finally {
			setSendingTestError(false);
		}
	}

	function handleLocaleChange(next: SupportedLocale) {
		setLocale(next);
		void i18n.changeLanguage(next);
	}

	async function handleSubmit(event: FormEvent) {
		event.preventDefault();
		setSubmitting(true);
		setError(null);
		setSaved(false);
		try {
			await updateProfile(token, {
				displayName,
				timezone,
				locale,
				avatarUrl: me.avatarUrl,
			});
			await queryClient.invalidateQueries({ queryKey: ["me"] });
			setSaved(true);
		} catch {
			setError(t("profile.couldntSave"));
		} finally {
			setSubmitting(false);
		}
	}

	async function handleAvatarSelected(event: ChangeEvent<HTMLInputElement>) {
		const file = event.target.files?.[0];
		event.target.value = "";
		if (!file) return;
		setAvatarUploading(true);
		setAvatarError(null);
		try {
			await uploadAvatar(token, file);
			await queryClient.invalidateQueries({ queryKey: ["me"] });
		} catch {
			setAvatarError(t("profile.couldntUploadAvatar"));
		} finally {
			setAvatarUploading(false);
		}
	}

	return (
		<div className="profile-page">
			<h1>{t("profile.title")}</h1>

			<div className="profile-page__avatar">
				{me.avatarUrl && <img className="profile-page__preview" src={me.avatarUrl} alt={t("profile.yourAvatar")} />}
				<label className="field">
					<span>{t("profile.avatarOptional", { optional: t("common.optional") })}</span>
					<input
						type="file"
						accept="image/jpeg,image/png,image/webp"
						onChange={(e) => void handleAvatarSelected(e)}
						disabled={avatarUploading}
					/>
				</label>
				{avatarUploading && <p className="dialog__hint">{t("profile.uploading")}</p>}
				{avatarError && <p className="error-text">{avatarError}</p>}
			</div>

			<form onSubmit={handleSubmit} className="profile-form">
				<label className="field">
					<span>{t("profile.displayName")}</span>
					<input value={displayName} onChange={(e) => setDisplayName(e.target.value)} required />
				</label>

				<label className="field">
					<span>{t("profile.timezone")}</span>
					<select value={timezone} onChange={(e) => setTimezone(e.target.value)} required>
						{!TIMEZONES.includes(timezone) && <option value={timezone}>{timezone}</option>}
						{TIMEZONES.map((zone) => (
							<option key={zone} value={zone}>
								{timezoneLabel(zone)}
							</option>
						))}
					</select>
				</label>

				<label className="field">
					<span>{t("profile.language")}</span>
					<select value={locale} onChange={(e) => handleLocaleChange(e.target.value as SupportedLocale)} required>
						{SUPPORTED_LOCALES.map((code) => (
							<option key={code} value={code}>
								{LOCALE_LABELS[code]}
							</option>
						))}
					</select>
				</label>

				{error && <p className="error-text">{error}</p>}
				{saved && <p className="success-text">{t("profile.saved")}</p>}

				<button type="submit" className="button button--primary" disabled={submitting}>
					{submitting ? t("profile.saving") : t("profile.save")}
				</button>
			</form>

			<p className="profile-page__email">{t("profile.signedInAs", { email: me.email })}</p>

			<h2>{t("profile.reminders")}</h2>
			<p className="dialog__hint">{t("profile.remindersHint")}</p>
			{notificationError && <p className="error-text">{notificationError}</p>}
			<div className="notification-preferences">
				<label className="sharing-toggle">
					<input
						type="checkbox"
						checked={me.notifyInApp}
						onChange={(e) => void toggleNotificationChannel("notifyInApp", e.target.checked)}
					/>
					{t("profile.inApp")}
				</label>
				<label className="sharing-toggle">
					<input
						type="checkbox"
						checked={me.notifyPush}
						onChange={(e) => void toggleNotificationChannel("notifyPush", e.target.checked)}
					/>
					{t("profile.push")}
				</label>
				<label className="sharing-toggle">
					<input
						type="checkbox"
						checked={me.notifyEmail}
						onChange={(e) => void toggleNotificationChannel("notifyEmail", e.target.checked)}
					/>
					{t("profile.email")}
				</label>
			</div>

			{me.isPlatformAdmin && (
				<div className="profile-page__diagnostics">
					<h2>{t("profile.diagnosticsTitle")}</h2>
					<p className="dialog__hint">{t("profile.diagnosticsHint")}</p>
					<button type="button" className="button" onClick={() => void handleSendTestError()} disabled={sendingTestError}>
						{sendingTestError ? t("profile.sendingTestError") : t("profile.sendTestError")}
					</button>
					{testErrorSent && <p className="success-text">{t("profile.testErrorSent")}</p>}
				</div>
			)}
		</div>
	);
}
