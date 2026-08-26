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
	accounts: AccountSummary[];
}

export interface UpdateProfileRequest {
	displayName: string;
	timezone: string;
	locale: string | null;
	avatarUrl: string | null;
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
	byType: TypeBreakdown[];
}
