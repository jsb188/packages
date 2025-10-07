const NOT_ALLOWED_USERNAMES = [
	'ai',
	'kajiwoto',
];

/**
 * Combine list of class names
 */

export function cn(...classNames: (string | boolean | undefined | null)[]) {
	return classNames.filter(Boolean).join(' ');
}

/**
 * Shorten text to space with length limit
 */

export function shortenToSpace(
	str: string,
	len: number = 100,
	ellipsis: string = '...',
): string {
	if (!str || str.length < len) {
		return str;
	}

	const trimmed = str.substring(0, len);
	const spaceIndex = trimmed.lastIndexOf(' ');

	if (spaceIndex < 0) {
		return trimmed.substring(0, len) + ellipsis;
	}

	return (
		trimmed.substring(0, Math.min(trimmed.length, spaceIndex)) +
		ellipsis
	);
}

/**
 * Shorten word to space, and remove article words
 */

export function guessFirstName(str: string, len: number = 40): string {
	let shortened = str?.replace(/^(a|an|the|da|de|that|there|this|than|then)\b/i, '')?.trim() || '';
	const spaceIx = shortened.indexOf(' ');

	if (spaceIx >= 0) {
		shortened = shortened.substring(0, spaceIx + 1);
	}

	if (len < shortened.length) {
		shortened = shortened.substring(0, len);
	}

	const articleReplacedEnd = shortened.replace(
		/\b(a|an|the|da|de|that|there|this|than|then)$/i,
		'',
	);

	if (articleReplacedEnd.length < 5) {
		return shortened.trim();
	}

	return articleReplacedEnd.trim();
}

/**
 * Check if e-mail
 */

