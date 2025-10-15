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
 * @param doNotAllowNaN - If true, returns empty string "" if the value is NaN
 * @returns Formatted string representation of the number
 */

export function formatDecimal(
	value_: string | number,
	trimDecimals: boolean = false,
	doNotAllowNaN: boolean = false,
): string {
	const value = String(value_);

	let formattedStr;
	if (Number(value) % 1 === 0) {
		formattedStr = Number(value).toString(); // Whole number
	} else if (trimDecimals) {
		formattedStr = parseFloat(value.toString()).toString(); // Trims to first non-zero decimal
	} else {
		formattedStr = String(value); // Keep existing decimal places
	}
	return doNotAllowNaN && isNaN(Number(formattedStr)) ? '' : formattedStr;
}

/**
 * Get currency symbol from settings
 * Example 1: getCurrencySymbol('en-US', 'USD'); // "$"
 * Example 2: getCurrencySymbol('fr-FR', 'EUR'); // "€"
 * Example 3: getCurrencySymbol('ja-JP', 'JPY'); // "￥"
 * Example 4: getCurrencySymbol('en-GB', 'GBP'); // "£"
 *
 * @param locale - The locale to use for formatting
 * @param currency - The currency code (e.g., 'USD', 'EUR')
 * @returns currency symbol as a string
 */

export function getCurrencySymbol(locale: string, currency: string): string {
	const parts = new Intl.NumberFormat(locale, {
		style: 'currency',
		currency,
		minimumFractionDigits: 0,
		maximumFractionDigits: 0,
	}).formatToParts(1);

	const symbolPart = parts.find((part) => part.type === 'currency');
	return symbolPart?.value || '';
}

/**
 * Format number to currency format
 */

export function formatCurrency(
	amount: string | number,
  trailZeros: boolean = true,
	locale: string = 'en-US',
	currency: string = 'USD',
): string {
	const num = typeof amount === 'string' ? parseFloat(amount) : amount;
	if (!num && num !== 0) {
		return '';
	}

	if (isNaN(num)) {
		return trailZeros ? '$0.00' : '$0';
	}

	const hasDecimals = num % 1 !== 0;
	const symbol = getCurrencySymbol(locale, currency);

	return symbol + num.toLocaleString(locale, {
		minimumFractionDigits: hasDecimals || trailZeros ? 2 : 0,
		maximumFractionDigits: hasDecimals || trailZeros ? 2 : 0,
	});
}

/**
 * Format number to have "," between every thousands
 */

export function kFormat(
	num: string | number,
	locale: string = 'en-US',
): string {
	const number = typeof num === 'string' ? parseFloat(num) : num;
	if (isNaN(number)) {
		return String(num);
	}

	return number.toLocaleString(locale, {
		minimumFractionDigits: 0,
		maximumFractionDigits: 0,
	});
}

/**
 * Convert number based time to military time format (e.g., 1300 to 13:00)
 */

export function convertToMilitaryTime(time: number | string): string {
	const timeString = String(time).padStart(4, '0');
	return `${timeString.slice(0, 2)}:${timeString.slice(2)}`;
}

/**
 * Calculate totals from LabelAndValueObj[]
 */

export function calculateTotalAmount(values: any[], tax: number = 0): number {
	return (values || []).reduce((acc, obj) => {
		// NOTE: obj.value is the total, so obj.quantity can be ignored
		const val = parseFloat(obj?.value);
		if (!isNaN(val)) {
			return acc + val;
		}
		return acc;
	}, tax || 0);
}
