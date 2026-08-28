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
	/** Omit to start now — set to log something that already happened (rejected if it's in the future). */
	startedAt?: string;
	/** Set alongside startedAt to log a fully-finished historical activity, already completed, in one call. */
	outgoingEnergy?: number | null;
	outgoingNote?: string | null;
	/** Omit (with outgoingEnergy set) to complete now; only meaningful alongside outgoingEnergy. */
	completedAt?: string;
}

export interface CompleteEventRequest {
	outgoingEnergy: number;
	outgoingNote: string | null;
}

/** Full correction of an already-completed event — every field is required, since this replaces the whole record. */
export interface UpdateEventRequest {
	eventTypeId: string;
	ingoingEnergy: number;
	ingoingNote: string | null;
	startedAt: string;
	outgoingEnergy: number;
	outgoingNote: string | null;
	completedAt: string;
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

/** One day's counts within a trend — every day in the requested range gets a point, even one with zero events. */
export interface TrendPoint {
	date: string;
	totalEvents: number;
	completedEvents: number;
	flowPercentage: number;
}

export interface PersonalTrendResponse {
	rangeStart: string;
	rangeEndExclusive: string;
	points: TrendPoint[];
}

/** A group/department/organisation's day-by-day trend — never one individual's numbers. points is null when belowMinimumSize. */
export interface AggregateTrendResponse {
	rangeStart: string;
	rangeEndExclusive: string;
	memberCount: number;
	belowMinimumSize: boolean;
	points: TrendPoint[] | null;
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

export interface CoachFeedbackResponse {
	id: string;
	coachId: string;
	coachDisplayName: string;
	/** Null for a freeform note not attached to any specific event. */
	eventId: string | null;
	eventTypeLabel: string | null;
	note: string;
	createdAt: string;
}

export interface CreateCoachFeedbackRequest {
	note: string;
	/** Omit for a freeform note not attached to any specific event. */
	eventId?: string | null;
}

export type PlanScope = "PERSONAL" | "BUSINESS";
export type BillingPeriod = "ONE_MONTH" | "THREE_MONTHS" | "SIX_MONTHS" | "TWELVE_MONTHS" | "TWO_YEARS" | "THREE_YEARS" | "FOUR_YEARS" | "FIVE_YEARS";
export type BillingType = "ONE_TIME" | "RECURRING";
export type SubscriptionStatus = "INCOMPLETE" | "ACTIVE" | "PAST_DUE" | "CANCELED" | "EXPIRED";

export interface PriceResponse {
	id: string;
	period: BillingPeriod;
	billingType: BillingType;
	perSeat: boolean;
	amountMinorUnits: number;
	currency: string;
}

export interface PlanResponse {
	id: string;
	code: string;
	scope: PlanScope;
	name: string;
	prices: PriceResponse[];
}

export interface SubscriptionResponse {
	accountId: string;
	/** Null for a promo-code-granted trial — it isn't tied to any specific paid price. */
	priceId: string | null;
	planScope: PlanScope | null;
	planCode: string | null;
	period: BillingPeriod | null;
	billingType: BillingType | null;
	seatCount: number | null;
	status: SubscriptionStatus;
	currentPeriodEnd: string | null;
	provider: string;
}

export interface RedeemPromoCodeRequest {
	accountId: string;
	code: string;
}

export interface GeneratePromoCodeRequest {
	durationDays: number;
	maxRedemptions: number;
	/** Omit for no redeem-by deadline. */
	expiresAt?: string | null;
	note?: string | null;
}

export interface PromoCodeResponse {
	id: string;
	code: string;
	durationDays: number;
	maxRedemptions: number;
	redemptionCount: number;
	expiresAt: string | null;
	note: string | null;
	createdByEmail: string;
	createdAt: string;
	revokedAt: string | null;
}
