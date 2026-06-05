import type { DataTableCellGQL, DataTableDesignGQL, DataTableRowGQL } from '@jsb188/mday/types/dataTable.d.ts';
import type { SetFloatingMessage } from '@jsb188/react-web/modules/Layout';
import { clampSheetColumnWidth, getSheetCellKey, type SheetColumnWidths } from '@jsb188/react-web/ui/SheetUI';
import { atom } from 'jotai';
import { useEffect, useRef } from 'react';
import {
	dataTableInteractionReducer,
	getInitialDataTableInteractionState,
	type DataTableInteractionAction,
	type DataTableInteractionState,
} from '../modules/dataTable-interaction-state.ts';
import { createGridStateAtoms, createReducerDispatchAtom } from './grid-state.tsx';

export type DataTableRowsState = {
	hasMoreRows: boolean;
	rowIds: string[];
	rowsById: Record<string, DataTableRowGQL>;
	rowSignaturesById: Record<string, string>;
	sourceKey: string;
};

export type DataTableDesignPatchInput = {
	cells?: Array<{
		format?: string | null;
		humanLabel?: string | null;
		key: string;
		width?: number | null;
	}>;
	cellsOrder?: string[];
};

type DataTableDesignCellPatchInput = NonNullable<DataTableDesignPatchInput['cells']>[number];

export type DataTableDesignReducerState = {
	localPatch: DataTableDesignPatchInput | null;
	serverDesign: DataTableDesignGQL;
	dataTableId: string;
};

export type DataTableDesignReducerAction =
	| {
		design: DataTableDesignGQL;
		dataTableId: string;
		type: 'server_design_received';
	}
	| {
		patch: DataTableDesignPatchInput;
		type: 'local_patch_queued';
	};

export type DataTableOptimisticCellValues = Record<string, string | null>;

export type DataTableCellValueReducerAction =
	| {
		type: 'reset';
	}
	| {
		confirmedKeys: string[];
		type: 'server_values_received';
	}
	| {
		cellKey: string;
		rowId: string;
		type: 'local_value_reverted';
	}
	| {
		cellKey: string;
		rowId: string;
		type: 'local_value_queued';
		value: string | null;
	};

export type DataTableColumnReorderVisualState = {
	columnKey: string;
	dragLeft: number;
	toVisibleIndex: number;
};

/*
 * Create the full DataTable atom group for one mounted DataTable instance.
 */
export function createDataTableStateAtoms() {
	const gridAtoms = createGridStateAtoms();
	const interactionStateAtom = atom<DataTableInteractionState>(getInitialDataTableInteractionState());

	return {
		...gridAtoms,
		columnReorderVisualStateAtom: atom<DataTableColumnReorderVisualState | null>(null),
		columnWidthDraftsAtom: atom<SheetColumnWidths>({}),
		designStateAtom: atom<DataTableDesignReducerState | null>(null),
		dispatchInteractionAtom: createReducerDispatchAtom<DataTableInteractionState, DataTableInteractionAction>(
			interactionStateAtom,
			dataTableInteractionReducer,
		),
		interactionStateAtom,
		optimisticValuesAtom: atom<DataTableOptimisticCellValues>({}),
		resizingColumnKeyAtom: atom<string | null>(null),
		rowsStateAtom: atom<DataTableRowsState | null>(null),
	};
}

export type DataTableStateAtoms = ReturnType<typeof createDataTableStateAtoms>;

/*
 * Build an empty row collection state for one dataTable.
 */

export function getInitialDataTableRowsState(sourceKey: string): DataTableRowsState {
	return {
		hasMoreRows: true,
		rowIds: [],
		rowsById: {},
		rowSignaturesById: {},
		sourceKey,
	};
}

/*
 * Return the identity for the current dataTable row source.
 */

export function getDataTableRowsSourceKey(dataTableId: string) {
	return dataTableId;
}

/*
 * Show a refresh floating message when dataTable row queries receive reset-only updates.
 */

export function useFloatingMessageForDataTableRowsReset(
	resetOnlyTime: string | undefined,
	setFloatingMessage?: SetFloatingMessage,
) {
	const lastUpdateTime = useRef<string | undefined>(resetOnlyTime);

	useEffect(() => {
		if (!resetOnlyTime) {
			return;
		}

		if (resetOnlyTime !== lastUpdateTime.current && setFloatingMessage) {
			setFloatingMessage({
				type: 'REFRESH',
			});
		}

		lastUpdateTime.current = resetOnlyTime;
	}, [resetOnlyTime, setFloatingMessage]);
}

/*
 * Return a stable comparison key for one dataTable cell payload.
 */

