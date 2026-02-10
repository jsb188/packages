import { sortObjectByKeys, stringifyJSON } from './object.ts';
import { CronExpressionParser } from 'cron-parser';

/**
 * Types
 */

type DatabaseAction = 'INSERT' | 'UPDATE' | 'NONE';

type DatabaseActionResult = {
	action: DatabaseAction;
	documentData: any;
};

/**
 * Check if database document needs an update, insert, or do nothing based on the user API arguments
 * NOTE: There is a copy paste of this function in @jsb188/react/utils/hooks.ts
 */

export function getDatabaseAction(
	currentData: any,
	data: any,
	allowNull?: boolean,
	mergeCurrentData?: boolean,
): DatabaseActionResult {
	if (!currentData) {
		return {
			action: 'INSERT',
			documentData: data,
		};
	}

	const documentData: Record<string, any> = {};

	let hasChanges = false;
	for (const key in data) {
		if (Object.prototype.hasOwnProperty.call(data, key) && data[key] !== undefined) {
			// trim() on all string databse fields should be OK;
			// But if not, add an extra param.
			let value = typeof data[key] === 'string' ? data[key].trim() : data[key];
			if (value instanceof Date) {
				value = value.toISOString();
			} else if (value && typeof value === 'object') {
				value = stringifyJSON(sortObjectByKeys(value));
			}

			const isNullValue = value !== null || allowNull;
			if (isNullValue) {
				documentData[key] = value;
			}

			let currentValue = currentData[key];
			if (currentValue instanceof Date) {
				currentValue = currentValue.toISOString();
			} else if (currentValue && typeof currentValue === 'object') {
				currentValue = stringifyJSON(sortObjectByKeys(currentValue));
			}

			if (
				// Doing loose != check instead of !== type check
				currentValue != value &&
				isNullValue
			) {
				hasChanges = true;
			}
		}
	}

	if (mergeCurrentData) {
		for (const key in currentData) {
			if (Object.prototype.hasOwnProperty.call(currentData, key) && documentData[key] === undefined) {
				documentData[key] = currentData[key];
			}
		}
	}

	const action = hasChanges ? 'UPDATE' : 'NONE';

	return {
		action,
		documentData,
	};
}

/**
 * Check if enough time has passed and whether an action should take place (such as websocket events)
 */

export function checkLastSetTime(time?: number, minsThreshold: number = 5) {
	if (!time) {
		return true;
	}

	const now = Date.now();
	const diff = now - time;
	return diff > (minsThreshold * 60 * 1000);
}

/**
 * Promised delay, using setTimeout
 */

export function delay(ms: number) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Promise with timeout
 */

export function timeoutPromise<T>(
	mainPromise: () => any,
	onTimeout: () => any,
	timeoutMs: number,
): Promise<T> {
	return new Promise<T>((resolve, reject) => {
		const timeout = setTimeout(() => {
			resolve(onTimeout());
		}, timeoutMs);

		const p = mainPromise();
		if (typeof p?.then === 'function') {
			p.then((result: any) => {
				clearTimeout(timeout);
				resolve(result);
			})
				.catch((err: any) => {
					clearTimeout(timeout);
					reject(err);
				});
		}
	});
}

/**
 * Make String based key from variables Object
 * @param variables - any variables or arguments object
 * @param doNotLowerCaseCacheKey - If true, the returned key will maintain original casing
 * @return string key
 */

export function makeVariablesKey(
	variables: Record<string, any> | null | undefined,
	doNotLowerCaseCacheKey?: boolean,
  // gqlDefinitions?: any[],
): string {
	if (variables) {

    // const gqlOperation = gqlDefinitions?.find((def: any) => def.kind === 'OperationDefinition');
		const key = Object.keys(variables).sort().reduce((acc, key) => {
      // I *could* loop and make sure the variables match those defined in the GQL operation,
      // But instead of wasting compute, I rather make sure the variables are passed in identical manner from the app.
      // if (gqlOperation) {
      //   console.log(key);
      //   ..
      // }
			const value = variables[key];
			if (value || value === 0 || value === false) {
				return `${acc}$${key}:${typeof value === 'object' ? stringifyJSON(value) : value}`;
			}
			return acc;
		}, '');

		if (!doNotLowerCaseCacheKey) {
			return key.toLowerCase();
		}
		return key;
	}
	return 'none';
}

/**
 * Convert cron expression into a readable sentence
 */

