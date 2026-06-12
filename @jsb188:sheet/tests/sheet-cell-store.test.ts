import { describe, expect, it } from 'vitest';
import type { SheetCellGQL } from '@jsb188/mday/types/sheet.d.ts';
import {
	getSheetRenderCellsByCoord,
	mergeConfirmedSheetCells,
	mergeRefetchedSheetCells,
	removeConfirmedSheetRegionCells,
	type SheetPendingCellEdit,
	type SheetRemotePendingCell,
} from '../src/libs/sheet-cell-store';
import { applySheetStructureEditToPendingEdits } from '../src/libs/sheet-structure-edit';

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

describe('mergeConfirmedSheetCells', () => {
	it('adds new cells keyed by coordinate', () => {
		const next = mergeConfirmedSheetCells(new Map(), [
			buildCell({ id: 'a', rowIndex: 2, columnIndex: 3 }),
		]);

		expect(next.get('2:3')?.id).toBe('a');
	});

	it('rejects same-id patches with an older or equal revision', () => {
		const current = mergeConfirmedSheetCells(new Map(), [
			buildCell({ id: 'a', revision: 5, textValue: 'newer' }),
		]);

		const afterStale = mergeConfirmedSheetCells(current, [
			buildCell({ id: 'a', revision: 4, textValue: 'older' }),
		]);
		expect(afterStale).toBe(current);
		expect(afterStale.get('1:1')?.textValue).toBe('newer');

		const afterEqual = mergeConfirmedSheetCells(current, [
			buildCell({ id: 'a', revision: 5, textValue: 'replay' }),
		]);
		expect(afterEqual.get('1:1')?.textValue).toBe('newer');
	});

	it('accepts same-id patches with a higher revision', () => {
		const current = mergeConfirmedSheetCells(new Map(), [
			buildCell({ id: 'a', revision: 5, textValue: 'old' }),
		]);
		const next = mergeConfirmedSheetCells(current, [
			buildCell({ id: 'a', revision: 6, textValue: 'new' }),
		]);

		expect(next.get('1:1')?.textValue).toBe('new');
	});

	it('lets a different cell id at the same coordinate always win', () => {
		const current = mergeConfirmedSheetCells(new Map(), [
			buildCell({ id: 'a', revision: 9, textValue: 'old region cell' }),
		]);
		const next = mergeConfirmedSheetCells(current, [
			buildCell({ id: 'b', revision: 1, textValue: 'rematerialized' }),
		]);

		expect(next.get('1:1')?.id).toBe('b');
	});

	it('deletes coordinates unconditionally when the tombstone has no id', () => {
		const current = mergeConfirmedSheetCells(new Map(), [
			buildCell({ id: 'a', rowIndex: 4, columnIndex: 5 }),
		]);
		const next = mergeConfirmedSheetCells(current, null, [{ rowIndex: 4, columnIndex: 5 }]);

		expect(next.has('4:5')).toBe(false);
	});

	it('applies an id-stamped tombstone only to the cell it was issued for', () => {
		const current = mergeConfirmedSheetCells(new Map(), [
			buildCell({ id: 'a', rowIndex: 4, columnIndex: 5 }),
		]);

		const matching = mergeConfirmedSheetCells(current, null, [
			{ rowIndex: 4, columnIndex: 5, id: 'a', revision: 1 },
		]);
		expect(matching.has('4:5')).toBe(false);

		// The coordinate was re-occupied by a different cell (e.g. a
		// rematerialized region cell): the stale tombstone must not delete it
		const mismatched = mergeConfirmedSheetCells(current, null, [
			{ rowIndex: 4, columnIndex: 5, id: 'b', revision: 1 },
		]);
		expect(mismatched.get('4:5')?.id).toBe('a');
		expect(mismatched).toBe(current);
	});

	it('returns the same map reference when nothing changed', () => {
		const current = mergeConfirmedSheetCells(new Map(), [buildCell({ id: 'a', revision: 2 })]);
		const next = mergeConfirmedSheetCells(current, [buildCell({ id: 'a', revision: 1 })], [
			{ rowIndex: 9, columnIndex: 9 },
		]);

		expect(next).toBe(current);
	});
});

