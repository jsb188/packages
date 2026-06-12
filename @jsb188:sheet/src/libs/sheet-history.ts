import type { DataTableGQL } from '@jsb188/mday/types/dataTable.d.ts';
import { isSheetFormulaText, normalizeSheetCellStyle } from '@jsb188/mday/utils/sheet.ts';
import type { SheetCellGQL, SheetCellStyleObj, SheetRegionGQL } from '@jsb188/mday/types/sheet.d.ts';
import { useCallback, useRef } from 'react';
import type { DataTableCellLookup } from './dataTable-cell-editing.tsx';
import { getSheetCanvasCellDraftValue, getSheetCanvasCoordKey } from './sheet-utils.ts';
import {
	createGridUndoRedoStack,
	pushGridUndoEntry,
	takeGridRedoEntry,
	takeGridUndoEntry,
	type GridUndoRedoDirection,
} from './grid-undo-redo.ts';

export type SheetCellEditInput = {
	cell: {
		columnIndex: number;
		format?: string | null;
		note?: string | null;
		rawInput?: string | null;
		regionId?: string | number | bigint | null;
		rowIndex: number;
		style?: SheetCellStyleObj | null;
		value?: string | null;
	};
	clear?: boolean | null;
};

export type SheetDesignPatchInput = {
	columns?: string | null;
	defaultCellStyle?: SheetCellStyleObj | null;
	metadata?: string | null;
	rows?: string | null;
};

export type SheetDataTableCellEditTarget = {
	cellKey: string;
	columnIndex: number;
	dataTable: DataTableGQL;
	lookup: DataTableCellLookup;
	region: SheetRegionGQL;
	rowId: string;
	rowIndex: number;
	sourceCellKey: string;
	sourceRowId: string;
};

export type SheetCellHistoryChange = {
	after: SheetCellEditInput;
	before: SheetCellEditInput;
};

export type SheetDataTableCellHistoryChange = {
	after: string | null;
	before: string | null;
	target: SheetDataTableCellEditTarget;
};

export type SheetDesignHistoryChange = {
	after: SheetDesignPatchInput;
	before: SheetDesignPatchInput;
};

export type SheetUndoRedoEntry = {
	dataTableCells?: SheetDataTableCellHistoryChange[];
	design?: SheetDesignHistoryChange;
	sheetCells?: SheetCellHistoryChange[];
};

type OptimisticSheetCellGQL = SheetCellGQL & {
	__optimisticInput?: SheetCellEditInput;
};

/*
 * Return a normalized style object for mutation and history payloads.
 */
function getSheetHistoryStyle(style: SheetCellGQL['style'] | SheetCellStyleObj | null | undefined) {
	const normalizedStyle = normalizeSheetCellStyle(style);

	return Object.keys(normalizedStyle).length ? normalizedStyle : null;
}

/*
 * Return a stable comparison key for one optional Sheet style input.
 */
function getSheetHistoryStyleComparisonValue(style?: SheetCellStyleObj | null) {
	return JSON.stringify(getSheetHistoryStyle(style) || {});
}

/*
 * Return whether one generated region marker carries saved Sheet-owned design fields.
 */
function generatedRegionCellHasSheetDesign(cell: SheetCellGQL) {
	return Boolean(getSheetHistoryStyle(cell.style) || cell.format || cell.note);
}

/*
 * Return whether one saved Sheet-owned cell carries editable value content.
 */
function sheetCellHasEditableValueContent(cell?: SheetCellGQL | null) {
	if (!cell || cell.sourceType === 'REGION_GENERATED') {
		return false;
	}

	return [
		cell.rawInput,
		cell.value,
		cell.textValue,
		cell.numberValue,
		cell.booleanValue,
		cell.dateValue,
		cell.datetimeValue,
		cell.formula,
	].some((value) => value !== null && value !== undefined && value !== '');
}

/*
 * Return whether one sparse edit input writes an empty text value.
 */
function sheetCellEditInputSetsEmptyValue(input: SheetCellEditInput, currentCell?: SheetCellGQL | null) {
	const cell = input.cell;
	const hasRawInput = Object.prototype.hasOwnProperty.call(input.cell, 'rawInput');
	const hasValue = Object.prototype.hasOwnProperty.call(input.cell, 'value');
	const hasNonValueEdit =
		(Object.prototype.hasOwnProperty.call(cell, 'format') && (cell.format ?? null) !== (currentCell?.format ?? null)) ||
		(Object.prototype.hasOwnProperty.call(cell, 'note') && (cell.note ?? null) !== (currentCell?.note ?? null)) ||
		(Object.prototype.hasOwnProperty.call(cell, 'regionId') && (cell.regionId ?? null) !== (currentCell?.regionId ?? null)) ||
		(Object.prototype.hasOwnProperty.call(cell, 'style') && getSheetHistoryStyleComparisonValue(cell.style) !== getSheetHistoryStyleComparisonValue(currentCell?.style));

	if (input.clear || hasNonValueEdit || (!hasRawInput && !hasValue)) {
		return false;
	}

	return (input.cell.rawInput ?? '') === '' && (input.cell.value ?? '') === '';
}

