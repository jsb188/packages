import type {
	SheetUIEditState,
	SheetUIEditorClickSource,
	SheetUIHeaderEditState,
	SheetUISelectedCellState,
} from '@jsb188/react-web/ui/SheetUI';

export type SheetInteractionLocalEditorState<Lookup = unknown> = {
	clickSource: SheetUIEditorClickSource;
	displayValue: string;
	lookup: Lookup;
};

export type SheetInteractionState<Lookup = unknown> =
	| {
			mode: 'idle';
		}
	| {
			dismissedLocalEditorCell?: SheetUISelectedCellState | null;
			mode: 'cellSelected';
			selectedCell: SheetUISelectedCellState;
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
			localEditorState: SheetInteractionLocalEditorState<Lookup>;
			mode: 'localEditorOpen';
		};

export type SheetInteractionAction<Lookup = unknown> =
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
			cell: SheetUISelectedCellState;
			type: 'local_editor_dismissed_to_cell';
		}
	| {
			editState: SheetUIEditState;
			type: 'cell_edit_started';
		}
	| {
			editState: SheetUIEditState;
			localEditorState: SheetInteractionLocalEditorState<Lookup>;
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
 * Build the default no-selection sheet interaction state.
 */

export function getInitialSheetInteractionState(): SheetInteractionState {
	return {
		mode: 'idle',
	};
}

/*
 * Return the selected-cell state matching one active cell editor.
 */

export function getSheetSelectedCellStateFromEditState(editState: SheetUIEditState | null | undefined): SheetUISelectedCellState | null {
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

export function areSheetSelectedCellsEqual(a?: SheetUISelectedCellState | null, b?: SheetUISelectedCellState | null) {
	return a?.rowId === b?.rowId && a?.cellKey === b?.cellKey;
}

/*
 * Return the cell currently highlighted by the interaction state.
 */

export function getSelectedCellState(state: SheetInteractionState): SheetUISelectedCellState | null {
	return state.mode === 'cellSelected' ? state.selectedCell : null;
}

/*
 * Return the inline or sheet-local active edit state.
 */

export function getActiveEditState(state: SheetInteractionState): SheetUIEditState | null {
	if (state.mode === 'cellEditing' || state.mode === 'localEditorOpen') {
		return state.editState;
	}

	return null;
}

/*
 * Return the active header edit state.
 */

export function getActiveHeaderEditState(state: SheetInteractionState): SheetUIHeaderEditState | null {
	return state.mode === 'headerEditing' ? state.headerEditState : null;
}

/*
 * Return the currently selected header cell key.
 */

export function getSelectedHeaderCellKey(state: SheetInteractionState): string | null {
	return state.mode === 'headerSelected' ? state.cellKey : null;
}

/*
 * Return the sheet-local editor state when one is open.
 */

export function getOpenLocalEditorState<Lookup>(state: SheetInteractionState<Lookup>): SheetInteractionLocalEditorState<Lookup> | null {
	return state.mode === 'localEditorOpen' ? state.localEditorState : null;
}

/*
 * Return the last local-editor cell that was dismissed by clicking the cell again.
 */

export function getDismissedLocalEditorCell(state: SheetInteractionState): SheetUISelectedCellState | null {
	return state.mode === 'cellSelected' ? state.dismissedLocalEditorCell || null : null;
}

/*
 * Own all transient sheet selection and edit-mode transitions.
 */

export function sheetInteractionReducer<Lookup>(
	state: SheetInteractionState<Lookup>,
	action: SheetInteractionAction<Lookup>,
): SheetInteractionState<Lookup> {
	switch (action.type) {
		case 'reset':
		case 'clear':
		case 'header_edit_dismissed':
			return getInitialSheetInteractionState();
		case 'cell_selected':
			if (state.mode === 'cellSelected' && areSheetSelectedCellsEqual(state.selectedCell, action.cell) && !state.dismissedLocalEditorCell) {
				return state;
			}

			return {
				mode: 'cellSelected',
				selectedCell: action.cell,
			};
		case 'local_editor_dismissed_to_cell':
			return {
				dismissedLocalEditorCell: action.cell,
				mode: 'cellSelected',
				selectedCell: action.cell,
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
			const selectedCell = getSheetSelectedCellStateFromEditState(action.editState || getActiveEditState(state));

			return selectedCell
				? {
						mode: 'cellSelected',
						selectedCell,
					}
				: getInitialSheetInteractionState();
		}
		case 'header_selected':
			return action.cellKey
				? {
						cellKey: action.cellKey,
						mode: 'headerSelected',
					}
				: getInitialSheetInteractionState();
		case 'header_edit_started':
			return {
				headerEditState: action.headerEditState,
				mode: 'headerEditing',
			};
		default:
			return state;
	}
}
