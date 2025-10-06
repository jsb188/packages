import { EVENT_TYPES } from '@jsb188/app/constants/event.ts';
import { DAY_OF_WEEK } from '@jsb188/app/constants/other.ts';
import type { AccountData } from '@jsb188/app/types/account';
import type { OrganizationData, OrganizationGQLData } from '@jsb188/app/types/organization';

/**
 * Enums
 */

export type EventTypeEnum = typeof EVENT_TYPES[number];
export type DayOfWeekEnum = typeof DAY_OF_WEEK[number];

export interface EventsFilter {
  type: EventTypeEnum;
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
