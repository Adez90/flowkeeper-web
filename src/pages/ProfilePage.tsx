import { useState } from "react";
import type { FormEvent } from "react";
import { useOutletContext } from "react-router-dom";
import { useAuth } from "react-oidc-context";
import { useQueryClient } from "@tanstack/react-query";
import { updateProfile } from "../api/me";
import type { MeResponse } from "../api/types";

export function ProfilePage() {
	const me = useOutletContext<MeResponse>();
	const auth = useAuth();
	const queryClient = useQueryClient();
	const token = auth.user?.access_token ?? "";

	const [displayName, setDisplayName] = useState(me.displayName);
	const [timezone, setTimezone] = useState(me.timezone);
	const [locale, setLocale] = useState(me.locale ?? "");
	const [avatarUrl, setAvatarUrl] = useState(me.avatarUrl ?? "");
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [saved, setSaved] = useState(false);

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
				avatarUrl: avatarUrl.trim() || null,
			});
			await queryClient.invalidateQueries({ queryKey: ["me"] });
			setSaved(true);
		} catch {
			setError("Couldn't save — check the timezone is a real one (e.g. Europe/Stockholm) and try again.");
		} finally {
			setSubmitting(false);
		}
	}

	return (
		<div className="profile-page">
			<h1>Your information</h1>
			<form onSubmit={handleSubmit} className="profile-form">
				<label className="field">
					<span>Display name</span>
					<input value={displayName} onChange={(e) => setDisplayName(e.target.value)} required />
				</label>

				<label className="field">
					<span>Timezone</span>
					<input
						value={timezone}
						onChange={(e) => setTimezone(e.target.value)}
						placeholder="Europe/Stockholm"
						required
					/>
				</label>

				<label className="field">
					<span>Language (optional)</span>
					<input value={locale} onChange={(e) => setLocale(e.target.value)} placeholder="en" />
				</label>

				<label className="field">
					<span>Avatar image URL (optional)</span>
					<input value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)} placeholder="https://…" />
				</label>

				{avatarUrl && <img className="profile-page__preview" src={avatarUrl} alt="Avatar preview" />}

				{error && <p className="error-text">{error}</p>}
				{saved && <p className="success-text">Saved.</p>}

				<button type="submit" className="button button--primary" disabled={submitting}>
					{submitting ? "Saving…" : "Save changes"}
				</button>
			</form>

			<p className="profile-page__email">Signed in as {me.email}</p>
		</div>
	);
}
