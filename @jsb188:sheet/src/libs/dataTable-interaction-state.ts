import type {
	SheetUISelectedCellKeyMap,
	SheetUIEditState,
	SheetUIEditorClickSource,
	SheetUIHeaderEditState,
	SheetUISelectedCellState,
} from '@jsb188/react-web/ui/SheetUI';
import { getSheetCellKey } from '@jsb188/react-web/ui/SheetUI';

export type DataTableInteractionLocalEditorState<Lookup = unknown> = {
	clickSource: SheetUIEditorClickSource;
	displayValue: string;
	lookup: Lookup;
};

export type DataTableInteractionCellSelection = {
	activeCell: SheetUISelectedCellState;
	anchorCell: SheetUISelectedCellState;
	rangeEndCell?: SheetUISelectedCellState;
	selectedCellKeyMap: SheetUISelectedCellKeyMap;
};

export type DataTableInteractionState<Lookup = unknown> =
	| {
			mode: 'idle';
		}
	| {
			dismissedLocalEditorCell?: SheetUISelectedCellState | null;
			mode: 'cellSelected';
			selection: DataTableInteractionCellSelection;
		}
	| {
			editState: SheetUIEditState;
			mode: 'cellEditing';
		}
	| {
			cellKey: string;
			mode: 'headerSelected';
		}
	| {
			headerEditState: SheetUIHeaderEditState;
			mode: 'headerEditing';
		}
	| {
			editState: SheetUIEditState;
			localEditorState: DataTableInteractionLocalEditorState<Lookup>;
			mode: 'localEditorOpen';
		};

export type DataTableInteractionAction<Lookup = unknown> =
	| {
			type: 'reset';
		}
	| {
			type: 'clear';
		}
	| {
			cell: SheetUISelectedCellState;
			type: 'cell_selected';
		}
	| {
			selection: DataTableInteractionCellSelection;
			type: 'cell_range_selected';
		}
	| {
			cell: SheetUISelectedCellState;
			type: 'local_editor_dismissed_to_cell';
		}
	| {
			editState: SheetUIEditState;
			type: 'cell_edit_started';
		}
	| {
			editState: SheetUIEditState;
			localEditorState: DataTableInteractionLocalEditorState<Lookup>;
			type: 'local_editor_opened';
		}
	| {
			editState?: SheetUIEditState | null;
			type: 'cell_editor_dismissed';
		}
	| {
			cellKey: string | null;
			type: 'header_selected';
		}
	| {
			headerEditState: SheetUIHeaderEditState;
			type: 'header_edit_started';
		}
	| {
			type: 'header_edit_dismissed';
		};

/*
 * Build the default no-selection dataTable interaction state.
 */

export function getInitialDataTableInteractionState<Lookup = unknown>(): DataTableInteractionState<Lookup> {
	return {
		mode: 'idle',
	};
}

/*
 * Return the selected-cell state matching one active cell editor.
 */

export function getDataTableSelectedCellStateFromEditState(editState: SheetUIEditState | null | undefined): SheetUISelectedCellState | null {
	if (!editState?.rowId || !editState.cellKey) {
		return null;
	}

	return {
		cellKey: editState.cellKey,
		rowId: editState.rowId,
	};
}

/*
 * Return whether two selected-cell identities point at the same visual cell.
 */

export function areDataTableSelectedCellsEqual(a?: SheetUISelectedCellState | null, b?: SheetUISelectedCellState | null) {
	return a?.rowId === b?.rowId && a?.cellKey === b?.cellKey;
}

/*
 * Build a single-cell selection state for one active dataTable cell.
 */

export function getDataTableSingleCellSelection(cell: SheetUISelectedCellState): DataTableInteractionCellSelection {
	return {
		activeCell: cell,
		anchorCell: cell,
		rangeEndCell: cell,
		selectedCellKeyMap: {
			[getSheetCellKey(cell.rowId, cell.cellKey)]: true,
		},
	};
}

