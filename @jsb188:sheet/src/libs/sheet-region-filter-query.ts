import {
	isDataTableDateLikeFieldType,
	isDataTableNumberLikeFieldType,
	normalizeDataTableDateLikeValue,
	normalizeDataTableDateTimeValue,
	normalizeDataTableSelectOptionValue,
} from '@jsb188/mday/utils/dataTable.ts';
import type {
	DataTableDesignCellObj,
	DataTableFieldTypeEnum,
	DataTableRecordValue,
} from '@jsb188/mday/types/dataTable.d.ts';
import type {
	SheetRegionSourceFilterCombinatorEnum,
	SheetRegionSourceFilterConditionObj,
	SheetRegionSourceFilterGroupObj,
	SheetRegionSourceFilterOperatorEnum,
} from '@jsb188/mday/types/sheet.d.ts';

export type SheetRegionFilterQueryPartKind = 'column' | 'condition' | 'combinator' | 'group' | 'error';

export type SheetRegionFilterQueryDesignCell = Pick<
	DataTableDesignCellObj,
	'fieldType' | 'humanFieldType' | 'key' | 'label' | 'options'
>;

export type SheetRegionFilterQueryPart = {
	cellKey?: string;
	endIndex: number;
	explanation: string;
	kind: SheetRegionFilterQueryPartKind;
	match: string;
	operator?: SheetRegionSourceFilterOperatorEnum;
	startIndex: number;
};

export type SheetRegionFilterQueryHighlightChunk =
	| {
		endIndex: number;
		kind: 'text';
		startIndex: number;
		text: string;
	}
	| {
		endIndex: number;
		kind: 'part';
		part: SheetRegionFilterQueryPart;
		partIndex: number;
		startIndex: number;
		text: string;
	};

export type SheetRegionFilterQueryError = {
	code: string;
	endIndex: number;
	message: string;
	startIndex: number;
};

export type SheetRegionFilterQueryInspectResult = {
	error: SheetRegionFilterQueryError | null;
	filter: SheetRegionSourceFilterGroupObj | null;
	parts: SheetRegionFilterQueryPart[];
};

type SheetRegionFilterQueryTokenKind =
	| 'comma'
	| 'identifier'
	| 'number'
	| 'operator'
	| 'openParen'
	| 'closeParen'
	| 'string';

type SheetRegionFilterQueryToken = {
	endIndex: number;
	kind: SheetRegionFilterQueryTokenKind;
	startIndex: number;
	text: string;
	value?: boolean | number | string;
};

type SheetRegionFilterQueryParserState = {
	cellsByKey: Map<string, SheetRegionFilterQueryDesignCell>;
	index: number;
	parts: SheetRegionFilterQueryPart[];
	query: string;
	tokens: SheetRegionFilterQueryToken[];
};

type SheetRegionFilterQueryNode =
	| {
		condition: SheetRegionSourceFilterConditionObj;
		conditionEndIndex: number;
		conditionStartIndex: number;
		fieldType: DataTableFieldTypeEnum;
		kind: 'condition';
	}
	| {
		children: SheetRegionFilterQueryNode[];
		combinator: SheetRegionSourceFilterCombinatorEnum;
		kind: 'group';
	};

type SheetRegionFilterQueryParsedOperator = {
	endIndex: number;
	operator: SheetRegionSourceFilterOperatorEnum;
	startIndex: number;
};

type SheetRegionFilterQueryParsedValue = {
	endIndex: number;
	startIndex: number;
	value: boolean | number | string;
};

type SheetRegionFilterQuerySpan = {
	endIndex: number;
	startIndex: number;
};

const SHEET_REGION_FILTER_QUERY_MAX_DEPTH = 3;

/*
 * Error raised when a region filter query cannot be parsed into a mutation input object.
 */
export class SheetRegionFilterQueryParseError extends Error {
	code: string;
	endIndex: number;
	startIndex: number;

	constructor(error: SheetRegionFilterQueryError) {
		super(error.message);
		this.name = 'SheetRegionFilterQueryParseError';
		this.code = error.code;
		this.startIndex = error.startIndex;
		this.endIndex = error.endIndex;
	}
}

/*
 * Return whether a character should end a bare query token.
 */
function isSheetRegionFilterQueryDelimiter(char: string) {
	return /\s/.test(char) || char === '"' || char === '\'' || char === '`' || char === '(' || char === ')' || char === ',' ||
		char === '=' || char === '<' || char === '>';
}

/*
 * Return a parse error object for one query span.
 */
function getSheetRegionFilterQueryError(
	code: string,
	message: string,
	startIndex: number,
	endIndex: number,
): SheetRegionFilterQueryError {
	return {
		code,
		endIndex: Math.max(startIndex, endIndex),
		message,
		startIndex,
	};
}

/*
 * Throw a typed parse error for one query span.
 */
function throwSheetRegionFilterQueryError(
	code: string,
	message: string,
	startIndex: number,
	endIndex: number,
): never {
	throw new SheetRegionFilterQueryParseError(getSheetRegionFilterQueryError(code, message, startIndex, endIndex));
}

/*
 * Return one parsed quoted query string token.
 */
function readSheetRegionFilterQueryStringToken(query: string, startIndex: number): SheetRegionFilterQueryToken {
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

	return throwSheetRegionFilterQueryError('UNTERMINATED_STRING', 'Quoted value is missing a closing quote.', startIndex, query.length);
}

/*
 * Return one parsed backtick-quoted column key token.
 */
