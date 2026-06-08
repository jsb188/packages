import { DEFAULT_TIMEZONE, isValidTimeZone } from '@jsb188/app/utils/timeZone.ts';
import {
	getSheetFormulaExpression,
	isSheetFormulaText,
	parseSheetFormulaExpression,
	type SheetFormulaASTNode,
} from '@jsb188/mday/utils/sheet.ts';
import type { SheetCellGQL, SheetFormulaReferenceObj } from '@jsb188/mday/types/sheet.d.ts';
import { DateTime } from 'luxon';
import { getSheetCanvasCoordKey } from './sheet-utils.ts';

type SheetFormulaRangeValue = {
	kind: 'SHEET_RANGE_VALUE';
	values: unknown[];
};

type SheetFormulaEvaluationResult = {
	error?: SheetCellGQL['formula'] extends { error?: infer T } ? T : unknown;
	loading?: boolean;
	value: unknown;
};

/*
 * Return whether one formula evaluation value is a range.
 */
function isSheetFormulaRangeValue(value: unknown): value is SheetFormulaRangeValue {
	return Boolean(value && typeof value === 'object' && (value as SheetFormulaRangeValue).kind === 'SHEET_RANGE_VALUE');
}

/*
 * Return whether a formula scalar should be treated as blank.
 */
function isSheetFormulaBlankValue(value: unknown) {
	return value === null || value === undefined || value === '';
}

/*
 * Return a string value for formula concatenation and lookups.
 */
function getSheetFormulaStringValue(value: unknown) {
	return value === null || value === undefined ? '' : String(value);
}

/*
 * Return a numeric formula value when one can be safely coerced.
 */
function getSheetFormulaNumericValue(value: unknown) {
	if (typeof value === 'number' && Number.isFinite(value)) {
		return value;
	}

	if (typeof value === 'boolean') {
		return value ? 1 : 0;
	}

	if (typeof value === 'string' && value.trim() && /^[-+]?\d+(?:\.\d+)?$/.test(value.trim())) {
		return Number(value.trim());
	}

	return null;
}

/*
 * Return a strict numeric formula value without coercing strings or booleans.
 */
