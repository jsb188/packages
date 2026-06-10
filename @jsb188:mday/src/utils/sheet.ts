import {
	SHEET_CUSTOM_REGION_SOURCE_CHILD_ORGANIZATION_COLUMNS,
	SHEET_CUSTOM_REGION_SOURCE_CHILD_ORGANIZATIONS,
	SHEET_CELL_SOURCE_TYPE_ENUMS,
	SHEET_DEFAULT_COLUMN_COUNT,
	SHEET_DEFAULT_ROW_COUNT,
	SHEET_REGION_CONFLICT_POLICY_ENUMS,
	SHEET_REGION_SOURCE_TYPE_ENUMS,
	SHEET_REGION_TYPE_ENUMS,
	SHEET_STRUCTURE_OPERATION_ENUMS,
	SHEET_VIEWPORT_MAX_COLUMNS,
	SHEET_VIEWPORT_MAX_ROWS,
	GRID_ITEM_LIST_LIMIT,
} from '../constants/sheet.ts';
import type {
	SheetAxisDesignObj,
	SheetCellBorderStyleValue,
	SheetCellStyleObj,
	SheetCellSourceTypeEnum,
	SheetDesignObj,
	SheetGridViewportObj,
	SheetRangeData,
	SheetRegionConflictPolicyEnum,
	SheetRegionSourceTypeEnum,
	SheetCustomRegionSourceColumnObj,
	SheetRegionTypeEnum,
	SheetStructureOperationEnum,
} from '../types/sheet.d.ts';

/*
 * Return a normalized title value for cursor pagination across grid items.
 */
export function getGridItemTitleCursorValue(item: {
	name?: string | null;
	title?: string | null;
}) {
	return String(item.title || item.name || '').trim().toLowerCase();
}

/*
 * Encode a grid item title cursor value for GraphQL's colon-delimited Cursor scalar.
 */
export function encodeGridItemTitleCursorValue(value: string | null | undefined) {
	return encodeURIComponent(String(value || ''));
}

/*
 * Decode a grid item title cursor value from GraphQL's colon-delimited Cursor scalar.
 */
export function decodeGridItemTitleCursorValue(value: string | null | undefined) {
	try {
		return decodeURIComponent(String(value || ''));
	} catch {
		return String(value || '');
	}
}

/*
 * Return a safe page size for grid item list pagination.
 */
export function getGridItemListLimit(limit?: number | null) {
	return Math.min(GRID_ITEM_LIST_LIMIT, Math.max(0, Math.floor(Number(limit) || GRID_ITEM_LIST_LIMIT)));
}

export type SheetFormulaOperatorTerm<Operator extends string> = {
	expression: string;
	operator: Operator;
};

export type SheetFormulaCellReference = {
	columnIndex: number;
	columnLabel: string;
	rowIndex: number;
};

export type SheetProtectedAxisSpan = {
	endIndex: number;
	startIndex: number;
};

export type SheetFormulaRangeReference = {
	endColumnIndex: number;
	endColumnLabel: string;
	endRowIndex: number;
	startColumnIndex: number;
	startColumnLabel: string;
	startRowIndex: number;
};

export type SheetFormulaCall = {
	args: string[];
	name: string;
	text: string;
};

export type SheetFormulaDataTableCall = {
	cellKey: string;
	dataTableName: string;
	rowIdentifierExpression: string;
	text: string;
};

export type SheetFormulaDataTableQueryOperator =
	| '!='
	| '<'
	| '<='
	| '<>'
	| '='
	| '>'
	| '>=';

export type SheetFormulaDateTimeShorthandName =
	| 'CURRENT_DATE'
	| 'CURRENT_DATETIME';

export type SheetFormulaDataTableQueryCondition = {
	cellKey: string;
	operator: SheetFormulaDataTableQueryOperator;
	text: string;
	valueExpression: string;
	valueNode: SheetFormulaASTNode;
};

export type SheetFormulaDataTableQueryCall = {
	cellKey: string;
	conditions: SheetFormulaDataTableQueryCondition[];
	dataTableName: string;
	text: string;
};

export type SheetFormulaSyntaxIssue = {
	message: string;
	text?: string | null;
};

export type SheetFormulaASTNode =
	| {
		kind: 'BOOLEAN_LITERAL';
		text: string;
		value: boolean;
	}
	| {
		kind: 'CELL_REFERENCE';
		reference: SheetFormulaCellReference;
		text: string;
	}
	| {
		args: SheetFormulaASTNode[];
		kind: 'FUNCTION_CALL';
		name: string;
		text: string;
	}
	| {
		kind: 'DATA_TABLE_QUERY';
		query: SheetFormulaDataTableQueryCall;
		text: string;
	}
	| {
		kind: 'DATE_TIME_SHORTHAND';
		name: SheetFormulaDateTimeShorthandName;
		text: string;
	}
	| {
		kind: 'NUMBER_LITERAL';
		text: string;
		value: number;
	}
	| {
		kind: 'RANGE_REFERENCE';
		reference: SheetFormulaRangeReference;
		text: string;
	}
	| {
		kind: 'STRING_LITERAL';
		text: string;
		value: string;
	}
	| {
		kind: 'BINARY_EXPRESSION';
		left: SheetFormulaASTNode;
		operator: SheetFormulaBinaryOperator;
		right: SheetFormulaASTNode;
		text: string;
	}
	| {
		kind: 'UNARY_EXPRESSION';
		operator: '+' | '-';
		text: string;
		value: SheetFormulaASTNode;
	};

export type SheetFormulaBinaryOperator =
	| '!='
	| '*'
	| '+'
	| '-'
	| '/'
	| '<'
	| '<='
	| '<>'
	| '='
	| '>'
	| '>=';

type SheetFormulaParserState = {
	index: number;
	value: string;
};

export type SheetFormulaReferenceToken =
	| SheetFormulaCellReference & {
		endIndex: number;
		kind: 'SHEET_CELL';
		startIndex: number;
		text: string;
	}
	| SheetFormulaRangeReference & {
		endIndex: number;
		kind: 'SHEET_RANGE';
		startIndex: number;
		text: string;
	}
	| SheetFormulaDataTableCall & {
		endIndex: number;
		kind: 'DATA_TABLE_CELL';
		startIndex: number;
	}
	| SheetFormulaDataTableQueryCall & {
		endIndex: number;
		kind: 'DATA_TABLE_QUERY_CELL';
		startIndex: number;
	};

const SHEET_CELL_BORDER_SIDES = ['Top', 'Right', 'Bottom', 'Left'] as const;
const SHEET_CELL_BORDER_STYLE_VALUES = ['solid', 'dashed', 'dotted', 'double'] as const;
const SHEET_FORMULA_STRING_QUOTE_CHARS = ['"', "'", '`'] as const;
const SHEET_FORMULA_BARE_DATA_TABLE_CELL_KEY_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/;
const SHEET_FORMULA_BARE_STRING_VALUE_PATTERN = /^[A-Za-z_][A-Za-z0-9_-]*$/;
const SHEET_FORMULA_ISO_DATE_VALUE_PATTERN = /^\d{4}-\d{2}-\d{2}(?:[T ][0-9]{2}:[0-9]{2}(?::[0-9]{2}(?:\.[0-9]+)?)?(?:Z|[+-][0-9]{2}:[0-9]{2})?)?$/;

/*
 * Return whether one character starts a supported formula string literal.
 */
function isSheetFormulaStringQuoteChar(char?: string): char is typeof SHEET_FORMULA_STRING_QUOTE_CHARS[number] {
	return SHEET_FORMULA_STRING_QUOTE_CHARS.includes(char as typeof SHEET_FORMULA_STRING_QUOTE_CHARS[number]);
}

/*
 * Return a plain object from flexible saved Sheet style input.
 */