describe('mergeRefetchedSheetCells', () => {
	it('keeps a stored same-id cell with a higher revision over the snapshot twin', () => {
		const current = mergeConfirmedSheetCells(new Map(), [
			buildCell({ id: 'a', revision: 7, textValue: 'fresh save' }),
		]);
		const incoming = mergeConfirmedSheetCells(new Map(), [
			buildCell({ id: 'a', revision: 5, textValue: 'stale snapshot' }),
		]);

		const next = mergeRefetchedSheetCells(current, incoming);
		expect(next.get('1:1')?.textValue).toBe('fresh save');
		expect(next.get('1:1')?.revision).toBe(7);
	});

	it('takes the snapshot cell when its revision is equal or higher', () => {
		const current = mergeConfirmedSheetCells(new Map(), [
			buildCell({ id: 'a', revision: 5, textValue: 'old' }),
		]);

		const higher = mergeRefetchedSheetCells(current, mergeConfirmedSheetCells(new Map(), [
			buildCell({ id: 'a', revision: 6, textValue: 'newer snapshot' }),
		]));
		expect(higher.get('1:1')?.textValue).toBe('newer snapshot');

		const equal = mergeRefetchedSheetCells(current, mergeConfirmedSheetCells(new Map(), [
			buildCell({ id: 'a', revision: 5, textValue: 'same revision' }),
		]));
		expect(equal.get('1:1')?.textValue).toBe('same revision');
	});

	it('drops stored coordinates missing from the snapshot', () => {
		const current = mergeConfirmedSheetCells(new Map(), [
			buildCell({ id: 'a', rowIndex: 4, columnIndex: 5, revision: 9 }),
		]);

		const next = mergeRefetchedSheetCells(current, new Map());
		expect(next.has('4:5')).toBe(false);
	});

	it('adds snapshot-only coordinates', () => {
		const incoming = mergeConfirmedSheetCells(new Map(), [
			buildCell({ id: 'b', rowIndex: 2, columnIndex: 2, revision: 1 }),
		]);

		const next = mergeRefetchedSheetCells(new Map(), incoming);
		expect(next.get('2:2')?.id).toBe('b');
	});

	it('lets a different snapshot id at the same coordinate win regardless of revision', () => {
		const current = mergeConfirmedSheetCells(new Map(), [
			buildCell({ id: 'a', revision: 9, textValue: 'old cell' }),
		]);
		const incoming = mergeConfirmedSheetCells(new Map(), [
			buildCell({ id: 'b', revision: 1, textValue: 'replacement' }),
		]);

		const next = mergeRefetchedSheetCells(current, incoming);
		expect(next.get('1:1')?.id).toBe('b');
	});

	it('returns the incoming map reference unchanged when no stored cell outranks it', () => {
		const current = mergeConfirmedSheetCells(new Map(), [
			buildCell({ id: 'a', revision: 5 }),
		]);
		const incoming = mergeConfirmedSheetCells(new Map(), [
			buildCell({ id: 'a', revision: 5 }),
		]);

		expect(mergeRefetchedSheetCells(current, incoming)).toBe(incoming);
	});
});

describe('getSheetRenderCellsByCoord', () => {
	it('overlays pending edit previews on top of confirmed cells', () => {
		const confirmed = mergeConfirmedSheetCells(new Map(), [
			buildCell({ id: 'a', textValue: 'saved' }),
		]);
		const pending = new Map<string, SheetPendingCellEdit>([[
			'1:1',
			{
				input: { cell: { rowIndex: 1, columnIndex: 1, rawInput: 'draft' } },
				previewCell: buildCell({ id: 'a', textValue: 'draft' }),
				saveVersion: 1,
				state: 'pending',
			},
		]]);

		const rendered = getSheetRenderCellsByCoord(confirmed, pending);
		expect(rendered.get('1:1')?.textValue).toBe('draft');
	});

	it('returns the confirmed map untouched when no edits are pending', () => {
		const confirmed = mergeConfirmedSheetCells(new Map(), [buildCell({ id: 'a' })]);

		expect(getSheetRenderCellsByCoord(confirmed, new Map())).toBe(confirmed);
	});
});

