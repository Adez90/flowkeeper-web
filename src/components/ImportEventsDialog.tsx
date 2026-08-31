import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { listEventTypes } from "../api/events";
import { importEvents, listImportable } from "../api/integrations";
import type { EventTypeResponse, ExternalProvider, ImportableGroupResponse, ImportSelectionRequest } from "../api/types";

interface ImportEventsDialogProps {
	accountId: string;
	token: string;
	onClose: () => void;
	onImported: () => void;
}

interface SelectionState {
	selected: boolean;
	eventTypeId: string;
}

function itemKey(provider: ExternalProvider, externalId: string): string {
	return `${provider}:${externalId}`;
}

/** Strava's own activities read as "physical activity" by default; a calendar entry defaults to "meeting" — both just a starting point, changeable per item before importing. */
function defaultTypeIdFor(provider: ExternalProvider, types: EventTypeResponse[]): string {
	const preferredCode = provider === "STRAVA" ? "physical" : "meeting";
	return types.find((t) => t.code === preferredCode)?.id ?? types[0]?.id ?? "";
}

export function ImportEventsDialog({ accountId, token, onClose, onImported }: ImportEventsDialogProps) {
	const { t } = useTranslation();
	const typesQuery = useQuery({
		queryKey: ["event-types", accountId],
		queryFn: () => listEventTypes(token, accountId),
	});
	const importableQuery = useQuery({
		queryKey: ["importable-events", accountId],
		queryFn: () => listImportable(token, accountId),
	});

	const [selections, setSelections] = useState<Record<string, SelectionState>>({});
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);

	// Seed one entry per item the first time both the importable list and
	// the event types are in, so every checkbox/select has something to
	// control from the start rather than being built up piecemeal.
	useEffect(() => {
		if (!importableQuery.data || !typesQuery.data || Object.keys(selections).length > 0) {
			return;
		}
		const initial: Record<string, SelectionState> = {};
		for (const group of importableQuery.data) {
			for (const item of group.items) {
				initial[itemKey(group.provider, item.externalId)] = {
					selected: false,
					eventTypeId: defaultTypeIdFor(group.provider, typesQuery.data),
				};
			}
		}
		setSelections(initial);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [importableQuery.data, typesQuery.data]);

	function toggle(provider: ExternalProvider, externalId: string, selected: boolean) {
		setSelections((prev) => ({ ...prev, [itemKey(provider, externalId)]: { ...prev[itemKey(provider, externalId)], selected } }));
	}

	function setType(provider: ExternalProvider, externalId: string, eventTypeId: string) {
		setSelections((prev) => ({ ...prev, [itemKey(provider, externalId)]: { ...prev[itemKey(provider, externalId)], eventTypeId } }));
	}

	const groups: ImportableGroupResponse[] = importableQuery.data ?? [];
	const hasAnyItems = groups.some((g) => g.items.length > 0);
	const selectedCount = Object.values(selections).filter((s) => s.selected).length;

	async function handleImport() {
		setSubmitting(true);
		setError(null);
		try {
			const selectionRequests: ImportSelectionRequest[] = [];
			for (const group of groups) {
				for (const item of group.items) {
					const state = selections[itemKey(group.provider, item.externalId)];
					if (!state?.selected) {
						continue;
					}
					selectionRequests.push({
						provider: group.provider,
						externalId: item.externalId,
						eventTypeId: state.eventTypeId,
						startedAt: item.startedAt,
						endedAt: item.endedAt,
					});
				}
			}
			await importEvents(token, { accountId, selections: selectionRequests });
			onImported();
		} catch {
			setError(t("events.import.couldntSubmit"));
		} finally {
			setSubmitting(false);
		}
	}

	function formatTime(iso: string): string {
		return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
	}

	return (
		<div className="dialog-backdrop" role="dialog" aria-modal="true">
			<div className="dialog dialog--wide">
				<h2>{t("events.import.title")}</h2>
				<p className="dialog__hint">{t("events.import.intro")}</p>

				{(importableQuery.isLoading || typesQuery.isLoading) && <p className="page-loading">{t("common.loading")}</p>}
				{(importableQuery.isError || typesQuery.isError) && <p className="error-text">{t("events.import.couldntLoad")}</p>}
				{importableQuery.data && !hasAnyItems && <p className="empty-state">{t("events.import.empty")}</p>}

				<div className="import-events__groups">
					{groups.map((group) => (
						<div key={group.provider} className="import-events__group">
							<h3>{t(`integrations.providers.${group.provider}`)}</h3>
							{group.needsReconnect && <p className="error-text">{t("events.import.needsReconnect")}</p>}
							{!group.needsReconnect && group.items.length === 0 && (
								<p className="import-events__group-empty">{t("events.import.groupEmpty")}</p>
							)}
							<ul className="import-events__list">
								{group.items.map((item) => {
									const key = itemKey(group.provider, item.externalId);
									const state = selections[key];
									return (
										<li key={key} className="import-events__item">
											<label className="import-events__item-check">
												<input
													type="checkbox"
													checked={state?.selected ?? false}
													onChange={(e) => toggle(group.provider, item.externalId, e.target.checked)}
												/>
												<span>
													<strong>{item.title}</strong>
													<span className="import-events__item-time">
														{formatTime(item.startedAt)}–{formatTime(item.endedAt)}
													</span>
												</span>
											</label>
											<select
												value={state?.eventTypeId ?? ""}
												onChange={(e) => setType(group.provider, item.externalId, e.target.value)}
												disabled={!state?.selected}
												aria-label={t("events.type")}
											>
												{typesQuery.data?.map((type) => (
													<option key={type.id} value={type.id}>
														{type.label}
													</option>
												))}
											</select>
										</li>
									);
								})}
							</ul>
						</div>
					))}
				</div>

				{error && <p className="error-text">{error}</p>}

				<div className="dialog__actions">
					<button type="button" className="button" onClick={onClose}>
						{t("common.cancel")}
					</button>
					<button
						type="button"
						className="button button--primary"
						onClick={() => void handleImport()}
						disabled={submitting || selectedCount === 0}
					>
						{submitting ? t("events.import.submitting") : t("events.import.submit", { count: selectedCount })}
					</button>
				</div>
			</div>
		</div>
	);
}
