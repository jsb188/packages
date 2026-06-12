import i18n from '@jsb188/app/i18n/index.ts';
import type { SheetRegionGQL } from '@jsb188/mday/types/sheet.d.ts';
import { SHEET_CELL_STYLE_MAX_FONT_SIZE, normalizeSheetCellFontSize } from '@jsb188/mday/utils/sheet.ts';
import type { POListIfaceItem } from '@jsb188/react/types/PopOver.d';
import { COMMON_ICON_NAMES } from '@jsb188/react-web/svgs/Icon';
import { copyTextToClipboard } from '@jsb188/react-web/utils/dom';
import { useCallback, useEffect, useRef } from 'react';
import { getGridContextMenuPopOverId, useGridContextMenu } from './grid-context-menu.ts';
import {
	isSheetBorderStylePresetValue,
	type SheetBorderStylePresetValue,
} from './sheet-border-styles.ts';

const SHEET_CONTEXT_MENU_ID = 'sheet-context-menu';

const SHEET_CONTEXT_MENU_ACTIONS = {
	copyCellValue: 'COPY_CELL_VALUE',
	deleteColumn: 'DELETE_COLUMN',
	deleteRow: 'DELETE_ROW',
	editCell: 'EDIT_CELL',
	formatValue: 'FORMAT_VALUE',
	insertColumnLeft: 'INSERT_COLUMN_LEFT',
	insertRowAbove: 'INSERT_ROW_ABOVE',
	mergeCellsAll: 'MERGE_CELLS_ALL',
	mergeCellsHorizontal: 'MERGE_CELLS_HORIZONTAL',
	mergeCellsVertical: 'MERGE_CELLS_VERTICAL',
	unmergeCells: 'UNMERGE_CELLS',
	openDataTable: 'OPEN_DATA_TABLE',
	pasteCellValues: 'PASTE_CELL_VALUES',
	populateFromDataTable: 'POPULATE_FROM_DATA_TABLE',
	removeCellsFromDataTable: 'REMOVE_CELLS_FROM_DATA_TABLE',
} as const;

const SHEET_CONTEXT_MENU_FORMAT_NAMES = {
	borderStyle: 'borderStyle',
	bold: 'bold',
	disableMarkdown: 'disableMarkdown',
	fillColor: 'fillColor',
	fontSize: 'fontSize',
	italic: 'italic',
	strikethrough: 'strikethrough',
	textColor: 'textColor',
	underline: 'underline',
} as const;

const SHEET_CONTEXT_MENU_DEFAULT_FONT_SIZE = 14;

export type SheetContextMenuAction = typeof SHEET_CONTEXT_MENU_ACTIONS[keyof typeof SHEET_CONTEXT_MENU_ACTIONS];

export type SheetContextMenuStructureAction =
	| typeof SHEET_CONTEXT_MENU_ACTIONS.deleteColumn
	| typeof SHEET_CONTEXT_MENU_ACTIONS.deleteRow
	| typeof SHEET_CONTEXT_MENU_ACTIONS.insertColumnLeft
	| typeof SHEET_CONTEXT_MENU_ACTIONS.insertRowAbove;

export type SheetContextMenuFormatName = typeof SHEET_CONTEXT_MENU_FORMAT_NAMES[keyof typeof SHEET_CONTEXT_MENU_FORMAT_NAMES];

export type SheetContextMenuFormat = {
	borderColor?: string | null;
	name?: SheetContextMenuFormatName;
	value?: SheetBorderStylePresetValue | boolean | string | number | null;
};

export type SheetContextMenuMergeMode = 'all' | 'horizontal' | 'vertical';

export type SheetContextMenuCellTarget = {
	cellKey: string;
	rowId: string;
};

export type SheetContextMenuTarget = {
	canEdit: boolean;
	canEditStructure?: boolean;
	canFormatCells?: boolean;
	canMergeCells?: boolean;
	canMergeCellsAll?: boolean;
	canMergeCellsHorizontally?: boolean;
	canMergeCellsVertically?: boolean;
	canUnmergeCells?: boolean;
	canOpenDataTable?: boolean;
	canPopulateFromDataTable?: boolean;
	canRemoveCellsFromDataTable?: boolean;
	dataTableId?: string | null;
	dataTableRegion?: SheetRegionGQL | null;
	dataTableRegionId?: string | null;
	dataTableRoute?: string | null;
	cells: SheetContextMenuCellTarget[];
	cellKey: string;
	disableMarkdown?: boolean | null;
	bold?: boolean | null;
	displayValue: string;
	fillColor?: string | null;
	fontSize?: number | null;
	italic?: boolean | null;
	rawValue?: string;
	rowId: string;
	strikethrough?: boolean | null;
	textColor?: string | null;
	underline?: boolean | null;
};

