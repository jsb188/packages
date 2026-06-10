import { describe, expect, it } from 'vitest';
import type { DataTableDesignCellObj, DataTableFieldTypeEnum } from '@jsb188/mday/types/dataTable.d.ts';
import {
	getSheetRegionFilterQueryPartAtIndex,
	getSheetRegionFilterQueryRenderableParts,
	inspectSheetRegionSourceFilterString,
	isSheetRegionSourceFilterStringValid,
	parseSheetRegionSourceFilterString,
	SheetRegionFilterQueryParseError,
	splitSheetRegionSourceFilterStringParts,
	stringifySheetRegionSourceFilter,
} from '../src/libs/sheet-region-filter-query';

/*
 * Return one dataTable design cell fixture for parser tests.
 */
function getTestDesignCell(key: string, fieldType: DataTableFieldTypeEnum, options?: DataTableDesignCellObj['options']): DataTableDesignCellObj {
	return {
		fieldType,
		humanFieldType: fieldType,
		key,
		label: key,
		options,
	};
}

const TEST_DESIGN_CELLS: DataTableDesignCellObj[] = [
	getTestDesignCell('status', 'SELECT', [
		{
			label: 'Active',
			value: 'active',
		},
		{
			label: 'Pending',
			value: 'pending',
		},
	]),
	getTestDesignCell('amount', 'NUMBER'),
	getTestDesignCell('name', 'TEXT'),
	getTestDesignCell('eventDate', 'DATE'),
	getTestDesignCell('createdAt', 'DATETIME'),
	getTestDesignCell('active', 'BOOLEAN'),
	getTestDesignCell('tags', 'MULTI_SELECT'),
	getTestDesignCell('notes', 'TEXT'),
	{
		fieldType: 'ID_OR_TEXT',
		humanFieldType: 'DATE',
		key: 'legacyDate',
		label: 'legacyDate',
	},
];

