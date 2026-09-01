import { useState } from "react";
import type { FormEvent } from "react";
import { useOutletContext } from "react-router-dom";
import { useAuth } from "react-oidc-context";
import { useTranslation } from "react-i18next";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
	createDepartment,
	createGroup,
	createOrganisation,
	fetchMembers,
	fetchStructure,
	updateDepartmentSharing,
	updateGroupSharing,
	updateMemberSharing,
} from "../api/organisations";
import { useActiveAccount } from "../context/useActiveAccount";
import { AddMemberDialog } from "../components/AddMemberDialog";
import { MemberFeedbackDialog } from "../components/MemberFeedbackDialog";
import type { MemberResponse, MeResponse } from "../api/types";

const MANAGER_ROLES = ["OWNER", "ADMIN"];

export function OrganisationPage() {
	const me = useOutletContext<MeResponse>();
	const { account, accountId, setAccountId } = useActiveAccount();

	if (account.type === "PERSONAL") {
		return <CreateOrganisationForm me={me} setAccountId={setAccountId} />;
	}

	return <OrganisationStructure key={accountId} accountId={accountId} role={account.role} meUserId={me.userId} />;
}

function CreateOrganisationForm({ me, setAccountId }: { me: MeResponse; setAccountId: (id: string) => void }) {
	const auth = useAuth();
	const { t } = useTranslation();
	const token = auth.user?.access_token ?? "";
	const queryClient = useQueryClient();
	const [name, setName] = useState("");
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);

	async function handleSubmit(event: FormEvent) {
		event.preventDefault();
		setSubmitting(true);
		setError(null);
		try {
			const organisation = await createOrganisation(token, { name: name.trim() });
			await queryClient.invalidateQueries({ queryKey: ["me"] });
			setAccountId(organisation.accountId);
		} catch {
			setError(t("organisation.couldntCreate"));
			setSubmitting(false);
		}
	}

	return (
		<div className="organisation-page">
			<h1>{t("organisation.title")}</h1>
			<p className="empty-state">{t("organisation.notPartOfOrg", { displayName: me.displayName })}</p>
			<form onSubmit={handleSubmit} className="profile-form">
				<label className="field">
					<span>{t("organisation.organisationName")}</span>
					<input value={name} onChange={(e) => setName(e.target.value)} required />
				</label>
				{error && <p className="error-text">{error}</p>}
				<button type="submit" className="button button--primary" disabled={submitting || !name.trim()}>
					{submitting ? t("organisation.creating") : t("organisation.createOrganisation")}
				</button>
			</form>
		</div>
	);
}