function getDataTableCellStateKey(cell: DataTableCellGQL) {
	return [
		cell.id,
		cell.cellKey,
		cell.iconName ?? '',
		cell.value ?? '',
		cell.textValue ?? '',
		cell.numberValue ?? '',
		cell.booleanValue === undefined || cell.booleanValue === null ? '' : String(cell.booleanValue),
		cell.dateValue ?? '',
		cell.datetimeValue ?? '',
		cell.updatedAt ?? '',
	].join('\u0000');
}

/*
 * Return a stable comparison key for one dataTable row payload.
 */

function getDataTableRowStateKey(row: DataTableRowGQL) {
	return [
		row.id,
		row.position,
		row.cursor ?? '',
		row.updatedAt ?? '',
		...(row.cells || []).map(getDataTableCellStateKey).sort(),
	].join('\u0000');
}

/*
 * Return whether two ordered row id collections have the same contents.
 */

function areDataTableRowIdsEqual(a: string[], b: string[]) {
	return a.length === b.length && a.every((rowId, index) => rowId === b[index]);
}

/*
 * Merge fetched row ids while preserving the server's visual query order.
 */

function mergeDataTableRowIds(
	currentRowIds: string[],
	rows: DataTableRowGQL[],
	appendRows: boolean,
) {
	const nextRowIds = Array.from(new Set(rows.map((row) => row.id)));

	if (appendRows) {
		const existingIds = new Set(currentRowIds);

		return currentRowIds.concat(nextRowIds.filter((rowId) => !existingIds.has(rowId)));
	}

	return nextRowIds;
}

/*
 * Merge one fetched page of rows into the loaded row collection.
 */

export function mergeDataTableRowsState(
	currentState: DataTableRowsState,
	sourceKey: string,
	rows: DataTableRowGQL[],
	limit: number,
	appendRows = false,
): DataTableRowsState {
	const baseState = currentState.sourceKey === sourceKey ? currentState : getInitialDataTableRowsState(sourceKey);
	let rowsById = baseState.rowsById;
	let rowSignaturesById = baseState.rowSignaturesById;
	let changedRows = baseState !== currentState;

	rows.forEach((row) => {
		const rowSignature = getDataTableRowStateKey(row);

		if (rowSignaturesById[row.id] === rowSignature) {
			return;
		}

		if (rowsById === baseState.rowsById) {
			rowsById = { ...baseState.rowsById };
			rowSignaturesById = { ...baseState.rowSignaturesById };
		}

		rowsById[row.id] = row;
		rowSignaturesById[row.id] = rowSignature;
		changedRows = true;
	});

	const hasMoreRows = rows.length < limit ? false : baseState.hasMoreRows;
	const rowIds = mergeDataTableRowIds(baseState.rowIds, rows, appendRows);
	const changedRowIds = !areDataTableRowIdsEqual(baseState.rowIds, rowIds);

	if (
		currentState.sourceKey === sourceKey &&
		currentState.hasMoreRows === hasMoreRows &&
		!changedRows &&
		!changedRowIds
	) {
		return currentState;
	}

	return {
		hasMoreRows,
		rowIds,
		rowsById,
		rowSignaturesById,
		sourceKey,
	};
}

/*
 * Return whether two optional ordered dataTable design key lists are identical.
 */

function areDataTableDesignCellsOrdersEqual(a?: string[] | null, b?: string[] | null) {
	const aOrder = a || [];
	const bOrder = b || [];

	return aOrder.length === bOrder.length && aOrder.every((key, index) => key === bOrder[index]);
}

/*
 * Merge two sparse dataTable design patches while keeping the newest cell patch per key.
 */

export function mergeDataTableDesignPatch(
	currentPatch: DataTableDesignPatchInput | null,
	nextPatch: DataTableDesignPatchInput,
): DataTableDesignPatchInput {
	const mergedPatch: DataTableDesignPatchInput = {
		...(currentPatch || {}),
	};

	if (nextPatch.cells) {
		const cellsByKey = new Map((mergedPatch.cells || []).map((cell) => [cell.key, cell]));

		nextPatch.cells.forEach((cell) => {
			cellsByKey.set(cell.key, {
				...cellsByKey.get(cell.key),
				...cell,
			});
		});

		mergedPatch.cells = Array.from(cellsByKey.values());
	}

	if (nextPatch.cellsOrder) {
		mergedPatch.cellsOrder = nextPatch.cellsOrder.slice(0);
	}

	return mergedPatch;
}

/*
 * Merge local dataTable design edits over the latest GraphQL design baseline.
 */

export function mergeDataTableDesignWithPatch(
	serverDesign: DataTableDesignGQL,
	localPatch: DataTableDesignPatchInput | null,
): DataTableDesignGQL {
	if (!localPatch) {
		return serverDesign;
	}

	let cells = serverDesign.cells;
	if (localPatch.cells?.length) {
		const patchCellsByKey = new Map(localPatch.cells.map((cell) => [cell.key, cell]));
		const patchedKeys = new Set<string>();

		cells = serverDesign.cells.map((cell) => {
			const patchCell = patchCellsByKey.get(cell.key);

			if (!patchCell || patchedKeys.has(cell.key)) {
				return cell;
			}

			patchedKeys.add(cell.key);

			return {
				...cell,
				...patchCell,
			};
		});
	}

	return {
		...serverDesign,
		cells,
		cellsOrder: localPatch.cellsOrder || serverDesign.cellsOrder,
	};
}

