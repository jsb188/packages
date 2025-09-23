import { DateTime } from 'luxon';
import { DAY_OF_WEEK } from '../constants/other';
import i18n from '../i18n';
import type {
  OrganizationAddressGQLData,
  OrganizationAddressObj,
  OrganizationEventGQLData,
} from '../types/organization-event.d.ts';
import type { EventScheduleObj } from '../types/other.d';
import { getFullDate } from './datetime';
import { convertToMilitaryTime } from './number';
import { orderBy } from './object';
import { DEFAULT_TIMEZONE } from './timeZone';

/**
 * Get the address in a single line text format
 * @param address - Address data object
 * @returns Address in a single line text format
 */

export function getAddressText(address: OrganizationAddressObj | OrganizationAddressGQLData | null): string {
	if (!address) {
		return i18n.t('form.unknown');
	}

	const { line1, line2, city, state, postalCode, country } = address;
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
  showRecurringSchedule?: boolean
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
  const { schedule, address, addressOverride } = orgEvent;
  const addressToUse = addressOverride || address;
  const addressText = addressToUse && getAddressText(addressToUse);
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
 * @returns Array of icon label objects with icon name and tooltip text
 */

export function getScheduleIcons(orgEvent: OrganizationEventGQLData) {
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

  const labelIcons = orderBy((schedule.byDay || []), day => DAY_OF_WEEK.indexOf(day)).map((day) => {
    const dayLetter = day.charAt(0).toLowerCase();
    return {
      iconName: `circle-letter-${dayLetter}-filled`,
      color: dayLetter === 's' ? 'sky' : 'lime',
      tooltipText: i18n.t(`form.dayOfWeek.${day}`),
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
  timeZone: string | null
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
  timeZone_: string | null
) {
  const timeZone = timeZone_ || DEFAULT_TIMEZONE;
  const once = !schedule || !!schedule?.once;
  if (once) {
    return {
      date: startAt ? new Date(startAt) : null,
      text: getFullDate(startAt, 'DAY_IF_WEEK', timeZone)
    };
  }

  // Get date in time zone using Luxon package
  const now = DateTime.now().setZone(timeZone).toJSDate();
  const { frequency } = schedule;
  const timeArr = getTimeArrayFromSchedule(schedule, now, timeZone);
	// const startTime = (timeArr[0] || timeArr[0] === 0) && convertToMilitaryTime(timeArr[0]);
  const hours = Math.floor((timeArr[0] || 0) / 100);
  const minutes = (timeArr[0] || 0) % 100;

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
      date: nextDate
    };
  }

  return {
    date: null,
    text: '-'
  };
}

/**
 * Get time from schedule
 * @param schedule - Event schedule object
 * @returns Next date in string format
 */

export function getTimeFromSchedule(schedule: EventScheduleObj | null, date: Date | null, timeZone: string | null) {
  const timeArr = getTimeArrayFromSchedule(schedule, date, timeZone);
  const startTime = (timeArr[0] || timeArr[0] === 0) && convertToMilitaryTime(timeArr[0]);
	const endTime = (timeArr[1] || timeArr[1] === 0) && convertToMilitaryTime(timeArr[1]);

	if (!startTime) {
		return i18n.t('form.not_specified');
	}

	return `${startTime}${endTime ? ' - ' + endTime : ''}`;
}
