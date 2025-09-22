import i18n from '../i18n';
import type {
  OrganizationAddressGQLData,
  OrganizationAddressObj,
  OrganizationEventGQLData,
} from '../types/organization-event.d.ts';
import { EventScheduleObj } from '../types/other.d';

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
 * @param showRecurringSchedule - Boolean to indicate if recurring schedule should be shown
 * @returns Array of icon label objects with icon name and tooltip text
 */

export function getScheduleIcons(orgEvent: OrganizationEventGQLData, showRecurringSchedule: boolean) {
  const labelIcons = [];

  return [{
    iconName: 'calendar-clock-filled',
    color: 'darker_2',
  }];
}