function OrganisationStructure({ accountId, role, meUserId }: { accountId: string; role: string; meUserId: string }) {
	const auth = useAuth();
	const { t } = useTranslation();
	const token = auth.user?.access_token ?? "";
	const queryClient = useQueryClient();
	const isManager = MANAGER_ROLES.includes(role);

	const [departmentName, setDepartmentName] = useState("");
	const [groupName, setGroupName] = useState("");
	const [groupDepartmentId, setGroupDepartmentId] = useState("");
	const [addingMember, setAddingMember] = useState(false);
	const [feedbackForMember, setFeedbackForMember] = useState<MemberResponse | null>(null);
	const [error, setError] = useState<string | null>(null);

	const structureQuery = useQuery({
		queryKey: ["organisation-structure", accountId],
		queryFn: () => fetchStructure(token, accountId),
	});
	const membersQuery = useQuery({
		queryKey: ["organisation-members", accountId],
		queryFn: () => fetchMembers(token, accountId),
	});

	function refresh() {
		void queryClient.invalidateQueries({ queryKey: ["organisation-structure", accountId] });
		void queryClient.invalidateQueries({ queryKey: ["organisation-members", accountId] });
	}

	/** Best-effort feedback for a fire-and-forget sharing toggle — the checkbox itself stays controlled by server data, so on failure it just reverts; this is the only visible sign anything went wrong. */
	async function updateSharing(action: () => Promise<unknown>) {
		setError(null);
		try {
			await action();
			refresh();
		} catch {
			setError(t("organisation.couldntUpdateSharing"));
		}
	}

	async function handleCreateDepartment(event: FormEvent) {
		event.preventDefault();
		setError(null);
		try {
			await createDepartment(token, accountId, { name: departmentName.trim() });
			setDepartmentName("");
			refresh();
		} catch {
			setError(t("organisation.couldntCreateDepartment"));
		}
	}

	async function handleCreateGroup(event: FormEvent) {
		event.preventDefault();
		setError(null);
		try {
			await createGroup(token, accountId, { name: groupName.trim(), departmentId: groupDepartmentId || null });
			setGroupName("");
			setGroupDepartmentId("");
			refresh();
		} catch {
			setError(t("organisation.couldntCreateGroup"));
		}
	}

	const departments = structureQuery.data?.departments ?? [];
	const groups = structureQuery.data?.groups ?? [];
	const members = membersQuery.data ?? [];

	function departmentName_(id: string | null) {
		return id ? (departments.find((d) => d.id === id)?.name ?? "—") : "—";
	}
	function groupName_(id: string | null) {
		return id ? (groups.find((g) => g.id === id)?.name ?? "—") : "—";
	}

	const me = members.find((m) => m.userId === meUserId);

	/** Best-effort mirror of the API's own supervisory-ladder check — just for whether to show a "Feedback" button, the API still enforces the real rule. */
	function supervises(member: MemberResponse): boolean {
		if (role === "OWNER") {
			return true;
		}
		if (role === "ADMIN") {
			if (!me?.departmentId) {
				return true; // org-wide ADMIN, no department scope of their own
			}
			const memberDepartmentId = member.departmentId ?? groups.find((g) => g.id === member.groupId)?.departmentId ?? null;
			return memberDepartmentId === me.departmentId;
		}
		if (role === "COACH") {
			return Boolean(me?.groupId) && member.groupId === me?.groupId;
		}
		return false;
	}

	function canViewFeedbackFor(member: MemberResponse): boolean {
		return member.userId === meUserId || supervises(member);
	}

	const isLoading = structureQuery.isLoading || membersQuery.isLoading;
	const isError = structureQuery.isError || membersQuery.isError;

	return (
		<div className="organisation-page">
			<div className="landing-page__toolbar">
				<h1>{t("organisation.title")}</h1>
				{isManager && (
					<button type="button" className="button button--primary" onClick={() => setAddingMember(true)}>
						{t("organisation.addMember")}
					</button>
				)}
			</div>

			{isLoading && <p className="page-loading">{t("common.loading")}</p>}
			{isError && <p className="error-text">{t("organisation.couldntLoad")}</p>}
			{error && <p className="error-text">{error}</p>}

			<h2>{t("organisation.departments")}</h2>
			{departments.length === 0 && <p className="empty-state">{t("organisation.noDepartmentsYet")}</p>}
			<ul className="org-structure-list">
				{departments.map((department) => (
					<li key={department.id} className="org-structure-list__item">
						<span>{department.name}</span>
						{role === "ADMIN" && members.find((m) => m.userId === meUserId)?.departmentId === department.id && (
							<label className="sharing-toggle">
								<input
									type="checkbox"
									checked={department.shareFlowWithPeers}
									onChange={(e) =>
										void updateSharing(() =>
											updateDepartmentSharing(token, accountId, department.id, {
												shareFlowWithPeers: e.target.checked,
											}),
										)
									}
								/>
								{t("organisation.shareDepartmentAverage")}
							</label>
						)}
					</li>
				))}
			</ul>
			{isManager && (
				<form onSubmit={handleCreateDepartment} className="quick-add">
					<input
						className="quick-add__input"
						value={departmentName}
						onChange={(e) => setDepartmentName(e.target.value)}
						placeholder={t("organisation.newDepartmentName")}
						required
					/>
					<button type="submit" className="button" disabled={!departmentName.trim()}>
						{t("organisation.addDepartment")}
					</button>
				</form>
			)}

			<h2>{t("organisation.groups")}</h2>
			{groups.length === 0 && <p className="empty-state">{t("organisation.noGroupsYet")}</p>}
			<ul className="org-structure-list">
				{groups.map((group) => (
					<li key={group.id} className="org-structure-list__item">
						<span>
							{group.name}
							{group.departmentId && <span className="org-structure-list__meta"> · {departmentName_(group.departmentId)}</span>}
						</span>
						{role === "COACH" && members.find((m) => m.userId === meUserId)?.groupId === group.id && (
							<label className="sharing-toggle">
								<input
									type="checkbox"
									checked={group.shareFlowWithPeers}
									onChange={(e) =>
										void updateSharing(() =>
											updateGroupSharing(token, accountId, group.id, { shareFlowWithPeers: e.target.checked }),
										)
									}
								/>
								{t("organisation.shareGroupAverage")}
							</label>
						)}
					</li>
				))}
			</ul>
			{isManager && (
				<form onSubmit={handleCreateGroup} className="quick-add">
					<input
						className="quick-add__input"
						value={groupName}
						onChange={(e) => setGroupName(e.target.value)}
						placeholder={t("organisation.newGroupName")}
						required
					/>
					<select value={groupDepartmentId} onChange={(e) => setGroupDepartmentId(e.target.value)}>
						<option value="">{t("organisation.noDepartment")}</option>
						{departments.map((department) => (
							<option key={department.id} value={department.id}>
								{department.name}
							</option>
						))}
					</select>
					<button type="submit" className="button" disabled={!groupName.trim()}>
						{t("organisation.addGroup")}
					</button>
				</form>
			)}

			<h2>{t("organisation.members")}</h2>
			<ul className="org-structure-list">
				{members.map((member) => (
					<li key={member.userId} className="org-structure-list__item">
						<span>
							{member.displayName} <span className="org-structure-list__meta">· {member.email}</span>
							<br />
							<span className="org-structure-list__meta">
								{member.role.charAt(0) + member.role.slice(1).toLowerCase()}
								{member.departmentId && <> · {departmentName_(member.departmentId)}</>}
								{member.groupId && <> · {groupName_(member.groupId)}</>}
							</span>
						</span>
						{member.userId === meUserId && (
							<label className="sharing-toggle">
								<input
									type="checkbox"
									checked={member.shareFlowWithPeers}
									onChange={(e) =>
										void updateSharing(() =>
											updateMemberSharing(token, accountId, { shareFlowWithPeers: e.target.checked }),
										)
									}
								/>
								{t("organisation.shareMyFlow")}
							</label>
						)}
						{canViewFeedbackFor(member) && (
							<button type="button" className="button" onClick={() => setFeedbackForMember(member)}>
								{t("organisation.feedback")}
							</button>
						)}
					</li>
				))}
			</ul>

			{feedbackForMember && (
				<MemberFeedbackDialog
					accountId={accountId}
					token={token}
					memberId={feedbackForMember.userId}
					memberDisplayName={feedbackForMember.displayName}
					canWrite={feedbackForMember.userId !== meUserId && supervises(feedbackForMember)}
					onClose={() => setFeedbackForMember(null)}
				/>
			)}

			{addingMember && (
				<AddMemberDialog
					accountId={accountId}
					token={token}
					departments={departments}
					groups={groups}
					onClose={() => setAddingMember(false)}
					onAdded={() => {
						setAddingMember(false);
						refresh();
					}}
				/>
			)}
		</div>
	);
}
