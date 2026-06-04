import type { DataTableDesignGQL } from '@jsb188/mday/types/dataTable.d.ts';
import { useCallback, useRef } from 'react';
import type { DataTableDesignPatchInput } from '../states/dataTable-state.ts';
import type { DataTableCellLookup } from './dataTable-cell-editing.tsx';
import {
	createGridUndoRedoStack,
	pushGridUndoEntry,
	takeGridRedoEntry,
	takeGridUndoEntry,
	type GridUndoRedoDirection,
} from './grid-undo-redo.ts';

export type DataTableCellHistoryChange = {
	after: string | null;
	before: string | null;
	lookup: DataTableCellLookup;
};

export type DataTableDesignHistoryChange = {
	after: DataTableDesignPatchInput;
	before: DataTableDesignPatchInput;
};

export type DataTableUndoRedoEntry = {
	cells?: DataTableCellHistoryChange[];
	design?: DataTableDesignHistoryChange;
};

/*
 * Return the inverse patch for one design-cell patch using the current design.
 */
export function getDataTableDesignCellHistoryBeforePatch(design: DataTableDesignGQL, patchCell: NonNullable<DataTableDesignPatchInput['cells']>[number]) {
	const currentCell = design.cells?.find((cell) => cell.key === patchCell.key);
	const beforeCell: NonNullable<DataTableDesignPatchInput['cells']>[number] = {
		key: patchCell.key,
	};

	if ('format' in patchCell) {
		beforeCell.format = currentCell?.format ?? null;
	}

	if ('humanLabel' in patchCell) {
		beforeCell.humanLabel = currentCell?.humanLabel ?? null;
	}

	if ('width' in patchCell) {
		beforeCell.width = currentCell?.width ?? null;
	}

	return beforeCell;
}

/*
 * Return the inverse patch for one design-view patch using the current design.
 */
export function getDataTableDesignViewHistoryBeforePatch(design: DataTableDesignGQL, patchView: NonNullable<DataTableDesignPatchInput['views']>[number]) {
	const currentView = design.views?.find((view) => view.id === patchView.id);
	const beforeView: NonNullable<DataTableDesignPatchInput['views']>[number] = {
		id: patchView.id,
	};

	if ('columnsOrder' in patchView) {
		beforeView.columnsOrder = currentView?.columnsOrder || null;
	}

	return beforeView;
}

/*
 * Return the patch that restores the current design before one local design patch.
 */
export function getDataTableDesignHistoryBeforePatch(design: DataTableDesignGQL, patch: DataTableDesignPatchInput): DataTableDesignPatchInput {
	return {
		cells: patch.cells?.map((cell) => getDataTableDesignCellHistoryBeforePatch(design, cell)),
		cellsOrder: patch.cellsOrder ? design.cellsOrder || [] : undefined,
		views: patch.views?.map((view) => getDataTableDesignViewHistoryBeforePatch(design, view)),
	};
}

/*
 * Return whether one design patch contains at least one supported undoable edit.
 */
export function dataTableDesignPatchHasUndoableChanges(patch: DataTableDesignPatchInput) {
	return Boolean(patch.cells?.length || patch.cellsOrder || patch.views?.length);
}

/*
 * Return whether one DataTable history entry contains at least one undoable change.
 */
export function dataTableUndoRedoEntryHasChanges(entry: DataTableUndoRedoEntry) {
	return Boolean(entry.cells?.length || entry.design);
}

/*
 * Own local DataTable undo/redo stack refs, including paste and clear batching.
 */
export function useDataTableUndoRedo() {
	const historyRef = useRef(createGridUndoRedoStack<DataTableUndoRedoEntry>());
	const applyingHistoryRef = useRef(false);
	const historyCellBatchRef = useRef<DataTableCellHistoryChange[] | null>(null);

	const isApplyingHistory = useCallback(() => {
		return applyingHistoryRef.current;
	}, []);

	const pushUndoEntry = useCallback((entry: DataTableUndoRedoEntry) => {
		if (applyingHistoryRef.current || !dataTableUndoRedoEntryHasChanges(entry)) {
			return;
		}

		pushGridUndoEntry(historyRef.current, entry);
	}, []);

	const recordCellHistoryChange = useCallback((change: DataTableCellHistoryChange) => {
		if (applyingHistoryRef.current || change.before === change.after) {
			return;
		}

		if (historyCellBatchRef.current) {
			historyCellBatchRef.current.push(change);
			return;
		}

		pushUndoEntry({
			cells: [change],
		});
	}, [pushUndoEntry]);

	const startCellHistoryBatch = useCallback(() => {
		historyCellBatchRef.current = [];
	}, []);

	const finishCellHistoryBatch = useCallback(() => {
		const changes = historyCellBatchRef.current || [];
		historyCellBatchRef.current = null;

		if (changes.length) {
			pushUndoEntry({
				cells: changes,
			});
		}
	}, [pushUndoEntry]);

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
		finishCellHistoryBatch,
		isApplyingHistory,
		pushUndoEntry,
		recordCellHistoryChange,
		runApplyingHistory,
		startCellHistoryBatch,
		takeRedoEntry,
		takeUndoEntry,
	};
}

export type { GridUndoRedoDirection };