export function isEmail(str: string) {
	// return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str);
	const emailRegex =
		/[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?/;
	return emailRegex.test(str.trim());
}

/**
 * Convert various phone formats to international format
 * @returns phone number in international format
 */

export function convertToInternationalPhone(str: string) {
	// Check if string has a character that isn't one of [(, ), +, -, " ", 0-9]
	if (/[^0-9+\-\s().]/.test(str)) {
		// Invalid
		return null;
	}

	const digits = str.replace(/[^0-9]/g, '');
	if (digits.startsWith('0')) {
		// Invalid
		return null;
	} else if (
		!digits.startsWith('1') &&
		digits.length === 10
	) {
		return '+1' + digits;
	}

	// If it doesn't start with a country code, assume it's already in international format
	return '+' + digits;
}

/**
 * Check if phone number
 * @returns TRUE if starts with + and has 7-15 digits
 * NOTE: This will convert phone-like strings to international format
 */

export function isPhone(str: string, doNotConvertInternational: boolean = false) {
	let phoneNumber: string | null = str.trim();
	if (!doNotConvertInternational) {
		phoneNumber = convertToInternationalPhone(phoneNumber);
		if (!phoneNumber) {
			return false;
		}
	}
	return /^\+[0-9]{7,15}$/.test(phoneNumber);
}

/**
 * Check if valid username
 */

export function isValidUsername(str: string) {
	const username = str.replace(/^@/, '').toLowerCase();
	return (
		/^[a-z0-9_]+$/i.test(username) &&
		!NOT_ALLOWED_USERNAMES.includes(username)
	);
}

/**
 * Check if password is secure enough
 * Rules:
 * at least 8 characters long
 * at least one lowercase letter
 * at least one uppercase letter
 * at least one special character
 */

export function passwordStrength(str: string, minLength: number = 8) {
	const isLongEnough = str.length >= minLength;
	const hasLowercase = /[a-z]/.test(str);
	const hasUppercase = /[A-Z]/.test(str);
	const hasDigit = /\d/.test(str);
	const hasSpecial = /\W/.test(str);
	const valid = isLongEnough && hasLowercase && hasUppercase && hasDigit &&
		hasSpecial;
	// return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*\W)[a-zA-Z\d\W]{8,}$/.test(str);
	return {
		valid,
		isLongEnough,
		hasLowercase,
		hasUppercase,
		hasDigit,
		hasSpecial,
	};
}

/**
 * Get time base unique string
 */

export function getTimeBasedUnique() {
	return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

/**
 * Convert string to alphanumeric (or space) only
 */

export function getAlphanumeric(str: string, space: boolean = false) {
	return str.replace(space ? /[^a-z0-9\s]/gi : /[^a-z0-9]/gi, '');
}

/**
 * Get regex patterns from a text
 */

export function regexFromText(text: string) {
	const words = getAlphanumeric(text, true).split(/\s+/).filter((s) => s.length >= 2);
	if (!words.length) {
		return null;
	}

	return new RegExp(
		'\\b' + (words.length === 1 ? words[0] : '(?:' + words.join('|') + ')'),
		'gi',
	);
}

/**
 * Upper case first letter
 */

export function ucFirst(str: string) {
	if (!str) {
		return '';
	}
	return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Convert cameCalsed string to dash-separated
 */

export function camelCaseToDash(str: string) {
	if (/^[A-Z0-9]+$/.test(str)) {
		return str.toLowerCase();
	}
	return str.replace(/[A-Z0-9]/g, (m, i) => {
		return `${i ? '-' : ''}${m.toLowerCase()}`;
	});
}

/**
 * Shorten text to a paragraph length
 */

export function shortenToParagraph(str: string, len: number, replaceDoubleLineBreaks?: boolean) {
	let trimedToParagraph = str || '';
	if (replaceDoubleLineBreaks) {
		trimedToParagraph = trimedToParagraph.replace(/\n\s*\n/g, '\n');
	}

	trimedToParagraph = trimedToParagraph.split('\n').reduce((acc, str) => {
		if (acc.done) {
			return acc;
		}
		acc.done = (acc.value.length + str.length) >= len;
		acc.value = acc.done ? acc.value : acc.value + '\n' + str;
		return acc;
	}, {
		done: false,
		value: '',
	}).value.trim();

	if (!trimedToParagraph) {
		return shortenToSpace(str || '', len);
	} else if (trimedToParagraph.length <= len) {
		return trimedToParagraph;
	}

	return shortenToSpace(trimedToParagraph, len);
}

/**
 * Use this to validate if a string is empty or invisible
 */

export function isInvisibleString(str: string) {
	if (!str?.trim()) {
		return true;
	}

	// eslint-disable-next-line no-misleading-character-class
	const invisRegex = /[ㅤ ️⠀ْٔ]/g;
	const checkStr = str.replace(invisRegex, ' '); // .replace(/[ㅤ ️⠀]/gi, ' ');
	return !checkStr.trim();
}

/**
 * Build a single text block with proper line breaks
 * NOTE: Userful for building AI prompts
 */

export function buildSingleText(lines: (string | undefined | false | null)[], delemiter: string = '\n') {
	return lines
		.reduce((acc, line_) => {
			const line = line_ || '';
			if (line || acc[acc.length - 1] !== '') {
				acc.push(line);
			}
			return acc;
		}, [] as string[])
		.join(delemiter)
		.trim();
}

/**
 * Join array of texts but last word has a special separator
 *
 * @param texts - Array of strings to join
 * @param separator - Separator to use between texts
 * @param lastSeparator - Separator to use before the last text
 * @returns Joined string with special last separator
 */

export function joinReadable(
	texts: string[],
	separator: string = ', ',
	lastSeparator: string = ' and ',
) {
	const lastIx = texts.length - 1;
	return texts.filter(Boolean).reduce((acc, text, i) => {
		return acc + (!acc ? '' : i === lastIx ? lastSeparator : separator) + text;
	}, '');
}

/**
 * Helper for writing text with optional brackets
 *
 * @param text - Text to write
 * @param bracketsText - Text that will be written in brackets
 * @param brackets - Brackets to use, defaults to round brackets
 * @returns Formatted text with optional brackets
 */

export function textWithBrackets(
	text: string,
	bracketsText?: string | string[],
	brackets: [string, string] = ['(', ')'],
) {
	let bText;
	if (Array.isArray(bracketsText)) {
		bText = bracketsText.filter(Boolean).join(' ').trim();
	} else {
		bText = bracketsText?.trim();
	}
	if (!bText) {
		return text;
	} else if (!text) {
		return bText;
	}
	return `${text} ${brackets[0].trimStart()}${bText}${brackets[1].trimEnd()}`;
}

/**
 * Remove all line breaks and spaces from String
 * NOTE: This is designed to remove garbage string from OpenAI text generation
 *
 * @param str - String to clean
 * @returns Cleaned string without line breaks and spaces
 */

export function removeGeneratedTextGarbage(str: string) {
	if (!str || typeof str !== 'string') {
		return '';
	}
	// Remove all line breaks and spaces
	return str.replace(/[\n\r\s]+/g, ' ').trim();
}

/**
 * Escape values not allowed in CSV column
 * @param value String value to escape
 * @returns Escaped string value
 */

export function escapeCSVValue(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * Convert Intl phone format to a readable format.
 * Example: "+1 (555) 123-4567"
 */

export function formatPhoneNumber(phone: string): string {
  const match = phone?.match(/(\d{3})(\d{3})(\d{4})$/);
  if (match) {
    const [, area, first, second] = match;
    const countryCode = phone.substring(0, phone.length - area.length - first.length - second.length);
    // NOTE: This does not account for non North American (+1) phone numbers
    return `${countryCode} (${area}) ${first}-${second}`;
  }

  return phone;
}

/**
 * Split a long text into chunks, making sure each chunk is under the chunk size character limit.
 * @param text - The long text to split.
 * @param chunkSize - The maximum number of characters allowed in each chunk.
 * @param linebreakDistance - The maximum distance from the chunk boundary to look for a line break.
 * @returns An array of text chunks.
 */

export function splitTextIntoChunks(text: string, chunkSize: number, linebreakDistance: number = 50): string[] {
  if (!text || chunkSize <= 0 || text.length < chunkSize) {
    return [text || ''];
  }

  const chunks: string[] = [];
  let start = 0;

  while (start < text.length) {
    let end = Math.min(start + chunkSize, text.length);

    if (end < text.length) {
      // Find the nearest line break around the target chunk boundary
      const beforeBreak = text.lastIndexOf("\n", end);

      let chosenBreak = -1;
      if (beforeBreak !== -1 && end - beforeBreak <= linebreakDistance && beforeBreak > start) {
        chosenBreak = beforeBreak + 1;
      }

      if (chosenBreak !== -1) {
        end = chosenBreak;
      } else {
        // Fall back to last whitespace near the end
        const lastSpace = text.lastIndexOf(" ", end);
        if (lastSpace > start && end - lastSpace < 100) {
          end = lastSpace;
        }
      }
    }

    const chunk = text.slice(start, end).trim();
    if (chunk) chunks.push(chunk);
    start = end;
  }

  return chunks;
}