type UseSheetContextMenuParams = {
	onEditCell: (target: SheetContextMenuTarget) => void;
	onCustomizeCells?: (target: SheetContextMenuTarget, formatName: SheetContextMenuFormatName) => void;
	onEditStructure?: (target: SheetContextMenuTarget, action: SheetContextMenuStructureAction) => void;
	onFormatCells: (target: SheetContextMenuTarget, format: SheetContextMenuFormat) => void;
	onMergeCells?: (target: SheetContextMenuTarget, mode: SheetContextMenuMergeMode) => void;
	onOpenDataTable?: (target: SheetContextMenuTarget) => void;
	onPasteCells?: (target: SheetContextMenuTarget, clipboardText: string) => void | Promise<void>;
	onPopulateFromDataTable?: (target: SheetContextMenuTarget) => void;
	onUnmergeCells?: (target: SheetContextMenuTarget) => void;
	readClipboardText?: () => Promise<string>;
	onRemoveCellsFromDataTable?: (target: SheetContextMenuTarget) => void;
};

type GetSheetContextMenuOptionsParams = {
	onCustomizeCells?: (target: SheetContextMenuTarget, formatName: SheetContextMenuFormatName) => void;
};

const SHEET_CONTEXT_MENU_COLOR_FORMAT_NAMES = [
	SHEET_CONTEXT_MENU_FORMAT_NAMES.fillColor,
	SHEET_CONTEXT_MENU_FORMAT_NAMES.textColor,
];

const SHEET_CONTEXT_MENU_TEXT_STYLE_FORMAT_NAMES = [
	SHEET_CONTEXT_MENU_FORMAT_NAMES.bold,
	SHEET_CONTEXT_MENU_FORMAT_NAMES.italic,
	SHEET_CONTEXT_MENU_FORMAT_NAMES.strikethrough,
	SHEET_CONTEXT_MENU_FORMAT_NAMES.underline,
];

/*
 * Copy one Sheet context-menu target's raw value to the clipboard.
 */
function copySheetContextMenuCellValue(target: SheetContextMenuTarget) {
	void copyTextToClipboard(target.rawValue ?? target.displayValue ?? '');
}

/*
 * Paste clipboard text into the current Sheet context-menu target.
 */
async function pasteSheetContextMenuCellValues(
	target: SheetContextMenuTarget,
	readClipboardText: (() => Promise<string>) | undefined,
	onPasteCells: ((target: SheetContextMenuTarget, clipboardText: string) => void | Promise<void>) | undefined,
) {
	const clipboardText = await readClipboardText?.();

	if (clipboardText) {
		await onPasteCells?.(target, clipboardText);
	}
}

/*
 * Build the format submenu options for one Sheet context-menu target.
 */
function getSheetContextMenuFormatOptions(target: SheetContextMenuTarget, params?: GetSheetContextMenuOptionsParams): POListIfaceItem[] {
	return [{
		__type: 'LIST_COLORS',
		label: i18n.t('sheet.text_color'),
		name: SHEET_CONTEXT_MENU_FORMAT_NAMES.textColor,
		onClickCustomize: () => {
			params?.onCustomizeCells?.(target, SHEET_CONTEXT_MENU_FORMAT_NAMES.textColor);
		},
		selectedValue: target.textColor || null,
	}, {
		__type: 'LIST_COLORS',
		label: i18n.t('sheet.fill_color'),
		name: SHEET_CONTEXT_MENU_FORMAT_NAMES.fillColor,
		onClickCustomize: () => {
			params?.onCustomizeCells?.(target, SHEET_CONTEXT_MENU_FORMAT_NAMES.fillColor);
		},
		selectedValue: target.fillColor || null,
	}, {
		__type: 'LIST_BORDER_STYLES',
		label: i18n.t('sheet.border_styles'),
		name: SHEET_CONTEXT_MENU_FORMAT_NAMES.borderStyle,
		onClickCustomize: () => {
			params?.onCustomizeCells?.(target, SHEET_CONTEXT_MENU_FORMAT_NAMES.borderStyle);
		},
		selectedValue: null,
	}];
}

