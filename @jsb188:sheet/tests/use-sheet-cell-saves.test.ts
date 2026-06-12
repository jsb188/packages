import { describe, expect, it } from 'vitest';
import type { SheetCellGQL } from '@jsb188/mday/types/sheet.d.ts';
import {
	editSheetCellsResultIsFailure,
	getFailedSheetCellSaveItems,
	getSheetFlushBaseCell,
	getSheetFlushBaseCellsByCoord,
	sheetPersistedEntryMatchesPendingEdit,
} from '../src/libs/use-sheet-cell-saves';

/*
 * Build one minimal confirmed cell fixture.
 */
function buildCell(overrides: Partial<SheetCellGQL>): SheetCellGQL {
	return {
		id: 'cell-1',
		rowIndex: 1,
		columnIndex: 1,
		textValue: 'a',
		revision: 1,
		sourceType: 'USER',
		...overrides,
	} as SheetCellGQL;
}

describe('editSheetCellsResultIsFailure', () => {
	it('treats an error field as a failure', () => {
		expect(editSheetCellsResultIsFailure({
			editSheetCells: { savedCells: [] },
			error: { errorCode: 'network_error' },
		})).toBe(true);
	});

	it('treats an aborted result as a failure', () => {
		expect(editSheetCellsResultIsFailure({ aborted: true })).toBe(true);
	});

	it('treats a missing editSheetCells payload as a failure', () => {
		expect(editSheetCellsResultIsFailure({})).toBe(true);
		expect(editSheetCellsResultIsFailure({ editSheetCells: null })).toBe(true);
		expect(editSheetCellsResultIsFailure(undefined)).toBe(true);
		expect(editSheetCellsResultIsFailure(null)).toBe(true);
	});

	it('treats a payload with a null error as a success', () => {
		// doMutate resolves successes as {...data, error: null}
		expect(editSheetCellsResultIsFailure({
			editSheetCells: { savedCells: [] },
			error: null,
		})).toBe(false);
	});
});

describe('getFailedSheetCellSaveItems', () => {
	const items = [
		{ coordKey: '1:1' },
		{ coordKey: '2:2' },
		{ coordKey: '3:3' },
	];

	it('fails every sent item when the request itself failed', () => {
		const savedCellsByCoord = new Map([['1:1', buildCell({})]]);

		expect(getFailedSheetCellSaveItems(items, savedCellsByCoord, true)).toEqual(items);
	});

	it('fails only the items the server silently omitted from savedCells', () => {
		const savedCellsByCoord = new Map([
			['1:1', buildCell({})],
			['3:3', buildCell({ rowIndex: 3, columnIndex: 3 })],
		]);

		expect(getFailedSheetCellSaveItems(items, savedCellsByCoord, false)).toEqual([
			{ coordKey: '2:2' },
		]);
	});

	it('fails nothing when every coordinate was committed', () => {
		const savedCellsByCoord = new Map(items.map((item) => [item.coordKey, buildCell({})]));

		expect(getFailedSheetCellSaveItems(items, savedCellsByCoord, false)).toEqual([]);
	});
});

describe('getSheetFlushBaseCell', () => {
	it('returns the only side present', () => {
		const baseCell = buildCell({ id: 'a', revision: 3 });
		const savedCell = buildCell({ id: 'a', revision: 4 });

		expect(getSheetFlushBaseCell(baseCell, undefined)).toBe(baseCell);
		expect(getSheetFlushBaseCell(undefined, savedCell)).toBe(savedCell);
		expect(getSheetFlushBaseCell(undefined, undefined)).toBeUndefined();
	});

	it('picks the higher revision', () => {
		const baseCell = buildCell({ id: 'a', revision: 3, textValue: 'stale base' });
		const savedCell = buildCell({ id: 'a', revision: 4, textValue: 'fresh save' });

		expect(getSheetFlushBaseCell(baseCell, savedCell)).toBe(savedCell);
		expect(getSheetFlushBaseCell(savedCell, baseCell)).toBe(savedCell);
	});

	it('keeps the render base on an equal revision', () => {
		const baseCell = buildCell({ id: 'a', revision: 3, textValue: 'base' });
		const savedCell = buildCell({ id: 'a', revision: 3, textValue: 'echo' });

		expect(getSheetFlushBaseCell(baseCell, savedCell)).toBe(baseCell);
	});

	it('defers to the side with a readable revision', () => {
		const baseCell = buildCell({ id: 'a', revision: undefined as unknown as number });
		const savedCell = buildCell({ id: 'a', revision: 2 });

		expect(getSheetFlushBaseCell(baseCell, savedCell)).toBe(savedCell);
		expect(getSheetFlushBaseCell(savedCell, baseCell)).toBe(savedCell);
	});
});

