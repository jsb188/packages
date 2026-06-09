import type { DataTableDesignCellObj } from '@jsb188/mday/types/dataTable.d.ts';
import type {
	SheetRegionSourceSortDirectionEnum,
	SheetRegionSourceSortObj,
} from '@jsb188/mday/types/sheet.d.ts';

export type SheetRegionSortQueryDesignCell = Pick<DataTableDesignCellObj, 'key' | 'label'>;

export type SheetRegionSortQueryPartKind = 'column' | 'direction' | 'separator' | 'error';

export type SheetRegionSortQueryPart = {
	cellKey?: string;
	direction?: SheetRegionSourceSortDirectionEnum;
	endIndex: number;
	explanation: string;
	kind: SheetRegionSortQueryPartKind;
	match: string;
	startIndex: number;
};

export type SheetRegionSortQueryHighlightChunk =
	| {
		endIndex: number;
		kind: 'text';
		startIndex: number;
		text: string;
	}
	| {
		endIndex: number;
		kind: 'part';
		part: SheetRegionSortQueryPart;
		partIndex: number;
		startIndex: number;
		text: string;
	};

export type SheetRegionSortQueryError = {
	code: string;
	endIndex: number;
	message: string;
	startIndex: number;
};

export type SheetRegionSortQueryInspectResult = {
	error: SheetRegionSortQueryError | null;
	parts: SheetRegionSortQueryPart[];
	sort: SheetRegionSourceSortObj[] | null;
};

type SheetRegionSortQueryTokenKind = 'comma' | 'identifier' | 'string';

type SheetRegionSortQueryToken = {
	endIndex: number;
	kind: SheetRegionSortQueryTokenKind;
	startIndex: number;
	text: string;
	value: string;
};

type SheetRegionSortQueryParserState = {
	cellsByKey: Map<string, SheetRegionSortQueryDesignCell>;
	index: number;
	parts: SheetRegionSortQueryPart[];
	query: string;
	seenCellKeys: Set<string>;
	tokens: SheetRegionSortQueryToken[];
};

/*
 * Error raised when a region sort query cannot be parsed into a mutation input object.
 */
export class SheetRegionSortQueryParseError extends Error {
	code: string;
	endIndex: number;
	startIndex: number;

	constructor(error: SheetRegionSortQueryError) {
		super(error.message);
		this.name = 'SheetRegionSortQueryParseError';
		this.code = error.code;
		this.startIndex = error.startIndex;
		this.endIndex = error.endIndex;
	}
}

/*
 * Return whether a character should end a bare sort query token.
 */
function isSheetRegionSortQueryDelimiter(char: string) {
	return /\s/.test(char) || char === '"' || char === '\'' || char === '`' || char === ',';
}

/*
 * Return one parse error object for a sort query span.
 */
function getSheetRegionSortQueryError(
	code: string,
	message: string,
	startIndex: number,
	endIndex: number,
): SheetRegionSortQueryError {
	return {
		code,
		endIndex: Math.max(startIndex, endIndex),
		message,
		startIndex,
	};
}

/*
 * Throw a typed parse error for one sort query span.
 */
function throwSheetRegionSortQueryError(
	code: string,
	message: string,
	startIndex: number,
	endIndex: number,
): never {
	throw new SheetRegionSortQueryParseError(getSheetRegionSortQueryError(code, message, startIndex, endIndex));
}

/*
 * Return one parsed single- or double-quoted sort query token.
 */
function readSheetRegionSortQueryStringToken(query: string, startIndex: number): SheetRegionSortQueryToken {
	const quote = query[startIndex];
	let value = '';
	let index = startIndex + 1;

	while (index < query.length) {
		const char = query[index];

		if (char === quote) {
			return {
				endIndex: index + 1,
				kind: 'string',
				startIndex,
				text: query.slice(startIndex, index + 1),
				value,
			};
		}

		if (char === '\\') {
			const escaped = query[index + 1];
			if (escaped === undefined) {
				break;
			}

			value += escaped === 'n' ? '\n' : escaped;
			index += 2;
			continue;
		}

		value += char;
		index += 1;
	}

	return throwSheetRegionSortQueryError('UNTERMINATED_STRING', 'Quoted value is missing a closing quote.', startIndex, query.length);
}

/*
 * Return one parsed backtick-quoted sort column key token.
 */
