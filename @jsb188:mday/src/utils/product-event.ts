import i18n from '@jsb188/app/i18n';
import type { AddressObj, ScheduleObj } from '@jsb188/app/types/other.d';
import { getFullDate } from '@jsb188/app/utils/datetime';
import { convertToMilitaryTime } from '@jsb188/app/utils/number';
import { DEFAULT_TIMEZONE, hhmmFromDateOrTime } from '@jsb188/app/utils/timeZone';
import { DateTime } from 'luxon';
import type { ProductAttendanceData, ProductCalEventData, ProductCalEventGQL } from '../types/product.d';

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

export function checkIfEventIsUpcoming(eventDetails: ProductCalEventGQL): boolean {
	const now = new Date();

  const once = !eventDetails.schedule?.frequency || eventDetails.schedule.frequency === 'ONCE';
	if (once) {
		const startAt = new Date(eventDetails.startAt);
		return startAt > now;
	}

  // End date only applies to recurring events
	const endAt = eventDetails.endAt ? new Date(eventDetails.endAt) : null;
	const finished = endAt && (endAt < now);
	if (finished) {
		return false;
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
): string {
	const startAt = new Date(startAt_);
	const endAt = endAt_ ? new Date(endAt_) : null;
	const once = !schedule?.frequency || schedule?.frequency === 'ONCE';
  const isUpcoming = checkIfEventIsUpcoming({ startAt, endAt, schedule } as ProductCalEventGQL);



	if (isUpcoming && !once) {
		return 'calendar-3'; // Upcoming & not-finished recurring event
	}

	const now = new Date();
	if (startAt < now) {
		return 'calendar-check'; // Finished event
	}

	const startDate = new Date(startAt.getFullYear(), startAt.getMonth(), startAt.getDate());
	const nowDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  if (startDate.getTime() === nowDate.getTime()) {
    return 'clock-3'; // Today's event
	}

  return 'calendar-3'; // Upcoming one-time event
}

/**
 * Get the icon labels for Organization event data
 * @param eventProduct - Calendar Event product GQL data
 * @returns Array of icon label objects with icon name and tooltip text
 */

export function getEventLabelIcons(eventDetails: ProductCalEventGQL) {
	const { schedule, address } = eventDetails;
	const addressText = address && getAddressText(address);
	const labelIcons = [];

	if (addressText) {
		labelIcons.push({
			iconName: 'style-two-pin-marker',
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
 * @param eventDetails - Calendar Event details object
 * @param alwaysFillIcon - Whether to always use filled icons
 * @returns Array of icon label objects with icon name and tooltip text
 */

export function getScheduleIcons(eventDetails: ProductCalEventGQL, alwaysFillIcon = false) {
	const { schedule } = eventDetails;
	const once = !schedule?.frequency || schedule.frequency === 'ONCE';

	if (once) {
		return [{
			iconName: 'circle-number-1-filled',
			color: 'amber',
			tooltipText: i18n.t('organization.single_event_msg'),
		}];
	}

  const { daysOfWeek } = schedule;
  const [startTime, endTime] = schedule.time || [];

	const labelIcons = [[0,'S'], [1, 'M'], [2, 'T'], [3, 'W'], [4, 'T'], [5, 'F'], [6, 'S']].map((d) => {
    const [dayInt, dayLetter] = d as [0 | 1 | 2 | 3 | 4 | 5 | 6, string];
		const isScheduled = daysOfWeek?.includes(dayInt);

		let timeText = '';
		if (startTime) {
			timeText = ` ${convertToMilitaryTime(startTime)}${endTime ? ' - ' + convertToMilitaryTime(endTime) : ''}`;
		}

		return {
			iconName: `circle-letter-${dayLetter.toLowerCase()}${isScheduled || alwaysFillIcon ? '-filled' : ''}`,
			color: !isScheduled ? 'darker_2' : dayLetter === 's' ? 'sky' : 'lime',
			tooltipText: isScheduled ? (i18n.t(`datetime.daysOfWeek.${dayInt}`) + timeText) : undefined,
		};
	});

	return labelIcons;
}

/**
 * Get next date from schedule
 * @param schedule - Event schedule object
 * @param startAt - Start date/time of when this schedule goes in effect
 * @param timeZone - Time zone string
 * @returns Next date in string format
 */

export function getNextDateFromSchedule(
	schedule: ScheduleObj | null,
	startAt: string | Date | null,
	timeZone_: string | null,
) {
	const timeZone = timeZone_ || DEFAULT_TIMEZONE;
	const once = !schedule?.frequency || schedule.frequency === 'ONCE';
	if (once) {
    let onceDate, onceCalDate;
    if (startAt) {
      const dt = DateTime.fromISO(startAt.toString()).setZone(timeZone);
      onceDate = dt.toJSDate();
      onceCalDate = dt.toFormat('yyyy-MM-dd');
    } else {
      onceDate = null;
      onceCalDate = null;
    }

		return {
			date: onceDate,
      calDate: onceCalDate,
			text: getFullDate(startAt, 'DATE_ONLY_SHORT', timeZone),
			numericText: getFullDate(startAt, 'TOMORROW_OR_NUMERIC', timeZone),
		};
	}

	// Get date in time zone using Luxon package
	let now = DateTime.now().setZone(timeZone).toJSDate();
  if (startAt) {
    const scheduleStartDate = DateTime.fromISO(startAt.toString()).setZone(timeZone).toJSDate();
    // If scheduleStartDate is after "now", use that as the base date
    if (scheduleStartDate > now) {
      now = scheduleStartDate;
    }
  }

	const daySchedTime = (schedule.time || []).map(Number);
	// const startTime = (daySchedTime[0] || daySchedTime[0] === 0) && convertToMilitaryTime(daySchedTime[0]);
	const hours = Math.floor((daySchedTime[0] || 0) / 100);
	const minutes = (daySchedTime[0] || 0) % 100;
  const { daysOfWeek } = schedule;

	let nextDate;
	if (daysOfWeek && daysOfWeek.length > 0) {
		const today = now.getDay();

		let minDiff = Infinity;
		for (const num of daysOfWeek) {
			if (num < 0 || num > 6) {
				continue;
			}

			let diff = (num - today + 7) % 7;
			// if it's today, check the time
			if (diff === 0) {
				const candidate = DateTime.fromJSDate(now).setZone(timeZone)
          .set({ hour: hours, minute: minutes, second: 0, millisecond: 0 })
          .toJSDate();

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
			nextDate = DateTime.fromJSDate(now).setZone(timeZone)
        .plus({ days: minDiff })
        .set({ hour: hours, minute: minutes, second: 0, millisecond: 0 })
        .toJSDate();
		}
	}

	if (nextDate) {
    const calDate = DateTime.fromJSDate(nextDate, { zone: timeZone }).toFormat('yyyy-MM-dd');
		return {
			date: nextDate,
      calDate,
			text: getFullDate(nextDate, 'DATE_ONLY_SHORT', timeZone),
			numericText: getFullDate(nextDate, 'TOMORROW_OR_NUMERIC', timeZone),
		};
	}

	return {
		date: null,
    calDate: null,
		numericText: '',
		text: '',
	};
}

/**
 * Check if date is a scheduled date
 */

export function isScheduledDate(
	eventDetails: ProductCalEventData['metadata'] | ProductCalEventGQL | null,
	calDateInt_: number | string,
  startAt: string | Date | null,
  endAt: string | Date | null,
) {
  // @ts-ignore - For server + client usage
  const schedule = (eventDetails?.schedule || eventDetails?.metadata?.schedule || {}) as ScheduleObj;
	const { frequency, daysOfWeek } = schedule;
  const startCalDateInt = startAt ? Number(DateTime.fromJSDate(new Date(startAt)).toFormat('yyyyMMdd')) : 0;
  const endCalDateInt = endAt ? Number(DateTime.fromJSDate(new Date(endAt)).toFormat('yyyyMMdd')) : 0;
  const calDateInt = typeof calDateInt_ === 'string' ? Number(calDateInt_.replace(/-/g, '')) : calDateInt_;

  if (calDateInt < startCalDateInt || (endCalDateInt && calDateInt > endCalDateInt)) {
    return false;
  }

	switch (frequency) {
		case 'ONCE':
      return calDateInt == startCalDateInt;
		case 'WEEKLY': {
      const hasWeeklyNth = schedule.weeksOfMonth && schedule.weeksOfMonth.length > 0;
      if (hasWeeklyNth) {
        const dt = DateTime.fromFormat(String(calDateInt), 'yyyyMMdd');
        const weekOfMonth = Math.ceil(dt.day / 7);
        if (!schedule.weeksOfMonth?.includes(weekOfMonth)) {
          return false;
        }
      }

      // Convert yyyyMMdd to day of week (0-6)
      const dateDay = DateTime.fromFormat(String(calDateInt), 'yyyyMMdd').weekday % 7;
      return !!daysOfWeek?.includes(dateDay as any);
		}
		default:
      if (frequency) {
        console.warn(`isScheduledDate(): ${frequency} frequency is not implemented yet`);
      }
	}

	return false;
}

/**
 * Get time from schedule
 * @param schedule - Event schedule object
 * @returns Next date in string format
 */

export function getTimeFromSchedule(
  schedule: ScheduleObj | null,
  date: Date | null,
  endAt: Date | null,
  timeZone: string | null
) {
	if ((!schedule?.frequency || schedule.frequency === 'ONCE') && date) {

    const endAtDate = endAt ? new Date(endAt) : null;
    if (endAtDate) {

      const dayDiff = Math.floor((endAtDate.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
      if (dayDiff > 0) {
        return [
          hhmmFromDateOrTime(null, date, true, timeZone),
          getFullDate(endAtDate, 'DATE_ONLY_SHORT', timeZone)
        ];
      }

      return [
        hhmmFromDateOrTime(null, date, true, timeZone),
        endAtDate > date ? hhmmFromDateOrTime(null, endAtDate, true, timeZone) : null
      ];
    }

		return [hhmmFromDateOrTime(null, date, true, timeZone)];
	}

	const timeSched = schedule?.time;
  if (
    !Array.isArray(timeSched) ||
    !timeSched[0]
  ) {
		return [i18n.t('form.not_specified')];
  }

  const [startTime, endTime] = timeSched;
	return [
    hhmmFromDateOrTime(startTime, null, true, timeZone),
    endTime && hhmmFromDateOrTime(endTime, null, true, timeZone)
  ];
}

/**
 * Filter org event attendance based on manual check & edit history
 * @param attendance - Array of organization event attendance data objects
 * @param calDate - Calendar date in string format (YYYY-MM-DD)
 * @returns Filtered array of organization event attendance data objects
 */

export function filterEventAttendance(
	attendance: ProductAttendanceData[],
	calDate: string,
): ProductAttendanceData[] {
	const targetJSDate = new Date(calDate);
	const checkedAttendance = new Set<number | bigint>();
	for (const item of attendance) {
		if (item.attended !== null) {
			checkedAttendance.add(item.organizationId);
		}
	}

	const isActiveOnDate = (item: ProductAttendanceData): boolean => {
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
