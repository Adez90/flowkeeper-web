import { useState } from "react";
import type { FormEvent } from "react";
import { addMember } from "../api/organisations";
import type { DepartmentResponse, GroupResponse, MemberRole } from "../api/types";

const ROLES: MemberRole[] = ["ADMIN", "COACH", "MEMBER"];

interface AddMemberDialogProps {
	accountId: string;
	token: string;
	departments: DepartmentResponse[];
	groups: GroupResponse[];
	onClose: () => void;
	onAdded: () => void;
}

export function AddMemberDialog({ accountId, token, departments, groups, onClose, onAdded }: AddMemberDialogProps) {
	const [email, setEmail] = useState("");
	const [role, setRole] = useState<MemberRole>("MEMBER");
	const [departmentId, setDepartmentId] = useState("");
	const [groupId, setGroupId] = useState("");
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);

	async function handleSubmit(event: FormEvent) {
		event.preventDefault();
		setSubmitting(true);
		setError(null);
		try {
			await addMember(token, accountId, {
				email: email.trim(),
				role,
				departmentId: departmentId || null,
				groupId: groupId || null,
			});
			onAdded();
		} catch {
			setError("Couldn't add that person — check they've logged into FlowKeeper at least once already.");
		} finally {
			setSubmitting(false);
		}
	}

	return (
		<div className="dialog-backdrop" role="dialog" aria-modal="true">
			<form className="dialog" onSubmit={handleSubmit}>
				<h2>Add a member</h2>
				<p className="dialog__hint">They need to have logged into FlowKeeper at least once already.</p>

				<label className="field">
					<span>Email</span>
					<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
				</label>

				<label className="field">
					<span>Role</span>
					<select value={role} onChange={(e) => setRole(e.target.value as MemberRole)}>
						{ROLES.map((r) => (
							<option key={r} value={r}>
								{r.charAt(0) + r.slice(1).toLowerCase()}
							</option>
						))}
					</select>
				</label>

				<label className="field">
					<span>Department (optional)</span>
					<select value={departmentId} onChange={(e) => setDepartmentId(e.target.value)}>
						<option value="">None</option>
						{departments.map((department) => (
							<option key={department.id} value={department.id}>
								{department.name}
							</option>
						))}
					</select>
				</label>

				<label className="field">
					<span>Group (optional)</span>
					<select value={groupId} onChange={(e) => setGroupId(e.target.value)}>
						<option value="">None</option>
						{groups.map((group) => (
							<option key={group.id} value={group.id}>
								{group.name}
							</option>
						))}
					</select>
				</label>

				{error && <p className="error-text">{error}</p>}

				<div className="dialog__actions">
					<button type="button" className="button" onClick={onClose}>
						Cancel
					</button>
					<button type="submit" className="button button--primary" disabled={submitting || !email.trim()}>
						{submitting ? "Adding…" : "Add member"}
					</button>
				</div>
			</form>
		</div>
	);
}
