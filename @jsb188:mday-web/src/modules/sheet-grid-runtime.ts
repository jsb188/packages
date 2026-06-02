import { useCallback, useEffect, useState } from 'react';

export type SheetGridElementSize = {
	height: number;
	width: number;
};

export type SheetGridCellSelection = {
	cellKey: string;
	rowId: string;
};

export type SheetGridKeyboardElementSelectors = {
	editorSelector?: string;
	headerEditorSelector?: string;
	localEditorSelector?: string;
};

/*
 * Keep the current size of one sheet-like grid DOM element in React state.
 */

export function useSheetGridElementSize<T extends HTMLElement>() {
	const [node, setNode] = useState<T | null>(null);
	const [size, setSize] = useState<SheetGridElementSize>({
		height: 0,
		width: 0,
	});

	const ref = useCallback((nextNode: T | null) => {
		setNode(nextNode);
	}, []);

	useEffect(() => {
		if (!node) {
			return;
		}

		const updateSize = () => {
			setSize((currentSize) => {
				const nextSize = {
					height: node.clientHeight || 0,
					width: node.clientWidth || 0,
				};

				if (currentSize.height === nextSize.height && currentSize.width === nextSize.width) {
					return currentSize;
				}

				return nextSize;
			});
		};

		updateSize();

		if (typeof ResizeObserver === 'undefined') {
			return;
		}

		const observer = new ResizeObserver(updateSize);
		observer.observe(node);

		return () => {
			observer.disconnect();
		};
	}, [node]);

	return {
		node,
		ref,
		size,
	};
}

/*
 * Return the current browser window height for screen-sized grid rendering.
 */

export function useSheetGridWindowHeight() {
	const [windowHeight, setWindowHeight] = useState(() => globalThis.window?.innerHeight || 0);

	useEffect(() => {
		const updateWindowHeight = () => {
			setWindowHeight(globalThis.window?.innerHeight || 0);
		};

		globalThis.window?.addEventListener('resize', updateWindowHeight);
		updateWindowHeight();

		return () => {
			globalThis.window?.removeEventListener('resize', updateWindowHeight);
		};
	}, []);

	return windowHeight;
}

/*
 * Find the closest matching HTMLElement from a delegated DOM event target.
 */

export function getClosestSheetGridElement(target: EventTarget | null, selector: string) {
	if (!(target instanceof Element)) {
		return null;
	}

	return target.closest(selector) as HTMLElement | null;
}

/*
 * Return the sheet-like cell coordinate stored on one rendered DOM cell.
 */

export function getSheetGridCellSelectionFromElement(cellElement?: Element | null): SheetGridCellSelection | null {
	if (!(cellElement instanceof HTMLElement)) {
		return null;
	}

	const rowId = cellElement.dataset.rowId;
	const cellKey = cellElement.dataset.cellKey;

	if (!rowId || !cellKey) {
		return null;
	}

	return {
		cellKey,
		rowId,
	};
}

/*
 * Return the active editor elements for one sheet-like grid keyboard event.
 */

export function getSheetGridKeyboardElements(event: KeyboardEvent, selectors: SheetGridKeyboardElementSelectors) {
	const activeElement = globalThis.document?.activeElement as HTMLElement | null;
	const findElement = (selector?: string) => {
		if (!selector) {
			return null;
		}

		return getClosestSheetGridElement(event.target, selector) ||
			(activeElement?.closest(selector) as HTMLElement | null);
	};

	return {
		editorElement: findElement(selectors.editorSelector),
		headerEditorElement: findElement(selectors.headerEditorSelector),
		localEditorElement: findElement(selectors.localEditorSelector),
	};
}

/*
 * Return whether one keydown event should open text editing for a sheet-like grid cell.
 */

export function isSheetGridTextInputKey(event: KeyboardEvent) {
	return event.key.length === 1 && !event.metaKey && !event.ctrlKey && !event.altKey;
}

/*
 * Return whether the active document element belongs to non-grid text input.
 */

export function isSheetGridShortcutBlockedByActiveInput(editorSelector: string) {
	const activeElement = globalThis.document?.activeElement as HTMLElement | null;

	if (!activeElement) {
		return false;
	}

	if (activeElement.closest(editorSelector)) {
		return false;
	}

	return activeElement.matches('input, textarea, select, [contenteditable="true"]');
}
