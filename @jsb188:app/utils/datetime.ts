import { DateTime } from 'luxon';
import i18n from '../i18n';
import { isValidTimeZone, parseDateInTimezone } from './timeZone';

/**
 * Types
 */

export type DatePeriodEnum =
	| 'UPCOMING'
	| 'TOMORROW'
	| 'TODAY'
	| 'YESTERDAY'
	| 'THIS_WEEK'
	| 'THIS_MONTH'
	| 'LAST_WEEK'
	| 'LAST_MONTH'
	| 'OLDER';

export interface DatePeriodObj {
	datePeriod: DatePeriodEnum;
	date: Date;
	item: any;
}

interface TimeAgoParams {
	locales: string;
	justNowThresh: number;
	nowThresh: number;
	disableFuture: boolean;
	isToday: boolean;
	skipTodayCheck: boolean;
}

interface FullTimeParams {
	timeZone: string | null;
	locales: string;
	hideYear: boolean;
	hideDate: boolean;
	hideTime: boolean;
	textDateStyle: 'long' | 'short' | null;
	alwaysShowYear: boolean;
	includeWeekday: boolean;
}

/**
 * Get start of day
 */

function getStartOfDay(date: Date) {
	return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/**
 * Get difference in days
 */

function getDaysDiff(date1: Date, date2: Date) {
	return Math.floor((getStartOfDay(date1).getTime() - getStartOfDay(date2).getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * Get date period from date
 */

export function getDatePeriod(d1: Date, d2: Date): DatePeriodEnum {
	const diffDays = getDaysDiff(d1, d2);

	switch (diffDays) {
		case 0:
			return 'TODAY';
		case 1:
			return 'TOMORROW';
		case -1:
			return 'YESTERDAY';
		case -7:
			return 'LAST_WEEK';
		case -30:
			return 'LAST_MONTH';
		default:
			if (diffDays > 1) {
				return 'UPCOMING';
			}
	}

	const diffInWeeks = Math.ceil(diffDays / 7);
	if (diffInWeeks === 0) {
		return 'THIS_WEEK';
	} else if (diffInWeeks === -1) {
		return 'LAST_WEEK';
	}

	const diffInMonths = (d2.getFullYear() - d1.getFullYear()) * 12 + (d2.getMonth() - d1.getMonth());
	if (diffInMonths === 0) {
		return 'THIS_MONTH';
	} else if (diffInMonths === -1) {
		return 'LAST_MONTH';
	}

	return 'OLDER';
}

/**
 * Get full date with time
 */

export function getFullDateTime(
	_d: Date | string | number | null,
	params?: Partial<FullTimeParams>,
) {
	const {
		locales = 'en-US',
		timeZone: timeZone_,
		hideYear,
		hideDate,
		hideTime,
		textDateStyle,
		alwaysShowYear,
		includeWeekday,
	} = params || {};

	let d;
	if (_d instanceof Date) {
		d = _d;
	} else {
		// Make sure _d is not null, before using this function
		d = _d ? new Date(_d) : new Date(-1);
	}

	let timeZone = timeZone_ || undefined; // cannot be null, else it will throw error
	if (timeZone && !isValidTimeZone(timeZone)) {
		timeZone = undefined;
	}

	if (hideDate) {
		return d.toLocaleTimeString(locales, {
			timeZone,
			hour: 'numeric',
			minute: '2-digit',
		});
	}

	// If year is same year, then don't show year
	let hideYear_;
	if (!hideYear && !alwaysShowYear) {
		const dateYear = d.getFullYear();
		const currentYear = new Date().getFullYear();
		hideYear_ = dateYear === currentYear;
	} else if (hideYear || hideDate) {
		hideYear_ = true;
	}

	return d.toLocaleDateString(locales, {
		timeZone,
		day: 'numeric',
		weekday: includeWeekday && textDateStyle === 'long' ? 'long' : includeWeekday ? 'short' : undefined,
		month: textDateStyle || 'numeric',
		year: hideYear_ ? undefined : 'numeric',
		hour: hideTime ? undefined : 'numeric',
		minute: hideTime ? undefined : '2-digit',
	});
}

/**
 * Check if date is same day
 */

export function checkIfSameDay(d1: Date, d2: Date, checkTime: boolean = false) {
	let date1, date2;
	if (checkTime) {
		date1 = new Date(d1.getFullYear(), d1.getMonth(), d1.getDate(), d1.getHours(), d1.getMinutes());
		date2 = new Date(d2.getFullYear(), d2.getMonth(), d2.getDate(), d2.getHours(), d2.getMinutes());
	} else {
		date1 = new Date(d1.getFullYear(), d1.getMonth(), d1.getDate());
		date2 = new Date(d2.getFullYear(), d2.getMonth(), d2.getDate());
	}

	return date1.getTime() === date2.getTime();
}

/**
 * Get today at start of day
 */

export function getTodayStartOfDay(timeZone?: string | null) {
	const startDate = getFullDateTime(new Date(), {
		locales: 'en-US',
		alwaysShowYear: true,
		hideTime: true,
	});

	const today = parseDateInTimezone(startDate, timeZone);
	return today;
}

/**
 * Get timezone enforced date
 * @param d - Date to convert
 * @param timeZone - Timezone to enforce
 * @returns Date - Enforced date in the specified timezone
 */

export function getCalDate(d: Date, timeZone_?: string | null) {
	const timeZone = timeZone_ || undefined;

	let dt = DateTime.fromJSDate(d, { zone: timeZone });

	// If timezone is invalid, fallback to system/local
	if (!dt.isValid) {
		dt = DateTime.fromJSDate(d); // system default zone
	}

	const calDate = dt.toFormat('yyyy-MM-dd');
	const calDateInt = Number(dt.toFormat('yyyyMMdd'));
	const time = dt.toFormat('HH:mm:ss');

	return {
		calDate,
		calDateInt,
		time,
	};
}

/**
 * Update JS date with year/month/day and hour/minutes
 */

export function updateDate(
	d_: Date | string,
	update: Partial<{
    year: number;
    month: number;
    day: number;
    hour: number;
    minute: number;
  }>,
  timeZone?: string | null
): Date | null {

  if (timeZone) {
    // Use luxon to handle timezone-aware date manipulation
    let dt = DateTime.fromJSDate(d_ instanceof Date ? d_ : new Date(d_), { zone: timeZone });

    if (update.year !== undefined) {
      dt = dt.set({ year: update.year });
    }
    if (update.month !== undefined) {
      dt = dt.set({ month: update.month });
    }
    if (update.day !== undefined) {
      dt = dt.set({ day: update.day });
    }
    if (update.hour !== undefined) {
      dt = dt.set({ hour: update.hour });
    }
    if (update.minute !== undefined) {
      dt = dt.set({ minute: update.minute });
    }

    return dt.isValid ? dt.toJSDate() : null;
  }

  const d = d_ instanceof Date ? d_ : new Date(d_);

  if (update.year) {
    d.setFullYear(update.year);
  }

  if (update.month !== undefined) {
    d.setMonth(update.month - 1); // JS months are 0-indexed
  }

  if (update.day) {
    d.setDate(update.day);
  }

  if (update.hour !== undefined) {
    d.setHours(update.hour);
  }

  if (update.minute !== undefined) {
    d.setMinutes(update.minute);
  }

  return d;
}

/**
 * Convert Int cal date to String YYYY-MM-DD format
 */

export function convertIntToCalDate(calDateInt: number | string, delimiter: string = '-'): string {
	const value = String(calDateInt);
	if (value.length === 8) {
		return `${value.slice(0, 4)}${delimiter}${value.slice(4, 6)}${delimiter}${value.slice(6, 8)}`;
	}
	// If not 8 digits, return as is
	return value;
}

/**
 * Check if cal date is valid
 * @param calDate - Cal date in YYYYMMDD format
 * @param minCalDate - Optional minimum cal date to check against (default is 19500101)
 * @returns boolean - true if valid, false otherwise
 */

export function isValidCalDate(
	calDate: string | number,
	minCalDate: number = 19500101,
): boolean {
	const value = Number(calDate);
	if (!calDate || !Number.isInteger(value) || value < 10000000 || value > 90000000) {
		return false;
	}
	return !minCalDate || value >= minCalDate;
}

/**
 * Check cal date is not a future date
 * @param calDateVal - Cal date in YYYYMMDD format
 * @param addDays - Optional number of days to add to the current date for comparison (default is 0)
 * @param timeZone - Optional timezone to check against
 * @returns boolean - true if date is in the future, false otherwise
 */

export function isFutureCalDate(
	calDateVal: number | string,
	addDays: number = 0,
	timeZone?: string | null,
): boolean {
	if (!isValidCalDate(calDateVal)) {
		return false;
	}
	const today = getCalDate(new Date(), timeZone);
	return (today.calDateInt + addDays) < Number(calDateVal);
}

/**
 * Convert date time "time" ago
 */

export function getTimeAgo(
	_d: Date | string | number | null,
	params?: Partial<TimeAgoParams>,
) {
	const {
		locales = 'en-US',
		justNowThresh = 300000, // 5 minutes
		nowThresh = 8.64e+7,
		disableFuture = false,
		isToday,
		skipTodayCheck,
	} = params || {};

	let d;
	if (_d instanceof Date) {
		d = _d;
	} else if (!isNaN(Number(_d))) {
		d = new Date(Number(_d));
	} else {
		// Make sure date is not null, before using this function
		d = _d ? new Date(_d) : new Date(-1);
	}

	const ts = d.getTime();
	const now = Date.now();
	const diff = now - ts;
	const isFuture = diff < 0;

	if (isFuture && !disableFuture) {
		// Future date

		const minutesFromNow = Math.round(diff / 60000 * -1);
		if (minutesFromNow < 60) {
			return i18n.t('datetime.in_minutes_ct', { smart_count: minutesFromNow });
		}

		const fromIsToday = isToday || (!skipTodayCheck && getDatePeriod(d, new Date()) === 'TODAY');
		if (fromIsToday) {
			const hoursFromNow = Math.round(diff / 3600000 * -1);
			if (hoursFromNow <= 8) {
				return i18n.t('datetime.in_hours_ct', { smart_count: hoursFromNow });
			}

			return getFullDateTime(d, {
				locales,
				hideDate: true,
			});
		}
	}

	if (!isFuture && diff < nowThresh) {
		if (diff < justNowThresh) {
			return i18n.t('datetime.just_now');
		}

		const minutesAgo = Math.round(diff / 60000);
		if (minutesAgo < 60) {
			return i18n.t('datetime.minutes_ago_ct', { smart_count: minutesAgo });
		}

		const agoIsToday = isToday || (!skipTodayCheck && getDatePeriod(d, new Date()) === 'TODAY');
		if (agoIsToday) {
			const hoursAgo = Math.round(diff / 3600000);
			if (hoursAgo <= 8) {
				return i18n.t('datetime.hours_ago_ct', { smart_count: hoursAgo });
			}

			return getFullDateTime(d, {
				locales,
				hideDate: true,
			});
		}
	}

	return getFullDateTime(d, {
		locales,
	});
}

/**
 * Convert date to full date (readable string)
 * type locales = 'en-US' | 'en-GB' | 'en-AU' | 'en-CA' | 'en-IN' | 'en-NZ' | 'en-ZA';
 */

export function getFullDate(
	_d: Date | string | number | null,
	outputStyle: 'DATE_ONLY' | 'DATE_TEXT' | 'MINIMAL' | 'DETAILED' = 'DATE_ONLY',
	locales: string = 'en-US',
) {
	let d;
	if (_d instanceof Date) {
		d = _d;
	} else {
		// Make sure _d is not null, before using this function
		d = _d ? new Date(_d) : new Date(-1);
	}

	switch (outputStyle) {
		case 'DATE_ONLY':
			// Expected output: "9/1/2024"
			return new Intl.DateTimeFormat(locales).format(d);
		case 'MINIMAL':
			// Expected output: "Sep 1, 2024, 6:54 PM"
			return new Intl.DateTimeFormat(locales, {
				dateStyle: 'medium', // 'full', 'long', 'medium', 'short'
				timeStyle: 'short', // 'full', 'long', 'medium', 'short'
				// timeZone: 'Australia/Sydney',
			}).format(d);
		case 'DATE_TEXT':
			// Expected output: "September 1, 2024"
			return new Intl.DateTimeFormat(locales, {
				dateStyle: 'long',
				// timeZone: 'Australia/Sydney',
			}).format(d);
		case 'DETAILED':
		default:
	}

	// Expected output: "Sep 1, 2024 at 6:54 PM"
	const date = new Intl.DateTimeFormat(locales, {
		dateStyle: 'long', // 'full', 'long', 'medium', 'short'
		timeStyle: 'short', // 'full', 'long', 'medium', 'short'
		// timeZone: 'Australia/Sydney',
	}).format(d);

	const parts = new Intl.DateTimeFormat(locales, {
		dateStyle: 'long',
		timeStyle: 'long',
	}).formatToParts(d);

	const timezoneName = parts.find((part) => part.type === 'timeZoneName')?.value;
	if (timezoneName) {
		// Doing this will make sure {date} does not include [seconds] in the time format
		return date + ' ' + timezoneName;
	}

	return date;
}

/**
 * Get morning, afternoon, evening, or night
 */

export function getDayPeriod(): 'MORNING' | 'AFTERNOON' | 'EVENING' | 'NIGHT' {
	const d = new Date();
	const h = d.getHours();
	if (h >= 5 && h < 12) {
		return 'MORNING';
	} else if (h >= 12 && h < 17) {
		return 'AFTERNOON';
	} else if (h >= 17 && h < 20) {
		return 'EVENING';
	}
	return 'NIGHT';
}

/**
 * Convert YYYY-MM-DD to Date
 */

export function getDateFromCalDate(calDate: string) {
	const [year, month, day] = calDate.split('-');
	return new Date(Number(year), Number(month) - 1, Number(day));
}

/**
 * Group by time period
 *
 * @param items - Array of items to group
 * @param dateKey - Key in each item that contains the date
 * @param mapFn - Optional function to map each item before grouping
 *
 * @returns Array of grouped items, each group contains items for a specific date period
 */

export function groupByDatePeriod<T>(
	items: T[],
	dateKey: string,
	groupByDate?: boolean,
	timeZone?: string | null,
	mapFn?: (item: any) => any,
): DatePeriodObj[][] {
	const ordered = items.sort((a: any, b: any) => {
		const valueA = a[dateKey];
		const valueB = b[dateKey];

		if (valueA < valueB) {
			return 1;
		}
		if (valueA > valueB) {
			return -1;
		}
		return 0;
	});

	const output = [];
	const d = new Date();
	// const timeZone = timeZone_; // || Intl.DateTimeFormat().resolvedOptions().timeZone;

	let group: any[] | null = [];
	for (const item of ordered) {
		// Each group is grouped in date periods,
		// e.g. "Tomorrow", "Today", "Yesterday", "Last Week", "Last Month", "Older"
		// Group the ordered list by date period and push item to output

		const lastItem = group[group.length - 1];
		const lastDatePeriod: any = lastItem?.datePeriod;
		const date = new Date(item[dateKey]);
		const datePeriod = groupByDate ? getCalDate(date, timeZone).calDate : getDatePeriod(date, d);

		const dateObj = {
			datePeriod,
			date,
			item: mapFn ? mapFn(item) : item,
		};

		if (lastDatePeriod && lastDatePeriod !== datePeriod && group.length) {
			output.push(group);
			group = [];
		}

		group.push(dateObj);
	}

	if (group.length) {
		output.push(group);
	}

	return output;
}

/**
 * Sort and label by date period
 *
 * @param items - Array of items to sort and label
 * @param dateKey - Key in each item that contains the date
 * @param mapFn - Optional function to map each item before grouping
 *
 * @returns Array of items sorted by date period, with labels for each period
 */

export function labelSortByDatePeriod<T>(
	items: T[],
	dateKey: string,
	groupByDate?: boolean,
	timeZone?: string | null,
	mapFn?: (item: any) => any,
): DatePeriodObj[] {
	const ordered = items.sort((a: any, b: any) => {
		const valueA = a[dateKey];
		const valueB = b[dateKey];

		if (valueA < valueB) {
			return 1;
		}
		if (valueA > valueB) {
			return -1;
		}
		return 0;
	});

	const output = [];
	const d = new Date();

	for (const item of ordered) {
		const lastItem = output[output.length - 1];
		const lastDatePeriod: any = lastItem?.datePeriod;
		const date = new Date(item[dateKey]);
		const datePeriod = groupByDate ? getCalDate(date, timeZone).calDate : getDatePeriod(date, d);

		const dateObj = {
			datePeriod,
			date,
			item: mapFn ? mapFn(item) : item,
		};

		if (
			(!output.length) ||
			(lastDatePeriod && lastDatePeriod !== datePeriod)
		) {
			output.push({
				datePeriod,
				date,
				item: null,
			});
		}

		output.push(dateObj);
	}

	return output as DatePeriodObj[];
}

/**
 * Check if date is valid
 */

export function isValidDate(d?: Date | string | number | null) {
	if (d instanceof Date) {
		return !isNaN(d.getTime());
	}
	if (typeof d === 'string' || typeof d === 'number') {
		const date = new Date(d);
		return !isNaN(date.getTime());
	}
	return false;
}

/**
 * Get HHMM in increments
 */

export function getHHMMIncrements(
	d: Date,
	minutesIncrement: number,
	utc: boolean = false,
) {
	let hh, minutes;
	if (utc) {
		hh = d.getUTCHours().toString().padStart(2, '0');
		minutes = d.getUTCMinutes();
	} else {
		hh = d.getHours().toString().padStart(2, '0');
		minutes = d.getMinutes();
	}

	const interval = Math.floor(minutes / minutesIncrement) * minutesIncrement;
	const hhmm = `${hh}${interval.toString().padStart(2, '0')}`;

	return hhmm;
}
