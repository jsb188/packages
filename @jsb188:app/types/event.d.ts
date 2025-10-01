import { EVENT_TYPES } from '../constants/event';
import type { AccountData } from './account.d';
import type { OrganizationGQLData, OrganizationData } from './organization.d';
import type { EventScheduleObj } from './other.d';

/**
 * Enums
 */

export type EventTypeEnum = typeof EVENT_TYPES[number];

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

export interface EventUpsertObj {
	id?: number; // Only for edits
	addressId?: number;

	name: string;
	type: EventTypeEnum;
	paused: boolean;
	schedule: EventScheduleObj | null;
	startAt: Date;
	endAt: Date;
}

export interface EventDataObj extends EventUpsertObj {
	__table: 'events';
	id: number;
	organizationId: number;
	accountId: number;
	address: OrganizationAddressObj | null; // This must *never* be null
	createdAt: Date;
	updatedAt: Date;
}

export interface EventGQLData {
	id: string;
	organizationId: string;
	accountId: string;
	name: string;
	type: EventTypeEnum;
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

export interface EventAttendanceUpsertObj {
	id?: number; // Only for edits
	organizationId: number;
	eventId: number;
	accountId: number;
	attended: boolean | null;
	calDate: string; // "YYYY-MM-DD" format
	history?: [string, '0' | '1'][] | null; // [YYYY-MM-DD, '0' | '1'][]
}

export interface EventAttendanceDataObj extends EventAttendanceUpsertObj {
	__table: 'event_attendance';
	id: number;
	organization: OrganizationData;
	account: AccountData; // account data
}

export interface EventAttendanceGQLData {
	__deleted: boolean; // For client-side only
	id: string;
	eventId: string;
	attended: boolean | null;
	calDate: string; // "YYYY-MM-DD" format
	organization: OrganizationGQLData;
	checkedBy: any; // account data
}