describe('sheet region filter query utilities', () => {
	it('parses a SQL-like query into a mutation-ready filter object', () => {
		const filter = parseSheetRegionSourceFilterString(
			'status = "active" AND amount >= 100 AND name CONTAINS "farm"',
			TEST_DESIGN_CELLS,
		);

		expect(filter).toEqual({
			combinator: 'AND',
			conditions: [
				{
					cellKey: 'status',
					operator: 'EQUALS',
					textValue: 'active',
				},
				{
					cellKey: 'amount',
					numberValue: 100,
					operator: 'GTE',
				},
				{
					cellKey: 'name',
					operator: 'CONTAINS',
					textValue: 'farm',
				},
			],
			groups: [],
		});
	});

	it('preserves grouped OR filters inside higher-precedence AND filters', () => {
		const filter = parseSheetRegionSourceFilterString(
			'(status = "active" OR status = "pending") AND amount > 50',
			TEST_DESIGN_CELLS,
		);

		expect(filter).toEqual({
			combinator: 'AND',
			conditions: [
				{
					cellKey: 'amount',
					numberValue: 50,
					operator: 'GT',
				},
			],
			groups: [
				{
					combinator: 'OR',
					conditions: [
						{
							cellKey: 'status',
							operator: 'EQUALS',
							textValue: 'active',
						},
						{
							cellKey: 'status',
							operator: 'EQUALS',
							textValue: 'pending',
						},
					],
					groups: [],
				},
			],
		});
	});

	it('parses supported operator families by field type', () => {
		const filter = parseSheetRegionSourceFilterString(
			'eventDate <= "2026-12-31" AND createdAt AFTER "2026-01-01" AND active = true AND tags CONTAINS_ANY ("Organic", "CSA") AND status IN ("Active", "Pending") AND notes IS EMPTY',
			TEST_DESIGN_CELLS,
		);

		expect(filter?.conditions?.find((condition) => condition.cellKey === 'eventDate')).toEqual({
			cellKey: 'eventDate',
			dateValue: '2026-12-31',
			operator: 'ON_OR_BEFORE',
		});
		expect(filter?.conditions?.find((condition) => condition.cellKey === 'createdAt')?.operator).toBe('AFTER');
		expect(filter?.conditions?.find((condition) => condition.cellKey === 'active')).toEqual({
			booleanValue: true,
			cellKey: 'active',
			operator: 'EQUALS',
		});
		expect(filter?.conditions?.find((condition) => condition.cellKey === 'tags')).toEqual({
			cellKey: 'tags',
			operator: 'CONTAINS_ANY',
			textValues: ['Organic', 'CSA'],
		});
		expect(filter?.conditions?.find((condition) => condition.cellKey === 'status')).toEqual({
			cellKey: 'status',
			operator: 'IN',
			textValues: ['active', 'pending'],
		});
		expect(filter?.conditions?.find((condition) => condition.cellKey === 'notes')).toEqual({
			cellKey: 'notes',
			operator: 'IS_EMPTY',
		});
	});

	it('parses date filters against human date fields stored as text', () => {
		const filter = parseSheetRegionSourceFilterString(
			'"legacyDate" >= \'2026-01-01\' AND legacyDate <= "2026-12-31"',
			TEST_DESIGN_CELLS,
		);

		expect(filter).toEqual({
			combinator: 'AND',
			conditions: [
				{
					cellKey: 'legacyDate',
					dateValue: '2026-01-01',
					operator: 'ON_OR_AFTER',
				},
				{
					cellKey: 'legacyDate',
					dateValue: '2026-12-31',
					operator: 'ON_OR_BEFORE',
				},
			],
			groups: [],
		});
	});

	it('parses quoted column keys and single-quoted values', () => {
		const filter = parseSheetRegionSourceFilterString(
			'"status" = \'Active\' AND \'amount\' >= 100',
			TEST_DESIGN_CELLS,
		);

		expect(filter).toEqual({
			combinator: 'AND',
			conditions: [
				{
					cellKey: 'status',
					operator: 'EQUALS',
					textValue: 'active',
				},
				{
					cellKey: 'amount',
					numberValue: 100,
					operator: 'GTE',
				},
			],
			groups: [],
		});
	});

	it('round trips a structured filter object through canonical query text', () => {
		const sourceFilter = {
			combinator: 'AND' as const,
			conditions: [
				{
					cellKey: 'amount',
					numberValue: 100,
					operator: 'GTE' as const,
				},
			],
			groups: [
				{
					combinator: 'OR' as const,
					conditions: [
						{
							cellKey: 'status',
							operator: 'EQUALS' as const,
							textValue: 'active',
						},
						{
							cellKey: 'name',
							operator: 'CONTAINS' as const,
							textValue: 'farm',
						},
					],
					groups: [],
				},
			],
		};
		const query = stringifySheetRegionSourceFilter(sourceFilter);

		expect(query).toBe('amount >= 100 AND (status = "active" OR name CONTAINS "farm")');
		expect(parseSheetRegionSourceFilterString(query, TEST_DESIGN_CELLS)).toEqual(sourceFilter);
	});

	it('round trips escaped column keys and string values through canonical query text', () => {
		const designCells = [
			...TEST_DESIGN_CELLS,
			getTestDesignCell('field`key', 'TEXT'),
		];
		const sourceFilter = {
			combinator: 'AND' as const,
			conditions: [{
				cellKey: 'field`key',
				operator: 'CONTAINS' as const,
				textValue: 'North "Field"\nLine',
			}],
			groups: [],
		};
		const query = stringifySheetRegionSourceFilter(sourceFilter);

		expect(query).toBe('`field\\`key` CONTAINS "North \\"Field\\"\\nLine"');
		expect(parseSheetRegionSourceFilterString(query, designCells)).toEqual(sourceFilter);
	});

	it('throws typed errors for invalid strict parsing', () => {
		expect(() => parseSheetRegionSourceFilterString('missing = "value"', TEST_DESIGN_CELLS)).toThrow(SheetRegionFilterQueryParseError);
		expect(() => parseSheetRegionSourceFilterString('name > 1', TEST_DESIGN_CELLS)).toThrow(SheetRegionFilterQueryParseError);
	});

	it('returns whether a string filter query is valid for mutation input', () => {
		expect(isSheetRegionSourceFilterStringValid('status = "active"', TEST_DESIGN_CELLS)).toBe(true);
		expect(isSheetRegionSourceFilterStringValid('', TEST_DESIGN_CELLS)).toBe(true);
		expect(isSheetRegionSourceFilterStringValid('name > 1', TEST_DESIGN_CELLS)).toBe(false);
	});

	it('returns parser parts for future overlay helpers', () => {
		const parts = splitSheetRegionSourceFilterStringParts(
			'status = "active" AND amount >= 100',
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
				kind: 'condition',
				match: '= "active"',
			},
			{
				kind: 'combinator',
				match: 'AND',
			},
			{
				kind: 'column',
				match: 'amount',
			},
			{
				kind: 'condition',
				match: '>= 100',
			},
		]);
	});

	it('keeps partial parts when inspect finds an invalid query', () => {
		const result = inspectSheetRegionSourceFilterString(
			'status = "active" AND name > 1',
			TEST_DESIGN_CELLS,
		);

		expect(result.filter).toBeNull();
		expect(result.error?.code).toBe('INCOMPATIBLE_OPERATOR');
		expect(result.parts.some((part) => part.kind === 'column' && part.match === 'status')).toBe(true);
		expect(result.parts.some((part) => part.kind === 'error')).toBe(true);
	});

	it('returns the query part under a caret position', () => {
		const query = 'status = "active" AND amount >= 100';
		const parts = splitSheetRegionSourceFilterStringParts(query, TEST_DESIGN_CELLS);

		expect(getSheetRegionFilterQueryPartAtIndex(parts, 2)?.kind).toBe('column');
		expect(getSheetRegionFilterQueryPartAtIndex(parts, 9)?.kind).toBe('condition');
		expect(getSheetRegionFilterQueryPartAtIndex(parts, 6)).toBeNull();
	});

	it('returns renderable chunks for highlighted input mirrors', () => {
		const query = 'status = "active" AND name > 1';
		const result = inspectSheetRegionSourceFilterString(query, TEST_DESIGN_CELLS);
		const chunks = getSheetRegionFilterQueryRenderableParts(query, result.parts);

		expect(chunks.some((chunk) => chunk.kind === 'part' && chunk.part.kind === 'column' && chunk.text === 'status')).toBe(true);
		expect(chunks.some((chunk) => chunk.kind === 'part' && chunk.part.kind === 'error' && chunk.text === '> 1')).toBe(true);
		expect(chunks.map((chunk) => chunk.text).join('')).toBe(query);
	});
});
