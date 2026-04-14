import type { FilterLogEntriesArgs } from '@jsb188/mday/types/log.d.ts';
import { isFutureCalDate, isValidCalDate } from './datetime.ts';
import { sortObjectByKeys, stringifyJSON } from './object.ts';

/**
 * Types
 */

type DatabaseAction = 'INSERT' | 'UPDATE' | 'NONE';

type DatabaseActionResult = {
	action: DatabaseAction;
	documentData: any;
};

export interface GetFiltersFromURLResult {
	filter: Omit<Partial<FilterLogEntriesArgs>, 'operation'> | null;
	sort: string | null;
}

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
 * Convert an indexed bit-string into a list of selected values.
 */

function getIndexedValues(
	value: string | null,
	options?: string[],
) {
	if (!value || !options?.length) {
		return null;
	}

	const selectedValues = options.map((option, i) => {
		return value.charAt(i) === '1' ? option : null;
	}).filter(Boolean) as string[];

	return selectedValues.length ? selectedValues : null;
}

/**
 * Check whether a URL search-param value is a serialized generic ID.
 */

export function isValidGenericIdSearchParam(value?: string | number | bigint | null) {
	if (!value) {
		return true;
	}

	const stringValue = String(value);
	return stringValue !== '0' && /^\d+$/.test(stringValue);
}

/**
 * Validate parsed URL filters using the same date and timezone rules as the logs filter schema.
 */

function parsedFilterIsValid(filter: Omit<Partial<FilterLogEntriesArgs>, 'operation'>) {
	if (!isValidGenericIdSearchParam(filter.siteId)) {
		return false;
	}

	if (filter.startDate) {
		if (!isValidCalDate(filter.startDate)) {
			return false;
		}
	}

	if (filter.endDate && !isValidCalDate(filter.endDate)) {
		return false;
	}

	if (filter.endDate && !filter.startDate) {
		return false;
	}

	return true;
}

/**
 * Parse indexed filters and sort values from URL search params without including operation in the output.
 */

export function getFiltersFromURL(
	searchQuery: string,
	sortOptions?: string[],
	types?: string[],
	activities?: string[],
): GetFiltersFromURLResult {
	const urlParams = new URLSearchParams(searchQuery);

	let startDate = urlParams.get('sd');
	let endDate = urlParams.get('ed');
	if (startDate && !endDate) {
		endDate = startDate;
	} else if (endDate && !startDate) {
		startDate = endDate;
	}

	const filter: Omit<Partial<FilterLogEntriesArgs>, 'operation'> = {
		siteId: urlParams.get('sid') || null,
		types: getIndexedValues(urlParams.get('t'), types) as FilterLogEntriesArgs['types'],
		activities: getIndexedValues(urlParams.get('a'), activities) as FilterLogEntriesArgs['activities'],
		startDate,
		endDate,
		query: urlParams.get('q') || '',
	};

	const sortIndex = urlParams.get('s');
	const sort = sortOptions?.[Number(sortIndex) - 1] || null;

	if (!parsedFilterIsValid(filter)) {
		return {
			filter: null,
			sort,
		};
	}

	return {
		filter,
		sort,
	};
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