/*
 * Build the text-format submenu options for one Sheet context-menu target.
 */
function getSheetContextMenuTextFormatOptions(target: SheetContextMenuTarget): POListIfaceItem[] {
	return [{
		__type: 'LIST_TEXT_FORMAT_CONTROLS',
		disableMarkdown: target.disableMarkdown ?? null,
		fontSizeLabel: <>{i18n.t('sheet.font_size')}</>,
		markdownName: SHEET_CONTEXT_MENU_FORMAT_NAMES.disableMarkdown,
		maxFontSize: SHEET_CELL_STYLE_MAX_FONT_SIZE,
		name: SHEET_CONTEXT_MENU_FORMAT_NAMES.fontSize,
		selectedFontSize: target.fontSize || SHEET_CONTEXT_MENU_DEFAULT_FONT_SIZE,
		selectedTextStyles: {
			bold: target.bold ?? null,
			italic: target.italic ?? null,
			strikethrough: target.strikethrough ?? null,
			underline: target.underline ?? null,
		},
		textStyleButtonLabels: {
			bold: i18n.t('sheet.bold'),
			italic: i18n.t('sheet.italic'),
			markdown: i18n.t('sheet.markdown'),
			strikethrough: i18n.t('sheet.strikethrough'),
			underline: i18n.t('sheet.underline'),
		},
		textStyleLabel: <>{i18n.t('sheet.text_style')}</>,
		textStyleNames: {
			bold: SHEET_CONTEXT_MENU_FORMAT_NAMES.bold,
			italic: SHEET_CONTEXT_MENU_FORMAT_NAMES.italic,
			strikethrough: SHEET_CONTEXT_MENU_FORMAT_NAMES.strikethrough,
			underline: SHEET_CONTEXT_MENU_FORMAT_NAMES.underline,
		},
	}];
}

/*
 * Return whether one target can receive cell styling actions.
 */
function canFormatSheetContextMenuTarget(target: SheetContextMenuTarget) {
	return target.canFormatCells ?? target.canEdit;
}

/*
 * Return whether one target can receive row or column structure actions.
 */
function canEditSheetContextMenuTargetStructure(target: SheetContextMenuTarget) {
	return target.canEditStructure ?? target.canEdit;
}

/*
 * Build the data-table region actions for one Sheet context-menu target.
 */
function getSheetContextMenuDataTableOptions(target: SheetContextMenuTarget): POListIfaceItem[] {
	const options: POListIfaceItem[] = [{
		__type: 'LIST_ITEM',
		disabled: !target.canPopulateFromDataTable,
		iconName: COMMON_ICON_NAMES.insert_from_data_table,
		text: target.dataTableRegionId ? i18n.t('sheet.edit_data_table_view') : i18n.t('sheet.insert_from_data_table'),
		value: SHEET_CONTEXT_MENU_ACTIONS.populateFromDataTable,
	}, {
		__type: 'LIST_ITEM',
		disabled: !target.canOpenDataTable,
		iconName: COMMON_ICON_NAMES.data_table,
		text: i18n.t('sheet.open_data_table'),
		value: SHEET_CONTEXT_MENU_ACTIONS.openDataTable,
	}];

	if (target.dataTableRegionId) {
		options.push({
			__type: 'LIST_ITEM',
			className: 'cl_err_hv',
			disabled: !target.canRemoveCellsFromDataTable,
			iconName: 'layers-grid-subtract',
			text: i18n.t('sheet.remove_data_table'),
			value: SHEET_CONTEXT_MENU_ACTIONS.removeCellsFromDataTable,
		});
	}

	return options;
}

/*
 * Build the merge submenu options for one Sheet context-menu target.
 */
function getSheetContextMenuMergeOptions(target: SheetContextMenuTarget): POListIfaceItem[] {
	return [{
		__type: 'LIST_ITEM',
		disabled: !target.canMergeCellsAll,
		iconName: 'merge-table-all',
		text: i18n.t('sheet.merge_all'),
		value: SHEET_CONTEXT_MENU_ACTIONS.mergeCellsAll,
	}, {
		__type: 'LIST_ITEM',
		disabled: !target.canMergeCellsVertically,
		iconName: 'merge-table-vertical',
		text: i18n.t('sheet.merge_vertically'),
		value: SHEET_CONTEXT_MENU_ACTIONS.mergeCellsVertical,
	}, {
		__type: 'LIST_ITEM',
		disabled: !target.canMergeCellsHorizontally,
		iconName: 'merge-table-horizontal',
		text: i18n.t('sheet.merge_horizontally'),
		value: SHEET_CONTEXT_MENU_ACTIONS.mergeCellsHorizontal,
	}, {
		__type: 'LIST_ITEM',
		disabled: !target.canUnmergeCells,
		iconName: 'cells-border-full',
		text: i18n.t('sheet.unmerge_all'),
		value: SHEET_CONTEXT_MENU_ACTIONS.unmergeCells,
	}];
}

