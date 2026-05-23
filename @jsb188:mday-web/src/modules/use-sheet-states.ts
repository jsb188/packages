import i18n from '@jsb188/app/i18n/index.ts';
import type { SheetCellGQL, SheetDesignGQL, SheetRowGQL } from '@jsb188/mday/types/sheet.d.ts';
import type { FloatingMessageObj } from '@jsb188/react-web/modules/Layout';
import { clampSheetColumnWidth, getSheetCellKey } from '@jsb188/react-web/ui/SheetUI';
import { useCallback, useEffect, useRef, useState } from 'react';

type ElementSize = {
	height: number;
	width: number;
};

export type SheetRowsState = {
	hasMoreRows: boolean;
	rowIds: string[];
	rowsById: Record<string, SheetRowGQL>;
	rowSignaturesById: Record<string, string>;
	sourceKey: string;
};

export type SheetDesignPatchInput = {
	cells?: Array<{
		humanLabel?: string | null;
		key: string;
		width?: number | null;
	}>;
	cellsOrder?: string[];
	views?: Array<{
		id: string;
		columnsOrder?: string[] | null;
	}>;
};

type SheetDesignCellPatchInput = NonNullable<SheetDesignPatchInput['cells']>[number];

type SheetDesignReducerState = {
	localPatch: SheetDesignPatchInput | null;
	serverDesign: SheetDesignGQL;
	sheetId: string;
};

type SheetDesignReducerAction =
	| {
		design: SheetDesignGQL;
		sheetId: string;
		type: 'server_design_received';
	}
	| {
		patch: SheetDesignPatchInput;
		type: 'local_patch_queued';
	};

type SheetOptimisticCellValues = Record<string, string | null>;

type SheetCellValueReducerAction =
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

/*
 * Build an empty row collection state for one sheet.
 */

export function getInitialSheetRowsState(sourceKey: string): SheetRowsState {
	return {
		hasMoreRows: true,
		rowIds: [],
		rowsById: {},
		rowSignaturesById: {},
		sourceKey,
	};
}

/*
 * Return the identity for the current sheet row source.
 */

export function getSheetRowsSourceKey(sheetId: string, viewId?: string | null) {
	return `${sheetId}:${viewId || 'master'}`;
}

/*
 * Show a refresh floating message when sheet row queries receive reset-only updates.
 */

export function useFloatingMessageForSheetRowsReset(
	resetOnlyTime: string | undefined,
	setFloatingMessage?: (message: FloatingMessageObj | null) => void,
) {
	const lastUpdateTime = useRef<string | undefined>(resetOnlyTime);

	useEffect(() => {
		if (!resetOnlyTime) {
			return;
		}

		if (resetOnlyTime !== lastUpdateTime.current && setFloatingMessage) {
			setFloatingMessage({
				text: i18n.t('app.new_data_click_to_refresh'),
				type: 'REFRESH',
			});
		}

		lastUpdateTime.current = resetOnlyTime;
	}, [resetOnlyTime, setFloatingMessage]);
}

/*
 * Return a stable comparison key for one sheet cell payload.
 */

