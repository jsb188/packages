import i18n from '@jsb188/app/i18n/index.ts';
import type { POListIfaceItem } from '@jsb188/react/types/PopOver.d';
import { usePopOver, type OpenModalPopUpFn } from '@jsb188/react/states';
import { COMMON_ICON_NAMES } from '@jsb188/react-web/svgs/Icon';
import { copyTextToClipboard } from '@jsb188/react-web/utils/dom';
import { useCallback, useEffect, useRef } from 'react';

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
	viewId?: string | null;
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
 * Return the PopOver remount key for one dataTable cell context menu.
 */

function getDataTableContextMenuPopOverId(target: Pick<DataTableContextMenuTarget, 'cellKey' | 'rowId'>) {
	return `${SHEET_CONTEXT_MENU_ID}:${target.rowId}:${target.cellKey}`;
}

/*
 * Build the PopOver list options for one dataTable context-menu target.
 */

function getDataTableContextMenuOptions(target: DataTableContextMenuTarget): POListIfaceItem[] {
	const options: POListIfaceItem[] = [{
		__type: 'LIST_ITEM',
		disabled: !target.canEdit,
		iconName: COMMON_ICON_NAMES.edit_note,
		text: i18n.t('dataTable.context_menu_edit_cell'),
		value: SHEET_CONTEXT_MENU_ACTIONS.editCell,
	}, {
		__type: 'LIST_ITEM',
		disabled: !target.canOpen,
		iconName: 'external-link',
		text: i18n.t('dataTable.context_menu_open_cell'),
		value: SHEET_CONTEXT_MENU_ACTIONS.openCell,
	}, {
		__type: 'LIST_ITEM',
		iconName: COMMON_ICON_NAMES.copy,
		text: i18n.t('dataTable.context_menu_copy_cell_value'),
		value: SHEET_CONTEXT_MENU_ACTIONS.copyCellValue,
	}];

	if (target.canDeleteRow) {
		options.push({
			__type: 'BREAK',
		}, {
			__type: 'LIST_ITEM',
			className: 'cl_err',
			iconName: COMMON_ICON_NAMES.delete,
			text: i18n.t('dataTable.delete_row'),
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
			viewId: target.viewId || null,
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
	const { closePopOver, openPopOver, popOver } = usePopOver();
	const activeTargetRef = useRef<DataTableContextMenuTarget<Lookup> | null>(null);

	/*
	 * Open a PopOver menu at the user's pointer position.
	 */

	const openDataTableContextMenu = useCallback((event: MouseEvent, target: DataTableContextMenuTarget<Lookup>) => {
		activeTargetRef.current = target;
		openPopOver({
			animationClassName: 'anim_dropdown_top_right on_mount spd_0',
			doNotFixToBottom: true,
			id: getDataTableContextMenuPopOverId(target),
			name: 'PO_LIST',
			offsetX: 0,
			offsetY: 4,
			position: 'bottom_left',
			rect: {
				bottom: event.clientY,
				height: 0,
				left: event.clientX,
				right: event.clientX,
				top: event.clientY,
				width: 0,
				x: event.clientX,
				y: event.clientY,
			},
			variables: {
				className: 'min_w_180',
				options: getDataTableContextMenuOptions(target),
			},
			zClassName: 'z8',
		});
	}, [openPopOver]);

	/*
	 * Close the active DataTable context menu when it is currently mounted.
	 */

	const closeDataTableContextMenu = useCallback(() => {
		const target = activeTargetRef.current;

		if (!target || popOver?.id !== getDataTableContextMenuPopOverId(target)) {
			return;
		}

		activeTargetRef.current = null;
		closePopOver();
	}, [closePopOver, popOver?.id]);

	useEffect(() => {
		const { action, id, value } = popOver?.globalState || {};
		const target = activeTargetRef.current;

		if (!target || id !== getDataTableContextMenuPopOverId(target) || action !== 'ITEM') {
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