/*
 * Build the PopOver list options for one Sheet context-menu target.
 */
function getSheetContextMenuOptions(target: SheetContextMenuTarget, params?: GetSheetContextMenuOptionsParams): POListIfaceItem[] {
	const canFormatTarget = canFormatSheetContextMenuTarget(target);
	const canEditStructure = canEditSheetContextMenuTargetStructure(target);
	const canUseMergeMenu = Boolean(
		target.canMergeCells ||
			target.canMergeCellsAll ||
			target.canMergeCellsHorizontally ||
			target.canMergeCellsVertically ||
			target.canUnmergeCells,
	);
	const options: POListIfaceItem[] = [{
		__type: 'LIST_ITEM',
		disabled: !target.canEdit,
		iconName: 'pencil-write-3',
		text: i18n.t('sheet.edit_cell'),
		value: SHEET_CONTEXT_MENU_ACTIONS.editCell,
	}, {
		__type: 'LIST_ITEM',
		iconName: COMMON_ICON_NAMES.copy,
		text: i18n.t('sheet.copy_cell_value'),
		value: SHEET_CONTEXT_MENU_ACTIONS.copyCellValue,
	}, {
		__type: 'LIST_ITEM',
		disabled: !target.canEdit,
		iconName: COMMON_ICON_NAMES.paste,
		text: i18n.t('sheet.paste'),
		value: SHEET_CONTEXT_MENU_ACTIONS.pasteCellValues,
	}, {
		__type: 'BREAK',
	}, {
		__type: 'LIST_SUBMENU_ITEM',
		disabled: !canFormatTarget,
		iconName: COMMON_ICON_NAMES.stylize_selected_cells,
		submenu: {
			className: 'min_w_220',
			initialState: {
				[SHEET_CONTEXT_MENU_FORMAT_NAMES.borderStyle]: null,
				[SHEET_CONTEXT_MENU_FORMAT_NAMES.fillColor]: target.fillColor || null,
				[SHEET_CONTEXT_MENU_FORMAT_NAMES.textColor]: target.textColor || null,
			},
			options: getSheetContextMenuFormatOptions(target, params),
		},
		text: i18n.t('sheet.format_cells'),
		value: true,
	}, {
		__type: 'LIST_SUBMENU_ITEM',
		disabled: !canFormatTarget,
		iconName: COMMON_ICON_NAMES.format_selected_cells,
		submenu: {
			className: 'min_w_220',
			initialState: {
				[SHEET_CONTEXT_MENU_FORMAT_NAMES.disableMarkdown]: target.disableMarkdown ?? null,
				[SHEET_CONTEXT_MENU_FORMAT_NAMES.fontSize]: target.fontSize || SHEET_CONTEXT_MENU_DEFAULT_FONT_SIZE,
				[SHEET_CONTEXT_MENU_FORMAT_NAMES.bold]: target.bold ?? null,
				[SHEET_CONTEXT_MENU_FORMAT_NAMES.italic]: target.italic ?? null,
				[SHEET_CONTEXT_MENU_FORMAT_NAMES.strikethrough]: target.strikethrough ?? null,
				[SHEET_CONTEXT_MENU_FORMAT_NAMES.underline]: target.underline ?? null,
			},
			options: getSheetContextMenuTextFormatOptions(target),
		},
		text: i18n.t('sheet.format_value'),
		value: true,
	}, {
		__type: 'LIST_SUBMENU_ITEM',
		disabled: !canUseMergeMenu,
		iconName: 'merge-table-horizontal',
		submenu: {
			className: 'min_w_180',
			options: getSheetContextMenuMergeOptions(target),
		},
		text: i18n.t('sheet.merge_cells'),
		value: true,
	}, {
		__type: 'BREAK',
	}, ...getSheetContextMenuDataTableOptions(target), {
		__type: 'BREAK',
	}, {
		__type: 'LIST_ITEM',
		disabled: !canEditStructure,
		iconName: COMMON_ICON_NAMES.row_insert,
		text: i18n.t('sheet.insert_1_row_above'),
		value: SHEET_CONTEXT_MENU_ACTIONS.insertRowAbove,
	}, {
		__type: 'LIST_ITEM',
		disabled: !canEditStructure,
		iconName: COMMON_ICON_NAMES.column_insert,
		text: i18n.t('sheet.insert_1_column_left'),
		value: SHEET_CONTEXT_MENU_ACTIONS.insertColumnLeft,
	}, {
		__type: 'BREAK',
	}, {
		__type: 'LIST_ITEM',
		className: 'cl_err_hv',
		disabled: !canEditStructure,
		iconName: COMMON_ICON_NAMES.delete_row,
		text: i18n.t('sheet.delete_row'),
		value: SHEET_CONTEXT_MENU_ACTIONS.deleteRow,
	}, {
		__type: 'LIST_ITEM',
		className: 'cl_err_hv',
		disabled: !canEditStructure,
		iconName: COMMON_ICON_NAMES.delete_column,
		text: i18n.t('sheet.delete_column'),
		value: SHEET_CONTEXT_MENU_ACTIONS.deleteColumn,
	}];

	return options;
}