function readSheetRegionSortQueryBacktickIdentifierToken(query: string, startIndex: number): SheetRegionSortQueryToken {
	let value = '';
	let index = startIndex + 1;

	while (index < query.length) {
		const char = query[index];

		if (char === '`') {
			if (!value) {
				return throwSheetRegionSortQueryError('EMPTY_COLUMN_KEY', 'Column key cannot be empty.', startIndex, index + 1);
			}

			return {
				endIndex: index + 1,
				kind: 'identifier',
				startIndex,
				text: query.slice(startIndex, index + 1),
				value,
			};
		}

		if (char === '\\') {
			const escaped = query[index + 1];
			if (escaped === undefined) {
				break;
			}

			value += escaped;
			index += 2;
			continue;
		}

		value += char;
		index += 1;
	}

	return throwSheetRegionSortQueryError('UNTERMINATED_COLUMN_KEY', 'Column key is missing a closing backtick.', startIndex, query.length);
}

/*
 * Return one parsed bare sort query identifier token.
 */
function readSheetRegionSortQueryIdentifierToken(query: string, startIndex: number): SheetRegionSortQueryToken {
	let index = startIndex;

	while (index < query.length && !isSheetRegionSortQueryDelimiter(query[index])) {
		index += 1;
	}

	const text = query.slice(startIndex, index);

	return {
		endIndex: index,
		kind: 'identifier',
		startIndex,
		text,
		value: text,
	};
}

/*
 * Return parsed sort query tokens from one user-authored sort string.
 */
function tokenizeSheetRegionSortQuery(query: string) {
	const tokens: SheetRegionSortQueryToken[] = [];
	let index = 0;

	while (index < query.length) {
		const char = query[index];

		if (/\s/.test(char)) {
			index += 1;
			continue;
		}

		if (char === '"' || char === '\'') {
			const token = readSheetRegionSortQueryStringToken(query, index);
			tokens.push(token);
			index = token.endIndex;
			continue;
		}

		if (char === '`') {
			const token = readSheetRegionSortQueryBacktickIdentifierToken(query, index);
			tokens.push(token);
			index = token.endIndex;
			continue;
		}

		if (char === ',') {
			tokens.push({
				endIndex: index + 1,
				kind: 'comma',
				startIndex: index,
				text: char,
				value: char,
			});
			index += 1;
			continue;
		}

		if (isSheetRegionSortQueryDelimiter(char)) {
			return throwSheetRegionSortQueryError('UNEXPECTED_CHARACTER', `Unexpected character "${char}".`, index, index + 1);
		}

		const token = readSheetRegionSortQueryIdentifierToken(query, index);
		tokens.push(token);
		index = token.endIndex;
	}

	return tokens;
}

/*
 * Return one sort query token without consuming it.
 */
function getCurrentSheetRegionSortQueryToken(state: SheetRegionSortQueryParserState) {
	return state.tokens[state.index] || null;
}

/*
 * Return one sort query token and advance the parser.
 */
function consumeSheetRegionSortQueryToken(state: SheetRegionSortQueryParserState) {
	const token = getCurrentSheetRegionSortQueryToken(state);
	if (token) {
		state.index += 1;
	}

	return token;
}

/*
 * Return a human-readable query substring for one sort span.
 */
function getSheetRegionSortQueryMatch(query: string, startIndex: number, endIndex: number) {
	return query.slice(startIndex, endIndex);
}

/*
 * Add one semantic sort query part to the parser state.
 */
function addSheetRegionSortQueryPart(
	state: SheetRegionSortQueryParserState,
	part: Omit<SheetRegionSortQueryPart, 'match'>,
) {
	state.parts.push({
		...part,
		match: getSheetRegionSortQueryMatch(state.query, part.startIndex, part.endIndex),
	});
}

/*
 * Return the parsed sort direction represented by one token.
 */
function parseSheetRegionSortQueryDirection(state: SheetRegionSortQueryParserState): {
	direction: SheetRegionSourceSortDirectionEnum;
	token: SheetRegionSortQueryToken;
} {
	const token = getCurrentSheetRegionSortQueryToken(state);
	if (!token) {
		return throwSheetRegionSortQueryError('MISSING_DIRECTION', 'Expected ASC or DESC after the sort column.', state.query.length, state.query.length);
	}

	if (token.kind !== 'identifier') {
		return throwSheetRegionSortQueryError('INVALID_DIRECTION', 'Sort direction must be ASC or DESC.', token.startIndex, token.endIndex);
	}

	const direction = token.value.toUpperCase();
	if (direction !== 'ASC' && direction !== 'DESC') {
		return throwSheetRegionSortQueryError('INVALID_DIRECTION', 'Sort direction must be ASC or DESC.', token.startIndex, token.endIndex);
	}

	consumeSheetRegionSortQueryToken(state);

	return {
		direction,
		token,
	};
}