function getSheetCellStyleObject(value?: unknown): Record<string, any> {
	if (!value) {
		return {};
	}

	if (typeof value === 'object' && !Array.isArray(value)) {
		return value as Record<string, any>;
	}

	if (typeof value !== 'string') {
		return {};
	}

	try {
		const parsed = JSON.parse(value);

		return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
	} catch {
		return {};
	}
}

/*
 * Return a positive rounded integer value when a style number is usable.
 */
function normalizeSheetCellStylePositiveInteger(value: unknown) {
	const numberValue = Math.round(Number(value));

	return Number.isFinite(numberValue) && numberValue > 0 ? numberValue : null;
}

/*
 * Return a supported cell border width or null when the side should be disabled.
 */
function normalizeSheetCellBorderWidth(value: unknown) {
	const width = normalizeSheetCellStylePositiveInteger(value);

	return width && width >= 1 && width <= 4 ? width : null;
}

/*
 * Return a supported cell border style or null when the style should be dropped.
 */
function normalizeSheetCellBorderStyle(value: unknown): SheetCellBorderStyleValue | null {
	return SHEET_CELL_BORDER_STYLE_VALUES.includes(value as SheetCellBorderStyleValue)
		? value as SheetCellBorderStyleValue
		: null;
}

/*
 * Return a non-empty style color string or null when the color should be dropped.
 */
function normalizeSheetCellStyleColor(value: unknown) {
	return typeof value === 'string' && value.trim() ? value : null;
}

/*
 * Add normalized border fields for one side into a Sheet style result object.
 */
function addNormalizedSheetCellBorderSideStyle(
	result: SheetCellStyleObj,
	source: Record<string, any>,
	side: typeof SHEET_CELL_BORDER_SIDES[number],
) {
	const widthKey = `border${side}Width` as keyof SheetCellStyleObj;
	const colorKey = `border${side}Color` as keyof SheetCellStyleObj;
	const styleKey = `border${side}Style` as keyof SheetCellStyleObj;
	const width = normalizeSheetCellBorderWidth(source[widthKey]);

	if (!width) {
		return;
	}

	const color = normalizeSheetCellStyleColor(source[colorKey]);
	const style = normalizeSheetCellBorderStyle(source[styleKey]);
	const mutableResult = result as Record<string, any>;

	mutableResult[widthKey] = width;

	if (color) {
		mutableResult[colorKey] = color;
	}

	if (style) {
		mutableResult[styleKey] = style;
	}
}

/*
 * Return the only style fields Sheets currently supports for cells and ranges.
 */
export function normalizeSheetCellStyle(style?: Partial<SheetCellStyleObj> | Record<string, any> | string | null): SheetCellStyleObj {
	const source = getSheetCellStyleObject(style);
	const fontSize = normalizeSheetCellStylePositiveInteger(source.fontSize);
	const normalized: SheetCellStyleObj = {};

	if (fontSize) {
		normalized.fontSize = fontSize;
	}

	const textColor = normalizeSheetCellStyleColor(source.textColor);
	if (textColor) {
		normalized.textColor = textColor;
	}

	const fillColor = normalizeSheetCellStyleColor(source.fillColor);
	if (fillColor) {
		normalized.fillColor = fillColor;
	}

	SHEET_CELL_BORDER_SIDES.forEach((side) => addNormalizedSheetCellBorderSideStyle(normalized, source, side));

	return normalized;
}

/*
 * Return axis design values with supported cell style fields normalized.
 */
function normalizeSheetAxisDesignMap(map?: Record<string, SheetAxisDesignObj> | null) {
	return Object.fromEntries(Object.entries(map || {}).map(([key, value]) => {
		const { style: _style, ...axisDesign } = value || {};
		const style = normalizeSheetCellStyle(_style);

		return [
			key,
			Object.keys(style).length
				? { ...axisDesign, style }
				: axisDesign,
		];
	}));
}

/*
 * Return whether one text input should be treated as a sheet formula.
 */
export function isSheetFormulaText(value: unknown): value is string {
	return typeof value === 'string' && value.trim().startsWith('=');
}

/*
 * Return the expression portion of a formula without the leading equals sign.
 */
export function getSheetFormulaExpression(text: string) {
	return text.trim().replace(/^=/, '').trim();
}

/*
 * Return a normalized data table function identifier.
 */
export function normalizeSheetFormulaDataTableName(value: string) {
	const name = String(value || '').trim().toLowerCase();
	return /^[a-z0-9]+(?:_[a-z0-9]+)*$/.test(name) ? name : '';
}

/*
 * Return whether one character is an identifier character in formula text.
 */
function isSheetFormulaIdentifierChar(char?: string) {
	return Boolean(char && /[A-Za-z0-9_@]/.test(char));
}

/*
 * Return the index after a quoted string literal in formula text.
 */
function getSheetFormulaStringEndIndex(value: string, startIndex: number) {
	const quoteChar = value[startIndex];
	if (!isSheetFormulaStringQuoteChar(quoteChar)) {
		return startIndex;
	}

	let escaped = false;

	for (let index = startIndex + 1; index < value.length; index += 1) {
		const char = value[index];

		if (escaped) {
			escaped = false;
			continue;
		}

		if (char === '\\') {
			escaped = true;
			continue;
		}

		if (char === quoteChar) {
			return index + 1;
		}
	}

	return value.length;
}

/*
 * Return the index after a function call in formula text, respecting nested calls and strings.
 */
function getSheetFormulaCallEndIndex(value: string, openParenIndex: number) {
	let depth = 0;
	let index = openParenIndex;

	while (index < value.length) {
		const char = value[index];

		if (isSheetFormulaStringQuoteChar(char)) {
			index = getSheetFormulaStringEndIndex(value, index);
			continue;
		}

		if (char === '(') {
			depth += 1;
		} else if (char === ')') {
			depth -= 1;

			if (depth === 0) {
				return index + 1;
			}

			if (depth < 0) {
				return null;
			}
		}

		index += 1;
	}

	return null;
}

/*
 * Split a formula string on one top-level separator while respecting strings and calls.
 */
export function splitSheetFormulaTopLevel(value: string, separator: string) {
	const parts: string[] = [];
	let current = '';
	let depth = 0;
	let quoteChar: string | null = null;
	let escaped = false;

	for (let index = 0; index < value.length; index += 1) {
		const char = value[index];

		if (escaped) {
			current += char;
			escaped = false;
			continue;
		}

		if (char === '\\' && quoteChar) {
			current += char;
			escaped = true;
			continue;
		}

		if (quoteChar ? char === quoteChar : isSheetFormulaStringQuoteChar(char)) {
			quoteChar = quoteChar ? null : char;
			current += char;
			continue;
		}

		if (!quoteChar && char === '(') {
			depth += 1;
			current += char;
			continue;
		}

		if (!quoteChar && char === ')') {
			depth = Math.max(0, depth - 1);
			current += char;
			continue;
		}

		if (!quoteChar && depth === 0 && char === separator) {
			parts.push(current.trim());
			current = '';
			continue;
		}

		current += char;
	}

	parts.push(current.trim());
	return parts;
}

/*
 * Return whether a keyword starts at one index with non-identifier boundaries.
 */
function isSheetFormulaTopLevelKeywordAtIndex(value: string, index: number, keyword: string) {
	const previousChar = value[index - 1];
	const nextChar = value[index + keyword.length];

	return value.slice(index, index + keyword.length).toLowerCase() === keyword.toLowerCase() &&
		!isSheetFormulaIdentifierChar(previousChar) &&
		!isSheetFormulaIdentifierChar(nextChar);
}

/*
 * Split a formula string on one top-level keyword while respecting strings and calls.
 */