export function getCronDescription(schedule: string, verbose = false): string {
	try {
		const parsed = CronExpressionParser.parse(schedule);
		const { second, minute, hour, dayOfMonth, month, dayOfWeek } = parsed.fields;
		const secondRawValues = second.values as Array<number | string>;
		const minuteRawValues = minute.values as Array<number | string>;
		const hourRawValues = hour.values as Array<number | string>;
		const dayOfMonthRawValues = dayOfMonth.values as Array<number | string>;
		const monthRawValues = month.values as Array<number | string>;
		const dayOfWeekRawValues = dayOfWeek.values as Array<number | string>;

		if (
			!allNumbers(secondRawValues) ||
			!allNumbers(minuteRawValues) ||
			!allNumbers(hourRawValues) ||
			!allNumbers(dayOfMonthRawValues) ||
			!allNumbers(monthRawValues) ||
			!allNumbers(dayOfWeekRawValues)
		) {
			return `Cron ${parsed.toString()}`;
		}

		const secondValues = normalizeValues(secondRawValues);
		const minuteValues = normalizeValues(minuteRawValues);
		const hourValues = normalizeValues(hourRawValues);
		const dayOfMonthValues = normalizeValues(dayOfMonthRawValues);
		const monthValues = normalizeValues(monthRawValues);
		const dayOfWeekValues = normalizeDayOfWeekValues(dayOfWeekRawValues);

		const hasSimpleTimeNoSeconds = (
			secondValues.length === 1 &&
			secondValues[0] === 0 &&
			minuteValues.length === 1 &&
			hourValues.length === 1
		);

			if (hasSimpleTimeNoSeconds) {
				const timeText = formatCronTime(hourValues[0], minuteValues[0]);
				const timeJoinText = verbose ? ' at ' : ', ';
				const isEveryMonth = isRangeFull(monthValues, 1, 12);
				const isEveryDayOfMonth = isRangeFull(dayOfMonthValues, 1, 31);
				const isEveryDayOfWeek = isRangeFull(dayOfWeekValues, 0, 6);

				if (isEveryMonth && isEveryDayOfMonth && isEveryDayOfWeek) {
					return `Every day${timeJoinText}${timeText}`;
				}

				if (isEveryMonth && isEveryDayOfMonth && isExactValues(dayOfWeekValues, [1, 2, 3, 4, 5])) {
					return `Mon-Fri${timeJoinText}${timeText}`;
				}

				if (isEveryMonth && isEveryDayOfMonth && isExactValues(dayOfWeekValues, [1, 3, 5])) {
					return `Every other Mon-Fri${timeJoinText}${timeText}`;
				}

				if (isEveryMonth && isEveryDayOfWeek && dayOfMonthValues.length === 1) {
					return dayOfMonthValues[0] === 1
						? `Every month${timeJoinText}${timeText}`
						: `Every month on day ${dayOfMonthValues[0]}${timeJoinText}${timeText}`;
				}

				return `${describeCalendar(dayOfMonthValues, monthValues, dayOfWeekValues)}${timeJoinText}${timeText}`;
			}

		return [
			describeTime(secondValues, minuteValues, hourValues),
			describeDayOfMonth(dayOfMonthValues),
			describeMonth(monthValues),
			describeDayOfWeek(dayOfWeekValues),
		].join('; ');
	} catch {
		return schedule;
	}
}

function formatCronTime(hour24: number, minute: number): string {
	const amPm = hour24 >= 12 ? 'PM' : 'AM';
	const hour12 = hour24 % 12 || 12;
	const minuteText = String(minute).padStart(2, '0');
	return `${hour12}:${minuteText} ${amPm}`;
}

function formatCronTimeWithSeconds(hour24: number, minute: number, second: number): string {
	const amPm = hour24 >= 12 ? 'PM' : 'AM';
	const hour12 = hour24 % 12 || 12;
	const minuteText = String(minute).padStart(2, '0');
	const secondText = String(second).padStart(2, '0');
	return `${hour12}:${minuteText}:${secondText} ${amPm}`;
}

function isExactValues(values: number[], expected: number[]): boolean {
	if (values.length !== expected.length) {
		return false;
	}

	return expected.every((v, i) => values[i] === v);
}

function isRangeFull(values: number[], min: number, max: number): boolean {
	const total = max - min + 1;
	if (values.length !== total) {
		return false;
	}

	const seen = new Set(values);
	for (let i = min; i <= max; i += 1) {
		if (!seen.has(i)) {
			return false;
		}
	}

	return true;
}

function normalizeValues(values: number[]): number[] {
	return [...new Set(values)].sort((a, b) => a - b);
}

function allNumbers(values: Array<number | string>): values is number[] {
	return values.every((v) => typeof v === 'number');
}

function normalizeDayOfWeekValues(values: number[]): number[] {
	return normalizeValues(values.map((v) => (v === 7 ? 0 : v)));
}

