import { DateTime } from 'luxon';
import { DAY_OF_WEEK } from '../constants/other';
import i18n from '../i18n';
import type {
  OrganizationAddressGQLData,
  OrganizationAddressObj,
  OrganizationEventGQLData,
  OrgEventAttendanceDataObj,
} from '../types/organization-event.d.ts';
import type { OrganizationGQLData } from '../types/organization.d';
import type { EventScheduleObj } from '../types/other.d';
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
  address: OrganizationAddressObj | OrganizationAddressGQLData | null,
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
 * @param orgEvent - Organization event GQL data
 * @returns boolean value to indicate if event is upcoming
 */

export function checkIfOrgEventIsUpcoming(orgEvent: OrganizationEventGQLData): boolean {
	const now = new Date();
	const endAt = orgEvent.endAt ? new Date(orgEvent.endAt) : null;
	const finished = endAt && (endAt < now);
	if (finished) {
		return false;
	}

	const once = !orgEvent.schedule || !!orgEvent.schedule?.once;
	if (once) {
		const startAt = new Date(orgEvent.startAt);
		return startAt > now;
	}

	// If it's not "once" event, then it's recurring until end date, so it will default to true
	return true;
}

/**
 * Get icon for event based on time (finished, upcoming, today, etc)
 * @param startAt - Event start date/time in ISO format
 * @param schedule - Event schedule object
 * @returns Icon name as string
 */

