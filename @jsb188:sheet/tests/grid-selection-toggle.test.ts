import { describe, expect, it } from 'vitest';
import {
	getGridDataEdgeNavigationSelection,
	getGridSelectedCellKeyMapWithCellToggled,
	gridSelectedCellKeyMapIsSolidRectangle,
} from '../src/libs/grid-selection.ts';
import { parseGridClipboardText } from '../src/libs/grid-clipboard.ts';
import type { SheetColumnMetric } from '@jsb188/react-web/ui/SheetUI';

/*
 * Build minimal column metrics for selection helper tests.
 */
function createColumnMetrics(keys: string[]) {
	return keys.map((key, index) => ({
		column: { key },
		left: index * 100,
		width: 100,
	})) as SheetColumnMetric[];
}

describe('grid selection toggling', () => {
	const columnMetrics = createColumnMetrics(['1', '2', '3']);
	const rowIds = ['1', '2', '3'];

	it('detects solid rectangles and selections with holes', () => {
		const solid = {
			'1:1': true,
			'1:2': true,
			'2:1': true,
			'2:2': true,
		};
		const withHole = {
			'1:1': true,
			'1:2': true,
			'2:2': true,
		};

		expect(gridSelectedCellKeyMapIsSolidRectangle({ columnMetrics, rowIds, selectedCellKeyMap: solid })).toBe(true);
		expect(gridSelectedCellKeyMapIsSolidRectangle({ columnMetrics, rowIds, selectedCellKeyMap: withHole })).toBe(false);
	});

	it('toggles cells in and out of a selection map', () => {
		const start = { '1:1': true, '1:2': true };
		const removed = getGridSelectedCellKeyMapWithCellToggled(start, { cellKey: '2', rowId: '1' });
		const added = getGridSelectedCellKeyMapWithCellToggled(removed, { cellKey: '3', rowId: '2' });

		expect(removed).toEqual({ '1:1': true });
		expect(added).toEqual({ '1:1': true, '2:3': true });
		// The source map is never mutated
		expect(start).toEqual({ '1:1': true, '1:2': true });
	});
});

describe('grid data-edge navigation', () => {
	const columnMetrics = createColumnMetrics(['1', '2', '3', '4', '5']);
	const rowIds = ['1', '2', '3', '4', '5'];

	/*
	 * Content layout on column 1 (by rowId): rows 1-2 filled, 3 empty, 4-5 filled.
	 */
	const hasCellContent = (rowId: string, cellKey: string) => {
		return cellKey === '1' && ['1', '2', '4', '5'].includes(rowId);
	};

	it('jumps from inside a block to the block edge', () => {
		const next = getGridDataEdgeNavigationSelection({
			columnMetrics,
			direction: 'down',
			hasCellContent,
			rowIds,
			selectedCellState: { cellKey: '1', rowId: '1' },
		});

		expect(next).toEqual({ cellKey: '1', rowId: '2' });
	});

	it('jumps from a block edge across the gap to the next block', () => {
		const next = getGridDataEdgeNavigationSelection({
			columnMetrics,
			direction: 'down',
			hasCellContent,
			rowIds,
			selectedCellState: { cellKey: '1', rowId: '2' },
		});

		expect(next).toEqual({ cellKey: '1', rowId: '4' });
	});

	it('jumps to the grid edge when no content remains in the direction', () => {
		const next = getGridDataEdgeNavigationSelection({
			columnMetrics,
			direction: 'down',
			hasCellContent,
			rowIds,
			selectedCellState: { cellKey: '1', rowId: '5' },
		});

		expect(next).toEqual({ cellKey: '1', rowId: '5' });
	});

	it('jumps from empty space to the next filled cell', () => {
		const next = getGridDataEdgeNavigationSelection({
			columnMetrics,
			direction: 'up',
			hasCellContent,
			rowIds,
			selectedCellState: { cellKey: '1', rowId: '3' },
		});

		expect(next).toEqual({ cellKey: '1', rowId: '2' });
	});
});

describe('grid clipboard parsing', () => {
	it('keeps quoted embedded newlines inside one cell', () => {
		const grid = parseGridClipboardText('a\t"line one\nline two"\nb\tc');

		expect(grid).toEqual([
			['a', 'line one\nline two'],
			['b', 'c'],
		]);
	});

	it('keeps quoted embedded delimiters and escaped quotes', () => {
		const grid = parseGridClipboardText('"a\tb"\t"say ""hi"""');

		expect(grid).toEqual([
			['a\tb', 'say "hi"'],
		]);
	});

	it('parses plain TSV rows unchanged', () => {
		const grid = parseGridClipboardText('1\t2\n3\t4\n');

		expect(grid).toEqual([
			['1', '2'],
			['3', '4'],
		]);
	});
});
