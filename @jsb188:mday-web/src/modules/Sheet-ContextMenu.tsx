import i18n from '@jsb188/app/i18n/index.ts';
import type { POListIfaceItem } from '@jsb188/react/types/PopOver.d';
import { COMMON_ICON_NAMES } from '@jsb188/react-web/svgs/Icon';
import { copyTextToClipboard } from '@jsb188/react-web/utils/dom';
import { useEffect } from 'react';
import { getSheetGridContextMenuPopOverId, useSheetGridContextMenu } from './sheet-grid-context-menu.ts';

const SHEET_CONTEXT_MENU_ID = 'sheet-context-menu';

const SHEET_CONTEXT_MENU_ACTIONS = {
	copyCellValue: 'COPY_CELL_VALUE',
	editCell: 'EDIT_CELL',
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
	return [{
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
}

/*
 * Own the Sheet context-menu PopOver actions.
 */

export function useSheetContextMenu(p: UseSheetContextMenuParams) {
	const {
		onEditCell,
		onFormatCells,
	} = p;
	const {
		activeTargetRef,
		closeContextMenu: closeSheetContextMenu,
		closePopOver,
		openContextMenu: openSheetContextMenu,
		popOver,
	} = useSheetGridContextMenu({
		contextMenuId: SHEET_CONTEXT_MENU_ID,
		getOptions: getSheetContextMenuOptions,
	});

	useEffect(() => {
		const { action, id, name, value } = popOver?.globalState || {};
		const target = activeTargetRef.current;

		if (!target || id !== getSheetGridContextMenuPopOverId(SHEET_CONTEXT_MENU_ID, target) || action !== 'ITEM') {
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
			default:
		}
	}, [closePopOver, onEditCell, onFormatCells, popOver?.globalState]);

	return {
		closeSheetContextMenu,
		openSheetContextMenu,
	};
}