describe('removeConfirmedSheetRegionCells', () => {
	it('removes only the materialized cells of the deleted region', () => {
		const confirmed = mergeConfirmedSheetCells(new Map(), [
			buildCell({ id: 'a', rowIndex: 1, columnIndex: 1, sourceType: 'REGION_GENERATED', regionId: 'r1' }),
			buildCell({ id: 'b', rowIndex: 1, columnIndex: 2, sourceType: 'REGION_GENERATED', regionId: 'r2' }),
			buildCell({ id: 'c', rowIndex: 2, columnIndex: 1, sourceType: 'USER', regionId: null }),
		]);
		const next = removeConfirmedSheetRegionCells(confirmed, 'r1');

		expect(next.has('1:1')).toBe(false);
		expect(next.get('1:2')?.id).toBe('b');
		expect(next.get('2:1')?.id).toBe('c');
	});
});

describe('remote pending layer', () => {
	it('layers confirmed < remote-pending < own-pending', () => {
		const confirmed = mergeConfirmedSheetCells(new Map(), [
			buildCell({ id: 'a', textValue: 'confirmed' }),
			buildCell({ id: 'b', rowIndex: 2, columnIndex: 1, textValue: 'confirmed-2' }),
		]);
		const remotePending = new Map<string, SheetRemotePendingCell>([
			['1:1', { accountId: 'peer', at: 1, cell: buildCell({ id: 'a', textValue: 'remote' }) }],
			['2:1', { accountId: 'peer', at: 1, cell: buildCell({ id: 'b', rowIndex: 2, columnIndex: 1, textValue: 'remote-2' }) }],
		]);
		const ownPending = new Map<string, SheetPendingCellEdit>([[
			'1:1',
			{
				input: { cell: { rowIndex: 1, columnIndex: 1, rawInput: 'mine' } },
				previewCell: buildCell({ id: 'a', textValue: 'mine' }),
				saveVersion: 1,
				state: 'pending',
			},
		]]);

		const rendered = getSheetRenderCellsByCoord(confirmed, ownPending, remotePending);
		expect(rendered.get('1:1')?.textValue).toBe('mine');
		expect(rendered.get('2:1')?.textValue).toBe('remote-2');
	});
});

describe('applySheetStructureEditToPendingEdits', () => {
	it('shifts pending entry coordinates, inputs, and previews', () => {
		const pending = new Map<string, SheetPendingCellEdit>([[
			'3:2',
			{
				input: { cell: { rowIndex: 3, columnIndex: 2, rawInput: 'x' } },
				previewCell: buildCell({ id: 'a', rowIndex: 3, columnIndex: 2 }),
				saveVersion: 1,
				state: 'pending',
			},
		]]);

		const next = applySheetStructureEditToPendingEdits(pending, 'INSERT_ROW_ABOVE', 2);
		expect(next.has('3:2')).toBe(false);

		const shifted = next.get('4:2');
		expect(shifted?.input.cell.rowIndex).toBe(4);
		expect(shifted?.previewCell.rowIndex).toBe(4);
	});

	it('drops pending entries on deleted rows', () => {
		const pending = new Map<string, SheetPendingCellEdit>([[
			'3:2',
			{
				input: { cell: { rowIndex: 3, columnIndex: 2, rawInput: 'x' } },
				previewCell: buildCell({ id: 'a', rowIndex: 3, columnIndex: 2 }),
				saveVersion: 1,
				state: 'pending',
			},
		]]);

		const next = applySheetStructureEditToPendingEdits(pending, 'DELETE_ROW', 3);
		expect(next.size).toBe(0);
	});
});
