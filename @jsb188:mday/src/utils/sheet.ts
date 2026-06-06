import {
	SHEET_CELL_SOURCE_TYPE_ENUMS,
	SHEET_DEFAULT_COLUMN_COUNT,
	SHEET_DEFAULT_ROW_COUNT,
	SHEET_REGION_CONFLICT_POLICY_ENUMS,
	SHEET_REGION_TYPE_ENUMS,
	SHEET_VIEWPORT_MAX_COLUMNS,
	SHEET_VIEWPORT_MAX_ROWS,
} from '../constants/sheet.ts';
import type {
	SheetAxisDesignObj,
	SheetCellSourceTypeEnum,
	SheetDesignObj,
	SheetGridViewportObj,
	SheetRangeData,
	SheetRegionConflictPolicyEnum,
	SheetRegionTypeEnum,
} from '../types/sheet.d.ts';

export type SheetFormulaOperatorTerm<Operator extends string> = {
	expression: string;
	operator: Operator;
};

export type SheetFormulaCellReference = {
	columnIndex: number;
	columnLabel: string;
	rowIndex: number;
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

export type SheetFormulaReferenceToken =
	| SheetFormulaCellReference & {
		endIndex: number;
		kind: 'SHEET_CELL';
		startIndex: number;
		text: string;
	}
	| SheetFormulaDataTableCall & {
		endIndex: number;
		kind: 'DATA_TABLE_CELL';
		startIndex: number;
	};

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

		if (char === '"') {
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

		if (char === '"') {
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
	let quoted = false;
	let escaped = false;

	for (let index = 0; index < value.length; index += 1) {
		const char = value[index];

		if (escaped) {
			current += char;
			escaped = false;
			continue;
		}

		if (char === '\\' && quoted) {
			current += char;
			escaped = true;
			continue;
		}

		if (char === '"') {
			quoted = !quoted;
			current += char;
			continue;
		}

		if (!quoted && char === '(') {
			depth += 1;
			current += char;
			continue;
		}

		if (!quoted && char === ')') {
			depth = Math.max(0, depth - 1);
			current += char;
			continue;
		}

		if (!quoted && depth === 0 && char === separator) {
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
	let quoted = false;
	let escaped = false;
	let operator = params.defaultOperator;

	for (let index = 0; index < params.value.length; index += 1) {
		const char = params.value[index];

		if (escaped) {
			current += char;
			escaped = false;
			continue;
		}

		if (char === '\\' && quoted) {
			current += char;
			escaped = true;
			continue;
		}

		if (char === '"') {
			quoted = !quoted;
			current += char;
			continue;
		}

		if (!quoted && char === '(') {
			depth += 1;
			current += char;
			continue;
		}

		if (!quoted && char === ')') {
			if (depth <= 0) {
				return null;
			}

			depth -= 1;
			current += char;
			continue;
		}

		if (!quoted && depth === 0 && operatorSet.has(char)) {
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

	if (quoted || depth !== 0) {
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
 * Parse a double-quoted formula string literal.
 */
export function parseSheetFormulaStringLiteral(value: string) {
	const trimmed = value.trim();
	if (!/^"(?:[^"\\]|\\.)*"$/.test(trimmed)) {
		return null;
	}

	try {
		const parsed = JSON.parse(trimmed);
		return typeof parsed === 'string' ? parsed : null;
	} catch {
		return null;
	}
}

/*
 * Parse a formula number literal.
 */
export function parseSheetFormulaNumberLiteral(value: string) {
	const trimmed = value.trim();
	return /^[-+]?\d+(?:\.\d+)?$/.test(trimmed) ? Number(trimmed) : null;
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

	const cellKey = parseSheetFormulaStringLiteral(call.args[1]);
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
 * Return reference tokens from formula text for live client highlighting.
 */
export function tokenizeSheetFormulaReferences(value: string): SheetFormulaReferenceToken[] {
	const tokens: SheetFormulaReferenceToken[] = [];
	let index = 0;

	while (index < value.length) {
		const char = value[index];

		if (char === '"') {
			index = getSheetFormulaStringEndIndex(value, index);
			continue;
		}

		if (isSheetFormulaIdentifierChar(value[index - 1])) {
			index += 1;
			continue;
		}

		const dataTableToken = getSheetFormulaDataTableReferenceTokenAtIndex(value, index);
		if (dataTableToken) {
			tokens.push(dataTableToken);
			index = dataTableToken.endIndex;
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
		columns: design?.columns || {},
		rows: design?.rows || {},
		defaultCellStyle: design?.defaultCellStyle || {},
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
 * Return whether one value is a known sheet region conflict policy.
 */

export function isSheetRegionConflictPolicy(value: unknown): value is SheetRegionConflictPolicyEnum {
	return SHEET_REGION_CONFLICT_POLICY_ENUMS.includes(value as SheetRegionConflictPolicyEnum);
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
