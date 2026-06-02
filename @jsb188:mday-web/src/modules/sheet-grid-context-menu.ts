import { usePopOver } from '@jsb188/react/states';
import type { POListIfaceItem } from '@jsb188/react/types/PopOver.d';
import { useCallback, useRef } from 'react';

export type SheetGridContextMenuTargetBase = {
	cellKey: string;
	rowId: string;
};

type UseSheetGridContextMenuParams<Target extends SheetGridContextMenuTargetBase> = {
	contextMenuId: string;
	getOptions: (target: Target) => POListIfaceItem[];
};

/*
 * Return the PopOver remount key for one shared sheet-grid context menu target.
 */

export function getSheetGridContextMenuPopOverId(contextMenuId: string, target: SheetGridContextMenuTargetBase) {
	return `${contextMenuId}:${target.rowId}:${target.cellKey}`;
}

/*
 * Return whether one event target lives inside a mounted PopOver.
 */

function isSheetGridContextMenuPopOverTarget(target: EventTarget | null) {
	return target instanceof Element && Boolean(target.closest('.popover'));
}

/*
 * Return whether one grid pointerdown should dismiss the mounted context menu.
 */

export function shouldDismissSheetGridContextMenuOnPointerDown(event: PointerEvent) {
	return event.button === 0 && !isSheetGridContextMenuPopOverTarget(event.target);
}

/*
 * Close a mounted grid context menu when one primary pointerdown starts in the grid.
 */

export function dismissSheetGridContextMenuOnPointerDown(event: PointerEvent, closeContextMenu: () => void) {
	if (shouldDismissSheetGridContextMenuOnPointerDown(event)) {
		closeContextMenu();
	}
}

/*
 * Own shared PopOver open, close, and active-target state for sheet-like context menus.
 */

export function useSheetGridContextMenu<Target extends SheetGridContextMenuTargetBase>(params: UseSheetGridContextMenuParams<Target>) {
	const { contextMenuId, getOptions } = params;
	const { closePopOver, openPopOver, popOver } = usePopOver();
	const activeTargetRef = useRef<Target | null>(null);

	/*
	 * Open a PopOver menu at the user's pointer position.
	 */

	const openContextMenu = useCallback((event: MouseEvent, target: Target) => {
		activeTargetRef.current = target;
		openPopOver({
			animationClassName: 'anim_dropdown_top_right on_mount spd_0',
			doNotFixToBottom: true,
			id: getSheetGridContextMenuPopOverId(contextMenuId, target),
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
				options: getOptions(target),
			},
			zClassName: 'z8',
		});
	}, [contextMenuId, getOptions, openPopOver]);

	/*
	 * Close the active context menu when it is currently mounted.
	 */

	const closeContextMenu = useCallback(() => {
		const target = activeTargetRef.current;

		if (!target || popOver?.id !== getSheetGridContextMenuPopOverId(contextMenuId, target)) {
			return;
		}

		activeTargetRef.current = null;
		closePopOver();
	}, [closePopOver, contextMenuId, popOver?.id]);

	return {
		activeTargetRef,
		closeContextMenu,
		closePopOver,
		openContextMenu,
		popOver,
	};
}
