import i18n from '@jsb188/app/i18n/index.ts';
import type { POListIfaceItem } from '@jsb188/react/types/PopOver.d';
import { useKeyDown, usePopOver, type OpenModalPopUpFn } from '@jsb188/react/states';
import { COMMON_ICON_NAMES } from '@jsb188/react-web/svgs/Icon';
import { copyTextToClipboard } from '@jsb188/react-web/utils/dom';
import { useCallback, useEffect, useRef } from 'react';

export const SHEET_CONTEXT_MENU_ID = 'sheet-context-menu';
export const SHEET_DELETE_ROW_POPUP_PRESET = 'DELETE_SHEET_ROW';

export const SHEET_CONTEXT_MENU_ACTIONS = {
	copyCellValue: 'COPY_CELL_VALUE',
	deleteRow: 'DELETE_ROW',
	editCell: 'EDIT_CELL',
	openCell: 'OPEN_CELL',
} as const;

export type SheetArrowNavigationDirection = 'left' | 'right' | 'up' | 'down';
export type SheetContextMenuAction = typeof SHEET_CONTEXT_MENU_ACTIONS[keyof typeof SHEET_CONTEXT_MENU_ACTIONS];

export type SheetContextMenuTarget<Lookup = unknown> = {
	canDeleteRow: boolean;
	canEdit: boolean;
	canOpen: boolean;
	cellKey: string;
	displayValue: string;
	lookup: Lookup;
	organizationId: string;
	rowId: string;
	rowNumber?: number | null;
	sheetId: string;
	viewId?: string | null;
};

type UseSheetContextMenuParams<Lookup> = {
	copyShortcutDisabled?: boolean;
	onArrowKeyNavigation?: (direction: SheetArrowNavigationDirection) => void;
	onEnterKeyEdit?: (target: SheetContextMenuTarget<Lookup>) => void;
	openModalPopUp: OpenModalPopUpFn;
	onEditCell: (target: SheetContextMenuTarget<Lookup>) => void;
	onOpenCell: (target: SheetContextMenuTarget<Lookup>) => void;
	selectedTarget?: SheetContextMenuTarget<Lookup> | null;
};

/*
 * Return whether the active document element is already handling text input.
 */

function isSheetCopyShortcutInputActive() {
	const activeElement = globalThis.document?.activeElement as HTMLElement | null;

	return !!activeElement && (
		activeElement.matches('input, textarea, select, [contenteditable="true"]') ||
		!!activeElement.closest('[data-sheet-editor="true"], [data-sheet-header-editor="true"], [data-sheet-select-editor="true"], [data-sheet-date-editor="true"], [data-sheet-inbound-contact-editor="true"]')
	);
}

/*
 * Return whether the active document element is already handling a sheet-local editor.
 */

function isSheetEditorInputActive() {
	const activeElement = globalThis.document?.activeElement as HTMLElement | null;

	return !!activeElement && !!activeElement.closest('[data-sheet-editor="true"], [data-sheet-header-editor="true"], [data-sheet-select-editor="true"], [data-sheet-date-editor="true"], [data-sheet-inbound-contact-editor="true"]');
}

/*
 * Convert a browser Arrow key value into a sheet navigation direction.
 */

function getSheetArrowNavigationDirection(pressed?: string | null): SheetArrowNavigationDirection | null {
	switch (pressed) {
		case 'ArrowLeft':
			return 'left';
		case 'ArrowRight':
			return 'right';
		case 'ArrowUp':
			return 'up';
		case 'ArrowDown':
			return 'down';
		default:
			return null;
	}
}

/*
 * Copy one sheet context-menu target's display value to the clipboard.
 */

function copySheetContextMenuCellValue(target: SheetContextMenuTarget) {
	void copyTextToClipboard(target.displayValue || '');
}

/*
 * Return the PopOver remount key for one sheet cell context menu.
 */

function getSheetContextMenuPopOverId(target: Pick<SheetContextMenuTarget, 'cellKey' | 'rowId'>) {
	return `${SHEET_CONTEXT_MENU_ID}:${target.rowId}:${target.cellKey}`;
}

/*
 * Build the PopOver list options for one sheet context-menu target.
 */

