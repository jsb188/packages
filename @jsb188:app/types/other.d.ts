
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
