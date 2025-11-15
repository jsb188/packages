import type { AddressObj, ScheduleObj } from '@jsb188/app/types/other.d';
import type { ProductAttendanceObj, ProductCalendarEventGQL, ProductCalendarEventObj, ProductEventFrequencyEnum, ProductGQL } from '@jsb188/mday/types/product.d';
import { DateTime } from 'luxon';
import { DAY_OF_WEEK_DEPREC } from '../constants/other';
import i18n from '../i18n';
import { getFullDate } from './datetime';
import { convertToMilitaryTime } from './number';
import { DEFAULT_TIMEZONE } from './timeZone';

/**
 * Get the address in a single line text format
 * @param address - Address data object
 * @param multiline - Whether to format in multiple lines
 * @returns Address in a single line text format
 */

export function getAddressText(
	address: AddressObj | null,
	multiline = false,
): string {
	if (!address) {
		return i18n.t('form.not_specified');
	}

	const { line1, line2, city, state, postalCode, country } = address;
	if (multiline) {
		return [
			[line1, line2].filter(Boolean).join(', '),
			[city, state, postalCode, country].filter(Boolean).join(', '),
		].filter(Boolean).join('\n');
	}
	return [line1, line2, city, state, postalCode, country].filter(Boolean).join(', ');
}

/**
 * Check if organization event is upcoming
 * Upcoming is defined by: "recurring and not ended" or "date is in the future"
 * @param eventProduct - Calendar Event product GQL data
 * @returns boolean value to indicate if event is upcoming
 */

export function checkIfEventIsUpcoming(eventProduct: ProductGQL): boolean {
	const now = new Date();

  const eventDetails = eventProduct.details as ProductCalendarEventGQL;
	const endAt = eventDetails.endAt ? new Date(eventDetails.endAt) : null;
	const finished = endAt && (endAt < now);
	if (finished) {
		return false;
	}

  const once = eventDetails.frequency === 'ONCE' || !eventDetails.schedule;
	if (once) {
		const startAt = new Date(eventDetails.startAt);
		return startAt > now;
	}

	// If it's not "once" event, then it's recurring until end date, so it will default to true
	return true;
}

/**
 * Get icon for event based on time (finished, upcoming, today, etc)
 * @param startAt - Event start date/time in ISO format
 * @param endAt - Event end date/time in ISO format
 * @param schedule - Event schedule object
 * @param showRecurringSchedule - Whether recurring schedule should be shown
 * @returns Icon name as string
 */

export function getEventIconName(
	startAt_: string | Date,
	endAt_: string | Date | null,
	schedule: ScheduleObj | null,
	showRecurringSchedule?: boolean,
): string {
	const startAt = new Date(startAt_);
	const endAt = endAt_ ? new Date(endAt_) : null;
	const once = !schedule;

	let isUpcoming;
	if (typeof showRecurringSchedule === 'boolean') {
		isUpcoming = showRecurringSchedule;
	} else {
		isUpcoming = checkIfEventIsUpcoming({ details: { startAt, endAt, schedule } } as ProductGQL);
	}

	if (isUpcoming && !once) {
		return 'calendar-week-filled'; // Upcoming/unfinished recurring event
	}

	const now = new Date();
	if (startAt < now) {
		return 'calendar-check-filled';
	}

	const startDate = new Date(startAt.getFullYear(), startAt.getMonth(), startAt.getDate());
	const nowDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());

	if (startDate.getTime() === nowDate.getTime()) {
		return 'clock-hour-4'; // Today's event
	}

	return 'calendar-dot-filled'; // Upcoming event
}

/**
 * Get the icon labels for Organization event data
 * @param eventProduct - Calendar Event product GQL data
 * @returns Array of icon label objects with icon name and tooltip text
 */

export function getEventLabelIcons(eventDetails: ProductCalendarEventGQL) {
	const { schedule, address } = eventDetails;
	const addressText = address && getAddressText(address);
	const labelIcons = [];

	if (addressText) {
		labelIcons.push({
			iconName: 'map-pin-filled',
			color: 'darker_2', // should really be "lt" but because the icon is "filled", it looks more like texts written in "lt"
			tooltipText: addressText,
		});
	}

	// if (status === 'CANCELED') {
	//   labelIcons.push({
	//     text: 'Canceled',
	//     color: 'red_light',
	//     // tooltipText: i18n.t('organization.event_canceled'),
	//   });
	// }

	// if (recurring) {
	//   labelIcons.push({
	//     iconName: 'library-filled',
	//     color: 'darker_2', // should really be "lt" but because the icon is "filled", it looks more like texts written in "lt"
	//     tooltipText: recurringSchedule || i18n.t('organization.no_recurring_schedule'),
	//   });
	// } else {
	//   labelIcons.push({
	//     iconName: 'circle-number-1-filled',
	//     color: 'emerald',
	//     tooltipText: i18n.t('organization.single_event_msg'),
	//   });
	// }

	return labelIcons;
}

