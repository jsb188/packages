// @vitest-environment jsdom

import { readFileSync } from 'node:fs';
import type { ComponentProps } from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
	SHEET_HEADER_HEIGHT,
	SHEET_ROW_HEIGHT,
	SHEET_ROW_NUMBER_WIDTH,
	SHEET_STICKY_SPACER_SIZE,
	SheetUI,
	clampSheetColumnWidth,
	getSheetColumnIndexAtOffset,
	getSheetColumnMetrics,
	getSheetMinimumRowCount,
	getSheetVisibleRange,
	type SheetUICell,
	type SheetUICellRenderSnapshot,
	type SheetUICellRenderStore,
	type SheetUIColumn,
	type SheetUIFieldType,
	type SheetUIRowSlot,
} from '../ui/SheetUI';

let currentRoot: Root | null = null;

/*
 * Build one generic UI column for SheetUI tests.
 */

function createColumn(key: string, fieldType: SheetUIFieldType = 'TEXT', overrides: Partial<SheetUIColumn> = {}): SheetUIColumn {
	return {
		id: key,
		key,
		label: key.toUpperCase(),
		fieldType,
		options: fieldType === 'SELECT'
			? [
				{ label: 'Open', value: 'open' },
				{ label: 'Closed', value: 'closed' },
			]
			: [],
		...overrides,
	};
}

/*
 * Build one generic UI cell for SheetUI tests.
 */

function createCell(cellKey: string, value: string, overrides: Partial<SheetUICell> = {}): SheetUICell {
	return {
		cellKey,
		canEdit: true,
		canOpen: false,
		displayValue: value,
		draftValue: value,
		...overrides,
	};
}

/*
 * Build one visual row slot for SheetUI tests.
 */

function createRowSlot(rowId: string | null, rowIndex: number, cellsByKey: SheetUIRowSlot['cellsByKey'] = {}): SheetUIRowSlot {
	return {
		cellsByKey,
		rowId,
		rowIndex,
		rowKey: rowId || `empty-${rowIndex}`,
		rowNumber: rowIndex + 1,
		rowTop: SHEET_HEADER_HEIGHT + SHEET_STICKY_SPACER_SIZE + rowIndex * SHEET_ROW_HEIGHT,
		rowWidth: SHEET_ROW_NUMBER_WIDTH + 160,
	};
}

/*
 * Build a tiny render-store implementation for SheetUI render isolation tests.
 */

function createTestCellRenderStore(initialSnapshots: Record<string, SheetUICellRenderSnapshot>): SheetUICellRenderStore & {
	setSnapshot: (rowId: string, cellKey: string, snapshot: SheetUICellRenderSnapshot) => void;
} {
	const snapshots = new Map(Object.entries(initialSnapshots));
	const listeners = new Map<string, Set<() => void>>();

	return {
		getSnapshot: (rowId, cellKey) => snapshots.get(`${rowId}:${cellKey}`) || {},
		setSnapshot: (rowId, cellKey, snapshot) => {
			const key = `${rowId}:${cellKey}`;
			snapshots.set(key, snapshot);
			listeners.get(key)?.forEach((listener) => listener());
		},
		subscribe: (rowId, cellKey, listener) => {
			const key = `${rowId}:${cellKey}`;
			const keyListeners = listeners.get(key) || new Set<() => void>();

			keyListeners.add(listener);
			listeners.set(key, keyListeners);

			return () => {
				keyListeners.delete(listener);
			};
		},
	};
}

/*
 * Render SheetUI into a test root.
 */

async function renderSheetUI(props: Partial<ComponentProps<typeof SheetUI>> = {}) {
	const host = document.getElementById('test-root');
	if (!host) {
		throw new Error('Missing test root element');
	}

	const columns = props.columns || getSheetColumnMetrics([createColumn('name')]).metrics;
	const rows = props.rows || [
		createRowSlot('row-1', 0, {
			name: createCell('name', 'Alpha'),
		}),
		createRowSlot(null, 1),
		createRowSlot(null, 2),
		createRowSlot(null, 3),
	];

	currentRoot = createRoot(host);

	await act(async () => {
		currentRoot?.render(
			<SheetUI
				canvasHeight={160}
				canvasWidth={SHEET_ROW_NUMBER_WIDTH + 160}
				cellCount={rows.length * columns.length}
				columnCount={columns.length}
				columns={columns}
				headerWidth={SHEET_ROW_NUMBER_WIDTH + 160}
				rows={rows}
				scrollLeft={0}
				{...props}
			/>,
		);
	});

	return host;
}

beforeEach(() => {
	globalThis.IS_REACT_ACT_ENVIRONMENT = true;
	document.body.innerHTML = '<div id="test-root"></div>';
});

afterEach(() => {
	if (currentRoot) {
		act(() => {
			currentRoot?.unmount();
		});
		currentRoot = null;
	}
});

