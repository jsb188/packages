import { EVENT_TYPES } from '@jsb188/app/constants/event.ts';
import { DAY_OF_WEEK, EVENT_SCHDULE_FREQUENCY } from '@jsb188/app/constants/other.ts';
import type { AccountData } from '@jsb188/app/types/account';
import type { OrganizationData, OrganizationGQLData } from '@jsb188/app/types/organization';

/**
 * Enums
 */

export type EventTypeEnum = typeof EVENT_TYPES[number];
export type DayOfWeekEnum = typeof DAY_OF_WEEK[number];
export type EventScheduleFrequencyEnum = typeof EVENT_SCHDULE_FREQUENCY[number];

export interface EventsFilter {
  type: EventTypeEnum;
}

/**
 * Addresses
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
 * Schedule
 */

export interface EventScheduleObj {
  frequency: EventScheduleFrequencyEnum;
  interval: number;
  byDay: DayOfWeekEnum[];
  byMonthDay: number[];
  byMonth: number[];
  once: boolean;
	time: [number, number];
  time_SU: [number, number];
	time_MO: [number, number];
  time_TU: [number, number];
  time_WE: [number, number];
  time_TH: [number, number];
  time_FR: [number, number];
  time_SA: [number, number];
}

/**
 * Org events
 */

export interface EventUpsertObj {
	id?: number; // Only for edits
	addressId?: number;

	title: string;
	type: EventTypeEnum;
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

export interface EventGQL {
	id: string;
	organizationId: string;
	accountId: string;
	title: string;
	type: EventTypeEnum;
	schedule: EventScheduleObj; // resolver will force non-null values
  order: EventOrderGQL;
	startAt: string | Date;
	endAt: string | Date | null;
	address: OrganizationAddressGQLData; // This must *never* be null
	createdAt: string;
	updatedAt: string;
}

/**
 * Event order
 */

interface EventOrderBase {
}

interface EventOrderGQL extends EventOrderBase {
  id: string;
}

interface EventOrderObj extends EventOrderBase {
	__table: 'event_orders';
  id: number;
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
