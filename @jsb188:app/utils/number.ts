/**
 * Check if number
 */

export function isNumber(input: unknown): input is number | string {
	switch (typeof input) {
		case 'number':
			return input - input === 0;
		case 'string':
			return input.trim() !== '' && !Number.isNaN(Number(input));
	}
	return false;
}

/**
 * Allow double digit numbers to be represented by a letter
 */

export function numberToLetter(
	num: number,
	alphabet: string = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ',
) {
	return alphabet.charAt(num);
}

/**
 * Convert the letter (from above fn()) back to a number;
 */

export function letterToNumber(
	letter: string,
	alphabet: string = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ',
) {
	return alphabet.indexOf(letter);
}

/**
 * Get number representation of version number
 */

export function versionToNumber(version: string) {
	const arr = String(version).split('.');
	return arr.reduce((acc: number, num: string, n) => {
		let val;
		let minorVal;
		if (!isNaN(Number(num))) {
			val = Number(num);
			minorVal = 0;
		} else {
			// NOTE: Use this to make minor version same as without the letter
			val = Number(num.replace(/\D/g, ''));
			minorVal = letterToNumber(num.replace(/[0-9]/g, ''));
			// console.log('->', num, val, minorVal);
		}
		// console.log(acc + Math.pow(100, 4 - n) * val);

		return acc + Math.pow(100, 4 - n) * val + minorVal;
	}, 0);
}

/**
 * Format Bytes
 */

export function formatBytes(bytes: number, decimals: number = 0) {
	if (!+bytes) {
		return '0 Bytes';
	}

	const k = 1024;
	const dm = decimals < 0 ? 0 : decimals;
	const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

	const i = Math.floor(Math.log(bytes) / Math.log(k));
	return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

/**
 * Convert number (seconds) to human-friendly time
 */

export function secondsToTime(secs: number) {
	if (secs < 60) {
		return {
			value: secs,
			unit: 's',
		};
	} else if (secs >= 604800) {
		const weeks = Math.floor(secs / 604800);
		return {
			value: weeks,
			unit: 'w',
		};
	} else if (secs >= 86400) {
		const days = Math.floor(secs / 86400);
		return {
			value: days,
			unit: 'd',
		};
	} else if (secs >= 3600) {
		const hours = Math.floor(secs / 3600);
		return {
			value: hours,
			unit: 'h',
		};
	}

	const minutes = Math.floor((secs % 3600) / 60);
	return {
		value: minutes,
		unit: 'm',
	};
}

/**
 * Get percentage between 2 values
 */

export function calculateDiscount(normalPrice: number, discountedPrice: number) {
	return Math.round(((normalPrice - discountedPrice) / normalPrice) * 100);
}

/**
 * Format decimal number to a string without decimal places or the first non-zero digit
 *
 * @param value - The number to format
 * @param trimDecimals - If true, trims the decimal places to the first non-zero digit
 * @returns Formatted string representation of the number
 */

export function formatDecimal(value_: string | number, trimDecimals: boolean = false): string {
  const value = String(value_);
  if (Number(value) % 1 === 0) {
    return Number(value).toString(); // Whole number
  } else if (trimDecimals) {
    return parseFloat(value.toString()).toString(); // Trims to first non-zero decimal
  }
  return String(value); // Keep existing decimal places
}