describe('SheetUI helpers', () => {
	it('calculates a buffered visible grid range', () => {
		expect(getSheetVisibleRange({
			bufferColumns: 1,
			bufferRows: 2,
			columnCount: 20,
			containerHeight: 96,
			containerWidth: 320,
			rowCount: 100,
			scrollLeft: 208,
			scrollTop: 160,
		})).toEqual({
			rowStart: 2,
			rowEnd: 8,
			columnStart: 0,
			columnEnd: 5,
		});
	});

	it('counts visible rows from the body area below the sticky header', () => {
		expect(getSheetVisibleRange({
			bufferColumns: 0,
			bufferRows: 0,
			columnCount: 1,
			containerHeight: SHEET_HEADER_HEIGHT + SHEET_ROW_HEIGHT * 2,
			containerWidth: 160,
			rowCount: 100,
			scrollLeft: 0,
			scrollTop: 0,
		}).rowEnd).toBe(2);
	});

	it('calculates enough blank rows to fill the viewport', () => {
		expect(getSheetMinimumRowCount(160)).toBe(4);
		expect(getSheetMinimumRowCount(160, 64)).toBe(3);
		expect(getSheetMinimumRowCount(33)).toBe(1);
		expect(getSheetMinimumRowCount(20)).toBe(0);
	});

	it('calculates variable-width column offsets for visible ranges', () => {
		const columns = [
			createColumn('name'),
			createColumn('status'),
			createColumn('owner'),
		];
		const metrics = getSheetColumnMetrics(columns, {
			name: 200,
			status: 80,
		});

		expect(clampSheetColumnWidth(20)).toBe(72);
		expect(metrics.offsets).toEqual([0, 200, 280, 440]);
		expect(getSheetColumnIndexAtOffset(metrics.offsets, 199)).toBe(0);
		expect(getSheetColumnIndexAtOffset(metrics.offsets, 200)).toBe(1);
		expect(getSheetVisibleRange({
			bufferColumns: 0,
			bufferRows: 0,
			columnOffsets: metrics.offsets,
			columnCount: columns.length,
			containerHeight: 96,
			containerWidth: 80,
			rowCount: 10,
			scrollLeft: 253,
			scrollTop: 32,
		})).toMatchObject({
			columnStart: 1,
			columnEnd: 3,
		});
	});
});

