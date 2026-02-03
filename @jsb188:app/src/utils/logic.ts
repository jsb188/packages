import { sortObjectByKeys, stringifyJSON } from './object';

/**
 * Types
 */

type DatabaseAction = 'INSERT' | 'UPDATE' | 'NONE';

type DatabaseActionResult = {
	action: DatabaseAction;
	documentData: any;
};

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
