// @vitest-environment jsdom

import type { SheetCellGQL, SheetDesignCellGQL, SheetGQL, SheetRowGQL } from '@jsb188/mday/types/sheet.d.ts';
import { configI18n } from '@jsb188/app';
import i18n from '@jsb188/app/i18n/index.ts';
import { SHEET_HUMAN_LABEL_MAX_LENGTH } from '@jsb188/mday/constants/sheet.ts';
import {
	SHEET_COLUMN_WIDTH,
	SHEET_HEADER_HEIGHT,
	SHEET_ROW_HEIGHT,
	SHEET_ROW_NUMBER_WIDTH,
	SHEET_STICKY_SPACER_SIZE,
} from '@jsb188/react-web/ui/SheetUI';
import type { ComponentProps } from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Sheet, parseSheetEditorValue } from '../src/modules/Sheet';

configI18n();

const hookState = vi.hoisted(() => ({
	editInboundContact: vi.fn(),
	editSheetCell: vi.fn(),
	editSheetDesign: vi.fn(),
	fetchMoreRows: vi.fn(),
	getSheetRows: null as (() => any[]) | null,
	childOrganizations: [] as any[],
	inboundContact: null as any,
	inboundContactInitialLoading: false,
	inboundContactSaving: false,
	lastChildOrganizationsArgs: null as any[] | null,
	lastInboundContactArgs: null as any[] | null,
	lastSheetRowsArgs: null as any[] | null,
	keyDown: {
		alert: false,
		metaKey: false,
		modal: false,
		pressed: null as string | null,
	},
	openModalPopUp: vi.fn(),
	openModalScreen: vi.fn(),
	resetOnlyTime: '' as string | undefined,
	sheetRows: [] as any[],
	sheetRowsVariables: null as any,
}));

vi.mock('@jsb188/graphql/hooks/use-sheet-qry', () => ({
	useReactiveSheetRows: (rows: any[]) => rows,
	useSheetRows: (...args: any[]) => {
		hookState.lastSheetRowsArgs = args;

		return {
			fetchMore: hookState.fetchMoreRows,
			resetOnlyTime: hookState.resetOnlyTime,
			sheetRows: hookState.getSheetRows ? hookState.getSheetRows() : hookState.sheetRows,
			variables: hookState.sheetRowsVariables || {
				sheetId: args[0],
				organizationId: args[1],
				cursor: args[2],
				limit: args[3],
				filter: args[4],
			},
		};
	},
}));

vi.mock('@jsb188/graphql/hooks/use-sheet-mtn', () => ({
	useEditSheetCell: () => ({
		editSheetCell: hookState.editSheetCell,
	}),
	useEditSheetDesign: () => ({
		editSheetDesign: hookState.editSheetDesign,
	}),
}));

vi.mock('@jsb188/graphql/hooks/use-inboundContact-mtn', () => ({
	useEditInboundContact: () => ({
		editInboundContact: hookState.editInboundContact,
		saving: hookState.inboundContactSaving,
	}),
}));

vi.mock('@jsb188/graphql/hooks/use-inboundContact-qry', () => ({
	useInboundContact: (...args: any[]) => {
		hookState.lastInboundContactArgs = args;

		return {
			inboundContact: hookState.inboundContact,
			initialLoading: hookState.inboundContactInitialLoading,
		};
	},
}));

vi.mock('@jsb188/graphql/hooks/use-organization-qry', () => ({
	useChildOrganizations: (...args: any[]) => {
		hookState.lastChildOrganizationsArgs = args;

		return {
			childOrganizations: hookState.childOrganizations,
		};
	},
}));

vi.mock('@jsb188/react/states', () => ({
	useKeyDown: () => [hookState.keyDown, (data: Partial<typeof hookState.keyDown>) => {
		hookState.keyDown = {
			...hookState.keyDown,
			...data,
		};
	}],
	useOpenModalPopUp: () => hookState.openModalPopUp,
	useOpenModalScreen: () => hookState.openModalScreen,
	usePopOver: () => ({
		closePopOver: vi.fn(),
		openPopOver: vi.fn(),
		popOver: null,
		setPopOverState: vi.fn(),
		updatePopOver: vi.fn(),
	}),
}));

let currentRoot: Root | null = null;

/*
 * Build one design cell for Sheet container tests.
 */

function createDesignCell(key: string, overrides: Partial<SheetDesignCellGQL> = {}): SheetDesignCellGQL {
	return {
		key,
		label: key.toUpperCase(),
		fieldType: 'TEXT',
		humanFieldType: 'TEXT',
		options: [],
		...overrides,
	};
}

/*
 * Build one sheet cell for Sheet container tests.
 */

function createCell(rowId: string, cellKey: string, value: string, overrides: Partial<SheetCellGQL> = {}): SheetCellGQL {
	return {
		id: `${rowId}:${cellKey}`,
		sheetId: 'sheet-1',
		sheetRowId: rowId,
		cellKey,
		value,
		textValue: value,
		createdAt: '2026-05-19T00:00:00.000Z',
		updatedAt: '2026-05-19T00:00:00.000Z',
		...overrides,
	};
}

/*
 * Build one sheet row for Sheet container tests.
 */

function createRow(position: number, values: Record<string, string> = { name: `Row ${position}` }): SheetRowGQL {
	const rowId = `row-${position}`;

	return {
		id: rowId,
		cursor: `cursor-${position}`,
		organizationId: 'org-1',
		sheetId: 'sheet-1',
		position,
		metadata: '{}',
		cells: Object.entries(values).map(([cellKey, value]) => createCell(rowId, cellKey, value)),
	};
}

/*
 * Build one sheet object for Sheet container tests.
 */

function createSheet(overrides: Partial<SheetGQL> = {}): SheetGQL {
	const cells = [
		createDesignCell('name'),
		createDesignCell('status', { openLink: true }),
	];

	return {
		id: 'sheet-1',
		organizationId: 'org-1',
		name: 'Sheet',
		title: 'Sheet',
		description: null,
		design: {
			id: 'sheet-1',
			cells,
			cellsOrder: cells.map((cell) => cell.key),
			humansCannotEdit: false,
			stickyLeft: 0,
			stickyTop: 1,
		},
		active: true,
		createdAt: '2026-05-19T00:00:00.000Z',
		updatedAt: '2026-05-19T00:00:00.000Z',
		...overrides,
	};
}

/*
 * Flush React effects and pending promises in tests.
 */

async function flushRender() {
	await act(async () => {
		await Promise.resolve();
	});
}

/*
 * Find one rendered calendar day button by visible day number.
 */

function getCalendarDayButton(host: HTMLElement, day: number) {
	return Array.from(host.querySelectorAll('.cal_day')).find((button) => {
		return button.textContent?.trim() === String(day);
	}) as HTMLButtonElement | undefined;
}

/*
 * Set an input value through the native setter so React sees the change event.
 */

function setNativeInputValue(element: HTMLInputElement | HTMLTextAreaElement, value: string) {
	const valueSetter = Object.getOwnPropertyDescriptor(element.constructor.prototype, 'value')?.set;
	valueSetter?.call(element, value);
	element.dispatchEvent(new Event('input', { bubbles: true }));
	element.dispatchEvent(new Event('change', { bubbles: true }));
}

/*
 * Render the Sheet container into a test root.
 */

async function renderSheet(props: Partial<ComponentProps<typeof Sheet>> = {}) {
	const host = document.getElementById('test-root');
	if (!host) {
		throw new Error('Missing test root element');
	}

	currentRoot = createRoot(host);

	await act(async () => {
		currentRoot?.render(
			<Sheet
				allowEdit
				sheet={createSheet()}
				{...props}
			/>,
		);
	});

	await flushRender();
	await flushRender();

	return host;
}

/*
 * Re-render the current Sheet test root with new props.
 */

async function rerenderSheet(props: Partial<ComponentProps<typeof Sheet>> = {}) {
	await act(async () => {
		currentRoot?.render(
			<Sheet
				allowEdit
				sheet={createSheet()}
				{...props}
			/>,
		);
	});

	await flushRender();
	await flushRender();
}

/*
 * Dispatch one mocked app-level keydown value through the Sheet container.
 */

async function pressSheetKey(key: string, props: Partial<ComponentProps<typeof Sheet>> = {}) {
	globalThis.dispatchEvent(new KeyboardEvent('keydown', {
		bubbles: true,
		cancelable: true,
		key,
	}));

	await rerenderSheet(props);
}

beforeEach(() => {
	globalThis.IS_REACT_ACT_ENVIRONMENT = true;
	document.body.innerHTML = '<div id="test-root"></div>';
	hookState.editInboundContact.mockReset().mockResolvedValue({
		editInboundContact: {
			id: 'contact-1',
		},
	});
	hookState.editSheetCell.mockReset().mockResolvedValue({ data: {} });
	hookState.editSheetDesign.mockReset().mockResolvedValue({ data: {} });
	hookState.fetchMoreRows.mockReset().mockResolvedValue({ data: { sheetRows: [] } });
	hookState.childOrganizations = [];
	hookState.getSheetRows = null;
	hookState.inboundContact = null;
	hookState.inboundContactInitialLoading = false;
	hookState.inboundContactSaving = false;
	hookState.keyDown = {
		alert: false,
		metaKey: false,
		modal: false,
		pressed: null,
	};
	hookState.lastChildOrganizationsArgs = null;
	hookState.lastInboundContactArgs = null;
	hookState.lastSheetRowsArgs = null;
	hookState.openModalPopUp.mockReset();
	hookState.openModalScreen.mockReset();
	hookState.resetOnlyTime = '';
	hookState.sheetRows = [createRow(0, { name: 'Alpha', status: 'Open' })];
	hookState.sheetRowsVariables = null;
	Object.defineProperty(window, 'open', {
		configurable: true,
		value: vi.fn(),
		writable: true,
	});

	Object.defineProperty(HTMLElement.prototype, 'clientHeight', {
		configurable: true,
		get() {
			if (this.getAttribute?.('data-sheet-header-content') === 'true') {
				return 44;
			}

			return 160;
		},
	});

	Object.defineProperty(HTMLElement.prototype, 'clientWidth', {
		configurable: true,
		get() {
			return 360;
		},
	});

	vi.stubGlobal('ResizeObserver', class {
		callback: ResizeObserverCallback;

		/*
		 * Store the resize callback for immediate test observation.
		 */

		constructor(callback: ResizeObserverCallback) {
			this.callback = callback;
		}

		/*
		 * Notify the component as soon as it starts observing.
		 */

		observe() {
			this.callback([], this as unknown as ResizeObserver);
		}

		/*
		 * Match the browser ResizeObserver cleanup contract.
		 */

		disconnect() {}
	});

	vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
		callback(0);
		return 1;
	});

	vi.stubGlobal('cancelAnimationFrame', vi.fn());
});

afterEach(() => {
	if (currentRoot) {
		act(() => {
			currentRoot?.unmount();
		});
		currentRoot = null;
	}

	vi.restoreAllMocks();
	vi.unstubAllGlobals();
});

