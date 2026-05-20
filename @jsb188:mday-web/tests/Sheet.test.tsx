// @vitest-environment jsdom

import type { SheetCellGQL, SheetDesignCellGQL, SheetGQL, SheetRowGQL } from '@jsb188/mday/types/sheet.d.ts';
import type { ComponentProps } from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Sheet } from '../src/modules/Sheet';

const hookState = vi.hoisted(() => ({
	editSheetCell: vi.fn(),
	editSheetDesign: vi.fn(),
	fetchMoreRows: vi.fn(),
	getSheetRows: null as (() => any[]) | null,
	sheetRows: [] as any[],
}));

vi.mock('@jsb188/graphql/hooks/use-sheet-qry', () => ({
	useReactiveSheetRows: (rows: any[]) => rows,
	useSheetRows: () => ({
		fetchMore: hookState.fetchMoreRows,
		sheetRows: hookState.getSheetRows ? hookState.getSheetRows() : hookState.sheetRows,
	}),
}));

vi.mock('@jsb188/graphql/hooks/use-sheet-mtn', () => ({
	useEditSheetCell: () => ({
		editSheetCell: hookState.editSheetCell,
	}),
	useEditSheetDesign: () => ({
		editSheetDesign: hookState.editSheetDesign,
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
		options: [],
		...overrides,
	};
}

/*
 * Build one sheet cell for Sheet container tests.
 */

function createCell(rowId: string, cellKey: string, value: string): SheetCellGQL {
	return {
		id: `${rowId}:${cellKey}`,
		sheetId: 'sheet-1',
		sheetRowId: rowId,
		cellKey,
		value,
		textValue: value,
		createdAt: '2026-05-19T00:00:00.000Z',
		updatedAt: '2026-05-19T00:00:00.000Z',
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

beforeEach(() => {
	globalThis.IS_REACT_ACT_ENVIRONMENT = true;
	document.body.innerHTML = '<div id="test-root"></div>';
	hookState.editSheetCell.mockReset().mockResolvedValue({ data: {} });
	hookState.editSheetDesign.mockReset().mockResolvedValue({ data: {} });
	hookState.fetchMoreRows.mockReset().mockResolvedValue({ data: { sheetRows: [] } });
	hookState.getSheetRows = null;
	hookState.sheetRows = [createRow(0, { name: 'Alpha', status: 'Open' })];

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
				value: 'Beta',
			},
		});
	});

	it('routes open-link cell clicks through the container handler', async () => {
		const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
		const host = await renderSheet();
		const statusCell = host.querySelector('[data-sheet-cell="true"][data-cell-key="status"]') as HTMLElement;

		await act(async () => {
			statusCell.dispatchEvent(new MouseEvent('click', { bubbles: true }));
		});

		expect(consoleSpy).toHaveBeenCalledWith(expect.objectContaining({
			cellKey: 'status',
			value: 'Open',
		}));
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