/**
 * Get schedule info and icons
 * @param schedule - Organization event schedule data
 * @returns Array of icon label objects with icon name and tooltip text
 */

export function getReadableSchedule(eventDetails: ProductCalendarEventObj | ProductCalendarEventGQL | null) {
	if (!eventDetails || eventDetails.frequency === 'ONCE') {
		return i18n.t('organization.single_event_msg');
	}

  const schedule = eventDetails.schedule || eventDetails.metadata?.schedule || {} as ScheduleObj;
	const defaultSchedTime = schedule.time || [];

	return DAY_OF_WEEK_DEPREC.map((day) => {
		const isScheduled = schedule.byDay?.includes(day);
		if (!isScheduled) {
			return '';
		}

		const daySchedTime = (schedule?.[`time_${day}` as keyof ScheduleObj] || defaultSchedTime) as [number, number];
		const startTime = (daySchedTime[0] || daySchedTime[0] === 0) && convertToMilitaryTime(daySchedTime[0]);
		const endTime = (daySchedTime[1] || daySchedTime[1] === 0) && convertToMilitaryTime(daySchedTime[1]);

		let timeText = '';
		if (startTime) {
			timeText = ` ${startTime}${endTime ? ' - ' + endTime : ''}`;
		}

		return i18n.t(`form.dayOfWeek.${day}`) + timeText;
	}).filter(Boolean).join(', ');
}

/**
 * Get schedule info and icons
 * @param eventDetails - Calendar Event details object
 * @param alwaysFillIcon - Whether to always use filled icons
 * @returns Array of icon label objects with icon name and tooltip text
 */

export function getScheduleIcons(eventDetails: ProductCalendarEventGQL, alwaysFillIcon = false) {
	const { frequency, schedule } = eventDetails;
	const once = !schedule;

	if (once) {
		return [{
			iconName: 'circle-number-1-filled',
			color: 'amber',
			tooltipText: i18n.t('organization.single_event_msg'),
		}];
	}

	const daily = frequency === 'DAILY';
	if (daily) {
		return [{
			text: i18n.t('form.daily'),
			color: 'sky_light',
			tooltipText: i18n.t('organization.daily_event_msg'),
		}];
	}

	const defaultSchedTime = schedule.time || [];

	// Use this if if you want to only show what's scheduled
	// const labelIcons = orderBy(schedule.byDay || [], (day) => DAY_OF_WEEK_DEPREC.indexOf(day)).map((day) => {
	// 	const dayLetter = day.charAt(0).toLowerCase();
	//   const daySchedTime = schedule?.[`time_${day}` as keyof ScheduleObj] || defaultSchedTime;
	//   const startTime = (daySchedTime[0] || daySchedTime[0] === 0) && convertToMilitaryTime(daySchedTime[0]);
	//   const endTime = (daySchedTime[1] || daySchedTime[1] === 0) && convertToMilitaryTime(daySchedTime[1]);

	//   let timeText = '';
	//   if (startTime) {
	//     timeText = `: ${startTime}${endTime ? ' - ' + endTime : ''}`;
	//   }

	// 	return {
	// 		iconName: `circle-letter-${dayLetter}-filled`,
	// 		color: dayLetter === 's' ? 'sky' : 'lime',
	// 		tooltipText: i18n.t(`form.dayOfWeek.${day}`) + timeText,
	// 	};
	// });

	const labelIcons = DAY_OF_WEEK_DEPREC.map((day) => {
		const isScheduled = schedule.byDay?.includes(day);
		const dayLetter = day.charAt(0).toLowerCase();
		const daySchedTime = (schedule?.[`time_${day}` as keyof ScheduleObj] || defaultSchedTime) as [number, number];
		const startTime = (daySchedTime[0] || daySchedTime[0] === 0) && convertToMilitaryTime(daySchedTime[0]);
		const endTime = (daySchedTime[1] || daySchedTime[1] === 0) && convertToMilitaryTime(daySchedTime[1]);

		let timeText = '';
		if (startTime) {
			timeText = ` ${startTime}${endTime ? ' - ' + endTime : ''}`;
		}

		return {
			iconName: `circle-letter-${dayLetter}${isScheduled || alwaysFillIcon ? '-filled' : ''}`,
			color: !isScheduled ? 'darker_2' : dayLetter === 's' ? 'sky' : 'lime',
			tooltipText: isScheduled ? (i18n.t(`form.dayOfWeek.${day}`) + timeText) : undefined,
		};
	});

	return labelIcons;
}

