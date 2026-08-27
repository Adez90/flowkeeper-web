import { useState } from "react";
import type { FormEvent } from "react";
import { useOutletContext } from "react-router-dom";
import { useAuth } from "react-oidc-context";
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
import { useActiveAccount } from "../context/ActiveAccountContext";
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
			setError("Couldn't create that organisation — try again.");
			setSubmitting(false);
		}
	}

	return (
		<div className="organisation-page">
			<h1>Organisation</h1>
			<p className="empty-state">
				{me.displayName}, you're not part of an organisation yet. Create one to invite your team, see rolled-up
				Flow % at the group/department/organisation level, and gather anonymous feedback.
			</p>
			<form onSubmit={handleSubmit} className="profile-form">
				<label className="field">
					<span>Organisation name</span>
					<input value={name} onChange={(e) => setName(e.target.value)} required />
				</label>
				{error && <p className="error-text">{error}</p>}
				<button type="submit" className="button button--primary" disabled={submitting || !name.trim()}>
					{submitting ? "Creating…" : "Create organisation"}
				</button>
			</form>
		</div>
	);
}

function OrganisationStructure({ accountId, role, meUserId }: { accountId: string; role: string; meUserId: string }) {
	const auth = useAuth();
	const token = auth.user?.access_token ?? "";
	const queryClient = useQueryClient();
	const isManager = MANAGER_ROLES.includes(role);

	const [departmentName, setDepartmentName] = useState("");
	const [groupName, setGroupName] = useState("");
	const [groupDepartmentId, setGroupDepartmentId] = useState("");
	const [addingMember, setAddingMember] = useState(false);
	const [feedbackForMember, setFeedbackForMember] = useState<MemberResponse | null>(null);

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

	async function handleCreateDepartment(event: FormEvent) {
		event.preventDefault();
		await createDepartment(token, accountId, { name: departmentName.trim() });
		setDepartmentName("");
		refresh();
	}

	async function handleCreateGroup(event: FormEvent) {
		event.preventDefault();
		await createGroup(token, accountId, { name: groupName.trim(), departmentId: groupDepartmentId || null });
		setGroupName("");
		setGroupDepartmentId("");
		refresh();
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

	return (
		<div className="organisation-page">
			<div className="landing-page__toolbar">
				<h1>Organisation</h1>
				{isManager && (
					<button type="button" className="button button--primary" onClick={() => setAddingMember(true)}>
						+ Add member
					</button>
				)}
			</div>

			<h2>Departments</h2>
			{departments.length === 0 && <p className="empty-state">No departments yet.</p>}
			<ul className="org-structure-list">
				{departments.map((department) => (
					<li key={department.id} className="org-structure-list__item">
						<span>{department.name}</span>
						{role === "ADMIN" && members.find((m) => m.userId === meUserId)?.departmentId === department.id && (
							<label className="sharing-toggle">
								<input
									type="checkbox"
									checked={department.shareFlowWithPeers}
									onChange={async (e) => {
										await updateDepartmentSharing(token, accountId, department.id, {
											shareFlowWithPeers: e.target.checked,
										});
										refresh();
									}}
								/>
								Share our average with other departments
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
						placeholder="New department name"
						required
					/>
					<button type="submit" className="button" disabled={!departmentName.trim()}>
						+ Add department
					</button>
				</form>
			)}

			<h2>Groups</h2>
			{groups.length === 0 && <p className="empty-state">No groups yet.</p>}
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
									onChange={async (e) => {
										await updateGroupSharing(token, accountId, group.id, { shareFlowWithPeers: e.target.checked });
										refresh();
									}}
								/>
								Share our average with other groups
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
						placeholder="New group name"
						required
					/>
					<select value={groupDepartmentId} onChange={(e) => setGroupDepartmentId(e.target.value)}>
						<option value="">No department</option>
						{departments.map((department) => (
							<option key={department.id} value={department.id}>
								{department.name}
							</option>
						))}
					</select>
					<button type="submit" className="button" disabled={!groupName.trim()}>
						+ Add group
					</button>
				</form>
			)}

			<h2>Members</h2>
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
									onChange={async (e) => {
										await updateMemberSharing(token, accountId, { shareFlowWithPeers: e.target.checked });
										refresh();
									}}
								/>
								Share my Flow % with my group
							</label>
						)}
						{canViewFeedbackFor(member) && (
							<button type="button" className="button" onClick={() => setFeedbackForMember(member)}>
								Feedback
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