/*
 * Return one parsed sort clause as a mutation-ready source sort object.
 */
function parseSheetRegionSortQueryClause(state: SheetRegionSortQueryParserState): SheetRegionSourceSortObj {
	const columnToken = getCurrentSheetRegionSortQueryToken(state);
	if (!columnToken || (columnToken.kind !== 'identifier' && columnToken.kind !== 'string')) {
		return throwSheetRegionSortQueryError(
			'UNEXPECTED_TOKEN',
			'Expected a column key.',
			columnToken?.startIndex ?? state.query.length,
			columnToken?.endIndex ?? state.query.length,
		);
	}

	consumeSheetRegionSortQueryToken(state);

	const cellKey = String(columnToken.value || '');
	const cell = state.cellsByKey.get(cellKey);
	if (!cell) {
		return throwSheetRegionSortQueryError('UNKNOWN_COLUMN', `Unknown column key "${cellKey}".`, columnToken.startIndex, columnToken.endIndex);
	}

	if (state.seenCellKeys.has(cell.key)) {
		return throwSheetRegionSortQueryError('DUPLICATE_COLUMN', `Column ${cell.key} can only be sorted once.`, columnToken.startIndex, columnToken.endIndex);
	}

	state.seenCellKeys.add(cell.key);
	addSheetRegionSortQueryPart(state, {
		cellKey: cell.key,
		endIndex: columnToken.endIndex,
		explanation: `The data table column used to sort the results. This column key is "${cell.key}".`,
		kind: 'column',
		startIndex: columnToken.startIndex,
	});

	const { direction, token: directionToken } = parseSheetRegionSortQueryDirection(state);
	addSheetRegionSortQueryPart(state, {
		cellKey: cell.key,
		direction,
		endIndex: directionToken.endIndex,
		explanation: direction === 'ASC'
			? 'Sorts this column from low to high, old to new, or A to Z.'
			: 'Sorts this column from high to low, new to old, or Z to A.',
		kind: 'direction',
		startIndex: directionToken.startIndex,
	});

	return {
		cellKey: cell.key,
		direction,
	};
}

/*
 * Return sorted sort query parts by their source location.
 */
function getSortedSheetRegionSortQueryParts(parts: SheetRegionSortQueryPart[]) {
	return [...parts].sort((a, b) => a.startIndex - b.startIndex || a.endIndex - b.endIndex);
}

/*
 * Return one parser state for a sort query and design cell list.
 */
function getSheetRegionSortQueryParserState(
	query: string,
	designCells: SheetRegionSortQueryDesignCell[],
): SheetRegionSortQueryParserState {
	return {
		cellsByKey: new Map(designCells.map((cell) => [cell.key, cell])),
		index: 0,
		parts: [],
		query,
		seenCellKeys: new Set(),
		tokens: tokenizeSheetRegionSortQuery(query),
	};
}

/*
 * Return mutation-ready sort clauses from one tokenized sort query.
 */
function parseSheetRegionSortQueryState(state: SheetRegionSortQueryParserState) {
	if (!state.tokens.length) {
		return null;
	}

	const sort: SheetRegionSourceSortObj[] = [];

	while (state.index < state.tokens.length) {
		sort.push(parseSheetRegionSortQueryClause(state));

		const token = getCurrentSheetRegionSortQueryToken(state);
		if (!token) {
			break;
		}

		if (token.kind !== 'comma') {
			return throwSheetRegionSortQueryError('UNEXPECTED_TOKEN', `Unexpected token "${token.text}".`, token.startIndex, token.endIndex);
		}

		consumeSheetRegionSortQueryToken(state);
		addSheetRegionSortQueryPart(state, {
			endIndex: token.endIndex,
			explanation: 'Separates one sort clause from the next.',
			kind: 'separator',
			startIndex: token.startIndex,
		});

		if (!getCurrentSheetRegionSortQueryToken(state)) {
			return throwSheetRegionSortQueryError('TRAILING_SEPARATOR', 'Expected another sort clause after the comma.', token.startIndex, token.endIndex);
		}
	}

	return sort;
}

/*
 * Escape one string so it can be written as a quoted sort query column key.
 */