/*
 * Return a sparse cell input for a text value edit.
 */
export function getSheetValueEditInput(rowIndex: number, columnIndex: number, value: string | null): SheetCellEditInput {
	return {
		cell: {
			columnIndex,
			rawInput: value,
			rowIndex,
			value,
		},
	};
}

/*
 * Return a sparse cell input that clears one coordinate.
 */
export function getSheetClearEditInput(rowIndex: number, columnIndex: number): SheetCellEditInput {
	return {
		cell: {
			columnIndex,
			rowIndex,
		},
		clear: true,
	};
}

/*
 * Return a reversible edit input that restores the current saved state for one Sheet coordinate.
 */
export function getSheetCellSnapshotEditInput(rowIndex: number, columnIndex: number, cell?: SheetCellGQL | null): SheetCellEditInput {
	if (!cell) {
		return getSheetClearEditInput(rowIndex, columnIndex);
	}

	if (cell.sourceType === 'REGION_GENERATED') {
		if (!generatedRegionCellHasSheetDesign(cell)) {
			return getSheetClearEditInput(rowIndex, columnIndex);
		}

		return {
			cell: {
				columnIndex,
				format: cell.format ?? null,
				note: cell.note ?? null,
				regionId: cell.regionId ?? cell.region?.regionId ?? null,
				rowIndex,
				style: getSheetHistoryStyle(cell.style),
			},
		};
	}

	return {
		cell: {
			columnIndex,
			format: cell.format ?? null,
			note: cell.note ?? null,
			rawInput: cell.rawInput ?? null,
			regionId: cell.regionId ?? null,
			rowIndex,
			style: getSheetHistoryStyle(cell.style),
			value: cell.value ?? null,
		},
	};
}

/*
 * Return whether a Sheet cell already has the same editable draft value.
 */
export function sheetCellDraftValueIsEqual(cell: SheetCellGQL | null | undefined, value: string | null) {
	return getSheetCanvasCellDraftValue(cell) === (value ?? '');
}

/*
 * Return the stable coordinate key represented by one Sheet cell edit input.
 */
export function getSheetCellEditInputCoordKey(input: SheetCellEditInput) {
	return getSheetCanvasCoordKey(input.cell.rowIndex, input.cell.columnIndex);
}

/*
 * Return whether two Sheet cell edit inputs would save the same sparse cell payload.
 */
export function sheetCellEditInputsAreEqual(a: SheetCellEditInput, b: SheetCellEditInput) {
	return Boolean(a.clear) === Boolean(b.clear) &&
		a.cell.columnIndex === b.cell.columnIndex &&
		a.cell.rowIndex === b.cell.rowIndex &&
		(a.cell.format ?? null) === (b.cell.format ?? null) &&
		(a.cell.note ?? null) === (b.cell.note ?? null) &&
		(a.cell.rawInput ?? null) === (b.cell.rawInput ?? null) &&
		(a.cell.regionId ?? null) === (b.cell.regionId ?? null) &&
		getSheetHistoryStyleComparisonValue(a.cell.style) === getSheetHistoryStyleComparisonValue(b.cell.style) &&
		(a.cell.value ?? null) === (b.cell.value ?? null);
}

/*
 * Return whether one edit input only writes the cell's editable value.
 */
function sheetCellEditInputOnlySetsValue(input: SheetCellEditInput) {
	const cell = input.cell;

	return !input.clear &&
		Object.prototype.hasOwnProperty.call(cell, 'rawInput') &&
		Object.prototype.hasOwnProperty.call(cell, 'value') &&
		!Object.prototype.hasOwnProperty.call(cell, 'format') &&
		!Object.prototype.hasOwnProperty.call(cell, 'note') &&
		!Object.prototype.hasOwnProperty.call(cell, 'regionId') &&
		!Object.prototype.hasOwnProperty.call(cell, 'style');
}

/*
 * Return whether one edit input is already reflected by the current Sheet cell.
 */
