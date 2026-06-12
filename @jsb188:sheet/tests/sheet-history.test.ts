import { describe, expect, it } from 'vitest';
import {
	applySheetStructureShiftToUndoEntries,
	getOptimisticSheetCellFromEditInput,
	getSheetCellEditInputsForMutation,
	getSheetCellSnapshotEditInput,
	getSheetPendingPreviewRebasedOnBase,
	getSheetStructureHistoryChange,
	getSheetValueEditInput,
	type SheetUndoRedoEntry,
} from '../src/libs/sheet-history';

describe('sheet history optimistic cells', () => {
	it('clears stale formula state when a static value replaces a formula cell', () => {
		const optimisticCell = getOptimisticSheetCellFromEditInput(
			getSheetValueEditInput(1, 1, 'ABC'),
			{
				columnIndex: 1,
				formulaText: '=@bench_sales(amount) WHERE orgId = A12',
				numberValue: 504,
				rawInput: '=@bench_sales(amount) WHERE orgId = A12',
				rowIndex: 1,
				textValue: null,
				value: '504',
			} as any,
		);

		expect(optimisticCell.rawInput).toBe('ABC');
		expect(optimisticCell.formulaText).toBe(null);
		expect(optimisticCell.formula).toBe(null);
		expect(optimisticCell.numberValue).toBe(null);
		expect(optimisticCell.textValue).toBe(null);
	});

	it('stamps formulaText when a new formula value is typed', () => {
		const optimisticCell = getOptimisticSheetCellFromEditInput(
			getSheetValueEditInput(1, 1, '=A2+1'),
			{
				columnIndex: 1,
				rawInput: 'old text',
				rowIndex: 1,
				textValue: 'old text',
			} as any,
		);

		expect(optimisticCell.formulaText).toBe('=A2+1');
		expect(optimisticCell.textValue).toBe(null);
	});

	it('uses the edited formula text instead of preserving stale formula metadata', () => {
		const optimisticCell = getOptimisticSheetCellFromEditInput(
			getSheetValueEditInput(1, 1, '=B1'),
			{
				columnIndex: 1,
				formula: {
					engine: 'server',
					references: [{
						id: 'A1',
						kind: 'SHEET_CELL',
						status: 'OK',
						text: 'A1',
					}],
					text: '=A1',
					version: 1,
				},
				rawInput: '=A1',
				rowIndex: 1,
				value: 'old',
			},
		);

		expect(optimisticCell.rawInput).toBe('=B1');
		expect(optimisticCell.formula?.text).toBe('=B1');
		expect(optimisticCell.formula?.references).toEqual([]);
		expect(optimisticCell.formula?.error).toBeNull();
	});

	it('clears stale formula metadata when a formula cell becomes plain text', () => {
		const optimisticCell = getOptimisticSheetCellFromEditInput(
			getSheetValueEditInput(1, 1, 'Plain text'),
			{
				columnIndex: 1,
				formula: {
					engine: 'server',
					text: '=A1',
					version: 1,
				},
				rawInput: '=A1',
				rowIndex: 1,
				value: 'old',
			},
		);

		expect(optimisticCell.rawInput).toBe('Plain text');
		expect(optimisticCell.formula).toBeNull();
	});

	it('skips value mutation when a queued edit returns to the visible server value', () => {
		const currentCellsByCoord = new Map([
			['1:1', {
				columnIndex: 1,
				rowIndex: 1,
				textValue: 'aa',
				value: null,
			}],
		]);

		expect(getSheetCellEditInputsForMutation([
			getSheetValueEditInput(1, 1, 'aa'),
		], currentCellsByCoord)).toEqual([]);
	});
});

describe('pending preview rebase over base', () => {
	it('keeps an earlier style edit when a later value edit stacked on it (style -> type -> enter)', () => {
		// Style edit on an empty cell, then a value edit stacked on the preview
		const styled = getOptimisticSheetCellFromEditInput(
			{ cell: { rowIndex: 1, columnIndex: 1, style: { textColor: '#ff0000' } } } as any,
			null,
		);
		const typed = getOptimisticSheetCellFromEditInput(getSheetValueEditInput(1, 1, 'hello'), styled);
		const snapshotInput = getSheetCellSnapshotEditInput(1, 1, typed);

		// Reconciling against the still-empty confirmed base must not strip the style
		const rebased = getSheetPendingPreviewRebasedOnBase(snapshotInput, typed, null);
		expect((rebased.style as any)?.textColor).toBe('#ff0000');
		expect(rebased.rawInput).toBe('hello');
	});

	it('keeps an earlier value edit when a later style edit stacked on it (type -> enter -> style)', () => {
		const typed = getOptimisticSheetCellFromEditInput(getSheetValueEditInput(1, 1, 'hello'), null);
		const styled = getOptimisticSheetCellFromEditInput(
			{ cell: { rowIndex: 1, columnIndex: 1, style: { textColor: '#ff0000' } } } as any,
			typed,
		);
		const snapshotInput = getSheetCellSnapshotEditInput(1, 1, styled);

		// Reconciling against the still-empty confirmed base must not erase the text
		const rebased = getSheetPendingPreviewRebasedOnBase(snapshotInput, styled, null);
		expect(rebased.rawInput).toBe('hello');
		expect((rebased.style as any)?.textColor).toBe('#ff0000');
	});
});