function escapeSheetRegionSortQueryString(value: string) {
	return value
		.replace(/\\/g, '\\\\')
		.replace(/"/g, '\\"')
		.replace(/\n/g, '\\n');
}

/*
 * Return a query-safe sort column key reference.
 */
function stringifySheetRegionSortQueryCellKey(cellKey: string) {
	return /^[A-Za-z_][A-Za-z0-9_:-]*$/.test(cellKey)
		? cellKey
		: `"${escapeSheetRegionSortQueryString(cellKey)}"`;
}

/*
 * Convert structured region source sort objects into canonical query text.
 */
export function stringifySheetRegionSourceSort(sort: SheetRegionSourceSortObj[] | null | undefined) {
	return (sort || [])
		.map((item) => `${stringifySheetRegionSortQueryCellKey(item.cellKey)} ${item.direction}`)
		.join(', ');
}

/*
 * Convert one sort query string into a mutation-ready region source sort object list.
 */
export function parseSheetRegionSourceSortString(
	query: string,
	designCells: SheetRegionSortQueryDesignCell[],
): SheetRegionSourceSortObj[] | null {
	const trimmedQuery = query.trim();
	if (!trimmedQuery) {
		return null;
	}

	const state = getSheetRegionSortQueryParserState(query, designCells);
	return parseSheetRegionSortQueryState(state);
}

/*
 * Return parsed sort data, parse errors, and semantic query parts for helper UI.
 */
export function inspectSheetRegionSourceSortString(
	query: string,
	designCells: SheetRegionSortQueryDesignCell[],
): SheetRegionSortQueryInspectResult {
	let state: SheetRegionSortQueryParserState | null = null;

	try {
		state = getSheetRegionSortQueryParserState(query, designCells);
		const sort = query.trim() ? parseSheetRegionSortQueryState(state) : null;

		return {
			error: null,
			parts: getSortedSheetRegionSortQueryParts(state.parts),
			sort,
		};
	} catch (error) {
		const parseError = error instanceof SheetRegionSortQueryParseError
			? getSheetRegionSortQueryError(error.code, error.message, error.startIndex, error.endIndex)
			: getSheetRegionSortQueryError('UNKNOWN_ERROR', 'Sort query could not be parsed.', 0, query.length);
		const parts: SheetRegionSortQueryPart[] = [
			...(state?.parts || []),
			{
				endIndex: parseError.endIndex,
				explanation: parseError.message,
				kind: 'error',
				match: getSheetRegionSortQueryMatch(query, parseError.startIndex, parseError.endIndex),
				startIndex: parseError.startIndex,
			},
		];

		return {
			error: parseError,
			parts: getSortedSheetRegionSortQueryParts(parts),
			sort: null,
		};
	}
}

/*
 * Return whether one text sort query can be converted into mutation-ready region sort input.
 */
export function isSheetRegionSourceSortStringValid(
	query: string,
	designCells: SheetRegionSortQueryDesignCell[],
) {
	return !inspectSheetRegionSourceSortString(query, designCells).error;
}

/*
 * Return semantic sort query parts for overlay and highlighting helpers.
 */
export function splitSheetRegionSourceSortStringParts(
	query: string,
	designCells: SheetRegionSortQueryDesignCell[],
) {
	return inspectSheetRegionSourceSortString(query, designCells).parts;
}

/*
 * Return the semantic sort query part that contains one zero-based text index.
 */
export function getSheetRegionSortQueryPartAtIndex(
	parts: SheetRegionSortQueryPart[],
	index: number | null | undefined,
) {
	if (index === null || index === undefined || index < 0) {
		return null;
	}

	return getSortedSheetRegionSortQueryParts(parts).find((part) => (
		index >= part.startIndex && index < part.endIndex
	)) || null;
}

/*
 * Return ordered plain and highlighted chunks for rendering a mirrored sort query input.
 */
export function getSheetRegionSortQueryRenderableParts(
	query: string,
	parts: SheetRegionSortQueryPart[],
): SheetRegionSortQueryHighlightChunk[] {
	const chunks: SheetRegionSortQueryHighlightChunk[] = [];
	const sortedParts = getSortedSheetRegionSortQueryParts(parts);
	let cursor = 0;

	sortedParts.forEach((part) => {
		const partIndex = parts.indexOf(part);
		if (part.endIndex <= cursor || part.endIndex <= part.startIndex) {
			return;
		}

		if (part.startIndex > cursor) {
			chunks.push({
				endIndex: part.startIndex,
				kind: 'text',
				startIndex: cursor,
				text: query.slice(cursor, part.startIndex),
			});
		}

		const startIndex = Math.max(cursor, part.startIndex);
		chunks.push({
			endIndex: part.endIndex,
			kind: 'part',
			part,
			partIndex,
			startIndex,
			text: query.slice(startIndex, part.endIndex),
		});
		cursor = part.endIndex;
	});

	if (cursor < query.length) {
		chunks.push({
			endIndex: query.length,
			kind: 'text',
			startIndex: cursor,
			text: query.slice(cursor),
		});
	}

	return chunks;
}