export function sheetCellEditInputMatchesCell(input: SheetCellEditInput, currentCell?: SheetCellGQL | null) {
	if (
		sheetCellEditInputOnlySetsValue(input) &&
		sheetCellDraftValueIsEqual(currentCell, input.cell.rawInput ?? input.cell.value ?? null)
	) {
		return true;
	}

	const currentInput = getSheetCellSnapshotEditInput(
		input.cell.rowIndex,
		input.cell.columnIndex,
		currentCell,
	);

	if (sheetCellEditInputsAreEqual(currentInput, input)) {
		return true;
	}

	return sheetCellEditInputSetsEmptyValue(input, currentCell) &&
		!sheetCellHasEditableValueContent(currentCell);
}

/*
 * Return the edit input carried by an optimistic Sheet cell.
 */
function getSheetOptimisticCellEditInput(rowIndex: number, columnIndex: number, cell: SheetCellGQL) {
	return (cell as OptimisticSheetCellGQL).__optimisticInput ||
		getSheetCellSnapshotEditInput(rowIndex, columnIndex, cell);
}

/*
 * Return optimistic cell keys whose local value is now confirmed by base Sheet cells.
 */
export function getSheetOptimisticCellKeysSyncedWithBase(
	optimisticCellsByCoord: Map<string, SheetCellGQL>,
	baseCellsByCoord: Map<string, SheetCellGQL>,
) {
	const confirmedKeys: string[] = [];

	optimisticCellsByCoord.forEach((optimisticCell, coordKey) => {
		const rowIndex = Number(optimisticCell.rowIndex || 0);
		const columnIndex = Number(optimisticCell.columnIndex || 0);

		if (!rowIndex || !columnIndex) {
			return;
		}

		if (sheetCellEditInputMatchesCell(
			getSheetOptimisticCellEditInput(rowIndex, columnIndex, optimisticCell),
			baseCellsByCoord.get(coordKey),
		)) {
			confirmedKeys.push(coordKey);
		}
	});

	return confirmedKeys;
}

/*
 * Return only Sheet cell edits that should be sent to the mutation.
 */
export function getSheetCellEditInputsForMutation(
	inputs: SheetCellEditInput[],
	currentCellsByCoord: Map<string, SheetCellGQL>,
) {
	return inputs.filter((input) => {
		if (sheetCellEditInputMatchesCell(
			input,
			currentCellsByCoord.get(getSheetCellEditInputCoordKey(input)),
		)) {
			return false;
		}

		return true;
	});
}

/*
 * Return one mutation cell payload with stored-value fields omitted when the
 * edit keeps the confirmed cell's value. A presentation-only payload lets the
 * server skip formula dependency work for style changes, and keeps style
 * edits on region override cells from re-sending materializer-owned content
 * (the server rejects value writes inside generated regions).
 */
export function getSheetCellEditInputForMutationPayload(
	input: SheetCellEditInput,
	baseCell?: SheetCellGQL | null,
): SheetCellEditInput {
	const cell = input.cell;
	const hasValueFields = Object.prototype.hasOwnProperty.call(cell, 'rawInput') ||
		Object.prototype.hasOwnProperty.call(cell, 'value');

	if (input.clear || !hasValueFields) {
		return input;
	}

	// Compare against the base snapshot so a pending value edit (one that
	// differs from the confirmed cell) always keeps its value fields
	const baseInput = getSheetCellSnapshotEditInput(cell.rowIndex, cell.columnIndex, baseCell);
	const valueSynced = (cell.rawInput ?? null) === (baseInput.cell.rawInput ?? null) &&
		(cell.value ?? null) === (baseInput.cell.value ?? null);

	if (!valueSynced) {
		return input;
	}

	const presentationCell = { ...cell };
	delete presentationCell.rawInput;
	delete presentationCell.value;

	return {
		...input,
		cell: presentationCell,
	};
}

/*
 * Return one pending preview cell rebased over the latest base Sheet cell.
 * The rebase uses the pending edit's FULL snapshot input (value, style,
 * format, and note together), so a preview that accumulated state from
 * several stacked edits at the same coordinate never loses earlier fields
 * when a newer partial edit replaced the pending entry.
 */
export function getSheetPendingPreviewRebasedOnBase(
	input: SheetCellEditInput,
	previewCell: SheetCellGQL,
	baseCell?: SheetCellGQL | null,
) {
	const rowIndex = Number(input.cell.rowIndex || 0);
	const columnIndex = Number(input.cell.columnIndex || 0);

	if (!rowIndex || !columnIndex) {
		return previewCell;
	}

	const rebasedCell = getOptimisticSheetCellFromEditInput(input, baseCell);
	const currentSnapshot = getSheetCellSnapshotEditInput(rowIndex, columnIndex, previewCell);
	const rebasedSnapshot = getSheetCellSnapshotEditInput(rowIndex, columnIndex, rebasedCell);

	return sheetCellEditInputsAreEqual(currentSnapshot, rebasedSnapshot)
		? previewCell
		: rebasedCell;
}