export function getEventIconName(
	startAt_: string | Date,
	endAt_: string | Date | null,
	schedule: EventScheduleObj | null,
	showRecurringSchedule?: boolean,
): string {
	const startAt = new Date(startAt_);
	const endAt = endAt_ ? new Date(endAt_) : null;
	const once = !schedule || !!schedule?.once;

	let isUpcoming;
	if (typeof showRecurringSchedule === 'boolean') {
		isUpcoming = showRecurringSchedule;
	} else {
		isUpcoming = checkIfOrgEventIsUpcoming({ startAt, endAt, schedule } as OrganizationEventGQLData);
	}

	if (isUpcoming && !once) {
		return 'calendar-month-filled'; // Upcoming/unfinished recurring event
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
 * @param orgEvent - Organization event data
 * @returns Array of icon label objects with icon name and tooltip text
 */

export function getOrgEventLabelIcons(orgEvent: OrganizationEventGQLData) {
	const { schedule, address } = orgEvent;
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
 * @param orgEvent - Organization event data
 * @param alwaysFillIcon - Whether to always use filled icons
 * @returns Array of icon label objects with icon name and tooltip text
 */

export function getScheduleIcons(orgEvent: OrganizationEventGQLData, alwaysFillIcon = false) {
	const { schedule } = orgEvent;
	const once = !schedule || schedule?.once;

	if (once) {
		return [{
			iconName: 'circle-number-1-filled',
			color: 'amber',
			tooltipText: i18n.t('organization.single_event_msg'),
		}];
	}

	const daily = schedule.frequency === 'DAILY';
	if (daily) {
		return [{
			text: i18n.t('form.daily'),
			color: 'sky_light',
			tooltipText: i18n.t('organization.daily_event_msg'),
		}];
	}

	const defaultSchedTime = schedule.time || [];

	// Use this if if you want to only show what's scheduled
	// const labelIcons = orderBy(schedule.byDay || [], (day) => DAY_OF_WEEK.indexOf(day)).map((day) => {
	// 	const dayLetter = day.charAt(0).toLowerCase();
	//   const daySchedTime = schedule?.[`time_${day}` as keyof EventScheduleObj] || defaultSchedTime;
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

	const labelIcons = DAY_OF_WEEK.map((day) => {
		const isScheduled = schedule.byDay?.includes(day);
		const dayLetter = day.charAt(0).toLowerCase();
		const daySchedTime = (schedule?.[`time_${day}` as keyof EventScheduleObj] || defaultSchedTime) as [number, number];
		const startTime = (daySchedTime[0] || daySchedTime[0] === 0) && convertToMilitaryTime(daySchedTime[0]);
		const endTime = (daySchedTime[1] || daySchedTime[1] === 0) && convertToMilitaryTime(daySchedTime[1]);

		let timeText = '';
		if (startTime) {
			timeText = `: ${startTime}${endTime ? ' - ' + endTime : ''}`;
		}

		return {
			iconName: `circle-letter-${dayLetter}${isScheduled || alwaysFillIcon ? '-filled' : ''}`,
			color: !isScheduled ? 'darker_2' : dayLetter === 's' ? 'sky' : 'lime',
			tooltipText: isScheduled && (i18n.t(`form.dayOfWeek.${day}`) + timeText),
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
	schedule: EventScheduleObj | null,
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
	schedule: EventScheduleObj | null,
	startAt: string | Date | null,
	timeZone_: string | null,
  afterDate?: Date | null,
) {
	const timeZone = timeZone_ || DEFAULT_TIMEZONE;
	const once = !schedule || !!schedule?.once;
	if (once) {
		return {
			date: startAt ? new Date(startAt) : null,
			text: getFullDate(startAt, 'DAY_IF_WEEK', timeZone),
		};
	}

	// Get date in time zone using Luxon package
	const realNowValue = DateTime.now().setZone(timeZone).toJSDate();
  const now = afterDate && afterDate > realNowValue ? afterDate : realNowValue;

	const { frequency } = schedule;
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
			text: getFullDate(nextDate, 'DAY_IF_WEEK', timeZone),
			date: nextDate,
		};
	}

	return {
		date: null,
		text: '-',
	};
}

/**
 * Get time from schedule
 * @param schedule - Event schedule object
 * @returns Next date in string format
 */

export function getTimeFromSchedule(schedule: EventScheduleObj | null, date: Date | null, timeZone: string | null) {
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

export function filterOrgEventAttendance(
	attendance: OrgEventAttendanceDataObj[],
	calDate: string,
): OrgEventAttendanceDataObj[] {
	const targetJSDate = new Date(calDate);
	const checkedAttendance = new Set<number>();
	for (const item of attendance) {
		if (item.attended !== null) {
			checkedAttendance.add(item.organizationId);
		}
	}

	const isActiveOnDate = (item: OrgEventAttendanceDataObj): boolean => {
		if (
			item.calDate || // If "calDate" is set, this was a manual override by a human, so history is ignored
			!item.history || item.history.length === 0
		) {
			return true;
		}

		// Sort history by date to be safe
		// NOTE: item.history.sort() will mutate the original array, but that's acceptable for our application
		const sorted = item.history.sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime());

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

/**
 * Get Icon name for organization operation
 * @param operation - Organization operation string
 * @returns Icon name as string
 */

export function getOperationIconName(operation: string | null | undefined): string {
	return {
		ARABLE: 'seedling-filled',
		LIVESTOCK: 'horse-filled',
	}[operation || ''] || 'info-circle-filled';
}

/**
 * Get all title icons for organization/vendor
 * @param org - Organization GQL data
 * @returns Array of icon label objects with icon name and tooltip text
 */

export function getTitleIconsForOrganization(org: OrganizationGQLData) {
	const { operation, compliance } = org;
	const titleIcons = [];

	if (operation) {
		titleIcons.push({
			iconName: getOperationIconName(operation),
			tooltipText: i18n.t(`organization.type.${operation}`),
		});
	}

	if (compliance?.length) {
		const today = new Date();
		const todayCalDate = today.toISOString().split('T')[0];
		const notExpired = compliance.filter((item: any) => item.expirationDate && item.expirationDate > todayCalDate);

		if (notExpired.length > 0) {
			titleIcons.push({
				iconName: 'award-filled',
				tooltipText: notExpired.map((item: any) => item.name).join(', '),
			});
		}
	}

	return titleIcons;
}