describe('getSheetFlushBaseCellsByCoord', () => {
	it('returns the base map reference when there are no recent saves', () => {
		const baseCellsByCoord = new Map([['1:1', buildCell({ id: 'a' })]]);

		expect(getSheetFlushBaseCellsByCoord(baseCellsByCoord, new Map())).toBe(baseCellsByCoord);
	});

	it('overlays higher-revision recent saves and keeps fresher base cells', () => {
		const baseCellsByCoord = new Map([
			['1:1', buildCell({ id: 'a', revision: 3, textValue: 'stale base' })],
			['2:2', buildCell({ id: 'b', rowIndex: 2, columnIndex: 2, revision: 9, textValue: 'fresh base' })],
		]);
		const recentSavedCellsByCoord = new Map([
			['1:1', buildCell({ id: 'a', revision: 4, textValue: 'fresh save' })],
			['2:2', buildCell({ id: 'b', rowIndex: 2, columnIndex: 2, revision: 8, textValue: 'older save' })],
			['3:3', buildCell({ id: 'c', rowIndex: 3, columnIndex: 3, revision: 1, textValue: 'new cell' })],
		]);

		const merged = getSheetFlushBaseCellsByCoord(baseCellsByCoord, recentSavedCellsByCoord);
		expect(merged.get('1:1')?.textValue).toBe('fresh save');
		expect(merged.get('2:2')?.textValue).toBe('fresh base');
		expect(merged.get('3:3')?.textValue).toBe('new cell');
		// The input base map is never mutated
		expect(baseCellsByCoord.get('1:1')?.textValue).toBe('stale base');
		expect(baseCellsByCoord.has('3:3')).toBe(false);
	});
});

describe('sheetPersistedEntryMatchesPendingEdit', () => {
	it('matches when the edit payloads are identical', () => {
		const input = { cell: { rowIndex: 1, columnIndex: 1, rawInput: 'x', value: 'x' } };

		expect(sheetPersistedEntryMatchesPendingEdit(
			{ input, dataTableTarget: null },
			{ input, dataTableTarget: null },
		)).toBe(true);
	});

	it('rejects a persisted twin holding a different (newer) input', () => {
		expect(sheetPersistedEntryMatchesPendingEdit(
			{ input: { cell: { rowIndex: 1, columnIndex: 1, rawInput: 'newer', value: 'newer' } } },
			{ input: { cell: { rowIndex: 1, columnIndex: 1, rawInput: 'old', value: 'old' } } },
		)).toBe(false);
	});

	it('rejects a DataTable twin holding a different target value', () => {
		const input = { cell: { rowIndex: 1, columnIndex: 1 } };
		const target = {
			cellKey: 'k1',
			dataTableId: 'dt1',
			dataTableRowId: 'row1',
			organizationId: null,
			value: 'old',
		};

		expect(sheetPersistedEntryMatchesPendingEdit(
			{ input, dataTableTarget: { ...target, value: 'newer' } },
			{ input, dataTableTarget: target },
		)).toBe(false);
		expect(sheetPersistedEntryMatchesPendingEdit(
			{ input, dataTableTarget: { ...target } },
			{ input, dataTableTarget: target },
		)).toBe(true);
	});

	it('treats a missing dataTableTarget the same as null', () => {
		const input = { cell: { rowIndex: 1, columnIndex: 1, rawInput: 'x' } };

		expect(sheetPersistedEntryMatchesPendingEdit(
			{ input },
			{ input, dataTableTarget: null },
		)).toBe(true);
	});

	it('compares bigint payload values against their persisted string form', () => {
		// A sessionStorage round-trip stringifies bigints (e.g. regionId)
		const persistedInput = { cell: { rowIndex: 1, columnIndex: 1, rawInput: 'x', regionId: '42' } };
		const liveInput = { cell: { rowIndex: 1, columnIndex: 1, rawInput: 'x', regionId: 42n as unknown as string } };

		expect(sheetPersistedEntryMatchesPendingEdit(
			{ input: persistedInput },
			{ input: liveInput },
		)).toBe(true);
	});
});
