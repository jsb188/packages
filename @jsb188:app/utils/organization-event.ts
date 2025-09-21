import i18n from '../i18n';
import type { OrganizationAddressGQLData, OrganizationAddressObj, OrganizationEventGQLData } from '../types/organization-event.d';

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
 * Get icon for event based on time (finished, upcoming, today, etc)
 * @param startAt - Event start date/time in ISO format
 * @returns Icon name as string
 */

export function getEventIconName(startAt_: string | Date, canceled?: boolean): string {

  if (canceled) {
    // return 'cancel';
    return 'calendar-cancel-filled';
  }

  const startAt = new Date(startAt_);
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
  const { recurring, status } = orgEvent;
  const labelIcons = [];

  if (status === 'CANCELED') {
    labelIcons.push({
      text: 'Canceled',
      color: 'red_light',
      // tooltipText: i18n.t('organization.event_canceled'),
    });
  }

  if (recurring) {
    labelIcons.push({
      iconName: 'circle-number-1-filled',
      color: 'emerald',
      tooltipText: i18n.t('organization.single_event_msg'),
    });
  }

  return labelIcons;
}
