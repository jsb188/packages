import {
	getSheetCellKey,
	type SheetUICell,
	type SheetUICellRenderSnapshot,
	type SheetUIEditState,
	type SheetUISelectedCellKeyMap,
	type SheetUISelectedCellState,
} from '@jsb188/react-web/ui/SheetUI';

/*
 * Build the external render-store snapshot for one visual sheet cell.
 */

export function getSheetUICellRenderSnapshot(params: {
	cell?: SheetUICell;
	cellKey: string;
	editState?: SheetUIEditState | null;
	rowId: string;
	selectedCellKeyMap?: SheetUISelectedCellKeyMap | null;
	selectedCellState?: SheetUISelectedCellState | null;
}): SheetUICellRenderSnapshot {
	const cellRenderKey = getSheetCellKey(params.rowId, params.cellKey);
	const active = params.selectedCellState?.rowId === params.rowId && params.selectedCellState.cellKey === params.cellKey;
	const selected = Boolean(
		params.selectedCellKeyMap?.[cellRenderKey] ||
		active
	);

	return {
		active,
		cell: params.cell,
		editState: params.editState?.rowId === params.rowId && params.editState.cellKey === params.cellKey ? params.editState : null,
		selected,
	};
}

/*
 * Return the render-store keys touched by a selected or editing cell transition.
 */

export function getSheetInteractionRenderKeys(params: {
	currentEditState?: SheetUIEditState | null;
	currentSelectedCellKeyMap?: SheetUISelectedCellKeyMap | null;
	currentSelectedCellState?: SheetUISelectedCellState | null;
	nextEditState?: SheetUIEditState | null;
	nextSelectedCellKeyMap?: SheetUISelectedCellKeyMap | null;
	nextSelectedCellState?: SheetUISelectedCellState | null;
}) {
	const keys = new Set<string>();

	[
		params.currentEditState,
		params.currentSelectedCellState,
		params.nextEditState,
		params.nextSelectedCellState,
	].forEach((cellState) => {
		if (cellState?.rowId && cellState.cellKey) {
			keys.add(getSheetCellKey(cellState.rowId, cellState.cellKey));
		}
	});

	[
		params.currentSelectedCellKeyMap,
		params.nextSelectedCellKeyMap,
	].forEach((cellKeyMap) => {
		Object.keys(cellKeyMap || {}).forEach((cellKey) => {
			keys.add(cellKey);
		});
	});

	return keys;
}