describe('SheetUI rendering', () => {
	it('renders generic visual data without GraphQL-shaped objects', async () => {
		const host = await renderSheetUI();
		const headerRow = host.querySelector('[data-sheet-header-row="true"]') as HTMLElement | null;
		const headerSpacer = host.querySelector('[data-sheet-sticky-header-spacer="true"]') as HTMLElement | null;
		const stickyColumnHeaderSpacer = host.querySelector('[data-sheet-sticky-column-header-spacer="true"]') as HTMLElement | null;
		const stickyColumnSpacerSlots = host.querySelectorAll('[data-sheet-sticky-column-spacer-slot="true"]') as NodeListOf<HTMLElement>;
		const stickyColumnSpacers = host.querySelectorAll('[data-sheet-sticky-column-spacer="true"]') as NodeListOf<HTMLElement>;
		const stickyColumnSpacer = stickyColumnSpacers[0] || null;
		const cornerCell = host.querySelector('[data-sheet-corner-cell="true"]') as HTMLElement | null;
		const rowNumbers = host.querySelectorAll('.sheet_ui_row_number') as NodeListOf<HTMLElement>;
		const rowNumber = rowNumbers[0] || null;
		const rowNumberSlots = host.querySelectorAll('[data-sheet-row-number-slot="true"]') as NodeListOf<HTMLElement>;
		const rowNumberSlot = rowNumberSlots[1] || null;
		const firstCell = host.querySelector('[data-sheet-cell="true"]') as HTMLElement | null;
		const fillerCell = host.querySelectorAll('[data-sheet-cell="true"]')[1] as HTMLElement | undefined;

		expect(host.querySelector('[data-sheet-header-cell="true"]')?.textContent).toBe('NAME');
		expect(headerRow?.className).toContain('rel');
		expect(headerRow?.className).toContain('h_left');
		expect(headerSpacer?.className).toContain('h_4');
		expect(headerSpacer?.className).toContain('bg_darker_1');
		expect(headerSpacer?.style.width).toBe(`${SHEET_ROW_NUMBER_WIDTH + 160}px`);
		expect(headerRow?.nextElementSibling).toBe(headerSpacer);
		expect(stickyColumnHeaderSpacer?.className).toContain('sheet_ui_header_cell');
		expect(stickyColumnHeaderSpacer?.className).toContain('sticky');
		expect(stickyColumnHeaderSpacer?.className).toContain('w_4');
		expect(stickyColumnHeaderSpacer?.className).toContain('bg_darker_1');
		expect(stickyColumnHeaderSpacer?.style.left).toBe(`${SHEET_ROW_NUMBER_WIDTH}px`);
		expect(stickyColumnHeaderSpacer?.style.position).toBe('sticky');
		expect(stickyColumnHeaderSpacer?.style.zIndex).toBe('32');
		expect(stickyColumnSpacer?.className).toContain('w_4');
		expect(stickyColumnSpacer?.style.left).toBe(`${SHEET_ROW_NUMBER_WIDTH}px`);
		expect(stickyColumnSpacer?.style.position).toBe('sticky');
		expect(stickyColumnSpacer?.style.zIndex).toBe('21');
		expect(stickyColumnSpacer?.style.top).toBe('');
		expect(stickyColumnSpacerSlots[0]?.style.top).toBe('36px');
		expect(stickyColumnSpacerSlots[1]?.style.top).toBe('68px');
		expect(stickyColumnSpacerSlots[2]?.style.top).toBe('100px');
		expect(stickyColumnSpacerSlots[3]?.style.top).toBe('132px');
		expect(host.querySelector('[data-sheet-sticky-header="true"]')?.className).toContain('sticky');
		expect((host.querySelector('[data-sheet-sticky-header="true"]') as HTMLElement | null)?.style.zIndex).toBe('31');
		expect(cornerCell?.className).toContain('sticky');
		expect(cornerCell?.className).toContain('bg');
		expect(cornerCell?.style.left).toBe('0px');
		expect(cornerCell?.style.position).toBe('sticky');
		expect(cornerCell?.style.zIndex).toBe('32');
		expect(rowNumber?.className).toContain('sticky');
		expect(rowNumber?.className).toContain('bg');
		expect(rowNumber?.style.left).toBe('0px');
		expect(rowNumber?.style.position).toBe('sticky');
		expect(rowNumber?.style.zIndex).toBe('21');
		expect(rowNumberSlots[0]?.style.top).toBe('0px');
		expect(rowNumberSlots[0]?.style.height).toBe(`${SHEET_HEADER_HEIGHT + SHEET_STICKY_SPACER_SIZE}px`);
		expect(rowNumber?.style.height).toBe(`${SHEET_HEADER_HEIGHT + SHEET_STICKY_SPACER_SIZE}px`);
		expect(rowNumberSlot?.style.top).toBe('36px');
		expect(firstCell?.textContent).toBe('Alpha');
		expect(fillerCell?.textContent).toBe('');
		expect(fillerCell?.className).toContain('noclick');
		expect(host.querySelector('.sheet_ui_canvas')?.getAttribute('data-cell-count')).toBe('4');
		expect(host.querySelectorAll('.sheet_ui_row_number')).toHaveLength(5);
		expect(host.querySelectorAll('[data-sheet-cell="true"]')).toHaveLength(4);
		expect(stickyColumnSpacerSlots).toHaveLength(4);
		expect(stickyColumnSpacers).toHaveLength(4);
	});

	it('renders sticky column spacers inside per-row positioning slots', async () => {
		const host = await renderSheetUI();
		const stickyColumnSpacerSlots = host.querySelectorAll('[data-sheet-sticky-column-spacer-slot="true"]') as NodeListOf<HTMLElement>;
		const stickyColumnSpacers = host.querySelectorAll('[data-sheet-sticky-column-spacer="true"]') as NodeListOf<HTMLElement>;

		expect(stickyColumnSpacerSlots).toHaveLength(stickyColumnSpacers.length);
		expect(stickyColumnSpacerSlots[0]?.contains(stickyColumnSpacers[0])).toBe(true);
		expect(stickyColumnSpacerSlots[1]?.contains(stickyColumnSpacers[1])).toBe(true);
		expect(stickyColumnSpacers[0]?.style.top).toBe('');
		expect(stickyColumnSpacers[1]?.style.top).toBe('');
	});

	it('adds the sticky background class to sticky row and column cells', async () => {
		const columns = getSheetColumnMetrics([
			createColumn('name'),
			createColumn('status'),
		]).metrics;
		const host = await renderSheetUI({
			canvasWidth: SHEET_ROW_NUMBER_WIDTH + 320,
			columnCount: 2,
			columns,
			headerWidth: SHEET_ROW_NUMBER_WIDTH + 320,
			rows: [
				createRowSlot('row-1', 0, {
					name: createCell('name', 'Alpha'),
					status: createCell('status', 'Open'),
				}),
			],
			stickyColumnCount: 1,
		});
		const headerCells = host.querySelectorAll('[data-sheet-header-cell="true"]') as NodeListOf<HTMLElement>;
		const stickyCell = host.querySelector('[data-sheet-cell="true"][data-cell-key="name"]') as HTMLElement | null;
		const nonStickyCell = host.querySelector('[data-sheet-cell="true"][data-cell-key="status"]') as HTMLElement | null;

		expect(headerCells[0]?.className).toContain('bg');
		expect(headerCells[1]?.className).toContain('bg');
		expect(stickyCell?.className).toContain('bg');
		expect(nonStickyCell?.className).toContain('bg');
		expect(headerCells[0]?.style.zIndex).toBe('32');
		expect(headerCells[1]?.style.zIndex).toBe('');
		expect(stickyCell?.style.zIndex).toBe('21');
		expect(nonStickyCell?.style.zIndex).toBe('');
	});

	it('re-renders only the changed cell when a render-store snapshot changes', async () => {
		const columns = getSheetColumnMetrics([
			createColumn('name'),
			createColumn('status'),
		]).metrics;
		const nameCell = createCell('name', 'Alpha');
		const statusCell = createCell('status', 'Open');
		const rows = [
			createRowSlot('row-1', 0, {
				name: nameCell,
				status: statusCell,
			}),
		];
		const cellRenderStore = createTestCellRenderStore({
			'row-1:name': { cell: nameCell },
			'row-1:status': { cell: statusCell },
		});
		const renderCounts: Record<string, number> = {};
		const cellRenderCallback = (rowId: string | null, cellKey: string) => {
			if (!rowId) {
				return;
			}

			const key = `${rowId}:${cellKey}`;
			renderCounts[key] = (renderCounts[key] || 0) + 1;
		};

		await renderSheetUI({
			canvasWidth: SHEET_ROW_NUMBER_WIDTH + 320,
			cellCount: 2,
			cellRenderCallback,
			cellStore: cellRenderStore,
			columnCount: 2,
			columns,
			headerWidth: SHEET_ROW_NUMBER_WIDTH + 320,
			rows,
		});

		renderCounts['row-1:name'] = 0;
		renderCounts['row-1:status'] = 0;

		await act(async () => {
			cellRenderStore.setSnapshot('row-1', 'status', {
				cell: createCell('status', 'Closed'),
			});
			await Promise.resolve();
		});

		expect(renderCounts['row-1:name']).toBe(0);
		expect(renderCounts['row-1:status']).toBe(1);
	});

	it('keeps sticky column spacer left position independent from horizontal scroll', async () => {
		const host = await renderSheetUI({
			scrollLeft: 120,
			stickyColumnEndLeft: SHEET_ROW_NUMBER_WIDTH + 160,
		});
		const stickyColumnHeaderSpacer = host.querySelector('[data-sheet-sticky-column-header-spacer="true"]') as HTMLElement | null;
		const stickyColumnSpacer = host.querySelector('[data-sheet-sticky-column-spacer="true"]') as HTMLElement | null;

		expect(stickyColumnHeaderSpacer?.style.left).toBe(`${SHEET_ROW_NUMBER_WIDTH + 160}px`);
		expect(stickyColumnHeaderSpacer?.style.position).toBe('sticky');
		expect(stickyColumnSpacer?.style.left).toBe(`${SHEET_ROW_NUMBER_WIDTH + 160}px`);
		expect(stickyColumnSpacer?.style.position).toBe('sticky');
	});

	it('renders editor markup from a generic edit state', async () => {
		const host = await renderSheetUI({
			editState: {
				cellKey: 'name',
				draftValue: 'Alpha',
				rowId: 'row-1',
			},
		});
		const input = host.querySelector('[data-sheet-editor="true"]') as HTMLInputElement | null;
		const cell = host.querySelector('[data-sheet-cell="true"][data-cell-key="name"]') as HTMLElement | null;

		expect(input).not.toBeNull();
		expect(input?.className).toContain('ft_xs');
		expect(input?.className).toContain('px_6');
		expect(cell?.className).not.toContain('px_6');
		expect(input?.dataset.rowId).toBe('row-1');
		expect(input?.dataset.cellKey).toBe('name');
		expect(input?.value).toBe('Alpha');
	});

	it('renders select editors like display cells with an inert chevron', async () => {
		const columns = getSheetColumnMetrics([
			createColumn('status', 'SELECT', {
				options: [
					{ label: 'Open', value: 'open' },
					{ label: 'Closed', value: 'closed' },
				],
			}),
			createColumn('statusText', 'SELECT_OR_TEXT'),
			createColumn('tags', 'MULTI_SELECT'),
			createColumn('enabled', 'BOOLEAN'),
			createColumn('dueDate', 'DATE'),
			createColumn('startsAt', 'DATETIME'),
		]).metrics;
		const rows = [
			createRowSlot('row-1', 0, {
				dueDate: createCell('dueDate', 'Feb 1, 2026'),
				enabled: createCell('enabled', 'true'),
				status: createCell('status', 'Open', {
					displayClassName: 'ellip bg_emerald_fd px_6 r_xs',
				}),
				statusText: createCell('statusText', 'Custom', {
					displayClassName: 'ellip bg_primary_fd px_6 r_xs',
				}),
				startsAt: createCell('startsAt', '2026-05-21T09:30'),
				tags: createCell('tags', 'Market, Prep'),
			}),
		];
		const host = await renderSheetUI({
			canvasWidth: SHEET_ROW_NUMBER_WIDTH + 960,
			cellCount: 6,
			columnCount: 6,
			columns,
			editState: {
				cellKey: 'status',
				draftValue: 'open',
				rowId: 'row-1',
			},
			headerWidth: SHEET_ROW_NUMBER_WIDTH + 960,
			rows,
		});
		const selectEditor = host.querySelector('[data-sheet-editor="true"][data-cell-key="status"]') as HTMLElement | null;

		expect(selectEditor?.tagName).toBe('DIV');
		expect(selectEditor?.className).toContain('px_6');
		expect(selectEditor?.className).not.toContain('sheet_ui_editor');
		expect(selectEditor?.querySelector('.bg_emerald_fd')?.className).toContain('r_xs');
		expect(selectEditor?.textContent).toBe('Open');
		expect(selectEditor?.querySelector('.icon-chevron-down')).not.toBeNull();
		expect(selectEditor?.querySelector('input, select, datalist')).toBeNull();
		selectEditor?.click();

		await act(async () => {
			currentRoot?.render(
				<SheetUI
					canvasHeight={160}
					canvasWidth={SHEET_ROW_NUMBER_WIDTH + 960}
					cellCount={6}
					columnCount={6}
					columns={columns}
					editState={{
						cellKey: 'statusText',
						draftValue: 'Custom',
						rowId: 'row-1',
					}}
					headerWidth={SHEET_ROW_NUMBER_WIDTH + 960}
					rows={rows}
					scrollLeft={0}
				/>,
			);
		});

		const textOptionEditor = host.querySelector('[data-sheet-editor="true"][data-cell-key="statusText"]') as HTMLElement | null;

		expect(textOptionEditor?.tagName).toBe('DIV');
		expect(textOptionEditor?.className).not.toContain('sheet_ui_editor');
		expect(textOptionEditor?.querySelector('.bg_primary_fd')?.className).toContain('r_xs');
		expect(textOptionEditor?.textContent).toBe('Custom');
		expect(textOptionEditor?.querySelector('.icon-chevron-down')).not.toBeNull();
		expect(textOptionEditor?.querySelector('input, select, datalist')).toBeNull();
		textOptionEditor?.click();

		await act(async () => {
			currentRoot?.render(
				<SheetUI
					canvasHeight={160}
					canvasWidth={SHEET_ROW_NUMBER_WIDTH + 960}
					cellCount={6}
					columnCount={6}
					columns={columns}
					editState={{
						cellKey: 'tags',
						draftValue: 'Market, Prep',
						rowId: 'row-1',
					}}
					headerWidth={SHEET_ROW_NUMBER_WIDTH + 960}
					rows={rows}
					scrollLeft={0}
				/>,
			);
		});

		const multiSelectEditor = host.querySelector('[data-sheet-editor="true"][data-cell-key="tags"]') as HTMLElement | null;

		expect(multiSelectEditor?.tagName).toBe('DIV');
		expect(multiSelectEditor?.textContent).toBe('Market, Prep');
		expect(multiSelectEditor?.querySelector('.icon-chevron-down')).not.toBeNull();
		expect(multiSelectEditor?.querySelector('input, select, datalist')).toBeNull();

		await act(async () => {
			currentRoot?.render(
				<SheetUI
					canvasHeight={160}
					canvasWidth={SHEET_ROW_NUMBER_WIDTH + 960}
					cellCount={6}
					columnCount={6}
					columns={columns}
					editState={{
						cellKey: 'enabled',
						draftValue: 'true',
						rowId: 'row-1',
					}}
					headerWidth={SHEET_ROW_NUMBER_WIDTH + 960}
					rows={rows}
					scrollLeft={0}
				/>,
			);
		});

		const booleanEditor = host.querySelector('[data-sheet-editor="true"][data-cell-key="enabled"]') as HTMLElement | null;

		expect(booleanEditor?.tagName).toBe('DIV');
		expect(booleanEditor?.textContent).toBe('true');
		expect(booleanEditor?.querySelector('.icon-chevron-down')).not.toBeNull();
		expect(booleanEditor?.querySelector('input, select, datalist')).toBeNull();

		await act(async () => {
			currentRoot?.render(
				<SheetUI
					canvasHeight={160}
					canvasWidth={SHEET_ROW_NUMBER_WIDTH + 960}
					cellCount={6}
					columnCount={6}
					columns={columns}
					editState={{
						cellKey: 'dueDate',
						draftValue: '2026-02-01',
						rowId: 'row-1',
					}}
					headerWidth={SHEET_ROW_NUMBER_WIDTH + 960}
					rows={rows}
					scrollLeft={0}
				/>,
			);
		});

		const dateEditor = host.querySelector('[data-sheet-editor="true"][data-cell-key="dueDate"]') as HTMLElement | null;

		expect(dateEditor?.tagName).toBe('DIV');
		expect(dateEditor?.textContent).toBe('Feb 1, 2026');
		expect(dateEditor?.querySelector('.icon-chevron-down')).not.toBeNull();
		expect(dateEditor?.querySelector('input, select, datalist')).toBeNull();

		await act(async () => {
			currentRoot?.render(
				<SheetUI
					canvasHeight={160}
					canvasWidth={SHEET_ROW_NUMBER_WIDTH + 960}
					cellCount={6}
					columnCount={6}
					columns={columns}
					editState={{
						cellKey: 'startsAt',
						draftValue: '2026-05-21T09:30',
						rowId: 'row-1',
					}}
					headerWidth={SHEET_ROW_NUMBER_WIDTH + 960}
					rows={rows}
					scrollLeft={0}
				/>,
			);
		});

		const dateTimeEditor = host.querySelector('[data-sheet-editor="true"][data-cell-key="startsAt"]') as HTMLElement | null;

		expect(dateTimeEditor?.tagName).toBe('DIV');
		expect(dateTimeEditor?.textContent).toBe('2026-05-21T09:30');
		expect(dateTimeEditor?.querySelector('.icon-chevron-down')).not.toBeNull();
		expect(dateTimeEditor?.querySelector('input, select, datalist')).toBeNull();
	});

	it('renders empty select cells as blank text with muted color and no chevron', async () => {
		const columns = getSheetColumnMetrics([
			createColumn('status', 'SELECT'),
		]).metrics;
		const rows = [
			createRowSlot('row-1', 0, {
				status: createCell('status', ''),
			}),
		];
		const host = await renderSheetUI({
			columns,
			editState: null,
			rows,
			selectedCellState: {
				cellKey: 'status',
				rowId: 'row-1',
			},
		});
		const cell = host.querySelector('[data-sheet-cell="true"][data-cell-key="status"]') as HTMLElement | null;

		expect(cell?.textContent).toBe('');
		expect(cell?.querySelector('.cl_darker_2')?.textContent).toBe('');
		expect(cell?.querySelector('.icon-chevron-down')).toBeNull();

		await act(async () => {
			currentRoot?.render(
				<SheetUI
					canvasHeight={160}
					canvasWidth={SHEET_ROW_NUMBER_WIDTH + 160}
					cellCount={1}
					columnCount={1}
					columns={columns}
					editState={{
						cellKey: 'status',
						draftValue: '',
						rowId: 'row-1',
					}}
					headerWidth={SHEET_ROW_NUMBER_WIDTH + 160}
					rows={rows}
					scrollLeft={0}
					selectedCellState={null}
				/>,
			);
		});

		const editor = host.querySelector('[data-sheet-editor="true"][data-cell-key="status"]') as HTMLElement | null;

		expect(editor?.textContent).toBe('');
		expect(editor?.querySelector('.cl_darker_2')?.textContent).toBe('');
		expect(editor?.querySelector('.icon-chevron-down')).toBeNull();
	});

	it('renders empty date cells as blank text with light color and no chevron', async () => {
		const columns = getSheetColumnMetrics([
			createColumn('dueDate', 'DATE'),
			createColumn('startsAt', 'DATETIME'),
		]).metrics;
		const rows = [
			createRowSlot('row-1', 0, {
				dueDate: createCell('dueDate', ''),
				startsAt: createCell('startsAt', ''),
			}),
		];
		const host = await renderSheetUI({
			canvasWidth: SHEET_ROW_NUMBER_WIDTH + 320,
			cellCount: 2,
			columnCount: 2,
			columns,
			headerWidth: SHEET_ROW_NUMBER_WIDTH + 320,
			rows,
			selectedCellState: {
				cellKey: 'dueDate',
				rowId: 'row-1',
			},
		});
		const dateCell = host.querySelector('[data-sheet-cell="true"][data-cell-key="dueDate"]') as HTMLElement | null;
		const dateTimeCell = host.querySelector('[data-sheet-cell="true"][data-cell-key="startsAt"]') as HTMLElement | null;

		expect(dateCell?.textContent).toBe('');
		expect(dateCell?.querySelector('.cl_lt')?.textContent).toBe('');
		expect(dateCell?.querySelector('.icon-chevron-down')).toBeNull();
		expect(dateCell?.className).not.toContain('cl_darker_2');
		expect(dateTimeCell?.textContent).toBe('');
		expect(dateTimeCell?.querySelector('.cl_lt')?.textContent).toBe('');
		expect(dateTimeCell?.className).not.toContain('cl_darker_2');

		await act(async () => {
			currentRoot?.render(
				<SheetUI
					canvasHeight={160}
					canvasWidth={SHEET_ROW_NUMBER_WIDTH + 320}
					cellCount={2}
					columnCount={2}
					columns={columns}
					editState={{
						cellKey: 'startsAt',
						draftValue: '',
						rowId: 'row-1',
					}}
					headerWidth={SHEET_ROW_NUMBER_WIDTH + 320}
					rows={rows}
					scrollLeft={0}
					selectedCellState={null}
				/>,
			);
		});

		const editor = host.querySelector('[data-sheet-editor="true"][data-cell-key="startsAt"]') as HTMLElement | null;

		expect(editor?.textContent).toBe('');
		expect(editor?.querySelector('.cl_lt')?.textContent).toBe('');
		expect(editor?.querySelector('.icon-chevron-down')).toBeNull();
	});

	it('renders a cell icon to the left of the display value', async () => {
		const host = await renderSheetUI({
			rows: [
				createRowSlot('row-1', 0, {
					name: createCell('name', 'Alpha', {
						iconName: 'circle-check',
					}),
				}),
			],
		});
		const firstCell = host.querySelector('[data-sheet-cell="true"]') as HTMLElement | null;
		const icon = firstCell?.querySelector('.icon-circle-check');

		expect(icon).not.toBeNull();
		expect(firstCell?.textContent).toBe('Alpha');
		expect(icon?.parentElement?.className).toContain('mr_5');
	});

	it('marks read-only data cells with the not_editable class', async () => {
		const host = await renderSheetUI({
			rows: [
				createRowSlot('row-1', 0, {
					name: createCell('name', 'Alpha', {
						canEdit: false,
					}),
				}),
			],
		});
		const cell = host.querySelector('[data-sheet-cell="true"][data-cell-key="name"]') as HTMLElement | null;

		expect(cell?.className).toContain('not_editable');
		expect(cell?.dataset.sheetCellEditable).toBeUndefined();
	});

	it('renders header children above the spreadsheet header row', async () => {
		const host = await renderSheetUI({
			headerContent: <div data-testid='toolbar'>Toolbar</div>,
		});
		const headerContent = host.querySelector('[data-sheet-header-content="true"]');
		const headerRow = host.querySelector('[data-sheet-header-row="true"]');
		const scrollViewport = host.querySelector('[data-sheet-scroll-viewport="true"]');

		expect(headerContent?.textContent).toBe('Toolbar');
		expect(headerContent?.className).toContain('bd_b_1');
		expect(headerContent?.nextElementSibling).toBe(scrollViewport);
		expect(scrollViewport?.contains(headerRow)).toBe(true);
	});

	it('applies non-editing selection guards and primary editable hover backgrounds to header cells', async () => {
		const columns = getSheetColumnMetrics([
			createColumn('name'),
			createColumn('status', 'SELECT', {
				options: [
					{ color: 'emerald', label: 'Open', value: 'open' },
					{ color: 'red', label: 'Closed', value: 'closed' },
				],
			}),
			createColumn('locked', 'TEXT', {
				humansCannotEdit: true,
			}),
		]).metrics;
		const host = await renderSheetUI({
			canvasWidth: SHEET_ROW_NUMBER_WIDTH + 480,
			columnCount: 3,
			columns,
			headerCellsEditable: true,
			headerWidth: SHEET_ROW_NUMBER_WIDTH + 480,
			rows: [
				createRowSlot('row-1', 0, {
					locked: createCell('locked', 'Locked'),
					name: createCell('name', 'Alpha'),
					status: createCell('status', 'Open'),
				}),
			],
		});
		const nameHeader = host.querySelector('[data-sheet-header-cell="true"][data-cell-key="name"]') as HTMLElement | null;
		const statusHeader = host.querySelector('[data-sheet-header-cell="true"][data-cell-key="status"]') as HTMLElement | null;
		const lockedHeader = host.querySelector('[data-sheet-header-cell="true"][data-cell-key="locked"]') as HTMLElement | null;

		expect(nameHeader?.className).toContain('unsel');
		expect(nameHeader?.className).toContain('bg_primary_fd_hv_solid');
		expect(nameHeader?.dataset.sheetHeaderEditable).toBe('true');
		expect(statusHeader?.className).toContain('unsel');
		expect(statusHeader?.className).toContain('bg_primary_fd_hv_solid');
		expect(statusHeader?.className).not.toContain('bg_emerald_fd_hv');
		expect(statusHeader?.dataset.sheetHeaderEditable).toBe('true');
		expect(lockedHeader?.className).toContain('unsel');
		expect(lockedHeader?.className).toContain('bg_primary_fd_hv_solid');
		expect(lockedHeader?.className).not.toContain('bg_emerald_fd_hv');
		expect(lockedHeader?.dataset.sheetHeaderEditable).toBe('true');
	});

	it('keeps header text selectable while the header editor is active', async () => {
		const host = await renderSheetUI({
			columnReorderEnabled: true,
			headerCellsEditable: true,
			headerEditState: {
				cellKey: 'name',
				draftValue: 'Name',
			},
		});
		const nameHeader = host.querySelector('[data-sheet-header-cell="true"][data-cell-key="name"]') as HTMLElement | null;
		const input = host.querySelector('[data-sheet-header-editor="true"]') as HTMLInputElement | null;

		expect(input).not.toBeNull();
		expect(nameHeader?.className).toContain('active');
		expect(nameHeader?.className).not.toContain('unsel');
		expect(nameHeader?.dataset.sheetHeaderReorderable).toBeUndefined();
	});

	it('renders header reorder handles and lightweight drag guides from props', async () => {
		const columns = getSheetColumnMetrics([
			createColumn('name'),
			createColumn('status'),
		]).metrics;
		const host = await renderSheetUI({
			canvasWidth: SHEET_ROW_NUMBER_WIDTH + 320,
			columnCount: 2,
			columnReorderDrag: {
				columnKey: 'name',
				label: 'NAME',
				left: 74,
				width: 160,
			},
			columnReorderDisplacements: {
				status: -160,
			},
			columnReorderEnabled: true,
			columnReorderGuide: {
				columnKey: 'name',
				height: SHEET_HEADER_HEIGHT,
				left: SHEET_ROW_NUMBER_WIDTH + 80,
			},
			columns,
			headerWidth: SHEET_ROW_NUMBER_WIDTH + 320,
			rows: [
				createRowSlot('row-1', 0, {
					name: createCell('name', 'Alpha'),
					status: createCell('status', 'Open'),
				}),
			],
			sheetSurfaceHeight: 276,
			sheetSurfaceTop: 44,
		});
		const nameHeader = host.querySelector('[data-sheet-header-cell="true"][data-cell-key="name"]') as HTMLElement | null;
		const statusHeader = host.querySelector('[data-sheet-header-cell="true"][data-cell-key="status"]') as HTMLElement | null;
		const guide = host.querySelector('[data-sheet-column-reorder-guide="name"]') as HTMLElement | null;
		const dragPreview = host.querySelector('[data-sheet-column-reorder-drag="name"]') as HTMLElement | null;
		const resizeHandle = host.querySelector('[data-sheet-column-resize-handle="status"]') as HTMLElement | null;

		expect(nameHeader?.dataset.sheetHeaderReorderable).toBe('true');
		expect(nameHeader?.className).toContain('bg');
		expect(nameHeader?.className).toContain('cs_default_to_grabing');
		expect(nameHeader?.style.opacity).toBe('0.35');
		expect(statusHeader?.style.transform).toBe('translateX(-160px)');
		expect(statusHeader?.style.transition).toBe('transform 120ms ease');
		expect(host.querySelector('[data-sheet-reorder-guide-layer="true"]')).toBeNull();
		expect(guide?.className).toContain('bg_active');
		expect(guide?.className).not.toContain('bg_main');
		expect(guide?.style.height).toBe(`${SHEET_HEADER_HEIGHT}px`);
		expect(guide?.style.left).toBe(`${SHEET_ROW_NUMBER_WIDTH + 80}px`);
		expect(guide?.style.width).toBe('2px');
		expect(guide?.style.zIndex).toBe('35');
		expect(dragPreview?.textContent).toBe('NAME');
		expect(dragPreview?.style.left).toBe('74px');
		expect(dragPreview?.style.width).toBe('160px');
		expect(dragPreview?.style.opacity).toBe('');
		expect(dragPreview?.style.zIndex).toBe('36');
		expect(resizeHandle?.className).not.toContain('hv_area');
		expect(resizeHandle?.style.pointerEvents).toBe('none');
		expect(resizeHandle?.style.visibility).toBe('hidden');
	});

	it('keeps underlying header transitions while a drag moves out of a drop position', async () => {
		const columns = getSheetColumnMetrics([
			createColumn('name'),
			createColumn('status'),
		]).metrics;
		const rows = [
			createRowSlot('row-1', 0, {
				name: createCell('name', 'Alpha'),
				status: createCell('status', 'Open'),
			}),
		];
		const host = await renderSheetUI({
			canvasWidth: SHEET_ROW_NUMBER_WIDTH + 320,
			columnCount: 2,
			columnReorderDrag: {
				columnKey: 'name',
				label: 'NAME',
				left: 74,
				width: 160,
			},
			columnReorderDisplacements: {
				status: -160,
			},
			columnReorderEnabled: true,
			columns,
			headerWidth: SHEET_ROW_NUMBER_WIDTH + 320,
			rows,
		});

		await act(async () => {
			currentRoot?.render(
				<SheetUI
					canvasHeight={160}
					canvasWidth={SHEET_ROW_NUMBER_WIDTH + 320}
					cellCount={rows.length * columns.length}
					columnCount={2}
					columnReorderDrag={{
						columnKey: 'name',
						label: 'NAME',
						left: 66,
						width: 160,
					}}
					columnReorderEnabled
					columns={columns}
					headerWidth={SHEET_ROW_NUMBER_WIDTH + 320}
					rows={rows}
					scrollLeft={0}
				/>,
			);
		});

		const statusHeader = host.querySelector('[data-sheet-header-cell="true"][data-cell-key="status"]') as HTMLElement | null;

		expect(statusHeader?.style.transform).toBe('');
		expect(statusHeader?.style.transition).toBe('transform 120ms ease');
	});

	it('keeps the right border and resize handle on the actual right-most column cells', async () => {
		const columns = getSheetColumnMetrics([
			createColumn('name'),
			createColumn('status'),
		]).metrics;
		const host = await renderSheetUI({
			canvasWidth: SHEET_ROW_NUMBER_WIDTH + 320,
			columnCount: 2,
			columns,
			headerWidth: SHEET_ROW_NUMBER_WIDTH + 320,
			rows: [
				createRowSlot('row-1', 0, {
					name: createCell('name', 'Alpha'),
					status: createCell('status', 'Open'),
				}),
			],
		});
		const headerCells = host.querySelectorAll('[data-sheet-header-cell="true"]') as NodeListOf<HTMLElement>;
		const gridCells = host.querySelectorAll('.sheet_ui_cell') as NodeListOf<HTMLElement>;
		const resizeHandle = host.querySelector('[data-sheet-column-resize-handle="status"]') as HTMLElement | null;

		expect(headerCells[0]?.style.borderRightStyle).toBe('');
		expect(headerCells[1]?.style.borderRightStyle).toBe('');
		expect(gridCells[0]?.style.borderRightStyle).toBe('');
		expect(gridCells[1]?.style.borderRightStyle).toBe('');
		expect(resizeHandle).not.toBeNull();
		expect(resizeHandle?.style.left).toBe(`${SHEET_ROW_NUMBER_WIDTH + 320 - 10}px`);
	});

	it('renders the full-height column resize guide from container state', async () => {
		const host = await renderSheetUI({
			resizeGuide: {
				columnKey: 'name',
				height: 276,
				left: SHEET_ROW_NUMBER_WIDTH + 160,
			},
			sheetSurfaceHeight: 276,
			sheetSurfaceTop: 44,
		});
		const resizeLayer = host.querySelector('[data-sheet-resize-guide-layer="true"]') as HTMLElement | null;
		const resizeGuide = host.querySelector('[data-sheet-column-resize-guide="name"]') as HTMLElement | null;
		const resizeHandleLayer = host.querySelector('[data-sheet-column-resize-handle-layer="true"]') as HTMLElement | null;
		const resizeHandle = host.querySelector('[data-sheet-column-resize-handle="name"]') as HTMLElement | null;
		const headerCell = host.querySelector('[data-sheet-header-cell="true"]') as HTMLElement | null;

		expect(resizeLayer?.style.height).toBe('276px');
		expect(resizeLayer?.style.overflow).toBe('hidden');
		expect(resizeLayer?.style.top).toBe('44px');
		expect(Number(resizeLayer?.style.zIndex)).toBeGreaterThan(Number(headerCell?.style.zIndex));
		expect(resizeHandleLayer?.style.pointerEvents).toBe('none');
		expect(resizeHandle?.parentElement).toBe(resizeHandleLayer);
		expect(resizeHandle?.parentElement).not.toBe(headerCell);
		expect(resizeHandle?.className).toContain('hv_area');
		expect(resizeHandle?.style.left).toBe(`${SHEET_ROW_NUMBER_WIDTH + 160 - 10}px`);
		expect(resizeHandle?.style.pointerEvents).toBe('auto');
		expect(resizeHandle?.style.width).toBe('18px');
		expect(resizeHandle?.style.zIndex).toBe('34');
		expect(resizeGuide?.className).toContain('bg_primary');
		expect(resizeGuide?.className).not.toContain('bg_main');
		expect(resizeGuide?.style.height).toBe('276px');
		expect(resizeGuide?.style.left).toBe(`${SHEET_ROW_NUMBER_WIDTH + 158.5}px`);
		expect(resizeGuide?.style.width).toBe('3px');
		expect(resizeGuide?.style.zIndex).toBe('44');
	});
});

describe('SheetUI static boundary', () => {
	it('stays app agnostic and listener free', () => {
		const source = readFileSync('ui/SheetUI.tsx', 'utf8');

		expect(source).not.toContain('@jsb188/mday');
		expect(source).not.toMatch(/\buse(Effect|Memo|Ref|State|Callback|Reducer|LayoutEffect)\b/);
		expect(source).not.toMatch(/\son[A-Z][A-Za-z]*=/);
	});
});