/**
 * Create Day of Week schedule icons from a single date
 * @param orgEvent - Organization event data
 * @returns Array of icon label objects with icon name and tooltip text
 */

export function getDayOfWeekIcons(
  date_: Date,
  timeZone: string | null,
  includeTime = false,
  alwaysFillIcon = false,
) {
  const luxonDate = DateTime.fromJSDate(date_).setZone(timeZone || DEFAULT_TIMEZONE);
  const dayOfWeek = luxonDate.toFormat('cccc');
  const hour = luxonDate.toFormat('HH');
  const minute = luxonDate.toFormat('mm');
  const dayOfWeekCode = dayOfWeek.slice(0, 2).toUpperCase();

	const labelIcons = DAY_OF_WEEK_DEPREC.map((day) => {
		const isScheduled = day === dayOfWeekCode;
		const dayLetter = day.charAt(0).toLowerCase();
		const startTime = includeTime ? ` - ${hour}:${minute}` : '';

		return {
			iconName: `circle-letter-${dayLetter}${isScheduled || alwaysFillIcon ? '-filled' : ''}`,
			color: !isScheduled ? 'darker_2' : dayLetter === 's' ? 'sky' : 'lime',
			tooltipText: isScheduled ? (i18n.t(`form.dayOfWeek.${day}`) + startTime) : undefined,
		};
	});

	return labelIcons;
}

/**
 * Get the correct time array from schedule
 * @param schedule - Event schedule object
 * @param date - Date object to determine day of week
 * @param timeZone - Time zone string
 * @returns Array of time strings
 */

export function getTimeArrayFromSchedule(
	schedule: ScheduleObj | null,
	date: Date | null,
	timeZone: string | null,
) {
	const dayOfWeek = date
		? DateTime.fromJSDate(date).setZone(timeZone || DEFAULT_TIMEZONE).toFormat('ccc').slice(0, 2).toUpperCase()
		: null;
	// @ts-expect-error - this namespace is valid
	return schedule?.[dayOfWeek ? `time_${dayOfWeek}` : 'time'] || schedule?.time || [];
}

/**
 * Get next date from schedule
 * @param schedule - Event schedule object
 * @param startAt - Start date/time of when this schedule goes in effect
 * @param timeZone - Time zone string
 * @returns Next date in string format
 */

export function getNextDateFromSchedule(
  frequency: ProductEventFrequencyEnum,
	schedule: ScheduleObj | null,
	startAt: string | Date | null,
	timeZone_: string | null,
	afterDate?: Date | null,
) {
	const timeZone = timeZone_ || DEFAULT_TIMEZONE;
	const once = !schedule;
	if (once) {
		return {
			date: startAt ? new Date(startAt) : null,
			text: getFullDate(startAt, 'TOMORROW_OR_NUMERIC', timeZone),
		};
	}

	// Get date in time zone using Luxon package
	const realNowValue = DateTime.now().setZone(timeZone).toJSDate();
	const now = afterDate && afterDate > realNowValue ? afterDate : realNowValue;

	const daySchedTime = getTimeArrayFromSchedule(schedule, now, timeZone);
	// const startTime = (daySchedTime[0] || daySchedTime[0] === 0) && convertToMilitaryTime(daySchedTime[0]);
	const hours = Math.floor((daySchedTime[0] || 0) / 100);
	const minutes = (daySchedTime[0] || 0) % 100;

	let nextDate;
	if (frequency === 'DAILY') {
		nextDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes);
		// Use this if you want to move to next day
		// if (nextDate <= now) {
		//   nextDate.setDate(nextDate.getDate() + 1);
		// }
	} else if (schedule.byDay?.length > 0) {
		// Map weekday codes to JS Date.getDay() numbers
		const dayMap: Record<string, number> = {
			SU: 0,
			MO: 1,
			TU: 2,
			WE: 3,
			TH: 4,
			FR: 5,
			SA: 6,
		};

		const today = now.getDay();

		let minDiff = Infinity;
		for (const code of schedule.byDay) {
			const targetDay = dayMap[code];
			if (targetDay === undefined) {
				continue;
			}

			let diff = (targetDay - today + 7) % 7;

			// if it's today, check the time
			if (diff === 0) {
				const candidate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes);

				// if the time hasn't passed yet → pick today
				if (candidate > now) {
					minDiff = 0;
					break; // earliest possible, no need to check others
				} else {
					diff = 7; // skip to next week
				}
			}

			if (diff < minDiff) {
				minDiff = diff;
			}
		}

		if (minDiff !== Infinity) {
			const result = new Date(now);
			result.setDate(now.getDate() + minDiff);
			nextDate = new Date(result.getFullYear(), result.getMonth(), result.getDate(), hours, minutes);
		}
	}

	if (nextDate) {
		return {
			text: getFullDate(nextDate, 'TOMORROW_OR_NUMERIC', timeZone),
			date: nextDate,
		};
	}

	return {
		date: null,
		text: '-',
	};
}

