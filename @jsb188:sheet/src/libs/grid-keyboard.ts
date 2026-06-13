export type GridArrowDirection = 'left' | 'right' | 'up' | 'down';
export type GridTabDirection = 'forward' | 'backward';
export type GridTextStyleShortcutName = 'bold' | 'italic' | 'strikethrough' | 'underline';
export type GridFillShortcutDirection = 'down' | 'right';
export type GridHomeEndEdge = 'start' | 'end';
export type GridPageDirection = 'up' | 'down';

export const GRID_FORMULA_INPUT_SELECTOR = '[data-sheet-formula-input="true"]';

export type GridKeyboardElements = {
	editorElement?: HTMLElement | null;
	headerEditorElement?: HTMLElement | null;
	localEditorElement?: HTMLElement | null;
};

export type GridKeyboardHandlers = {
	blocked?: boolean;
	hasActiveCell?: boolean;
	hasActiveEditState?: boolean;
	isTextInputKey?: boolean;
	readClipboardText?: () => Promise<string>;
	onAdjustFontSize?: (direction: -1 | 1) => Promise<void> | void;
	onArrow?: (direction: GridArrowDirection, extendSelection: boolean, toDataEdge?: boolean) => void;
	onClear?: () => Promise<void> | void;
	onClearFormatting?: () => Promise<void> | void;
	onCopy?: () => void;
	onCut?: () => Promise<void> | void;
	onDismissActiveEditor?: () => void;
	onDismissContextMenu?: () => boolean;
	onDismissEditor?: () => void;
	onDismissHeaderEditor?: () => void;
	onDismissLocalEditor?: () => void;
	onEditorCommit?: (editorElement: HTMLElement) => Promise<boolean | void> | boolean | void;
	onEditorCommitEnter?: (editorElement: HTMLElement, direction?: 'down' | 'up') => void;
	onEditorCommitValue?: (editorElement: HTMLElement) => Promise<void> | void;
	onEnter?: () => void;
	onEscapeSelection?: () => void;
	onFill?: (direction: GridFillShortcutDirection) => Promise<void> | void;
	onHeaderEditorCommit?: (headerEditorElement: HTMLElement) => void;
	onHomeEnd?: (edge: GridHomeEndEdge, metaKey: boolean, extendSelection: boolean) => void;
	onKeyFinish?: () => void;
	onKeyStart?: (input: { metaKey: boolean; pressed: string }) => void;
	onPage?: (direction: GridPageDirection, extendSelection: boolean) => void;
	onPaste?: (clipboardText: string) => Promise<void> | void;
	onRedo?: () => Promise<void> | void;
	onSelectAll?: () => void;
	onSelectColumn?: () => void;
	onSelectRow?: () => void;
	onTab?: (direction: GridTabDirection) => void;
	onTextInput?: (pressed: string) => void;
	onToggleTextStyle?: (name: GridTextStyleShortcutName) => Promise<void> | void;
	onUndo?: () => Promise<void> | void;
	stopImmediatePropagation?: boolean;
};

/*
 * Listen for global grid keyboard events with the shared capture-phase registration.
 */

export function addGridKeyboardEventListener(onKeyDown: (event: KeyboardEvent) => void) {
	globalThis.addEventListener?.('keydown', onKeyDown, true);

	return () => {
		globalThis.removeEventListener?.('keydown', onKeyDown, true);
	};
}

/*
 * Return the browser arrow key as a grid navigation direction.
 */

