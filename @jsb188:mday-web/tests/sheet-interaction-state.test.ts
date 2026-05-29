import { describe, expect, it } from 'vitest';
import {
	getActiveEditState,
	getActiveHeaderEditState,
	getDismissedLocalEditorCell,
	getInitialSheetInteractionState,
	getOpenLocalEditorState,
	getSelectedCellState,
	getSelectedHeaderCellKey,
	sheetInteractionReducer,
} from '../src/modules/sheet-interaction-state';

describe('sheetInteractionReducer', () => {
	it('selects cells and replaces previous selections', () => {
		const initialState = getInitialSheetInteractionState();
		const firstSelectedState = sheetInteractionReducer(initialState, {
			cell: {
				cellKey: 'name',
				rowId: 'row-1',
			},
			type: 'cell_selected',
		});
		const nextSelectedState = sheetInteractionReducer(firstSelectedState, {
			cell: {
				cellKey: 'status',
				rowId: 'row-2',
			},
			type: 'cell_selected',
		});

		expect(getSelectedCellState(firstSelectedState)).toEqual({
			cellKey: 'name',
			rowId: 'row-1',
		});
		expect(getSelectedCellState(nextSelectedState)).toEqual({
			cellKey: 'status',
			rowId: 'row-2',
		});
		expect(getActiveEditState(nextSelectedState)).toBeNull();
	});

	it('restores the edited cell as selected when edit mode is dismissed', () => {
		const editingState = sheetInteractionReducer(getInitialSheetInteractionState(), {
			editState: {
				cellKey: 'name',
				draftValue: 'Alpha',
				rowId: 'row-1',
			},
			type: 'cell_edit_started',
		});
		const selectedState = sheetInteractionReducer(editingState, {
			type: 'cell_editor_dismissed',
		});

		expect(getActiveEditState(editingState)).toEqual({
			cellKey: 'name',
			draftValue: 'Alpha',
			rowId: 'row-1',
		});
		expect(getSelectedCellState(selectedState)).toEqual({
			cellKey: 'name',
			rowId: 'row-1',
		});
		expect(getActiveEditState(selectedState)).toBeNull();
	});

	it('tracks a dismissed local editor separately from ordinary selection', () => {
		const localEditorState = sheetInteractionReducer(getInitialSheetInteractionState(), {
			editState: {
				cellKey: 'status',
				disableInlineEditor: true,
				draftValue: 'open',
				rowId: 'row-1',
			},
			localEditorState: {
				clickSource: 'CELL_BACKGROUND',
				displayValue: 'Open',
				lookup: {
					id: 'lookup',
				},
			},
			type: 'local_editor_opened',
		});
		const selectedState = sheetInteractionReducer(localEditorState, {
			cell: {
				cellKey: 'status',
				rowId: 'row-1',
			},
			type: 'local_editor_dismissed_to_cell',
		});

		expect(getOpenLocalEditorState(localEditorState)?.displayValue).toBe('Open');
		expect(getSelectedCellState(selectedState)).toEqual({
			cellKey: 'status',
			rowId: 'row-1',
		});
		expect(getDismissedLocalEditorCell(selectedState)).toEqual({
			cellKey: 'status',
			rowId: 'row-1',
		});
	});

	it('keeps header selection and edit state mutually exclusive', () => {
		const selectedState = sheetInteractionReducer(getInitialSheetInteractionState(), {
			cellKey: 'name',
			type: 'header_selected',
		});
		const editingState = sheetInteractionReducer(selectedState, {
			headerEditState: {
				cellKey: 'name',
				draftValue: 'Name',
			},
			type: 'header_edit_started',
		});
		const dismissedState = sheetInteractionReducer(editingState, {
			type: 'header_edit_dismissed',
		});

		expect(getSelectedHeaderCellKey(selectedState)).toBe('name');
		expect(getSelectedHeaderCellKey(editingState)).toBeNull();
		expect(getActiveHeaderEditState(editingState)).toEqual({
			cellKey: 'name',
			draftValue: 'Name',
		});
		expect(getActiveHeaderEditState(dismissedState)).toBeNull();
	});
});