function splitSheetFormulaTopLevelKeyword(value: string, keyword: string) {
	const parts: string[] = [];
	let current = '';
	let depth = 0;
	let quoteChar: string | null = null;
	let escaped = false;

	for (let index = 0; index < value.length; index += 1) {
		const char = value[index];

		if (escaped) {
			current += char;
			escaped = false;
			continue;
		}

		if (char === '\\' && quoteChar) {
			current += char;
			escaped = true;
			continue;
		}

		if (quoteChar ? char === quoteChar : isSheetFormulaStringQuoteChar(char)) {
			quoteChar = quoteChar ? null : char;
			current += char;
			continue;
		}

		if (!quoteChar && char === '(') {
			depth += 1;
			current += char;
			continue;
		}

		if (!quoteChar && char === ')') {
			depth = Math.max(0, depth - 1);
			current += char;
			continue;
		}

		if (!quoteChar && depth === 0 && isSheetFormulaTopLevelKeywordAtIndex(value, index, keyword)) {
			parts.push(current.trim());
			current = '';
			index += keyword.length - 1;
			continue;
		}

		current += char;
	}

	parts.push(current.trim());
	return parts;
}

/*
 * Parse top-level operator terms while respecting strings, calls, and unary signs.
 */
function parseSheetFormulaOperatorTerms<Operator extends string>(params: {
	defaultOperator: Operator;
	operators: readonly Operator[];
	value: string;
}) {
	const terms: Array<SheetFormulaOperatorTerm<Operator>> = [];
	const operatorSet = new Set<string>(params.operators);
	let current = '';
	let depth = 0;
	let quoteChar: string | null = null;
	let escaped = false;
	let operator = params.defaultOperator;

	for (let index = 0; index < params.value.length; index += 1) {
		const char = params.value[index];

		if (escaped) {
			current += char;
			escaped = false;
			continue;
		}

		if (char === '\\' && quoteChar) {
			current += char;
			escaped = true;
			continue;
		}

		if (quoteChar ? char === quoteChar : isSheetFormulaStringQuoteChar(char)) {
			quoteChar = quoteChar ? null : char;
			current += char;
			continue;
		}

		if (!quoteChar && char === '(') {
			depth += 1;
			current += char;
			continue;
		}

		if (!quoteChar && char === ')') {
			if (depth <= 0) {
				return null;
			}

			depth -= 1;
			current += char;
			continue;
		}

		if (!quoteChar && depth === 0 && operatorSet.has(char)) {
			const expression = current.trim();
			const previousChar = current.trimEnd().slice(-1);

			if ((char === '+' || char === '-') && (!expression || previousChar === '*' || previousChar === '/' || previousChar === '(')) {
				current += char;
				continue;
			}

			if (!expression) {
				return null;
			}

			terms.push({
				operator,
				expression,
			});
			current = '';
			operator = char as Operator;
			continue;
		}

		current += char;
	}

	if (quoteChar || depth !== 0) {
		return null;
	}

	const expression = current.trim();
	if (!expression) {
		return null;
	}

	terms.push({
		operator,
		expression,
	});

	return terms;
}

/*
 * Parse top-level additive operators while preserving signs on numeric literals.
 */
export function parseSheetFormulaAdditiveTerms(value: string) {
	return parseSheetFormulaOperatorTerms({
		defaultOperator: '+' as const,
		operators: ['+', '-'] as const,
		value,
	});
}

/*
 * Parse top-level multiplicative operators while preserving signed right-hand literals.
 */
export function parseSheetFormulaMultiplicativeTerms(value: string) {
	return parseSheetFormulaOperatorTerms({
		defaultOperator: '*' as const,
		operators: ['*', '/'] as const,
		value,
	});
}

/*
 * Return a decoded escape sequence for a flexible formula string literal.
 */
function getSheetFormulaStringEscapeValue(char: string) {
	switch (char) {
		case 'n':
			return '\n';
		case 'r':
			return '\r';
		case 't':
			return '\t';
		default:
			return char;
	}
}

/*
 * Parse a formula string literal quoted with double quotes, single quotes, or backticks.
 */
export function parseSheetFormulaStringLiteral(value: string) {
	const trimmed = value.trim();
	const quoteChar = trimmed[0];
	if (!isSheetFormulaStringQuoteChar(quoteChar) || trimmed[trimmed.length - 1] !== quoteChar) {
		return null;
	}

	if (quoteChar === '"') {
		try {
			const parsed = JSON.parse(trimmed);
			return typeof parsed === 'string' ? parsed : null;
		} catch {
			return null;
		}
	}

	let escaped = false;
	let result = '';

	for (let index = 1; index < trimmed.length - 1; index += 1) {
		const char = trimmed[index];

		if (escaped) {
			result += getSheetFormulaStringEscapeValue(char);
			escaped = false;
			continue;
		}

		if (char === '\\') {
			escaped = true;
			continue;
		}

		if (char === quoteChar) {
			return null;
		}

		result += char;
	}

	return escaped ? null : result;
}

/*
 * Parse a formula number literal.
 */
export function parseSheetFormulaNumberLiteral(value: string) {
	const trimmed = value.trim();
	return /^[-+]?\d+(?:\.\d+)?$/.test(trimmed) ? Number(trimmed) : null;
}

/*
 * Return the current parser offset after any whitespace.
 */
function skipSheetFormulaParserWhitespace(state: SheetFormulaParserState) {
	while (/\s/.test(state.value[state.index] || '')) {
		state.index += 1;
	}
}

/*
 * Return source text covered by one parser span.
 */
function getSheetFormulaParserSpanText(state: SheetFormulaParserState, startIndex: number) {
	return state.value.slice(startIndex, state.index).trim();
}

/*
 * Return whether the parser has consumed the full formula expression.
 */
function isSheetFormulaParserAtEnd(state: SheetFormulaParserState) {
	skipSheetFormulaParserWhitespace(state);
	return state.index >= state.value.length;
}

/*
 * Return a parsed function or identifier name at the current parser position.
 */
function parseSheetFormulaIdentifierName(state: SheetFormulaParserState) {
	const match = state.value.slice(state.index).match(/^@?[A-Za-z_][A-Za-z0-9_]*/);
	if (!match) {
		return null;
	}

	state.index += match[0].length;
	return match[0];
}

/*
 * Return a parsed cell reference at the current parser position.
 */
function parseSheetFormulaCellReferenceAtState(state: SheetFormulaParserState) {
	const match = state.value.slice(state.index).match(/^([A-Za-z]+[1-9]\d*)/);
	if (!match) {
		return null;
	}

	const nextChar = state.value[state.index + match[1].length];
	if (isSheetFormulaIdentifierChar(nextChar)) {
		return null;
	}

	const reference = parseSheetFormulaCellReference(match[1]);
	if (!reference) {
		return null;
	}

	state.index += match[1].length;
	return {
		reference,
		text: match[1],
	};
}

/*
 * Return a range reference with ordered corners.
 */
function buildSheetFormulaRangeReference(
	start: SheetFormulaCellReference,
	end: SheetFormulaCellReference,
): SheetFormulaRangeReference {
	const startColumnIndex = Math.min(start.columnIndex, end.columnIndex);
	const endColumnIndex = Math.max(start.columnIndex, end.columnIndex);
	const startRowIndex = Math.min(start.rowIndex, end.rowIndex);
	const endRowIndex = Math.max(start.rowIndex, end.rowIndex);

	return {
		endColumnIndex,
		endColumnLabel: start.columnIndex <= end.columnIndex ? end.columnLabel : start.columnLabel,
		endRowIndex,
		startColumnIndex,
		startColumnLabel: start.columnIndex <= end.columnIndex ? start.columnLabel : end.columnLabel,
		startRowIndex,
	};
}

/*
 * Return a parsed range reference from a complete formula expression.
 */
