import i18n from '@jsb188/app/i18n/index.ts';
import type { POListIfaceItem } from '@jsb188/react/types/PopOver.d';
import { COMMON_ICON_NAMES } from '@jsb188/react-web/svgs/Icon';
import { copyTextToClipboard } from '@jsb188/react-web/utils/dom';
import { useCallback, useEffect } from 'react';
import { getGridContextMenuPopOverId, useGridContextMenu } from './grid-context-menu.ts';

const SHEET_CONTEXT_MENU_ID = 'sheet-context-menu';

const SHEET_CONTEXT_MENU_ACTIONS = {
	copyCellValue: 'COPY_CELL_VALUE',
	deleteColumn: 'DELETE_COLUMN',
	deleteRow: 'DELETE_ROW',
	editCell: 'EDIT_CELL',
	formatValue: 'FORMAT_VALUE',
	insertColumnLeft: 'INSERT_COLUMN_LEFT',
	insertRowAbove: 'INSERT_ROW_ABOVE',
	pasteCellValues: 'PASTE_CELL_VALUES',
	populateFromDataTable: 'POPULATE_FROM_DATA_TABLE',
	removeCellsFromDataTable: 'REMOVE_CELLS_FROM_DATA_TABLE',
} as const;

const SHEET_CONTEXT_MENU_FORMAT_NAMES = {
	fillColor: 'fillColor',
	textColor: 'textColor',
} as const;

export type SheetContextMenuAction = typeof SHEET_CONTEXT_MENU_ACTIONS[keyof typeof SHEET_CONTEXT_MENU_ACTIONS];

export type SheetContextMenuFormatName = typeof SHEET_CONTEXT_MENU_FORMAT_NAMES[keyof typeof SHEET_CONTEXT_MENU_FORMAT_NAMES];

export type SheetContextMenuFormat = {
	name: SheetContextMenuFormatName;
	value: string;
};

export type SheetContextMenuCellTarget = {
	cellKey: string;
	rowId: string;
};

export type SheetContextMenuTarget = {
	canEdit: boolean;
	canPopulateFromDataTable?: boolean;
	canRemoveCellsFromDataTable?: boolean;
	dataTableRegionId?: string | null;
	cells: SheetContextMenuCellTarget[];
	cellKey: string;
	displayValue: string;
	fillColor?: string | null;
	rowId: string;
	textColor?: string | null;
};

type UseSheetContextMenuParams = {
	onEditCell: (target: SheetContextMenuTarget) => void;
	onCustomizeCells?: (target: SheetContextMenuTarget, formatName: SheetContextMenuFormatName) => void;
	onFormatCells: (target: SheetContextMenuTarget, format: SheetContextMenuFormat) => void;
	onPasteCells?: (target: SheetContextMenuTarget, clipboardText: string) => void | Promise<void>;
	onPopulateFromDataTable?: (target: SheetContextMenuTarget) => void;
	readClipboardText?: () => Promise<string>;
	onRemoveCellsFromDataTable?: (target: SheetContextMenuTarget) => void;
};

type GetSheetContextMenuOptionsParams = {
	onCustomizeCells?: (target: SheetContextMenuTarget, formatName: SheetContextMenuFormatName) => void;
};

/*
 * Copy one Sheet context-menu target's display value to the clipboard.
 */
