import { apiFetchJson } from "./client";
import type {
	AddMemberRequest,
	CreateDepartmentRequest,
	CreateGroupRequest,
	CreateOrganisationRequest,
	DepartmentResponse,
	GroupResponse,
	MemberResponse,
	OrganisationResponse,
	OrganisationStructureResponse,
	UpdateSharingRequest,
} from "./types";

export function createOrganisation(token: string, body: CreateOrganisationRequest): Promise<OrganisationResponse> {
	return apiFetchJson<OrganisationResponse>("/api/v1/organisations", {
		method: "POST",
		token,
		body: JSON.stringify(body),
	});
}

export function createDepartment(token: string, accountId: string, body: CreateDepartmentRequest): Promise<DepartmentResponse> {
	return apiFetchJson<DepartmentResponse>(`/api/v1/organisations/${accountId}/departments`, {
		method: "POST",
		token,
		body: JSON.stringify(body),
	});
}

export function createGroup(token: string, accountId: string, body: CreateGroupRequest): Promise<GroupResponse> {
	return apiFetchJson<GroupResponse>(`/api/v1/organisations/${accountId}/groups`, {
		method: "POST",
		token,
		body: JSON.stringify(body),
	});
}

export function addMember(token: string, accountId: string, body: AddMemberRequest): Promise<MemberResponse> {
	return apiFetchJson<MemberResponse>(`/api/v1/organisations/${accountId}/members`, {
		method: "POST",
		token,
		body: JSON.stringify(body),
	});
}

export function fetchStructure(token: string, accountId: string): Promise<OrganisationStructureResponse> {
	return apiFetchJson<OrganisationStructureResponse>(`/api/v1/organisations/${accountId}/structure`, { token });
}

export function fetchMembers(token: string, accountId: string): Promise<MemberResponse[]> {
	return apiFetchJson<MemberResponse[]>(`/api/v1/organisations/${accountId}/members`, { token });
}

export function updateMemberSharing(token: string, accountId: string, body: UpdateSharingRequest): Promise<MemberResponse> {
	return apiFetchJson<MemberResponse>(`/api/v1/organisations/${accountId}/members/me/sharing`, {
		method: "PATCH",
		token,
		body: JSON.stringify(body),
	});
}

export function updateGroupSharing(
	token: string,
	accountId: string,
	groupId: string,
	body: UpdateSharingRequest,
): Promise<GroupResponse> {
	return apiFetchJson<GroupResponse>(`/api/v1/organisations/${accountId}/groups/${groupId}/sharing`, {
		method: "PATCH",
		token,
		body: JSON.stringify(body),
	});
}

export function updateDepartmentSharing(
	token: string,
	accountId: string,
	departmentId: string,
	body: UpdateSharingRequest,
): Promise<DepartmentResponse> {
	return apiFetchJson<DepartmentResponse>(`/api/v1/organisations/${accountId}/departments/${departmentId}/sharing`, {
		method: "PATCH",
		token,
		body: JSON.stringify(body),
	});
}
