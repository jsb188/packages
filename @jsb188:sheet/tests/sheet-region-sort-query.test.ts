import { describe, expect, it } from 'vitest';
import type { DataTableDesignCellObj } from '@jsb188/mday/types/dataTable.d.ts';
import {
	getSheetRegionSortQueryPartAtIndex,
	getSheetRegionSortQueryRenderableParts,
	inspectSheetRegionSourceSortString,
	isSheetRegionSourceSortStringValid,
	parseSheetRegionSourceSortString,
	SheetRegionSortQueryParseError,
	splitSheetRegionSourceSortStringParts,
	stringifySheetRegionSourceSort,
} from '../src/libs/sheet-region-sort-query';

/*
 * Return one dataTable design cell fixture for sort parser tests.
 */
function getTestDesignCell(key: string): DataTableDesignCellObj {
	return {
		fieldType: 'TEXT',
		humanFieldType: 'TEXT',
		key,
		label: key,
	};
}

const TEST_DESIGN_CELLS: DataTableDesignCellObj[] = [
	getTestDesignCell('status'),
	getTestDesignCell('amount'),
	getTestDesignCell('createdAt'),
	getTestDesignCell('order date'),
];

describe('sheet region sort query utilities', () => {
	it('parses a SQL-like query into mutation-ready sort objects', () => {
		const sort = parseSheetRegionSourceSortString(
			'status ASC, "createdAt" desc',
			TEST_DESIGN_CELLS,
		);

		expect(sort).toEqual([
			{
				cellKey: 'status',
				direction: 'ASC',
			},
			{
				cellKey: 'createdAt',
				direction: 'DESC',
			},
		]);
	});

	it('parses single-quoted and backtick-quoted column keys', () => {
		const sort = parseSheetRegionSourceSortString(
			"'order date' ASC, `amount` DESC",
			TEST_DESIGN_CELLS,
		);

		expect(sort).toEqual([
			{
				cellKey: 'order date',
				direction: 'ASC',
			},
			{
				cellKey: 'amount',
				direction: 'DESC',
			},
		]);
	});

	it('round trips structured sort objects through canonical query text', () => {
		const sourceSort = [
			{
				cellKey: 'status',
				direction: 'ASC' as const,
			},
			{
				cellKey: 'order date',
				direction: 'DESC' as const,
			},
		];
		const query = stringifySheetRegionSourceSort(sourceSort);

		expect(query).toBe('status ASC, "order date" DESC');
		expect(parseSheetRegionSourceSortString(query, TEST_DESIGN_CELLS)).toEqual(sourceSort);
	});

	it('throws typed errors for invalid strict parsing', () => {
		expect(() => parseSheetRegionSourceSortString('missing ASC', TEST_DESIGN_CELLS)).toThrow(SheetRegionSortQueryParseError);
		expect(() => parseSheetRegionSourceSortString('status', TEST_DESIGN_CELLS)).toThrow(SheetRegionSortQueryParseError);
		expect(() => parseSheetRegionSourceSortString('status UP', TEST_DESIGN_CELLS)).toThrow(SheetRegionSortQueryParseError);
	});

	it('returns whether a string sort query is valid for mutation input', () => {
		expect(isSheetRegionSourceSortStringValid('status ASC', TEST_DESIGN_CELLS)).toBe(true);
		expect(isSheetRegionSourceSortStringValid('', TEST_DESIGN_CELLS)).toBe(true);
		expect(isSheetRegionSourceSortStringValid('status ASC, status DESC', TEST_DESIGN_CELLS)).toBe(false);
		expect(isSheetRegionSourceSortStringValid('status', TEST_DESIGN_CELLS)).toBe(false);
	});

	it('returns parser parts for overlay helpers', () => {
		const parts = splitSheetRegionSourceSortStringParts(
			'status ASC, amount DESC',
			TEST_DESIGN_CELLS,
		);

		expect(parts.map((part) => ({
			kind: part.kind,
			match: part.match,
		}))).toEqual([
			{
				kind: 'column',
				match: 'status',
			},
			{
				kind: 'direction',
				match: 'ASC',
			},
			{
				kind: 'separator',
				match: ',',
			},
			{
				kind: 'column',
				match: 'amount',
			},
			{
				kind: 'direction',
				match: 'DESC',
			},
		]);
	});

	it('keeps partial parts when inspect finds an invalid query', () => {
		const result = inspectSheetRegionSourceSortString(
			'status ASC, missing DESC',
			TEST_DESIGN_CELLS,
		);

		expect(result.sort).toBeNull();
		expect(result.error?.code).toBe('UNKNOWN_COLUMN');
		expect(result.parts.some((part) => part.kind === 'column' && part.match === 'status')).toBe(true);
		expect(result.parts.some((part) => part.kind === 'error')).toBe(true);
	});

	it('returns the query part under a caret position', () => {
		const query = 'status ASC, amount DESC';
		const parts = splitSheetRegionSourceSortStringParts(query, TEST_DESIGN_CELLS);

		expect(getSheetRegionSortQueryPartAtIndex(parts, 2)?.kind).toBe('column');
		expect(getSheetRegionSortQueryPartAtIndex(parts, 8)?.kind).toBe('direction');
		expect(getSheetRegionSortQueryPartAtIndex(parts, 6)).toBeNull();
	});

	it('returns renderable chunks for highlighted input mirrors', () => {
		const query = 'status ASC, missing DESC';
		const result = inspectSheetRegionSourceSortString(query, TEST_DESIGN_CELLS);
		const chunks = getSheetRegionSortQueryRenderableParts(query, result.parts);

		expect(chunks.some((chunk) => chunk.kind === 'part' && chunk.part.kind === 'column' && chunk.text === 'status')).toBe(true);
		expect(chunks.some((chunk) => chunk.kind === 'part' && chunk.part.kind === 'error' && chunk.text === 'missing')).toBe(true);
		expect(chunks.map((chunk) => chunk.text).join('')).toBe(query);
	});
});