export function getGridShortcutArrowDirection(pressed?: string | null): GridArrowDirection | null {
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
 * Consume a keyboard event that belongs to a grid interaction.
 */

function consumeGridKeyboardEvent(event: KeyboardEvent, stopImmediatePropagation?: boolean) {
	event.preventDefault();

	if (stopImmediatePropagation) {
		event.stopImmediatePropagation();
	}
}

/*
 * Finish one grid shortcut, allowing callers to reset transient keyboard state.
 */

function finishGridKeyboardEvent(handlers: GridKeyboardHandlers) {
	handlers.onKeyFinish?.();
}

/*
 * Remove focus from the active browser text input when Escape dismisses editing.
 */
function blurGridKeyboardFocusedInput(elements: GridKeyboardElements) {
	const activeElement = globalThis.document?.activeElement as HTMLElement | null;
	const focusedInput = activeElement?.matches?.('input, textarea, select, [contenteditable="true"]')
		? activeElement
		: null;
	const fallbackInput = elements.editorElement || elements.headerEditorElement || elements.localEditorElement;

	(focusedInput || fallbackInput)?.blur?.();
}

/*
 * Return whether a keyboard event should run grid-level undo.
 */

function isGridUndoShortcut(event: KeyboardEvent, metaKey: boolean) {
	return metaKey && !event.shiftKey && event.key.toLowerCase() === 'z';
}

/*
 * Return whether a keyboard event should run grid-level redo.
 */

function isGridRedoShortcut(event: KeyboardEvent, metaKey: boolean) {
	const key = event.key.toLowerCase();

	// Cmd+Y must work on macOS like Ctrl+Y does elsewhere
	return (metaKey && event.shiftKey && key === 'z') ||
		(metaKey && !event.shiftKey && key === 'y');
}

/*
 * Return whether a keyboard event should cut the grid selection.
 */

function isGridCutShortcut(event: KeyboardEvent, metaKey: boolean) {
	return metaKey && !event.shiftKey && !event.altKey && event.key.toLowerCase() === 'x';
}

/*
 * Return the fill direction represented by a grid keyboard shortcut.
 */

function getGridFillShortcutDirection(event: KeyboardEvent, metaKey: boolean): GridFillShortcutDirection | null {
	if (!metaKey || event.shiftKey || event.altKey) {
		return null;
	}

	const key = event.key.toLowerCase();

	if (key === 'd') {
		return 'down';
	}

	if (key === 'r') {
		return 'right';
	}

	return null;
}

/*
 * Return whether a keyboard event should clear formatting on the grid selection.
 */

function isGridClearFormattingShortcut(event: KeyboardEvent, metaKey: boolean) {
	return metaKey && !event.altKey && event.key === '\\';
}

/*
 * Return the whole-row or whole-column selection target of a space shortcut.
 * Cmd+Space stays with the OS (Spotlight), so column select is Ctrl-only.
 */

function getGridSpaceSelectShortcutTarget(event: KeyboardEvent): 'row' | 'column' | null {
	if (event.key !== ' ' || event.altKey || event.metaKey) {
		return null;
	}

	if (event.shiftKey && !event.ctrlKey) {
		return 'row';
	}

	if (event.ctrlKey && !event.shiftKey) {
		return 'column';
	}

	return null;
}

/*
 * Return the Home/End navigation edge of a grid keyboard event.
 */

function getGridHomeEndShortcutEdge(event: KeyboardEvent): GridHomeEndEdge | null {
	if (event.key === 'Home') {
		return 'start';
	}

	if (event.key === 'End') {
		return 'end';
	}

	return null;
}

/*
 * Return the page navigation direction of a grid keyboard event.
 */

function getGridPageShortcutDirection(event: KeyboardEvent): GridPageDirection | null {
	if (event.key === 'PageUp') {
		return 'up';
	}

	if (event.key === 'PageDown') {
		return 'down';
	}

	return null;
}

/*
 * Return the font-size adjustment direction for a grid keyboard shortcut.
 */
function getGridFontSizeShortcutDirection(event: KeyboardEvent, metaKey: boolean): -1 | 1 | null {
	if (!metaKey || event.altKey) {
		return null;
	}

	if (event.key === '+' || event.key === '=') {
		return 1;
	}

	if (event.key === '-' || event.key === '_') {
		return -1;
	}

	return null;
}

/*
 * Return the full-cell text style represented by a grid keyboard shortcut.
 */
function getGridTextStyleShortcutName(event: KeyboardEvent, metaKey: boolean): GridTextStyleShortcutName | null {
	if (!metaKey || event.altKey) {
		return null;
	}

	const key = event.key.toLowerCase();

	if (!event.shiftKey && key === 'b') {
		return 'bold';
	}

	if (!event.shiftKey && key === 'i') {
		return 'italic';
	}

	if (!event.shiftKey && key === 'u') {
		return 'underline';
	}

	if (event.shiftKey && key === 'x') {
		return 'strikethrough';
	}

	return null;
}

/*
 * Return whether an active editor should keep native editor shortcuts in control.
 */

function hasGridActiveEditorShortcut(elements: GridKeyboardElements, handlers: GridKeyboardHandlers) {
	return Boolean(elements.editorElement || elements.headerEditorElement || elements.localEditorElement || handlers.hasActiveEditState);
}

/*
 * Return whether a browser text editor should own one native arrow shortcut.
 */

function hasGridNativeEditorArrowShortcut(event: KeyboardEvent, elements: GridKeyboardElements, arrowDirection: GridArrowDirection | null) {
	if (!arrowDirection) {
		return false;
	}

	if (elements.editorElement?.matches(GRID_FORMULA_INPUT_SELECTOR)) {
		return true;
	}

	if (elements.editorElement || elements.headerEditorElement || elements.localEditorElement) {
		return true;
	}

	return Boolean(
		(event.metaKey || event.ctrlKey || event.altKey) &&
			(elements.editorElement || elements.headerEditorElement || elements.localEditorElement),
	);
}

/*
 * Route one keyboard event through shared grid shortcut behavior.
 */

export function handleGridKeyboardEvent(
	event: KeyboardEvent,
	elements: GridKeyboardElements,
	handlers: GridKeyboardHandlers,
) {
	const arrowDirection = getGridShortcutArrowDirection(event.key);
	const metaKey = event.metaKey || event.ctrlKey;
	const stopImmediatePropagation = handlers.stopImmediatePropagation;
	const hasEditorShortcut = hasGridActiveEditorShortcut(elements, handlers);
	const undoShortcut = isGridUndoShortcut(event, metaKey);
	const redoShortcut = isGridRedoShortcut(event, metaKey);
	const cutShortcut = isGridCutShortcut(event, metaKey);
	const fillShortcutDirection = getGridFillShortcutDirection(event, metaKey);
	const clearFormattingShortcut = isGridClearFormattingShortcut(event, metaKey);
	const spaceSelectTarget = getGridSpaceSelectShortcutTarget(event);
	const homeEndEdge = getGridHomeEndShortcutEdge(event);
	const pageDirection = getGridPageShortcutDirection(event);
	const fontSizeShortcutDirection = getGridFontSizeShortcutDirection(event, metaKey);
	const textStyleShortcutName = getGridTextStyleShortcutName(event, metaKey);

	if (hasGridNativeEditorArrowShortcut(event, elements, arrowDirection)) {
		return false;
	}

	const shortcutKey = Boolean(
		(arrowDirection && handlers.onArrow) ||
		((event.key === 'Enter' || event.key === 'F2') && (hasEditorShortcut || handlers.onEnter)) ||
		(event.key === 'Escape' && (hasEditorShortcut || handlers.onEscapeSelection || handlers.onDismissContextMenu)) ||
		(event.key === 'Tab' && (hasEditorShortcut || handlers.onTab)) ||
		((event.key === 'Delete' || event.key === 'Backspace') && handlers.onClear) ||
		(handlers.isTextInputKey && handlers.onTextInput) ||
		(metaKey && event.key.toLowerCase() === 'a' && handlers.onSelectAll) ||
		(metaKey && event.key.toLowerCase() === 'c' && handlers.onCopy) ||
		(metaKey && event.key.toLowerCase() === 'v' && handlers.onPaste) ||
		(!hasEditorShortcut && cutShortcut && handlers.onCut) ||
		(!hasEditorShortcut && fillShortcutDirection && handlers.onFill) ||
		(!hasEditorShortcut && clearFormattingShortcut && handlers.onClearFormatting) ||
		(!hasEditorShortcut && spaceSelectTarget === 'row' && handlers.onSelectRow) ||
		(!hasEditorShortcut && spaceSelectTarget === 'column' && handlers.onSelectColumn) ||
		(!hasEditorShortcut && homeEndEdge && handlers.onHomeEnd) ||
		(!hasEditorShortcut && pageDirection && handlers.onPage) ||
		(!hasEditorShortcut && fontSizeShortcutDirection && handlers.onAdjustFontSize) ||
		(!hasEditorShortcut && textStyleShortcutName && handlers.onToggleTextStyle) ||
		(!hasEditorShortcut && undoShortcut && handlers.onUndo) ||
		(!hasEditorShortcut && redoShortcut && handlers.onRedo)
	);

	if (!shortcutKey || handlers.blocked) {
		return false;
	}

	if (!handlers.hasActiveCell && !hasEditorShortcut && event.key !== 'Escape') {
		finishGridKeyboardEvent(handlers);
		return false;
	}

	if (event.key === 'Escape' && handlers.onDismissContextMenu?.()) {
		consumeGridKeyboardEvent(event, stopImmediatePropagation);
		finishGridKeyboardEvent(handlers);
		return true;
	}

	handlers.onKeyStart?.({
		metaKey,
		pressed: event.key,
	});

	if (elements.headerEditorElement) {
		if (event.key === 'Escape') {
			consumeGridKeyboardEvent(event, stopImmediatePropagation);
			blurGridKeyboardFocusedInput(elements);
			handlers.onDismissHeaderEditor?.();
			finishGridKeyboardEvent(handlers);
			return true;
		}

		if (event.key === 'Enter') {
			consumeGridKeyboardEvent(event, stopImmediatePropagation);
			handlers.onHeaderEditorCommit?.(elements.headerEditorElement);
		}

		finishGridKeyboardEvent(handlers);
		return true;
	}

	if (elements.editorElement) {
		if (arrowDirection) {
			consumeGridKeyboardEvent(event, stopImmediatePropagation);
			finishGridKeyboardEvent(handlers);
			return true;
		}

		if (event.key === 'Escape') {
			consumeGridKeyboardEvent(event, stopImmediatePropagation);
			blurGridKeyboardFocusedInput(elements);
			handlers.onDismissEditor?.();
			finishGridKeyboardEvent(handlers);
			return true;
		}

		if ((event.key === 'Enter' && elements.editorElement.dataset.fieldType !== 'JSON') || event.key === 'Tab') {
			consumeGridKeyboardEvent(event, stopImmediatePropagation);
			void (async () => {
				const committed = await handlers.onEditorCommit?.(elements.editorElement!);
				await handlers.onEditorCommitValue?.(elements.editorElement!);

				if (event.key === 'Tab') {
					handlers.onTab?.(event.shiftKey ? 'backward' : 'forward');
				} else if (committed !== false) {
					// Shift+Enter commits and moves the selection up instead of down
					handlers.onEditorCommitEnter?.(elements.editorElement!, event.shiftKey ? 'up' : 'down');
				}

				finishGridKeyboardEvent(handlers);
			})();
			return true;
		}

		finishGridKeyboardEvent(handlers);
		return true;
	}

	if (elements.localEditorElement) {
		if (event.key === 'Escape') {
			consumeGridKeyboardEvent(event, stopImmediatePropagation);
			blurGridKeyboardFocusedInput(elements);
			handlers.onDismissLocalEditor?.();
			finishGridKeyboardEvent(handlers);
			return true;
		}

		if (event.key === 'Enter' || event.key === 'Tab') {
			consumeGridKeyboardEvent(event, stopImmediatePropagation);
			finishGridKeyboardEvent(handlers);
			return true;
		}

		finishGridKeyboardEvent(handlers);
		return false;
	}

	if (handlers.hasActiveEditState) {
		consumeGridKeyboardEvent(event, stopImmediatePropagation);

		if (event.key === 'Escape') {
			blurGridKeyboardFocusedInput(elements);
			handlers.onDismissActiveEditor?.();
		}

		finishGridKeyboardEvent(handlers);
		return true;
	}

	if (!handlers.hasActiveCell) {
		finishGridKeyboardEvent(handlers);
		return false;
	}

	if (arrowDirection) {
		consumeGridKeyboardEvent(event, stopImmediatePropagation);
		// Cmd/Ctrl jumps to the edge of the surrounding data block
		handlers.onArrow?.(arrowDirection, event.shiftKey, metaKey);
		finishGridKeyboardEvent(handlers);
		return true;
	}

	if (homeEndEdge && handlers.onHomeEnd) {
		consumeGridKeyboardEvent(event, stopImmediatePropagation);
		handlers.onHomeEnd(homeEndEdge, metaKey, event.shiftKey);
		finishGridKeyboardEvent(handlers);
		return true;
	}

	if (pageDirection && handlers.onPage) {
		consumeGridKeyboardEvent(event, stopImmediatePropagation);
		handlers.onPage(pageDirection, event.shiftKey);
		finishGridKeyboardEvent(handlers);
		return true;
	}

	if (spaceSelectTarget === 'row' && handlers.onSelectRow) {
		consumeGridKeyboardEvent(event, stopImmediatePropagation);
		handlers.onSelectRow();
		finishGridKeyboardEvent(handlers);
		return true;
	}

	if (spaceSelectTarget === 'column' && handlers.onSelectColumn) {
		consumeGridKeyboardEvent(event, stopImmediatePropagation);
		handlers.onSelectColumn();
		finishGridKeyboardEvent(handlers);
		return true;
	}

	if (event.key === 'Tab') {
		consumeGridKeyboardEvent(event, stopImmediatePropagation);
		handlers.onTab?.(event.shiftKey ? 'backward' : 'forward');
		finishGridKeyboardEvent(handlers);
		return true;
	}

	if (metaKey && event.key.toLowerCase() === 'a') {
		consumeGridKeyboardEvent(event, stopImmediatePropagation);
		handlers.onSelectAll?.();
		finishGridKeyboardEvent(handlers);
		return true;
	}

	if (metaKey && event.key.toLowerCase() === 'c') {
		consumeGridKeyboardEvent(event, stopImmediatePropagation);
		handlers.onCopy?.();
		finishGridKeyboardEvent(handlers);
		return true;
	}

	if (cutShortcut && handlers.onCut) {
		consumeGridKeyboardEvent(event, stopImmediatePropagation);
		void (async () => {
			await handlers.onCut?.();
			finishGridKeyboardEvent(handlers);
		})();
		return true;
	}

	if (fillShortcutDirection && handlers.onFill) {
		consumeGridKeyboardEvent(event, stopImmediatePropagation);
		void (async () => {
			await handlers.onFill?.(fillShortcutDirection);
			finishGridKeyboardEvent(handlers);
		})();
		return true;
	}

	if (clearFormattingShortcut && handlers.onClearFormatting) {
		consumeGridKeyboardEvent(event, stopImmediatePropagation);
		void (async () => {
			await handlers.onClearFormatting?.();
			finishGridKeyboardEvent(handlers);
		})();
		return true;
	}

	if (metaKey && event.key.toLowerCase() === 'v') {
		consumeGridKeyboardEvent(event, stopImmediatePropagation);
		void (async () => {
			await handlers.onPaste?.(handlers.readClipboardText ? await handlers.readClipboardText() : '');
			finishGridKeyboardEvent(handlers);
		})();
		return true;
	}

	if (fontSizeShortcutDirection) {
		consumeGridKeyboardEvent(event, stopImmediatePropagation);
		void (async () => {
			await handlers.onAdjustFontSize?.(fontSizeShortcutDirection);
			finishGridKeyboardEvent(handlers);
		})();
		return true;
	}

	if (textStyleShortcutName) {
		consumeGridKeyboardEvent(event, stopImmediatePropagation);
		void (async () => {
			await handlers.onToggleTextStyle?.(textStyleShortcutName);
			finishGridKeyboardEvent(handlers);
		})();
		return true;
	}

	if (undoShortcut) {
		consumeGridKeyboardEvent(event, stopImmediatePropagation);
		void (async () => {
			await handlers.onUndo?.();
			finishGridKeyboardEvent(handlers);
		})();
		return true;
	}

	if (redoShortcut) {
		consumeGridKeyboardEvent(event, stopImmediatePropagation);
		void (async () => {
			await handlers.onRedo?.();
			finishGridKeyboardEvent(handlers);
		})();
		return true;
	}

	if (event.key === 'Delete' || event.key === 'Backspace') {
		consumeGridKeyboardEvent(event, stopImmediatePropagation);
		void (async () => {
			await handlers.onClear?.();
			finishGridKeyboardEvent(handlers);
		})();
		return true;
	}

	if ((event.key === 'Enter' && !event.shiftKey) || event.key === 'F2') {
		consumeGridKeyboardEvent(event, stopImmediatePropagation);
		handlers.onEnter?.();
		finishGridKeyboardEvent(handlers);
		return true;
	}

	if (event.key === 'Escape') {
		consumeGridKeyboardEvent(event, stopImmediatePropagation);
		handlers.onEscapeSelection?.();
		finishGridKeyboardEvent(handlers);
		return true;
	}

	if (handlers.isTextInputKey) {
		consumeGridKeyboardEvent(event, stopImmediatePropagation);
		handlers.onTextInput?.(event.key);
		finishGridKeyboardEvent(handlers);
		return true;
	}

	finishGridKeyboardEvent(handlers);
	return false;
}
