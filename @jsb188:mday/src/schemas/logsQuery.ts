import { isFutureCalDate, isValidCalDate } from '@jsb188/app/utils/datetime.ts';
import { z } from 'zod';
import { LOG_ANY_ACTIVITY_ENUMS, LOG_ANY_TYPE_ENUMS, LOG_SORT_ENUMS, LOG_TYPES_BY_OPERATION } from '../constants/log.ts';
import type { FilterLogEntriesArgs, LogTypeEnum } from '../types/log.d.ts';
import type { OrganizationOperationEnum } from '../types/organization.d.ts';

/**
 * Zod schema for query params to filter
 */

export const FilterLogEntriesSchema = z.object({
  siteId: z.string()
    .optional()
    .nullable(),
  preset: z.string()
    .optional()
    .nullable(),
	types: z.array(z.enum(LOG_ANY_TYPE_ENUMS as [string]))
		.nullable(),
  activities: z.array(z.enum(LOG_ANY_ACTIVITY_ENUMS as [string]))
    .optional()
		.nullable(),
	startDate: z.string()
		.refine((sd) => isValidCalDate(sd), { message: 'START_DATE_INVALID' })
		.refine((sd) => !isFutureCalDate(sd, 1), { message: 'START_DATE_FUTURE_NOT_ALLOWED' })
		.nullable(),
	endDate: z.string()
		.refine((ed) => isValidCalDate(ed), { message: 'END_DATE_INVALID' })
		.nullable(),
	query: z.string()
		.nullable(),
}).refine((data) => {
	if (!data.endDate) {
		// No need to validate if endDate is not provided
		return true;
	} else if (!data.startDate) {
		// If endDate is provided, startDate is required
		return false;
	}
	// End date must be after or equal to start date
	return data.endDate >= data.startDate;
}, {
	message: 'END_DATE_MUST_BE_AFTER_START_DATE',
	path: ['endDate'], // where to attach the error
});

/**
 * Convert list of digits to log type enums
 * @param operationType - The type of operation for organization
 * @param types - Comma-separated string of digits representing log types
 * @returns Array of log type enums or null
 */

export function convertDigitsToLogTypes(
	operationType: OrganizationOperationEnum | null,
	typesStr?: string | null,
) {
	if (!operationType || !typesStr) {
		return null;
	}

	const logTypes = LOG_TYPES_BY_OPERATION[operationType] as LogTypeEnum[];
	if (!logTypes) {
		console.warn(`No log types found for operation type: ${operationType}`);
		return null;
	}

	return logTypes.map((type: LogTypeEnum, i: number) => {
		const value = typesStr.charAt(i);
		if (value === '1') {
			return type;
		}
		return null;
	}).filter(Boolean) as FilterLogEntriesArgs['types'];
}

/**
 * Get Sort enum value from URL
 */

export function getLogSorValueFromURL(
  searchQuery: string,
) {
  const urlParams = new URLSearchParams(searchQuery);
  const sortIndex = urlParams.get('s');
  return LOG_SORT_ENUMS[Number(sortIndex) - 1] || null;
}
