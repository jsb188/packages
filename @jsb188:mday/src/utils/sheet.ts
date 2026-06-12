import {
	SHEET_CUSTOM_REGION_SOURCE_CHILD_ORGANIZATION_COLUMNS,
	SHEET_CUSTOM_REGION_SOURCE_CHILD_ORGANIZATIONS,
	SHEET_CELL_SOURCE_TYPE_ENUMS,
	SHEET_CELL_VALUE_TYPE_ENUMS,
	SHEET_DEFAULT_COLUMN_COUNT,
	SHEET_DEFAULT_ROW_COUNT,
	SHEET_DISPLAY_RULE_COMPARISON_OPERATORS,
	SHEET_DISPLAY_RULE_MAX_BRANCHES,
	SHEET_DISPLAY_RULE_MAX_TEXT_LENGTH,
	SHEET_DISPLAY_RULE_OPERATOR_ENUMS,
	SHEET_REGION_CONFLICT_POLICY_ENUMS,
	SHEET_REGION_SOURCE_TYPE_ENUMS,
	SHEET_REGION_TYPE_ENUMS,
	SHEET_STRUCTURE_OPERATION_ENUMS,
	SHEET_VIEWPORT_MAX_COLUMNS,
	SHEET_VIEWPORT_MAX_ROWS,
	GRID_ITEM_LIST_LIMIT,
} from '../constants/sheet.ts';
import type {
	SheetMergedRangeObj,
	SheetAxisDesignObj,
	SheetCellBorderStyleValue,
	SheetCellFormatObj,
	SheetCellStyleObj,
	SheetCellSourceTypeEnum,
	SheetDesignObj,
	SheetDisplayRuleBranchObj,
	SheetDisplayRuleOperatorEnum,
	SheetDisplayRulesForTypeObj,
	SheetDisplayRulesObj,
	SheetGridViewportObj,
	SheetCellGQL,
	SheetCellValueTypeEnum,
	SheetRangeData,
	SheetRegionConflictPolicyEnum,
	SheetRegionGQL,
	SheetRegionSourceFilterGroupObj,
	SheetRegionSourceObj,
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

type SheetRegionSourceLocator = {
	dataTableId?: number | bigint | string | null;
	sourceDataTableId?: number | bigint | string | null;
	sourceId?: number | bigint | string | null;
	sourceType?: SheetRegionSourceTypeEnum | string | null;
	sourceViewId?: number | bigint | string | null;
	type?: SheetRegionSourceTypeEnum | string | null;
	source?: Pick<SheetRegionSourceObj, 'dataTableId' | 'type'> | null;
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
const SHEET_CELL_TEXT_STYLE_BOOLEAN_KEYS = ['bold', 'italic', 'underline', 'strikethrough'] as const;
const SHEET_FORMULA_STRING_QUOTE_CHARS = ['"', "'", '`'] as const;
const SHEET_FORMULA_BARE_DATA_TABLE_CELL_KEY_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/;
const SHEET_FORMULA_BARE_STRING_VALUE_PATTERN = /^[A-Za-z_][A-Za-z0-9_-]*$/;
const SHEET_FORMULA_ISO_DATE_VALUE_PATTERN = /^\d{4}-\d{2}-\d{2}(?:[T ][0-9]{2}:[0-9]{2}(?::[0-9]{2}(?:\.[0-9]+)?)?(?:Z|[+-][0-9]{2}:[0-9]{2})?)?$/;
export const SHEET_CELL_STYLE_MAX_FONT_SIZE = 48;

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
 * Return a valid Sheet cell font size rounded to an integer and capped to the supported range.
 */
export function normalizeSheetCellFontSize(value: unknown) {
	const fontSize = normalizeSheetCellStylePositiveInteger(value);

	return fontSize ? Math.min(SHEET_CELL_STYLE_MAX_FONT_SIZE, fontSize) : null;
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
 * Return a boolean cell style setting only when the value is explicitly boolean.
 */
function normalizeSheetCellStyleBoolean(value: unknown) {
	return typeof value === 'boolean' ? value : null;
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
 * Add normalized full-cell text style booleans into one Sheet style result object.
 */
function addNormalizedSheetCellTextStyleBooleans(result: SheetCellStyleObj, source: Record<string, any>) {
	SHEET_CELL_TEXT_STYLE_BOOLEAN_KEYS.forEach((key) => {
		const value = normalizeSheetCellStyleBoolean(source[key]);

		if (value !== null) {
			result[key] = value;
		}
	});
}

/*
 * Return the only style fields Sheets currently supports for cells and ranges.
 */
export function normalizeSheetCellStyle(style?: Partial<SheetCellStyleObj> | Record<string, any> | string | null): SheetCellStyleObj {
	const source = getSheetCellStyleObject(style);
	const fontSize = normalizeSheetCellFontSize(source.fontSize);
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

	const disableMarkdown = normalizeSheetCellStyleBoolean(source.disableMarkdown);
	if (disableMarkdown !== null) {
		normalized.disableMarkdown = disableMarkdown;
	}

	addNormalizedSheetCellTextStyleBooleans(normalized, source);
	SHEET_CELL_BORDER_SIDES.forEach((side) => addNormalizedSheetCellBorderSideStyle(normalized, source, side));

	return normalized;
}

/*
 * Return axis design values with supported cell style and format fields
 * normalized.
 */
function normalizeSheetAxisDesignMap(map?: Record<string, SheetAxisDesignObj> | null) {
	return Object.fromEntries(Object.entries(map || {}).map(([key, value]) => {
		const { format: _format, style: _style, ...axisDesign } = value || {};
		const style = normalizeSheetCellStyle(_style);
		const format = normalizeSheetCellFormat(_format);
		const next: SheetAxisDesignObj = { ...axisDesign };

		if (Object.keys(style).length) {
			next.style = style;
		}

		if (Object.keys(format).length) {
			next.format = format;
		}

		return [key, next];
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

export interface SheetFormulaStaticCellReference {
	rowIndex: number;
	columnIndex: number;
}

export interface SheetFormulaStaticRangeReference {
	startRowIndex: number;
	startColumnIndex: number;
	endRowIndex: number;
	endColumnIndex: number;
}

export interface SheetFormulaStaticDataTableCellReference {
	dataTableName: string;
	cellKey: string;
	rowIdentifier: string | null;
	text: string;
}

export interface SheetFormulaStaticDataTableQueryCondition {
	cellKey: string;
	operator: SheetFormulaDataTableQueryOperator;
	isStatic: boolean;
	staticValue: string | number | boolean | null;
	text: string;
}

export interface SheetFormulaStaticDataTableQueryReference {
	dataTableName: string;
	cellKey: string;
	conditions: SheetFormulaStaticDataTableQueryCondition[];
	text: string;
}

export interface SheetFormulaStaticReferences {
	cells: SheetFormulaStaticCellReference[];
	ranges: SheetFormulaStaticRangeReference[];
	dataTableCells: SheetFormulaStaticDataTableCellReference[];
	dataTableQueries: SheetFormulaStaticDataTableQueryReference[];
	volatile: boolean;
}

/*
 * Return whether a formula function name refers to a time-dependent builtin.
 */
function isSheetFormulaVolatileFunctionName(name: string) {
	const normalizedName = name.replace(/^@/, '').toUpperCase();
	return normalizedName === 'TODAY' || normalizedName === 'NOW';
}

/*
 * Return the literal scalar value of an AST node, or null when the value can
 * only be known at evaluation time (cell references, expressions, shorthands).
 */
function getSheetFormulaStaticNodeValue(node: SheetFormulaASTNode): string | number | boolean | null {
	if (node.kind === 'STRING_LITERAL' || node.kind === 'NUMBER_LITERAL' || node.kind === 'BOOLEAN_LITERAL') {
		return node.value;
	}

	return null;
}

/*
 * Return the data-table lookup call metadata for a function-call AST node, or
 * null when the node is not an @table(rowIdentifier, "cellKey") lookup.
 */
export function parseSheetFormulaDataTableCellCallNode(node: Extract<SheetFormulaASTNode, { kind: 'FUNCTION_CALL' }>) {
	if (!node.name.startsWith('@')) {
		return null;
	}

	const dataTableName = normalizeSheetFormulaDataTableName(node.name.slice(1));
	const cellKeyNode = node.args[1];
	if (!dataTableName || node.args.length !== 2 || cellKeyNode?.kind !== 'STRING_LITERAL') {
		return null;
	}

	return {
		cellKey: cellKeyNode.value,
		dataTableName,
		rowIdentifierNode: node.args[0],
		text: node.text,
	};
}

/*
 * Walk one formula AST node and accumulate its static references. Used by
 * collectSheetFormulaStaticReferences below; does no I/O and no evaluation.
 */
function walkSheetFormulaStaticReferences(node: SheetFormulaASTNode, result: SheetFormulaStaticReferences) {
	if (node.kind === 'CELL_REFERENCE') {
		result.cells.push({
			rowIndex: node.reference.rowIndex,
			columnIndex: node.reference.columnIndex,
		});
		return;
	}

	if (node.kind === 'RANGE_REFERENCE') {
		result.ranges.push({
			startRowIndex: node.reference.startRowIndex,
			startColumnIndex: node.reference.startColumnIndex,
			endRowIndex: node.reference.endRowIndex,
			endColumnIndex: node.reference.endColumnIndex,
		});
		return;
	}

	if (node.kind === 'DATE_TIME_SHORTHAND') {
		result.volatile = true;
		return;
	}

	if (node.kind === 'DATA_TABLE_QUERY') {
		result.dataTableQueries.push({
			dataTableName: normalizeSheetFormulaDataTableName(node.query.dataTableName),
			cellKey: node.query.cellKey,
			conditions: node.query.conditions.map((condition) => {
				const staticValue = getSheetFormulaStaticNodeValue(condition.valueNode);

				return {
					cellKey: condition.cellKey,
					operator: condition.operator,
					isStatic: staticValue !== null,
					staticValue,
					text: condition.text,
				};
			}),
			text: node.text,
		});

		// Condition values may reference sheet cells or volatile shorthands
		node.query.conditions.forEach((condition) => {
			walkSheetFormulaStaticReferences(condition.valueNode, result);
		});
		return;
	}

	if (node.kind === 'FUNCTION_CALL') {
		const dataTableCall = parseSheetFormulaDataTableCellCallNode(node);
		if (dataTableCall) {
			const staticIdentifier = getSheetFormulaStaticNodeValue(dataTableCall.rowIdentifierNode);

			result.dataTableCells.push({
				dataTableName: dataTableCall.dataTableName,
				cellKey: dataTableCall.cellKey,
				rowIdentifier: staticIdentifier === null ? null : String(staticIdentifier),
				text: dataTableCall.text,
			});

			// The row identifier may itself reference sheet cells
			walkSheetFormulaStaticReferences(dataTableCall.rowIdentifierNode, result);
			return;
		}

		if (isSheetFormulaVolatileFunctionName(node.name)) {
			result.volatile = true;
		}

		node.args.forEach((arg) => {
			walkSheetFormulaStaticReferences(arg, result);
		});
		return;
	}

	if (node.kind === 'BINARY_EXPRESSION') {
		walkSheetFormulaStaticReferences(node.left, result);
		walkSheetFormulaStaticReferences(node.right, result);
		return;
	}

	if (node.kind === 'UNARY_EXPRESSION') {
		walkSheetFormulaStaticReferences(node.value, result);
	}
}

/*
 * Collect every reference a formula AST depends on, without evaluating it:
 * sheet cells/ranges, data table cell lookups, data table query lookups, and
 * whether the formula is volatile (time-dependent). Cell and range references
 * are de-duplicated. Pure function shared by the server dependency graph and
 * client dependency highlighting.
 */
export function collectSheetFormulaStaticReferences(node: SheetFormulaASTNode): SheetFormulaStaticReferences {
	const result: SheetFormulaStaticReferences = {
		cells: [],
		ranges: [],
		dataTableCells: [],
		dataTableQueries: [],
		volatile: false,
	};

	walkSheetFormulaStaticReferences(node, result);

	const cellKeys = new Set<string>();
	result.cells = result.cells.filter((cell) => {
		const key = `${cell.rowIndex}:${cell.columnIndex}`;
		if (cellKeys.has(key)) {
			return false;
		}
		cellKeys.add(key);
		return true;
	});

	const rangeKeys = new Set<string>();
	result.ranges = result.ranges.filter((range) => {
		const key = `${range.startRowIndex}:${range.startColumnIndex}:${range.endRowIndex}:${range.endColumnIndex}`;
		if (rangeKeys.has(key)) {
			return false;
		}
		rangeKeys.add(key);
		return true;
	});

	return result;
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
 * Return a spreadsheet-style column label from a one-based column index.
 */
export function getSheetFormulaColumnLabel(columnIndex: number) {
	let label = '';
	let remaining = Math.floor(columnIndex);

	while (remaining > 0) {
		const remainder = (remaining - 1) % 26;
		label = String.fromCharCode(65 + remainder) + label;
		remaining = Math.floor((remaining - 1) / 26);
	}

	return label;
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

export const SHEET_FORMULA_REF_ERROR = '#REF!';

export type SheetFormulaShiftResult = {
	hasRefError: boolean;
	text: string;
};

/*
 * Return one cell reference rendered after a row/column shift, or null when
 * the shift moves it out of the sheet bounds.
 */
function getShiftedSheetFormulaCellReferenceText(
	reference: { columnIndex: number; rowIndex: number },
	rowDelta: number,
	columnDelta: number,
) {
	const rowIndex = reference.rowIndex + rowDelta;
	const columnIndex = reference.columnIndex + columnDelta;

	if (rowIndex < 1 || columnIndex < 1) {
		return null;
	}

	return `${getSheetFormulaColumnLabel(columnIndex)}${rowIndex}`;
}

/*
 * Return the rewritten text for one reference token after a row/column shift,
 * or null when the token needs no rewrite. Data table tokens only rewrite the
 * sheet cell references nested inside them; field keys and table names are
 * never shifted.
 */
function getShiftedSheetFormulaReferenceTokenText(
	token: SheetFormulaReferenceToken,
	rowDelta: number,
	columnDelta: number,
): SheetFormulaShiftResult | null {
	if (token.kind === 'SHEET_CELL') {
		const shifted = getShiftedSheetFormulaCellReferenceText(token, rowDelta, columnDelta);
		return shifted
			? { hasRefError: false, text: shifted }
			: { hasRefError: true, text: SHEET_FORMULA_REF_ERROR };
	}

	if (token.kind === 'SHEET_RANGE') {
		const start = getShiftedSheetFormulaCellReferenceText(
			{ columnIndex: token.startColumnIndex, rowIndex: token.startRowIndex },
			rowDelta,
			columnDelta,
		);
		const end = getShiftedSheetFormulaCellReferenceText(
			{ columnIndex: token.endColumnIndex, rowIndex: token.endRowIndex },
			rowDelta,
			columnDelta,
		);

		// A range with either corner out of bounds collapses to one #REF! error
		return start && end
			? { hasRefError: false, text: `${start}:${end}` }
			: { hasRefError: true, text: SHEET_FORMULA_REF_ERROR };
	}

	if (token.kind === 'DATA_TABLE_CELL') {
		// Only the row identifier argument is an expression that can hold refs
		const inner = shiftSheetFormulaReferencesInText(token.rowIdentifierExpression.trim(), rowDelta, columnDelta);
		if (inner.text === token.rowIdentifierExpression.trim() && !inner.hasRefError) {
			return null;
		}

		const call = parseSheetFormulaCall(token.text);
		if (!call || call.args.length !== 2) {
			return null;
		}

		return {
			hasRefError: inner.hasRefError,
			text: `${call.name}(${inner.text}, ${call.args[1].trim()})`,
		};
	}

	if (token.kind === 'DATA_TABLE_QUERY_CELL') {
		// Rewrite only WHERE condition values the parser classified as cell references
		let hasRefError = false;
		let changed = false;
		const conditionTexts = token.conditions.map((condition) => {
			if (condition.valueNode.kind !== 'CELL_REFERENCE') {
				return condition.text;
			}

			const shifted = getShiftedSheetFormulaCellReferenceText(condition.valueNode.reference, rowDelta, columnDelta);
			const prefix = condition.text.slice(0, condition.text.length - condition.valueExpression.length);
			changed = true;

			if (!shifted) {
				hasRefError = true;
				return `${prefix}${SHEET_FORMULA_REF_ERROR}`;
			}

			return `${prefix}${shifted}`;
		});

		if (!changed) {
			return null;
		}

		const headMatch = token.text.match(/^@?[A-Za-z_][A-Za-z0-9_]*\s*\(/);
		const callEndIndex = headMatch ? getSheetFormulaCallEndIndex(token.text, headMatch[0].lastIndexOf('(')) : null;
		if (!callEndIndex) {
			return null;
		}

		return {
			hasRefError,
			text: `${token.text.slice(0, callEndIndex)} WHERE ${conditionTexts.join(' AND ')}`,
		};
	}

	return null;
}

/*
 * Shift sheet references inside one formula expression text by splicing each
 * rewritten token over its original span, preserving all other characters.
 */
function shiftSheetFormulaReferencesInText(
	text: string,
	rowDelta: number,
	columnDelta: number,
): SheetFormulaShiftResult {
	const tokens = tokenizeSheetFormulaReferences(text);
	if (!tokens.length) {
		return { hasRefError: false, text };
	}

	let hasRefError = false;
	let result = '';
	let cursor = 0;

	tokens.forEach((token) => {
		const rewrite = getShiftedSheetFormulaReferenceTokenText(token, rowDelta, columnDelta);
		result += text.slice(cursor, token.startIndex);
		result += rewrite ? rewrite.text : text.slice(token.startIndex, token.endIndex);
		hasRefError = hasRefError || Boolean(rewrite?.hasRefError);
		cursor = token.endIndex;
	});

	result += text.slice(cursor);
	return { hasRefError, text: result };
}

/*
 * Shift every sheet cell/range reference in one formula input by a row and
 * column delta — the relative-addressing rewrite applied when a formula is
 * pasted or autofilled into a different cell (=A3 copied one row down
 * becomes =A4). References shifted out of bounds become #REF! and flag
 * hasRefError. Non-formula inputs are returned unchanged.
 */
export function shiftSheetFormulaReferences(
	value: string,
	rowDelta: number,
	columnDelta: number,
): SheetFormulaShiftResult {
	if (!isSheetFormulaText(value) || (!rowDelta && !columnDelta)) {
		return { hasRefError: false, text: value };
	}

	return shiftSheetFormulaReferencesInText(value, rowDelta, columnDelta);
}

export type SheetAutofillCell = {
	columnIndex: number;
	rowIndex: number;
	value: string;
};

/*
 * Return one autofill source value parsed as a plain numeric literal, or null
 * when it is not a number.
 */
function getSheetAutofillNumericValue(value: string) {
	const trimmed = value.trim();
	if (!trimmed || !/^[+-]?(\d+\.?\d*|\.\d+)$/.test(trimmed)) {
		return null;
	}

	const parsed = Number(trimmed);
	return Number.isFinite(parsed) ? parsed : null;
}

/*
 * Return the constant step of one all-numeric source run, or null when the
 * values do not form an arithmetic series.
 */
function getSheetAutofillArithmeticStep(values: number[]) {
	if (values.length < 2) {
		return null;
	}

	const step = values[1] - values[0];

	for (let index = 2; index < values.length; index += 1) {
		if (Math.abs(values[index] - values[index - 1] - step) > 1e-9) {
			return null;
		}
	}

	return step;
}

/*
 * Format one extrapolated numeric autofill value without float drift.
 */
function formatSheetAutofillNumber(value: number) {
	return String(parseFloat(value.toPrecision(12)));
}

/*
 * Return the autofill values for one run of target cells extending one
 * ordered run of source cells — one column of a vertical fill or one row of
 * a horizontal fill. Source cells are ordered along the fill axis
 * (top-to-bottom / left-to-right) and target cells from nearest-to-block
 * outward; backward marks fills that extend up or left.
 * - All-numeric source runs with a constant step extend the arithmetic
 *   series (1, 2, 3 fills 4, 5, 6).
 * - Every other run repeats the source block cyclically, with formula values
 *   shifting their cell references by the distance from their source cell.
 */
export function getSheetAutofillValues(params: {
	backward?: boolean;
	sourceCells: SheetAutofillCell[];
	targetCells: Array<{ columnIndex: number; rowIndex: number }>;
}): string[] {
	const { backward, sourceCells, targetCells } = params;
	const count = sourceCells.length;

	if (!count) {
		return targetCells.map(() => '');
	}

	const numericValues = sourceCells.map((cell) => {
		return isSheetFormulaText(cell.value) ? null : getSheetAutofillNumericValue(cell.value);
	});
	const step = numericValues.every((value) => value !== null)
		? getSheetAutofillArithmeticStep(numericValues as number[])
		: null;

	return targetCells.map((target, index) => {
		// Signed position of the target relative to the source block start
		const offset = backward ? -(index + 1) : count + index;

		if (step !== null) {
			return formatSheetAutofillNumber((numericValues[0] as number) + offset * step);
		}

		// Cyclic repeat: negative offsets wrap to tile the pattern backwards
		const sourceIndex = ((offset % count) + count) % count;
		const source = sourceCells[sourceIndex];

		return shiftSheetFormulaReferences(
			source.value,
			target.rowIndex - source.rowIndex,
			target.columnIndex - source.columnIndex,
		).text;
	});
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
 * Return the validated merged-cell ranges stored in one sheet design's
 * metadata. Invalid or single-cell entries are dropped.
 */
export function getSheetMergedRanges(metadata?: Record<string, any> | null): SheetMergedRangeObj[] {
	const merges = Array.isArray(metadata?.merges) ? metadata.merges : [];

	return merges.flatMap((merge: Partial<SheetMergedRangeObj>) => {
		const startRowIndex = Math.floor(Number(merge?.startRowIndex || 0));
		const startColumnIndex = Math.floor(Number(merge?.startColumnIndex || 0));
		const endRowIndex = Math.floor(Number(merge?.endRowIndex || 0));
		const endColumnIndex = Math.floor(Number(merge?.endColumnIndex || 0));

		if (
			startRowIndex < 1 || startColumnIndex < 1 ||
			endRowIndex < startRowIndex || endColumnIndex < startColumnIndex ||
			(endRowIndex === startRowIndex && endColumnIndex === startColumnIndex)
		) {
			return [];
		}

		return [{ startRowIndex, startColumnIndex, endRowIndex, endColumnIndex }];
	});
}

/*
 * Return whether one cell coordinate falls inside one merged range.
 */
export function isSheetCellInMergedRange(merge: SheetMergedRangeObj, rowIndex: number, columnIndex: number) {
	return rowIndex >= merge.startRowIndex && rowIndex <= merge.endRowIndex &&
		columnIndex >= merge.startColumnIndex && columnIndex <= merge.endColumnIndex;
}

/*
 * Return the merged range containing one cell coordinate, or null.
 */
export function getSheetMergedRangeAtCell(
	merges: SheetMergedRangeObj[],
	rowIndex: number,
	columnIndex: number,
) {
	return merges.find((merge) => isSheetCellInMergedRange(merge, rowIndex, columnIndex)) || null;
}

/*
 * Return whether one cell is the anchor (top-left) of one merged range.
 */
export function isSheetMergedRangeAnchor(merge: SheetMergedRangeObj, rowIndex: number, columnIndex: number) {
	return merge.startRowIndex === rowIndex && merge.startColumnIndex === columnIndex;
}

/*
 * Return whether two merged ranges intersect.
 */
export function sheetMergedRangesIntersect(a: SheetMergedRangeObj, b: SheetMergedRangeObj) {
	return a.startRowIndex <= b.endRowIndex && a.endRowIndex >= b.startRowIndex &&
		a.startColumnIndex <= b.endColumnIndex && a.endColumnIndex >= b.startColumnIndex;
}

/*
 * Return merged ranges with one new range added; existing ranges it overlaps
 * are absorbed (removed), matching the merge-over behavior of spreadsheets.
 */
export function addSheetMergedRange(merges: SheetMergedRangeObj[], range: SheetMergedRangeObj) {
	return [
		...merges.filter((merge) => !sheetMergedRangesIntersect(merge, range)),
		range,
	];
}

/*
 * Return merged ranges without any range intersecting the given bounds.
 */
export function removeSheetMergedRangesIntersecting(merges: SheetMergedRangeObj[], bounds: SheetMergedRangeObj) {
	return merges.filter((merge) => !sheetMergedRangesIntersect(merge, bounds));
}

/*
 * Return one axis span shifted by a row/column insert or delete at the target
 * index, or null when the span collapses entirely.
 */
function shiftSheetMergedRangeAxis(
	start: number,
	end: number,
	targetIndex: number,
	delta: 1 | -1,
): [number, number] | null {
	if (delta === 1) {
		// Insert before targetIndex: spans at/after shift; spans containing the
		// index grow
		if (targetIndex <= start) {
			return [start + 1, end + 1];
		}
		if (targetIndex <= end) {
			return [start, end + 1];
		}
		return [start, end];
	}

	// Delete targetIndex: spans after shift back; spans containing it shrink
	if (targetIndex < start) {
		return [start - 1, end - 1];
	}
	if (targetIndex <= end) {
		return start === end ? null : [start, end - 1];
	}
	return [start, end];
}

/*
 * Return merged ranges shifted by one row/column structure edit. Ranges that
 * collapse to a single cell or lose their span entirely are dropped.
 */
export function shiftSheetMergedRangesForStructureEdit(
	merges: SheetMergedRangeObj[],
	operation: SheetStructureOperationEnum,
	targetIndex: number,
): SheetMergedRangeObj[] {
	const rowDelta = operation === 'INSERT_ROW_ABOVE' ? 1 : operation === 'DELETE_ROW' ? -1 : 0;
	const columnDelta = operation === 'INSERT_COLUMN_LEFT' ? 1 : operation === 'DELETE_COLUMN' ? -1 : 0;

	if (!rowDelta && !columnDelta) {
		return merges;
	}

	return merges.flatMap((merge) => {
		const rowSpan = rowDelta
			? shiftSheetMergedRangeAxis(merge.startRowIndex, merge.endRowIndex, targetIndex, rowDelta as 1 | -1)
			: [merge.startRowIndex, merge.endRowIndex] as [number, number];
		const columnSpan = columnDelta
			? shiftSheetMergedRangeAxis(merge.startColumnIndex, merge.endColumnIndex, targetIndex, columnDelta as 1 | -1)
			: [merge.startColumnIndex, merge.endColumnIndex] as [number, number];

		if (!rowSpan || !columnSpan) {
			return [];
		}

		const next = {
			startRowIndex: rowSpan[0],
			endRowIndex: rowSpan[1],
			startColumnIndex: columnSpan[0],
			endColumnIndex: columnSpan[1],
		};

		// A merge reduced to one cell is no longer a merge
		if (next.startRowIndex === next.endRowIndex && next.startColumnIndex === next.endColumnIndex) {
			return [];
		}

		return [next];
	});
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
		defaultCellFormat: normalizeSheetCellFormat(design?.defaultCellFormat),
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
 * Return the serialized child organization id carried by one custom Child
 * Organizations source cell, or null for cells from other sources. Custom
 * Child Organizations source rows are keyed by the child organization id.
 */

export function getSheetChildOrganizationSourceOrgId(
	cell?: { dataTableId?: string | null; dataTableRowId?: string | null } | null,
) {
	if (!cell || String(cell.dataTableId || '') !== SHEET_CUSTOM_REGION_SOURCE_CHILD_ORGANIZATIONS) {
		return null;
	}

	return String(cell.dataTableRowId || '') || null;
}

/*
 * Return the concrete source type for a generated Sheet region or rendered region result.
 */
export function getSheetRegionSourceType(
	sourceLocator?: SheetRegionSourceLocator | null,
): SheetRegionSourceTypeEnum {
	const sourceType = sourceLocator?.source?.type ||
		sourceLocator?.sourceType ||
		sourceLocator?.type ||
		(sourceLocator?.sourceDataTableId || sourceLocator?.dataTableId || sourceLocator?.source?.dataTableId
			? 'DATA_TABLE'
			: null);

	return isSheetRegionSourceType(sourceType) ? sourceType : 'DATA_TABLE';
}

/*
 * Return the stable source id used to key source cells for a generated Sheet region.
 */
export function getSheetRegionSourceId(
	sourceLocator?: SheetRegionSourceLocator | null,
): string {
	return String(
		sourceLocator?.sourceDataTableId ||
			sourceLocator?.dataTableId ||
			sourceLocator?.source?.dataTableId ||
			sourceLocator?.sourceId ||
			sourceLocator?.sourceViewId ||
			sourceLocator?.source?.type ||
			sourceLocator?.sourceType ||
			sourceLocator?.type ||
			'',
	);
}

/*
 * Return the app route where one Sheet generated-region source can be opened.
 */
export function getSheetRegionSourceDataTableRoute(
	sourceLocator?: SheetRegionSourceLocator | null,
): string | null {
	const sourceType = getSheetRegionSourceType(sourceLocator);

	if (sourceType === SHEET_CUSTOM_REGION_SOURCE_CHILD_ORGANIZATIONS) {
		return '/app/vendors';
	}

	const dataTableId = String(
		sourceLocator?.sourceDataTableId ||
			sourceLocator?.dataTableId ||
			sourceLocator?.source?.dataTableId ||
			'',
	);

	return dataTableId ? `/app/d/${dataTableId}` : null;
}

/*
 * Return whether a Sheet region source can generate rows into the grid.
 */
export function isSheetGeneratedRegionSource(
	sourceLocator?: SheetRegionSourceLocator | null,
) {
	return Boolean(
		sourceLocator?.sourceDataTableId ||
			sourceLocator?.dataTableId ||
			sourceLocator?.source?.dataTableId ||
			isSheetCustomRegionSourceType(getSheetRegionSourceType(sourceLocator)),
	);
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
 * Return the detected value type of one raw cell text: whole numbers are
 * CELL_INT, decimal numbers CELL_FLOAT, ISO calendar dates CELL_DATE, and
 * everything else CELL_TEXT.
 */
export function getSheetTextValueType(value?: string | null): SheetCellValueTypeEnum {
	const trimmedValue = String(value ?? '').trim();

	if (!trimmedValue) {
		return 'CELL_TEXT';
	}

	if (/^-?\d+$/.test(trimmedValue)) {
		return 'CELL_INT';
	}

	if (/^-?(\d+\.\d+|\.\d+|\d+\.)$/.test(trimmedValue)) {
		return 'CELL_FLOAT';
	}

	if (/^\d{4}-\d{2}-\d{2}$/.test(trimmedValue)) {
		// A date-shaped string still has to be a real calendar date
		const [year, month, day] = trimmedValue.split('-').map(Number);
		const date = new Date(Date.UTC(year, month - 1, day));

		if (date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day) {
			return 'CELL_DATE';
		}
	}

	const upperValue = trimmedValue.toUpperCase();

	if (upperValue === 'TRUE' || upperValue === 'FALSE') {
		return 'CELL_BOOLEAN';
	}

	return 'CELL_TEXT';
}

/*
 * Return the cell value type one DataTable column field type projects into a
 * Sheet region cell, or null when the field type is unknown. Numeric columns
 * report CELL_FLOAT; callers can refine to CELL_INT from the stored value.
 */
export function getSheetCellValueTypeForDataTableFieldType(fieldType?: string | null): SheetCellValueTypeEnum | null {
	switch (fieldType) {
		case 'NUMBER':
		case 'PRICE':
			return 'CELL_FLOAT';
		case 'BOOLEAN':
			return 'CELL_BOOLEAN';
		case 'DATE':
		case 'DATETIME':
		case 'WEEK_OF_MON':
		case 'WEEK_OF_SUN':
			return 'CELL_DATE';
		case undefined:
		case null:
			return null;
		default:
			return 'CELL_TEXT';
	}
}

/*
 * Return the detected value type of one Sheet cell. The server's stored typed
 * columns win when present; pending or optimistic cells (no typed columns yet)
 * fall back to classifying the display text client-side.
 */
export function getSheetCellValueType(
	cell?: Pick<SheetCellGQL, 'booleanValue' | 'dateValue' | 'datetimeValue' | 'numberValue'> | null,
	displayValue?: string | null,
): SheetCellValueTypeEnum {
	if (cell) {
		if (cell.numberValue !== null && cell.numberValue !== undefined) {
			return Number.isInteger(Number(cell.numberValue)) ? 'CELL_INT' : 'CELL_FLOAT';
		}

		if (cell.dateValue || cell.datetimeValue) {
			return 'CELL_DATE';
		}

		if (cell.booleanValue !== null && cell.booleanValue !== undefined) {
			return 'CELL_BOOLEAN';
		}
	}

	return getSheetTextValueType(displayValue);
}

/*
 * Return one axis design map (columns or rows) with style deltas merged into a
 * set of lines. Null delta values remove the key from the saved line style;
 * lines whose merged style (and design) end up empty drop out of the map.
 * Whole-column/row formatting persists through these line styles as a single
 * design patch instead of one cell write per covered coordinate.
 */
export function mergeSheetAxisDesignLineStyles(
	axisDesign: Record<string, SheetAxisDesignObj> | null | undefined,
	lineDeltas: Array<{ delta: Record<string, unknown>; key: string }>,
): Record<string, SheetAxisDesignObj> {
	const next: Record<string, SheetAxisDesignObj> = { ...(axisDesign || {}) };

	lineDeltas.forEach(({ delta, key }) => {
		const lineDesign = next[key] || {};
		const mergedStyle: Record<string, unknown> = { ...normalizeSheetCellStyle(lineDesign.style) };

		Object.entries(delta).forEach(([prop, value]) => {
			if (value === null || value === undefined) {
				delete mergedStyle[prop];
			} else {
				mergedStyle[prop] = value;
			}
		});

		const normalizedStyle = normalizeSheetCellStyle(mergedStyle);

		if (Object.keys(normalizedStyle).length) {
			next[key] = {
				...lineDesign,
				style: normalizedStyle,
			};
			return;
		}

		// An emptied style drops from the line design; an emptied line drops
		// from the axis map so the saved design stays sparse
		const { style: _droppedStyle, ...lineDesignWithoutStyle } = lineDesign;

		if (Object.keys(lineDesignWithoutStyle).length) {
			next[key] = lineDesignWithoutStyle;
		} else {
			delete next[key];
		}
	});

	return next;
}

/*
 * Return one display rule comparison value coerced to the primitive its
 * value-type key compares against. Null survives as the "is empty" match for
 * equality checks; undefined marks an unusable value.
 */
function normalizeSheetDisplayRuleBranchValue(
	valueType: SheetCellValueTypeEnum,
	isComparison: boolean,
	value: unknown,
): number | boolean | string | null | undefined {
	if (value === null || value === undefined || value === '') {
		// "is empty" only ever matches through equality checks
		return isComparison ? undefined : null;
	}

	switch (valueType) {
		case 'CELL_INT':
		case 'CELL_FLOAT': {
			const numberValue = Number(value);
			return Number.isFinite(numberValue) ? numberValue : undefined;
		}
		case 'CELL_BOOLEAN': {
			if (typeof value === 'boolean') {
				return value;
			}

			const text = String(value).trim().toUpperCase();
			return text === 'TRUE' ? true : text === 'FALSE' ? false : undefined;
		}
		case 'CELL_DATE': {
			const text = String(value).trim().slice(0, 10);
			return getSheetTextValueType(text) === 'CELL_DATE' ? text : undefined;
		}
		default:
			return String(value).slice(0, SHEET_DISPLAY_RULE_MAX_TEXT_LENGTH);
	}
}

/*
 * Return one normalized display rule branch for a value-type key, or null when
 * the operator or comparison value is unusable for that type.
 */
function normalizeSheetDisplayRuleBranch(
	valueType: SheetCellValueTypeEnum,
	branch: unknown,
): SheetDisplayRuleBranchObj | null {
	if (!branch || typeof branch !== 'object' || Array.isArray(branch)) {
		return null;
	}

	const source = branch as Record<string, any>;
	const op = String(source.op || '').toLowerCase() as SheetDisplayRuleOperatorEnum;

	if (!SHEET_DISPLAY_RULE_OPERATOR_ENUMS.includes(op)) {
		return null;
	}

	const isComparison = (SHEET_DISPLAY_RULE_COMPARISON_OPERATORS as readonly string[]).includes(op);

	// Ordered comparisons only make sense for numbers and dates
	if (isComparison && (valueType === 'CELL_BOOLEAN' || valueType === 'CELL_TEXT')) {
		return null;
	}

	const value = normalizeSheetDisplayRuleBranchValue(valueType, isComparison, source.value);

	if (value === undefined) {
		return null;
	}

	const then = typeof source.then === 'string' || typeof source.then === 'number'
		? String(source.then).slice(0, SHEET_DISPLAY_RULE_MAX_TEXT_LENGTH)
		: '';

	return { op, value, then };
}

/*
 * Return the only display rule fields Sheets supports, keyed by cell value
 * type, or null when nothing valid survives. Unknown type keys, unknown
 * operators, and comparison values that cannot coerce to the type key's
 * primitive all drop silently.
 */
export function normalizeSheetDisplayRules(value?: unknown): SheetDisplayRulesObj | null {
	const source = getSheetCellStyleObject(value);
	const normalized: SheetDisplayRulesObj = {};

	SHEET_CELL_VALUE_TYPE_ENUMS.forEach((valueType) => {
		const rulesForType = source[valueType];

		if (!rulesForType || typeof rulesForType !== 'object' || Array.isArray(rulesForType)) {
			return;
		}

		const branches = (Array.isArray(rulesForType.if) ? rulesForType.if : [])
			.map((branch: unknown) => normalizeSheetDisplayRuleBranch(valueType, branch))
			.filter((branch: SheetDisplayRuleBranchObj | null): branch is SheetDisplayRuleBranchObj => Boolean(branch))
			.slice(0, SHEET_DISPLAY_RULE_MAX_BRANCHES);

		const elseValue = typeof rulesForType.else === 'string' || typeof rulesForType.else === 'number'
			? String(rulesForType.else).slice(0, SHEET_DISPLAY_RULE_MAX_TEXT_LENGTH)
			: null;

		if (!branches.length && elseValue === null) {
			return;
		}

		normalized[valueType] = {
			if: branches,
			...(elseValue !== null ? { else: elseValue } : {}),
		};
	});

	return Object.keys(normalized).length ? normalized : null;
}

/*
 * Return one cell format object with its display rules validated and other
 * format keys preserved, from flexible saved Sheet format input.
 */
export function normalizeSheetCellFormat(format?: Partial<SheetCellFormatObj> | Record<string, any> | string | null): SheetCellFormatObj {
	const { displayRules: rawDisplayRules, ...rest } = getSheetCellStyleObject(format);
	const displayRules = normalizeSheetDisplayRules(rawDisplayRules);

	return displayRules ? { ...rest, displayRules } : rest;
}

/*
 * Return a shallow merged cell format following the same cascade rule as
 * styles, except display rules merge per value-type key: the most specific
 * layer that defines one CELL_* key wins that key whole.
 */
export function mergeSheetCellFormats(...values: Array<Partial<SheetCellFormatObj> | Record<string, any> | string | null | undefined>): SheetCellFormatObj {
	return values.reduce<SheetCellFormatObj>((merged, value) => {
		const format = getSheetCellStyleObject(value);

		if (!Object.keys(format).length) {
			return merged;
		}

		const { displayRules, ...rest } = format;
		// The spread keeps earlier layers' displayRules; this layer's rules merge per type key below
		const next: SheetCellFormatObj = { ...merged, ...rest };

		if (displayRules && typeof displayRules === 'object' && !Array.isArray(displayRules)) {
			const mergedRules: SheetDisplayRulesObj = { ...(merged.displayRules || {}) };

			SHEET_CELL_VALUE_TYPE_ENUMS.forEach((valueType) => {
				const rulesForType = displayRules[valueType];

				if (rulesForType && typeof rulesForType === 'object' && !Array.isArray(rulesForType)) {
					mergedRules[valueType] = rulesForType as SheetDisplayRulesForTypeObj;
				}
			});

			if (Object.keys(mergedRules).length) {
				next.displayRules = mergedRules;
			}
		}

		return next;
	}, {});
}

/*
 * Return the comparison source value one cell exposes for a display rule
 * value type. The server's stored typed columns win when present; pending or
 * optimistic cells fall back to classifying the raw display text.
 */
function getSheetDisplayRuleCellValue(
	valueType: SheetCellValueTypeEnum,
	cell?: Pick<SheetCellGQL, 'booleanValue' | 'dateValue' | 'datetimeValue' | 'numberValue'> | null,
	rawDisplayValue?: string | null,
): number | boolean | string | null {
	switch (valueType) {
		case 'CELL_INT':
		case 'CELL_FLOAT': {
			if (cell?.numberValue !== null && cell?.numberValue !== undefined) {
				return Number(cell.numberValue);
			}

			const text = String(rawDisplayValue ?? '').trim();
			const textType = getSheetTextValueType(text);
			return textType === 'CELL_INT' || textType === 'CELL_FLOAT' ? Number(text) : null;
		}
		case 'CELL_BOOLEAN': {
			if (cell?.booleanValue !== null && cell?.booleanValue !== undefined) {
				return Boolean(cell.booleanValue);
			}

			const text = String(rawDisplayValue ?? '').trim().toUpperCase();
			return text === 'TRUE' ? true : text === 'FALSE' ? false : null;
		}
		case 'CELL_DATE': {
			const dateValue = cell?.dateValue || cell?.datetimeValue;

			if (dateValue) {
				// ISO date prefix; lexicographic compare is correct for YYYY-MM-DD
				return String(dateValue).slice(0, 10);
			}

			const text = String(rawDisplayValue ?? '').trim();
			return getSheetTextValueType(text) === 'CELL_DATE' ? text : null;
		}
		default: {
			const text = String(rawDisplayValue ?? '');
			return text === '' ? null : text;
		}
	}
}

/*
 * Return whether one display rule branch matches a cell comparison value.
 * Branches with non-null values never match empty cells; empty cells only
 * match "is empty" (eq null) branches or fall through to the else text.
 */
function doesSheetDisplayRuleBranchMatch(
	branch: SheetDisplayRuleBranchObj,
	cellValue: number | boolean | string | null,
): boolean {
	if (cellValue === null) {
		return branch.value === null && branch.op === 'eq';
	}

	if (branch.value === null) {
		return branch.op === 'neq';
	}

	switch (branch.op) {
		case 'eq':
			return cellValue === branch.value;
		case 'neq':
			return cellValue !== branch.value;
		case 'gt':
			return (cellValue as number | string) > (branch.value as number | string);
		case 'gte':
			return (cellValue as number | string) >= (branch.value as number | string);
		case 'lt':
			return (cellValue as number | string) < (branch.value as number | string);
		case 'lte':
			return (cellValue as number | string) <= (branch.value as number | string);
		default:
			return false;
	}
}

/*
 * Return the display text one cell's display rules resolve to, or null when no
 * rule applies and the caller should keep the raw display value. Rules keyed
 * to a different value type than the cell's current one stay dormant. Empty
 * cells have no detectable value type, so they evaluate against the single
 * defined type key; with multiple type keys defined, empty cells are skipped
 * to avoid ambiguity.
 */
export function evaluateSheetDisplayRules(params: {
	cell?: Pick<SheetCellGQL, 'booleanValue' | 'dateValue' | 'datetimeValue' | 'numberValue'> | null;
	displayRules?: SheetDisplayRulesObj | null;
	rawDisplayValue?: string | null;
}): string | null {
	const { cell, displayRules, rawDisplayValue } = params;

	if (!displayRules || typeof displayRules !== 'object') {
		return null;
	}

	const definedTypes = SHEET_CELL_VALUE_TYPE_ENUMS.filter((valueType) => {
		const rulesForType = displayRules[valueType];
		return Boolean(rulesForType && typeof rulesForType === 'object' && !Array.isArray(rulesForType));
	});

	if (!definedTypes.length) {
		return null;
	}

	const isEmpty = !String(rawDisplayValue ?? '').trim();
	let valueType: SheetCellValueTypeEnum;

	if (isEmpty) {
		if (definedTypes.length !== 1) {
			return null;
		}

		valueType = definedTypes[0];
	} else {
		valueType = getSheetCellValueType(cell, rawDisplayValue);
	}

	const rulesForType = displayRules[valueType];

	if (!rulesForType) {
		return null;
	}

	const cellValue = isEmpty ? null : getSheetDisplayRuleCellValue(valueType, cell, rawDisplayValue);
	const branches = Array.isArray(rulesForType.if) ? rulesForType.if : [];

	for (const branch of branches) {
		if (doesSheetDisplayRuleBranchMatch(branch, cellValue)) {
			return String(branch.then ?? '');
		}
	}

	return typeof rulesForType.else === 'string' ? rulesForType.else : null;
}

/*
 * Return whether one saved cell format defines display rules — for any value
 * type by default, or for one specific value type when given.
 */
export function sheetCellFormatHasDisplayRules(
	format?: Partial<SheetCellFormatObj> | Record<string, any> | string | null,
	valueType?: SheetCellValueTypeEnum | null,
): boolean {
	const { displayRules } = getSheetCellStyleObject(format);

	if (!displayRules || typeof displayRules !== 'object' || Array.isArray(displayRules)) {
		return false;
	}

	const typeKeys = valueType ? [valueType] : SHEET_CELL_VALUE_TYPE_ENUMS;

	return typeKeys.some((typeKey) => {
		const rulesForType = displayRules[typeKey];
		return Boolean(rulesForType && typeof rulesForType === 'object' && !Array.isArray(rulesForType));
	});
}

/*
 * Return one axis design map (columns or rows) with display rule deltas merged
 * into a set of lines. A null rules value removes that value-type key from the
 * saved line format; lines whose merged format (and design) end up empty drop
 * out of the map. Whole-column/row display rules persist through these line
 * formats as a single design patch instead of one cell write per coordinate.
 */
export function mergeSheetAxisDesignLineFormats(
	axisDesign: Record<string, SheetAxisDesignObj> | null | undefined,
	lineDeltas: Array<{ key: string; rules: SheetDisplayRulesForTypeObj | null; valueType: SheetCellValueTypeEnum }>,
): Record<string, SheetAxisDesignObj> {
	const next: Record<string, SheetAxisDesignObj> = { ...(axisDesign || {}) };

	lineDeltas.forEach(({ key, rules, valueType }) => {
		const lineDesign = next[key] || {};
		const format = normalizeSheetCellFormat(lineDesign.format);
		const displayRules: SheetDisplayRulesObj = { ...(format.displayRules || {}) };
		const normalizedRules = rules ? normalizeSheetDisplayRules({ [valueType]: rules })?.[valueType] : null;

		if (normalizedRules) {
			displayRules[valueType] = normalizedRules;
		} else {
			delete displayRules[valueType];
		}

		if (Object.keys(displayRules).length) {
			format.displayRules = displayRules;
		} else {
			delete format.displayRules;
		}

		if (Object.keys(format).length) {
			next[key] = {
				...lineDesign,
				format,
			};
			return;
		}

		// An emptied format drops from the line design; an emptied line drops
		// from the axis map so the saved design stays sparse
		const { format: _droppedFormat, ...lineDesignWithoutFormat } = lineDesign;

		if (Object.keys(lineDesignWithoutFormat).length) {
			next[key] = lineDesignWithoutFormat;
		} else {
			delete next[key];
		}
	});

	return next;
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

/*
 * Return one region source filter group picked down to mutation input fields,
 * dropping GQL-only metadata so the payload round-trips through SheetRegionInput.
 */
function getSheetRegionSourceFilterInput(filter: SheetRegionSourceFilterGroupObj): Record<string, any> {
	return {
		combinator: filter.combinator,
		...(filter.conditions?.length
			? {
				conditions: filter.conditions.map((condition) => ({
					cellKey: condition.cellKey,
					operator: condition.operator,
					...(condition.textValue === null || condition.textValue === undefined ? {} : { textValue: condition.textValue }),
					...(condition.textValues?.length ? { textValues: condition.textValues } : {}),
					...(condition.numberValue === null || condition.numberValue === undefined ? {} : { numberValue: condition.numberValue }),
					...(condition.booleanValue === null || condition.booleanValue === undefined ? {} : { booleanValue: condition.booleanValue }),
					...(condition.dateValue === null || condition.dateValue === undefined ? {} : { dateValue: condition.dateValue }),
					...(condition.datetimeValue === null || condition.datetimeValue === undefined ? {} : { datetimeValue: condition.datetimeValue }),
				})),
			}
			: {}),
		...(filter.groups?.length ? { groups: filter.groups.map(getSheetRegionSourceFilterInput) } : {}),
	};
}

/*
 * Return the upsert mutation input that recreates one saved Sheet region.
 * Used to undo a region delete locally today, and shaped to stay serializable
 * for future server-persisted undo records.
 */
export function getSheetRegionInputFromRegion(region: SheetRegionGQL): Record<string, any> | null {
	const source = region.source;

	if (!source?.type || !region.type || !region.startRowIndex || !region.startColumnIndex) {
		return null;
	}

	return {
		columns: (region.columns || []).map((column) => ({
			...(column.kind ? { kind: column.kind } : {}),
			...(column.sourceCellKey ? { sourceCellKey: column.sourceCellKey } : {}),
			...(column.formulaText ? { formulaText: column.formulaText } : {}),
		})),
		source: {
			type: source.type,
			...(source.dataTableId === null || source.dataTableId === undefined ? {} : { dataTableId: String(source.dataTableId) }),
			...(source.filter ? { filter: getSheetRegionSourceFilterInput(source.filter) } : {}),
			...(source.sort?.length
				? {
					sort: source.sort.map((sort) => ({
						cellKey: sort.cellKey,
						direction: sort.direction,
					})),
				}
				: {}),
			...(source.includeRowIds?.length ? { includeRowIds: source.includeRowIds.map(String) } : {}),
		},
		startColumnIndex: region.startColumnIndex,
		startRowIndex: region.startRowIndex,
		type: region.type,
		...(region.options
			? {
				options: {
					...(region.options.conflictPolicy ? { conflictPolicy: region.options.conflictPolicy } : {}),
					...(region.options.endRowIndex === null || region.options.endRowIndex === undefined ? {} : { endRowIndex: region.options.endRowIndex }),
					...(region.options.includeHeaderRow === null || region.options.includeHeaderRow === undefined
						? {}
						: { includeHeaderRow: region.options.includeHeaderRow }),
				},
			}
			: {}),
	};
}