function getSheetContextMenuOptions(target: SheetContextMenuTarget): POListIfaceItem[] {
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

function openSheetDeleteRowPopUp<Lookup>(
	openModalPopUp: OpenModalPopUpFn,
	target: SheetContextMenuTarget<Lookup>,
) {
	openModalPopUp({
		name: SHEET_DELETE_ROW_POPUP_PRESET,
		preset: SHEET_DELETE_ROW_POPUP_PRESET,
		props: {
			allowDelete: target.canDeleteRow,
			organizationId: target.organizationId,
			rowNumber: target.rowNumber,
			sheetId: target.sheetId,
			sheetRowId: target.rowId,
			viewId: target.viewId || null,
		},
	});
}

/*
 * Own the Sheet context-menu PopOver actions and copy shortcut behavior.
 */

export function useSheetContextMenu<Lookup>(p: UseSheetContextMenuParams<Lookup>) {
	const {
		copyShortcutDisabled,
		onArrowKeyNavigation,
		onEnterKeyEdit,
		onEditCell,
		onOpenCell,
		openModalPopUp,
		selectedTarget,
	} = p;
	const [keyDown, setKeyDown] = useKeyDown();
	const { closePopOver, openPopOver, popOver } = usePopOver();
	const activeTargetRef = useRef<SheetContextMenuTarget<Lookup> | null>(null);
	const onArrowKeyNavigationRef = useRef<typeof onArrowKeyNavigation>(onArrowKeyNavigation);
	const onEnterKeyEditRef = useRef<typeof onEnterKeyEdit>(onEnterKeyEdit);
	const pendingSheetKeyboardPressedRef = useRef<string | null>(null);
	const selectedTargetRef = useRef<SheetContextMenuTarget<Lookup> | null>(selectedTarget || null);

	onArrowKeyNavigationRef.current = onArrowKeyNavigation;
	onEnterKeyEditRef.current = onEnterKeyEdit;
	selectedTargetRef.current = selectedTarget || null;

	/*
	 * Open a PopOver menu at the user's pointer position.
	 */

	const openSheetContextMenu = useCallback((event: MouseEvent, target: SheetContextMenuTarget<Lookup>) => {
		activeTargetRef.current = target;
		openPopOver({
			animationClassName: 'anim_dropdown_top_right on_mount spd_0',
			doNotFixToBottom: true,
			id: getSheetContextMenuPopOverId(target),
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
				options: getSheetContextMenuOptions(target),
			},
			zClassName: 'z8',
		});
	}, [openPopOver]);

	/*
	 * Close the active Sheet context menu when it is currently mounted.
	 */

	const closeSheetContextMenu = useCallback(() => {
		const target = activeTargetRef.current;

		if (!target || popOver?.id !== getSheetContextMenuPopOverId(target)) {
			return;
		}

		activeTargetRef.current = null;
		closePopOver();
	}, [closePopOver, popOver?.id]);

	useEffect(() => {
		const { action, id, value } = popOver?.globalState || {};
		const target = activeTargetRef.current;

		if (!target || id !== getSheetContextMenuPopOverId(target) || action !== 'ITEM') {
			return;
		}

		switch (value as SheetContextMenuAction) {
			case SHEET_CONTEXT_MENU_ACTIONS.copyCellValue:
				copySheetContextMenuCellValue(target);
				closePopOver();
				break;
			case SHEET_CONTEXT_MENU_ACTIONS.deleteRow:
				openSheetDeleteRowPopUp(openModalPopUp, target);
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

	useEffect(() => {
		const canHandleSheetKeyboard = (pressed: string | null | undefined) => {
			const target = selectedTargetRef.current;

			return Boolean(
				!copyShortcutDisabled &&
				!keyDown.alert &&
				!keyDown.modal &&
				!keyDown.metaKey &&
				(
					(getSheetArrowNavigationDirection(pressed) && onArrowKeyNavigationRef.current) ||
					(pressed === 'Enter' && target && onEnterKeyEditRef.current)
				) &&
				!isSheetEditorInputActive()
			);
		};
		const onKeyDown = (event: KeyboardEvent) => {
			const arrowDirection = getSheetArrowNavigationDirection(event.key);
			const shouldSuppressSheetArrowScroll = Boolean(
				arrowDirection &&
				copyShortcutDisabled &&
				!keyDown.alert &&
				!keyDown.modal &&
				!keyDown.metaKey
			);

			if (shouldSuppressSheetArrowScroll) {
				event.preventDefault();
				event.stopImmediatePropagation();
				return;
			}

			if (!canHandleSheetKeyboard(event.key)) {
				return;
			}

			event.preventDefault();
			event.stopImmediatePropagation();
			pendingSheetKeyboardPressedRef.current = event.key;
			setKeyDown({
				metaKey: event.metaKey || event.ctrlKey,
				pressed: event.key,
			});
		};
		const target = selectedTargetRef.current;
		const arrowDirection = getSheetArrowNavigationDirection(keyDown.pressed);
		const pendingSheetKeyboardPressed = pendingSheetKeyboardPressedRef.current;

		globalThis.addEventListener?.('keydown', onKeyDown, true);

		if (arrowDirection && pendingSheetKeyboardPressed === keyDown.pressed && canHandleSheetKeyboard(keyDown.pressed)) {
			pendingSheetKeyboardPressedRef.current = null;
			onArrowKeyNavigationRef.current?.(arrowDirection);
			setKeyDown({
				metaKey: false,
				pressed: null,
			});
		} else if (keyDown.pressed === 'Enter' && pendingSheetKeyboardPressed === keyDown.pressed && target && canHandleSheetKeyboard(keyDown.pressed)) {
			pendingSheetKeyboardPressedRef.current = null;
			onEnterKeyEditRef.current?.(target);
			setKeyDown({
				metaKey: false,
				pressed: null,
			});
		} else if (
			copyShortcutDisabled ||
			keyDown.alert ||
			keyDown.modal ||
			!keyDown.metaKey ||
			keyDown.pressed?.toLowerCase() !== 'c' ||
			!target ||
			isSheetCopyShortcutInputActive()
		) {
			// No-op.
		} else {
			copySheetContextMenuCellValue(target);
		}

		return () => {
			globalThis.removeEventListener?.('keydown', onKeyDown, true);
		};
	}, [copyShortcutDisabled, keyDown, setKeyDown]);

	return {
		closeSheetContextMenu,
		openSheetContextMenu,
	};
}
