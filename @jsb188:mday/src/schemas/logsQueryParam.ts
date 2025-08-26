import type { OrganizationOperationEnum } from '@jsb188/app/types/organization.d';
import { OPERATION_ENUMS } from '@jsb188/app/constants/organization';
import { isFutureCalDate, isValidCalDate } from '@jsb188/app/utils/datetime';
import { indexToTimeZone, isValidTimeZone } from '@jsb188/app/utils/timeZone';
import { z } from 'zod';
import { LOG_TYPE_ENUMS, LOG_TYPES_BY_OPERATION } from '../constants/log';
import type { FilterLogEntriesArgs, LogTypeEnum } from '../types/log.d';

/**
 * Zod schema for query params to filter
 */

export const FilterLogEntriesSchema = z.object({
	types: z.array(z.enum(LOG_TYPE_ENUMS as [string]))
		.nullable(),
	startDate: z.string()
		.refine((sd) => isValidCalDate(sd), { message: 'START_DATE_INVALID' })
		.refine((sd) => !isFutureCalDate(sd, 1), { message: 'START_DATE_FUTURE_NOT_ALLOWED' })
		.nullable(),
	endDate: z.string()
		.refine((ed) => isValidCalDate(ed), { message: 'END_DATE_INVALID' })
		.nullable(),
	timeZone: z.string()
		.refine((tz) => isValidTimeZone(tz), { message: 'INVALID_TIMEZONE' })
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

	const logTypes = LOG_TYPES_BY_OPERATION[operationType];
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
 * Convert list of log type enums to digits
 * @param operationType - The type of operation for organization
 * @param types - Array of log type enums
 * @returns String made of digits (indexes) representing log types
 */

export function convertLogTypesToDigits(
	operationType: OrganizationOperationEnum | null,
	types: FilterLogEntriesArgs['types'],
): string | null {
	if (!operationType || !types) {
		return null;
	}

	const logTypes = LOG_TYPES_BY_OPERATION[operationType];
	if (!logTypes) {
		console.warn(`No log types found for operation type: ${operationType}`);
		return null;
	}

	return logTypes.map((type: LogTypeEnum) => {
		return types.includes(type) ? '1' : '0';
	}).join('');
}

/**
 * Create a filter object for logEntries() query from the URL search query.
 * @param operationType - The type of operation for organization
 * @param searchQuery - The search query string from the URL
 * @returns FilterLogEntriesArgs - The filter object to be used in the logEntries() query
 */

export function createFilterFromURL(
	operationType: OrganizationOperationEnum | null,
	searchQuery: string,
) {
	const urlParams = new URLSearchParams(searchQuery);

	let startDate = urlParams.get('sd');
	let endDate = urlParams.get('ed');
	if (startDate && !endDate) {
		endDate = startDate;
	} else if (endDate && !startDate) {
		startDate = endDate;
	}

	let operation = urlParams.get('o');
	if (operation) {
		operation = OPERATION_ENUMS[Number(operation) - 1] || operationType;
	} else {
		operation = operationType;
	}

  if (!operation) {
    operation = OPERATION_ENUMS[0]; // Default to first operation if none provided
  }

	const filter: FilterLogEntriesArgs = {
		operation: operation!,
		types: convertDigitsToLogTypes(operation, urlParams.get('t')), // (urlParams.get('t') || null) as FilterLogEntriesArgs['type'] | null,
		startDate,
		endDate,
		timeZone: indexToTimeZone(urlParams.get('z')),
		query: urlParams.get('q') || '',
	};

	const validation = FilterLogEntriesSchema.safeParse(filter);
	if (!validation.success) {
		// Return null and force the client to go to a valid page
		return null;
	}

	return filter;
}

/**
 * Create URL from search query params.
 * This function assumes the query parameters are valid and well-formed.
 * @param operationType - Type of operation for organization
 * @param orgGenericId - Generic ID of the organization
 * @param searchQuery - Search query string from the URL
 * @param fileType - Type of file ('pdf' or 'csv')
 * @returns FilterLogEntriesArgs - The filter object to be used in the logEntries() query
 */

export function createLogsFileNameFromURL(
	operationType: OrganizationOperationEnum | null,
  orgGenericId: string,
	searchQuery: string,
  fileType: string
) {
	const urlParams = new URLSearchParams(searchQuery);
  const o = urlParams.get('o');
  const t = urlParams.get('t');
  const a = urlParams.get('a');
  const sd = urlParams.get('sd');
  const ed = urlParams.get('ed');
  const z = urlParams.get('z');
  const q = urlParams.get('q');

  let checkStr = '';
  let paramStr = '';

  if (o) {
    checkStr += o;
  } else {
    const ix = OPERATION_ENUMS.indexOf(operationType || '');
		checkStr += String(ix + 1);
  }

  if (t?.split('')?.some(letter => letter !== '0')) {
    checkStr += '1';
    paramStr += `_${t}`;
  } else {
    checkStr += '0';
  }

  if (a) {
    checkStr += '1';
    paramStr += `_${a}`;
  } else {
    checkStr += '0';
  }

  if (sd) {
    checkStr += '1';
    paramStr += `_${sd}`;
  } else {
    checkStr += '0';
  }

  if (ed) {
    checkStr += '1';
    paramStr += `_${ed}`;
  } else {
    checkStr += '0';
  }

  if (z) {
    checkStr += '1';
    paramStr += `_${z}`;
  } else {
    checkStr += '0';
  }

  if (q) {
    checkStr += '1';
    paramStr += `_${q}`;
  } else {
    checkStr += '0';
  }

  if (checkStr.split('').every(digit => digit === '0')) {
    return `logs_${orgGenericId}_x${paramStr}.${fileType}`;
  }

	return `logs_${orgGenericId}_${checkStr}${paramStr}.${fileType}`;
}

/**
 * Create URL search params from a filter object
 * @param filter - The filter object to convert to URL search params
 * @returns URLSearchParams - The search params object
 */

export function createSearchParamsFromFilter(filter: FilterLogEntriesArgs): URLSearchParams {
	const params = new URLSearchParams();
	const { operation } = filter;

	if (operation) {
		params.set('o', String(OPERATION_ENUMS.indexOf(operation) + 1));
	}

	if (filter.types && operation) {
		const typeDigits = convertLogTypesToDigits(operation, filter.types);
		if (typeDigits) {
			params.set('t', typeDigits);
		}
	}

	if (filter.accountId) {
		params.set('a', filter.accountId);
	}
	if (filter.startDate) {
		params.set('sd', filter.startDate);
	}
	if (filter.endDate) {
		params.set('ed', filter.endDate);
	}
	if (filter.timeZone) {
		params.set('z', filter.timeZone);
	}
	if (filter.query) {
		params.set('q', filter.query);
	}

	return params;
}
