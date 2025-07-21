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
			}

			const isNullValue = value !== null || allowNull;
			if (isNullValue) {
				documentData[key] = value;
			}

			let currentValue = currentData[key];
			if (currentValue instanceof Date) {
				currentValue = currentValue.toISOString();
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
