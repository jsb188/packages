// @vitest-environment jsdom

import type { SheetCellGQL, SheetDesignCellGQL, SheetGQL, SheetRowGQL } from '@jsb188/mday/types/sheet.d.ts';
import { SHEET_HUMAN_LABEL_MAX_LENGTH } from '@jsb188/mday/constants/sheet.ts';
import {
	SHEET_HEADER_HEIGHT,
	SHEET_ROW_HEIGHT,
	SHEET_STICKY_SPACER_SIZE,
} from '@jsb188/react-web/ui/SheetUI';
import type { ComponentProps } from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Sheet, parseSheetEditorValue } from '../src/modules/Sheet';

const hookState = vi.hoisted(() => ({
	editSheetCell: vi.fn(),
	editSheetDesign: vi.fn(),
	fetchMoreRows: vi.fn(),
	getSheetRows: null as (() => any[]) | null,
	lastSheetRowsArgs: null as any[] | null,
	sheetRows: [] as any[],
	sheetRowsVariables: null as any,
}));

vi.mock('@jsb188/graphql/hooks/use-sheet-qry', () => ({
	useReactiveSheetRows: (rows: any[]) => rows,
	useSheetRows: (...args: any[]) => {
		hookState.lastSheetRowsArgs = args;

		return {
			fetchMore: hookState.fetchMoreRows,
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

beforeEach(() => {
	globalThis.IS_REACT_ACT_ENVIRONMENT = true;
	document.body.innerHTML = '<div id="test-root"></div>';
	hookState.editSheetCell.mockReset().mockResolvedValue({ data: {} });
	hookState.editSheetDesign.mockReset().mockResolvedValue({ data: {} });
	hookState.fetchMoreRows.mockReset().mockResolvedValue({ data: { sheetRows: [] } });
	hookState.getSheetRows = null;
	hookState.lastSheetRowsArgs = null;
	hookState.sheetRows = [createRow(0, { name: 'Alpha', status: 'Open' })];
	hookState.sheetRowsVariables = null;

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

	it('always renders the database tab for the unfiltered master sheet', async () => {
		const host = await renderSheet();
		const databaseTab = host.querySelector('[data-sheet-view-tab="master"]') as HTMLElement;
		const sheetGridContainer = host.querySelector('[data-sheet-grid-container="true"]') as HTMLElement;
		const sheetWithViews = host.querySelector('[data-sheet-with-views="true"]') as HTMLElement;
		const viewTabs = host.querySelector('[data-sheet-view-tabs="true"]') as HTMLElement;

		expect(databaseTab).not.toBeNull();
		expect(databaseTab.textContent).toBe('Database');
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
		const databaseTab = host.querySelector('[data-sheet-view-tab="master"]') as HTMLElement;
		const activeJobsTab = host.querySelector('[data-sheet-view-tab="active_jobs"]') as HTMLElement;

		expect(viewTabs).not.toBeNull();
		expect(databaseTab.textContent).toBe('Database');
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
			reason: 'Needs review',
		})];

		const host = await renderSheet({ sheet });
		const statusCell = host.querySelector('[data-sheet-cell="true"][data-cell-key="status"]') as HTMLElement;
		const reasonCell = host.querySelector('[data-sheet-cell="true"][data-cell-key="reason"]') as HTMLElement;
		const statusPill = host.querySelector('[data-sheet-cell="true"][data-cell-key="status"] span') as HTMLElement;
		const reasonPill = host.querySelector('[data-sheet-cell="true"][data-cell-key="reason"] span') as HTMLElement;

		expect(statusCell.className).toContain('bg_emerald_fd_hv');
		expect(statusCell.className).not.toContain('bg_primary_fd_hv_solid');
		expect(statusPill.textContent).toBe('Open');
		expect(statusPill.className).toContain('r_4');
		expect(statusPill.className).toContain('bg_emerald_md');
		expect(reasonCell.className).toContain('bg_primary_fd_hv_solid');
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
		expect(nameCell.className).not.toContain('bg_primary_fd_hv_solid');
		expect(statusCell.dataset.sheetCellEditable).toBeUndefined();
		expect(statusCell.className).not.toContain('bg_emerald_fd_hv');
		expect(statusCell.className).not.toContain('bg_primary_fd_hv_solid');
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

		expect(rowNumbers.map((rowNumber) => rowNumber.textContent)).toEqual(['1', '', '', '']);
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

		expect(host.querySelectorAll('[data-sheet-row-number-slot="true"]')).toHaveLength(9);
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

	it('highlights editable cells on single click and edits them on a second click', async () => {
		const host = await renderSheet();
		const nameCell = host.querySelector('[data-sheet-cell="true"][data-cell-key="name"]') as HTMLElement;

		await act(async () => {
			nameCell.dispatchEvent(new MouseEvent('click', { bubbles: true }));
		});
		await flushRender();

		expect(nameCell.className).toContain('bg_primary_fd_solid');
		expect(nameCell.className).not.toContain('bg_primary_fd_hv_solid');

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

	it('does not enter edit mode for ID field types', async () => {
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

		expect(host.querySelector('[data-sheet-editor="true"]')).toBeNull();
		expect(hookState.editSheetCell).not.toHaveBeenCalled();
	});

	it('routes open-link cell clicks through the container handler', async () => {
		const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
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
		const host = await renderSheet({ sheet });
		const statusCell = host.querySelector('[data-sheet-cell="true"][data-cell-key="status"]') as HTMLElement;

		await act(async () => {
			statusCell.dispatchEvent(new MouseEvent('click', { bubbles: true }));
		});

		expect(consoleSpy).toHaveBeenCalledWith(expect.objectContaining({
			cellKey: 'status',
			value: 'Open',
		}));
	});

	it('uses the optional onOpenCell handler for open-link cells', async () => {
		const onOpenCell = vi.fn();
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
		const host = await renderSheet({ onOpenCell, sheet });
		const statusCell = host.querySelector('[data-sheet-cell="true"][data-cell-key="status"]') as HTMLElement;

		await act(async () => {
			statusCell.dispatchEvent(new MouseEvent('click', { bubbles: true }));
		});

		expect(onOpenCell).toHaveBeenCalledWith(expect.objectContaining({
			cell: expect.objectContaining({
				cellKey: 'status',
				value: 'Open',
			}),
			designCell: expect.objectContaining({
				key: 'status',
			}),
			row: expect.objectContaining({
				id: 'row-0',
			}),
			sheet: expect.objectContaining({
				id: 'sheet-1',
			}),
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
