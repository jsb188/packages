import { describe, expect, it } from 'vitest';
import {
	addSheetMergedRange,
	getSheetMergedRangeAtCell,
	getSheetMergedRanges,
	removeSheetMergedRangesIntersecting,
	shiftSheetMergedRangesForStructureEdit,
} from '@jsb188/mday/utils/sheet.ts';

const MERGE_B2_D4 = { startRowIndex: 2, startColumnIndex: 2, endRowIndex: 4, endColumnIndex: 4 };

describe('sheet merged ranges', () => {
	it('validates stored merge metadata and drops degenerate entries', () => {
		expect(getSheetMergedRanges({
			merges: [
				MERGE_B2_D4,
				{ startRowIndex: 1, startColumnIndex: 1, endRowIndex: 1, endColumnIndex: 1 },
				{ startRowIndex: 0, startColumnIndex: 2, endRowIndex: 3, endColumnIndex: 3 },
				{ startRowIndex: 5, startColumnIndex: 5, endRowIndex: 4, endColumnIndex: 6 },
			],
		})).toEqual([MERGE_B2_D4]);
		expect(getSheetMergedRanges(null)).toEqual([]);
	});

	it('finds the merge containing one cell', () => {
		expect(getSheetMergedRangeAtCell([MERGE_B2_D4], 3, 3)).toEqual(MERGE_B2_D4);
		expect(getSheetMergedRangeAtCell([MERGE_B2_D4], 5, 3)).toBe(null);
	});

	it('absorbs overlapping merges when adding a new range', () => {
		const next = addSheetMergedRange([MERGE_B2_D4], {
			startRowIndex: 4,
			startColumnIndex: 4,
			endRowIndex: 6,
			endColumnIndex: 6,
		});

		expect(next).toEqual([{ startRowIndex: 4, startColumnIndex: 4, endRowIndex: 6, endColumnIndex: 6 }]);
	});

	it('removes merges intersecting unmerge bounds', () => {
		expect(removeSheetMergedRangesIntersecting([MERGE_B2_D4], {
			startRowIndex: 4,
			startColumnIndex: 4,
			endRowIndex: 4,
			endColumnIndex: 4,
		})).toEqual([]);
	});

	it('shifts merges for row inserts and shrinks them for deletes', () => {
		expect(shiftSheetMergedRangesForStructureEdit([MERGE_B2_D4], 'INSERT_ROW_ABOVE', 1)).toEqual([
			{ startRowIndex: 3, startColumnIndex: 2, endRowIndex: 5, endColumnIndex: 4 },
		]);
		expect(shiftSheetMergedRangesForStructureEdit([MERGE_B2_D4], 'INSERT_ROW_ABOVE', 3)).toEqual([
			{ startRowIndex: 2, startColumnIndex: 2, endRowIndex: 5, endColumnIndex: 4 },
		]);
		expect(shiftSheetMergedRangesForStructureEdit([MERGE_B2_D4], 'DELETE_ROW', 3)).toEqual([
			{ startRowIndex: 2, startColumnIndex: 2, endRowIndex: 3, endColumnIndex: 4 },
		]);
		expect(shiftSheetMergedRangesForStructureEdit([MERGE_B2_D4], 'DELETE_COLUMN', 5)).toEqual([MERGE_B2_D4]);
	});

	it('drops merges that collapse to a single cell after a delete', () => {
		const twoCellMerge = { startRowIndex: 2, startColumnIndex: 2, endRowIndex: 2, endColumnIndex: 3 };

		expect(shiftSheetMergedRangesForStructureEdit([twoCellMerge], 'DELETE_COLUMN', 3)).toEqual([]);
	});
});