describe('sheet structure history', () => {
	/*
	 * Build a cells-by-coord map from sparse cell shapes for structure tests.
	 */
	function createCellsByCoord(cells: any[]) {
		const map = new Map<string, any>();

		cells.forEach((cell) => {
			map.set(`${cell.rowIndex}:${cell.columnIndex}`, cell);
		});

		return map;
	}

	it('inverts an insert into a delete with no content capture', () => {
		const change = getSheetStructureHistoryChange('INSERT_ROW_ABOVE', 3, new Map());

		expect(change.after).toEqual({ index: 3, operation: 'INSERT_ROW_ABOVE' });
		expect(change.before).toEqual({ index: 3, operation: 'DELETE_ROW' });
	});

	it('captures destroyed row content for a delete, skipping region-generated cells', () => {
		const cellsByCoord = createCellsByCoord([
			{ columnIndex: 1, rawInput: 'keep me', rowIndex: 2, style: { bold: true }, value: 'keep me' },
			{ columnIndex: 2, rawInput: 'generated', rowIndex: 2, sourceType: 'REGION_GENERATED', value: 'generated' },
			{ columnIndex: 1, rawInput: 'other row', rowIndex: 3, value: 'other row' },
		]);
		const change = getSheetStructureHistoryChange('DELETE_ROW', 2, cellsByCoord);

		expect(change.after).toEqual({ index: 2, operation: 'DELETE_ROW' });
		expect(change.before.operation).toBe('INSERT_ROW_ABOVE');
		expect(change.before.index).toBe(2);
		expect(change.before.restoreCells).toHaveLength(1);
		expect(change.before.restoreCells?.[0].cell.rawInput).toBe('keep me');
		expect((change.before.restoreCells?.[0].cell.style as any)?.bold).toBe(true);
	});

	it('rebases undo entries over a remote row insert', () => {
		const entries: SheetUndoRedoEntry[] = [{
			sheetCells: [{
				after: getSheetValueEditInput(5, 1, 'after'),
				before: getSheetValueEditInput(5, 1, 'before'),
			}],
		}];
		const rebased = applySheetStructureShiftToUndoEntries(entries, 'INSERT_ROW_ABOVE', 3);

		expect(rebased[0].sheetCells?.[0].after.cell.rowIndex).toBe(6);
		expect(rebased[0].sheetCells?.[0].before.cell.rowIndex).toBe(6);
	});

	it('drops changes touching a remotely deleted column and prunes empty entries', () => {
		const entries: SheetUndoRedoEntry[] = [
			{
				sheetCells: [{
					after: getSheetValueEditInput(1, 4, 'after'),
					before: getSheetValueEditInput(1, 4, 'before'),
				}],
			},
			{
				sheetCells: [{
					after: getSheetValueEditInput(1, 6, 'after'),
					before: getSheetValueEditInput(1, 6, 'before'),
				}],
			},
		];
		const rebased = applySheetStructureShiftToUndoEntries(entries, 'DELETE_COLUMN', 4);

		// The deleted-column entry disappears; the later column shifts left
		expect(rebased).toHaveLength(1);
		expect(rebased[0].sheetCells?.[0].after.cell.columnIndex).toBe(5);
	});

	it('rebases structure entries on the same axis, including restore cells', () => {
		const entries: SheetUndoRedoEntry[] = [{
			structure: {
				after: { index: 5, operation: 'DELETE_ROW' },
				before: {
					index: 5,
					operation: 'INSERT_ROW_ABOVE',
					restoreCells: [getSheetValueEditInput(5, 1, 'restored')],
				},
			},
		}];
		const rebased = applySheetStructureShiftToUndoEntries(entries, 'INSERT_ROW_ABOVE', 2);

		expect(rebased[0].structure?.after.index).toBe(6);
		expect(rebased[0].structure?.before.index).toBe(6);
		expect(rebased[0].structure?.before.restoreCells?.[0].cell.rowIndex).toBe(6);
	});
});
