const DOCUMENT_NAME_MAX_LENGTH = 80;
const RANDOM_NAME_SUFFIX_LENGTH = 5;
const RANDOM_NAME_CHARS = 'abcdefghijklmnopqrstuvwxyz0123456789';

/*
 * Append one suffix to a document name while preserving the storage length limit.
 */

export function appendDocumentNameSuffix(baseName: string, suffix: string) {
	return `${baseName.substring(0, DOCUMENT_NAME_MAX_LENGTH - suffix.length)}${suffix}`;
}

/*
 * Return numeric document name variants from `_1` through the requested count.
 */

export function getDocumentNameNumericVariants(baseName: string, count = 10) {
	return Array.from({ length: count }, (_item, index) => {
		const suffix = `_${index + 1}`;
		return appendDocumentNameSuffix(baseName, suffix);
	});
}

/*
 * Return the first numeric document name variant that is not already taken.
 */

export function getFirstAvailableDocumentNameVariant(baseName: string, takenNames: Set<string>, count = 10) {
	return getDocumentNameNumericVariants(baseName, count)
		.find((candidate) => !takenNames.has(candidate.toLowerCase())) || null;
}

/*
 * Return a document name with a random alphanumeric suffix.
 */

export function buildRandomDocumentNameVariant(baseName: string) {
	let suffix = '_';
	for (let index = 0; index < RANDOM_NAME_SUFFIX_LENGTH; index += 1) {
		suffix += RANDOM_NAME_CHARS.charAt(Math.floor(Math.random() * RANDOM_NAME_CHARS.length));
	}

	return appendDocumentNameSuffix(baseName, suffix);
}
