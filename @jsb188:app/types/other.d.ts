import { DAY_OF_WEEK, SCHEDULE_FREQUENCY } from '../constants/other.ts';

/**
 * Enums
 */

export type DayOfWeekEnum = typeof DAY_OF_WEEK[number];
export type ScheduleFrequencyEnum = typeof SCHEDULE_FREQUENCY[number];

/**
 * Storage
 */

export interface StorageData {
	__table: 'storage';
	id: number;
	organizationId: number | null;
	accountId: number | null;
	uri: string;
	size: number;
	checked: boolean;
	at: Date;
	contentType: string;
	values: Record<string, any> | null;
}

export interface StorageGQL {
	id: string;
	organizationId: string | null;
	accountId: string | null;
	uri: string;
	size: number;
	checked: boolean;
	at: Date;
	contentType: string;

  // metadata
  name: string | null;
  description: string | null;
  aiNote: string | null;
}

/**
 * Address
 */

export interface AddressObj {
	line1: string;
	line2?: string | null;
	city: string;
	state: string;
	postalCode: string;
	country: string;
}

/**
 * Schedule
 */

export interface ScheduleObj {
	frequency: ScheduleFrequencyEnum;
	weeksOfMonth?: number[];
	daysOfWeek?: (0 | 1 | 2 | 3 | 4 | 5 | 6)[];
	time?: [
		string?, // Star time "hhmm" format
		string?, // End time "hhmm" format (optional)
	];
}

/**
 * File object
 */

export interface FileObj {
	buffer: Uint8Array;
	contentType: string;
}
