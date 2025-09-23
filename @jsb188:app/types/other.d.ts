import { DAY_OF_WEEK, EVENT_SCHDULE_FREQUENCY } from '~/constants/other.ts';

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
	values: string[] | null;
}

/**
 * Event types
 */

export type DayOfWeekEnum = typeof DAY_OF_WEEK[number];
export type EventScheduleFrequencyEnum = typeof EVENT_SCHDULE_FREQUENCY[number];

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