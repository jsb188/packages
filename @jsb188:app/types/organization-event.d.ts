import { ORGANIZATION_EVENT_TYPES } from '../constants/organization-event.ts';
import type { OrganizationGQLData } from './organization.d.ts';
import type { EventScheduleObj } from './other.d.ts';
import type { AccountData } from './account.d.ts';

export type OrganizationEventTypeEnum = typeof ORGANIZATION_EVENT_TYPES[number];

/**
 * Org addresses
 */

export interface OrganizationAddressInsertObj {
	id?: number; // Only for edits
	line1: string;
	line2?: string | null;
	city: string;
	state: string;
	postalCode: string;
	country: string;
}

export interface OrganizationAddressObj extends OrganizationAddressInsertObj {
	__table: 'organization_addresses';
	id: number;
	organizationId: number;
	createdAt: Date;
	updatedAt: Date;
}

export interface OrganizationAddressGQLData {
	id: string;
	organizationId: string;
	line1: string;
	line2?: string | null;
	city: string;
	state: string;
	postalCode: string;
	country: string;
	createdAt: string;
	updatedAt: string;
}

/**
 * Org events
 */

export interface OrganizationEventUpsertObj {
	id?: number; // Only for edits
	addressId?: number;

	name: string;
	type: OrganizationEventTypeEnum;
	paused: boolean;
	schedule: EventScheduleObj | null;
	startAt: Date;
	endAt: Date;
}

export interface OrganizationEventDataObj extends OrganizationEventUpsertObj {
	__table: 'organization_events';
	id: number;
	organizationId: number;
	accountId: number;
	address: OrganizationAddressObj | null; // This must *never* be null
	createdAt: Date;
	updatedAt: Date;
}

export interface OrganizationEventGQLData {
	id: string;
	organizationId: string;
	accountId: string;
	name: string;
	type: OrganizationEventTypeEnum;
	paused: boolean;
	schedule: EventScheduleObj; // resolver will force non-null values
	startAt: string | Date;
	endAt: string | Date | null;
	address: OrganizationAddressGQLData; // This must *never* be null
	createdAt: string;
	updatedAt: string;
}

/**
 * Org event attendance
 */

export interface OrgEventAttendanceUpsertObj {
	id?: number; // Only for edits
	organizationId: number;
	orgEventId: number;
	accountId: number;
	attended: boolean | null;
	calDate: string; // "YYYY-MM-DD" format
	history?: [string, '0' | '1'][] | null; // [YYYY-MM-DD, '0' | '1'][]
}

export interface OrgEventAttendanceDataObj extends OrgEventAttendanceUpsertObj {
	__table: 'organization_event_attendance';
	id: number;
	organization: OrganizationData;
	account: AccountData; // account data
}

export interface OrgEventAttendanceGQLData {
	__deleted: boolean; // For client-side only
	id: string;
	orgEventId: string;
	attended: boolean | null;
	calDate: string; // "YYYY-MM-DD" format
	organization: OrganizationGQLData;
	checkedBy: any; // account data
}