export function parseSheetFormulaRangeReference(value: string): SheetFormulaRangeReference | null {
	const state = {
		index: 0,
		value: value.trim(),
	};
	const start = parseSheetFormulaCellReferenceAtState(state);
	if (!start) {
		return null;
	}

	skipSheetFormulaParserWhitespace(state);
	if (state.value[state.index] !== ':') {
		return null;
	}

	state.index += 1;
	skipSheetFormulaParserWhitespace(state);
	const end = parseSheetFormulaCellReferenceAtState(state);
	if (!end || !isSheetFormulaParserAtEnd(state)) {
		return null;
	}

	return buildSheetFormulaRangeReference(start.reference, end.reference);
}

/*
 * Return a parsed string literal node at the current parser position.
 */
function parseSheetFormulaStringNode(state: SheetFormulaParserState): SheetFormulaASTNode | null {
	if (!isSheetFormulaStringQuoteChar(state.value[state.index])) {
		return null;
	}

	const startIndex = state.index;
	const endIndex = getSheetFormulaStringEndIndex(state.value, state.index);
	const text = state.value.slice(startIndex, endIndex);
	const value = parseSheetFormulaStringLiteral(text);
	if (value === null) {
		return null;
	}

	state.index = endIndex;
	return {
		kind: 'STRING_LITERAL',
		text,
		value,
	};
}

/*
 * Return a parsed number literal node at the current parser position.
 */
function parseSheetFormulaNumberNode(state: SheetFormulaParserState): SheetFormulaASTNode | null {
	const match = state.value.slice(state.index).match(/^(?:\d+(?:\.\d+)?|\.\d+)/);
	if (!match) {
		return null;
	}

	const nextChar = state.value[state.index + match[0].length];
	if (isSheetFormulaIdentifierChar(nextChar)) {
		return null;
	}

	state.index += match[0].length;
	return {
		kind: 'NUMBER_LITERAL',
		text: match[0],
		value: Number(match[0]),
	};
}

/*
 * Return a parsed comma-separated function argument list.
 */
function parseSheetFormulaFunctionArguments(state: SheetFormulaParserState) {
	const args: SheetFormulaASTNode[] = [];
	skipSheetFormulaParserWhitespace(state);
	if (state.value[state.index] === ')') {
		state.index += 1;
		return args;
	}

	while (state.index < state.value.length) {
		const arg = parseSheetFormulaComparisonExpression(state);
		if (!arg) {
			return null;
		}

		args.push(arg);
		skipSheetFormulaParserWhitespace(state);
		const char = state.value[state.index];

		if (char === ')') {
			state.index += 1;
			return args;
		}

		if (char !== ',') {
			return null;
		}

		state.index += 1;
	}

	return null;
}

/*
 * Return a parsed data table lookup function node with a normalized field-key argument.
 */
function parseSheetFormulaDataTableFunctionCallNode(
	state: SheetFormulaParserState,
	name: string,
	startIndex: number,
): Extract<SheetFormulaASTNode, { kind: 'FUNCTION_CALL' }> | null {
	if (!name.startsWith('@')) {
		return null;
	}

	const endIndex = getSheetFormulaCallEndIndex(state.value, state.index);
	if (!endIndex) {
		return null;
	}

	const text = state.value.slice(startIndex, endIndex).trim();
	const dataTableCall = parseSheetFormulaDataTableCall(text);
	const call = dataTableCall ? parseSheetFormulaCall(text) : null;
	const rowIdentifierNode = dataTableCall ? parseSheetFormulaExpression(dataTableCall.rowIdentifierExpression) : null;
	if (!dataTableCall || !call || !rowIdentifierNode) {
		return null;
	}

	state.index = endIndex;
	return {
		args: [
			rowIdentifierNode,
			{
				kind: 'STRING_LITERAL',
				text: call.args[1].trim(),
				value: dataTableCall.cellKey,
			},
		],
		kind: 'FUNCTION_CALL',
		name,
		text,
	};
}

/*
 * Return a parsed function call node for one already-read function name.
 */
function parseSheetFormulaFunctionCallNode(
	state: SheetFormulaParserState,
	name: string,
	startIndex: number,
): SheetFormulaASTNode | null {
	state.index += 1;
	const args = parseSheetFormulaFunctionArguments(state);
	if (!args) {
		return null;
	}

	return {
		args,
		kind: 'FUNCTION_CALL',
		name,
		text: state.value.slice(startIndex, state.index).trim(),
	};
}

/*
 * Return a parsed cell or range reference node at the current parser position.
 */
function parseSheetFormulaReferenceNode(state: SheetFormulaParserState): SheetFormulaASTNode | null {
	const startIndex = state.index;
	const start = parseSheetFormulaCellReferenceAtState(state);
	if (!start) {
		return null;
	}

	skipSheetFormulaParserWhitespace(state);
	if (state.value[state.index] !== ':') {
		return {
			kind: 'CELL_REFERENCE',
			reference: start.reference,
			text: start.text,
		};
	}

	state.index += 1;
	skipSheetFormulaParserWhitespace(state);
	const end = parseSheetFormulaCellReferenceAtState(state);
	if (!end) {
		return null;
	}

	return {
		kind: 'RANGE_REFERENCE',
		reference: buildSheetFormulaRangeReference(start.reference, end.reference),
		text: state.value.slice(startIndex, state.index).trim(),
	};
}

/*
 * Return a parsed identifier-backed node such as a boolean, function call, or reference.
 */
function parseSheetFormulaIdentifierNode(state: SheetFormulaParserState): SheetFormulaASTNode | null {
	const startIndex = state.index;
	const reference = parseSheetFormulaReferenceNode(state);
	if (reference) {
		return reference;
	}

	state.index = startIndex;
	const name = parseSheetFormulaIdentifierName(state);
	if (!name) {
		return null;
	}

	skipSheetFormulaParserWhitespace(state);
	if (state.value[state.index] === '(') {
		return parseSheetFormulaDataTableFunctionCallNode(state, name, startIndex) ||
			parseSheetFormulaFunctionCallNode(state, name, startIndex);
	}

	if (/^(?:true|false)$/i.test(name)) {
		return {
			kind: 'BOOLEAN_LITERAL',
			text: name,
			value: /^true$/i.test(name),
		};
	}

	return null;
}

/*
 * Return a parsed grouped or atomic formula expression.
 */
function parseSheetFormulaPrimaryExpression(state: SheetFormulaParserState): SheetFormulaASTNode | null {
	skipSheetFormulaParserWhitespace(state);
	const startIndex = state.index;

	if (state.value[state.index] === '(') {
		state.index += 1;
		const node = parseSheetFormulaComparisonExpression(state);
		skipSheetFormulaParserWhitespace(state);
		if (!node || state.value[state.index] !== ')') {
			return null;
		}

		state.index += 1;
		return {
			...node,
			text: state.value.slice(startIndex, state.index).trim(),
		};
	}

	return parseSheetFormulaStringNode(state) ||
		parseSheetFormulaNumberNode(state) ||
		parseSheetFormulaIdentifierNode(state);
}

/*
 * Return a parsed unary formula expression.
 */
function parseSheetFormulaUnaryExpression(state: SheetFormulaParserState): SheetFormulaASTNode | null {
	skipSheetFormulaParserWhitespace(state);
	const startIndex = state.index;
	const operator = state.value[state.index];
	if (operator === '+' || operator === '-') {
		state.index += 1;
		const value = parseSheetFormulaUnaryExpression(state);
		if (!value) {
			return null;
		}

		return {
			kind: 'UNARY_EXPRESSION',
			operator,
			text: state.value.slice(startIndex, state.index).trim(),
			value,
		};
	}

	return parseSheetFormulaPrimaryExpression(state);
}

