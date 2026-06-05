import i18n from '@jsb188/app/i18n/index.ts';
import type { POListIfaceItem } from '@jsb188/react/types/PopOver.d';
import { type OpenModalPopUpFn } from '@jsb188/react/states';
import { COMMON_ICON_NAMES } from '@jsb188/react-web/svgs/Icon';
import { copyTextToClipboard } from '@jsb188/react-web/utils/dom';
import { useEffect } from 'react';
import { getGridContextMenuPopOverId, useGridContextMenu } from '@jsb188/sheet/modules/grid-context-menu';

export const SHEET_CONTEXT_MENU_ID = 'dataTable-context-menu';
export const SHEET_DELETE_ROW_POPUP_PRESET = 'DELETE_SHEET_ROW';

export const SHEET_CONTEXT_MENU_ACTIONS = {
	copyCellValue: 'COPY_CELL_VALUE',
	deleteRow: 'DELETE_ROW',
	editCell: 'EDIT_CELL',
	openCell: 'OPEN_CELL',
} as const;

export type DataTableArrowNavigationDirection = 'left' | 'right' | 'up' | 'down';
export type DataTableContextMenuAction = typeof SHEET_CONTEXT_MENU_ACTIONS[keyof typeof SHEET_CONTEXT_MENU_ACTIONS];

export type DataTableContextMenuTarget<Lookup = unknown> = {
	canDeleteRow: boolean;
	canEdit: boolean;
	canOpen: boolean;
	cellKey: string;
	displayValue: string;
	lookup: Lookup;
	organizationId: string;
	rowId: string;
	rowNumber?: number | null;
	dataTableId: string;
};

type UseDataTableContextMenuParams<Lookup> = {
	openModalPopUp: OpenModalPopUpFn;
	onEditCell: (target: DataTableContextMenuTarget<Lookup>) => void;
	onOpenCell: (target: DataTableContextMenuTarget<Lookup>) => void;
};

/*
 * Copy one dataTable context-menu target's display value to the clipboard.
 */

function copyDataTableContextMenuCellValue(target: DataTableContextMenuTarget) {
	void copyTextToClipboard(target.displayValue || '');
}

/*
 * Build the PopOver list options for one dataTable context-menu target.
 */

function getDataTableContextMenuOptions(target: DataTableContextMenuTarget): POListIfaceItem[] {
	const options: POListIfaceItem[] = [{
		__type: 'LIST_ITEM',
		disabled: !target.canEdit,
		iconName: COMMON_ICON_NAMES.edit_note,
		text: i18n.t('sheet.context_menu_edit_cell'),
		value: SHEET_CONTEXT_MENU_ACTIONS.editCell,
	}, {
		__type: 'LIST_ITEM',
		disabled: !target.canOpen,
		iconName: 'external-link',
		text: i18n.t('sheet.context_menu_open_cell'),
		value: SHEET_CONTEXT_MENU_ACTIONS.openCell,
	}, {
		__type: 'LIST_ITEM',
		iconName: COMMON_ICON_NAMES.copy,
		text: i18n.t('sheet.context_menu_copy_cell_value'),
		value: SHEET_CONTEXT_MENU_ACTIONS.copyCellValue,
	}];

	if (target.canDeleteRow) {
		options.push({
			__type: 'BREAK',
		}, {
			__type: 'LIST_ITEM',
			className: 'cl_err',
			iconName: COMMON_ICON_NAMES.delete,
			text: i18n.t('sheet.delete_row'),
			value: SHEET_CONTEXT_MENU_ACTIONS.deleteRow,
		});
	}

	return options;
}

/*
 * Open the delete-row confirmation popup for a menu target.
 */

function openDataTableDeleteRowPopUp<Lookup>(
	openModalPopUp: OpenModalPopUpFn,
	target: DataTableContextMenuTarget<Lookup>,
) {
	openModalPopUp({
		name: SHEET_DELETE_ROW_POPUP_PRESET,
		preset: SHEET_DELETE_ROW_POPUP_PRESET,
		props: {
			allowDelete: target.canDeleteRow,
			organizationId: target.organizationId,
			rowNumber: target.rowNumber,
			dataTableId: target.dataTableId,
			dataTableRowId: target.rowId,
		},
	});
}

/*
 * Own the DataTable context-menu PopOver actions.
 */

export function useDataTableContextMenu<Lookup>(p: UseDataTableContextMenuParams<Lookup>) {
	const {
		onEditCell,
		onOpenCell,
		openModalPopUp,
	} = p;
	const {
		activeTargetRef,
		closeContextMenu: closeDataTableContextMenu,
		closePopOver,
		openContextMenu: openDataTableContextMenu,
		popOver,
	} = useGridContextMenu<DataTableContextMenuTarget<Lookup>>({
		contextMenuId: SHEET_CONTEXT_MENU_ID,
		getOptions: getDataTableContextMenuOptions,
	});

	useEffect(() => {
		const { action, id, value } = popOver?.globalState || {};
		const target = activeTargetRef.current;

		if (!target || id !== getGridContextMenuPopOverId(SHEET_CONTEXT_MENU_ID, target) || action !== 'ITEM') {
			return;
		}

		switch (value as DataTableContextMenuAction) {
			case SHEET_CONTEXT_MENU_ACTIONS.copyCellValue:
				copyDataTableContextMenuCellValue(target);
				closePopOver();
				break;
			case SHEET_CONTEXT_MENU_ACTIONS.deleteRow:
				openDataTableDeleteRowPopUp(openModalPopUp, target);
				closePopOver();
				break;
			case SHEET_CONTEXT_MENU_ACTIONS.editCell:
				if (target.canEdit) {
					onEditCell(target);
				}
				closePopOver();
				break;
			case SHEET_CONTEXT_MENU_ACTIONS.openCell:
				if (target.canOpen) {
					onOpenCell(target);
				}
				closePopOver();
				break;
			default:
		}
	}, [closePopOver, onEditCell, onOpenCell, openModalPopUp, popOver?.globalState]);

	return {
		closeDataTableContextMenu,
		openDataTableContextMenu,
	};
}
