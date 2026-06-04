import i18n from '@jsb188/app/i18n/index.ts';
import type { POListIfaceItem } from '@jsb188/react/types/PopOver.d';
import { COMMON_ICON_NAMES } from '@jsb188/react-web/svgs/Icon';
import { copyTextToClipboard } from '@jsb188/react-web/utils/dom';
import { useEffect } from 'react';
import { getGridContextMenuPopOverId, useGridContextMenu } from './grid-context-menu.ts';

const SHEET_CONTEXT_MENU_ID = 'sheet-context-menu';

const SHEET_CONTEXT_MENU_ACTIONS = {
	copyCellValue: 'COPY_CELL_VALUE',
	editCell: 'EDIT_CELL',
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
	onFormatCells: (target: SheetContextMenuTarget, format: SheetContextMenuFormat) => void;
	onPopulateFromDataTable?: (target: SheetContextMenuTarget) => void;
	onRemoveCellsFromDataTable?: (target: SheetContextMenuTarget) => void;
};

/*
 * Copy one Sheet context-menu target's display value to the clipboard.
 */
function copySheetContextMenuCellValue(target: SheetContextMenuTarget) {
	void copyTextToClipboard(target.displayValue || '');
}

/*
 * Build the PopOver list options for one Sheet context-menu target.
 */
function getSheetContextMenuOptions(target: SheetContextMenuTarget): POListIfaceItem[] {
	const options: POListIfaceItem[] = [{
		__type: 'LIST_ITEM',
		disabled: !target.canPopulateFromDataTable,
		iconName: COMMON_ICON_NAMES.data_table,
		text: i18n.t('sheet.create_portal_to_data_table'),
		value: SHEET_CONTEXT_MENU_ACTIONS.populateFromDataTable,
	}, {
		__type: 'LIST_ITEM',
		disabled: !target.canEdit,
		iconName: COMMON_ICON_NAMES.edit_note,
		text: i18n.t('sheet.edit_cell'),
		value: SHEET_CONTEXT_MENU_ACTIONS.editCell,
	}, {
		__type: 'LIST_SUBMENU_ITEM',
		disabled: !target.canEdit,
		submenu: {
			className: 'min_w_220',
			initialState: {
				[SHEET_CONTEXT_MENU_FORMAT_NAMES.fillColor]: target.fillColor || null,
				[SHEET_CONTEXT_MENU_FORMAT_NAMES.textColor]: target.textColor || null,
			},
			options: [{
				__type: 'LIST_SUBTITLE',
				text: i18n.t('sheet.text_color'),
			}, {
				__type: 'LIST_COLORS',
				name: SHEET_CONTEXT_MENU_FORMAT_NAMES.textColor,
				selectedValue: target.textColor || null,
			}, {
				__type: 'LIST_SUBTITLE',
				text: i18n.t('sheet.fill_color'),
			}, {
				__type: 'LIST_COLORS',
				name: SHEET_CONTEXT_MENU_FORMAT_NAMES.fillColor,
				selectedValue: target.fillColor || null,
			}],
		},
		text: i18n.t('sheet.format_cells'),
		value: true,
	}, {
		__type: 'LIST_ITEM',
		iconName: COMMON_ICON_NAMES.copy,
		text: i18n.t('sheet.copy_cell_value'),
		value: SHEET_CONTEXT_MENU_ACTIONS.copyCellValue,
	}];

	if (target.dataTableRegionId) {
		options.push({
			__type: 'BREAK',
		}, {
			__type: 'LIST_SUBTITLE',
			text: i18n.t('sheet.data_table'),
		}, {
			__type: 'LIST_ITEM',
			disabled: !target.canRemoveCellsFromDataTable,
			iconName: COMMON_ICON_NAMES.delete,
			text: i18n.t('sheet.remove_portal_to_data_table'),
			value: SHEET_CONTEXT_MENU_ACTIONS.removeCellsFromDataTable,
		});
	}

	return options;
}

/*
 * Own the Sheet context-menu PopOver actions.
 */
export function useSheetContextMenu(p: UseSheetContextMenuParams) {
	const {
		onEditCell,
		onFormatCells,
		onPopulateFromDataTable,
		onRemoveCellsFromDataTable,
	} = p;
	const {
		activeTargetRef,
		closeContextMenu: closeSheetContextMenu,
		closePopOver,
		openContextMenu: openSheetContextMenu,
		popOver,
	} = useGridContextMenu({
		contextMenuId: SHEET_CONTEXT_MENU_ID,
		getOptions: getSheetContextMenuOptions,
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
			case SHEET_CONTEXT_MENU_ACTIONS.populateFromDataTable:
				if (target.canPopulateFromDataTable) {
					onPopulateFromDataTable?.(target);
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
	}, [activeTargetRef, closePopOver, onEditCell, onFormatCells, onPopulateFromDataTable, onRemoveCellsFromDataTable, popOver?.globalState]);

	return {
		closeSheetContextMenu,
		openSheetContextMenu,
	};
}
