import { DateTime } from 'luxon';
import i18n from '../i18n/index.ts';
import { getObject } from './object.ts';
import { isValidTimeZone, parseDateInTimezone } from './timeZone.ts';

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
 * Get difference in weeks
 */

function getWeeksDiff(date1: Date, date2: Date) {
	return Math.floor(getDaysDiff(date1, date2) / 7);
}

/**
 * Get difference in months
 */

function getMonthsDiff(date1: Date, date2: Date) {
	return (date1.getFullYear() - date2.getFullYear()) * 12 + (date1.getMonth() - date2.getMonth());
}

/**
 * Get UTC week number in year (1-based)
 */

export function getUtcWeekOfYear(date: Date) {
	const startOfYear = Date.UTC(date.getUTCFullYear(), 0, 1);
	const currentDay = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
	const dayOfYear = Math.floor((currentDay - startOfYear) / 86400000) + 1;
	return Math.floor((dayOfYear - 1) / 7) + 1;
}

/**
 * Get date period from date
 */

export function getWeeksMonthAgo(d1: Date, d2: Date, weeksThresh = 12): string {
	const diffWeeks = getWeeksDiff(d2, d1);
	if (diffWeeks === 0) {
		return i18n.t('datetime.period_THIS_WEEK');
	} else if (diffWeeks <= weeksThresh) {
		return i18n.t('datetime.weeks_ago_ct', { smart_count: diffWeeks });
	}

	const diffMonths = getMonthsDiff(d2, d1);
	return i18n.t('datetime.months_ago_ct', { smart_count: diffMonths });
}

/**
 * Get date period from date
 * @param d1 - Date to check
 * @param d2 - Reference date (usually current date)
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
	d_: Date | string | number | null,
	params?: Partial<{
		timeZone: string | null;
		locales: string;
		hideYear: boolean;
		hideDate: boolean;
		hideTime: boolean;
		textDateStyle: 'long' | 'short' | 'numeric' | null;
		militaryTime: boolean;
		alwaysShowYear: boolean;
		includeWeekday: boolean | 'long' | 'short' | 'narrow';
	}>,
) {
	const {
		locales = 'en-US',
		timeZone: timeZone_,
		hideYear,
		hideDate,
		hideTime,
		textDateStyle,
		militaryTime,
		alwaysShowYear,
		includeWeekday,
	} = params || {};

	let d;
	if (d_ instanceof Date) {
		d = d_;
	} else {
		// Make sure d_ is not null, before using this function
		d = d_ ? new Date(d_) : new Date(-1);
	}

	let timeZone = timeZone_ || undefined; // cannot be null, else it will throw error
	if (timeZone && !isValidTimeZone(timeZone)) {
		timeZone = undefined;
	}

	if (hideDate) {
		return d.toLocaleTimeString(locales, {
			timeZone,
			hour: hideTime ? undefined : militaryTime ? '2-digit' : 'numeric',
			minute: hideTime ? undefined : '2-digit',
			hour12: !militaryTime,
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

	let weekday;
	if (['long', 'short', 'narrow'].includes(includeWeekday as string)) {
		weekday = includeWeekday;
	} else if (includeWeekday) {
		weekday = textDateStyle === 'long' ? 'long' : 'short';
	}

	return d.toLocaleDateString(locales, {
		timeZone,
		day: 'numeric',
		weekday: weekday as 'long' | 'short' | 'narrow',
		month: textDateStyle || 'numeric',
		year: hideYear_ ? undefined : 'numeric',
		hour: hideTime ? undefined : militaryTime ? '2-digit' : 'numeric',
		minute: hideTime ? undefined : '2-digit',
		hour12: !militaryTime,
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
 * Get timezone enforced calendar date
 * @param d - Date to convert
 * @param timeZone - Timezone to enforce
 * @returns Date - Enforced calendar date in the specified timezone
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
 * Get timezone enforced calendar date; but month-day first
 * @param d - Date to convert
 * @param timeZone - Timezone to enforce
 * @returns Date - Enforced calendar date in the specified timezone
 */