/*
 * Return a parsed left-associative binary expression for the provided operators.
 */
function parseSheetFormulaBinaryExpression(
	state: SheetFormulaParserState,
	parseOperand: (state: SheetFormulaParserState) => SheetFormulaASTNode | null,
	operators: readonly SheetFormulaBinaryOperator[],
) {
	let left = parseOperand(state);
	if (!left) {
		return null;
	}

	while (state.index < state.value.length) {
		skipSheetFormulaParserWhitespace(state);
		const operator = operators.find((candidate) => state.value.slice(state.index).startsWith(candidate));
		if (!operator) {
			break;
		}

		const startIndex = state.index;
		state.index += operator.length;
		const right = parseOperand(state);
		if (!right) {
			state.index = startIndex;
			return null;
		}

		left = {
			kind: 'BINARY_EXPRESSION',
			left,
			operator,
			right,
			text: `${left.text}${operator}${right.text}`,
		};
	}

	return left;
}

/*
 * Return a parsed multiplicative formula expression.
 */
function parseSheetFormulaMultiplicativeExpressionNode(state: SheetFormulaParserState) {
	return parseSheetFormulaBinaryExpression(
		state,
		parseSheetFormulaUnaryExpression,
		['*', '/'] as const,
	);
}

/*
 * Return a parsed additive formula expression.
 */
function parseSheetFormulaAdditiveExpressionNode(state: SheetFormulaParserState) {
	return parseSheetFormulaBinaryExpression(
		state,
		parseSheetFormulaMultiplicativeExpressionNode,
		['+', '-'] as const,
	);
}

/*
 * Return a parsed comparison formula expression.
 */
function parseSheetFormulaComparisonExpression(state: SheetFormulaParserState): SheetFormulaASTNode | null {
	return parseSheetFormulaBinaryExpression(
		state,
		parseSheetFormulaAdditiveExpressionNode,
		['<=', '>=', '<>', '!=', '=', '<', '>'] as const,
	);
}

/*
 * Parse one full formula expression into an AST node.
 */
export function parseSheetFormulaExpression(value: string): SheetFormulaASTNode | null {
	const dataTableQuery = parseSheetFormulaDataTableQueryCall(value);
	if (dataTableQuery) {
		return {
			kind: 'DATA_TABLE_QUERY',
			query: dataTableQuery,
			text: dataTableQuery.text,
		};
	}

	const state = {
		index: 0,
		value: value.trim(),
	};
	const node = parseSheetFormulaComparisonExpression(state);

	return node && isSheetFormulaParserAtEnd(state)
		? {
			...node,
			text: getSheetFormulaParserSpanText(state, 0),
		}
		: null;
}

/*
 * Return a one-based column index from a spreadsheet-style column label.
 */
export function getSheetFormulaColumnIndex(columnLabel: string) {
	return columnLabel.toUpperCase().split('').reduce((index, char) => {
		return index * 26 + char.charCodeAt(0) - 64;
	}, 0);
}

/*
 * Parse a spreadsheet-style cell reference like C12.
 */
export function parseSheetFormulaCellReference(value: string): SheetFormulaCellReference | null {
	const match = value.trim().match(/^([A-Za-z]+)([1-9]\d*)$/);
	if (!match) {
		return null;
	}

	const columnLabel = match[1].toUpperCase();
	const columnIndex = getSheetFormulaColumnIndex(columnLabel);
	const rowIndex = Number(match[2]);

	return {
		columnIndex,
		columnLabel,
		rowIndex,
	};
}

/*
 * Parse a formula function call by name.
 */
