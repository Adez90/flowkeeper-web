// Mirrors flowkeeper-api's DTOs exactly. Hand-written for now — codegen
// from the OpenAPI spec (springdoc, /v3/api-docs) is the intended long-term
// source of truth, but generating against a live instance wasn't possible
// in the environment this was first built in. Keep this in sync by hand
// until that's wired up.

export type AccountType = "PERSONAL" | "ORGANISATION";
export type MemberRole = "OWNER" | "ADMIN" | "COACH" | "MEMBER";
export type EventStatus = "OPEN" | "COMPLETED";
export type StatisticsPeriod = "DAY" | "WEEK" | "MONTH";

export interface AccountSummary {
	accountId: string;
	name: string;
	type: AccountType;
	role: MemberRole;
}

export interface MeResponse {
	userId: string;
	displayName: string;
	email: string;
	timezone: string;
	locale: string | null;
	avatarUrl: string | null;
	notifyInApp: boolean;
	notifyPush: boolean;
	notifyEmail: boolean;
	accounts: AccountSummary[];
}

export interface UpdateProfileRequest {
	displayName: string;
	timezone: string;
	locale: string | null;
	avatarUrl: string | null;
}

export interface UpdateNotificationPreferencesRequest {
	notifyInApp: boolean;
	notifyPush: boolean;
	notifyEmail: boolean;
}

export interface UpdatePushTokenRequest {
	expoPushToken: string;
}

export interface NotificationResponse {
	id: string;
	type: string;
	message: string;
	createdAt: string;
	readAt: string | null;
}

export interface RegistrationResponse {
	userId: string;
	personalAccountId: string;
	role: MemberRole;
	alreadyRegistered: boolean;
}

export interface EventTypeResponse {
	id: string;
	code: string;
	label: string;
	icon: string | null;
	isDefault: boolean;
}

export interface EventResponse {
	id: string;
	accountId: string;
	eventTypeId: string;
	eventTypeLabel: string;
	status: EventStatus;
	ingoingEnergy: number;
	ingoingNote: string | null;
	outgoingEnergy: number | null;
	outgoingNote: string | null;
	shareAnonymously: boolean;
	startedAt: string;
	completedAt: string | null;
}

export interface CreateEventRequest {
	accountId: string;
	eventTypeId: string;
	ingoingEnergy: number;
	ingoingNote: string | null;
}

export interface CompleteEventRequest {
	outgoingEnergy: number;
	outgoingNote: string | null;
}

export interface TypeBreakdown {
	eventTypeId: string;
	label: string;
	count: number;
	averageEnergyDelta: number | null;
}

export interface PersonalStatisticsResponse {
	period: StatisticsPeriod;
	rangeStart: string;
	rangeEndExclusive: string;
	totalEvents: number;
	completedEvents: number;
	openEvents: number;
	averageIngoingEnergy: number | null;
	averageEnergyDelta: number | null;
	/** Share of completed events "in flow" (ingoing+outgoing energy summing to 4-6) — 0 if none completed. */
	flowPercentage: number;
	byType: TypeBreakdown[];
}

/** A group/department/organisation's rolled-up Flow % — never one individual's number. */
export interface AggregateStatisticsResponse {
	period: StatisticsPeriod;
	rangeStart: string;
	rangeEndExclusive: string;
	memberCount: number;
	/** True when memberCount is below the privacy minimum — the numeric fields are all null in that case. */
	belowMinimumSize: boolean;
	totalEvents: number | null;
	completedEvents: number | null;
	flowPercentage: number | null;
	averageEnergyDelta: number | null;
}

export interface OrganisationTypeStatisticsResponse {
	period: StatisticsPeriod;
	rangeStart: string;
	rangeEndExclusive: string;
	memberCount: number;
	belowMinimumSize: boolean;
	byType: TypeBreakdown[];
}

export interface AnonymousFeedbackItem {
	eventTypeLabel: string;
	ingoingNote: string | null;
	outgoingNote: string | null;
	startedAt: string;
}

export interface OrganisationFeedbackResponse {
	memberCount: number;
	belowMinimumSize: boolean;
	items: AnonymousFeedbackItem[];
}

export interface OrganisationResponse {
	accountId: string;
	name: string;
	role: MemberRole;
}

export interface CreateOrganisationRequest {
	name: string;
}

export interface DepartmentResponse {
	id: string;
	name: string;
	shareFlowWithPeers: boolean;
}

export interface CreateDepartmentRequest {
	name: string;
}

export interface GroupResponse {
	id: string;
	name: string;
	departmentId: string | null;
	shareFlowWithPeers: boolean;
}

export interface CreateGroupRequest {
	name: string;
	/** Omit for a Group directly under the Organisation, no Department layer. */
	departmentId?: string | null;
}

export interface OrganisationStructureResponse {
	departments: DepartmentResponse[];
	groups: GroupResponse[];
}

export interface MemberResponse {
	userId: string;
	displayName: string;
	email: string;
	role: MemberRole;
	departmentId: string | null;
	groupId: string | null;
	shareFlowWithPeers: boolean;
}

export interface AddMemberRequest {
	email: string;
	role: MemberRole;
	departmentId?: string | null;
	groupId?: string | null;
}

export interface UpdateSharingRequest {
	shareFlowWithPeers: boolean;
}

export interface UpdateEventSharingRequest {
	shareAnonymously: boolean;
}