function describeCalendar(dayOfMonthValues: number[], monthValues: number[], dayOfWeekValues: number[]): string {
	const dom = describeDayOfMonth(dayOfMonthValues);
	const mon = describeMonth(monthValues);
	const dow = describeDayOfWeek(dayOfWeekValues);
	return `${dom}, ${mon}, ${dow}`;
}

function describeTime(secondValues: number[], minuteValues: number[], hourValues: number[]): string {
	const singleHour = hourValues.length === 1;
	const singleMinute = minuteValues.length === 1;
	const singleSecond = secondValues.length === 1;

	if (singleHour && singleMinute && singleSecond) {
		if (secondValues[0] === 0) {
			return `At ${formatCronTime(hourValues[0], minuteValues[0])}`;
		}
		return `At ${formatCronTimeWithSeconds(hourValues[0], minuteValues[0], secondValues[0])}`;
	}

	return [
		`Hours ${describeNumericValues(hourValues, 0, 23)}`,
		`Minutes ${describeNumericValues(minuteValues, 0, 59)}`,
		`Seconds ${describeNumericValues(secondValues, 0, 59)}`,
	].join(', ');
}

function describeDayOfMonth(values: number[]): string {
	const normalized = normalizeValues(values);
	if (isRangeFull(normalized, 1, 31)) {
		return 'Every day';
	}
	if (normalized.length === 1) {
		return `Day ${normalized[0]}`;
	}
	return `Days ${formatRanges(normalized)}`;
}

function describeMonth(values: number[]): string {
	const normalized = normalizeValues(values);
	if (isRangeFull(normalized, 1, 12)) {
		return 'Every month';
	}
	if (normalized.length === 1) {
		return `In ${MONTH_LABELS[normalized[0]]}`;
	}
	return `In ${formatRanges(normalized, (v) => MONTH_LABELS[v])}`;
}

function describeDayOfWeek(values: number[]): string {
	const normalized = normalizeDayOfWeekValues(values);
	if (isRangeFull(normalized, 0, 6)) {
		return 'Every day of week';
	}
	if (isExactValues(normalized, [1, 2, 3, 4, 5])) {
		return 'Mon-Fri';
	}
	if (isExactValues(normalized, [1, 3, 5])) {
		return 'Every other Mon-Fri';
	}
	if (normalized.length === 1) {
		return DAY_LABELS[normalized[0]];
	}
	return formatRanges(normalized, (v) => DAY_LABELS[v]);
}

function describeNumericValues(values: number[], min: number, max: number): string {
	const normalized = normalizeValues(values);
	if (isRangeFull(normalized, min, max)) {
		return 'every value';
	}

	const step = detectStep(normalized);
	if (step && step.start === min && step.end >= max - (step.value - 1)) {
		return `every ${step.value}`;
	}

	return formatRanges(normalized);
}

function detectStep(values: number[]): { value: number; start: number; end: number } | null {
	if (values.length < 3) {
		return null;
	}
	const diff = values[1] - values[0];
	if (diff <= 1) {
		return null;
	}
	for (let i = 2; i < values.length; i += 1) {
		if ((values[i] - values[i - 1]) !== diff) {
			return null;
		}
	}
	return { value: diff, start: values[0], end: values[values.length - 1] };
}

function formatRanges(values: number[], labeler?: (v: number) => string): string {
	if (values.length === 0) {
		return '';
	}

	const segments: Array<{ start: number; end: number }> = [];
	let start = values[0];
	let prev = values[0];

	for (let i = 1; i < values.length; i += 1) {
		const curr = values[i];
		if (curr === prev + 1) {
			prev = curr;
			continue;
		}
		segments.push({ start, end: prev });
		start = curr;
		prev = curr;
	}
	segments.push({ start, end: prev });

	return segments.map(({ start: s, end: e }) => {
		const a = labeler ? labeler(s) : String(s);
		const b = labeler ? labeler(e) : String(e);
		return s === e ? a : `${a}-${b}`;
	}).join(', ');
}

const DAY_LABELS: Record<number, string> = {
	0: 'Sun',
	1: 'Mon',
	2: 'Tue',
	3: 'Wed',
	4: 'Thu',
	5: 'Fri',
	6: 'Sat',
};

const MONTH_LABELS: Record<number, string> = {
	1: 'Jan',
	2: 'Feb',
	3: 'Mar',
	4: 'Apr',
	5: 'May',
	6: 'Jun',
	7: 'Jul',
	8: 'Aug',
	9: 'Sep',
	10: 'Oct',
	11: 'Nov',
	12: 'Dec',
};