export function parseSheetFormulaCall(value: string, functionName?: string | null): SheetFormulaCall | null {
	const trimmed = value.trim();
	const match = trimmed.match(/^(@?[A-Za-z_][A-Za-z0-9_]*)\s*\(/);
	if (!match || !trimmed.endsWith(')')) {
		return null;
	}

	const name = match[1];
	if (functionName && name.toLowerCase() !== functionName.toLowerCase()) {
		return null;
	}

	const argsText = trimmed.slice(match[0].length, -1);
	return {
		args: splitSheetFormulaTopLevel(argsText, ','),
		name,
		text: trimmed,
	};
}

/*
 * Parse a data table field key expression, keeping cell-like values as cell references.
 */
function parseSheetFormulaDataTableCellKeyExpression(value: string) {
	const trimmed = value.trim();
	const stringLiteral = parseSheetFormulaStringLiteral(trimmed);
	if (stringLiteral !== null) {
		return stringLiteral;
	}

	if (!SHEET_FORMULA_BARE_DATA_TABLE_CELL_KEY_PATTERN.test(trimmed) || parseSheetFormulaCellReference(trimmed)) {
		return null;
	}

	return trimmed;
}

/*
 * Parse a data table formula call such as @organizations("row", "category") or organizations("row", "category").
 */
export function parseSheetFormulaDataTableCall(value: string): SheetFormulaDataTableCall | null {
	const call = parseSheetFormulaCall(value);
	if (!call) {
		return null;
	}

	const dataTableName = normalizeSheetFormulaDataTableName(call.name.startsWith('@') ? call.name.slice(1) : call.name);
	if (!dataTableName || call.args.length !== 2) {
		return null;
	}

	const cellKey = parseSheetFormulaDataTableCellKeyExpression(call.args[1]);
	if (!cellKey) {
		return null;
	}

	return {
		cellKey,
		dataTableName,
		rowIdentifierExpression: call.args[0],
		text: call.text,
	};
}

/*
 * Return the canonical formula date/time shorthand name for a bare or called identifier.
 */
function normalizeSheetFormulaDateTimeShorthandName(value: string): SheetFormulaDateTimeShorthandName | null {
	const normalized = value.trim().toUpperCase();

	if (normalized === 'TODAY' || normalized === 'CURRENT_DATE') {
		return 'CURRENT_DATE';
	}

	if (normalized === 'NOW' || normalized === 'CURRENT_DATETIME') {
		return 'CURRENT_DATETIME';
	}

	return null;
}

/*
 * Parse a supported query date/time shorthand such as TODAY or NOW().
 */
export function parseSheetFormulaDateTimeShorthand(value: string): Extract<SheetFormulaASTNode, { kind: 'DATE_TIME_SHORTHAND' }> | null {
	const trimmed = value.trim();
	const call = parseSheetFormulaCall(trimmed);
	const isEmptyCall = call ? call.args.length === 0 || (call.args.length === 1 && call.args[0].trim() === '') : false;
	const shorthandName = call
		? isEmptyCall ? normalizeSheetFormulaDateTimeShorthandName(call.name) : null
		: normalizeSheetFormulaDateTimeShorthandName(trimmed);

	return shorthandName
		? {
			kind: 'DATE_TIME_SHORTHAND',
			name: shorthandName,
			text: trimmed,
		}
		: null;
}

/*
 * Parse a query condition's left-side dataTable cell key.
 */
function parseSheetFormulaDataTableQueryConditionCellKey(value: string) {
	const trimmed = value.trimStart();
	const offset = value.length - trimmed.length;

	if (isSheetFormulaStringQuoteChar(trimmed[0])) {
		const endIndex = getSheetFormulaStringEndIndex(trimmed, 0);
		const text = trimmed.slice(0, endIndex);
		const cellKey = parseSheetFormulaStringLiteral(text);
		return cellKey
			? {
				cellKey,
				endIndex: offset + endIndex,
			}
			: null;
	}

	const match = trimmed.match(/^[A-Za-z_][A-Za-z0-9_]*/);
	return match
		? {
			cellKey: match[0],
			endIndex: offset + match[0].length,
		}
		: null;
}

/*
 * Parse a query condition value using the flexible data-table query grammar.
 */
function parseSheetFormulaDataTableQueryValueExpression(value: string): SheetFormulaASTNode | null {
	const trimmed = value.trim();
	if (!trimmed) {
		return null;
	}

	const shorthandNode = parseSheetFormulaDateTimeShorthand(trimmed);
	if (shorthandNode) {
		return shorthandNode;
	}

	if (SHEET_FORMULA_ISO_DATE_VALUE_PATTERN.test(trimmed)) {
		return {
			kind: 'STRING_LITERAL',
			text: trimmed,
			value: trimmed,
		};
	}

	const expressionNode = parseSheetFormulaExpression(trimmed);
	if (expressionNode) {
		return expressionNode;
	}

	if (SHEET_FORMULA_BARE_STRING_VALUE_PATTERN.test(trimmed) && !parseSheetFormulaCellReference(trimmed)) {
		return {
			kind: 'STRING_LITERAL',
			text: trimmed,
			value: trimmed,
		};
	}

	return null;
}

/*
 * Parse one dataTable query WHERE condition.
 */
function parseSheetFormulaDataTableQueryCondition(value: string): SheetFormulaDataTableQueryCondition | null {
	const cellKey = parseSheetFormulaDataTableQueryConditionCellKey(value);
	if (!cellKey) {
		return null;
	}

	const rest = value.slice(cellKey.endIndex).trimStart();
	const operatorMatch = rest.match(/^(<=|>=|<>|!=|=|<|>)/);
	if (!operatorMatch) {
		return null;
	}

	const operator = operatorMatch[1] as SheetFormulaDataTableQueryOperator;
	const valueExpression = rest.slice(operator.length).trim();
	const valueNode = valueExpression ? parseSheetFormulaDataTableQueryValueExpression(valueExpression) : null;
	if (
		!valueNode ||
		(
			valueNode.kind !== 'STRING_LITERAL' &&
			valueNode.kind !== 'NUMBER_LITERAL' &&
			valueNode.kind !== 'BOOLEAN_LITERAL' &&
			valueNode.kind !== 'CELL_REFERENCE' &&
			valueNode.kind !== 'DATE_TIME_SHORTHAND'
		)
	) {
		return null;
	}

	return {
		cellKey: cellKey.cellKey,
		operator,
		text: value.trim(),
		valueExpression,
		valueNode,
	};
}

/*
 * Return a readable formula syntax issue for one invalid query condition.
 */
function getSheetFormulaDataTableQueryConditionSyntaxIssue(value: string): SheetFormulaSyntaxIssue | null {
	const trimmed = value.trim();
	if (!trimmed) {
		return null;
	}

	const cellKey = parseSheetFormulaDataTableQueryConditionCellKey(value);
	if (!cellKey) {
		return {
			message: 'Query conditions must start with a field key.',
			text: trimmed,
		};
	}

	const rest = value.slice(cellKey.endIndex).trimStart();
	const operatorMatch = rest.match(/^(<=|>=|<>|!=|=|<|>)/);
	if (!operatorMatch) {
		return {
			message: 'Query condition is missing a comparison operator such as =, !=, <, or >.',
			text: trimmed,
		};
	}

	const valueExpression = rest.slice(operatorMatch[1].length).trim();
	if (!valueExpression) {
		return {
			message: 'Query condition is missing a value after the operator.',
			text: trimmed,
		};
	}

	const valueNode = parseSheetFormulaDataTableQueryValueExpression(valueExpression);
	if (!valueNode) {
		return {
			message: 'Query condition value could not be parsed.',
			text: valueExpression,
		};
	}

	if (
		valueNode.kind !== 'STRING_LITERAL' &&
		valueNode.kind !== 'NUMBER_LITERAL' &&
		valueNode.kind !== 'BOOLEAN_LITERAL' &&
		valueNode.kind !== 'CELL_REFERENCE' &&
		valueNode.kind !== 'DATE_TIME_SHORTHAND'
	) {
		return {
			message: 'Query condition value must be a string, number, boolean, cell reference, TODAY, or NOW().',
			text: valueExpression,
		};
	}

	return null;
}

/*
 * Parse AND-joined dataTable query WHERE conditions.
 */
function parseSheetFormulaDataTableQueryConditions(value: string) {
	const conditionTexts = splitSheetFormulaTopLevelKeyword(value, 'AND').filter(Boolean);
	if (!conditionTexts.length) {
		return null;
	}

	const conditions = conditionTexts.map(parseSheetFormulaDataTableQueryCondition);
	return conditions.every((condition): condition is SheetFormulaDataTableQueryCondition => Boolean(condition))
		? conditions
		: null;
}

/*
 * Parse a data table query formula such as @orders("total") WHERE id = A1.
 */
export function parseSheetFormulaDataTableQueryCall(value: string): SheetFormulaDataTableQueryCall | null {
	const trimmed = value.trim();
	const match = trimmed.match(/^(@?[A-Za-z_][A-Za-z0-9_]*)\s*\(/);
	if (!match) {
		return null;
	}

	const openParenIndex = match[0].lastIndexOf('(');
	const callEndIndex = getSheetFormulaCallEndIndex(trimmed, openParenIndex);
	if (!callEndIndex) {
		return null;
	}

	const call = parseSheetFormulaCall(trimmed.slice(0, callEndIndex));
	const whereText = trimmed.slice(callEndIndex).trim();
	if (!call || !/^WHERE\b/i.test(whereText)) {
		return null;
	}

	const dataTableName = normalizeSheetFormulaDataTableName(call.name.startsWith('@') ? call.name.slice(1) : call.name);
	const cellKey = call.args.length === 1 ? parseSheetFormulaDataTableCellKeyExpression(call.args[0]) : null;
	const conditions = parseSheetFormulaDataTableQueryConditions(whereText.replace(/^WHERE\b/i, '').trim());
	if (!dataTableName || !cellKey || !conditions) {
		return null;
	}

	return {
		cellKey,
		conditions,
		dataTableName,
		text: trimmed,
	};
}

/*
 * Return syntax issues for a data table query formula that could not be parsed.
 */
function getSheetFormulaDataTableQuerySyntaxIssues(value: string): SheetFormulaSyntaxIssue[] {
	const trimmed = value.trim();
	const match = trimmed.match(/^(@?[A-Za-z_][A-Za-z0-9_]*)\s*\(/);
	if (!match) {
		return [];
	}

	const openParenIndex = match[0].lastIndexOf('(');
	const callEndIndex = getSheetFormulaCallEndIndex(trimmed, openParenIndex);
	if (!callEndIndex) {
		return [{
			message: 'Data table query call is missing a closing parenthesis.',
			text: trimmed,
		}];
	}

	const callText = trimmed.slice(0, callEndIndex);
	const call = parseSheetFormulaCall(callText);
	const whereText = trimmed.slice(callEndIndex).trim();
	const issues: SheetFormulaSyntaxIssue[] = [];
	if (!call) {
		issues.push({
			message: 'Data table query call could not be parsed.',
			text: callText,
		});
	}

	const resultKeyText = call?.args.length === 1 ? call.args[0].trim() : '';
	if (!call || call.args.length !== 1 || parseSheetFormulaDataTableCellKeyExpression(resultKeyText) === null) {
		issues.push({
			message: 'Data table query result field must be a quoted or bare field key, for example @attendance(attended). Quote field keys that look like cell references.',
			text: resultKeyText || callText,
		});
	}

	if (!/^WHERE\b/i.test(whereText)) {
		issues.push({
			message: 'Data table query must include a WHERE clause after the call.',
			text: whereText || trimmed,
		});
		return issues;
	}

	const conditionText = whereText.replace(/^WHERE\b/i, '').trim();
	const conditionParts = splitSheetFormulaTopLevelKeyword(conditionText, 'AND').filter(Boolean);
	if (!conditionParts.length) {
		issues.push({
			message: 'WHERE clause must include at least one condition.',
			text: whereText,
		});
		return issues;
	}

	for (const conditionPart of conditionParts) {
		const issue = getSheetFormulaDataTableQueryConditionSyntaxIssue(conditionPart);
		if (issue) {
			issues.push(issue);
		}
	}

	return issues;
}

/*
 * Return a concise syntax error message that points at the unsupported formula parts.
 */
export function getSheetFormulaSyntaxErrorMessage(value: string) {
	const trimmed = value.trim();
	const queryIssues = getSheetFormulaDataTableQuerySyntaxIssues(trimmed);
	if (queryIssues.length) {
		const issueText = queryIssues
			.map((issue) => issue.text ? `${issue.text}: ${issue.message}` : issue.message)
			.join(' ');

		return `Formula syntax is not supported. ${issueText}`;
	}

	const state = {
		index: 0,
		value: trimmed,
	};
	const node = parseSheetFormulaComparisonExpression(state);
	if (node) {
		skipSheetFormulaParserWhitespace(state);
		const unsupportedText = trimmed.slice(state.index).trim();
		if (unsupportedText) {
			return `Formula syntax is not supported. Unsupported part: ${unsupportedText}`;
		}
	}

	return 'Formula syntax is not supported.';
}

/*
 * Return a stable key for resolved dataTable query condition values.
 */
export function getSheetFormulaDataTableQueryConditionKey(conditions: Array<{
	cellKey: string;
	keyValue?: unknown;
	operator: SheetFormulaDataTableQueryOperator;
	value: unknown;
}>) {
	return JSON.stringify(conditions.map((condition) => ({
		cellKey: condition.cellKey,
		operator: condition.operator,
		value: condition.keyValue === null || condition.keyValue === undefined
			? condition.value === null || condition.value === undefined ? null : String(condition.value)
			: String(condition.keyValue),
	})));
}

/*
 * Return a data table query reference token at one formula text index, when one starts there.
 */
function getSheetFormulaDataTableQueryReferenceTokenAtIndex(value: string, startIndex: number): SheetFormulaReferenceToken | null {
	const query = parseSheetFormulaDataTableQueryCall(value.slice(startIndex));
	if (!query) {
		return null;
	}

	return {
		...query,
		endIndex: startIndex + query.text.length,
		kind: 'DATA_TABLE_QUERY_CELL',
		startIndex,
		text: query.text,
	};
}

/*
 * Return a data table reference token at one formula text index, when one starts there.
 */
function getSheetFormulaDataTableReferenceTokenAtIndex(value: string, startIndex: number): SheetFormulaReferenceToken | null {
	const slice = value.slice(startIndex);
	const match = slice.match(/^@?[A-Za-z_][A-Za-z0-9_]*\s*\(/);
	if (!match) {
		return null;
	}

	const openParenIndex = startIndex + match[0].lastIndexOf('(');
	const endIndex = getSheetFormulaCallEndIndex(value, openParenIndex);
	if (!endIndex) {
		return null;
	}

	const text = value.slice(startIndex, endIndex);
	const dataTableCall = parseSheetFormulaDataTableCall(text);
	if (!dataTableCall) {
		return null;
	}

	return {
		...dataTableCall,
		endIndex,
		kind: 'DATA_TABLE_CELL',
		startIndex,
		text,
	};
}

/*
 * Return a sheet cell reference token at one formula text index, when one starts there.
 */
function getSheetFormulaCellReferenceTokenAtIndex(value: string, startIndex: number): SheetFormulaReferenceToken | null {
	const match = value.slice(startIndex).match(/^([A-Za-z]+[1-9]\d*)/);
	if (!match) {
		return null;
	}

	const endIndex = startIndex + match[1].length;
	if (isSheetFormulaIdentifierChar(value[endIndex])) {
		return null;
	}

	const cellReference = parseSheetFormulaCellReference(match[1]);
	if (!cellReference) {
		return null;
	}

	return {
		...cellReference,
		endIndex,
		kind: 'SHEET_CELL',
		startIndex,
		text: match[1],
	};
}

/*
 * Return a sheet range reference token at one formula text index, when one starts there.
 */
function getSheetFormulaRangeReferenceTokenAtIndex(value: string, startIndex: number): SheetFormulaReferenceToken | null {
	const match = value.slice(startIndex).match(/^([A-Za-z]+[1-9]\d*)\s*:\s*([A-Za-z]+[1-9]\d*)/);
	if (!match) {
		return null;
	}

	const endIndex = startIndex + match[0].length;
	if (isSheetFormulaIdentifierChar(value[endIndex])) {
		return null;
	}

	const rangeReference = parseSheetFormulaRangeReference(match[0]);
	if (!rangeReference) {
		return null;
	}

	return {
		...rangeReference,
		endIndex,
		kind: 'SHEET_RANGE',
		startIndex,
		text: match[0],
	};
}

/*
 * Return reference tokens from formula text for live client highlighting.
 */
export function tokenizeSheetFormulaReferences(value: string): SheetFormulaReferenceToken[] {
	const tokens: SheetFormulaReferenceToken[] = [];
	let index = 0;

	while (index < value.length) {
		const char = value[index];

		if (isSheetFormulaStringQuoteChar(char)) {
			index = getSheetFormulaStringEndIndex(value, index);
			continue;
		}

		if (isSheetFormulaIdentifierChar(value[index - 1])) {
			index += 1;
			continue;
		}

		const dataTableQueryToken = getSheetFormulaDataTableQueryReferenceTokenAtIndex(value, index);
		if (dataTableQueryToken) {
			tokens.push(dataTableQueryToken);
			index = dataTableQueryToken.endIndex;
			continue;
		}

		const dataTableToken = getSheetFormulaDataTableReferenceTokenAtIndex(value, index);
		if (dataTableToken) {
			tokens.push(dataTableToken);
			index = dataTableToken.endIndex;
			continue;
		}

		const rangeToken = getSheetFormulaRangeReferenceTokenAtIndex(value, index);
		if (rangeToken) {
			tokens.push(rangeToken);
			index = rangeToken.endIndex;
			continue;
		}

		const cellToken = getSheetFormulaCellReferenceTokenAtIndex(value, index);
		if (cellToken) {
			tokens.push(cellToken);
			index = cellToken.endIndex;
			continue;
		}

		index += 1;
	}

	return tokens;
}

/*
 * Return a fresh default sheet design object.
 */

export function getDefaultSheetDesign(): SheetDesignObj {
	return {
		version: 1,
		grid: {
			rowCount: SHEET_DEFAULT_ROW_COUNT,
			columnCount: SHEET_DEFAULT_COLUMN_COUNT,
			frozenRows: 0,
			frozenColumns: 0,
		},
		columns: {},
		rows: {},
		defaultCellStyle: {},
		defaultCellFormat: {},
		namedRanges: [],
		metadata: {},
	};
}

/*
 * Return a sheet design object with all top-level defaults filled in.
 */

export function normalizeSheetDesign(design?: Partial<SheetDesignObj> | null): SheetDesignObj {
	const baseDesign = getDefaultSheetDesign();
	const grid: Partial<SheetDesignObj['grid']> = design?.grid || {};

	return {
		...baseDesign,
		...(design || {}),
		version: Number(design?.version || baseDesign.version),
		grid: {
			rowCount: Math.max(1, Math.floor(Number(grid.rowCount || baseDesign.grid.rowCount))),
			columnCount: Math.max(1, Math.floor(Number(grid.columnCount || baseDesign.grid.columnCount))),
			frozenRows: Math.max(0, Math.floor(Number(grid.frozenRows || 0))),
			frozenColumns: Math.max(0, Math.floor(Number(grid.frozenColumns || 0))),
		},
		columns: normalizeSheetAxisDesignMap(design?.columns),
		rows: normalizeSheetAxisDesignMap(design?.rows),
		defaultCellStyle: normalizeSheetCellStyle(design?.defaultCellStyle),
		defaultCellFormat: design?.defaultCellFormat || {},
		namedRanges: Array.isArray(design?.namedRanges) ? design.namedRanges : [],
		metadata: design?.metadata || {},
	};
}

/*
 * Return a viewport bounded to positive indexes and backend query limits.
 */

export function normalizeSheetViewport(viewport: Partial<SheetGridViewportObj>): SheetGridViewportObj {
	return {
		startRowIndex: Math.max(1, Math.floor(Number(viewport.startRowIndex || 1))),
		startColumnIndex: Math.max(1, Math.floor(Number(viewport.startColumnIndex || 1))),
		rowCount: Math.min(SHEET_VIEWPORT_MAX_ROWS, Math.max(1, Math.floor(Number(viewport.rowCount || 1)))),
		columnCount: Math.min(SHEET_VIEWPORT_MAX_COLUMNS, Math.max(1, Math.floor(Number(viewport.columnCount || 1)))),
	};
}

/*
 * Return whether one value is a known stored sheet cell source type.
 */

export function isSheetCellSourceType(value: unknown): value is SheetCellSourceTypeEnum {
	return SHEET_CELL_SOURCE_TYPE_ENUMS.includes(value as SheetCellSourceTypeEnum);
}

/*
 * Return whether one value is a known sheet region type.
 */

export function isSheetRegionType(value: unknown): value is SheetRegionTypeEnum {
	return SHEET_REGION_TYPE_ENUMS.includes(value as SheetRegionTypeEnum);
}

/*
 * Return whether one value is a known sheet region source type.
 */

export function isSheetRegionSourceType(value: unknown): value is SheetRegionSourceTypeEnum {
	return SHEET_REGION_SOURCE_TYPE_ENUMS.includes(value as SheetRegionSourceTypeEnum);
}

/*
 * Return whether one value is a known sheet region conflict policy.
 */

export function isSheetRegionConflictPolicy(value: unknown): value is SheetRegionConflictPolicyEnum {
	return SHEET_REGION_CONFLICT_POLICY_ENUMS.includes(value as SheetRegionConflictPolicyEnum);
}

/*
 * Return reusable column definitions for a custom Sheet region source.
 */

export function getSheetCustomRegionSourceColumns(sourceType: SheetRegionSourceTypeEnum | string | null | undefined): SheetCustomRegionSourceColumnObj[] {
	if (sourceType === SHEET_CUSTOM_REGION_SOURCE_CHILD_ORGANIZATIONS) {
		return SHEET_CUSTOM_REGION_SOURCE_CHILD_ORGANIZATION_COLUMNS.map((column) => ({ ...column }));
	}

	return [];
}

/*
 * Return whether one Sheet region source type is backed by custom app data.
 */

export function isSheetCustomRegionSourceType(sourceType: unknown) {
	return sourceType === SHEET_CUSTOM_REGION_SOURCE_CHILD_ORGANIZATIONS;
}

/*
 * Return whether one value is a known sheet structure edit operation.
 */

export function isSheetStructureOperation(value: unknown): value is SheetStructureOperationEnum {
	return SHEET_STRUCTURE_OPERATION_ENUMS.includes(value as SheetStructureOperationEnum);
}

/*
 * Return a shallow merged JSON object, ignoring non-object values.
 */

export function mergeSheetJSONObjects(...values: Array<Record<string, any> | null | undefined>) {
	return values.reduce<Record<string, any>>((merged, value) => {
		if (!value || typeof value !== 'object' || Array.isArray(value)) {
			return merged;
		}

		return {
			...merged,
			...value,
		};
	}, {});
}

/*
 * Return the string key used by sheet design JSON for one column index.
 */

export function getSheetColumnDesignKey(columnIndex: number) {
	return String(Math.max(1, Math.floor(Number(columnIndex) || 1)));
}

/*
 * Return the string key used by sheet design JSON for one row index.
 */

export function getSheetRowDesignKey(rowIndex: number) {
	return String(Math.max(1, Math.floor(Number(rowIndex) || 1)));
}

/*
 * Return whether one axis index falls inside a protected region span.
 */

function isSheetAxisIndexInProtectedSpan(index: number, spans: SheetProtectedAxisSpan[]) {
	return spans.some((span) => index >= span.startIndex && index <= span.endIndex);
}

/*
 * Return whether a protected region span blocks shifting an axis index backward.
 */

function doesSheetProtectedSpanBlockBackwardShift(targetIndex: number, sourceIndex: number, spans: SheetProtectedAxisSpan[]) {
	return spans.some((span) => span.endIndex >= targetIndex && span.startIndex <= sourceIndex - 1);
}

/*
 * Return the new axis design index for one structure edit.
 */

function getSheetShiftedAxisDesignIndex(
	index: number,
	operation: SheetStructureOperationEnum,
	targetIndex: number,
	protectedSpans: SheetProtectedAxisSpan[],
) {
	if (isSheetAxisIndexInProtectedSpan(index, protectedSpans)) {
		return index;
	}

	if (operation === 'INSERT_ROW_ABOVE' || operation === 'INSERT_COLUMN_LEFT') {
		const nextIndex = index >= targetIndex ? index + 1 : index;
		return isSheetAxisIndexInProtectedSpan(nextIndex, protectedSpans) ? index : nextIndex;
	}

	if (index === targetIndex) {
		return null;
	}

	if (index > targetIndex) {
		const nextIndex = index - 1;
		return isSheetAxisIndexInProtectedSpan(nextIndex, protectedSpans) ||
				doesSheetProtectedSpanBlockBackwardShift(targetIndex, index, protectedSpans)
			? index
			: nextIndex;
	}

	return index;
}

/*
 * Shift saved row or column design entries for one sheet structure edit.
 */

export function shiftSheetAxisDesignForStructureEdit(
	axisDesign: Record<string, SheetAxisDesignObj> | null | undefined,
	operation: SheetStructureOperationEnum,
	targetIndex: number,
	protectedSpans: SheetProtectedAxisSpan[] = [],
) {
	const nextDesign: Record<string, SheetAxisDesignObj> = {};
	const normalizedTargetIndex = Math.max(1, Math.floor(Number(targetIndex) || 1));

	Object.entries(axisDesign || {}).forEach(([key, design]) => {
		const index = Math.floor(Number(key || 0));
		if (!Number.isFinite(index) || index < 1) {
			nextDesign[key] = design;
			return;
		}

		const nextIndex = getSheetShiftedAxisDesignIndex(index, operation, normalizedTargetIndex, protectedSpans);
		if (!nextIndex) {
			return;
		}

		nextDesign[String(nextIndex)] = design;
	});

	return nextDesign;
}

/*
 * Return whether one row design object represents meaningful row-level content.
 */

export function sheetAxisDesignHasContent(design?: SheetAxisDesignObj | null) {
	if (!design) {
		return false;
	}

	return Object.values(design).some((value) => {
		if (value === null || value === undefined || value === false) {
			return false;
		}

		if (typeof value === 'object') {
			return Object.keys(value).length > 0;
		}

		return true;
	});
}

/*
 * Return whether one grid coordinate is inside a saved sheet range.
 */

export function isSheetCellInRange(rowIndex: number, columnIndex: number, range: Pick<SheetRangeData, 'startRowIndex' | 'startColumnIndex' | 'endRowIndex' | 'endColumnIndex'>) {
	return rowIndex >= range.startRowIndex &&
		rowIndex <= range.endRowIndex &&
		columnIndex >= range.startColumnIndex &&
		columnIndex <= range.endColumnIndex;
}