/*
 * Return a stable key for one context-menu item event.
 */
function getSheetContextMenuEventKey(
	id: string | null | undefined,
	action: string | null | undefined,
	name: string | null | undefined,
	value: unknown,
) {
	return JSON.stringify({
		action: action || '',
		id: id || '',
		name: name || '',
		value,
	});
}

/*
 * Own the Sheet context-menu PopOver actions.
 */
export function useSheetContextMenu(p: UseSheetContextMenuParams) {
	const {
		onEditCell,
		onCustomizeCells,
		onEditStructure,
		onFormatCells,
		onMergeCells,
		onOpenDataTable,
		onPasteCells,
		onPopulateFromDataTable,
		onUnmergeCells,
		readClipboardText,
		onRemoveCellsFromDataTable,
	} = p;
	const handledEventKeyRef = useRef<string>('');

	/*
	 * Build Sheet context-menu options with hook-owned customize callbacks attached.
	 */
	const getContextMenuOptions = useCallback((target: SheetContextMenuTarget) => {
		return getSheetContextMenuOptions(target, {
			onCustomizeCells,
		});
	}, [onCustomizeCells]);
	const {
		activeTargetRef,
		closeContextMenu: closeSheetContextMenu,
		closePopOver,
		openContextMenu,
		popOver,
	} = useGridContextMenu({
		contextMenuId: SHEET_CONTEXT_MENU_ID,
		getOptions: getContextMenuOptions,
	});

	/*
	 * Open the context menu and clear the previous item-consumption guard.
	 */
	const openSheetContextMenu = useCallback((event: MouseEvent, target: SheetContextMenuTarget) => {
		handledEventKeyRef.current = '';
		openContextMenu(event, target);
	}, [openContextMenu]);

	useEffect(() => {
		const { action, id, name, value } = popOver?.globalState || {};
		const target = activeTargetRef.current;

		if (!target || id !== getGridContextMenuPopOverId(SHEET_CONTEXT_MENU_ID, target) || action !== 'ITEM') {
			return;
		}

		const eventKey = getSheetContextMenuEventKey(id, action, name, value);
		if (handledEventKeyRef.current === eventKey) {
			return;
		}

		handledEventKeyRef.current = eventKey;

		if (SHEET_CONTEXT_MENU_COLOR_FORMAT_NAMES.includes(name as typeof SHEET_CONTEXT_MENU_COLOR_FORMAT_NAMES[number])) {
			if (canFormatSheetContextMenuTarget(target) && (typeof value === 'string' || value === null)) {
				onFormatCells(target, {
					name: name as SheetContextMenuFormatName,
					value,
				});
			}
			closePopOver();
			return;
		}

		if (name === SHEET_CONTEXT_MENU_FORMAT_NAMES.borderStyle) {
			if (canFormatSheetContextMenuTarget(target) && isSheetBorderStylePresetValue(value)) {
				onFormatCells(target, {
					name: SHEET_CONTEXT_MENU_FORMAT_NAMES.borderStyle,
					value,
				});
			}
			closePopOver();
			return;
		}

		if (name === SHEET_CONTEXT_MENU_FORMAT_NAMES.fontSize) {
			const fontSize = normalizeSheetCellFontSize(value);

			if (canFormatSheetContextMenuTarget(target) && fontSize) {
				onFormatCells(target, {
					name: SHEET_CONTEXT_MENU_FORMAT_NAMES.fontSize,
					value: fontSize,
				});
			}
			return;
		}

		if (name === SHEET_CONTEXT_MENU_FORMAT_NAMES.disableMarkdown) {
			if (canFormatSheetContextMenuTarget(target) && typeof value === 'boolean') {
				onFormatCells(target, {
					name: SHEET_CONTEXT_MENU_FORMAT_NAMES.disableMarkdown,
					value,
				});
			}
			return;
		}

		if (SHEET_CONTEXT_MENU_TEXT_STYLE_FORMAT_NAMES.includes(name as typeof SHEET_CONTEXT_MENU_TEXT_STYLE_FORMAT_NAMES[number])) {
			if (canFormatSheetContextMenuTarget(target) && typeof value === 'boolean') {
				onFormatCells(target, {
					name: name as SheetContextMenuFormatName,
					value,
				});
			}
			return;
		}

		switch (value as SheetContextMenuAction) {
			case SHEET_CONTEXT_MENU_ACTIONS.copyCellValue:
				copySheetContextMenuCellValue(target);
				closePopOver();
				break;
			case SHEET_CONTEXT_MENU_ACTIONS.editCell:
				if (target.canEdit) {
					onEditCell(target);
				}
				closePopOver();
				break;
			case SHEET_CONTEXT_MENU_ACTIONS.pasteCellValues:
				if (target.canEdit) {
					void pasteSheetContextMenuCellValues(target, readClipboardText, onPasteCells);
				}
				closePopOver();
				break;
			case SHEET_CONTEXT_MENU_ACTIONS.openDataTable:
				if (target.canOpenDataTable) {
					onOpenDataTable?.(target);
				}
				closePopOver();
				break;
			case SHEET_CONTEXT_MENU_ACTIONS.populateFromDataTable:
				if (target.canPopulateFromDataTable) {
					onPopulateFromDataTable?.(target);
				}
				closePopOver();
				break;
			case SHEET_CONTEXT_MENU_ACTIONS.deleteColumn:
			case SHEET_CONTEXT_MENU_ACTIONS.deleteRow:
			case SHEET_CONTEXT_MENU_ACTIONS.insertColumnLeft:
			case SHEET_CONTEXT_MENU_ACTIONS.insertRowAbove:
				if (canEditSheetContextMenuTargetStructure(target)) {
					onEditStructure?.(target, value as SheetContextMenuStructureAction);
				}
				closePopOver();
				break;
			case SHEET_CONTEXT_MENU_ACTIONS.formatValue:
				closePopOver();
				break;
			case SHEET_CONTEXT_MENU_ACTIONS.mergeCellsAll:
				if (target.canMergeCellsAll) {
					onMergeCells?.(target, 'all');
				}
				closePopOver();
				break;
			case SHEET_CONTEXT_MENU_ACTIONS.mergeCellsVertical:
				if (target.canMergeCellsVertically) {
					onMergeCells?.(target, 'vertical');
				}
				closePopOver();
				break;
			case SHEET_CONTEXT_MENU_ACTIONS.mergeCellsHorizontal:
				if (target.canMergeCellsHorizontally) {
					onMergeCells?.(target, 'horizontal');
				}
				closePopOver();
				break;
			case SHEET_CONTEXT_MENU_ACTIONS.unmergeCells:
				if (target.canUnmergeCells) {
					onUnmergeCells?.(target);
				}
				closePopOver();
				break;
			case SHEET_CONTEXT_MENU_ACTIONS.removeCellsFromDataTable:
				if (target.canRemoveCellsFromDataTable && target.dataTableRegionId) {
					onRemoveCellsFromDataTable?.(target);
				}
				closePopOver();
				break;
			default:
		}
	}, [activeTargetRef, closePopOver, onEditCell, onEditStructure, onFormatCells, onMergeCells, onOpenDataTable, onPasteCells, onPopulateFromDataTable, onRemoveCellsFromDataTable, onUnmergeCells, popOver?.globalState, readClipboardText]);

	return {
		closeSheetContextMenu,
		openSheetContextMenu,
	};
}