describe('Sheet container', () => {
	it('shows a refresh floating message when sheet rows receive a reset-only update', async () => {
		const setFloatingMessage = vi.fn();

		await renderSheet({ setFloatingMessage });
		expect(setFloatingMessage).not.toHaveBeenCalled();

		hookState.resetOnlyTime = 'reset:1';
		await rerenderSheet({ setFloatingMessage });

		expect(setFloatingMessage).toHaveBeenCalledWith({
			type: 'REFRESH',
		});
	});

	it('uses cell icon names before design fallback icon names', async () => {
		const sheet = createSheet();
		sheet.design = {
			...sheet.design,
			cells: sheet.design.cells.map((cell) => cell.key === 'name'
				? {
					...cell,
					iconName: 'circle',
				}
				: cell),
		};
		hookState.sheetRows = [{
			...createRow(0, {}),
			cells: [
				createCell('row-0', 'name', 'Alpha', {
					iconName: 'circle-check',
				}),
				createCell('row-0', 'status', 'Open'),
			],
		}];

		const host = await renderSheet({ sheet });
		const firstCell = host.querySelector('[data-cell-key="name"][data-sheet-cell="true"]') as HTMLElement | null;

		expect(firstCell?.querySelector('.icon-circle-check')).not.toBeNull();
		expect(firstCell?.querySelector('.icon-circle')).toBeNull();
	});

	it('uses design icon names when cells do not have icon names', async () => {
		const sheet = createSheet();
		sheet.design = {
			...sheet.design,
			cells: sheet.design.cells.map((cell) => cell.key === 'name'
				? {
					...cell,
					iconName: 'circle-check',
				}
				: cell),
		};

		const host = await renderSheet({ sheet });
		const firstCell = host.querySelector('[data-cell-key="name"][data-sheet-cell="true"]') as HTMLElement | null;

		expect(firstCell?.querySelector('.icon-circle-check')).not.toBeNull();
		expect(firstCell?.textContent).toContain('Alpha');
	});

	it('renders deleted reference cells as read-only markers', async () => {
		hookState.sheetRows = [{
			...createRow(0, {}),
			cells: [
				createCell('row-0', 'name', '', {
					value: null,
					textValue: null,
					reference: {
						sheetId: 'sheet-2',
						sheetRowId: null,
						cellKey: 'name',
					},
					referenceStatus: 'DELETED',
				}),
			],
		}];

		const host = await renderSheet();
		const firstCell = host.querySelector('[data-cell-key="name"][data-sheet-cell="true"]') as HTMLElement | null;

		expect(firstCell?.textContent).toContain('Deleted reference');
		expect(firstCell?.dataset.sheetCellEditable).toBeUndefined();
	});

	it('moves selected cells horizontally with arrow keys', async () => {
		const host = await renderSheet();
		const nameCell = host.querySelector('[data-row-id="row-0"][data-cell-key="name"][data-sheet-cell="true"]') as HTMLElement;
		const statusCell = host.querySelector('[data-row-id="row-0"][data-cell-key="status"][data-sheet-cell="true"]') as HTMLElement;

		await act(async () => {
			nameCell.dispatchEvent(new MouseEvent('click', { bubbles: true }));
		});
		await flushRender();
		await pressSheetKey('ArrowRight');

		expect(statusCell.className).toContain('single-clicked');

		await pressSheetKey('ArrowLeft');

		expect(nameCell.className).toContain('single-clicked');
	});

	it('selects the first sheet cell when arrow navigation starts without a selection', async () => {
		const host = await renderSheet();
		const nameCell = host.querySelector('[data-row-id="row-0"][data-cell-key="name"][data-sheet-cell="true"]') as HTMLElement;

		await pressSheetKey('ArrowRight');

		expect(nameCell.className).toContain('single-clicked');
	});

	it('does not reuse stale arrow key state after a cell is unselected', async () => {
		const host = await renderSheet();
		const nameCell = host.querySelector('[data-row-id="row-0"][data-cell-key="name"][data-sheet-cell="true"]') as HTMLElement;
		const statusCell = host.querySelector('[data-row-id="row-0"][data-cell-key="status"][data-sheet-cell="true"]') as HTMLElement;

		hookState.keyDown = {
			alert: false,
			metaKey: false,
			modal: false,
			pressed: 'ArrowRight',
		};
		await rerenderSheet();

		expect(nameCell.className).not.toContain('single-clicked');
		expect(statusCell.className).not.toContain('single-clicked');
	});

	it('prevents default browser scrolling for sheet arrow navigation keys', async () => {
		await renderSheet();
		const event = new KeyboardEvent('keydown', {
			bubbles: true,
			cancelable: true,
			key: 'ArrowDown',
		});

		globalThis.dispatchEvent(event);

		expect(event.defaultPrevented).toBe(true);
	});

	it('prevents sheet scrolling from arrow keys while a cell editor is active', async () => {
		const host = await renderSheet();
		const nameCell = host.querySelector('[data-row-id="row-0"][data-cell-key="name"][data-sheet-cell="true"]') as HTMLElement;

		await act(async () => {
			nameCell.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
		});
		await flushRender();

		const event = new KeyboardEvent('keydown', {
			bubbles: true,
			cancelable: true,
			key: 'ArrowDown',
		});

		globalThis.dispatchEvent(event);

		expect(host.querySelector('[data-sheet-editor="true"]')).not.toBeNull();
		expect(event.defaultPrevented).toBe(true);
	});

	it('keeps arrow-key navigation clamped at the sheet edges', async () => {
		const host = await renderSheet();
		const nameCell = host.querySelector('[data-row-id="row-0"][data-cell-key="name"][data-sheet-cell="true"]') as HTMLElement;

		await act(async () => {
			nameCell.dispatchEvent(new MouseEvent('click', { bubbles: true }));
		});
		await flushRender();
		await pressSheetKey('ArrowLeft');

		expect(nameCell.className).toContain('single-clicked');
	});

	it('moves selected cells vertically with arrow keys', async () => {
		hookState.sheetRows = [
			createRow(0, { name: 'Alpha', status: 'Open' }),
			createRow(1, { name: 'Beta', status: 'Closed' }),
		];
		const host = await renderSheet();
		const firstStatusCell = host.querySelector('[data-row-id="row-0"][data-cell-key="status"][data-sheet-cell="true"]') as HTMLElement;
		const secondStatusCell = host.querySelector('[data-row-id="row-1"][data-cell-key="status"][data-sheet-cell="true"]') as HTMLElement;

		await act(async () => {
			firstStatusCell.dispatchEvent(new MouseEvent('click', { bubbles: true }));
		});
		await flushRender();
		await pressSheetKey('ArrowDown');

		expect(secondStatusCell.className).toContain('single-clicked');

		await pressSheetKey('ArrowUp');

		expect(firstStatusCell.className).toContain('single-clicked');
	});

	it('keeps the active cell selected when blank sheet space is clicked', async () => {
		const host = await renderSheet();
		const scrollViewport = host.querySelector('[data-sheet-scroll-viewport="true"]') as HTMLElement;
		const nameCell = host.querySelector('[data-row-id="row-0"][data-cell-key="name"][data-sheet-cell="true"]') as HTMLElement;

		await act(async () => {
			nameCell.dispatchEvent(new MouseEvent('click', { bubbles: true }));
		});
		await flushRender();
		await act(async () => {
			scrollViewport.dispatchEvent(new MouseEvent('click', { bubbles: true }));
		});
		await flushRender();

		expect(nameCell.className).toContain('single-clicked');
	});

	it('does not move arrow-key selection while a cell editor is active', async () => {
		const host = await renderSheet();
		const nameCell = host.querySelector('[data-row-id="row-0"][data-cell-key="name"][data-sheet-cell="true"]') as HTMLElement;
		const statusCell = host.querySelector('[data-row-id="row-0"][data-cell-key="status"][data-sheet-cell="true"]') as HTMLElement;

		await act(async () => {
			nameCell.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
		});
		await flushRender();
		await pressSheetKey('ArrowRight');

		expect(host.querySelector('[data-sheet-editor="true"]')).not.toBeNull();
		expect(statusCell.className).not.toContain('single-clicked');
	});

	it('opens the selected cell editor when Enter is pressed', async () => {
		const host = await renderSheet();
		const nameCell = host.querySelector('[data-row-id="row-0"][data-cell-key="name"][data-sheet-cell="true"]') as HTMLElement;

		await act(async () => {
			nameCell.dispatchEvent(new MouseEvent('click', { bubbles: true }));
		});
		await flushRender();
		await pressSheetKey('Enter');

		const editor = host.querySelector('[data-sheet-editor="true"][data-cell-key="name"]') as HTMLInputElement | null;

		expect(editor).not.toBeNull();
		expect(editor?.value).toBe('Alpha');
	});

	it('prevents default browser behavior for selected-cell Enter editing', async () => {
		const host = await renderSheet();
		const nameCell = host.querySelector('[data-row-id="row-0"][data-cell-key="name"][data-sheet-cell="true"]') as HTMLElement;

		await act(async () => {
			nameCell.dispatchEvent(new MouseEvent('click', { bubbles: true }));
		});
		await flushRender();

		const event = new KeyboardEvent('keydown', {
			bubbles: true,
			cancelable: true,
			key: 'Enter',
		});

		globalThis.dispatchEvent(event);

		expect(event.defaultPrevented).toBe(true);
	});

	it('scrolls selected arrow-key targets into view', async () => {
		hookState.sheetRows = Array.from({ length: 12 }, (_, index) => createRow(index, {
			name: `Row ${index}`,
			status: index % 2 ? 'Closed' : 'Open',
		}));
		const host = await renderSheet();
		const scrollNode = host.querySelector('[data-sheet-scroll-viewport="true"]') as HTMLDivElement;
		const firstNameCell = host.querySelector('[data-row-id="row-0"][data-cell-key="name"][data-sheet-cell="true"]') as HTMLElement;

		await act(async () => {
			firstNameCell.dispatchEvent(new MouseEvent('click', { bubbles: true }));
		});
		await flushRender();

		for (let index = 0; index < 8; index += 1) {
			await pressSheetKey('ArrowDown');
		}

		const selectedNameCell = host.querySelector('[data-row-id="row-8"][data-cell-key="name"][data-sheet-cell="true"]') as HTMLElement;

		expect(scrollNode.scrollTop).toBeGreaterThan(0);
		expect(selectedNameCell.className).toContain('single-clicked');
	});

	it('derives external-link icons for open-link cells with HTTP text values', async () => {
		const sheet = createSheet();
		hookState.sheetRows = [{
			...createRow(0, {}),
			cells: [
				createCell('row-0', 'name', 'Alpha'),
				createCell('row-0', 'status', 'https://example.com/orders/501'),
			],
		}];

		const host = await renderSheet({ sheet });
		const statusCell = host.querySelector('[data-cell-key="status"][data-sheet-cell="true"]') as HTMLElement | null;

		expect(statusCell?.querySelector('.icon-external-link')).not.toBeNull();
	});

	it('derives notes-paper-text icons for open-link ID cells with related IDs', async () => {
		const sheet = createSheet();
		sheet.design = {
			...sheet.design,
			cells: sheet.design.cells.map((cell) => cell.key === 'status'
				? {
					...cell,
					fieldType: 'ID',
					humanFieldType: 'ID',
				}
				: cell),
		};
		hookState.sheetRows = [{
			...createRow(0, {}),
			cells: [
				createCell('row-0', 'name', 'Alpha'),
				createCell('row-0', 'status', 'log-501', {
					relatedId: '501',
				}),
			],
		}];

		const host = await renderSheet({ sheet });
		const statusCell = host.querySelector('[data-cell-key="status"][data-sheet-cell="true"]') as HTMLElement | null;

		expect(statusCell?.querySelector('.icon-notes-paper-text')).not.toBeNull();
	});

	it('uses explicit icon names before derived open-link icon names', async () => {
		const sheet = createSheet();
		sheet.design = {
			...sheet.design,
			cells: sheet.design.cells.map((cell) => cell.key === 'status'
				? {
					...cell,
					iconName: 'circle',
				}
				: cell),
		};
		hookState.sheetRows = [{
			...createRow(0, {}),
			cells: [
				createCell('row-0', 'name', 'Alpha'),
				createCell('row-0', 'status', 'https://example.com/orders/501', {
					iconName: 'circle-check',
				}),
			],
		}];

		const host = await renderSheet({ sheet });
		const statusCell = host.querySelector('[data-cell-key="status"][data-sheet-cell="true"]') as HTMLElement | null;

		expect(statusCell?.querySelector('.icon-circle-check')).not.toBeNull();
		expect(statusCell?.querySelector('.icon-circle')).toBeNull();
		expect(statusCell?.querySelector('.icon-external-link')).toBeNull();
	});

	it('uses design icon names before derived open-link icon names', async () => {
		const sheet = createSheet();
		sheet.design = {
			...sheet.design,
			cells: sheet.design.cells.map((cell) => cell.key === 'status'
				? {
					...cell,
					iconName: 'circle',
				}
				: cell),
		};
		hookState.sheetRows = [{
			...createRow(0, {}),
			cells: [
				createCell('row-0', 'name', 'Alpha'),
				createCell('row-0', 'status', 'https://example.com/orders/501'),
			],
		}];

		const host = await renderSheet({ sheet });
		const statusCell = host.querySelector('[data-cell-key="status"][data-sheet-cell="true"]') as HTMLElement | null;

		expect(statusCell?.querySelector('.icon-circle')).not.toBeNull();
		expect(statusCell?.querySelector('.icon-external-link')).toBeNull();
	});

	it('preserves fetched sheet row order instead of sorting by row position', async () => {
		hookState.sheetRows = [
			createRow(2, { name: 'Third fetched', status: 'Open' }),
			createRow(0, { name: 'First fetched', status: 'Open' }),
			createRow(1, { name: 'Second fetched', status: 'Open' }),
		];

		const host = await renderSheet();
		const nameCells = Array.from(
			host.querySelectorAll('[data-sheet-cell="true"][data-cell-key="name"][data-row-id]'),
		);

		expect(nameCells.map((cell) => cell.textContent)).toEqual([
			'Third fetched',
			'First fetched',
			'Second fetched',
		]);

		hookState.sheetRows = [
			createRow(1, { name: 'Second fetched', status: 'Open' }),
			createRow(2, { name: 'Third fetched', status: 'Open' }),
			createRow(0, { name: 'First fetched', status: 'Open' }),
		];
		await rerenderSheet();

		const reorderedNameCells = Array.from(
			host.querySelectorAll('[data-sheet-cell="true"][data-cell-key="name"][data-row-id]'),
		);

		expect(reorderedNameCells.map((cell) => cell.textContent)).toEqual([
			'Second fetched',
			'Third fetched',
			'First fetched',
		]);
	});

	it('renders children inside the sticky sheet header above column labels', async () => {
		const host = await renderSheet({
			children: <div data-testid='toolbar'>Toolbar</div>,
		});
		const headerContent = host.querySelector('[data-sheet-header-content="true"]');
		const headerRow = host.querySelector('[data-sheet-header-row="true"]');
		const scrollViewport = host.querySelector('[data-sheet-scroll-viewport="true"]');

		expect(headerContent?.textContent).toBe('Toolbar');
		expect(headerContent?.className).toContain('bd_b_1');
		expect(headerContent?.nextElementSibling).toBe(scrollViewport);
		expect(scrollViewport?.contains(headerRow)).toBe(true);
	});

	it('renders human labels in sheet headers when they exist', async () => {
		const sheet = createSheet();
		sheet.design = {
			...sheet.design,
			cells: sheet.design.cells.map((cell) => cell.key === 'name'
				? {
					...cell,
					humanLabel: 'Human Name',
				}
				: cell),
		};
		const host = await renderSheet({ sheet });
		const nameHeader = host.querySelector('[data-sheet-header-cell="true"]') as HTMLElement;

		expect(nameHeader.textContent).toBe('Human Name');
	});

	it('does not render hidden master sheet design cells', async () => {
		const sheet = createSheet();
		sheet.design = {
			...sheet.design,
			cells: sheet.design.cells.map((cell) => cell.key === 'status'
				? {
					...cell,
					hidden: true,
				}
				: cell),
		};
		const host = await renderSheet({ sheet });

		expect(host.querySelector('[data-sheet-header-cell="true"][data-cell-key="name"]')).not.toBeNull();
		expect(host.querySelector('[data-sheet-header-cell="true"][data-cell-key="status"]')).toBeNull();
		expect(host.querySelector('[data-sheet-cell="true"][data-cell-key="status"]')).toBeNull();
	});

	it('does not render view columns backed by hidden master cells', async () => {
		const sheet = createSheet();
		sheet.design = {
			...sheet.design,
			cells: sheet.design.cells.map((cell) => cell.key === 'status'
				? {
					...cell,
					hidden: true,
				}
				: cell),
			views: [{
				id: 'review',
				name: 'Review',
				layout: 'GRID',
				columns: [{
					key: 'review_name',
					label: 'Name',
					humanFieldType: 'TEXT',
					source: {
						type: 'MASTER_CELL',
						cellKey: 'name',
					},
				}, {
					key: 'review_status',
					label: 'Hidden Status',
					humanFieldType: 'TEXT',
					source: {
						type: 'MASTER_CELL',
						cellKey: 'status',
					},
				}],
				columnsOrder: ['review_name', 'review_status'],
				filters: [],
				sorts: [],
				groups: [],
			}],
			viewsOrder: ['review'],
		};
		const host = await renderSheet({ sheet });
		const reviewTab = host.querySelector('[data-sheet-view-tab="review"]') as HTMLElement;

		await act(async () => {
			reviewTab.click();
			await Promise.resolve();
		});
		await flushRender();

		expect(host.querySelector('[data-sheet-header-cell="true"][data-cell-key="review_name"]')).not.toBeNull();
		expect(host.querySelector('[data-sheet-header-cell="true"][data-cell-key="review_status"]')).toBeNull();
		expect(host.querySelector('[data-sheet-cell="true"][data-cell-key="review_status"]')).toBeNull();
	});

	it('always renders the data tab for the unfiltered master sheet', async () => {
		const host = await renderSheet();
		const dataTab = host.querySelector('[data-sheet-view-tab="master"]') as HTMLElement;
		const sheetGridContainer = host.querySelector('[data-sheet-grid-container="true"]') as HTMLElement;
		const sheetWithViews = host.querySelector('[data-sheet-with-views="true"]') as HTMLElement;
		const viewTabs = host.querySelector('[data-sheet-view-tabs="true"]') as HTMLElement;

		expect(dataTab).not.toBeNull();
		expect(dataTab.textContent).toBe('Data');
		expect(dataTab.querySelector('.icon-database-2')).not.toBeNull();
		expect(sheetGridContainer.className).toContain('h_0');
		expect(sheetWithViews.className).not.toContain('pb_40');
		expect(viewTabs.className).not.toContain('abs_b');
		expect(viewTabs.className).toContain('no_shrink');
		expect(viewTabs.className).toContain('h_45');
		expect(hookState.lastSheetRowsArgs?.[4]).toBeNull();
	});

	it('renders saved views as bottom tabs and refetches rows with a view filter', async () => {
		const sheet = createSheet();
		sheet.design = {
			...sheet.design,
			views: [{
				id: 'active_jobs',
				name: 'Active Jobs',
				layout: 'GRID',
				columns: [{
					key: 'job_name',
					label: 'Job',
					humanFieldType: 'TEXT',
					source: {
						type: 'MASTER_CELL',
						cellKey: 'name',
					},
					width: 220,
				}],
				columnsOrder: ['job_name'],
				filters: [],
				sorts: [],
				groups: [],
			}],
			viewsOrder: ['active_jobs'],
		};
		const host = await renderSheet({ sheet });
		const viewTabs = host.querySelector('[data-sheet-view-tabs="true"]');
		const dataTab = host.querySelector('[data-sheet-view-tab="master"]') as HTMLElement;
		const activeJobsTab = host.querySelector('[data-sheet-view-tab="active_jobs"]') as HTMLElement;

		expect(viewTabs).not.toBeNull();
		expect(dataTab.textContent).toBe('Data');
		expect(activeJobsTab.textContent).toBe('Active Jobs');
		expect(hookState.lastSheetRowsArgs?.[4]).toBeNull();

		await act(async () => {
			activeJobsTab.click();
			await Promise.resolve();
		});
		await flushRender();
		await flushRender();

		expect(hookState.lastSheetRowsArgs?.[4]).toEqual({
			viewId: 'active_jobs',
		});
		expect(host.querySelector('[data-sheet-header-cell="true"]')?.textContent).toBe('Job');
		expect(host.querySelector('[data-sheet-cell="true"][data-cell-key="job_name"]')?.textContent).toBe('Alpha');

		const jobNameCell = host.querySelector('[data-sheet-cell="true"][data-cell-key="job_name"]') as HTMLElement;
		await act(async () => {
			jobNameCell.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
		});

		const input = host.querySelector('[data-sheet-editor="true"]') as HTMLInputElement;
		await act(async () => {
			input.value = 'Beta';
			input.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Enter' }));
			await Promise.resolve();
		});
		await flushRender();

		expect(hookState.editSheetCell).toHaveBeenCalledWith({
			variables: {
				cellKey: 'name',
				organizationId: 'org-1',
				sheetId: 'sheet-1',
				sheetRowId: 'row-0',
				viewCellKey: 'job_name',
				viewId: 'active_jobs',
				value: 'Beta',
			},
		});
	});

	it('renders computed and related view cells as read-only columns', async () => {
		const sheet = createSheet();
		sheet.design = {
			...sheet.design,
			views: [{
				id: 'weekly_fulfillment',
				name: 'Current Week',
				layout: 'GRID',
				columns: [{
					key: 'region',
					label: 'Region',
					humanFieldType: 'TEXT',
					source: {
						type: 'RELATED_RECORD',
						table: 'logs',
						path: 'createdAt',
						sourceCellKey: 'name',
					},
				}, {
					key: 'crates',
					label: 'Crates',
					humanFieldType: 'NUMBER',
					source: {
						type: 'COMPUTED',
						operation: 'SUM',
						sourceCellKeys: ['name', 'status'],
					},
				}],
				columnsOrder: ['region', 'crates'],
				filters: [],
				sorts: [],
				groups: [],
			}],
			viewsOrder: ['weekly_fulfillment'],
		};
		hookState.sheetRows = [createRow(0, {
			region: 'North',
			crates: '12',
		})];
		const host = await renderSheet({ sheet });
		const currentWeekTab = host.querySelector('[data-sheet-view-tab="weekly_fulfillment"]') as HTMLElement;

		await act(async () => {
			currentWeekTab.click();
			await Promise.resolve();
		});
		await flushRender();
		await flushRender();

		const regionCell = host.querySelector('[data-sheet-cell="true"][data-cell-key="region"]') as HTMLElement;
		const cratesCell = host.querySelector('[data-sheet-cell="true"][data-cell-key="crates"]') as HTMLElement;

		expect(regionCell.textContent).toBe('North');
		expect(cratesCell.textContent).toBe('12');
		expect(regionCell.dataset.sheetCellEditable).toBeUndefined();
		expect(cratesCell.dataset.sheetCellEditable).toBeUndefined();

		await act(async () => {
			cratesCell.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
		});
		await flushRender();

		expect(host.querySelector('[data-sheet-editor="true"]')).toBeNull();
		expect(hookState.editSheetCell).not.toHaveBeenCalled();
	});

	it('renders computed view cells from source cells when synthetic cells are missing', async () => {
		const sheet = createSheet();
		sheet.design = {
			...sheet.design,
			cells: [
				createDesignCell('crate_18_lbs', {
					fieldType: 'NUMBER',
					humanFieldType: 'NUMBER',
				}),
				createDesignCell('crate_10_lbs', {
					fieldType: 'NUMBER',
					humanFieldType: 'NUMBER',
				}),
				createDesignCell('crate_5_lbs', {
					fieldType: 'NUMBER',
					humanFieldType: 'NUMBER',
				}),
			],
			views: [{
				id: 'markets_today',
				name: 'Markets (today)',
				layout: 'GRID',
				columns: [{
					key: 'crates',
					label: 'Crates',
					fieldType: 'NUMBER',
					humanFieldType: 'NUMBER',
					source: {
						type: 'COMPUTED',
						operation: 'SUM',
						sourceCellKeys: ['crate_18_lbs', 'crate_10_lbs', 'crate_5_lbs'],
					},
				}],
				columnsOrder: ['crates'],
				filters: [],
				sorts: [],
				groups: [],
			}],
			viewsOrder: ['markets_today'],
		};
		const row = createRow(0, {});
		row.cells = [
			createCell(row.id, 'crate_18_lbs', '3', {
				numberValue: 3,
			}),
			createCell(row.id, 'crate_10_lbs', '4', {
				numberValue: 4,
			}),
			createCell(row.id, 'crate_5_lbs', '5', {
				numberValue: 5,
			}),
		];
		hookState.sheetRows = [row];
		const host = await renderSheet({ sheet });
		const marketsTodayTab = host.querySelector('[data-sheet-view-tab="markets_today"]') as HTMLElement;

		await act(async () => {
			marketsTodayTab.click();
			await Promise.resolve();
		});
		await flushRender();
		await flushRender();

		const cratesCell = host.querySelector('[data-sheet-cell="true"][data-cell-key="crates"]') as HTMLElement;

		expect(cratesCell.textContent).toBe('12');
		expect(cratesCell.dataset.sheetCellEditable).toBeUndefined();
	});

	it('renders select-style values as colored pills from sheet design options', async () => {
		const sheet = createSheet();
		const cells = [
			createDesignCell('name'),
			createDesignCell('status', {
				humanFieldType: 'SELECT',
				options: [{
					label: 'Open',
					value: 'Open',
					color: 'emerald',
				}],
			}),
			createDesignCell('defaultStatus', {
				humanFieldType: 'SELECT',
				options: [{
					label: 'Default',
					value: 'Default',
				}],
			}),
			createDesignCell('reason', {
				humanFieldType: 'SELECT_OR_TEXT',
				options: [{
					label: 'Needs review',
					value: 'Needs review',
					color: 'not-a-color',
				}],
			}),
		];

		sheet.design = {
			...sheet.design,
			cells,
			cellsOrder: cells.map((cell) => cell.key),
		};
		hookState.sheetRows = [createRow(0, {
			name: 'Alpha',
			status: 'Open',
			defaultStatus: 'Default',
			reason: 'Needs review',
		})];

		const host = await renderSheet({ sheet });
		const statusCell = host.querySelector('[data-sheet-cell="true"][data-cell-key="status"]') as HTMLElement;
		const defaultStatusCell = host.querySelector('[data-sheet-cell="true"][data-cell-key="defaultStatus"]') as HTMLElement;
		const reasonCell = host.querySelector('[data-sheet-cell="true"][data-cell-key="reason"]') as HTMLElement;
		const statusPill = host.querySelector('[data-sheet-cell="true"][data-cell-key="status"] span') as HTMLElement;
		const defaultStatusPill = host.querySelector('[data-sheet-cell="true"][data-cell-key="defaultStatus"] span') as HTMLElement;
		const reasonPill = host.querySelector('[data-sheet-cell="true"][data-cell-key="reason"] span') as HTMLElement;

		expect(statusCell.className).toContain('bg_emerald_fd_hv');
		expect(statusPill.textContent).toBe('Open');
		expect(statusPill.className).toContain('r_4');
		expect(statusPill.className).toContain('bg_emerald_md');
		expect(defaultStatusCell.className).toContain('bg_zinc_fd_hv');
		expect(defaultStatusPill.textContent).toBe('Default');
		expect(defaultStatusPill.className).toContain('r_4');
		expect(defaultStatusPill.className).toContain('bg_zinc_md');
		expect(reasonCell.className).toContain('bg_zinc_fd_hv');
		expect(reasonPill.textContent).toBe('Needs review');
		expect(reasonPill.className).toContain('r_4');
		expect(reasonPill.className).toContain('bg_zinc_md');
	});

	it('does not apply editable hover backgrounds to non-editable cells', async () => {
		const sheet = createSheet();
		const cells = [
			createDesignCell('name', {
				humansCannotEdit: true,
			}),
			createDesignCell('status', {
				humanFieldType: 'SELECT',
				humansCannotEdit: true,
				options: [{
					label: 'Open',
					value: 'Open',
					color: 'emerald',
				}],
			}),
		];

		sheet.design = {
			...sheet.design,
			cells,
			cellsOrder: cells.map((cell) => cell.key),
		};
		hookState.sheetRows = [createRow(0, {
			name: 'Alpha',
			status: 'Open',
		})];

		const host = await renderSheet({ sheet });
		const nameCell = host.querySelector('[data-sheet-cell="true"][data-cell-key="name"]') as HTMLElement;
		const statusCell = host.querySelector('[data-sheet-cell="true"][data-cell-key="status"]') as HTMLElement;

		expect(nameCell.dataset.sheetCellEditable).toBeUndefined();
		expect(nameCell.className).not.toContain('bg_zinc_fd_hv');
		expect(statusCell.dataset.sheetCellEditable).toBeUndefined();
		expect(statusCell.className).not.toContain('bg_emerald_fd_hv');
		expect(statusCell.className).not.toContain('bg_zinc_fd_hv');

		await act(async () => {
			statusCell.dispatchEvent(new MouseEvent('click', { bubbles: true }));
		});
		await flushRender();

		expect(statusCell.className).toContain('bg_emerald_fd');
		expect(statusCell.className).not.toContain('bg_emerald_fd_hv');
	});

	it('parses typed editor values with the same shape expected by sheet validation', () => {
		const options = [
			{ label: 'Market', value: 'Market' },
			{ label: 'Prep', value: 'Prep' },
		];

		expect(parseSheetEditorValue(createDesignCell('date', {
			fieldType: 'DATE',
			humanFieldType: 'DATE',
		}), '2026-02-30').error).toBe('Invalid date');
		expect(parseSheetEditorValue(createDesignCell('date', {
			fieldType: 'DATE',
			humanFieldType: 'DATE',
		}), '2026-02-28').value).toBe('2026-02-28');
		expect(parseSheetEditorValue(createDesignCell('datetime', {
			fieldType: 'DATETIME',
			humanFieldType: 'DATETIME',
		}), '2026-05-21T09:30').value).toBe('2026-05-21T09:30');
		expect(parseSheetEditorValue(createDesignCell('datetime', {
			fieldType: 'DATETIME',
			humanFieldType: 'DATETIME',
		}), '2026-02-30T09:30').error).toBe('Invalid datetime');
		expect(parseSheetEditorValue(createDesignCell('number', {
			fieldType: 'NUMBER',
			humanFieldType: 'NUMBER',
		}), '12.5').value).toBe('12.5');
		expect(parseSheetEditorValue(createDesignCell('price', {
			fieldType: 'PRICE',
			humanFieldType: 'PRICE',
		}), '12.5').value).toBe('12.5');
		expect(parseSheetEditorValue(createDesignCell('week', {
			fieldType: 'WEEK_OF_MON',
			humanFieldType: 'WEEK_OF_MON',
		}), '2026-05-27').value).toBe('2026-05-25');
		expect(parseSheetEditorValue(createDesignCell('week', {
			fieldType: 'WEEK_OF_SUN',
			humanFieldType: 'WEEK_OF_SUN',
		}), '2026-05-27').value).toBe('2026-05-24');
		expect(parseSheetEditorValue(createDesignCell('boolean', {
			fieldType: 'BOOLEAN',
			humanFieldType: 'BOOLEAN',
		}), 'true').value).toBe('true');
		expect(parseSheetEditorValue(createDesignCell('tags', {
			fieldType: 'MULTI_SELECT',
			humanFieldType: 'MULTI_SELECT',
			options,
		}), 'Market, Prep').value).toBe(JSON.stringify(['Market', 'Prep']));
		expect(parseSheetEditorValue(createDesignCell('tags', {
			fieldType: 'MULTI_SELECT',
			humanFieldType: 'MULTI_SELECT',
			options,
		}), 'Market, Missing').error).toBe('Invalid option');
		expect(parseSheetEditorValue(createDesignCell('number', {
			fieldType: 'NUMBER',
			humanFieldType: 'TEXT',
		}), 'abc').error).toBe('Invalid number');
		expect(parseSheetEditorValue(createDesignCell('text', {
			fieldType: 'TEXT',
			humanFieldType: 'NUMBER',
		}), 'abc').value).toBe('abc');
	});

	it('prefers typed mirror values over raw persisted strings when rendering cells', async () => {
		const sheet = createSheet();
		sheet.design = {
			...sheet.design,
			cells: [
				createDesignCell('count', {
					fieldType: 'NUMBER',
					humanFieldType: 'NUMBER',
				}),
				createDesignCell('enabled', {
					fieldType: 'BOOLEAN',
					humanFieldType: 'BOOLEAN',
				}),
			],
			cellsOrder: ['count', 'enabled'],
		};
		const row = createRow(0, {});
		row.cells = [
			createCell(row.id, 'count', 'stale', {
				numberValue: 42,
			}),
			createCell(row.id, 'enabled', 'stale', {
				booleanValue: false,
			}),
		];
		hookState.sheetRows = [row];
		const host = await renderSheet({ sheet });

		expect(host.querySelector('[data-sheet-cell="true"][data-cell-key="count"]')?.textContent).toBe('42');
		expect(host.querySelector('[data-sheet-cell="true"][data-cell-key="enabled"]')?.textContent).toBe('false');
	});

	it('formats price and week fields for display', async () => {
		const sheet = createSheet();
		sheet.design = {
			...sheet.design,
			cells: [
				createDesignCell('price', {
					fieldType: 'PRICE',
					humanFieldType: 'PRICE',
				}),
				createDesignCell('same_month_week', {
					fieldType: 'WEEK_OF_MON',
					humanFieldType: 'WEEK_OF_MON',
				}),
				createDesignCell('cross_month_week', {
					fieldType: 'WEEK_OF_MON',
					humanFieldType: 'WEEK_OF_MON',
				}),
				createDesignCell('sun_week', {
					fieldType: 'WEEK_OF_SUN',
					humanFieldType: 'WEEK_OF_SUN',
				}),
				createDesignCell('related_week', {
					fieldType: 'ID',
					humanFieldType: 'WEEK_OF_MON',
				}),
			],
			cellsOrder: ['price', 'same_month_week', 'cross_month_week', 'sun_week', 'related_week'],
		};
		const row = createRow(0, {});
		row.cells = [
			createCell(row.id, 'price', 'stale', {
				numberValue: 12.5,
			}),
			createCell(row.id, 'same_month_week', 'stale', {
				dateValue: '2026-05-18',
			}),
			createCell(row.id, 'cross_month_week', 'stale', {
				dateValue: '2025-05-26',
			}),
			createCell(row.id, 'sun_week', 'stale', {
				dateValue: '2026-05-27',
			}),
			createCell(row.id, 'related_week', '2026-05-27'),
		];
		hookState.sheetRows = [row];
		const host = await renderSheet({ sheet });

		expect(host.querySelector('[data-sheet-cell="true"][data-cell-key="price"]')?.textContent).toBe('$12.50');
		expect(host.querySelector('[data-sheet-cell="true"][data-cell-key="same_month_week"]')?.textContent).toBe('May 18 - 24');
		expect(host.querySelector('[data-sheet-cell="true"][data-cell-key="cross_month_week"]')?.textContent).toBe('May 26 - Jun 1');
		expect(host.querySelector('[data-sheet-cell="true"][data-cell-key="sun_week"]')?.textContent).toBe('May 24 - 30');
		expect(host.querySelector('[data-sheet-cell="true"][data-cell-key="related_week"]')?.textContent).toBe('May 25 - 31');
	});

	it('formats date and datetime cells with design cell format', async () => {
		const sheet = createSheet();
		sheet.design = {
			...sheet.design,
			cells: [
				createDesignCell('date', {
					fieldType: 'DATE',
					humanFieldType: 'DATE',
					format: 'ccc, LLL d',
				}),
				createDesignCell('datetime', {
					fieldType: 'DATETIME',
					humanFieldType: 'DATETIME',
					format: 'LLL d, h:mm a',
				}),
				createDesignCell('related_date', {
					fieldType: 'ID',
					humanFieldType: 'DATE',
					format: 'yyyy LLL dd',
				}),
			],
			cellsOrder: ['date', 'datetime', 'related_date'],
		};
		const row = createRow(0, {});
		row.cells = [
			createCell(row.id, 'date', 'stale', {
				dateValue: '2026-05-18',
			}),
			createCell(row.id, 'datetime', 'stale', {
				datetimeValue: '2026-05-18T14:30:00.000',
			}),
			createCell(row.id, 'related_date', '2026-05-18'),
		];
		hookState.sheetRows = [row];
		const host = await renderSheet({ sheet });

		expect(host.querySelector('[data-sheet-cell="true"][data-cell-key="date"]')?.textContent).toBe('Mon, May 18');
		expect(host.querySelector('[data-sheet-cell="true"][data-cell-key="datetime"]')?.textContent).toBe('May 18, 2:30 PM');
		expect(host.querySelector('[data-sheet-cell="true"][data-cell-key="related_date"]')?.textContent).toBe('2026 May 18');
	});

	it('selects a valid saved default view on first render', async () => {
		const sheet = createSheet();
		sheet.design = {
			...sheet.design,
			defaultViewId: 'active_jobs',
			views: [{
				id: 'active_jobs',
				name: 'Active Jobs',
				layout: 'GRID',
				columns: [{
					key: 'job_name',
					label: 'Job',
					humanFieldType: 'TEXT',
					source: {
						type: 'MASTER_CELL',
						cellKey: 'name',
					},
				}],
				columnsOrder: ['job_name'],
				filters: [],
				sorts: [],
				groups: [],
			}],
			viewsOrder: ['active_jobs'],
		};
		const host = await renderSheet({ sheet });

		expect(hookState.lastSheetRowsArgs?.[4]).toEqual({
			viewId: 'active_jobs',
		});
		expect(host.querySelector('[data-sheet-header-cell="true"]')?.textContent).toBe('Job');
	});

	it('falls back to the database tab when a saved default view is missing', async () => {
		const sheet = createSheet();
		sheet.design = {
			...sheet.design,
			defaultViewId: 'missing_view',
			views: [{
				id: 'active_jobs',
				name: 'Active Jobs',
				layout: 'GRID',
				columns: [{
					key: 'job_name',
					label: 'Job',
					humanFieldType: 'TEXT',
					source: {
						type: 'MASTER_CELL',
						cellKey: 'name',
					},
				}],
				columnsOrder: ['job_name'],
				filters: [],
				sorts: [],
				groups: [],
			}],
			viewsOrder: ['active_jobs'],
		};
		const host = await renderSheet({ sheet });

		expect(hookState.lastSheetRowsArgs?.[4]).toBeNull();
		expect(host.querySelector('[data-sheet-header-cell="true"]')?.textContent).toBe('NAME');
	});

	it('saves header human labels from header edit mode', async () => {
		const host = await renderSheet();
		const nameHeader = host.querySelector('[data-sheet-header-cell="true"][data-cell-key="name"]') as HTMLElement;

		await act(async () => {
			nameHeader.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
		});
		await flushRender();

		const input = host.querySelector('[data-sheet-header-editor="true"]') as HTMLInputElement;
		expect(input).not.toBeNull();
		expect(input.value).toBe('NAME');

		await act(async () => {
			input.value = 'Display Name';
			input.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Enter' }));
			await Promise.resolve();
		});
		await flushRender();

		expect(host.querySelector('[data-sheet-header-editor="true"]')).toBeNull();
		expect(hookState.editSheetDesign).toHaveBeenCalledWith({
			variables: {
				design: {
					cells: [{
						humanLabel: 'Display Name',
						key: 'name',
					}],
				},
				organizationId: 'org-1',
				sheetId: 'sheet-1',
			},
		});
		expect(nameHeader.textContent).toBe('Display Name');
	});

	it('caps saved header human labels to seventy characters', async () => {
		const longLabel = 'A'.repeat(SHEET_HUMAN_LABEL_MAX_LENGTH + 10);
		const host = await renderSheet();
		const nameHeader = host.querySelector('[data-sheet-header-cell="true"][data-cell-key="name"]') as HTMLElement;

		await act(async () => {
			nameHeader.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
		});
		await flushRender();

		const input = host.querySelector('[data-sheet-header-editor="true"]') as HTMLInputElement;
		await act(async () => {
			input.value = longLabel;
			input.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Enter' }));
			await Promise.resolve();
		});
		await flushRender();

		expect(hookState.editSheetDesign).toHaveBeenCalledWith({
			variables: {
				design: {
					cells: [{
						humanLabel: 'A'.repeat(SHEET_HUMAN_LABEL_MAX_LENGTH),
						key: 'name',
					}],
				},
				organizationId: 'org-1',
				sheetId: 'sheet-1',
			},
		});
		expect(nameHeader.textContent).toBe('A'.repeat(SHEET_HUMAN_LABEL_MAX_LENGTH));
	});

	it('does not enter header edit mode when editing is denied', async () => {
		const host = await renderSheet({ allowEdit: false });
		const nameHeader = host.querySelector('[data-sheet-header-cell="true"][data-cell-key="name"]') as HTMLElement;

		await act(async () => {
			nameHeader.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
		});
		await flushRender();

		expect(host.querySelector('[data-sheet-header-editor="true"]')).toBeNull();
	});

	it('enters read-only column header edit mode on double click', async () => {
		const lockedNameCell = createDesignCell('name', { humansCannotEdit: true });
		const statusCell = createDesignCell('status');
		const host = await renderSheet({
			sheet: createSheet({
				design: {
					...createSheet().design,
					cells: [lockedNameCell, statusCell],
					cellsOrder: ['name', 'status'],
				},
			}),
		});
		const nameHeader = host.querySelector('[data-sheet-header-cell="true"][data-cell-key="name"]') as HTMLElement;

		await act(async () => {
			nameHeader.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
		});
		await flushRender();

		const input = host.querySelector('[data-sheet-header-editor="true"]') as HTMLInputElement;
		expect(input).not.toBeNull();
		expect(input.value).toBe('NAME');
	});

	it('enters header edit mode when a single-clicked header is clicked again', async () => {
		const host = await renderSheet();
		const nameHeader = host.querySelector('[data-sheet-header-cell="true"][data-cell-key="name"]') as HTMLElement;

		await act(async () => {
			nameHeader.dispatchEvent(new MouseEvent('click', { bubbles: true }));
		});
		await flushRender();

		expect(host.querySelector('[data-sheet-header-editor="true"]')).toBeNull();

		await act(async () => {
			nameHeader.dispatchEvent(new MouseEvent('click', { bubbles: true }));
		});
		await flushRender();

		const input = host.querySelector('[data-sheet-header-editor="true"]') as HTMLInputElement;
		expect(input).not.toBeNull();
		expect(input.value).toBe('NAME');
	});

	it('exits header edit mode on escape', async () => {
		const host = await renderSheet();
		const nameHeader = host.querySelector('[data-sheet-header-cell="true"][data-cell-key="name"]') as HTMLElement;

		await act(async () => {
			nameHeader.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
		});
		await flushRender();

		const input = host.querySelector('[data-sheet-header-editor="true"]') as HTMLInputElement;
		expect(input).not.toBeNull();

		await act(async () => {
			input.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Escape' }));
		});
		await flushRender();

		expect(host.querySelector('[data-sheet-header-editor="true"]')).toBeNull();
		expect(hookState.editSheetDesign).not.toHaveBeenCalled();
	});

	it('queues header human label saves until the in-flight design save finishes', async () => {
		let resolveFirstSave: ((value: unknown) => void) | null = null;
		hookState.editSheetDesign.mockImplementationOnce(() => new Promise((resolve) => {
			resolveFirstSave = resolve;
		}));
		const host = await renderSheet();
		const nameHeader = host.querySelector('[data-sheet-header-cell="true"][data-cell-key="name"]') as HTMLElement;
		const statusHeader = host.querySelector('[data-sheet-header-cell="true"][data-cell-key="status"]') as HTMLElement;

		await act(async () => {
			nameHeader.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
		});
		await flushRender();

		let input = host.querySelector('[data-sheet-header-editor="true"]') as HTMLInputElement;
		await act(async () => {
			input.value = 'Display Name';
			input.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Enter' }));
			await Promise.resolve();
		});
		await flushRender();

		expect(hookState.editSheetDesign).toHaveBeenCalledTimes(1);

		await act(async () => {
			statusHeader.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
		});
		await flushRender();

		input = host.querySelector('[data-sheet-header-editor="true"]') as HTMLInputElement;
		await act(async () => {
			input.value = 'Display Status';
			input.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Enter' }));
			await Promise.resolve();
		});
		await flushRender();

		expect(hookState.editSheetDesign).toHaveBeenCalledTimes(1);

		await act(async () => {
			resolveFirstSave?.({ data: {} });
			await Promise.resolve();
		});
		await flushRender();

		expect(hookState.editSheetDesign).toHaveBeenCalledTimes(2);
		expect(hookState.editSheetDesign).toHaveBeenLastCalledWith({
			variables: {
				design: {
					cells: [{
						humanLabel: 'Display Status',
						key: 'status',
					}],
				},
				organizationId: 'org-1',
				sheetId: 'sheet-1',
			},
		});
	});

	it('adds sixty-four pixels of right padding to each rendered row', async () => {
		const host = await renderSheet();
		const canvas = host.querySelector('.sheet_ui_canvas') as HTMLElement;
		const headerSpacer = host.querySelector('[data-sheet-sticky-header-spacer="true"]') as HTMLElement;
		const rowSlot = host.querySelector('[data-sheet-row-number-slot="true"]') as HTMLElement;
		const statusCell = host.querySelector('[data-sheet-cell="true"][data-cell-key="status"]') as HTMLElement;

		expect(canvas.style.width).toBe('432px');
		expect(headerSpacer.style.width).toBe('368px');
		expect(rowSlot.style.width).toBe('432px');
		expect(statusCell.style.left).toBe('208px');
		expect(statusCell.style.width).toBe('160px');
	});

	it('keeps sticky-left columns rendered during far horizontal scroll', async () => {
		const sheet = createSheet();
		const cells = Array.from({ length: 8 }, (_, index) => createDesignCell(index === 0 ? 'name' : `col_${index}`));
		sheet.design = {
			...sheet.design,
			cells,
			cellsOrder: cells.map((cell) => cell.key),
			stickyLeft: 1,
		};
		hookState.sheetRows = [createRow(0, Object.fromEntries(cells.map((cell, index) => [cell.key, `Value ${index}`])))];
		const host = await renderSheet({
			bufferColumns: 0,
			sheet,
		});
		const viewport = host.querySelector('[data-sheet-scroll-viewport="true"]') as HTMLElement;

		await act(async () => {
			Object.defineProperty(viewport, 'scrollLeft', {
				configurable: true,
				value: 900,
				writable: true,
			});
			viewport.dispatchEvent(new Event('scroll', { bubbles: true }));
			await Promise.resolve();
		});
		await flushRender();

		const stickyNameCell = host.querySelector('[data-sheet-cell="true"][data-cell-key="name"][data-row-id="row-0"]') as HTMLElement | null;
		const farCell = host.querySelector('[data-sheet-cell="true"][data-cell-key="col_6"][data-row-id="row-0"]') as HTMLElement | null;

		expect(stickyNameCell?.textContent).toBe('Value 0');
		expect(stickyNameCell?.style.left).toBe('944px');
		expect(farCell?.textContent).toBe('Value 6');
	});

	it('renders viewport filler rows without row numbers or cell dividers', async () => {
		const host = await renderSheet();
		const rowNumbers = Array.from(host.querySelectorAll('.sheet_ui_row_number'));
		const rowNumberSlots = Array.from(host.querySelectorAll('[data-sheet-row-number-slot="true"]')) as HTMLElement[];
		const cells = Array.from(host.querySelectorAll('[data-sheet-cell="true"]'));
		const placeholderCells = cells.filter((cell) => !(cell as HTMLElement).dataset.rowId);
		const placeholderFillCells = Array.from(host.querySelectorAll('[data-sheet-placeholder-row-fill-cell="true"]')) as HTMLElement[];
		const stickyColumnSpacers = Array.from(host.querySelectorAll('[data-sheet-sticky-column-spacer="true"]')) as HTMLElement[];

		expect(rowNumbers.map((rowNumber) => rowNumber.textContent)).toEqual(['', '1', '', '', '']);
		expect(cells).toHaveLength(5);
		expect(placeholderCells).toHaveLength(3);
		expect(placeholderFillCells).toHaveLength(3);
		expect(stickyColumnSpacers).toHaveLength(4);
		expect(stickyColumnSpacers[1]?.style.left).toBe('44px');
		expect(stickyColumnSpacers[1]?.className).toContain('w_4');
		expect(placeholderFillCells[0]?.style.left).toBe('44px');
		expect(placeholderFillCells[0]?.style.width).toBe('324px');
		expect(rowNumberSlots.at(-1)?.style.height).toBe('28px');
		expect(placeholderFillCells.at(-1)?.style.height).toBe('28px');
		expect(Number(rowNumberSlots.at(-1)?.style.top.replace('px', '')) + Number(rowNumberSlots.at(-1)?.style.height.replace('px', ''))).toBe(160);
		placeholderFillCells.forEach((cell) => {
			expect(cell.className).toContain('bd_r_1');
			expect(cell.className).toContain('bd_b_1');
		});
	});

	it('renders five fading mock rows while sheet rows are not ready', async () => {
		hookState.sheetRows = undefined as any;
		Object.defineProperty(HTMLElement.prototype, 'clientHeight', {
			configurable: true,
			get() {
				if (this.getAttribute?.('data-sheet-header-content') === 'true') {
					return 44;
				}

				return 320;
			},
		});
		const host = await renderSheet();
		const mockSpans = Array.from(host.querySelectorAll('.mock.active'));
		const opacityClassesByRow = ['', 'op_80', 'op_60', 'op_40', 'op_20'];

		expect(host.querySelectorAll('[data-sheet-row-number-slot="true"]')).toHaveLength(10);
		expect(mockSpans).toHaveLength(10);

		opacityClassesByRow.forEach((opacityClass, rowIndex) => {
			const rowTop = `${SHEET_HEADER_HEIGHT + SHEET_STICKY_SPACER_SIZE + rowIndex * SHEET_ROW_HEIGHT}px`;
			const rowMockSpans = mockSpans.filter((span) => {
				return (span.parentElement as HTMLElement).style.top === rowTop;
			});

			expect(rowMockSpans).toHaveLength(2);
			rowMockSpans.forEach((span) => {
				expect(span.textContent).toBe('... ... ...');
				expect(span.className).toBe(opacityClass ? `mock active bl min_w_50_pc ${opacityClass}` : 'mock active bl min_w_50_pc');
			});
		});
	});

	it('does not render rows from stale sheet row query variables', async () => {
		hookState.sheetRows = [
			createRow(0, { name: 'Alpha', status: 'Open' }),
			createRow(1, { name: 'Beta', status: 'Closed' }),
		];
		hookState.sheetRowsVariables = {
			cursor: null,
			filter: null,
			limit: 200,
			organizationId: 'org-1',
			sheetId: 'previous-sheet',
		};

		const host = await renderSheet();

		expect(host.querySelector('[data-sheet-cell="true"][data-cell-key="name"][data-row-id="row-0"]')).toBeNull();
		expect(host.textContent).not.toContain('Alpha');
		expect(host.textContent).not.toContain('Beta');
		expect(host.querySelectorAll('.mock.active')).not.toHaveLength(0);

		hookState.sheetRowsVariables = null;
		await rerenderSheet();

		expect(host.querySelector('[data-sheet-cell="true"][data-cell-key="name"][data-row-id="row-0"]')?.textContent).toBe('Alpha');
		expect(host.querySelector('[data-sheet-cell="true"][data-cell-key="name"][data-row-id="row-1"]')?.textContent).toBe('Beta');
	});

	it('removes rows that disappear from a refreshed sheet row query', async () => {
		hookState.sheetRows = [
			createRow(0, { name: 'Alpha', status: 'Open' }),
			createRow(1, { name: 'Beta', status: 'Closed' }),
		];
		const host = await renderSheet();

		expect(host.querySelector('[data-sheet-cell="true"][data-cell-key="name"][data-row-id="row-0"]')?.textContent).toBe('Alpha');
		expect(host.querySelector('[data-sheet-cell="true"][data-cell-key="name"][data-row-id="row-1"]')?.textContent).toBe('Beta');

		hookState.sheetRows = [
			createRow(1, { name: 'Beta', status: 'Closed' }),
		];
		await rerenderSheet();

		expect(host.querySelector('[data-sheet-cell="true"][data-cell-key="name"][data-row-id="row-0"]')).toBeNull();
		expect(host.querySelector('[data-sheet-cell="true"][data-cell-key="name"][data-row-id="row-1"]')?.textContent).toBe('Beta');
		expect(host.textContent).not.toContain('Alpha');
	});

	it('renders persisted design widths before local resize drafts', async () => {
		const sheet = createSheet();
		sheet.design = {
			...sheet.design,
			cells: sheet.design.cells.map((cell) => cell.key === 'name'
				? {
					...cell,
					width: 220,
				}
				: cell),
		};
		const host = await renderSheet({ sheet });
		const canvas = host.querySelector('.sheet_ui_canvas') as HTMLElement;
		const headerSpacer = host.querySelector('[data-sheet-sticky-header-spacer="true"]') as HTMLElement;
		const nameHeader = host.querySelector('[data-sheet-header-cell="true"]') as HTMLElement;
		const statusCell = host.querySelector('[data-sheet-cell="true"][data-cell-key="status"]') as HTMLElement;

		expect(canvas.style.width).toBe('492px');
		expect(headerSpacer.style.width).toBe('428px');
		expect(nameHeader.style.width).toBe('220px');
		expect(statusCell.style.left).toBe('268px');
		expect(statusCell.style.width).toBe('160px');
	});

	it('does not update forever when sheet rows are returned as new equivalent objects', async () => {
		hookState.getSheetRows = () => [createRow(0, { name: 'Alpha', status: 'Open' })];
		const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

		await renderSheet();

		expect(consoleSpy).not.toHaveBeenCalledWith(expect.stringContaining('Maximum update depth exceeded'));
	});

	it('updates rendered cells when refreshed rows keep the same ids but change values', async () => {
		const host = await renderSheet();
		const getNameCell = () => host.querySelector('[data-sheet-cell="true"][data-cell-key="name"][data-row-id="row-0"]') as HTMLElement;

		expect(getNameCell().textContent).toBe('Alpha');

		hookState.sheetRows = [createRow(0, { name: 'Server Beta', status: 'Open' })];
		await rerenderSheet();

		expect(getNameCell().textContent).toBe('Server Beta');
	});

	it('updates rendered cell icons when refreshed rows keep the same ids and values', async () => {
		hookState.sheetRows = [createRow(0, { name: 'Alpha', status: 'Open' })];
		const host = await renderSheet();
		const getNameCell = () => host.querySelector('[data-sheet-cell="true"][data-cell-key="name"][data-row-id="row-0"]') as HTMLElement;

		expect(getNameCell().querySelector('.icon-circle-check')).toBeNull();

		hookState.sheetRows = [{
			...createRow(0, {}),
			cells: [
				createCell('row-0', 'name', 'Alpha', {
					iconName: 'circle-check',
				}),
				createCell('row-0', 'status', 'Open'),
			],
		}];
		await rerenderSheet();

		expect(getNameCell().querySelector('.icon-circle-check')).not.toBeNull();
		expect(getNameCell().textContent).toContain('Alpha');
	});

	it('deduplicates repeated sheet row ids from refreshed row payloads', async () => {
		hookState.sheetRows = [
			createRow(0, { name: 'Alpha', status: 'Open' }),
			createRow(0, { name: 'Alpha', status: 'Open' }),
		];
		const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
		const host = await renderSheet();
		const rowCells = Array.from(host.querySelectorAll('[data-sheet-cell="true"][data-row-id="row-0"]'));

		expect(rowCells).toHaveLength(2);
		expect(consoleSpy).not.toHaveBeenCalledWith(expect.stringContaining('Encountered two children with the same key'));
	});

	it('fetches more rows when scrolling near the bottom', async () => {
		hookState.sheetRows = Array.from({ length: 30 }, (_, index) => createRow(index));
		const host = await renderSheet({ limit: 30 });
		const viewport = host.querySelector('[data-sheet-scroll-viewport="true"]') as HTMLElement;

		hookState.fetchMoreRows.mockClear();

		await act(async () => {
			Object.defineProperty(viewport, 'scrollTop', {
				configurable: true,
				value: 850,
				writable: true,
			});
			viewport.dispatchEvent(new Event('scroll', { bubbles: true }));
			await Promise.resolve();
		});
		await flushRender();

		expect(hookState.fetchMoreRows).toHaveBeenCalledWith({
			variables: {
				cursor: 'cursor-29',
				filter: null,
				limit: 30,
				organizationId: 'org-1',
				sheetId: 'sheet-1',
			},
		});
	});

	it('enters edit mode on double click and saves through the mutation hook', async () => {
		const host = await renderSheet();
		const nameCell = host.querySelector('[data-sheet-cell="true"][data-cell-key="name"]') as HTMLElement;

		await act(async () => {
			nameCell.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
		});

		const input = host.querySelector('[data-sheet-editor="true"]') as HTMLInputElement;
		expect(input).not.toBeNull();

		await act(async () => {
			input.value = 'Beta';
			input.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Enter' }));
			await Promise.resolve();
		});
		await flushRender();

		expect(hookState.editSheetCell).toHaveBeenCalledWith({
			variables: {
				cellKey: 'name',
				organizationId: 'org-1',
				sheetId: 'sheet-1',
				sheetRowId: 'row-0',
				viewCellKey: null,
				viewId: null,
				value: 'Beta',
			},
		});
	});

	it('keeps edited text cells selected after saving a changed value', async () => {
		const host = await renderSheet();
		const nameCell = host.querySelector('[data-sheet-cell="true"][data-cell-key="name"]') as HTMLElement;

		await act(async () => {
			nameCell.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
		});
		await flushRender();

		const input = host.querySelector('[data-sheet-editor="true"]') as HTMLInputElement;

		await act(async () => {
			input.value = 'Beta';
			input.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Enter' }));
			await Promise.resolve();
		});
		await flushRender();

		expect(host.querySelector('[data-sheet-editor="true"]')).toBeNull();
		expect(nameCell.className).toContain('single-clicked');
	});

	it('keeps edited text cells selected after clearing a value', async () => {
		const host = await renderSheet();
		const nameCell = host.querySelector('[data-sheet-cell="true"][data-cell-key="name"]') as HTMLElement;

		await act(async () => {
			nameCell.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
		});
		await flushRender();

		const input = host.querySelector('[data-sheet-editor="true"]') as HTMLInputElement;

		await act(async () => {
			input.value = '';
			input.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Enter' }));
			await Promise.resolve();
		});
		await flushRender();

		expect(hookState.editSheetCell).toHaveBeenCalledWith({
			variables: {
				cellKey: 'name',
				organizationId: 'org-1',
				sheetId: 'sheet-1',
				sheetRowId: 'row-0',
				viewCellKey: null,
				viewId: null,
				value: null,
			},
		});
		expect(host.querySelector('[data-sheet-editor="true"]')).toBeNull();
		expect(nameCell.className).toContain('single-clicked');
	});

	it('keeps edited text cells selected after the saved value is refreshed from rows', async () => {
		const host = await renderSheet();
		const nameCell = host.querySelector('[data-sheet-cell="true"][data-cell-key="name"]') as HTMLElement;

		await act(async () => {
			nameCell.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
		});
		await flushRender();

		const input = host.querySelector('[data-sheet-editor="true"]') as HTMLInputElement;

		await act(async () => {
			input.value = 'Beta';
			input.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Enter' }));
			await Promise.resolve();
		});
		await flushRender();

		hookState.sheetRows = [createRow(0, {
			name: 'Beta',
			status: 'Open',
		})];
		await rerenderSheet();

		const refreshedNameCell = host.querySelector('[data-sheet-cell="true"][data-cell-key="name"]') as HTMLElement;

		expect(refreshedNameCell.textContent).toContain('Beta');
		expect(refreshedNameCell.className).toContain('single-clicked');
	});

	it('keeps edited text cells selected when focus leaves after an Enter save', async () => {
		const host = await renderSheet();
		const nameCell = host.querySelector('[data-sheet-cell="true"][data-cell-key="name"]') as HTMLElement;

		await act(async () => {
			nameCell.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
		});
		await flushRender();

		const input = host.querySelector('[data-sheet-editor="true"]') as HTMLInputElement;

		await act(async () => {
			input.value = 'Beta';
			input.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Enter' }));
			await Promise.resolve();
		});
		await flushRender();

		await act(async () => {
			input.dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
			await Promise.resolve();
		});
		await flushRender();

		expect(host.querySelector('[data-sheet-editor="true"]')).toBeNull();
		expect(nameCell.className).toContain('single-clicked');
	});

	it('restores single-clicked state when inline edit mode is canceled with Escape', async () => {
		const host = await renderSheet();
		const nameCell = host.querySelector('[data-sheet-cell="true"][data-cell-key="name"]') as HTMLElement;

		await act(async () => {
			nameCell.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
		});

		const input = host.querySelector('[data-sheet-editor="true"]') as HTMLInputElement;
		expect(input).not.toBeNull();

		await act(async () => {
			input.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Escape' }));
		});
		await flushRender();

		expect(host.querySelector('[data-sheet-editor="true"]')).toBeNull();
		expect(nameCell.className).toContain('single-clicked');
	});

	it('highlights editable cells on single click and edits them on a second click', async () => {
		const host = await renderSheet();
		const nameCell = host.querySelector('[data-sheet-cell="true"][data-cell-key="name"]') as HTMLElement;

		await act(async () => {
			nameCell.dispatchEvent(new MouseEvent('click', { bubbles: true }));
		});
		await flushRender();

		expect(nameCell.className).toContain('bg_zinc_fd');
		expect(nameCell.className).not.toContain('bg_zinc_fd_hv');

		await act(async () => {
			nameCell.dispatchEvent(new MouseEvent('click', { bubbles: true }));
		});
		await flushRender();

		expect(host.querySelector('[data-sheet-editor="true"]')).not.toBeNull();
	});

	it('keeps edit mode open when clicking inside an editor opened from a selected cell', async () => {
		const host = await renderSheet();
		const nameCell = host.querySelector('[data-sheet-cell="true"][data-cell-key="name"]') as HTMLElement;

		await act(async () => {
			nameCell.dispatchEvent(new MouseEvent('click', { bubbles: true }));
		});
		await flushRender();

		await act(async () => {
			nameCell.dispatchEvent(new MouseEvent('click', { bubbles: true }));
		});
		await flushRender();

		const input = host.querySelector('[data-sheet-editor="true"]') as HTMLInputElement;

		await act(async () => {
			input.dispatchEvent(new MouseEvent('click', { bubbles: true }));
		});
		await flushRender();

		expect(host.querySelector('[data-sheet-editor="true"]')).toBe(input);
	});

	it('uses selected select-cell color classes on single click', async () => {
		const sheet = createSheet();
		sheet.design = {
			...sheet.design,
			cells: [
				createDesignCell('name'),
				createDesignCell('status', {
					fieldType: 'SELECT',
					humanFieldType: 'SELECT',
					options: [{
						color: 'red',
						label: 'Open',
						value: 'Open',
					}],
				}),
			],
		};
		const host = await renderSheet({ sheet });
		const statusCell = host.querySelector('[data-sheet-cell="true"][data-cell-key="status"]') as HTMLElement;

		await act(async () => {
			statusCell.dispatchEvent(new MouseEvent('click', { bubbles: true }));
		});
		await flushRender();

		expect(statusCell.className).toContain('bg_red_fd');
		expect(statusCell.className).not.toContain('bg_red_fd_hv');
	});

	it('opens a sheet-owned select editor on the second click and saves an option', async () => {
		const sheet = createSheet();
		sheet.design = {
			...sheet.design,
			cells: [
				createDesignCell('name'),
				createDesignCell('status', {
					fieldType: 'SELECT',
					humanFieldType: 'SELECT',
					options: [
						{ color: 'emerald', label: 'Open', value: 'open' },
						{ color: 'red', label: 'Closed', value: 'closed' },
					],
				}),
			],
		};
		hookState.sheetRows = [createRow(0, {
			name: 'Alpha',
			status: 'open',
		})];
		const host = await renderSheet({ sheet });
		const statusCell = host.querySelector('[data-sheet-cell="true"][data-cell-key="status"]') as HTMLElement;

		await act(async () => {
			statusCell.dispatchEvent(new MouseEvent('click', { bubbles: true }));
			statusCell.dispatchEvent(new MouseEvent('click', { bubbles: true }));
			await Promise.resolve();
		});
		await flushRender();

		const editor = host.querySelector('[data-sheet-select-editor="true"]') as HTMLElement;
		const closedOption = host.querySelector('[data-sheet-select-editor-option="closed"]') as HTMLElement;

		expect(editor).not.toBeNull();
		expect(editor.textContent).toContain('Open');
		expect(editor.textContent).toContain('Closed');
		expect(host.querySelector('[data-sheet-editor="true"]')?.tagName).toBe('DIV');

		await act(async () => {
			closedOption.click();
			await Promise.resolve();
		});
		await flushRender();

		expect(hookState.editSheetCell).toHaveBeenCalledWith({
			variables: {
				cellKey: 'status',
				organizationId: 'org-1',
				sheetId: 'sheet-1',
				sheetRowId: 'row-0',
				viewCellKey: null,
				viewId: null,
				value: 'closed',
			},
			});
			expect(host.querySelector('[data-sheet-select-editor="true"]')).toBeNull();
		});

		it('shows a custom select value as a visible option when it is not in the option list', async () => {
			const sheet = createSheet();
			sheet.design = {
				...sheet.design,
				cells: [
					createDesignCell('status', {
						fieldType: 'SELECT',
						humanFieldType: 'SELECT',
						options: [
							{ color: 'emerald', label: 'Open', value: 'open' },
							{ color: 'red', label: 'Closed', value: 'closed' },
							{ color: 'amber', label: 'Pending', value: 'pending' },
						],
					}),
				],
				cellsOrder: ['status'],
			};
			hookState.sheetRows = [createRow(0, {
				status: 'Legacy',
			})];
			const host = await renderSheet({ sheet });
			const statusCell = host.querySelector('[data-sheet-cell="true"][data-cell-key="status"]') as HTMLElement;

			await act(async () => {
				statusCell.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
			});
			await flushRender();

			expect(host.querySelector('[data-sheet-select-editor-option="Legacy"]')).not.toBeNull();
			expect(Array.from(host.querySelectorAll('[data-sheet-select-editor-option]')).map((option) => option.textContent?.trim())).toEqual([
				'Open',
				'Closed',
				'Pending',
				'Legacy',
			]);
		});

		it('anchors sheet-owned select editors in sheet-canvas coordinates across scroll', async () => {
			const sheet = createSheet();
			sheet.design = {
			...sheet.design,
			cells: [
				createDesignCell('name'),
				createDesignCell('status', {
					fieldType: 'SELECT',
					humanFieldType: 'SELECT',
					options: [
						{ color: 'emerald', label: 'Open', value: 'open' },
					],
				}),
			],
		};
		hookState.sheetRows = [createRow(0, {
			name: 'Alpha',
			status: 'open',
		})];
		const host = await renderSheet({ sheet });
		const viewport = host.querySelector('[data-sheet-scroll-viewport="true"]') as HTMLElement;
		const statusCell = host.querySelector('[data-sheet-cell="true"][data-cell-key="status"]') as HTMLElement;

		await act(async () => {
			statusCell.dispatchEvent(new MouseEvent('click', { bubbles: true }));
			statusCell.dispatchEvent(new MouseEvent('click', { bubbles: true }));
			await Promise.resolve();
		});
		await flushRender();

		const anchor = host.querySelector('[data-sheet-local-editor-anchor="true"]') as HTMLElement;
		const expectedLeft = SHEET_ROW_NUMBER_WIDTH + SHEET_COLUMN_WIDTH + SHEET_STICKY_SPACER_SIZE - 2;
		const expectedTop = SHEET_HEADER_HEIGHT + SHEET_STICKY_SPACER_SIZE + SHEET_ROW_HEIGHT - 1;

		expect(anchor.parentElement?.className).toContain('sheet_ui_canvas');
		expect(anchor.style.left).toBe(`${expectedLeft}px`);
		expect(anchor.style.top).toBe(`${expectedTop}px`);
		expect(anchor.style.width).toBe('163px');

		await act(async () => {
			Object.defineProperty(viewport, 'scrollLeft', {
				configurable: true,
				value: 120,
				writable: true,
			});
			Object.defineProperty(viewport, 'scrollTop', {
				configurable: true,
				value: 48,
				writable: true,
			});
			viewport.dispatchEvent(new Event('scroll', { bubbles: true }));
			await Promise.resolve();
		});
		await flushRender();

		const scrolledAnchor = host.querySelector('[data-sheet-local-editor-anchor="true"]') as HTMLElement;

		expect(scrolledAnchor.style.left).toBe(`${expectedLeft}px`);
		expect(scrolledAnchor.style.top).toBe(`${expectedTop}px`);
	});

	it('uses translated yes and no options for boolean editors without design options', async () => {
		const sheet = createSheet();
		sheet.design = {
			...sheet.design,
			cells: [
				createDesignCell('enabled', {
					fieldType: 'BOOLEAN',
					humanFieldType: 'BOOLEAN',
				}),
			],
			cellsOrder: ['enabled'],
		};
		hookState.sheetRows = [createRow(0, {
			enabled: 'false',
		})];
		const host = await renderSheet({ sheet });
		const enabledCell = host.querySelector('[data-sheet-cell="true"][data-cell-key="enabled"]') as HTMLElement;

		await act(async () => {
			enabledCell.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
		});
		await flushRender();

		const editor = host.querySelector('[data-sheet-select-editor="true"]') as HTMLElement;
		const yesOption = host.querySelector('[data-sheet-select-editor-option="true"]') as HTMLElement;

		expect(editor?.textContent).toContain('Yes');
		expect(editor?.textContent).toContain('No');

		await act(async () => {
			yesOption.click();
			await Promise.resolve();
		});
		await flushRender();

		expect(hookState.editSheetCell).toHaveBeenCalledWith({
			variables: expect.objectContaining({
				cellKey: 'enabled',
				value: 'true',
			}),
		});
		expect(host.querySelector('[data-sheet-select-editor="true"]')).toBeNull();
	});

	it('toggles multi-select options, saves JSON values, and keeps the editor open', async () => {
		const sheet = createSheet();
		sheet.design = {
			...sheet.design,
			cells: [
				createDesignCell('tags', {
					fieldType: 'MULTI_SELECT',
					humanFieldType: 'MULTI_SELECT',
					options: [
						{ color: 'emerald', label: 'Market', value: 'market' },
						{ color: 'blue', label: 'Prep', value: 'prep' },
					],
				}),
			],
			cellsOrder: ['tags'],
		};
		hookState.sheetRows = [createRow(0, {
			tags: JSON.stringify(['market']),
		})];
		const host = await renderSheet({ sheet });
		const tagsCell = host.querySelector('[data-sheet-cell="true"][data-cell-key="tags"]') as HTMLElement;

		await act(async () => {
			tagsCell.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
		});
		await flushRender();

		const prepOption = host.querySelector('[data-sheet-select-editor-option="prep"]') as HTMLElement;

		await act(async () => {
			prepOption.click();
			await Promise.resolve();
		});
		await flushRender();

		expect(hookState.editSheetCell).toHaveBeenCalledWith({
			variables: expect.objectContaining({
				cellKey: 'tags',
				value: JSON.stringify(['market', 'prep']),
			}),
		});
		expect(host.querySelector('[data-sheet-select-editor="true"]')).not.toBeNull();
	});

	it('saves select-or-text option clicks and custom typed values', async () => {
		const sheet = createSheet();
		sheet.design = {
			...sheet.design,
			cells: [
				createDesignCell('reason', {
					fieldType: 'SELECT_OR_TEXT',
					humanFieldType: 'SELECT_OR_TEXT',
					options: [
						{ color: 'zinc', label: 'Listed', value: 'listed' },
					],
				}),
			],
			cellsOrder: ['reason'],
		};
		hookState.sheetRows = [createRow(0, {
			reason: 'custom',
		})];
		const host = await renderSheet({ sheet });
		const reasonCell = host.querySelector('[data-sheet-cell="true"][data-cell-key="reason"]') as HTMLElement;

		await act(async () => {
			reasonCell.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
		});
		await flushRender();

		expect(host.querySelector('[data-sheet-select-editor-option="custom"]')).not.toBeNull();

		const listedOption = host.querySelector('[data-sheet-select-editor-option="listed"]') as HTMLElement;

		await act(async () => {
			listedOption.click();
			await Promise.resolve();
		});
		await flushRender();

		expect(hookState.editSheetCell).toHaveBeenLastCalledWith({
			variables: expect.objectContaining({
				cellKey: 'reason',
				value: 'listed',
			}),
		});

		await act(async () => {
			reasonCell.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
		});
		await flushRender();

		const customInput = host.querySelector('[data-sheet-select-editor-custom="true"] input') as HTMLInputElement;
		const customForm = host.querySelector('[data-sheet-select-editor-custom="true"]') as HTMLFormElement;

		await act(async () => {
			customInput.value = 'Typed reason';
			customForm.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
			await Promise.resolve();
		});
		await flushRender();

		expect(hookState.editSheetCell).toHaveBeenLastCalledWith({
			variables: expect.objectContaining({
				cellKey: 'reason',
				value: 'Typed reason',
			}),
		});
		expect(host.querySelector('[data-sheet-select-editor="true"]')).toBeNull();
	});

	it('leaves select-or-text custom input empty when the draft matches an option value or label', async () => {
		const sheet = createSheet();
		sheet.design = {
			...sheet.design,
			cells: [
				createDesignCell('reason', {
					fieldType: 'SELECT_OR_TEXT',
					humanFieldType: 'SELECT_OR_TEXT',
					options: [
						{ color: 'zinc', label: 'wEbSite', value: 'WEBSITE' },
					],
				}),
			],
			cellsOrder: ['reason'],
		};
		hookState.sheetRows = [
			createRow(0, { reason: 'WEBSITE' }),
			createRow(1, { reason: 'Website' }),
		];
		const host = await renderSheet({ sheet });
		const valueMatchCell = host.querySelector('[data-sheet-cell="true"][data-cell-key="reason"][data-row-id="row-0"]') as HTMLElement;
		const labelMatchCell = host.querySelector('[data-sheet-cell="true"][data-cell-key="reason"][data-row-id="row-1"]') as HTMLElement;

		await act(async () => {
			valueMatchCell.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
		});
		await flushRender();

		expect((host.querySelector('[data-sheet-select-editor-custom="true"] input') as HTMLInputElement).value).toBe('');

		await act(async () => {
			labelMatchCell.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
		});
		await flushRender();

		expect((host.querySelector('[data-sheet-select-editor-custom="true"] input') as HTMLInputElement).value).toBe('');
	});

	it('uses the returned edit cell fragment to replace a normalized optimistic value', async () => {
		const sheet = createSheet();
		sheet.design = {
			...sheet.design,
			cells: [
				createDesignCell('source', {
					fieldType: 'SELECT_OR_TEXT',
					humanFieldType: 'SELECT_OR_TEXT',
					options: [
						{ color: 'zinc', label: 'website', value: 'WEBSITE' },
					],
				}),
			],
			cellsOrder: ['source'],
		};
		hookState.sheetRows = [createRow(0, {
			source: '',
		})];
		hookState.editSheetCell.mockResolvedValueOnce({
			editSheetCell: createCell('row-0', 'source', 'WEBSITE'),
		});
		const host = await renderSheet({ sheet });
		const sourceCell = host.querySelector('[data-sheet-cell="true"][data-cell-key="source"]') as HTMLElement;

		await act(async () => {
			sourceCell.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
		});
		await flushRender();

		const customInput = host.querySelector('[data-sheet-select-editor-custom="true"] input') as HTMLInputElement;
		const customForm = host.querySelector('[data-sheet-select-editor-custom="true"]') as HTMLFormElement;

		await act(async () => {
			customInput.value = 'weBSIte';
			customForm.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
			await Promise.resolve();
		});
		await flushRender();

		expect(hookState.editSheetCell).toHaveBeenLastCalledWith({
			variables: expect.objectContaining({
				cellKey: 'source',
				value: 'weBSIte',
			}),
		});
		expect(host.querySelector('[data-sheet-cell="true"][data-cell-key="source"]')?.textContent).toBe('website');
	});

	it('uses fieldType rather than humanFieldType to choose select edit behavior', async () => {
		const sheet = createSheet();
		sheet.design = {
			...sheet.design,
			cells: [
				createDesignCell('status', {
					fieldType: 'SELECT',
					humanFieldType: 'TEXT',
					options: [
						{ label: 'Open', value: 'open' },
						{ label: 'Closed', value: 'closed' },
					],
				}),
				createDesignCell('note', {
					fieldType: 'TEXT',
					humanFieldType: 'SELECT',
					options: [
						{ label: 'Open', value: 'open' },
					],
				}),
			],
			cellsOrder: ['status', 'note'],
		};
		hookState.sheetRows = [createRow(0, {
			note: '',
			status: '',
		})];
		const host = await renderSheet({ sheet });
		const statusCell = host.querySelector('[data-sheet-cell="true"][data-cell-key="status"]') as HTMLElement;
		const noteCell = host.querySelector('[data-sheet-cell="true"][data-cell-key="note"]') as HTMLElement;

		expect(statusCell.textContent).toBe('');
		expect(noteCell.textContent).toBe('');

		await act(async () => {
			statusCell.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
		});
		await flushRender();

		expect(host.querySelector('[data-sheet-select-editor="true"]')).not.toBeNull();
		expect(host.querySelector('[data-sheet-editor="true"][data-cell-key="status"]')?.tagName).toBe('DIV');

		const closedOption = host.querySelector('[data-sheet-select-editor-option="closed"]') as HTMLElement;

		await act(async () => {
			closedOption.click();
			await Promise.resolve();
		});
		await flushRender();

		expect(hookState.editSheetCell).toHaveBeenLastCalledWith({
			variables: expect.objectContaining({
				cellKey: 'status',
				value: 'closed',
			}),
		});

		await act(async () => {
			noteCell.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
		});
		await flushRender();

		expect(host.querySelector('[data-sheet-select-editor="true"]')).toBeNull();
		expect(host.querySelector('[data-sheet-editor="true"][data-cell-key="note"]')?.tagName).toBe('INPUT');
	});

	it('uses humanFieldType to choose edit behavior for ID_OR_TEXT cells', async () => {
		const sheet = createSheet();
		sheet.design = {
			...sheet.design,
			cells: [
				createDesignCell('document', {
					fieldType: 'ID_OR_TEXT' as unknown as SheetDesignCellGQL['fieldType'],
					humanFieldType: 'SELECT',
					options: [
						{ label: 'Ready', value: 'ready' },
						{ label: 'Blocked', value: 'blocked' },
					],
				}),
			],
			cellsOrder: ['document'],
		};
		hookState.sheetRows = [createRow(0, {
			document: '',
		})];
		const host = await renderSheet({ sheet });
		const documentCell = host.querySelector('[data-sheet-cell="true"][data-cell-key="document"]') as HTMLElement;

		await act(async () => {
			documentCell.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
		});
		await flushRender();

		expect(host.querySelector('[data-sheet-select-editor="true"]')).not.toBeNull();
		expect(host.querySelector('[data-sheet-editor="true"][data-cell-key="document"]')?.getAttribute('data-field-type')).toBe('SELECT');

		const blockedOption = host.querySelector('[data-sheet-select-editor-option="blocked"]') as HTMLElement;

		await act(async () => {
			blockedOption.click();
			await Promise.resolve();
		});
		await flushRender();

		expect(hookState.editSheetCell).toHaveBeenLastCalledWith({
			variables: expect.objectContaining({
				cellKey: 'document',
				value: 'blocked',
			}),
		});
	});

	it('uses SELECT_OR_TEXT humanFieldType to choose edit behavior for ID cells', async () => {
		const sheet = createSheet();
		sheet.design = {
			...sheet.design,
			cells: [
				createDesignCell('document', {
					fieldType: 'ID',
					humanFieldType: 'SELECT_OR_TEXT',
					options: [
						{ label: 'Ready', value: 'ready' },
						{ label: 'Blocked', value: 'blocked' },
					],
				}),
			],
			cellsOrder: ['document'],
		};
		hookState.sheetRows = [createRow(0, {
			document: '',
		})];
		const host = await renderSheet({ sheet });
		const documentCell = host.querySelector('[data-sheet-cell="true"][data-cell-key="document"]') as HTMLElement;

		await act(async () => {
			documentCell.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
		});
		await flushRender();

		expect(host.querySelector('[data-sheet-select-editor="true"]')).not.toBeNull();
		expect(host.querySelector('[data-sheet-editor="true"][data-cell-key="document"]')?.getAttribute('data-field-type')).toBe('SELECT_OR_TEXT');

		const blockedOption = host.querySelector('[data-sheet-select-editor-option="blocked"]') as HTMLElement;

		await act(async () => {
			blockedOption.click();
			await Promise.resolve();
		});
		await flushRender();

		expect(hookState.editSheetCell).toHaveBeenLastCalledWith({
			variables: expect.objectContaining({
				cellKey: 'document',
				value: 'blocked',
			}),
		});
	});

	it('dismisses select-style editors with outside clicks and escape without saving', async () => {
		const sheet = createSheet();
		sheet.design = {
			...sheet.design,
			cells: [
				createDesignCell('status', {
					fieldType: 'SELECT',
					humanFieldType: 'SELECT',
					options: [
						{ label: 'Open', value: 'open' },
					],
				}),
			],
			cellsOrder: ['status'],
		};
		hookState.sheetRows = [createRow(0, {
			status: 'open',
		})];
		const host = await renderSheet({ sheet });
		const statusCell = host.querySelector('[data-sheet-cell="true"][data-cell-key="status"]') as HTMLElement;

		await act(async () => {
			statusCell.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
		});
		await flushRender();
		expect(host.querySelector('[data-sheet-select-editor="true"]')).not.toBeNull();

		await act(async () => {
			document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }));
		});
		await flushRender();

		expect(host.querySelector('[data-sheet-select-editor="true"]')).toBeNull();

		await act(async () => {
			statusCell.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
		});
		await flushRender();
		expect(host.querySelector('[data-sheet-select-editor="true"]')).not.toBeNull();

		await act(async () => {
			document.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Escape' }));
		});
		await flushRender();

		expect(host.querySelector('[data-sheet-select-editor="true"]')).toBeNull();
		expect(statusCell.className).toContain('single-clicked');
		expect(hookState.editSheetCell).not.toHaveBeenCalled();
	});

	it('opens a sheet-owned date calendar editor and saves the selected date', async () => {
		const sheet = createSheet();
		sheet.design = {
			...sheet.design,
			cells: [
				createDesignCell('dueDate', {
					fieldType: 'DATE',
					humanFieldType: 'DATE',
				}),
			],
			cellsOrder: ['dueDate'],
		};
		hookState.sheetRows = [createRow(0, {
			dueDate: '2026-02-01',
		})];
		const host = await renderSheet({ sheet });
		const dateCell = host.querySelector('[data-sheet-cell="true"][data-cell-key="dueDate"]') as HTMLElement;

		await act(async () => {
			dateCell.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
		});
		await flushRender();

		const editor = host.querySelector('[data-sheet-date-editor="true"]') as HTMLElement;
		const dayButton = getCalendarDayButton(editor, 28);

		expect(editor).not.toBeNull();
		expect(host.querySelector('[data-sheet-editor="true"]')?.tagName).toBe('DIV');
		expect(dayButton).not.toBeUndefined();

		await act(async () => {
			dayButton?.click();
			await Promise.resolve();
		});
		await flushRender();

		expect(hookState.editSheetCell).toHaveBeenCalledWith({
			variables: expect.objectContaining({
				cellKey: 'dueDate',
				value: '2026-02-28',
			}),
		});
		expect(host.querySelector('[data-sheet-date-editor="true"]')).toBeNull();
	});

	it('opens a sheet-owned date-time editor and saves date plus time', async () => {
		const sheet = createSheet();
		sheet.design = {
			...sheet.design,
			cells: [
				createDesignCell('startsAt', {
					fieldType: 'DATETIME',
					humanFieldType: 'DATETIME',
				}),
			],
			cellsOrder: ['startsAt'],
		};
		hookState.sheetRows = [createRow(0, {
			startsAt: '2026-05-21T09:30',
		})];
		const host = await renderSheet({ sheet });
		const dateTimeCell = host.querySelector('[data-sheet-cell="true"][data-cell-key="startsAt"]') as HTMLElement;

		await act(async () => {
			dateTimeCell.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
		});
		await flushRender();

		const editor = host.querySelector('[data-sheet-date-editor="true"]') as HTMLElement;
		const timeInput = host.querySelector('[data-sheet-date-time-editor-time="true"]') as HTMLInputElement;
		const dayButton = getCalendarDayButton(editor, 22);

		expect(editor).not.toBeNull();
		expect(timeInput.value).toBe('09:30');
		expect(dayButton).not.toBeUndefined();

		await act(async () => {
			dayButton?.click();
			await Promise.resolve();
		});
		await flushRender();

		const updatedTimeInput = host.querySelector('[data-sheet-date-time-editor-time="true"]') as HTMLInputElement;
		const updatedForm = host.querySelector('[data-sheet-date-time-editor-form="true"]') as HTMLFormElement;

		await act(async () => {
			setNativeInputValue(updatedTimeInput, '14:45');
			await Promise.resolve();
		});
		await flushRender();

		await act(async () => {
			updatedForm.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
			await Promise.resolve();
		});
		await flushRender();

		expect(hookState.editSheetCell).toHaveBeenCalledWith({
			variables: expect.objectContaining({
				cellKey: 'startsAt',
				value: '2026-05-22T14:45',
			}),
		});
		expect(host.querySelector('[data-sheet-date-editor="true"]')).toBeNull();
	});

	it('defaults missing date-time editor time to midnight', async () => {
		const sheet = createSheet();
		sheet.design = {
			...sheet.design,
			cells: [
				createDesignCell('startsAt', {
					fieldType: 'DATETIME',
					humanFieldType: 'DATETIME',
				}),
			],
			cellsOrder: ['startsAt'],
		};
		hookState.sheetRows = [createRow(0, {
			startsAt: '2026-05-21',
		})];
		const host = await renderSheet({ sheet });
		const dateTimeCell = host.querySelector('[data-sheet-cell="true"][data-cell-key="startsAt"]') as HTMLElement;

		await act(async () => {
			dateTimeCell.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
		});
		await flushRender();

		const timeInput = host.querySelector('[data-sheet-date-time-editor-time="true"]') as HTMLInputElement;

		expect(timeInput.value).toBe('00:00');
	});

	it('dismisses date editors with outside clicks and escape without saving', async () => {
		const sheet = createSheet();
		sheet.design = {
			...sheet.design,
			cells: [
				createDesignCell('dueDate', {
					fieldType: 'DATE',
					humanFieldType: 'DATE',
				}),
			],
			cellsOrder: ['dueDate'],
		};
		hookState.sheetRows = [createRow(0, {
			dueDate: '2026-02-01',
		})];
		const host = await renderSheet({ sheet });
		const dateCell = host.querySelector('[data-sheet-cell="true"][data-cell-key="dueDate"]') as HTMLElement;

		await act(async () => {
			dateCell.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
		});
		await flushRender();
		expect(host.querySelector('[data-sheet-date-editor="true"]')).not.toBeNull();

		await act(async () => {
			document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }));
		});
		await flushRender();

		expect(host.querySelector('[data-sheet-date-editor="true"]')).toBeNull();

		await act(async () => {
			dateCell.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
		});
		await flushRender();
		expect(host.querySelector('[data-sheet-date-editor="true"]')).not.toBeNull();

		await act(async () => {
			document.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Escape' }));
		});
		await flushRender();

		expect(host.querySelector('[data-sheet-date-editor="true"]')).toBeNull();
		expect(hookState.editSheetCell).not.toHaveBeenCalled();
	});

	it('keeps date editors open with an error when saving fails', async () => {
		hookState.editSheetCell.mockRejectedValueOnce(new Error('Save failed'));
		const sheet = createSheet();
		sheet.design = {
			...sheet.design,
			cells: [
				createDesignCell('dueDate', {
					fieldType: 'DATE',
					humanFieldType: 'DATE',
				}),
			],
			cellsOrder: ['dueDate'],
		};
		hookState.sheetRows = [createRow(0, {
			dueDate: '2026-02-01',
		})];
		const host = await renderSheet({ sheet });
		const dateCell = host.querySelector('[data-sheet-cell="true"][data-cell-key="dueDate"]') as HTMLElement;

		await act(async () => {
			dateCell.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
		});
		await flushRender();

		const dayButton = getCalendarDayButton(host, 28);

		await act(async () => {
			dayButton?.click();
			await Promise.resolve();
		});
		await flushRender();
		await flushRender();

		expect(hookState.editSheetCell).toHaveBeenCalled();
		expect(host.querySelector('[data-sheet-date-editor="true"]')).not.toBeNull();
		expect(host.querySelector('[data-sheet-editor="true"]')).not.toBeNull();
	});

	it('keeps local edited cell values until server data confirms them', async () => {
		hookState.editSheetCell.mockImplementationOnce(() => new Promise(() => {}));
		const host = await renderSheet();
		const getNameCell = () => host.querySelector('[data-sheet-cell="true"][data-cell-key="name"]') as HTMLElement;

		await act(async () => {
			getNameCell().dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
		});

		const input = host.querySelector('[data-sheet-editor="true"]') as HTMLInputElement;

		await act(async () => {
			input.value = 'Beta';
			input.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Enter' }));
			await Promise.resolve();
		});
		await flushRender();

		expect(getNameCell().textContent).toBe('Beta');

		await rerenderSheet();

		expect(getNameCell().textContent).toBe('Beta');

		hookState.sheetRows = [createRow(0, { name: 'Beta', status: 'Open' })];
		await rerenderSheet();

		expect(getNameCell().textContent).toBe('Beta');
	});

	it('rolls back local edited cell values when the save mutation fails', async () => {
		hookState.editSheetCell.mockRejectedValueOnce(new Error('Save failed'));
		const host = await renderSheet();
		const getNameCell = () => host.querySelector('[data-sheet-cell="true"][data-cell-key="name"]') as HTMLElement;

		await act(async () => {
			getNameCell().dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
		});

		const input = host.querySelector('[data-sheet-editor="true"]') as HTMLInputElement;

		await act(async () => {
			input.value = 'Beta';
			input.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Enter' }));
			await Promise.resolve();
		});
		await flushRender();
		await flushRender();

		const failedInput = host.querySelector('[data-sheet-editor="true"]') as HTMLInputElement;
		expect(failedInput).not.toBeNull();
		expect(failedInput.value).toBe('Beta');

		await act(async () => {
			failedInput.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Escape' }));
		});
		await flushRender();

		expect(getNameCell().textContent).toBe('Alpha');
		expect(host.querySelector('[data-sheet-editor="true"]')).toBeNull();
	});

	it('enters inline edit mode for ID field types', async () => {
		const sheet = createSheet();
		sheet.design = {
			...sheet.design,
			cells: [
				createDesignCell('name', {
					fieldType: 'ID',
					humanFieldType: 'ID',
				}),
				createDesignCell('status', { openLink: true }),
			],
		};
		const host = await renderSheet({ sheet });
		const nameCell = host.querySelector('[data-sheet-cell="true"][data-cell-key="name"]') as HTMLElement;

		await act(async () => {
			nameCell.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
		});
		await flushRender();

		const input = host.querySelector('[data-sheet-editor="true"]') as HTMLInputElement;
		expect(input).not.toBeNull();
		expect(input.tagName).toBe('INPUT');
		expect(input.dataset.fieldType).toBe('ID');
	});

	it('blocks double-click editing for related ID cells', async () => {
		const setFloatingMessage = vi.fn();
		const sheet = createSheet();
		sheet.design = {
			...sheet.design,
			cells: [
				createDesignCell('name'),
				createDesignCell('status', {
					fieldType: 'ID',
					humanFieldType: 'ID',
				}),
			],
		};
		hookState.sheetRows = [{
			...createRow(0, {
				name: 'Alpha',
				status: 'Log 1',
			}),
			cells: [
				createCell('row-0', 'name', 'Alpha'),
				createCell('row-0', 'status', 'Log 1', {
					relatedId: 'log-1',
					relatedTable: 'logs',
				}),
			],
		}];
		const host = await renderSheet({ setFloatingMessage, sheet });
		const statusCell = host.querySelector('[data-sheet-cell="true"][data-cell-key="status"]') as HTMLElement;

		await act(async () => {
			statusCell.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
		});
		await flushRender();

		expect(host.querySelector('[data-sheet-editor="true"]')).toBeNull();
		expect(setFloatingMessage).toHaveBeenCalledWith({
			text: 'Editing this cell is temporarily disabled.',
			type: 'NOTICE',
		});
	});

	it('blocks selected-click editing for related ID_OR_TEXT cells', async () => {
		const setFloatingMessage = vi.fn();
		const sheet = createSheet();
		sheet.design = {
			...sheet.design,
			cells: [
				createDesignCell('name'),
				createDesignCell('status', {
					fieldType: 'ID_OR_TEXT' as unknown as SheetDesignCellGQL['fieldType'],
					humanFieldType: 'ID',
				}),
			],
		};
		hookState.sheetRows = [{
			...createRow(0, {
				name: 'Alpha',
				status: 'Contact 1',
			}),
			cells: [
				createCell('row-0', 'name', 'Alpha'),
				createCell('row-0', 'status', 'Contact 1', {
					relatedId: 'contact-1',
					relatedTable: 'inbound_contact',
				}),
			],
		}];
		const host = await renderSheet({ setFloatingMessage, sheet });
		const statusCell = host.querySelector('[data-sheet-cell="true"][data-cell-key="status"]') as HTMLElement;

		await act(async () => {
			statusCell.dispatchEvent(new MouseEvent('click', { bubbles: true }));
			statusCell.dispatchEvent(new MouseEvent('click', { bubbles: true }));
		});
		await flushRender();

		expect(host.querySelector('[data-sheet-editor="true"]')).toBeNull();
		expect(setFloatingMessage).toHaveBeenCalledWith({
			text: 'Editing this cell is temporarily disabled.',
			type: 'NOTICE',
		});
	});

	it('uses background-click edit rules when Enter is pressed on related ID_OR_TEXT cells', async () => {
		const setFloatingMessage = vi.fn();
		const sheet = createSheet();
		sheet.design = {
			...sheet.design,
			cells: [
				createDesignCell('name'),
				createDesignCell('status', {
					fieldType: 'ID_OR_TEXT' as unknown as SheetDesignCellGQL['fieldType'],
					humanFieldType: 'ID',
				}),
			],
		};
		hookState.sheetRows = [{
			...createRow(0, {
				name: 'Alpha',
				status: 'Contact 1',
			}),
			cells: [
				createCell('row-0', 'name', 'Alpha'),
				createCell('row-0', 'status', 'Contact 1', {
					relatedId: 'contact-1',
					relatedTable: 'inbound_contact',
				}),
			],
		}];
		const host = await renderSheet({ setFloatingMessage, sheet });
		const statusCell = host.querySelector('[data-sheet-cell="true"][data-cell-key="status"]') as HTMLElement;

		await act(async () => {
			statusCell.dispatchEvent(new MouseEvent('click', { bubbles: true }));
		});
		await flushRender();
		await pressSheetKey('Enter', { setFloatingMessage, sheet });

		expect(host.querySelector('[data-sheet-editor="true"]')).toBeNull();
		expect(setFloatingMessage).toHaveBeenCalledWith({
			text: 'Editing this cell is temporarily disabled.',
			type: 'NOTICE',
		});
	});

	it('routes open-link display clicks through the container handler', async () => {
		const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
		const sheet = createSheet();
		sheet.design = {
			...sheet.design,
			cells: [
				createDesignCell('name'),
				createDesignCell('status', {
					humansCannotEdit: true,
					openLink: true,
				}),
			],
		};
		hookState.sheetRows = [createRow(0, {
			name: 'Alpha',
			status: 'https://example.com/orders/501',
		})];
		const host = await renderSheet({ sheet });
		const statusCell = host.querySelector('[data-sheet-cell="true"][data-cell-key="status"]') as HTMLElement;
		const openTrigger = statusCell.querySelector('[data-sheet-cell-open-trigger="true"]') as HTMLElement;

		await act(async () => {
			statusCell.dispatchEvent(new MouseEvent('click', { bubbles: true }));
		});

		expect(openSpy).not.toHaveBeenCalled();

		await act(async () => {
			openTrigger.dispatchEvent(new MouseEvent('click', { bubbles: true }));
		});

		expect(openSpy).toHaveBeenCalledWith('https://example.com/orders/501', '_blank', 'noopener,noreferrer');
	});

	it('opens related log ID cells in the log entry modal', async () => {
		const sheet = createSheet();
		sheet.design = {
			...sheet.design,
			cells: [
				createDesignCell('name'),
				createDesignCell('status', {
					fieldType: 'ID',
					humanFieldType: 'ID',
					humansCannotEdit: true,
					openLink: true,
				}),
			],
		};
		hookState.sheetRows = [{
			...createRow(0, {
				name: 'Alpha',
				status: 'Log 1',
			}),
			cells: [
				createCell('row-0', 'name', 'Alpha'),
				createCell('row-0', 'status', 'Log 1', {
					relatedId: 'log-1',
					relatedTable: 'logs',
				}),
			],
		}];
		const host = await renderSheet({ sheet });
		const statusCell = host.querySelector('[data-sheet-cell="true"][data-cell-key="status"]') as HTMLElement;
		const openTrigger = statusCell.querySelector('[data-sheet-cell-open-trigger="true"]') as HTMLElement;

		await act(async () => {
			openTrigger.dispatchEvent(new MouseEvent('click', { bubbles: true }));
		});

		expect(hookState.openModalScreen).toHaveBeenCalledWith({
			name: 'LOG_ENTRY',
			props: {
				logEntryId: 'log-1',
			},
		});
	});

	it('opens inbound contact ID cells in a sheet-local overlay editor', async () => {
		const setFloatingMessage = vi.fn();
		const sheet = createSheet();
		sheet.design = {
			...sheet.design,
			cells: [
				createDesignCell('name'),
				createDesignCell('status', {
					fieldType: 'ID',
					humanFieldType: 'ID',
					humansCannotEdit: true,
					openLink: true,
				}),
			],
		};
		hookState.sheetRows = [{
			...createRow(0, {
				name: 'Alpha',
				status: 'Contact 1',
			}),
			cells: [
				createCell('row-0', 'name', 'Alpha'),
				createCell('row-0', 'status', 'Contact 1', {
					relatedId: 'contact-1',
					relatedTable: 'inbound_contact',
				}),
			],
		}];
		const host = await renderSheet({ setFloatingMessage, sheet });
		const statusCell = host.querySelector('[data-sheet-cell="true"][data-cell-key="status"]') as HTMLElement;
		const openTrigger = statusCell.querySelector('[data-sheet-cell-open-trigger="true"]') as HTMLElement;

		await act(async () => {
			openTrigger.dispatchEvent(new MouseEvent('click', { bubbles: true }));
		});

		const editor = host.querySelector('[data-sheet-inbound-contact-editor="true"]') as HTMLElement;
		expect(editor).not.toBeNull();
		expect(host.querySelector('[data-sheet-editor="true"]')).toBeNull();
		expect(statusCell.className).toContain('active');
		expect(editor.parentElement?.style.width).toBe('320px');
		expect(editor.querySelector('input[name="personName"]')).not.toBeNull();
		expect(editor.querySelector('input[name="email"]')).not.toBeNull();
		expect(editor.querySelector('input[name="phone"]')).not.toBeNull();
		expect((editor.querySelector('input[name="email"]') as HTMLInputElement).disabled).toBe(true);
		expect((editor.querySelector('input[name="phone"]') as HTMLInputElement).disabled).toBe(true);
		expect(editor.querySelector('textarea[name="memory"]')).not.toBeNull();
		expect(setFloatingMessage).not.toHaveBeenCalled();
		expect(hookState.lastInboundContactArgs?.[0]).toEqual({
			organizationId: 'org-1',
			inboundContactId: 'contact-1',
		});

		setNativeInputValue(editor.querySelector('textarea[name="memory"]') as HTMLTextAreaElement, 'Prefers morning pickup.');

		await act(async () => {
			editor.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
			await Promise.resolve();
		});

		expect(hookState.editInboundContact).toHaveBeenCalledWith({
			variables: {
				organizationId: 'org-1',
				inboundContactId: 'contact-1',
				personName: 'Contact 1',
				memory: 'Prefers morning pickup.',
			},
		});
		expect(host.querySelector('[data-sheet-inbound-contact-editor="true"]')).toBeNull();
	});

	it('populates the inbound contact overlay editor when GraphQL data loads', async () => {
		const setFloatingMessage = vi.fn();
		const sheet = createSheet();
		hookState.inboundContactInitialLoading = true;
		sheet.design = {
			...sheet.design,
			cells: [
				createDesignCell('name'),
				createDesignCell('status', {
					fieldType: 'ID',
					humanFieldType: 'ID',
					humansCannotEdit: true,
					openLink: true,
				}),
			],
		};
		hookState.sheetRows = [{
			...createRow(0, {
				name: 'Alpha',
				status: 'Contact 1',
			}),
			cells: [
				createCell('row-0', 'name', 'Alpha'),
				createCell('row-0', 'status', 'Contact 1', {
					relatedId: 'contact-1',
					relatedTable: 'inbound_contact',
				}),
			],
		}];
		const host = await renderSheet({ setFloatingMessage, sheet });
		const statusCell = host.querySelector('[data-sheet-cell="true"][data-cell-key="status"]') as HTMLElement;
		const openTrigger = statusCell.querySelector('[data-sheet-cell-open-trigger="true"]') as HTMLElement;

		await act(async () => {
			openTrigger.dispatchEvent(new MouseEvent('click', { bubbles: true }));
		});

		let editor = host.querySelector('[data-sheet-inbound-contact-editor="true"]') as HTMLElement;
		expect(editor.getAttribute('aria-busy')).toBe('true');
		expect((editor.querySelector('input[name="personName"]') as HTMLInputElement).value).toBe('Contact 1');
		expect((editor.querySelector('input[name="personName"]') as HTMLInputElement).disabled).toBe(true);
		expect((editor.querySelector('input[name="email"]') as HTMLInputElement).value).toBe('');
		expect((editor.querySelector('input[name="email"]') as HTMLInputElement).disabled).toBe(true);
		expect((editor.querySelector('input[name="phone"]') as HTMLInputElement).value).toBe('');
		expect((editor.querySelector('input[name="phone"]') as HTMLInputElement).disabled).toBe(true);
		expect((editor.querySelector('textarea[name="memory"]') as HTMLTextAreaElement).value).toBe('');
		expect((editor.querySelector('textarea[name="memory"]') as HTMLTextAreaElement).disabled).toBe(true);
		expect((editor.querySelector('textarea[name="memory"]') as HTMLTextAreaElement).className).toContain('w_f');
		expect((editor.querySelector('button[type="submit"]') as HTMLButtonElement).disabled).toBe(true);

		await act(async () => {
			editor.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
			await Promise.resolve();
		});

		expect(hookState.editInboundContact).not.toHaveBeenCalled();

		hookState.inboundContact = {
			id: 'contact-1',
			organizationId: 'org-1',
			cursor: 'cursor-contact-1',
			personName: 'Loaded Contact',
			email: 'loaded@example.com',
			phone: '+15550100',
			memory: 'Loaded memory',
			createdAt: '2026-05-19T00:00:00.000Z',
			updatedAt: '2026-05-20T00:00:00.000Z',
		};
		hookState.inboundContactInitialLoading = false;

		await rerenderSheet({ setFloatingMessage, sheet });

		editor = host.querySelector('[data-sheet-inbound-contact-editor="true"]') as HTMLElement;
		expect(editor.getAttribute('aria-busy')).toBe('false');
		expect((editor.querySelector('input[name="personName"]') as HTMLInputElement).value).toBe('Loaded Contact');
		expect((editor.querySelector('input[name="personName"]') as HTMLInputElement).disabled).toBe(false);
		expect((editor.querySelector('input[name="email"]') as HTMLInputElement).value).toBe('loaded@example.com');
		expect((editor.querySelector('input[name="email"]') as HTMLInputElement).disabled).toBe(true);
		expect((editor.querySelector('input[name="phone"]') as HTMLInputElement).value).toBe('+15550100');
		expect((editor.querySelector('input[name="phone"]') as HTMLInputElement).disabled).toBe(true);
		expect((editor.querySelector('textarea[name="memory"]') as HTMLTextAreaElement).value).toBe('Loaded memory');
	});

	it('renders child organizations in the inbound contact organization tab', async () => {
		const sheet = createSheet();
		hookState.inboundContact = {
			id: 'contact-1',
			organizationId: 'org-1',
			cursor: 'cursor-contact-1',
			personName: 'Contact 1',
			email: 'contact@example.com',
			phone: '+15550100',
			memory: '',
			associated: [{
				organizationId: 'assoc-org-1',
				name: 'Associated Org 1',
			}],
			createdAt: '2026-05-19T00:00:00.000Z',
			updatedAt: '2026-05-20T00:00:00.000Z',
		};
		hookState.childOrganizations = [{
			id: 'child-rel-1',
			parentId: 'org-1',
			cursor: 'cursor-child-1',
			organization: {
				id: 'child-org-1',
				name: 'Child Org 1',
			},
			preferredContacts: [],
			affiliated: true,
			addedAt: '2026-05-20T00:00:00.000Z',
		}];
		sheet.design = {
			...sheet.design,
			cells: [
				createDesignCell('name'),
				createDesignCell('status', {
					fieldType: 'ID',
					humanFieldType: 'ID',
					humansCannotEdit: true,
					openLink: true,
				}),
			],
		};
		hookState.sheetRows = [{
			...createRow(0, {
				name: 'Alpha',
				status: 'Contact 1',
			}),
			cells: [
				createCell('row-0', 'name', 'Alpha'),
				createCell('row-0', 'status', 'Contact 1', {
					relatedId: 'contact-1',
					relatedTable: 'inbound_contact',
				}),
			],
		}];
		const host = await renderSheet({ sheet });
		const statusCell = host.querySelector('[data-sheet-cell="true"][data-cell-key="status"]') as HTMLElement;
		const openTrigger = statusCell.querySelector('[data-sheet-cell-open-trigger="true"]') as HTMLElement;

		await act(async () => {
			openTrigger.dispatchEvent(new MouseEvent('click', { bubbles: true }));
		});

		const editor = host.querySelector('[data-sheet-inbound-contact-editor="true"]') as HTMLElement;
		const navButtons = Array.from(editor.querySelectorAll('button[type="button"]'));

		await act(async () => {
			navButtons[1]?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
		});

		const childOrgButton = editor.querySelector('[data-sheet-inbound-contact-child-organization="child-org-1"]') as HTMLButtonElement;
		const scrollContainer = childOrgButton.closest('.y_scr.flat');

		expect(hookState.lastChildOrganizationsArgs?.[0]).toEqual({
			organizationId: 'org-1',
			limit: 250,
		});
		expect(editor.textContent).toContain('This contact is associated with: Associated Org 1');
		expect(childOrgButton.textContent).toContain('Child Org 1');
		expect(scrollContainer).not.toBeNull();
		expect(editor.querySelector('button[type="submit"]')?.closest('.y_scr.flat')).toBeNull();

		await act(async () => {
			childOrgButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));
		});
		await flushRender();

		expect(editor.textContent).toContain('This contact is associated with: Associated Org 1, Child Org 1');

		await act(async () => {
			editor.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
			await Promise.resolve();
		});

		expect(hookState.editInboundContact).toHaveBeenCalledWith({
			variables: {
				organizationId: 'org-1',
				inboundContactId: 'contact-1',
				associatedOrganizationIds: ['assoc-org-1', 'child-org-1'],
			},
		});
		expect(host.querySelector('[data-sheet-inbound-contact-editor="true"]')).toBeNull();
	});

	it('opens link display clicks from local edit mode', async () => {
		const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
		const sheet = createSheet();
		sheet.design = {
			...sheet.design,
			cells: [
				createDesignCell('name'),
				createDesignCell('status', {
					fieldType: 'SELECT',
					humanFieldType: 'SELECT',
					openLink: true,
				}),
			],
		};
		hookState.sheetRows = [createRow(0, {
			name: 'Alpha',
			status: 'https://example.com/orders/501',
		})];
		const host = await renderSheet({ sheet });
		const statusCell = host.querySelector('[data-sheet-cell="true"][data-cell-key="status"]') as HTMLElement;

		await act(async () => {
			statusCell.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
		});
		await flushRender();

		const editorTrigger = host.querySelector('[data-sheet-editor="true"] [data-sheet-cell-open-trigger="true"]') as HTMLElement;
		expect(editorTrigger).not.toBeNull();

		await act(async () => {
			editorTrigger.dispatchEvent(new MouseEvent('click', { bubbles: true }));
		});

		expect(openSpy).toHaveBeenCalledWith('https://example.com/orders/501', '_blank', 'noopener,noreferrer');
	});

	it('resizes columns only from primary-button header drags', async () => {
		const host = await renderSheet();
		const nameHeader = host.querySelector('[data-sheet-header-cell="true"]') as HTMLElement;
		const resizeHandle = host.querySelector('[data-sheet-column-resize-handle="name"]') as HTMLElement;

		expect(nameHeader.style.width).toBe('160px');

		await act(async () => {
			resizeHandle.dispatchEvent(new MouseEvent('pointerdown', {
				bubbles: true,
				button: 2,
				clientX: 160,
			}));
			resizeHandle.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true }));
			window.dispatchEvent(new MouseEvent('pointermove', {
				bubbles: true,
				buttons: 0,
				clientX: 240,
			}));
			await Promise.resolve();
		});

		expect(nameHeader.style.width).toBe('160px');
		expect(host.querySelector('[data-sheet-column-resize-guide="name"]')).toBeNull();

		await act(async () => {
			resizeHandle.dispatchEvent(new MouseEvent('pointerdown', {
				bubbles: true,
				button: 0,
				clientX: 160,
			}));
			window.dispatchEvent(new MouseEvent('pointermove', {
				bubbles: true,
				buttons: 1,
				clientX: 210,
			}));
			window.dispatchEvent(new MouseEvent('pointerup', {
				bubbles: true,
				buttons: 0,
				clientX: 210,
			}));
			await Promise.resolve();
		});
		await flushRender();

		expect(nameHeader.style.width).toBe('210px');
		expect(host.querySelector('[data-sheet-column-resize-guide="name"]')).toBeNull();
	});

	it('resizes only the dragged header when duplicate column keys are rendered', async () => {
		const sheet = createSheet();
		sheet.design = {
			...sheet.design,
			cells: [
				createDesignCell('name', { label: 'Name A' }),
				createDesignCell('name', { label: 'Name B' }),
			],
			cellsOrder: [],
		};
		hookState.sheetRows = [createRow(0, {
			name: 'Alpha',
		})];
		const host = await renderSheet({ sheet });
		const headers = Array.from(host.querySelectorAll('[data-sheet-header-cell="true"]')) as HTMLElement[];
		const resizeHandles = Array.from(host.querySelectorAll('[data-sheet-column-resize-handle]')) as HTMLElement[];

		expect(headers.map((header) => header.style.width)).toEqual(['160px', '160px']);
		expect(resizeHandles.map((handle) => handle.dataset.sheetColumnResizeHandle)).toEqual(['name__1', 'name__2']);

		await act(async () => {
			resizeHandles[1]?.dispatchEvent(new MouseEvent('pointerdown', {
				bubbles: true,
				button: 0,
				clientX: 320,
			}));
			window.dispatchEvent(new MouseEvent('pointermove', {
				bubbles: true,
				buttons: 1,
				clientX: 370,
			}));
			window.dispatchEvent(new MouseEvent('pointerup', {
				bubbles: true,
				buttons: 0,
				clientX: 370,
			}));
			await Promise.resolve();
		});
		await flushRender();

		expect(headers[0]?.style.width).toBe('210px');
		expect(headers[1]?.style.width).toBe('160px');
		expect(hookState.editSheetDesign).toHaveBeenCalledWith({
			variables: {
				design: {
					cells: [{
						key: 'name',
						width: 210,
					}],
				},
				organizationId: 'org-1',
				sheetId: 'sheet-1',
			},
		});
	});

	it('does not resize or save design changes when editing is denied', async () => {
		const host = await renderSheet({ allowEdit: false });
		const nameHeader = host.querySelector('[data-sheet-header-cell="true"]') as HTMLElement;
		const resizeHandle = host.querySelector('[data-sheet-column-resize-handle="name"]') as HTMLElement;

		await act(async () => {
			resizeHandle.dispatchEvent(new MouseEvent('pointerdown', {
				bubbles: true,
				button: 0,
				clientX: 160,
			}));
			window.dispatchEvent(new MouseEvent('pointermove', {
				bubbles: true,
				buttons: 1,
				clientX: 220,
			}));
			window.dispatchEvent(new MouseEvent('pointerup', {
				bubbles: true,
				buttons: 0,
				clientX: 220,
			}));
			await Promise.resolve();
		});
		await flushRender();

		expect(nameHeader.style.width).toBe('160px');
		expect(hookState.editSheetDesign).not.toHaveBeenCalled();
	});

	it('reorders database columns by dragging header cells and persists cellsOrder once', async () => {
		const sheet = createSheet();
		sheet.design = {
			...sheet.design,
			cells: [
				createDesignCell('name'),
				createDesignCell('secret', {
					hidden: true,
				}),
				createDesignCell('status'),
			],
			cellsOrder: ['name', 'secret', 'status'],
		};
		hookState.sheetRows = [createRow(0, {
			name: 'Alpha',
			secret: 'Hidden',
			status: 'Open',
		})];
		const host = await renderSheet({ sheet });
		const nameHeader = host.querySelector('[data-sheet-header-cell="true"][data-cell-key="name"]') as HTMLElement;

		expect(Array.from(host.querySelectorAll('[data-sheet-header-cell="true"]')).map((cell) => cell.textContent)).toEqual([
			'NAME',
			'STATUS',
		]);

		await act(async () => {
			nameHeader.dispatchEvent(new MouseEvent('pointerdown', {
				bubbles: true,
				button: 0,
				clientX: 60,
			}));
			window.dispatchEvent(new MouseEvent('pointermove', {
				bubbles: true,
				buttons: 1,
				clientX: 270,
			}));
			await Promise.resolve();
		});
		await flushRender();

		expect(host.querySelector('[data-sheet-column-reorder-guide="name"]')).not.toBeNull();
		expect((host.querySelector('[data-sheet-header-cell="true"][data-cell-key="status"]') as HTMLElement).style.transform).toBe('translateX(-160px)');

		await act(async () => {
			window.dispatchEvent(new MouseEvent('pointerup', {
				bubbles: true,
				buttons: 0,
				clientX: 270,
			}));
			await Promise.resolve();
		});
		await flushRender();

		expect(Array.from(host.querySelectorAll('[data-sheet-header-cell="true"]')).map((cell) => cell.textContent)).toEqual([
			'STATUS',
			'NAME',
		]);
		expect(host.querySelector('[data-sheet-column-reorder-guide="name"]')).toBeNull();
		expect(hookState.editSheetDesign).toHaveBeenCalledTimes(1);
		expect(hookState.editSheetDesign).toHaveBeenCalledWith({
			variables: {
				design: {
					cellsOrder: ['status', 'secret', 'name'],
				},
				organizationId: 'org-1',
				sheetId: 'sheet-1',
			},
		});
	});

	it('uses the dragged header edge to trigger reorder when a wide column moves over a narrow column', async () => {
		const sheet = createSheet();
		sheet.design = {
			...sheet.design,
			cells: [
				createDesignCell('name', {
					width: 300,
				}),
				createDesignCell('status', {
					width: 100,
				}),
			],
			cellsOrder: ['name', 'status'],
		};
		hookState.sheetRows = [createRow(0, {
			name: 'Alpha',
			status: 'Open',
		})];
		const host = await renderSheet({ sheet });
		const nameHeader = host.querySelector('[data-sheet-header-cell="true"][data-cell-key="name"]') as HTMLElement;

		await act(async () => {
			nameHeader.dispatchEvent(new MouseEvent('pointerdown', {
				bubbles: true,
				button: 0,
				clientX: 60,
			}));
			window.dispatchEvent(new MouseEvent('pointermove', {
				bubbles: true,
				buttons: 1,
				clientX: 100,
			}));
			await Promise.resolve();
		});
		await flushRender();

		expect(host.querySelector('[data-sheet-column-reorder-guide="name"]')).not.toBeNull();
		expect((host.querySelector('[data-sheet-header-cell="true"][data-cell-key="status"]') as HTMLElement).style.transform).toBe('translateX(-300px)');

		await act(async () => {
			window.dispatchEvent(new MouseEvent('pointerup', {
				bubbles: true,
				buttons: 0,
				clientX: 100,
			}));
			await Promise.resolve();
		});
		await flushRender();

		expect(Array.from(host.querySelectorAll('[data-sheet-header-cell="true"]')).map((cell) => cell.textContent)).toEqual([
			'STATUS',
			'NAME',
		]);
		expect(hookState.editSheetDesign).toHaveBeenCalledWith({
			variables: {
				design: {
					cellsOrder: ['status', 'name'],
				},
				organizationId: 'org-1',
				sheetId: 'sheet-1',
			},
		});
	});

	it('does not reorder or save columns when editing is denied', async () => {
		const host = await renderSheet({ allowEdit: false });
		const nameHeader = host.querySelector('[data-sheet-header-cell="true"][data-cell-key="name"]') as HTMLElement;

		await act(async () => {
			nameHeader.dispatchEvent(new MouseEvent('pointerdown', {
				bubbles: true,
				button: 0,
				clientX: 60,
			}));
			window.dispatchEvent(new MouseEvent('pointermove', {
				bubbles: true,
				buttons: 1,
				clientX: 330,
			}));
			window.dispatchEvent(new MouseEvent('pointerup', {
				bubbles: true,
				buttons: 0,
				clientX: 330,
			}));
			await Promise.resolve();
		});
		await flushRender();

		expect(Array.from(host.querySelectorAll('[data-sheet-header-cell="true"]')).map((cell) => cell.textContent)).toEqual([
			'NAME',
			'STATUS',
		]);
		expect(hookState.editSheetDesign).not.toHaveBeenCalled();
	});

	it('does not show the resize divider guide on hover alone', async () => {
		const host = await renderSheet();
		const resizeHandle = host.querySelector('[data-sheet-column-resize-handle="name"]') as HTMLElement;

		await act(async () => {
			resizeHandle.dispatchEvent(new MouseEvent('pointerover', {
				bubbles: true,
				buttons: 0,
				clientX: 160,
			}));
			await Promise.resolve();
		});
		await flushRender();

		expect(host.querySelector('[data-sheet-column-resize-guide="name"]')).toBeNull();
	});

	it('does not start a resize guide from divider events during header reorder', async () => {
		const host = await renderSheet();
		const nameHeader = host.querySelector('[data-sheet-header-cell="true"][data-cell-key="name"]') as HTMLElement;
		const resizeHandle = host.querySelector('[data-sheet-column-resize-handle="status"]') as HTMLElement;

		await act(async () => {
			nameHeader.dispatchEvent(new MouseEvent('pointerdown', {
				bubbles: true,
				button: 0,
				clientX: 60,
			}));
			window.dispatchEvent(new MouseEvent('pointermove', {
				bubbles: true,
				buttons: 1,
				clientX: 290,
			}));
			resizeHandle.dispatchEvent(new MouseEvent('pointerdown', {
				bubbles: true,
				button: 0,
				clientX: 320,
			}));
			window.dispatchEvent(new MouseEvent('pointermove', {
				bubbles: true,
				buttons: 1,
				clientX: 340,
			}));
			await Promise.resolve();
		});
		await flushRender();

		expect(host.querySelector('[data-sheet-column-resize-guide="status"]')).toBeNull();

		await act(async () => {
			window.dispatchEvent(new MouseEvent('pointerup', {
				bubbles: true,
				buttons: 0,
				clientX: 340,
			}));
			await Promise.resolve();
		});
	});

	it('reorders saved view columns without changing the database column order', async () => {
		const sheet = createSheet();
		sheet.design = {
			...sheet.design,
			cells: [
				createDesignCell('name'),
				createDesignCell('status', {
					hidden: true,
				}),
				createDesignCell('owner'),
			],
			cellsOrder: ['name', 'status', 'owner'],
			views: [{
				id: 'active_jobs',
				name: 'Active Jobs',
				layout: 'GRID',
				columns: [{
					key: 'job_name',
					label: 'Job',
					humanFieldType: 'TEXT',
					source: {
						type: 'MASTER_CELL',
						cellKey: 'name',
					},
				}, {
					key: 'job_status',
					label: 'Hidden Status',
					humanFieldType: 'TEXT',
					source: {
						type: 'MASTER_CELL',
						cellKey: 'status',
					},
				}, {
					key: 'job_owner',
					label: 'Owner',
					humanFieldType: 'TEXT',
					source: {
						type: 'MASTER_CELL',
						cellKey: 'owner',
					},
				}],
				columnsOrder: ['job_name', 'job_status', 'job_owner'],
				filters: [],
				sorts: [],
				groups: [],
			}],
			viewsOrder: ['active_jobs'],
		};
		hookState.sheetRows = [createRow(0, {
			name: 'Alpha',
			owner: 'Sam',
			status: 'Hidden',
		})];
		const host = await renderSheet({ sheet });
		const activeJobsTab = host.querySelector('[data-sheet-view-tab="active_jobs"]') as HTMLElement;

		await act(async () => {
			activeJobsTab.click();
			await Promise.resolve();
		});
		await flushRender();
		await flushRender();

		const jobNameHeader = host.querySelector('[data-sheet-header-cell="true"][data-cell-key="job_name"]') as HTMLElement;
		expect(Array.from(host.querySelectorAll('[data-sheet-header-cell="true"]')).map((cell) => cell.textContent)).toEqual([
			'Job',
			'Owner',
		]);

		await act(async () => {
			jobNameHeader.dispatchEvent(new MouseEvent('pointerdown', {
				bubbles: true,
				button: 0,
				clientX: 60,
			}));
			window.dispatchEvent(new MouseEvent('pointermove', {
				bubbles: true,
				buttons: 1,
				clientX: 330,
			}));
			window.dispatchEvent(new MouseEvent('pointerup', {
				bubbles: true,
				buttons: 0,
				clientX: 330,
			}));
			await Promise.resolve();
		});
		await flushRender();

		expect(Array.from(host.querySelectorAll('[data-sheet-header-cell="true"]')).map((cell) => cell.textContent)).toEqual([
			'Owner',
			'Job',
		]);
		expect(hookState.editSheetDesign).toHaveBeenCalledWith({
			variables: {
				design: {
					views: [{
						id: 'active_jobs',
						columnsOrder: ['job_owner', 'job_status', 'job_name'],
					}],
				},
				organizationId: 'org-1',
				sheetId: 'sheet-1',
			},
		});

		const databaseTab = host.querySelector('[data-sheet-view-tab="master"]') as HTMLElement;
		await act(async () => {
			databaseTab.click();
			await Promise.resolve();
		});
		await flushRender();

		expect(Array.from(host.querySelectorAll('[data-sheet-header-cell="true"]')).map((cell) => cell.textContent)).toEqual([
			'NAME',
			'OWNER',
		]);
	});

	it('saves one column width mutation when a resize finishes', async () => {
		const host = await renderSheet();
		const resizeHandle = host.querySelector('[data-sheet-column-resize-handle="name"]') as HTMLElement;

		await act(async () => {
			resizeHandle.dispatchEvent(new MouseEvent('pointerdown', {
				bubbles: true,
				button: 0,
				clientX: 160,
			}));
			window.dispatchEvent(new MouseEvent('pointermove', {
				bubbles: true,
				buttons: 1,
				clientX: 210,
			}));
			window.dispatchEvent(new MouseEvent('pointerup', {
				bubbles: true,
				buttons: 0,
				clientX: 210,
			}));
			await Promise.resolve();
		});
		await flushRender();

		expect(hookState.editSheetDesign).toHaveBeenCalledTimes(1);
		expect(hookState.editSheetDesign).toHaveBeenCalledWith({
			variables: {
				design: {
					cells: [{
						key: 'name',
						width: 210,
					}],
				},
				organizationId: 'org-1',
				sheetId: 'sheet-1',
			},
		});
	});

	it('keeps local column widths when refreshed sheet design returns stale widths', async () => {
		const host = await renderSheet();
		const resizeHandle = host.querySelector('[data-sheet-column-resize-handle="name"]') as HTMLElement;
		const getNameHeader = () => host.querySelector('[data-sheet-header-cell="true"][data-cell-key="name"]') as HTMLElement;

		await act(async () => {
			resizeHandle.dispatchEvent(new MouseEvent('pointerdown', {
				bubbles: true,
				button: 0,
				clientX: 160,
			}));
			window.dispatchEvent(new MouseEvent('pointermove', {
				bubbles: true,
				buttons: 1,
				clientX: 210,
			}));
			window.dispatchEvent(new MouseEvent('pointerup', {
				bubbles: true,
				buttons: 0,
				clientX: 210,
			}));
			await Promise.resolve();
		});
		await flushRender();

		expect(getNameHeader().style.width).toBe('210px');

		await rerenderSheet({
			sheet: createSheet(),
		});

		expect(getNameHeader().style.width).toBe('210px');

		const confirmedSheet = createSheet();
		confirmedSheet.design = {
			...confirmedSheet.design,
			cells: confirmedSheet.design.cells.map((cell) => cell.key === 'name'
				? {
					...cell,
					width: 210,
				}
				: cell),
		};

		await rerenderSheet({
			sheet: confirmedSheet,
		});

		expect(getNameHeader().style.width).toBe('210px');

		const newerSheet = createSheet();
		newerSheet.design = {
			...newerSheet.design,
			cells: newerSheet.design.cells.map((cell) => cell.key === 'name'
				? {
					...cell,
					width: 240,
				}
				: cell),
		};

		await rerenderSheet({
			sheet: newerSheet,
		});

		expect(getNameHeader().style.width).toBe('240px');
	});

	it('queues in-flight design saves and collapses pending width patches to the latest value', async () => {
		let resolveFirstSave: ((value: unknown) => void) | null = null;
		hookState.editSheetDesign.mockImplementationOnce(() => new Promise((resolve) => {
			resolveFirstSave = resolve;
		}));
		const host = await renderSheet();
		const resizeHandle = host.querySelector('[data-sheet-column-resize-handle="name"]') as HTMLElement;

		await act(async () => {
			resizeHandle.dispatchEvent(new MouseEvent('pointerdown', {
				bubbles: true,
				button: 0,
				clientX: 160,
			}));
			window.dispatchEvent(new MouseEvent('pointermove', {
				bubbles: true,
				buttons: 1,
				clientX: 210,
			}));
			window.dispatchEvent(new MouseEvent('pointerup', {
				bubbles: true,
				buttons: 0,
				clientX: 210,
			}));
			await Promise.resolve();
		});
		await flushRender();

		await act(async () => {
			resizeHandle.dispatchEvent(new MouseEvent('pointerdown', {
				bubbles: true,
				button: 0,
				clientX: 210,
			}));
			window.dispatchEvent(new MouseEvent('pointermove', {
				bubbles: true,
				buttons: 1,
				clientX: 260,
			}));
			window.dispatchEvent(new MouseEvent('pointerup', {
				bubbles: true,
				buttons: 0,
				clientX: 260,
			}));
			await Promise.resolve();
		});
		await flushRender();

		await act(async () => {
			resizeHandle.dispatchEvent(new MouseEvent('pointerdown', {
				bubbles: true,
				button: 0,
				clientX: 260,
			}));
			window.dispatchEvent(new MouseEvent('pointermove', {
				bubbles: true,
				buttons: 1,
				clientX: 310,
			}));
			window.dispatchEvent(new MouseEvent('pointerup', {
				bubbles: true,
				buttons: 0,
				clientX: 310,
			}));
			await Promise.resolve();
		});
		await flushRender();

		expect(hookState.editSheetDesign).toHaveBeenCalledTimes(1);

		await act(async () => {
			resolveFirstSave?.({ data: {} });
			await Promise.resolve();
		});
		await flushRender();

		expect(hookState.editSheetDesign).toHaveBeenCalledTimes(2);
		expect(hookState.editSheetDesign).toHaveBeenLastCalledWith({
			variables: {
				design: {
					cells: [{
						key: 'name',
						width: 310,
					}],
				},
				organizationId: 'org-1',
				sheetId: 'sheet-1',
			},
		});
	});

});