/*
 * Return optimistic formula metadata for one pending value edit.
 */
function getOptimisticSheetFormulaFromEditInput(input: SheetCellEditInput, currentCell?: SheetCellGQL | null) {
	if (input.cell.rawInput === undefined && input.cell.value === undefined) {
		return currentCell?.formula ?? null;
	}

	const rawInput = input.cell.rawInput ?? input.cell.value;
	if (!isSheetFormulaText(rawInput)) {
		return null;
	}

	return {
		engine: currentCell?.formula?.engine || 'client',
		error: null,
		references: [],
		text: rawInput,
		version: currentCell?.formula?.version || 0,
	};
}

/*
 * Return an optimistic Sheet cell payload for one pending edit input.
 */
export function getOptimisticSheetCellFromEditInput(input: SheetCellEditInput, currentCell?: SheetCellGQL | null): SheetCellGQL {
	if (input.clear) {
		if (currentCell?.sourceType === 'REGION_GENERATED') {
			return {
				...currentCell,
				__optimisticInput: input,
				format: null,
				note: null,
				style: null,
			} as SheetCellGQL;
		}

		return {
			columnIndex: input.cell.columnIndex,
			__optimisticInput: input,
			rawInput: '',
			rowIndex: input.cell.rowIndex,
			value: '',
		} as SheetCellGQL;
	}

	const inputStyle = input.cell.style === undefined ? undefined : getSheetHistoryStyle(input.cell.style);
	const hasValueEdit = input.cell.rawInput !== undefined || input.cell.value !== undefined;
	const nextRawInput = input.cell.rawInput ?? input.cell.value;

	return {
		...(currentCell || {}),
		columnIndex: input.cell.columnIndex,
		__optimisticInput: input,
		format: input.cell.format ?? currentCell?.format ?? null,
		note: input.cell.note ?? currentCell?.note ?? null,
		formula: getOptimisticSheetFormulaFromEditInput(input, currentCell),
		rawInput: input.cell.rawInput ?? currentCell?.rawInput ?? null,
		regionId: input.cell.regionId ?? currentCell?.regionId ?? null,
		rowIndex: input.cell.rowIndex,
		style: inputStyle === undefined ? currentCell?.style ?? null : inputStyle,
		value: input.cell.value ?? currentCell?.value ?? null,
		// A new value invalidates everything computed from the previous one:
		// stale formulaText or computed fields would keep rendering the old
		// formula result instead of the freshly typed input
		...(hasValueEdit
			? {
				__formulaLoading: undefined,
				formulaText: isSheetFormulaText(nextRawInput) ? String(nextRawInput) : null,
				textValue: null,
				numberValue: null,
				booleanValue: null,
				dateValue: null,
				datetimeValue: null,
				errorCode: null,
				errorMessage: null,
			}
			: {}),
	} as SheetCellGQL;
}

/*
 * Return whether one Sheet history entry contains at least one undoable change.
 */
export function sheetUndoRedoEntryHasChanges(entry: SheetUndoRedoEntry) {
	return Boolean(entry.sheetCells?.length || entry.dataTableCells?.length || entry.design);
}

/*
 * Own local Sheet undo/redo stack refs without adding rerender-causing state.
 */
export function useSheetUndoRedo() {
	const historyRef = useRef(createGridUndoRedoStack<SheetUndoRedoEntry>());
	const applyingHistoryRef = useRef(false);

	const isApplyingHistory = useCallback(() => {
		return applyingHistoryRef.current;
	}, []);

	const pushUndoEntry = useCallback((entry: SheetUndoRedoEntry) => {
		if (applyingHistoryRef.current || !sheetUndoRedoEntryHasChanges(entry)) {
			return;
		}

		pushGridUndoEntry(historyRef.current, entry);
	}, []);

	const takeUndoEntry = useCallback(() => {
		return takeGridUndoEntry(historyRef.current);
	}, []);

	const takeRedoEntry = useCallback(() => {
		return takeGridRedoEntry(historyRef.current);
	}, []);

	const runApplyingHistory = useCallback(async (apply: () => Promise<void> | void) => {
		applyingHistoryRef.current = true;

		try {
			await apply();
		} finally {
			applyingHistoryRef.current = false;
		}
	}, []);

	return {
		isApplyingHistory,
		pushUndoEntry,
		runApplyingHistory,
		takeRedoEntry,
		takeUndoEntry,
	};
}

export type { GridUndoRedoDirection };
