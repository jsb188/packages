import { describe, expect, it } from 'vitest';
import {
	getSheetCellValueType,
	getSheetCellValueTypeForDataTableFieldType,
	getSheetTextValueType,
	mergeSheetAxisDesignLineStyles,
} from '@jsb188/mday/utils/sheet.ts';
import {
	getSheetBorderColorStyleDelta,
	getSheetBorderPresetStyleDeltaForNeighbors,
} from '../src/libs/sheet-border-styles.ts';
import {
	persistSheetPendingEditsBatch,
	readSheetPendingEdits,
} from '../src/libs/sheet-pending-persistence.ts';

describe('axis design line style merges', () => {
	it('merges a style delta into a line and keeps other design fields', () => {
		const next = mergeSheetAxisDesignLineStyles(
			{ '3': { style: { bold: true }, width: 120 } },
			[{ delta: { fillColor: '#ff0000' }, key: '3' }],
		);

		expect(next['3'].width).toBe(120);
		expect((next['3'].style as any)?.bold).toBe(true);
		expect((next['3'].style as any)?.fillColor).toBe('#ff0000');
	});

	it('removes style keys for null delta values and drops emptied lines', () => {
		const next = mergeSheetAxisDesignLineStyles(
			{
				'2': { style: { bold: true } },
				'5': { style: { bold: true }, width: 90 },
			},
			[
				{ delta: { bold: null }, key: '2' },
				{ delta: { bold: null }, key: '5' },
			],
		);

		// Line 2 had only the style: it drops from the map entirely
		expect(next['2']).toBeUndefined();
		// Line 5 keeps its width but loses the emptied style field
		expect(next['5'].width).toBe(90);
		expect(next['5'].style).toBeUndefined();
	});

	it('creates missing lines when a delta targets them', () => {
		const next = mergeSheetAxisDesignLineStyles(undefined, [
			{ delta: { borderTopWidth: 1, borderTopStyle: 'solid' }, key: '7' },
		]);

		expect((next['7'].style as any)?.borderTopWidth).toBe(1);
		expect((next['7'].style as any)?.borderTopStyle).toBe('solid');
	});
});

describe('border preset deltas for line neighbors', () => {
	it('returns all four enabled sides for outlineAllCells interior column cells', () => {
		const delta = getSheetBorderPresetStyleDeltaForNeighbors('outlineAllCells', {
			bottom: true,
			left: false,
			right: false,
			top: true,
		});

		// Interior cells skip Top (a neighbor above draws it) but keep
		// Right/Bottom, plus Left because no selected column sits to the left
		expect(delta.borderTopWidth).toBeUndefined();
		expect(delta.borderRightWidth).toBe(1);
		expect(delta.borderBottomWidth).toBe(1);
		expect(delta.borderLeftWidth).toBe(1);
	});

	it('nulls every border key for outlineNone so merges remove them', () => {
		const delta = getSheetBorderPresetStyleDeltaForNeighbors('outlineNone', {
			bottom: true,
			left: true,
			right: true,
			top: true,
		});

		expect(delta.borderTopWidth).toBeNull();
		expect(delta.borderBottomStyle).toBeNull();
		expect(delta.borderLeftColor).toBeNull();
		expect(Object.keys(delta)).toHaveLength(12);
	});

	it('paints only enabled sides for a border color delta', () => {
		const delta = getSheetBorderColorStyleDelta({ borderTopWidth: 1 }, '#00ff00');

		expect(delta).toEqual({ borderTopColor: '#00ff00' });
		expect(getSheetBorderColorStyleDelta({}, '#00ff00')).toBeNull();
	});
});

describe('batched pending-edit persistence', () => {
	it('persists many entries with monotonic seq tokens in input order', () => {
		const sheetId = 'line-format-test-sheet';
		const entries = ['1:1', '1:2', '1:3'].map((coordKey) => ({
			coordKey,
			entry: {
				editedAt: Date.now(),
				flushState: 'queued' as const,
				input: { cell: { columnIndex: Number(coordKey.split(':')[1]), rowIndex: 1 } },
				previewCell: { columnIndex: Number(coordKey.split(':')[1]), rowIndex: 1 } as any,
			},
		}));

		const seqs = persistSheetPendingEditsBatch(sheetId, entries);

		expect(seqs).toHaveLength(3);
		expect(seqs[1]).toBe(seqs[0] + 1);
		expect(seqs[2]).toBe(seqs[1] + 1);

		const persisted = readSheetPendingEdits(sheetId);

		expect(persisted.size).toBe(3);
		expect(persisted.get('1:2')?.seq).toBe(seqs[1]);
	});

	it('returns an empty seq list for an empty batch', () => {
		expect(persistSheetPendingEditsBatch('line-format-test-sheet-empty', [])).toEqual([]);
	});
});

describe('cell value type detection', () => {
	it('classifies raw text values', () => {
		expect(getSheetTextValueType('12345')).toBe('CELL_INT');
		expect(getSheetTextValueType('-42')).toBe('CELL_INT');
		expect(getSheetTextValueType('5.1234')).toBe('CELL_FLOAT');
		expect(getSheetTextValueType('-.5')).toBe('CELL_FLOAT');
		expect(getSheetTextValueType('2026-06-10')).toBe('CELL_DATE');
		// A date-shaped string that is not a real calendar date stays text
		expect(getSheetTextValueType('2026-13-45')).toBe('CELL_TEXT');
		expect(getSheetTextValueType('hello')).toBe('CELL_TEXT');
		expect(getSheetTextValueType('12,345')).toBe('CELL_TEXT');
		expect(getSheetTextValueType('')).toBe('CELL_TEXT');
		expect(getSheetTextValueType('TRUE')).toBe('CELL_BOOLEAN');
		expect(getSheetTextValueType('false')).toBe('CELL_BOOLEAN');
	});

	it('prefers server typed columns over text parsing', () => {
		expect(getSheetCellValueType({ numberValue: 7 } as any, 'whatever')).toBe('CELL_INT');
		expect(getSheetCellValueType({ numberValue: 7.5 } as any, 'whatever')).toBe('CELL_FLOAT');
		expect(getSheetCellValueType({ dateValue: '2026-06-10' } as any, 'whatever')).toBe('CELL_DATE');
		expect(getSheetCellValueType({ booleanValue: false } as any, 'whatever')).toBe('CELL_BOOLEAN');
		// No typed columns: classify the display text
		expect(getSheetCellValueType({} as any, '99')).toBe('CELL_INT');
		expect(getSheetCellValueType(null, '2026-06-10')).toBe('CELL_DATE');
	});

	it('maps DataTable column field types for region cells', () => {
		expect(getSheetCellValueTypeForDataTableFieldType('BOOLEAN')).toBe('CELL_BOOLEAN');
		expect(getSheetCellValueTypeForDataTableFieldType('NUMBER')).toBe('CELL_FLOAT');
		expect(getSheetCellValueTypeForDataTableFieldType('PRICE')).toBe('CELL_FLOAT');
		expect(getSheetCellValueTypeForDataTableFieldType('DATE')).toBe('CELL_DATE');
		expect(getSheetCellValueTypeForDataTableFieldType('DATETIME')).toBe('CELL_DATE');
		expect(getSheetCellValueTypeForDataTableFieldType('SELECT')).toBe('CELL_TEXT');
		// Unknown field type defers to value-based classification
		expect(getSheetCellValueTypeForDataTableFieldType(null)).toBeNull();
	});
});
