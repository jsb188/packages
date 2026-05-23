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
		const rowNumber = host.querySelector('.sheet_ui_row_number') as HTMLElement | null;
		const rowNumberSlot = host.querySelector('[data-sheet-row-number-slot="true"]') as HTMLElement | null;
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
		expect(stickyColumnSpacer?.className).toContain('w_4');
		expect(stickyColumnSpacer?.style.left).toBe(`${SHEET_ROW_NUMBER_WIDTH}px`);
		expect(stickyColumnSpacer?.style.position).toBe('sticky');
		expect(stickyColumnSpacer?.style.top).toBe('');
		expect(stickyColumnSpacerSlots[0]?.style.top).toBe('36px');
		expect(stickyColumnSpacerSlots[1]?.style.top).toBe('68px');
		expect(stickyColumnSpacerSlots[2]?.style.top).toBe('100px');
		expect(stickyColumnSpacerSlots[3]?.style.top).toBe('132px');
		expect(host.querySelector('[data-sheet-sticky-header="true"]')?.className).toContain('sticky');
		expect(cornerCell?.className).toContain('sticky');
		expect(cornerCell?.className).toContain('bg');
		expect(cornerCell?.style.left).toBe('0px');
		expect(cornerCell?.style.position).toBe('sticky');
		expect(rowNumber?.className).toContain('sticky');
		expect(rowNumber?.className).toContain('bg');
		expect(rowNumber?.style.left).toBe('0px');
		expect(rowNumber?.style.position).toBe('sticky');
		expect(rowNumberSlot?.style.top).toBe('36px');
		expect(firstCell?.textContent).toBe('Alpha');
		expect(fillerCell?.textContent).toBe('');
		expect(fillerCell?.className).toContain('noclick');
		expect(host.querySelector('.sheet_ui_canvas')?.getAttribute('data-cell-count')).toBe('4');
		expect(host.querySelectorAll('.sheet_ui_row_number')).toHaveLength(4);
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
		const gridCells = host.querySelectorAll('.sheet_ui_cell') as NodeListOf<HTMLElement>;

		expect(headerCells[0]?.className).toContain('bg');
		expect(headerCells[1]?.className).toContain('bg');
		expect(gridCells[0]?.className).toContain('bg');
		expect(gridCells[1]?.className).toContain('bg');
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
		expect(lockedHeader?.className).not.toContain('bg_primary_fd_hv_solid');
		expect(lockedHeader?.className).not.toContain('bg_emerald_fd_hv');
		expect(lockedHeader?.dataset.sheetHeaderEditable).toBeUndefined();
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
		expect(nameHeader?.style.opacity).toBe('0.35');
		expect(nameHeader?.style.cursor).toBe('grab');
		expect(statusHeader?.style.transform).toBe('translateX(-160px)');
		expect(statusHeader?.style.transition).toBe('transform 120ms ease');
		expect(host.querySelector('[data-sheet-reorder-guide-layer="true"]')).toBeNull();
		expect(guide?.className).toContain('bg_active');
		expect(guide?.className).not.toContain('bg_main');
		expect(guide?.style.height).toBe(`${SHEET_HEADER_HEIGHT}px`);
		expect(guide?.style.left).toBe(`${SHEET_ROW_NUMBER_WIDTH + 80}px`);
		expect(guide?.style.width).toBe('2px');
		expect(guide?.style.zIndex).toBe('125');
		expect(dragPreview?.textContent).toBe('NAME');
		expect(dragPreview?.style.left).toBe('74px');
		expect(dragPreview?.style.width).toBe('160px');
		expect(dragPreview?.style.opacity).toBe('');
		expect(dragPreview?.style.zIndex).toBe('130');
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
		expect(resizeLayer?.style.zIndex).toBe('110');
		expect(resizeHandleLayer?.style.pointerEvents).toBe('none');
		expect(resizeHandle?.parentElement).toBe(resizeHandleLayer);
		expect(resizeHandle?.parentElement).not.toBe(headerCell);
		expect(resizeHandle?.className).toContain('hv_area');
		expect(resizeHandle?.style.left).toBe(`${SHEET_ROW_NUMBER_WIDTH + 160 - 10}px`);
		expect(resizeHandle?.style.pointerEvents).toBe('auto');
		expect(resizeHandle?.style.width).toBe('18px');
		expect(resizeHandle?.style.zIndex).toBe('110');
		expect(resizeGuide?.className).toContain('bg_primary');
		expect(resizeGuide?.className).not.toContain('bg_main');
		expect(resizeGuide?.style.height).toBe('276px');
		expect(resizeGuide?.style.left).toBe(`${SHEET_ROW_NUMBER_WIDTH + 158.5}px`);
		expect(resizeGuide?.style.width).toBe('3px');
		expect(resizeGuide?.style.zIndex).toBe('110');
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