/*
 * Drop local dataTable design edits once the refreshed server design contains them.
 */

function removeConfirmedDataTableDesignPatchValues(
	localPatch: DataTableDesignPatchInput | null,
	serverDesign: DataTableDesignGQL,
) {
	if (!localPatch) {
		return null;
	}

	let nextPatch: DataTableDesignPatchInput | null = null;
	const serverCellsByKey = new Map<string, DataTableDesignGQL['cells'][number]>();

	serverDesign.cells.forEach((cell) => {
		if (!serverCellsByKey.has(cell.key)) {
			serverCellsByKey.set(cell.key, cell);
		}
	});

	localPatch.cells?.forEach((patchCell) => {
		const serverCell = serverCellsByKey.get(patchCell.key);
		const nextCell: DataTableDesignCellPatchInput = {
			key: patchCell.key,
		};

		if (patchCell.width !== undefined) {
			const serverWidth = serverCell?.width === undefined || serverCell.width === null
				? null
				: clampSheetColumnWidth(Number(serverCell.width));
			const patchWidth = patchCell.width === null ? null : clampSheetColumnWidth(Number(patchCell.width));

			if (serverWidth !== patchWidth) {
				nextCell.width = patchCell.width;
			}
		}

		if (patchCell.humanLabel !== undefined && (serverCell?.humanLabel || null) !== patchCell.humanLabel) {
			nextCell.humanLabel = patchCell.humanLabel;
		}

		if (patchCell.format !== undefined && (serverCell?.format || null) !== patchCell.format) {
			nextCell.format = patchCell.format;
		}

		if (nextCell.width !== undefined || nextCell.humanLabel !== undefined || nextCell.format !== undefined) {
			nextPatch = mergeDataTableDesignPatch(nextPatch, {
				cells: [nextCell],
			});
		}
	});

	if (localPatch.cellsOrder && !areDataTableDesignCellsOrdersEqual(localPatch.cellsOrder, serverDesign.cellsOrder)) {
		nextPatch = mergeDataTableDesignPatch(nextPatch, {
			cellsOrder: localPatch.cellsOrder,
		});
	}

	return nextPatch;
}

/*
 * Keep the dataTable design reducer initialized for one dataTable id.
 */

export function getInitialDataTableDesignReducerState(dataTableId: string, serverDesign: DataTableDesignGQL): DataTableDesignReducerState {
	return {
		localPatch: null,
		serverDesign,
		dataTableId,
	};
}

/*
 * Own the local dataTable design overlay that should survive GraphQL refreshes.
 */

export function dataTableDesignReducer(
	state: DataTableDesignReducerState,
	action: DataTableDesignReducerAction,
): DataTableDesignReducerState {
	if (action.type === 'server_design_received') {
		if (state.dataTableId !== action.dataTableId) {
			return getInitialDataTableDesignReducerState(action.dataTableId, action.design);
		}

		return {
			...state,
			localPatch: removeConfirmedDataTableDesignPatchValues(state.localPatch, action.design),
			serverDesign: action.design,
		};
	}

	return {
		...state,
		localPatch: mergeDataTableDesignPatch(state.localPatch, action.patch),
	};
}

/*
 * Keep local dataTable cell edits visible until refreshed server data confirms them.
 */

export function dataTableCellValueReducer(
	state: DataTableOptimisticCellValues,
	action: DataTableCellValueReducerAction,
): DataTableOptimisticCellValues {
	if (action.type === 'reset') {
		return {};
	}

	if (action.type === 'server_values_received') {
		if (!action.confirmedKeys.length) {
			return state;
		}

		let nextState = state;

		action.confirmedKeys.forEach((key) => {
			if (!Object.prototype.hasOwnProperty.call(nextState, key)) {
				return;
			}

			if (nextState === state) {
				nextState = {
					...state,
				};
			}

			delete nextState[key];
		});

		return nextState;
	}

	if (action.type === 'local_value_reverted') {
		const optimisticKey = getSheetCellKey(action.rowId, action.cellKey);
		if (!Object.prototype.hasOwnProperty.call(state, optimisticKey)) {
			return state;
		}

		const nextState = {
			...state,
		};
		delete nextState[optimisticKey];

		return nextState;
	}

	const optimisticKey = getSheetCellKey(action.rowId, action.cellKey);
	if (state[optimisticKey] === action.value) {
		return state;
	}

	return {
		...state,
		[optimisticKey]: action.value,
	};
}