function readSheetRegionFilterQueryBacktickIdentifierToken(query: string, startIndex: number): SheetRegionFilterQueryToken {
	let value = '';
	let index = startIndex + 1;

	while (index < query.length) {
		const char = query[index];

		if (char === '`') {
			if (!value) {
				return throwSheetRegionFilterQueryError('EMPTY_COLUMN_KEY', 'Column key cannot be empty.', startIndex, index + 1);
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

	return throwSheetRegionFilterQueryError('UNTERMINATED_COLUMN_KEY', 'Column key is missing a closing backtick.', startIndex, query.length);
}

/*
 * Return one parsed number query token.
 */
function readSheetRegionFilterQueryNumberToken(query: string, startIndex: number): SheetRegionFilterQueryToken {
	let index = startIndex;

	if (query[index] === '-') {
		index += 1;
	}

	while (/\d/.test(query[index] || '')) {
		index += 1;
	}

	if (query[index] === '.') {
		index += 1;
		while (/\d/.test(query[index] || '')) {
			index += 1;
		}
	}

	const text = query.slice(startIndex, index);
	const value = Number(text);

	if (!Number.isFinite(value)) {
		return throwSheetRegionFilterQueryError('INVALID_NUMBER', 'Number value is invalid.', startIndex, index);
	}

	return {
		endIndex: index,
		kind: 'number',
		startIndex,
		text,
		value,
	};
}

/*
 * Return one parsed bare identifier query token.
 */
function readSheetRegionFilterQueryIdentifierToken(query: string, startIndex: number): SheetRegionFilterQueryToken {
	let index = startIndex;

	while (index < query.length && !isSheetRegionFilterQueryDelimiter(query[index])) {
		index += 1;
	}

	const text = query.slice(startIndex, index);
	const upperText = text.toUpperCase();
	const booleanValue = upperText === 'TRUE' ? true : upperText === 'FALSE' ? false : undefined;

	return {
		endIndex: index,
		kind: 'identifier',
		startIndex,
		text,
		value: booleanValue ?? text,
	};
}

/*
 * Return parsed query tokens from one user-authored filter string.
 */
function tokenizeSheetRegionFilterQuery(query: string) {
	const tokens: SheetRegionFilterQueryToken[] = [];
	let index = 0;

	while (index < query.length) {
		const char = query[index];

		if (/\s/.test(char)) {
			index += 1;
			continue;
		}

		if (char === '"' || char === '\'') {
			const token = readSheetRegionFilterQueryStringToken(query, index);
			tokens.push(token);
			index = token.endIndex;
			continue;
		}

		if (char === '`') {
			const token = readSheetRegionFilterQueryBacktickIdentifierToken(query, index);
			tokens.push(token);
			index = token.endIndex;
			continue;
		}

		if (char === '(' || char === ')' || char === ',') {
			tokens.push({
				endIndex: index + 1,
				kind: char === '(' ? 'openParen' : char === ')' ? 'closeParen' : 'comma',
				startIndex: index,
				text: char,
				value: char,
			});
			index += 1;
			continue;
		}

		if (char === '=' || char === '<' || char === '>') {
			const nextChar = query[index + 1];
			const text = nextChar === '=' && (char === '<' || char === '>') ? `${char}=` : char;
			tokens.push({
				endIndex: index + text.length,
				kind: 'operator',
				startIndex: index,
				text,
				value: text,
			});
			index += text.length;
			continue;
		}

		if (/\d/.test(char) || (char === '-' && /\d/.test(query[index + 1] || ''))) {
			const token = readSheetRegionFilterQueryNumberToken(query, index);
			tokens.push(token);
			index = token.endIndex;
			continue;
		}

		if (isSheetRegionFilterQueryDelimiter(char)) {
			return throwSheetRegionFilterQueryError('UNEXPECTED_CHARACTER', `Unexpected character "${char}".`, index, index + 1);
		}

		const token = readSheetRegionFilterQueryIdentifierToken(query, index);
		tokens.push(token);
		index = token.endIndex;
	}

	return tokens;
}

/*
 * Return one query token without consuming it.
 */
function getCurrentSheetRegionFilterQueryToken(state: SheetRegionFilterQueryParserState) {
	return state.tokens[state.index] || null;
}

/*
 * Return one query token and advance the parser.
 */
function consumeSheetRegionFilterQueryToken(state: SheetRegionFilterQueryParserState) {
	const token = getCurrentSheetRegionFilterQueryToken(state);
	if (token) {
		state.index += 1;
	}

	return token;
}

/*
 * Return whether one token is a specific keyword.
 */
function isSheetRegionFilterQueryKeyword(token: SheetRegionFilterQueryToken | null, keyword: string) {
	return token?.kind === 'identifier' && token.text.toUpperCase() === keyword;
}

/*
 * Return a human-readable query substring for one span.
 */
function getSheetRegionFilterQueryMatch(query: string, startIndex: number, endIndex: number) {
	return query.slice(startIndex, endIndex);
}

/*
 * Add one semantic query part to the parser state.
 */
function addSheetRegionFilterQueryPart(
	state: SheetRegionFilterQueryParserState,
	part: Omit<SheetRegionFilterQueryPart, 'match'>,
) {
	state.parts.push({
		...part,
		match: getSheetRegionFilterQueryMatch(state.query, part.startIndex, part.endIndex),
	});
}

/*
 * Return the user-facing field type that should drive region filter query parsing.
 */
function getSheetRegionFilterQueryCellFieldType(cell: SheetRegionFilterQueryDesignCell) {
	return cell.humanFieldType || cell.fieldType;
}

/*
 * Return whether a field type should be filtered as text.
 */
function isSheetRegionFilterQueryTextFieldType(fieldType: DataTableFieldTypeEnum | null | undefined) {
	return fieldType === 'TEXT' ||
		fieldType === 'ID' ||
		fieldType === 'ID_OR_TEXT' ||
		fieldType === 'SELECT' ||
		fieldType === 'SELECT_OR_TEXT';
}

/*
 * Return whether a field type should be filtered as date or datetime.
 */
function isSheetRegionFilterQueryDateOrDateTimeFieldType(fieldType: DataTableFieldTypeEnum | null | undefined) {
	return isDataTableDateLikeFieldType(fieldType) || fieldType === 'DATETIME';
}

/*
 * Return whether a filter operator is compatible with one dataTable field type.
 */
function isSheetRegionFilterQueryOperatorCompatible(
	operator: SheetRegionSourceFilterOperatorEnum,
	fieldType: DataTableFieldTypeEnum | null | undefined,
) {
	if (operator === 'IS_EMPTY') {
		return true;
	}

	if (isSheetRegionFilterQueryTextFieldType(fieldType)) {
		return operator === 'CONTAINS' || operator === 'EQUALS' || operator === 'IN';
	}

	if (isDataTableNumberLikeFieldType(fieldType)) {
		return operator === 'EQUALS' || operator === 'GT' || operator === 'GTE' || operator === 'LT' || operator === 'LTE';
	}

	if (isSheetRegionFilterQueryDateOrDateTimeFieldType(fieldType)) {
		return operator === 'EQUALS' ||
			operator === 'BEFORE' ||
			operator === 'AFTER' ||
			operator === 'ON_OR_BEFORE' ||
			operator === 'ON_OR_AFTER';
	}

	if (fieldType === 'BOOLEAN') {
		return operator === 'EQUALS';
	}

	if (fieldType === 'MULTI_SELECT') {
		return operator === 'CONTAINS' || operator === 'CONTAINS_ANY';
	}

	return false;
}

/*
 * Return the field-aware operator represented by one symbolic operator token.
 */
function getSheetRegionFilterQuerySymbolOperator(
	text: string,
	fieldType: DataTableFieldTypeEnum,
): SheetRegionSourceFilterOperatorEnum {
	if (text === '=') {
		return 'EQUALS';
	}

	if (isSheetRegionFilterQueryDateOrDateTimeFieldType(fieldType)) {
		if (text === '>') {
			return 'AFTER';
		}
		if (text === '>=') {
			return 'ON_OR_AFTER';
		}
		if (text === '<') {
			return 'BEFORE';
		}
		if (text === '<=') {
			return 'ON_OR_BEFORE';
		}
	}

	if (text === '>') {
		return 'GT';
	}
	if (text === '>=') {
		return 'GTE';
	}
	if (text === '<') {
		return 'LT';
	}
	if (text === '<=') {
		return 'LTE';
	}

	return throwSheetRegionFilterQueryError('INVALID_OPERATOR', `Unsupported operator "${text}".`, 0, text.length);
}

/*
 * Return the filter operator at the current parser position.
 */
function parseSheetRegionFilterQueryOperator(
	state: SheetRegionFilterQueryParserState,
	fieldType: DataTableFieldTypeEnum,
): SheetRegionFilterQueryParsedOperator {
	const token = getCurrentSheetRegionFilterQueryToken(state);
	if (!token) {
		return throwSheetRegionFilterQueryError('MISSING_OPERATOR', 'Expected a filter operator.', state.query.length, state.query.length);
	}

	if (token.kind === 'operator') {
		consumeSheetRegionFilterQueryToken(state);

		return {
			endIndex: token.endIndex,
			operator: getSheetRegionFilterQuerySymbolOperator(token.text, fieldType),
			startIndex: token.startIndex,
		};
	}

	if (token.kind !== 'identifier') {
		return throwSheetRegionFilterQueryError('MISSING_OPERATOR', 'Expected a filter operator.', token.startIndex, token.endIndex);
	}

	const upperText = token.text.toUpperCase();

	if (upperText === 'IS') {
		consumeSheetRegionFilterQueryToken(state);
		const emptyToken = getCurrentSheetRegionFilterQueryToken(state);
		if (!isSheetRegionFilterQueryKeyword(emptyToken, 'EMPTY')) {
			return throwSheetRegionFilterQueryError('INVALID_IS_OPERATOR', 'Expected EMPTY after IS.', token.startIndex, emptyToken?.endIndex || token.endIndex);
		}

		consumeSheetRegionFilterQueryToken(state);
		return {
			endIndex: emptyToken.endIndex,
			operator: 'IS_EMPTY',
			startIndex: token.startIndex,
		};
	}

	const operatorByKeyword: Record<string, SheetRegionSourceFilterOperatorEnum | undefined> = {
		AFTER: 'AFTER',
		BEFORE: 'BEFORE',
		CONTAINS: 'CONTAINS',
		CONTAINS_ANY: 'CONTAINS_ANY',
		EQUALS: 'EQUALS',
		GT: 'GT',
		GTE: 'GTE',
		IN: 'IN',
		LT: 'LT',
		LTE: 'LTE',
		ON_OR_AFTER: 'ON_OR_AFTER',
		ON_OR_BEFORE: 'ON_OR_BEFORE',
	};
	const operator = operatorByKeyword[upperText];
	if (!operator) {
		return throwSheetRegionFilterQueryError('INVALID_OPERATOR', `Unsupported operator "${token.text}".`, token.startIndex, token.endIndex);
	}

	consumeSheetRegionFilterQueryToken(state);

	return {
		endIndex: token.endIndex,
		operator,
		startIndex: token.startIndex,
	};
}

/*
 * Return the parsed scalar value at the current parser position.
 */
function parseSheetRegionFilterQueryValue(state: SheetRegionFilterQueryParserState): SheetRegionFilterQueryParsedValue {
	const token = getCurrentSheetRegionFilterQueryToken(state);
	if (!token) {
		return throwSheetRegionFilterQueryError('MISSING_VALUE', 'Expected a filter value.', state.query.length, state.query.length);
	}

	if (token.kind === 'string' || token.kind === 'number') {
		consumeSheetRegionFilterQueryToken(state);
		return {
			endIndex: token.endIndex,
			startIndex: token.startIndex,
			value: token.value as number | string,
		};
	}

	if (token.kind === 'identifier' && (token.text.toUpperCase() === 'TRUE' || token.text.toUpperCase() === 'FALSE')) {
		consumeSheetRegionFilterQueryToken(state);
		return {
			endIndex: token.endIndex,
			startIndex: token.startIndex,
			value: token.text.toUpperCase() === 'TRUE',
		};
	}

	return throwSheetRegionFilterQueryError('INVALID_VALUE', 'Expected a quoted string, number, or boolean value.', token.startIndex, token.endIndex);
}

/*
 * Expect one token kind and return it.
 */
function expectSheetRegionFilterQueryToken(
	state: SheetRegionFilterQueryParserState,
	kind: SheetRegionFilterQueryTokenKind,
	message: string,
) {
	const token = getCurrentSheetRegionFilterQueryToken(state);
	if (!token || token.kind !== kind) {
		return throwSheetRegionFilterQueryError(
			'UNEXPECTED_TOKEN',
			message,
			token?.startIndex ?? state.query.length,
			token?.endIndex ?? state.query.length,
		);
	}

	consumeSheetRegionFilterQueryToken(state);
	return token;
}

/*
 * Return one token that can identify a filter column at the left side of a condition.
 */
function parseSheetRegionFilterQueryColumnToken(state: SheetRegionFilterQueryParserState) {
	const token = getCurrentSheetRegionFilterQueryToken(state);
	if (!token || (token.kind !== 'identifier' && token.kind !== 'string')) {
		return throwSheetRegionFilterQueryError(
			'UNEXPECTED_TOKEN',
			'Expected a column key.',
			token?.startIndex ?? state.query.length,
			token?.endIndex ?? state.query.length,
		);
	}

	consumeSheetRegionFilterQueryToken(state);
	return token;
}

/*
 * Return the parsed list values at the current parser position.
 */
function parseSheetRegionFilterQueryValueList(state: SheetRegionFilterQueryParserState) {
	const values: SheetRegionFilterQueryParsedValue[] = [];
	const openToken = expectSheetRegionFilterQueryToken(state, 'openParen', 'Expected an opening parenthesis for a value list.');

	while (true) {
		const token = getCurrentSheetRegionFilterQueryToken(state);
		if (!token) {
			return throwSheetRegionFilterQueryError('UNCLOSED_VALUE_LIST', 'Value list is missing a closing parenthesis.', openToken.startIndex, state.query.length);
		}

		if (token.kind === 'closeParen') {
			if (!values.length) {
				return throwSheetRegionFilterQueryError('EMPTY_VALUE_LIST', 'Value list cannot be empty.', openToken.startIndex, token.endIndex);
			}

			consumeSheetRegionFilterQueryToken(state);
			return {
				endIndex: token.endIndex,
				startIndex: openToken.startIndex,
				values,
			};
		}

		values.push(parseSheetRegionFilterQueryValue(state));

		const nextToken = getCurrentSheetRegionFilterQueryToken(state);
		if (nextToken?.kind === 'comma') {
			consumeSheetRegionFilterQueryToken(state);
			continue;
		}

		if (nextToken?.kind !== 'closeParen') {
			return throwSheetRegionFilterQueryError(
				'INVALID_VALUE_LIST',
				'Expected a comma or closing parenthesis in the value list.',
				nextToken?.startIndex ?? state.query.length,
				nextToken?.endIndex ?? state.query.length,
			);
		}
	}
}

/*
 * Return one string value normalized for a text-like dataTable field.
 */
function normalizeSheetRegionFilterQueryTextValue(
	cell: SheetRegionFilterQueryDesignCell,
	value: unknown,
	span: SheetRegionFilterQuerySpan,
) {
	const normalizedValue = normalizeDataTableSelectOptionValue(cell, value as DataTableRecordValue);
	const text = String(normalizedValue ?? '').trim();

	if (!text) {
		return throwSheetRegionFilterQueryError('EMPTY_TEXT_VALUE', 'Text value cannot be empty.', span.startIndex, span.endIndex);
	}

	return text;
}

/*
 * Return one non-empty list of string values normalized for a text-like field.
 */
function normalizeSheetRegionFilterQueryTextValues(
	cell: SheetRegionFilterQueryDesignCell,
	values: unknown[],
	span: SheetRegionFilterQuerySpan,
) {
	const normalizedValues = values.map((value) => normalizeSheetRegionFilterQueryTextValue(cell, value, span));
	if (!normalizedValues.length) {
		return throwSheetRegionFilterQueryError('EMPTY_TEXT_LIST', 'Text value list cannot be empty.', span.startIndex, span.endIndex);
	}

	return normalizedValues;
}

/*
 * Return one finite numeric filter value.
 */
function normalizeSheetRegionFilterQueryNumberValue(value: unknown, span: SheetRegionFilterQuerySpan) {
	const numberValue = Number(value);
	if (!Number.isFinite(numberValue)) {
		return throwSheetRegionFilterQueryError('INVALID_NUMBER_VALUE', 'Number value must be finite.', span.startIndex, span.endIndex);
	}

	return numberValue;
}

/*
 * Return one boolean filter value.
 */
function normalizeSheetRegionFilterQueryBooleanValue(value: unknown, span: SheetRegionFilterQuerySpan) {
	if (typeof value !== 'boolean') {
		return throwSheetRegionFilterQueryError('INVALID_BOOLEAN_VALUE', 'Boolean filter value must be true or false.', span.startIndex, span.endIndex);
	}

	return value;
}

/*
 * Return one normalized date filter value.
 */
function normalizeSheetRegionFilterQueryDateValue(fieldType: DataTableFieldTypeEnum, value: unknown, span: SheetRegionFilterQuerySpan) {
	try {
		const dateValue = normalizeDataTableDateLikeValue(value as DataTableRecordValue, fieldType);
		if (!dateValue) {
			return throwSheetRegionFilterQueryError('INVALID_DATE_VALUE', 'Date filter value is invalid.', span.startIndex, span.endIndex);
		}

		return dateValue;
	} catch (_error) {
		return throwSheetRegionFilterQueryError('INVALID_DATE_VALUE', 'Date filter value is invalid.', span.startIndex, span.endIndex);
	}
}

/*
 * Return one normalized datetime filter value.
 */
function normalizeSheetRegionFilterQueryDateTimeValue(value: unknown, span: SheetRegionFilterQuerySpan) {
	try {
		const datetimeValue = normalizeDataTableDateTimeValue(value as DataTableRecordValue);
		if (!datetimeValue) {
			return throwSheetRegionFilterQueryError('INVALID_DATETIME_VALUE', 'Datetime filter value is invalid.', span.startIndex, span.endIndex);
		}

		return datetimeValue;
	} catch (_error) {
		return throwSheetRegionFilterQueryError('INVALID_DATETIME_VALUE', 'Datetime filter value is invalid.', span.startIndex, span.endIndex);
	}
}

/*
 * Return one structured filter condition from a parsed condition value.
 */
function getSheetRegionFilterQueryConditionFromParsedValue(
	cell: SheetRegionFilterQueryDesignCell,
	operator: SheetRegionSourceFilterOperatorEnum,
	span: SheetRegionFilterQuerySpan,
	values: unknown[],
): SheetRegionSourceFilterConditionObj {
	const fieldType = getSheetRegionFilterQueryCellFieldType(cell);

	if (!isSheetRegionFilterQueryOperatorCompatible(operator, fieldType)) {
		return throwSheetRegionFilterQueryError('INCOMPATIBLE_OPERATOR', `Operator ${operator} cannot be used with column ${cell.key}.`, span.startIndex, span.endIndex);
	}

	const condition: SheetRegionSourceFilterConditionObj = {
		cellKey: cell.key,
		operator,
	};

	if (operator === 'IS_EMPTY') {
		return condition;
	}

	if (isSheetRegionFilterQueryTextFieldType(fieldType)) {
		if (operator === 'IN') {
			condition.textValues = normalizeSheetRegionFilterQueryTextValues(cell, values, span);
		} else {
			condition.textValue = normalizeSheetRegionFilterQueryTextValue(cell, values[0], span);
		}
		return condition;
	}

	if (isDataTableNumberLikeFieldType(fieldType)) {
		condition.numberValue = normalizeSheetRegionFilterQueryNumberValue(values[0], span);
		return condition;
	}

	if (isDataTableDateLikeFieldType(fieldType)) {
		condition.dateValue = normalizeSheetRegionFilterQueryDateValue(fieldType, values[0], span);
		return condition;
	}

	if (fieldType === 'DATETIME') {
		condition.datetimeValue = normalizeSheetRegionFilterQueryDateTimeValue(values[0], span);
		return condition;
	}

	if (fieldType === 'BOOLEAN') {
		condition.booleanValue = normalizeSheetRegionFilterQueryBooleanValue(values[0], span);
		return condition;
	}

	if (fieldType === 'MULTI_SELECT') {
		if (operator === 'CONTAINS_ANY') {
			condition.textValues = normalizeSheetRegionFilterQueryTextValues(cell, values, span);
		} else {
			condition.textValue = normalizeSheetRegionFilterQueryTextValue(cell, values[0], span);
		}
		return condition;
	}

	return throwSheetRegionFilterQueryError('UNSUPPORTED_FIELD_TYPE', `Column ${cell.key} cannot be filtered.`, span.startIndex, span.endIndex);
}

/*
 * Return a short explanation for one parsed column reference.
 */
function getSheetRegionFilterQueryColumnExplanation(cell: SheetRegionFilterQueryDesignCell) {
	return `The data table column used to filter the results. This column key is "${cell.key}".`;
}

/*
 * Return a short explanation for one parsed condition.
 */
function getSheetRegionFilterQueryConditionExplanation(
	cell: SheetRegionFilterQueryDesignCell,
	operator: SheetRegionSourceFilterOperatorEnum,
	values: unknown[],
) {
	if (operator === 'IS_EMPTY') {
		return `${cell.key} is empty`;
	}

	const valueText = values.length > 1 ? values.map((value) => String(value)).join(', ') : String(values[0]);
	const operatorTextByOperator: Record<SheetRegionSourceFilterOperatorEnum, string> = {
		AFTER: 'is after',
		BEFORE: 'is before',
		CONTAINS: 'contains',
		CONTAINS_ANY: 'contains any of',
		EQUALS: 'equals',
		GT: 'is greater than',
		GTE: 'is greater than or equal to',
		IN: 'is one of',
		IS_EMPTY: 'is empty',
		LT: 'is less than',
		LTE: 'is less than or equal to',
		ON_OR_AFTER: 'is on or after',
		ON_OR_BEFORE: 'is on or before',
	};

	return `${cell.key} ${operatorTextByOperator[operator]} ${valueText}`;
}

/*
 * Return one parsed query condition node.
 */
function parseSheetRegionFilterQueryCondition(state: SheetRegionFilterQueryParserState): SheetRegionFilterQueryNode {
	const columnToken = parseSheetRegionFilterQueryColumnToken(state);
	const cellKey = String(columnToken.value || '');
	const cell = state.cellsByKey.get(cellKey);
	if (!cell) {
		return throwSheetRegionFilterQueryError('UNKNOWN_COLUMN', `Unknown column key "${cellKey}".`, columnToken.startIndex, columnToken.endIndex);
	}

	addSheetRegionFilterQueryPart(state, {
		cellKey: cell.key,
		endIndex: columnToken.endIndex,
		explanation: getSheetRegionFilterQueryColumnExplanation(cell),
		kind: 'column',
		startIndex: columnToken.startIndex,
	});

	const fieldType = getSheetRegionFilterQueryCellFieldType(cell);
	const parsedOperator = parseSheetRegionFilterQueryOperator(state, fieldType);
	const values: SheetRegionFilterQueryParsedValue[] = [];
	let conditionEndIndex = parsedOperator.endIndex;

	if (parsedOperator.operator === 'IN' || parsedOperator.operator === 'CONTAINS_ANY') {
		const list = parseSheetRegionFilterQueryValueList(state);
		values.push(...list.values);
		conditionEndIndex = list.endIndex;
	} else if (parsedOperator.operator !== 'IS_EMPTY') {
		const value = parseSheetRegionFilterQueryValue(state);
		values.push(value);
		conditionEndIndex = value.endIndex;
	}

	const rawValues = values.map((value) => value.value);
	const condition = getSheetRegionFilterQueryConditionFromParsedValue(
		cell,
		parsedOperator.operator,
		{
			endIndex: conditionEndIndex,
			startIndex: parsedOperator.startIndex,
		},
		rawValues,
	);

	addSheetRegionFilterQueryPart(state, {
		cellKey: cell.key,
		endIndex: conditionEndIndex,
		explanation: getSheetRegionFilterQueryConditionExplanation(cell, parsedOperator.operator, rawValues),
		kind: 'condition',
		operator: parsedOperator.operator,
		startIndex: parsedOperator.startIndex,
	});

	return {
		condition,
		conditionEndIndex,
		conditionStartIndex: parsedOperator.startIndex,
		fieldType,
		kind: 'condition',
	};
}

/*
 * Return one primary expression node.
 */
function parseSheetRegionFilterQueryPrimary(state: SheetRegionFilterQueryParserState): SheetRegionFilterQueryNode {
	const token = getCurrentSheetRegionFilterQueryToken(state);
	if (!token) {
		return throwSheetRegionFilterQueryError('MISSING_EXPRESSION', 'Expected a filter expression.', state.query.length, state.query.length);
	}

	if (token.kind === 'openParen') {
		consumeSheetRegionFilterQueryToken(state);
		addSheetRegionFilterQueryPart(state, {
			endIndex: token.endIndex,
			explanation: 'Starts a grouped filter expression.',
			kind: 'group',
			startIndex: token.startIndex,
		});

		const expression = parseSheetRegionFilterQueryOrExpression(state);
		const closeToken = expectSheetRegionFilterQueryToken(state, 'closeParen', 'Expected a closing parenthesis.');
		addSheetRegionFilterQueryPart(state, {
			endIndex: closeToken.endIndex,
			explanation: 'Ends a grouped filter expression.',
			kind: 'group',
			startIndex: closeToken.startIndex,
		});

		return expression;
	}

	return parseSheetRegionFilterQueryCondition(state);
}

/*
 * Return a combined query node for one combinator.
 */
function combineSheetRegionFilterQueryNodes(
	combinator: SheetRegionSourceFilterCombinatorEnum,
	left: SheetRegionFilterQueryNode,
	right: SheetRegionFilterQueryNode,
): SheetRegionFilterQueryNode {
	const children: SheetRegionFilterQueryNode[] = [];

	if (left.kind === 'group' && left.combinator === combinator) {
		children.push(...left.children);
	} else {
		children.push(left);
	}

	if (right.kind === 'group' && right.combinator === combinator) {
		children.push(...right.children);
	} else {
		children.push(right);
	}

	return {
		children,
		combinator,
		kind: 'group',
	};
}

/*
 * Return one AND expression node.
 */
function parseSheetRegionFilterQueryAndExpression(state: SheetRegionFilterQueryParserState): SheetRegionFilterQueryNode {
	let node = parseSheetRegionFilterQueryPrimary(state);

	while (isSheetRegionFilterQueryKeyword(getCurrentSheetRegionFilterQueryToken(state), 'AND')) {
		const token = consumeSheetRegionFilterQueryToken(state)!;
		addSheetRegionFilterQueryPart(state, {
			endIndex: token.endIndex,
			explanation: 'Both surrounding filter expressions must match.',
			kind: 'combinator',
			startIndex: token.startIndex,
		});

		node = combineSheetRegionFilterQueryNodes('AND', node, parseSheetRegionFilterQueryPrimary(state));
	}

	return node;
}

/*
 * Return one OR expression node.
 */
function parseSheetRegionFilterQueryOrExpression(state: SheetRegionFilterQueryParserState): SheetRegionFilterQueryNode {
	let node = parseSheetRegionFilterQueryAndExpression(state);

	while (isSheetRegionFilterQueryKeyword(getCurrentSheetRegionFilterQueryToken(state), 'OR')) {
		const token = consumeSheetRegionFilterQueryToken(state)!;
		addSheetRegionFilterQueryPart(state, {
			endIndex: token.endIndex,
			explanation: 'Either surrounding filter expression can match.',
			kind: 'combinator',
			startIndex: token.startIndex,
		});

		node = combineSheetRegionFilterQueryNodes('OR', node, parseSheetRegionFilterQueryAndExpression(state));
	}

	return node;
}

/*
 * Return a structured filter group from one parsed query node.
 */
function getSheetRegionFilterGroupFromQueryNode(
	node: SheetRegionFilterQueryNode,
	depth = 1,
): SheetRegionSourceFilterGroupObj {
	if (depth > SHEET_REGION_FILTER_QUERY_MAX_DEPTH) {
		return throwSheetRegionFilterQueryError(
			'FILTER_TOO_DEEP',
			`Filter groups can be nested at most ${SHEET_REGION_FILTER_QUERY_MAX_DEPTH} levels.`,
			0,
			0,
		);
	}

	if (node.kind === 'condition') {
		return {
			combinator: 'AND',
			conditions: [node.condition],
			groups: [],
		};
	}

	const conditions: SheetRegionSourceFilterConditionObj[] = [];
	const groups: SheetRegionSourceFilterGroupObj[] = [];

	node.children.forEach((child) => {
		if (child.kind === 'condition') {
			conditions.push(child.condition);
			return;
		}

		groups.push(getSheetRegionFilterGroupFromQueryNode(child, depth + 1));
	});

	return {
		combinator: node.combinator,
		conditions,
		groups,
	};
}

/*
 * Return sorted query parts by their location in the source string.
 */
function getSortedSheetRegionFilterQueryParts(parts: SheetRegionFilterQueryPart[]) {
	return [...parts].sort((a, b) => a.startIndex - b.startIndex || a.endIndex - b.endIndex);
}

/*
 * Return a parser state for one query and design cell list.
 */
function getSheetRegionFilterQueryParserState(
	query: string,
	designCells: SheetRegionFilterQueryDesignCell[],
): SheetRegionFilterQueryParserState {
	return {
		cellsByKey: new Map(designCells.map((cell) => [cell.key, cell])),
		index: 0,
		parts: [],
		query,
		tokens: tokenizeSheetRegionFilterQuery(query),
	};
}

/*
 * Return the structured filter object and semantic parts from one tokenized query.
 */
function parseSheetRegionFilterQueryState(state: SheetRegionFilterQueryParserState) {
	if (!state.tokens.length) {
		return null;
	}

	const node = parseSheetRegionFilterQueryOrExpression(state);
	const trailingToken = getCurrentSheetRegionFilterQueryToken(state);
	if (trailingToken) {
		return throwSheetRegionFilterQueryError('UNEXPECTED_TOKEN', `Unexpected token "${trailingToken.text}".`, trailingToken.startIndex, trailingToken.endIndex);
	}

	return getSheetRegionFilterGroupFromQueryNode(node);
}

/*
 * Escape one string so it can be written as a quoted filter query value.
 */
function escapeSheetRegionFilterQueryString(value: string) {
	return value
		.replace(/\\/g, '\\\\')
		.replace(/"/g, '\\"')
		.replace(/\n/g, '\\n');
}

/*
 * Return a query-safe column key reference.
 */
function stringifySheetRegionFilterQueryCellKey(cellKey: string) {
	return /^[A-Za-z_][A-Za-z0-9_:-]*$/.test(cellKey)
		? cellKey
		: `\`${cellKey.replace(/\\/g, '\\\\').replace(/`/g, '\\`')}\``;
}

/*
 * Return a quoted string query value.
 */
function stringifySheetRegionFilterQueryStringValue(value: unknown) {
	return `"${escapeSheetRegionFilterQueryString(String(value ?? ''))}"`;
}

/*
 * Return a query value list.
 */
function stringifySheetRegionFilterQueryStringList(values: unknown[] | null | undefined) {
	return `(${(values || []).map(stringifySheetRegionFilterQueryStringValue).join(', ')})`;
}

/*
 * Return the canonical query operator text for one filter condition.
 */
function stringifySheetRegionFilterQueryOperator(operator: SheetRegionSourceFilterOperatorEnum) {
	const operatorTextByOperator: Record<SheetRegionSourceFilterOperatorEnum, string> = {
		AFTER: 'AFTER',
		BEFORE: 'BEFORE',
		CONTAINS: 'CONTAINS',
		CONTAINS_ANY: 'CONTAINS_ANY',
		EQUALS: '=',
		GT: '>',
		GTE: '>=',
		IN: 'IN',
		IS_EMPTY: 'IS EMPTY',
		LT: '<',
		LTE: '<=',
		ON_OR_AFTER: '>=',
		ON_OR_BEFORE: '<=',
	};

	return operatorTextByOperator[operator];
}

/*
 * Return the canonical query value text for one filter condition.
 */
function stringifySheetRegionFilterQueryConditionValue(condition: SheetRegionSourceFilterConditionObj) {
	if (condition.operator === 'IS_EMPTY') {
		return '';
	}

	if (condition.operator === 'IN' || condition.operator === 'CONTAINS_ANY') {
		return stringifySheetRegionFilterQueryStringList(condition.textValues);
	}

	if (condition.numberValue !== undefined && condition.numberValue !== null) {
		return String(condition.numberValue);
	}

	if (condition.booleanValue !== undefined && condition.booleanValue !== null) {
		return condition.booleanValue ? 'true' : 'false';
	}

	if (condition.dateValue !== undefined && condition.dateValue !== null) {
		return stringifySheetRegionFilterQueryStringValue(condition.dateValue);
	}

	if (condition.datetimeValue !== undefined && condition.datetimeValue !== null) {
		return stringifySheetRegionFilterQueryStringValue(condition.datetimeValue);
	}

	return stringifySheetRegionFilterQueryStringValue(condition.textValue || '');
}

/*
 * Return one filter condition as canonical query text.
 */
function stringifySheetRegionFilterQueryCondition(condition: SheetRegionSourceFilterConditionObj) {
	const operatorText = stringifySheetRegionFilterQueryOperator(condition.operator);
	const valueText = stringifySheetRegionFilterQueryConditionValue(condition);

	return [
		stringifySheetRegionFilterQueryCellKey(condition.cellKey),
		operatorText,
		valueText,
	].filter(Boolean).join(' ');
}

/*
 * Return canonical query text for one filter group.
 */
function stringifySheetRegionFilterQueryGroup(
	filter: SheetRegionSourceFilterGroupObj,
	parentCombinator: SheetRegionSourceFilterCombinatorEnum | null,
	root: boolean,
): string {
	const parts = [
		...(filter.conditions || []).map(stringifySheetRegionFilterQueryCondition),
		...(filter.groups || []).map((group) => stringifySheetRegionFilterQueryGroup(group, filter.combinator, false)),
	].filter(Boolean);

	if (!parts.length) {
		return '';
	}

	const text = parts.join(` ${filter.combinator} `);
	return !root && parentCombinator && parentCombinator !== filter.combinator ? `(${text})` : text;
}

/*
 * Convert one structured region source filter object into canonical query text.
 */
export function stringifySheetRegionSourceFilter(filter: SheetRegionSourceFilterGroupObj | null | undefined) {
	return filter ? stringifySheetRegionFilterQueryGroup(filter, null, true) : '';
}

/*
 * Convert one filter query string into a mutation-ready region source filter object.
 */
export function parseSheetRegionSourceFilterString(
	query: string,
	designCells: SheetRegionFilterQueryDesignCell[],
): SheetRegionSourceFilterGroupObj | null {
	const trimmedQuery = query.trim();
	if (!trimmedQuery) {
		return null;
	}

	const state = getSheetRegionFilterQueryParserState(query, designCells);
	return parseSheetRegionFilterQueryState(state);
}

/*
 * Return whether one text filter query can be converted into a mutation-ready region filter input.
 */
export function isSheetRegionSourceFilterStringValid(
	query: string,
	designCells: SheetRegionFilterQueryDesignCell[],
) {
	return !inspectSheetRegionSourceFilterString(query, designCells).error;
}

/*
 * Return parsed filter data, parse errors, and semantic query parts for helper UI.
 */
export function inspectSheetRegionSourceFilterString(
	query: string,
	designCells: SheetRegionFilterQueryDesignCell[],
): SheetRegionFilterQueryInspectResult {
	let state: SheetRegionFilterQueryParserState | null = null;

	try {
		state = getSheetRegionFilterQueryParserState(query, designCells);
		const filter = query.trim() ? parseSheetRegionFilterQueryState(state) : null;

		return {
			error: null,
			filter,
			parts: getSortedSheetRegionFilterQueryParts(state.parts),
		};
	} catch (error) {
		const parseError = error instanceof SheetRegionFilterQueryParseError
			? getSheetRegionFilterQueryError(error.code, error.message, error.startIndex, error.endIndex)
			: getSheetRegionFilterQueryError('UNKNOWN_ERROR', 'Filter query could not be parsed.', 0, query.length);
		const parts: SheetRegionFilterQueryPart[] = [
			...(state?.parts || []),
			{
				endIndex: parseError.endIndex,
				explanation: parseError.message,
				kind: 'error',
				match: getSheetRegionFilterQueryMatch(query, parseError.startIndex, parseError.endIndex),
				startIndex: parseError.startIndex,
			},
		];

		return {
			error: parseError,
			filter: null,
			parts: getSortedSheetRegionFilterQueryParts(parts),
		};
	}
}

/*
 * Return semantic query parts for future overlay and highlighting helpers.
 */
export function splitSheetRegionSourceFilterStringParts(
	query: string,
	designCells: SheetRegionFilterQueryDesignCell[],
) {
	return inspectSheetRegionSourceFilterString(query, designCells).parts;
}

/*
 * Return the semantic query part that contains one zero-based text index.
 */
export function getSheetRegionFilterQueryPartAtIndex(
	parts: SheetRegionFilterQueryPart[],
	index: number | null | undefined,
) {
	if (index === null || index === undefined || index < 0) {
		return null;
	}

	return getSortedSheetRegionFilterQueryParts(parts).find((part) => (
		index >= part.startIndex && index < part.endIndex
	)) || null;
}

/*
 * Return ordered plain and highlighted chunks for rendering a mirrored filter query input.
 */
export function getSheetRegionFilterQueryRenderableParts(
	query: string,
	parts: SheetRegionFilterQueryPart[],
): SheetRegionFilterQueryHighlightChunk[] {
	const chunks: SheetRegionFilterQueryHighlightChunk[] = [];
	const sortedParts = getSortedSheetRegionFilterQueryParts(parts);
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
