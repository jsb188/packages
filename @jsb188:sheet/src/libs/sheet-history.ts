import type { DataTableGQL } from '@jsb188/mday/types/dataTable.d.ts';
import { normalizeSheetCellStyle } from '@jsb188/mday/utils/sheet.ts';
import type { SheetCellGQL, SheetCellStyleObj, SheetRegionGQL } from '@jsb188/mday/types/sheet.d.ts';
import { useCallback, useRef } from 'react';
import type { DataTableCellLookup } from './dataTable-cell-editing.tsx';
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
 * Return an optimistic Sheet cell payload for one pending edit input.
 */
export function getOptimisticSheetCellFromEditInput(input: SheetCellEditInput, currentCell?: SheetCellGQL | null): SheetCellGQL {
	if (input.clear) {
		return {
			columnIndex: input.cell.columnIndex,
			rawInput: '',
			rowIndex: input.cell.rowIndex,
			value: '',
		} as SheetCellGQL;
	}

	const inputStyle = input.cell.style === undefined ? undefined : getSheetHistoryStyle(input.cell.style);

	return {
		...(currentCell || {}),
		columnIndex: input.cell.columnIndex,
		format: input.cell.format ?? currentCell?.format ?? null,
		note: input.cell.note ?? currentCell?.note ?? null,
		rawInput: input.cell.rawInput ?? currentCell?.rawInput ?? null,
		regionId: input.cell.regionId ?? currentCell?.regionId ?? null,
		rowIndex: input.cell.rowIndex,
		style: inputStyle === undefined ? currentCell?.style ?? null : inputStyle,
		value: input.cell.value ?? currentCell?.value ?? null,
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