function getSheetCellStateKey(cell: SheetCellGQL) {
	return [
		cell.id,
		cell.cellKey,
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
 * Return a stable comparison key for one sheet row payload.
 */

function getSheetRowStateKey(row: SheetRowGQL) {
	return [
		row.id,
		row.position,
		row.cursor ?? '',
		row.updatedAt ?? '',
		...(row.cells || []).map(getSheetCellStateKey).sort(),
	].join('\u0000');
}

/*
 * Return whether two ordered row id collections have the same contents.
 */

function areSheetRowIdsEqual(a: string[], b: string[]) {
	return a.length === b.length && a.every((rowId, index) => rowId === b[index]);
}

/*
 * Merge fetched row ids while preserving the server's visual query order.
 */

function mergeSheetRowIds(
	currentRowIds: string[],
	rows: SheetRowGQL[],
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

export function mergeSheetRowsState(
	currentState: SheetRowsState,
	sourceKey: string,
	rows: SheetRowGQL[],
	limit: number,
	appendRows = false,
): SheetRowsState {
	const baseState = currentState.sourceKey === sourceKey ? currentState : getInitialSheetRowsState(sourceKey);
	let rowsById = baseState.rowsById;
	let rowSignaturesById = baseState.rowSignaturesById;
	let changedRows = baseState !== currentState;

	rows.forEach((row) => {
		const rowSignature = getSheetRowStateKey(row);

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
	const rowIds = mergeSheetRowIds(baseState.rowIds, rows, appendRows);
	const changedRowIds = !areSheetRowIdsEqual(baseState.rowIds, rowIds);

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
 * Return whether two optional ordered sheet design key lists are identical.
 */

function areSheetDesignCellsOrdersEqual(a?: string[] | null, b?: string[] | null) {
	const aOrder = a || [];
	const bOrder = b || [];

	return aOrder.length === bOrder.length && aOrder.every((key, index) => key === bOrder[index]);
}

/*
 * Return whether two optional ordered sheet view key lists are identical.
 */

function areSheetDesignViewOrdersEqual(a?: string[] | null, b?: string[] | null) {
	return areSheetDesignCellsOrdersEqual(a, b);
}

/*
 * Merge two sparse sheet design patches while keeping the newest cell patch per key.
 */

export function mergeSheetDesignPatch(
	currentPatch: SheetDesignPatchInput | null,
	nextPatch: SheetDesignPatchInput,
): SheetDesignPatchInput {
	const mergedPatch: SheetDesignPatchInput = {
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

	if (nextPatch.views) {
		const viewsById = new Map((mergedPatch.views || []).map((view) => [view.id, view]));

		nextPatch.views.forEach((view) => {
			viewsById.set(view.id, {
				...viewsById.get(view.id),
				...view,
				columnsOrder: view.columnsOrder ? view.columnsOrder.slice(0) : view.columnsOrder,
			});
		});

		mergedPatch.views = Array.from(viewsById.values());
	}

	return mergedPatch;
}

/*
 * Merge local sheet design edits over the latest GraphQL design baseline.
 */

export function mergeSheetDesignWithPatch(
	serverDesign: SheetDesignGQL,
	localPatch: SheetDesignPatchInput | null,
): SheetDesignGQL {
	if (!localPatch) {
		return serverDesign;
	}

	let cells = serverDesign.cells;
	let views = serverDesign.views;

	if (localPatch.cells?.length) {
		const patchCellsByKey = new Map(localPatch.cells.map((cell) => [cell.key, cell]));

		cells = serverDesign.cells.map((cell) => {
			const patchCell = patchCellsByKey.get(cell.key);

			if (!patchCell) {
				return cell;
			}

			return {
				...cell,
				...patchCell,
			};
		});
	}

	if (localPatch.views?.length && views?.length) {
		const patchViewsById = new Map(localPatch.views.map((view) => [view.id, view]));

		views = views.map((view) => {
			const patchView = patchViewsById.get(view.id);

			if (!patchView) {
				return view;
			}

			return {
				...view,
				columnsOrder: patchView.columnsOrder || view.columnsOrder,
			};
		});
	}

	return {
		...serverDesign,
		cells,
		cellsOrder: localPatch.cellsOrder || serverDesign.cellsOrder,
		views,
	};
}

/*
 * Drop local sheet design edits once the refreshed server design contains them.
 */

function removeConfirmedSheetDesignPatchValues(
	localPatch: SheetDesignPatchInput | null,
	serverDesign: SheetDesignGQL,
) {
	if (!localPatch) {
		return null;
	}

	let nextPatch: SheetDesignPatchInput | null = null;
	const serverCellsByKey = new Map(serverDesign.cells.map((cell) => [cell.key, cell]));

	localPatch.cells?.forEach((patchCell) => {
		const serverCell = serverCellsByKey.get(patchCell.key);
		const nextCell: SheetDesignCellPatchInput = {
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

		if (nextCell.width !== undefined || nextCell.humanLabel !== undefined) {
			nextPatch = mergeSheetDesignPatch(nextPatch, {
				cells: [nextCell],
			});
		}
	});

	if (localPatch.cellsOrder && !areSheetDesignCellsOrdersEqual(localPatch.cellsOrder, serverDesign.cellsOrder)) {
		nextPatch = mergeSheetDesignPatch(nextPatch, {
			cellsOrder: localPatch.cellsOrder,
		});
	}

	localPatch.views?.forEach((patchView) => {
		const serverView = serverDesign.views?.find((view) => view.id === patchView.id);

		if (patchView.columnsOrder && !areSheetDesignViewOrdersEqual(patchView.columnsOrder, serverView?.columnsOrder)) {
			nextPatch = mergeSheetDesignPatch(nextPatch, {
				views: [{
					id: patchView.id,
					columnsOrder: patchView.columnsOrder,
				}],
			});
		}
	});

	return nextPatch;
}

/*
 * Keep the sheet design reducer initialized for one sheet id.
 */

export function getInitialSheetDesignReducerState(sheetId: string, serverDesign: SheetDesignGQL): SheetDesignReducerState {
	return {
		localPatch: null,
		serverDesign,
		sheetId,
	};
}

/*
 * Own the local sheet design overlay that should survive GraphQL refreshes.
 */

export function sheetDesignReducer(
	state: SheetDesignReducerState,
	action: SheetDesignReducerAction,
): SheetDesignReducerState {
	if (action.type === 'server_design_received') {
		if (state.sheetId !== action.sheetId) {
			return getInitialSheetDesignReducerState(action.sheetId, action.design);
		}

		return {
			...state,
			localPatch: removeConfirmedSheetDesignPatchValues(state.localPatch, action.design),
			serverDesign: action.design,
		};
	}

	return {
		...state,
		localPatch: mergeSheetDesignPatch(state.localPatch, action.patch),
	};
}

/*
 * Keep local sheet cell edits visible until refreshed server data confirms them.
 */

export function sheetCellValueReducer(
	state: SheetOptimisticCellValues,
	action: SheetCellValueReducerAction,
): SheetOptimisticCellValues {
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

/*
 * Keep the current size of one DOM element in React state.
 */

export function useElementSize<T extends HTMLElement>() {
	const [node, setNode] = useState<T | null>(null);
	const [size, setSize] = useState<ElementSize>({
		height: 0,
		width: 0,
	});
	/*
	 * Store the latest observed element node.
	 */

	const ref = useCallback((nextNode: T | null) => {
		setNode(nextNode);
	}, []);

	useEffect(() => {
		if (!node) {
			return;
		}

		/*
		 * Read the element dimensions and skip React updates when they did not change.
		 */

		const updateSize = () => {
			setSize((currentSize) => {
				const nextSize = {
					height: node.clientHeight || 0,
					width: node.clientWidth || 0,
				};

				if (currentSize.height === nextSize.height && currentSize.width === nextSize.width) {
					return currentSize;
				}

				return nextSize;
			});
		};

		updateSize();

		if (typeof ResizeObserver === 'undefined') {
			return;
		}

		const observer = new ResizeObserver(updateSize);
		observer.observe(node);

		return () => {
			observer.disconnect();
		};
	}, [node]);

	return {
		node,
		ref,
		size,
	};
}
