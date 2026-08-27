import { useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { useOutletContext } from "react-router-dom";
import { useAuth } from "react-oidc-context";
import { useQueryClient } from "@tanstack/react-query";
import { updateNotificationPreferences, updateProfile, uploadAvatar } from "../api/me";
import { listTimezones, timezoneLabel } from "../lib/timezones";
import type { MeResponse } from "../api/types";

const TIMEZONES = listTimezones();

export function ProfilePage() {
	const me = useOutletContext<MeResponse>();
	const auth = useAuth();
	const queryClient = useQueryClient();
	const token = auth.user?.access_token ?? "";

	async function toggleNotificationChannel(channel: "notifyInApp" | "notifyPush" | "notifyEmail", enabled: boolean) {
		await updateNotificationPreferences(token, {
			notifyInApp: channel === "notifyInApp" ? enabled : me.notifyInApp,
			notifyPush: channel === "notifyPush" ? enabled : me.notifyPush,
			notifyEmail: channel === "notifyEmail" ? enabled : me.notifyEmail,
		});
		await queryClient.invalidateQueries({ queryKey: ["me"] });
	}

	const [displayName, setDisplayName] = useState(me.displayName);
	const [timezone, setTimezone] = useState(me.timezone);
	const [locale, setLocale] = useState(me.locale ?? "");
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [saved, setSaved] = useState(false);

	const [avatarUploading, setAvatarUploading] = useState(false);
	const [avatarError, setAvatarError] = useState<string | null>(null);

	async function handleSubmit(event: FormEvent) {
		event.preventDefault();
		setSubmitting(true);
		setError(null);
		setSaved(false);
		try {
			await updateProfile(token, {
				displayName,
				timezone,
				locale: locale.trim() || null,
				avatarUrl: me.avatarUrl,
			});
			await queryClient.invalidateQueries({ queryKey: ["me"] });
			setSaved(true);
		} catch {
			setError("Couldn't save — try again.");
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
			setAvatarError("Couldn't upload that image — try again.");
		} finally {
			setAvatarUploading(false);
		}
	}

	return (
		<div className="profile-page">
			<h1>Your information</h1>

			<div className="profile-page__avatar">
				{me.avatarUrl && <img className="profile-page__preview" src={me.avatarUrl} alt="Your avatar" />}
				<label className="field">
					<span>Avatar image (optional)</span>
					<input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => void handleAvatarSelected(e)} disabled={avatarUploading} />
				</label>
				{avatarUploading && <p className="dialog__hint">Uploading…</p>}
				{avatarError && <p className="error-text">{avatarError}</p>}
			</div>

			<form onSubmit={handleSubmit} className="profile-form">
				<label className="field">
					<span>Display name</span>
					<input value={displayName} onChange={(e) => setDisplayName(e.target.value)} required />
				</label>

				<label className="field">
					<span>Timezone</span>
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
					<span>Language (optional)</span>
					<input value={locale} onChange={(e) => setLocale(e.target.value)} placeholder="en" />
				</label>

				{error && <p className="error-text">{error}</p>}
				{saved && <p className="success-text">Saved.</p>}

				<button type="submit" className="button button--primary" disabled={submitting}>
					{submitting ? "Saving…" : "Save changes"}
				</button>
			</form>

			<p className="profile-page__email">Signed in as {me.email}</p>

			<h2>Reminders</h2>
			<p className="dialog__hint">
				A nudge if you leave an activity open, or haven't logged anything yet today. Pick whichever channel(s) work
				for you — none are on by default.
			</p>
			<div className="notification-preferences">
				<label className="sharing-toggle">
					<input
						type="checkbox"
						checked={me.notifyInApp}
						onChange={(e) => void toggleNotificationChannel("notifyInApp", e.target.checked)}
					/>
					In-app
				</label>
				<label className="sharing-toggle">
					<input
						type="checkbox"
						checked={me.notifyPush}
						onChange={(e) => void toggleNotificationChannel("notifyPush", e.target.checked)}
					/>
					Push notification
				</label>
				<label className="sharing-toggle">
					<input
						type="checkbox"
						checked={me.notifyEmail}
						onChange={(e) => void toggleNotificationChannel("notifyEmail", e.target.checked)}
					/>
					Email
				</label>
			</div>
		</div>
	);
}
