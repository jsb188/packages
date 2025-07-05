import type { ColorEnum } from '@jsb188/app/types/app.d';
import type { OrganizationOperationEnum } from '@jsb188/app/types/organization.d';
import { textWithBrackets, ucFirst } from '@jsb188/app/utils/string';
import { ARABLE_ACTIVITIES_GROUPED } from '../constants/log';
import type { LogTypeEnum } from '../types/log';

/**
 * Map journal type to a color
 * @param type - The type of the log entry
 * @returns The color associated with the journal type
 */

export function getJournalTypeColor(type: LogTypeEnum): ColorEnum {
  const journalTypeToColor = {
    SEED: 'brown',
    FIELD: 'yellow',
    HARVEST: 'green',
    POST_HARVEST: 'cyan',
    SALES: 'blue',
  } as Record<LogTypeEnum, ColorEnum>;

  // Default to zinc if type is not found
  const color = journalTypeToColor[type] || 'zinc';
  return color;
}

/**
 * Get the title for log entry for each Union interface
 * @param details - The details Union interface for log entry
 * @return The title for the log entry
 */

export function getLogEntryTitle(details: any): string {
	const { __typename, __table } = details;
	switch (__typename || __table) {
		case 'logs_arable':
		case 'LogEntryArable': {
			return textWithBrackets(ucFirst(details.crop?.name || details.product?.name), [details.quantity, details.unit]);
		}
		case 'logs_livestock':
		case 'LogEntryLivestock': {
			// .. live stock logs here ..
		}
		default:
	}
	return '..';
}

/**
 * Get log type from activity; bassed on organization's industry-based operation
 * @param operation - The operation of the organization
 * @param activity - The activity of the log entry
 * @returns The log type or null if not found
 */

export function getLogTypeFromActivity(operation: OrganizationOperationEnum, activity: any) {
	switch (operation) {
		case 'ARABLE':
			return ARABLE_ACTIVITIES_GROUPED.find((group: any) => group[1].includes(activity))?.[0] || null;
		case 'LIVESTOCK':
			return null; // Livestock activities are not defined in this context
		default:
			console.warn('(!1) Cannot get log type from unknown operation type:', operation);
			return null;
	}
}