/*
 * Return the cell currently highlighted by the interaction state.
 */

export function getSelectedCellState(state: DataTableInteractionState): SheetUISelectedCellState | null {
	return state.mode === 'cellSelected' ? state.selection.activeCell : null;
}

/*
 * Return the active rectangular cell selection from the interaction state.
 */

export function getSelectedCellSelection(state: DataTableInteractionState): DataTableInteractionCellSelection | null {
	return state.mode === 'cellSelected' ? state.selection : null;
}

/*
 * Return the inline or dataTable-local active edit state.
 */

export function getActiveEditState(state: DataTableInteractionState): SheetUIEditState | null {
	if (state.mode === 'cellEditing' || state.mode === 'localEditorOpen') {
		return state.editState;
	}

	return null;
}

/*
 * Return the active header edit state.
 */

export function getActiveHeaderEditState(state: DataTableInteractionState): SheetUIHeaderEditState | null {
	return state.mode === 'headerEditing' ? state.headerEditState : null;
}

/*
 * Return the currently selected header cell key.
 */

export function getSelectedHeaderCellKey(state: DataTableInteractionState): string | null {
	return state.mode === 'headerSelected' ? state.cellKey : null;
}

/*
 * Return the dataTable-local editor state when one is open.
 */

export function getOpenLocalEditorState<Lookup>(state: DataTableInteractionState<Lookup>): DataTableInteractionLocalEditorState<Lookup> | null {
	return state.mode === 'localEditorOpen' ? state.localEditorState : null;
}

/*
 * Return the last local-editor cell that was dismissed by clicking the cell again.
 */

export function getDismissedLocalEditorCell(state: DataTableInteractionState): SheetUISelectedCellState | null {
	return state.mode === 'cellSelected' ? state.dismissedLocalEditorCell || null : null;
}

/*
 * Own all transient dataTable selection and edit-mode transitions.
 */

export function dataTableInteractionReducer<Lookup>(
	state: DataTableInteractionState<Lookup>,
	action: DataTableInteractionAction<Lookup>,
): DataTableInteractionState<Lookup> {
	switch (action.type) {
		case 'reset':
		case 'clear':
		case 'header_edit_dismissed':
			return getInitialDataTableInteractionState();
		case 'cell_selected':
			if (
				state.mode === 'cellSelected' &&
				areDataTableSelectedCellsEqual(state.selection.activeCell, action.cell) &&
				Object.keys(state.selection.selectedCellKeyMap).length === 1 &&
				!state.dismissedLocalEditorCell
			) {
				return state;
			}

			return {
				mode: 'cellSelected',
				selection: getDataTableSingleCellSelection(action.cell),
			};
		case 'cell_range_selected':
			return {
				mode: 'cellSelected',
				selection: action.selection,
			};
		case 'local_editor_dismissed_to_cell':
			return {
				dismissedLocalEditorCell: action.cell,
				mode: 'cellSelected',
				selection: getDataTableSingleCellSelection(action.cell),
			};
		case 'cell_edit_started':
			return {
				editState: action.editState,
				mode: 'cellEditing',
			};
		case 'local_editor_opened':
			return {
				editState: action.editState,
				localEditorState: action.localEditorState,
				mode: 'localEditorOpen',
			};
		case 'cell_editor_dismissed': {
			const selectedCell = getDataTableSelectedCellStateFromEditState(action.editState || getActiveEditState(state));

			return selectedCell
				? {
						mode: 'cellSelected',
						selection: getDataTableSingleCellSelection(selectedCell),
					}
				: getInitialDataTableInteractionState();
		}
		case 'header_selected':
			return action.cellKey
				? {
						cellKey: action.cellKey,
						mode: 'headerSelected',
					}
				: getInitialDataTableInteractionState();
		case 'header_edit_started':
			return {
				headerEditState: action.headerEditState,
				mode: 'headerEditing',
			};
		default:
			return state;
	}
}