export function getReadableCalDate(d_: string | Date, timeZone?: string | null, locales?: string) {
	let isCalDateString = false;
	let d;
	if (typeof d_ === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d_)) {
		isCalDateString = true;
		// Assume YYYY-MM-DD format
		const [year, month, day] = d_.split('-').map(Number);
		d = new Date(year, month - 1, day);
	} else if (d_ instanceof Date) {
		d = d_;
	} else {
		d = d_ && new Date(d_);
	}

	if (!d || isNaN(d.getTime())) {
		return null;
	}

	// let dt = DateTime.fromJSDate(d, { zone: timeZone || undefined });
	// // If timezone is invalid, fallback to system/local
	// if (!dt.isValid) {
	// 	dt = DateTime.fromJSDate(d); // system default zone
	// }

	// if (!dt.isValid) {
	// 	return null;
	// }

	// return dt.toFormat('MM/dd/yyyy');

	return new Intl.DateTimeFormat(locales || 'en-US', {
		timeZone: isCalDateString ? undefined : timeZone || undefined, // null is not allowed, it will throw error
	}).format(d);
}

/**
 * Get report period DateTime value with timezone support.
 */

function getReportPeriodDateTime(period: string | Date, timeZone: string | null) {
	const zone = timeZone || undefined;

	if (typeof period === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(period)) {
		const dt = DateTime.fromISO(period, zone ? { zone } : undefined);
		return dt.isValid ? dt : null;
	}

	if (period instanceof Date) {
		let dt = DateTime.fromJSDate(period, zone ? { zone } : undefined);
		if (!dt.isValid) {
			dt = DateTime.fromJSDate(period);
		}
		return dt.isValid ? dt : null;
	}

	const dt = DateTime.fromISO(String(period), zone ? { zone } : undefined);
	return dt.isValid ? dt : null;
}

/**
 * Format report period range label.
 */

function formatReportPeriodRange(start: DateTime, end: DateTime, separator: string) {
	if (start.year !== end.year) {
		return `${start.toFormat('MMM d, yyyy')}${separator}${end.toFormat('MMM d, yyyy')}`;
	}

	if (start.month !== end.month) {
		return `${start.toFormat('MMM d')}${separator}${end.toFormat('MMM d, yyyy')}`;
	}

	return `${start.toFormat('MMM d')}${separator}${end.toFormat('d, yyyy')}`;
}

/**
 * Get formatted report period label from period start and frequency.
 */

export function getReportPeriod(
	period: string | Date,
	frequency: any,
	timeZone: string | null,
) {
	const start = getReportPeriodDateTime(period, timeZone);
	if (!start) {
		return null;
	}

	switch (frequency) {
		case 'DAILY':
			return start.toFormat('MMM d, yyyy');
		case 'WEEKLY':
			return formatReportPeriodRange(start, start.plus({ days: 6 }), '–');
		case 'MONTHLY':
			return formatReportPeriodRange(start, start.plus({ months: 1 }).minus({ days: 1 }), '-');
		case 'QUARTERLY':
			return formatReportPeriodRange(start, start.plus({ months: 3 }).minus({ days: 1 }), '-');
		case 'ANNUALLY':
			return formatReportPeriodRange(start, start.plus({ years: 1 }).minus({ days: 1 }), '-');
		default:
			return start.toFormat('MMM d, yyyy');
	}
}

/**
 * Date objects create different calendar dates based on timezone,
 * to avoid such issue, use this funciton to convert JS date to string format.
 */