/**
 * Check if date is a scheduled date
 */

export function isScheduledDate(
	eventDetails: ProductCalendarEventObj | ProductCalendarEventGQL | null,
	date: Date,
) {
  const { frequency } = eventDetails || {};
  const schedule = eventDetails.schedule || eventDetails.metadata?.schedule || {} as ScheduleObj
	const { byDay } = schedule;

	switch (frequency) {
		case 'DAILY':
			return true;
		case 'WEEKLY': {
			const dateDay = DAY_OF_WEEK_DEPREC[date.getDay()];
			return byDay.includes(dateDay);
		}
		default:
			console.warn(`isScheduledDate(): ${frequency} frequency is not implemented yet`);
	}

	return false;
}

/**
 * Get time from schedule
 * @param schedule - Event schedule object
 * @returns Next date in string format
 */

export function getTimeFromSchedule(schedule: ScheduleObj | null, date: Date | null, timeZone: string | null) {
	if (!schedule && date) {
		return convertToMilitaryTime(date.getHours() * 100 + date.getMinutes());
	}

	const daySchedTime = getTimeArrayFromSchedule(schedule, date, timeZone);
	const startTime = (daySchedTime[0] || daySchedTime[0] === 0) && convertToMilitaryTime(daySchedTime[0]);
	const endTime = (daySchedTime[1] || daySchedTime[1] === 0) && convertToMilitaryTime(daySchedTime[1]);

	if (!startTime) {
		return i18n.t('form.not_specified');
	}

	return `${startTime}${endTime ? ' - ' + endTime : ''}`;
}

/**
 * Filter org event attendance based on manual check & edit history
 * @param attendance - Array of organization event attendance data objects
 * @param calDate - Calendar date in string format (YYYY-MM-DD)
 * @returns Filtered array of organization event attendance data objects
 */

export function filterEventAttendance(
	attendance: ProductAttendanceObj[],
	calDate: string,
): ProductAttendanceObj[] {
	const targetJSDate = new Date(calDate);
	const checkedAttendance = new Set<number>();
	for (const item of attendance) {
		if (item.attended !== null) {
			checkedAttendance.add(item.organizationId);
		}
	}

	const isActiveOnDate = (item: ProductAttendanceObj): boolean => {
		if (
			item.calDate || // If "calDate" is set, this was a manual override by a human, so history is ignored
			!item.history || item.history.length === 0
		) {
			return true;
		}

		// Sort history by date to be safe
		// NOTE: item.history.sort() will mutate the original array, but that's acceptable for our application
		const sorted = item.history.sort((a: any, b: any) => new Date(a[0]).getTime() - new Date(b[0]).getTime());

		let active = false;
		for (const [hDate, status] of sorted) {
			if (new Date(hDate) > targetJSDate) {
				break;
			}
			active = status === '1';
		}
		return active;
	};

	const filteredList = attendance.filter((item) =>
		!(item.attended === null && checkedAttendance.has(item.organizationId)) &&
		isActiveOnDate(item)
	);

	// Sort by organization.name
	return filteredList.sort((a, b) => a.organization.name.localeCompare(b.organization.name));
}