function copySheetContextMenuCellValue(target: SheetContextMenuTarget) {
	void copyTextToClipboard(target.displayValue || '');
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
 * Build the PopOver list options for one Sheet context-menu target.
 */
function getSheetContextMenuOptions(target: SheetContextMenuTarget, params?: GetSheetContextMenuOptionsParams): POListIfaceItem[] {
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
		disabled: !target.canEdit,
		iconName: COMMON_ICON_NAMES.stylize_selected_cells,
		submenu: {
			className: 'min_w_220',
			initialState: {
				[SHEET_CONTEXT_MENU_FORMAT_NAMES.fillColor]: target.fillColor || null,
				[SHEET_CONTEXT_MENU_FORMAT_NAMES.textColor]: target.textColor || null,
			},
			options: [{
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
			}],
		},
		text: i18n.t('sheet.format_cells'),
		value: true,
	}, {
		__type: 'LIST_ITEM',
		disabled: !target.canEdit,
		iconName: COMMON_ICON_NAMES.format_selected_cells,
		text: i18n.t('sheet.format_value'),
		value: SHEET_CONTEXT_MENU_ACTIONS.formatValue,
	}, {
		__type: 'BREAK',
	}, {
		__type: 'LIST_ITEM',
		disabled: !target.canPopulateFromDataTable,
		iconName: COMMON_ICON_NAMES.insert_from_data_table,
		text: i18n.t('sheet.insert_from_data_table'),
		value: SHEET_CONTEXT_MENU_ACTIONS.populateFromDataTable,
	}, {
		__type: 'BREAK',
	}, {
		__type: 'LIST_ITEM',
		disabled: !target.canEdit,
		iconName: COMMON_ICON_NAMES.row_insert,
		text: i18n.t('sheet.insert_1_row_above'),
		value: SHEET_CONTEXT_MENU_ACTIONS.insertRowAbove,
	}, {
		__type: 'LIST_ITEM',
		disabled: !target.canEdit,
		iconName: COMMON_ICON_NAMES.column_insert,
		text: i18n.t('sheet.insert_1_column_left'),
		value: SHEET_CONTEXT_MENU_ACTIONS.insertColumnLeft,
	}, {
		__type: 'BREAK',
	}, {
		__type: 'LIST_ITEM',
		className: 'cl_err_hv',
		disabled: !target.canEdit,
		iconName: COMMON_ICON_NAMES.delete_row,
		text: i18n.t('sheet.delete_row'),
		value: SHEET_CONTEXT_MENU_ACTIONS.deleteRow,
	}, {
		__type: 'LIST_ITEM',
		className: 'cl_err_hv',
		disabled: !target.canEdit,
		iconName: COMMON_ICON_NAMES.delete_column,
		text: i18n.t('sheet.delete_column'),
		value: SHEET_CONTEXT_MENU_ACTIONS.deleteColumn,
	}];

	return options;
}

/*
 * Own the Sheet context-menu PopOver actions.
 */
export function useSheetContextMenu(p: UseSheetContextMenuParams) {
	const {
		onEditCell,
		onCustomizeCells,
		onFormatCells,
		onPasteCells,
		onPopulateFromDataTable,
		readClipboardText,
		onRemoveCellsFromDataTable,
	} = p;

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
		openContextMenu: openSheetContextMenu,
		popOver,
	} = useGridContextMenu({
		contextMenuId: SHEET_CONTEXT_MENU_ID,
		getOptions: getContextMenuOptions,
	});

	useEffect(() => {
		const { action, id, name, value } = popOver?.globalState || {};
		const target = activeTargetRef.current;

		if (!target || id !== getGridContextMenuPopOverId(SHEET_CONTEXT_MENU_ID, target) || action !== 'ITEM') {
			return;
		}

		if (name === SHEET_CONTEXT_MENU_FORMAT_NAMES.textColor || name === SHEET_CONTEXT_MENU_FORMAT_NAMES.fillColor) {
			if (target.canEdit && typeof value === 'string') {
				onFormatCells(target, {
					name,
					value,
				});
			}
			closePopOver();
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
			case SHEET_CONTEXT_MENU_ACTIONS.populateFromDataTable:
				if (target.canPopulateFromDataTable) {
					onPopulateFromDataTable?.(target);
				}
				closePopOver();
				break;
			case SHEET_CONTEXT_MENU_ACTIONS.deleteColumn:
			case SHEET_CONTEXT_MENU_ACTIONS.deleteRow:
			case SHEET_CONTEXT_MENU_ACTIONS.formatValue:
			case SHEET_CONTEXT_MENU_ACTIONS.insertColumnLeft:
			case SHEET_CONTEXT_MENU_ACTIONS.insertRowAbove:
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
	}, [activeTargetRef, closePopOver, onEditCell, onFormatCells, onPasteCells, onPopulateFromDataTable, onRemoveCellsFromDataTable, popOver?.globalState, readClipboardText]);

	return {
		closeSheetContextMenu,
		openSheetContextMenu,
	};
}