export function getReadableCalDateFromUTC(d: string | Date) {
  if (typeof d === 'string') {
    return getReadableCalDate(d);
  }

  const dStr = d.toISOString().split('T')[0]; // Get date part in YYYY-MM-DD format
  return getReadableCalDate(dStr);
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
	timeZone?: string | null,
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

export function convertIntToCalDate(
	calDateInt: number | string,
	delimiter: string = '-',
	yearsFirst: boolean = true,
): string {
	const value = String(calDateInt);
	if (value.length === 8) {
		if (yearsFirst) {
			return `${value.slice(0, 4)}${delimiter}${value.slice(4, 6)}${delimiter}${value.slice(6, 8)}`;
		}
		return `${value.slice(4, 6)}${delimiter}${value.slice(6, 8)}${delimiter}${value.slice(0, 4)}`;
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
	calDate_: string | number | bigint,
	allowDashes: boolean = false,
	minCalDate: number = 19500101,
): boolean {
	let calDate;
	if (
		allowDashes &&
		typeof calDate_ === 'string' &&
		/^\d{4}-\d{2}-\d{2}$/.test(calDate_)
	) {
		calDate = calDate_.replace(/-/g, '');
	} else {
		calDate = calDate_;
	}

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
 * Get timezone-aware DateTime object from one date input.
 */

function getDateTimeWithTimeZone(
	date: string | Date,
	timeZone: string | null,
) {
	const zone = timeZone && isValidTimeZone(timeZone) ? timeZone : undefined;

	if (date instanceof Date) {
		const dt = DateTime.fromJSDate(date, zone ? { zone } : undefined);
		return dt.isValid ? dt : null;
	}

	let dt = DateTime.fromISO(date, zone ? { zone } : undefined);
	if (dt.isValid) {
		return dt;
	}

	dt = DateTime.fromJSDate(new Date(date), zone ? { zone } : undefined);
	return dt.isValid ? dt : null;
}

/**
 * Convert today/yesterday date time into a label with time
 * @param dt - Parsed Luxon date time
 * @param timeZone - Optional timezone for time formatting
 */

function getTodayYesterdayTime(
	dt: DateTime,
	timeZone: string | null,
) {
	const now = timeZone && isValidTimeZone(timeZone)
		? DateTime.now().setZone(timeZone)
		: DateTime.now();
	const timeText = getFullDateTime(dt.toJSDate(), {
		timeZone,
		hideDate: true,
	});

	if (dt.hasSame(now, 'day')) {
		return `${i18n.t('datetime.period_TODAY')}, ${timeText}`;
	}

	if (dt.hasSame(now.minus({ days: 1 }), 'day')) {
		return `${i18n.t('datetime.period_YESTERDAY')}, ${timeText}`;
	}

	return null;
}

/**
 * Convert date time "time" ago
 * @param date - Date to convert
 * @param timeZone - Optional timezone for day boundary checks
 */

export function getTimeAgo(
	date: string | Date,
	timeZone: string | null,
) {
	const dt = getDateTimeWithTimeZone(date, timeZone);
	if (!dt) {
		return null;
	}

	const now = timeZone && isValidTimeZone(timeZone)
		? DateTime.now().setZone(timeZone)
		: DateTime.now();
	const todayYesterdayTime = getTodayYesterdayTime(dt, timeZone);

	if (todayYesterdayTime) {
		return todayYesterdayTime;
	}

	const diffMs = now.toMillis() - dt.toMillis();

	if (diffMs < 0) {
		return getFullDateTime(dt.toJSDate(), {
			timeZone,
			alwaysShowYear: true,
			textDateStyle: 'short',
		});
	}

	return getFullDateTime(dt.toJSDate(), {
		timeZone,
		alwaysShowYear: true,
		textDateStyle: 'short',
	});
}

/**
 * Convert date to full date (readable string)
 * type locales = 'en-US' | 'en-GB' | 'en-AU' | 'en-CA' | 'en-IN' | 'en-NZ' | 'en-ZA';
 */

export function getFullDate(
	d_: Date | string | number | null,
	outputStyle_:
		| 'NUMERIC'
		| 'NUMERIC_TIME'
		| 'DATE_ONLY_SHORT'
		| 'DAY_IF_WEEK'
		| 'TOMORROW_OR_NUMERIC'
		| 'DATE_TEXT'
		| 'MINIMAL'
		| 'DETAILED' = 'NUMERIC',
	timeZone: string | null,
	locales: string = 'en-US',
) {
	let d;
	if (d_ instanceof Date) {
		d = d_;
	} else {
		// Make sure d_ is not null, before using this function
		d = d_ ? new Date(d_) : new Date(-1);
	}

	let outputStyle;
	if (['TOMORROW_OR_NUMERIC', 'DAY_IF_WEEK'].includes(outputStyle_)) {
		const datePeriod = getDatePeriod(d, new Date());
		if (['TODAY', 'TOMORROW'].includes(datePeriod)) {
			return i18n.t(`datetime.period_${datePeriod}`);
		}

		const daysRemaining = getDaysDiff(d, new Date());
		if (daysRemaining >= 0 && daysRemaining <= 6) {
			// return "Monday", "Tuesday", etc.
			const dayOfWeekText = d.toLocaleDateString(locales, {
				timeZone: timeZone || undefined, // null is not allowed, it will throw error
				...(outputStyle_ === 'TOMORROW_OR_NUMERIC' ? {} : {
					weekday: 'long',
				}),
			});
			return dayOfWeekText;
		}

		outputStyle = 'NUMERIC';
	} else {
		outputStyle = outputStyle_;
	}

	switch (outputStyle) {
    case 'NUMERIC':
			// Expected output: "9/1/2024"
			return new Intl.DateTimeFormat(locales, {
				timeZone: timeZone || undefined, // null is not allowed, it will throw error
			}).format(d);
		case 'NUMERIC_TIME': {			// Expected output: "9/1/2024, 8:30 PM"
      const numericDate = new Intl.DateTimeFormat(locales, {
				timeZone: timeZone || undefined, // null is not allowed, it will throw error
			}).format(d);

      const numericTime = new Intl.DateTimeFormat(locales, {
        timeZone: timeZone || undefined, // null is not allowed, it will throw error
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      }).format(d);

      return `${numericDate}, ${numericTime}`;

			// return new Intl.DateTimeFormat(locales, {
			// 	month: '2-digit',
			// 	day: '2-digit',
			// 	year: 'numeric',
			// 	hour: 'numeric',
			// 	minute: '2-digit',
			// 	hour12: true,
			// 	timeZone: timeZone || undefined, // null is not allowed, it will throw error
			// }).format(d);
    }
		case 'MINIMAL':
			// Expected output: "Sep 1, 2024, 6:54 PM"
			return new Intl.DateTimeFormat(locales, {
				dateStyle: 'medium', // 'full', 'long', 'medium', 'short'
				timeStyle: 'short', // 'full', 'long', 'medium', 'short'
				timeZone: timeZone || undefined, // null is not allowed, it will throw error
			}).format(d);
			// return DateTime.fromJSDate(d, timeZone ? { zone: timeZone } : undefined).toFormat('MMM d yyyy, h:mm a');
		case 'DATE_ONLY_SHORT': {
			// Expected output: "Sep 1" (or "Sep 1, 25" if not current year)
			const dateYear = d.getFullYear();
			const currentYear = new Date().getFullYear();

			// This will crash because "medium" style with "numeric" year is not allowed
			// return new Intl.DateTimeFormat(locales, {
			// 	dateStyle: 'medium',
			//   year: dateYear === currentYear ? undefined : 'numeric',
			// 	timeZone: timeZone || undefined, // null is not allowed, it will throw error
			// }).format(d);

			if (dateYear === currentYear) {
				return new Intl.DateTimeFormat(locales, {
					year: undefined,
					month: 'short',
					day: 'numeric',
					timeZone: timeZone || undefined, // null is not allowed, it will throw error
				}).format(d);
			}

			return new Intl.DateTimeFormat(locales, {
				// Use this if you want 4 digit years
				// dateStyle: 'medium',
				// Use this if you want 2 digit years
				year: '2-digit',
				month: 'short',
				day: 'numeric',
				timeZone: timeZone || undefined, // null is not allowed, it will throw error
			}).format(d).replace(', ', ", '");
		}
		case 'DATE_TEXT':
			// Expected output: "September 1, 2024"
			return new Intl.DateTimeFormat(locales, {
				dateStyle: 'long',
				timeZone: timeZone || undefined, // null is not allowed, it will throw error
			}).format(d);
		case 'DETAILED':
		default:
	}

	// Expected output: "Sep 1, 2024 at 6:54 PM"
	const date = new Intl.DateTimeFormat(locales, {
		dateStyle: 'long', // 'full', 'long', 'medium', 'short'
		timeStyle: 'short', // 'full', 'long', 'medium', 'short'
		timeZone: timeZone || undefined, // null is not allowed, it will throw error
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

export function getDateFromCalDate(value: string | number, timeZone?: string | null): Date {
	const calDate = typeof value === 'number' ? convertIntToCalDate(value) : value;
	const dt = DateTime.fromISO(calDate, timeZone ? { zone: timeZone } : undefined);
	const jsDate = dt.toJSDate();
	// const [year, month, day] = calDate.split('-');
	// console.log(new Date(Number(year), Number(month) - 1, Number(day)));
	return jsDate;
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
	dateKey: string, // "." delimited getter is allowed here
	groupByDate?: boolean,
	timeZone?: string | null,
	mapFn?: (item: any) => any,
): DatePeriodObj[][] {
	const ordered = items.sort((a: any, b: any) => {
		const valueA = getObject(a, dateKey);
		const valueB = getObject(b, dateKey);

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
		const date = new Date(getObject(item, dateKey));
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
	const ordered: any[] = items.sort((a: any, b: any) => {
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

/**
 * Get color indicator based on expiration date
 * @param expirationDate - Expiration date in YYYY-MM-DD format or Date object
 * @returns 'red' | 'yellow' | 'green' | null
 */

export function getExpirationColor(
	expirationDate: string | Date, // YYYY-MM-DD format or Date object
	validColor: 'green' | null = null,
): 'red' | 'yellow' | 'green' | null {
	let expDate: Date;
	if (expirationDate instanceof Date) {
		expDate = expirationDate;
	} else {
		expDate = new Date(expirationDate);
	}

	if (!isValidDate(expDate)) {
		return 'red'; // Invalid date
	}

	const now = new Date();
	const diff = expDate.getTime() - now.getTime();
	const diffDays = Math.ceil(diff / (1000 * 3600 * 24));

	if (diffDays < 0) {
		return 'red'; // Expired
	} else if (diffDays <= 30) {
		return 'yellow'; // Expiring soon
	}

	return validColor; // Valid
}

/**
 * Get HHMM time from "hh:mm" string
 */

export function timeToHHMM(timeStr: string): string {
	const [hh, mm] = timeStr.split(':');
	if (hh && mm) {
		return `${hh.padStart(2, '0')}${mm.padStart(2, '0')}`;
	}
	return timeStr.padStart(4, '0');
}

/**
 * Sort & group by date/month
 */

export function groupByDateMonth<T extends { date: Date }>(
  items: T[],
  timeZone: string
): {
  byDate: Record<string, T[]>;
  byMonth: Record<string, T[]>;
} {
  // 1. Sort by absolute time
  const sorted = [...items].sort(
    (a, b) => a.date.getTime() - b.date.getTime()
  );

  const byDate: Record<string, T[]> = {};
  const byMonth: Record<string, T[]> = {};

  for (const item of sorted) {
    const dt = DateTime
      .fromJSDate(item.date, { zone: timeZone });

    const dateKey = dt.toFormat('yyyy-MM-dd');
    const monthKey = dt.toFormat('yyyy-MM');

    // Group by day
    if (!byDate[dateKey]) {
      byDate[dateKey] = [];
    }
    byDate[dateKey].push(item);

    // Group by month
    if (!byMonth[monthKey]) {
      byMonth[monthKey] = [];
    }
    byMonth[monthKey].push(item);
  }

  return { byDate, byMonth };
}