function getSheetFormulaStrictNumberValue(value: unknown) {
	return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

/*
 * Return a timezone-aware DateTime for one formula date-like value.
 */
function getSheetFormulaDateTimeValue(value: unknown, timeZone: string) {
	if (value instanceof Date && Number.isFinite(value.getTime())) {
		return DateTime.fromJSDate(value, { zone: timeZone });
	}

	if (typeof value === 'string' && value.trim()) {
		const dateTime = DateTime.fromISO(value.trim(), { zone: timeZone });
		return dateTime.isValid ? dateTime : null;
	}

	return null;
}

/*
 * Return a normalized formula error object.
 */
function getSheetFormulaEvaluationError(code: string, message: string) {
	return {
		code,
		message,
	};
}

/*
 * Return a formula error result.
 */
function getSheetFormulaErrorResult(code: string, message: string): SheetFormulaEvaluationResult {
	return {
		error: getSheetFormulaEvaluationError(code, message),
		value: code === 'NOT_FOUND' ? '#N/A' : '#ERROR!',
	};
}

/*
 * Return one scalar value from a Sheet cell.
 */
function getSheetFormulaCellScalarValue(cell?: SheetCellGQL | null) {
	if (!cell) {
		return null;
	}

	if (cell.numberValue !== null && cell.numberValue !== undefined) {
		return cell.numberValue;
	}

	if (cell.booleanValue !== null && cell.booleanValue !== undefined) {
		return cell.booleanValue;
	}

	if (cell.dateValue) {
		return String(cell.dateValue).split('T')[0];
	}

	if (cell.datetimeValue) {
		return String(cell.datetimeValue);
	}

	if (cell.textValue !== null && cell.textValue !== undefined) {
		return cell.textValue;
	}

	return cell.value ?? null;
}

/*
 * Return typed cell fields from one formula result value.
 */
function getSheetFormulaResultTypedValues(value: unknown) {
	if (typeof value === 'number' && Number.isFinite(value)) {
		return {
			value: String(value),
			textValue: null,
			numberValue: value,
			booleanValue: null,
			dateValue: null,
			datetimeValue: null,
		};
	}

	if (typeof value === 'boolean') {
		return {
			value: String(value),
			textValue: value ? 'TRUE' : 'FALSE',
			numberValue: null,
			booleanValue: value,
			dateValue: null,
			datetimeValue: null,
		};
	}

	const textValue = value === null || value === undefined ? null : String(value);
	return {
		value: textValue,
		textValue,
		numberValue: null,
		booleanValue: null,
		dateValue: /^\d{4}-\d{2}-\d{2}$/.test(textValue || '') ? textValue : null,
		datetimeValue: textValue && /^\d{4}-\d{2}-\d{2}T/.test(textValue) ? textValue : null,
	};
}

/*
 * Return whether a Sheet cell has a formula that the client should evaluate.
 */
export function sheetCellCanClientCalculateFormula(cell?: SheetCellGQL | null) {
	const formulaText = cell?.formula?.text || cell?.rawInput || '';

	return cell?.sourceType !== 'REGION_GENERATED' && isSheetFormulaText(formulaText);
}

/*
 * Return formula references stored on cells keyed by dependency id.
 */
export function getSheetFormulaReferencesById(references?: SheetFormulaReferenceObj[] | null) {
	const referencesById = new Map<string, SheetFormulaReferenceObj>();

	(references || []).forEach((reference) => {
		if (reference?.id) {
			referencesById.set(reference.id, reference);
		}
	});

	return referencesById;
}

/*
 * Return formula references from all cells in one coordinate map.
 */
export function getSheetFormulaReferencesFromCells(cellsByCoord: Map<string, SheetCellGQL>) {
	const referencesById = new Map<string, SheetFormulaReferenceObj>();

	cellsByCoord.forEach((cell) => {
		(cell.formula?.references || []).forEach((reference) => {
			if (reference?.id) {
				referencesById.set(reference.id, reference);
			}
		});
	});

	return Array.from(referencesById.values());
}

/*
 * Return fetched dependency cells from formula reference payloads keyed by sheet coordinate.
 */
export function getSheetFormulaReferenceCellsByCoord(references?: SheetFormulaReferenceObj[] | null) {
	const cellsByCoord = new Map<string, SheetCellGQL>();

	(references || []).forEach((reference) => {
		(reference.cells || []).forEach((cell) => {
			if (cell?.rowIndex && cell.columnIndex) {
				cellsByCoord.set(getSheetCanvasCoordKey(Number(cell.rowIndex), Number(cell.columnIndex)), cell as SheetCellGQL);
			}
		});
	});

	return cellsByCoord;
}

/*
 * Return a formula cell with reference values overlaid from the reactive reference cache.
 */
function getSheetFormulaCellWithResolvedReferences(cell: SheetCellGQL, referencesById?: Map<string, SheetFormulaReferenceObj> | null) {
	if (!referencesById?.size || !cell.formula?.references?.length) {
		return cell;
	}

	return {
		...cell,
		formula: {
			...cell.formula,
			references: cell.formula.references.map((reference) => {
				return reference.id ? referencesById.get(reference.id) || reference : reference;
			}),
		},
	};
}

/*
 * Return runtime references for one formula cell after applying reactive cache overlays.
 */
function getSheetFormulaCellReferences(cell: SheetCellGQL, referencesById?: Map<string, SheetFormulaReferenceObj> | null) {
	return getSheetFormulaCellWithResolvedReferences(cell, referencesById).formula?.references || [];
}

/*
 * Return the parsed data table function metadata from one formula function node.
 */
function getSheetFormulaDataTableFunctionNode(node: Extract<SheetFormulaASTNode, { kind: 'FUNCTION_CALL' }>) {
	const cellKeyNode = node.args[1];
	if (!node.name.startsWith('@') || node.args.length !== 2 || cellKeyNode?.kind !== 'STRING_LITERAL') {
		return null;
	}

	return {
		cellKey: cellKeyNode.value,
		dataTableName: node.name.replace(/^@/, '').toLowerCase(),
		rowIdentifierNode: node.args[0],
		text: node.text,
	};
}

/*
 * Return the current row identifier state for a data table formula call.
 */
function getSheetFormulaDataTableRowIdentifierState(params: {
	cell: SheetCellGQL;
	cellsByCoord: Map<string, SheetCellGQL>;
	node: Extract<SheetFormulaASTNode, { kind: 'FUNCTION_CALL' }>;
	referencesById?: Map<string, SheetFormulaReferenceObj> | null;
}) {
	const dataTableNode = getSheetFormulaDataTableFunctionNode(params.node);
	const rowIdentifierNode = dataTableNode?.rowIdentifierNode;
	if (!rowIdentifierNode) {
		return null;
	}

	if (rowIdentifierNode.kind === 'STRING_LITERAL' || rowIdentifierNode.kind === 'NUMBER_LITERAL' || rowIdentifierNode.kind === 'BOOLEAN_LITERAL') {
		return {
			rowIdentifier: getSheetFormulaStringValue(rowIdentifierNode.value),
			status: 'READY' as const,
		};
	}

	if (rowIdentifierNode.kind !== 'CELL_REFERENCE') {
		return {
			error: getSheetFormulaEvaluationError('INVALID_FORMULA', 'Data table row lookup must use one literal value or one sheet cell reference.'),
			status: 'ERROR' as const,
		};
	}

	const reference = findSheetFormulaCellReference(params.cell, rowIdentifierNode, params.referencesById);
	if (reference?.status === 'LOADING') {
		return {
			status: 'LOADING' as const,
		};
	}

	if (reference?.status === 'ERROR') {
		return {
			error: getSheetFormulaEvaluationError(reference.error?.code || 'INVALID_FORMULA', reference.error?.message || 'Formula dependency is invalid.'),
			status: 'ERROR' as const,
		};
	}

	const coordKey = getSheetCanvasCoordKey(rowIdentifierNode.reference.rowIndex, rowIdentifierNode.reference.columnIndex);
	const targetCell = params.cellsByCoord.get(coordKey);
	if (sheetCellCanClientCalculateFormula(targetCell)) {
		return {
			error: getSheetFormulaEvaluationError('INVALID_FORMULA', 'Formula references cannot use another formula cell as a dependency.'),
			status: 'ERROR' as const,
		};
	}

	return {
		rowIdentifier: getSheetFormulaStringValue(getSheetFormulaCellScalarValue(targetCell)),
		status: 'READY' as const,
	};
}

/*
 * Return formula references that need the server dependency resolver.
 */
export function getSheetFormulaReferencesNeedingServerResolution(params: {
	cellsByCoord: Map<string, SheetCellGQL>;
	references?: SheetFormulaReferenceObj[] | null;
	referencesById?: Map<string, SheetFormulaReferenceObj> | null;
}) {
	const referencesById = params.referencesById || getSheetFormulaReferencesById(params.references);
	const referencesToResolve = new Map<string, SheetFormulaReferenceObj>();

	(params.references || []).forEach((reference) => {
		if (!reference?.id) {
			return;
		}

		const resolvedReference = referencesById.get(reference.id) || reference;
		if (resolvedReference.status === 'LOADING') {
			referencesToResolve.set(reference.id, resolvedReference);
			return;
		}

		if (
			(resolvedReference.kind === 'SHEET_CELL' || resolvedReference.kind === 'SHEET_RANGE') &&
			Array.isArray(resolvedReference.cells)
		) {
			referencesToResolve.set(reference.id, resolvedReference);
			return;
		}

		if (resolvedReference.kind !== 'DATA_TABLE_CELL') {
			return;
		}

		referencesToResolve.set(reference.id, resolvedReference);
		const node = resolvedReference.text ? parseSheetFormulaExpression(resolvedReference.text) : null;
		if (node?.kind !== 'FUNCTION_CALL') {
			return;
		}

		const rowIdentifier = getSheetFormulaDataTableRowIdentifierState({
			cell: {
				formula: {
					engine: 'client',
					references: params.references || [],
					text: `=${resolvedReference.text}`,
					version: 0,
				},
			},
			cellsByCoord: params.cellsByCoord,
			node,
			referencesById,
		});
		if (!rowIdentifier) {
			return;
		}

		if (rowIdentifier.status !== 'READY') {
			referencesToResolve.set(reference.id, {
				...resolvedReference,
				rowIdentifier: null,
				status: 'LOADING',
			});
			return;
		}

		if (rowIdentifier.rowIdentifier !== (resolvedReference.rowIdentifier || '')) {
			referencesToResolve.set(reference.id, {
				...resolvedReference,
				rowIdentifier: rowIdentifier.rowIdentifier,
				status: 'LOADING',
			});
		}
	});

	return Array.from(referencesToResolve.values());
}

/*
 * Return the runtime formula reference matching one cell reference node.
 */
function findSheetFormulaCellReference(
	cell: SheetCellGQL,
	node: Extract<SheetFormulaASTNode, { kind: 'CELL_REFERENCE' }>,
	referencesById?: Map<string, SheetFormulaReferenceObj> | null,
) {
	return getSheetFormulaCellReferences(cell, referencesById).find((reference) => {
		return reference.kind === 'SHEET_CELL' &&
			Number(reference.rowIndex || 0) === node.reference.rowIndex &&
			Number(reference.columnIndex || 0) === node.reference.columnIndex;
	});
}

/*
 * Return the runtime formula reference matching one range reference node.
 */
function findSheetFormulaRangeReference(
	cell: SheetCellGQL,
	node: Extract<SheetFormulaASTNode, { kind: 'RANGE_REFERENCE' }>,
	referencesById?: Map<string, SheetFormulaReferenceObj> | null,
) {
	return getSheetFormulaCellReferences(cell, referencesById).find((reference) => {
		return reference.kind === 'SHEET_RANGE' &&
			Number(reference.startRowIndex || 0) === node.reference.startRowIndex &&
			Number(reference.startColumnIndex || 0) === node.reference.startColumnIndex &&
			Number(reference.endRowIndex || 0) === node.reference.endRowIndex &&
			Number(reference.endColumnIndex || 0) === node.reference.endColumnIndex;
	});
}

/*
 * Return the runtime formula reference matching one data table function node.
 */
function findSheetFormulaDataTableReference(
	cell: SheetCellGQL,
	node: Extract<SheetFormulaASTNode, { kind: 'FUNCTION_CALL' }>,
	referencesById?: Map<string, SheetFormulaReferenceObj> | null,
) {
	return getSheetFormulaCellReferences(cell, referencesById).find((reference) => {
		return reference.kind === 'DATA_TABLE_CELL' && reference.text === node.text;
	});
}

/*
 * Return scalar values from a formula argument list, flattening range values.
 */
function flattenSheetFormulaValueEntries(values: unknown[]) {
	return values.flatMap((value) => {
		if (isSheetFormulaRangeValue(value)) {
			return value.values.map((rangeValue) => ({
				fromRange: true,
				value: rangeValue,
			}));
		}

		return [{
			fromRange: false,
			value,
		}];
	});
}

/*
 * Return aggregate numeric values, ignoring blanks and text from ranges.
 */
function getSheetFormulaAggregateNumbers(values: unknown[]) {
	const numbers: number[] = [];

	for (const entry of flattenSheetFormulaValueEntries(values)) {
		if (isSheetFormulaBlankValue(entry.value)) {
			continue;
		}

		const numberValue = getSheetFormulaNumericValue(entry.value);
		if (numberValue !== null) {
			numbers.push(numberValue);
			continue;
		}

		if (!entry.fromRange) {
			return null;
		}
	}

	return numbers;
}

/*
 * Return numeric function arguments from scalar and range values.
 */
function getSheetFormulaNumericArgs(values: unknown[], minCount: number, maxCount: number) {
	const entries = flattenSheetFormulaValueEntries(values).filter((entry) => !isSheetFormulaBlankValue(entry.value));
	if (entries.length < minCount || entries.length > maxCount) {
		return null;
	}

	const numbers = entries.map((entry) => getSheetFormulaNumericValue(entry.value));
	return numbers.every((value) => value !== null) ? numbers as number[] : null;
}

/*
 * Evaluate one supported aggregate formula function.
 */
function evaluateSheetFormulaAggregateFunction(name: string, values: unknown[]): SheetFormulaEvaluationResult | null {
	if (!['AVERAGE', 'COUNT', 'COUNTA', 'MAX', 'MIN', 'SUM'].includes(name)) {
		return null;
	}

	if (name === 'COUNT') {
		return {
			value: flattenSheetFormulaValueEntries(values).filter((entry) => getSheetFormulaStrictNumberValue(entry.value) !== null).length,
		};
	}

	if (name === 'COUNTA') {
		return {
			value: flattenSheetFormulaValueEntries(values).filter((entry) => !isSheetFormulaBlankValue(entry.value)).length,
		};
	}

	const numbers = getSheetFormulaAggregateNumbers(values);
	if (!numbers) {
		return getSheetFormulaErrorResult('INVALID_FORMULA', 'Formula function requires numeric values.');
	}

	if (name === 'SUM') {
		return {
			value: numbers.reduce((sum, value) => sum + value, 0),
		};
	}

	if (name === 'AVERAGE') {
		return numbers.length
			? {
				value: numbers.reduce((sum, value) => sum + value, 0) / numbers.length,
			}
			: getSheetFormulaErrorResult('DIVIDE_BY_ZERO', 'Formula average requires at least one numeric value.');
	}

	return numbers.length
		? {
			value: name === 'MIN' ? Math.min(...numbers) : Math.max(...numbers),
		}
		: getSheetFormulaErrorResult('INVALID_FORMULA', 'Formula function requires numeric values.');
}

/*
 * Round one formula number using the requested rounding mode.
 */
function roundSheetFormulaNumber(value: number, places: number, mode: 'DOWN' | 'NEAREST' | 'UP') {
	const factor = 10 ** Math.trunc(places);
	if (mode === 'UP') {
		return Math.sign(value || 1) * Math.ceil(Math.abs(value) * factor) / factor;
	}

	if (mode === 'DOWN') {
		return Math.sign(value || 1) * Math.floor(Math.abs(value) * factor) / factor;
	}

	return Math.round((value + Number.EPSILON) * factor) / factor;
}

/*
 * Evaluate one supported numeric formula function.
 */
function evaluateSheetFormulaMathFunction(name: string, values: unknown[]): SheetFormulaEvaluationResult | null {
	const unaryArgs = name === 'ABS' ? getSheetFormulaNumericArgs(values, 1, 1) : null;
	if (unaryArgs) {
		return {
			value: Math.abs(unaryArgs[0]),
		};
	}

	const roundArgs = ['ROUND', 'ROUNDDOWN', 'ROUNDUP'].includes(name) ? getSheetFormulaNumericArgs(values, 1, 2) : null;
	if (roundArgs) {
		return {
			value: roundSheetFormulaNumber(
				roundArgs[0],
				roundArgs[1] || 0,
				name === 'ROUNDUP' ? 'UP' : name === 'ROUNDDOWN' ? 'DOWN' : 'NEAREST',
			),
		};
	}

	const ceilingFloorArgs = ['CEILING', 'FLOOR'].includes(name) ? getSheetFormulaNumericArgs(values, 1, 2) : null;
	if (ceilingFloorArgs) {
		const significance = ceilingFloorArgs[1] || 1;
		if (significance === 0) {
			return getSheetFormulaErrorResult('DIVIDE_BY_ZERO', 'Formula significance cannot be zero.');
		}

		return {
			value: (name === 'CEILING' ? Math.ceil : Math.floor)(ceilingFloorArgs[0] / significance) * significance,
		};
	}

	const binaryArgs = ['MOD', 'POWER'].includes(name) ? getSheetFormulaNumericArgs(values, 2, 2) : null;
	if (binaryArgs && name === 'MOD') {
		return binaryArgs[1] === 0
			? getSheetFormulaErrorResult('DIVIDE_BY_ZERO', 'Formula cannot divide by zero.')
			: {
				value: ((binaryArgs[0] % binaryArgs[1]) + binaryArgs[1]) % binaryArgs[1],
			};
	}

	if (binaryArgs && name === 'POWER') {
		return {
			value: binaryArgs[0] ** binaryArgs[1],
		};
	}

	return ['ABS', 'CEILING', 'FLOOR', 'MOD', 'POWER', 'ROUND', 'ROUNDDOWN', 'ROUNDUP'].includes(name)
		? getSheetFormulaErrorResult('INVALID_FORMULA', 'Formula function requires numeric values.')
		: null;
}

/*
 * Evaluate one supported date formula function.
 */
function evaluateSheetFormulaDateFunction(name: string, values: unknown[], timeZone: string, now: Date): SheetFormulaEvaluationResult | null {
	if (name === 'TODAY') {
		return values.length
			? getSheetFormulaErrorResult('INVALID_FORMULA', 'TODAY does not accept arguments.')
			: {
				value: DateTime.fromJSDate(now, { zone: timeZone }).toFormat('yyyy-MM-dd'),
			};
	}

	if (name === 'NOW') {
		return values.length
			? getSheetFormulaErrorResult('INVALID_FORMULA', 'NOW does not accept arguments.')
			: {
				value: DateTime.fromJSDate(now, { zone: timeZone }).toISO(),
			};
	}

	if (name === 'DATE') {
		const args = getSheetFormulaNumericArgs(values, 3, 3);
		const dateTime = args
			? DateTime.fromObject({
				year: Math.trunc(args[0]),
				month: Math.trunc(args[1]),
				day: Math.trunc(args[2]),
			}, {
				zone: timeZone,
			})
			: null;

		return dateTime?.isValid
			? {
				value: dateTime.toFormat('yyyy-MM-dd'),
			}
			: getSheetFormulaErrorResult('INVALID_FORMULA', 'DATE requires valid year, month, and day values.');
	}

	if (['DAY', 'MONTH', 'YEAR'].includes(name)) {
		const entries = flattenSheetFormulaValueEntries(values).filter((entry) => !isSheetFormulaBlankValue(entry.value));
		const dateTime = entries.length === 1 ? getSheetFormulaDateTimeValue(entries[0].value, timeZone) : null;
		if (!dateTime?.isValid) {
			return getSheetFormulaErrorResult('INVALID_FORMULA', 'Formula date function requires one date value.');
		}

		return {
			value: name === 'YEAR' ? dateTime.year : name === 'MONTH' ? dateTime.month : dateTime.day,
		};
	}

	return null;
}

/*
 * Evaluate one binary arithmetic or comparison operation.
 */
function evaluateSheetFormulaBinaryValues(left: unknown, right: unknown, operator: string): SheetFormulaEvaluationResult {
	if (isSheetFormulaRangeValue(left) || isSheetFormulaRangeValue(right)) {
		return getSheetFormulaErrorResult('INVALID_FORMULA', 'Formula arithmetic cannot use a range directly.');
	}

	if (['=', '!=', '<>', '<', '<=', '>', '>='].includes(operator)) {
		const leftNumber = getSheetFormulaNumericValue(left);
		const rightNumber = getSheetFormulaNumericValue(right);
		const useNumbers = leftNumber !== null && rightNumber !== null;
		const leftValue = useNumbers ? leftNumber : getSheetFormulaStringValue(left);
		const rightValue = useNumbers ? rightNumber : getSheetFormulaStringValue(right);

		return {
			value: operator === '='
				? leftValue === rightValue
				: operator === '!=' || operator === '<>'
				? leftValue !== rightValue
				: operator === '<'
				? leftValue < rightValue
				: operator === '<='
				? leftValue <= rightValue
				: operator === '>'
				? leftValue > rightValue
				: leftValue >= rightValue,
		};
	}

	if (operator === '+') {
		const leftNumber = getSheetFormulaNumericValue(left);
		const rightNumber = getSheetFormulaNumericValue(right);
		return {
			value: leftNumber !== null && rightNumber !== null
				? leftNumber + rightNumber
				: getSheetFormulaStringValue(left) + getSheetFormulaStringValue(right),
		};
	}

	const leftNumber = getSheetFormulaNumericValue(left);
	const rightNumber = getSheetFormulaNumericValue(right);
	if (leftNumber === null || rightNumber === null) {
		return getSheetFormulaErrorResult('INVALID_FORMULA', 'Formula arithmetic requires numeric values.');
	}

	if (operator === '-') {
		return {
			value: leftNumber - rightNumber,
		};
	}

	if (operator === '*') {
		return {
			value: leftNumber * rightNumber,
		};
	}

	return rightNumber === 0
		? getSheetFormulaErrorResult('DIVIDE_BY_ZERO', 'Formula cannot divide by zero.')
		: {
			value: leftNumber / rightNumber,
		};
}

/*
 * Evaluate a formula AST node against available Sheet cells and runtime references.
 */
function evaluateSheetFormulaNode(params: {
	cell: SheetCellGQL;
	cellsByCoord: Map<string, SheetCellGQL>;
	node: SheetFormulaASTNode;
	now: Date;
	referencesById?: Map<string, SheetFormulaReferenceObj> | null;
	stack: Set<string>;
	timeZone: string;
}): SheetFormulaEvaluationResult {
	if (params.node.kind === 'NUMBER_LITERAL' || params.node.kind === 'STRING_LITERAL' || params.node.kind === 'BOOLEAN_LITERAL') {
		return {
			value: params.node.value,
		};
	}

	if (params.node.kind === 'CELL_REFERENCE') {
		const reference = findSheetFormulaCellReference(params.cell, params.node, params.referencesById);
		if (reference?.status === 'LOADING') {
			return {
				loading: true,
				value: null,
			};
		}

		if (reference?.status === 'ERROR') {
			return getSheetFormulaErrorResult(reference.error?.code || 'INVALID_FORMULA', reference.error?.message || 'Formula dependency is invalid.');
		}

		const coordKey = getSheetCanvasCoordKey(params.node.reference.rowIndex, params.node.reference.columnIndex);
		if (params.stack.has(coordKey)) {
			return getSheetFormulaErrorResult('CIRCULAR_REFERENCE', 'Formula cannot reference itself.');
		}

		const targetCell = params.cellsByCoord.get(coordKey);
		if (!targetCell?.formula?.text) {
			return {
				value: getSheetFormulaCellScalarValue(targetCell),
			};
		}

		params.stack.add(coordKey);
		const result = evaluateSheetCellFormulaValue({
			cell: targetCell,
			cellsByCoord: params.cellsByCoord,
			now: params.now,
			referencesById: params.referencesById,
			stack: params.stack,
			timeZone: params.timeZone,
		});
		params.stack.delete(coordKey);
		return result;
	}

	if (params.node.kind === 'RANGE_REFERENCE') {
		const reference = findSheetFormulaRangeReference(params.cell, params.node, params.referencesById);
		if (reference?.status === 'LOADING') {
			return {
				loading: true,
				value: null,
			};
		}

		const values: unknown[] = [];
		for (let rowIndex = params.node.reference.startRowIndex; rowIndex <= params.node.reference.endRowIndex; rowIndex += 1) {
			for (let columnIndex = params.node.reference.startColumnIndex; columnIndex <= params.node.reference.endColumnIndex; columnIndex += 1) {
				const coordKey = getSheetCanvasCoordKey(rowIndex, columnIndex);
				const targetCell = params.cellsByCoord.get(coordKey);

				if (!targetCell?.formula?.text) {
					values.push(getSheetFormulaCellScalarValue(targetCell));
					continue;
				}

				if (params.stack.has(coordKey)) {
					return getSheetFormulaErrorResult('CIRCULAR_REFERENCE', 'Formula cannot reference itself.');
				}

				params.stack.add(coordKey);
				const result = evaluateSheetCellFormulaValue({
					cell: targetCell,
					cellsByCoord: params.cellsByCoord,
					now: params.now,
					referencesById: params.referencesById,
					stack: params.stack,
					timeZone: params.timeZone,
				});
				params.stack.delete(coordKey);
				if (result.loading || result.error) {
					return result;
				}

				values.push(result.value);
			}
		}

		return {
			value: {
				kind: 'SHEET_RANGE_VALUE',
				values,
			} satisfies SheetFormulaRangeValue,
		};
	}

	if (params.node.kind === 'FUNCTION_CALL') {
		const dataTableReference = findSheetFormulaDataTableReference(params.cell, params.node, params.referencesById);
		if (dataTableReference) {
			const rowIdentifier = getSheetFormulaDataTableRowIdentifierState({
				cell: params.cell,
				cellsByCoord: params.cellsByCoord,
				node: params.node,
				referencesById: params.referencesById,
			});
			if (rowIdentifier?.status === 'LOADING') {
				return {
					loading: true,
					value: null,
				};
			}

			if (rowIdentifier?.status === 'ERROR') {
				return getSheetFormulaErrorResult(rowIdentifier.error.code, rowIdentifier.error.message);
			}

			if (rowIdentifier?.status === 'READY' && rowIdentifier.rowIdentifier !== (dataTableReference.rowIdentifier || '')) {
				return {
					loading: true,
					value: null,
				};
			}

			if (dataTableReference.status === 'LOADING') {
				return {
					loading: true,
					value: null,
				};
			}

			if (dataTableReference.status === 'NOT_FOUND') {
				return getSheetFormulaErrorResult('NOT_FOUND', dataTableReference.error?.message || 'Formula data table reference could not be resolved.');
			}

			if (dataTableReference.status === 'ERROR') {
				return getSheetFormulaErrorResult(dataTableReference.error?.code || 'INVALID_FORMULA', dataTableReference.error?.message || 'Formula dependency is invalid.');
			}

			return {
				value: dataTableReference.numberValue !== null && dataTableReference.numberValue !== undefined
					? dataTableReference.numberValue
					: dataTableReference.booleanValue !== null && dataTableReference.booleanValue !== undefined
					? dataTableReference.booleanValue
					: dataTableReference.dateValue || dataTableReference.datetimeValue || dataTableReference.textValue || dataTableReference.value || null,
			};
		}

		if (params.node.name.startsWith('@')) {
			return {
				loading: true,
				value: null,
			};
		}

		const values: unknown[] = [];
		for (const arg of params.node.args) {
			const result = evaluateSheetFormulaNode({
				...params,
				node: arg,
			});
			if (result.loading || result.error) {
				return result;
			}

			values.push(result.value);
		}

		const name = params.node.name.replace(/^@/, '').toUpperCase();
		return evaluateSheetFormulaAggregateFunction(name, values) ||
			evaluateSheetFormulaDateFunction(name, values, params.timeZone, params.now) ||
			evaluateSheetFormulaMathFunction(name, values) ||
			getSheetFormulaErrorResult('UNKNOWN_FUNCTION', 'Formula function is not supported.');
	}

	if (params.node.kind === 'UNARY_EXPRESSION') {
		const result = evaluateSheetFormulaNode({
			...params,
			node: params.node.value,
		});
		if (result.loading || result.error) {
			return result;
		}

		const numberValue = getSheetFormulaNumericValue(result.value);
		return numberValue === null
			? getSheetFormulaErrorResult('INVALID_FORMULA', 'Formula arithmetic requires numeric values.')
			: {
				value: params.node.operator === '-' ? -numberValue : numberValue,
			};
	}

	if (params.node.kind === 'BINARY_EXPRESSION') {
		const left = evaluateSheetFormulaNode({
			...params,
			node: params.node.left,
		});
		if (left.loading || left.error) {
			return left;
		}

		const right = evaluateSheetFormulaNode({
			...params,
			node: params.node.right,
		});
		if (right.loading || right.error) {
			return right;
		}

		return evaluateSheetFormulaBinaryValues(left.value, right.value, params.node.operator);
	}

	return getSheetFormulaErrorResult('INVALID_FORMULA', 'Formula syntax is not supported.');
}

/*
 * Evaluate one Sheet formula cell against available client-side dependencies.
 */
function evaluateSheetCellFormulaValue(params: {
	cell: SheetCellGQL;
	cellsByCoord: Map<string, SheetCellGQL>;
	now: Date;
	referencesById?: Map<string, SheetFormulaReferenceObj> | null;
	stack: Set<string>;
	timeZone: string;
}) {
	const formulaText = params.cell.formula?.text || params.cell.rawInput || '';
	const node = isSheetFormulaText(formulaText)
		? parseSheetFormulaExpression(getSheetFormulaExpression(formulaText))
		: null;

	return node
		? evaluateSheetFormulaNode({
			cell: getSheetFormulaCellWithResolvedReferences(params.cell, params.referencesById),
			cellsByCoord: params.cellsByCoord,
			node,
			now: params.now,
			referencesById: params.referencesById,
			stack: params.stack,
			timeZone: params.timeZone,
		})
		: getSheetFormulaErrorResult('INVALID_FORMULA', 'Formula syntax is not supported.');
}

/*
 * Return one Sheet cell with client-calculated formula values applied.
 */
export function getClientCalculatedSheetFormulaCell(params: {
	cell: SheetCellGQL;
	cellsByCoord: Map<string, SheetCellGQL>;
	now?: Date | null;
	referencesById?: Map<string, SheetFormulaReferenceObj> | null;
	timeZone?: string | null;
}) {
	if (params.cell.sourceType === 'REGION_GENERATED') {
		return params.cell;
	}

	const formulaText = params.cell.formula?.text || params.cell.rawInput || '';
	if (!isSheetFormulaText(formulaText)) {
		return params.cell;
	}

	const result = evaluateSheetCellFormulaValue({
		cell: getSheetFormulaCellWithResolvedReferences(params.cell, params.referencesById),
		cellsByCoord: params.cellsByCoord,
		now: params.now || new Date(),
		referencesById: params.referencesById,
		stack: new Set([getSheetCanvasCoordKey(Number(params.cell.rowIndex || 0), Number(params.cell.columnIndex || 0))]),
		timeZone: isValidTimeZone(params.timeZone) ? params.timeZone || DEFAULT_TIMEZONE : DEFAULT_TIMEZONE,
	});
	const typedValues = getSheetFormulaResultTypedValues(result.error ? result.value : result.value);

	return {
		...params.cell,
		...typedValues,
		formula: {
			...params.cell.formula,
			engine: params.cell.formula?.engine || 'client',
			text: formulaText,
			version: params.cell.formula?.version || 0,
			error: result.error || null,
		},
		__formulaLoading: result.loading === true,
	} as SheetCellGQL & { __formulaLoading?: boolean };
}
