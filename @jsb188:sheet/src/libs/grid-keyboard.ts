export type GridArrowDirection = 'left' | 'right' | 'up' | 'down';
export type GridTabDirection = 'forward' | 'backward';
export type GridTextStyleShortcutName = 'bold' | 'italic' | 'strikethrough' | 'underline';

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
	onArrow?: (direction: GridArrowDirection, extendSelection: boolean) => void;
	onClear?: () => Promise<void> | void;
	onCopy?: () => void;
	onDismissActiveEditor?: () => void;
	onDismissContextMenu?: () => boolean;
	onDismissEditor?: () => void;
	onDismissHeaderEditor?: () => void;
	onDismissLocalEditor?: () => void;
	onEditorCommit?: (editorElement: HTMLElement) => Promise<boolean | void> | boolean | void;
	onEditorCommitEnter?: (editorElement: HTMLElement) => void;
	onEditorCommitValue?: (editorElement: HTMLElement) => Promise<void> | void;
	onEnter?: () => void;
	onEscapeSelection?: () => void;
	onHeaderEditorCommit?: (headerEditorElement: HTMLElement) => void;
	onKeyFinish?: () => void;
	onKeyStart?: (input: { metaKey: boolean; pressed: string }) => void;
	onPaste?: (clipboardText: string) => Promise<void> | void;
	onRedo?: () => Promise<void> | void;
	onSelectAll?: () => void;
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
 * Return whether a keyboard event should run grid-level undo.
 */

function isGridUndoShortcut(event: KeyboardEvent, metaKey: boolean) {
	return metaKey && !event.shiftKey && event.key.toLowerCase() === 'z';
}

/*
 * Return whether a keyboard event should run grid-level redo.
 */

function isGridRedoShortcut(event: KeyboardEvent, metaKey: boolean) {
	return metaKey && event.shiftKey && event.key.toLowerCase() === 'z';
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
	const fontSizeShortcutDirection = getGridFontSizeShortcutDirection(event, metaKey);
	const textStyleShortcutName = getGridTextStyleShortcutName(event, metaKey);

	if (hasGridNativeEditorArrowShortcut(event, elements, arrowDirection)) {
		return false;
	}

	const shortcutKey = Boolean(
		(arrowDirection && handlers.onArrow) ||
		(event.key === 'Enter' && (hasEditorShortcut || handlers.onEnter)) ||
		(event.key === 'Escape' && (hasEditorShortcut || handlers.onEscapeSelection || handlers.onDismissContextMenu)) ||
		(event.key === 'Tab' && (hasEditorShortcut || handlers.onTab)) ||
		((event.key === 'Delete' || event.key === 'Backspace') && handlers.onClear) ||
		(handlers.isTextInputKey && handlers.onTextInput) ||
		(metaKey && event.key.toLowerCase() === 'a' && handlers.onSelectAll) ||
		(metaKey && event.key.toLowerCase() === 'c' && handlers.onCopy) ||
		(metaKey && event.key.toLowerCase() === 'v' && handlers.onPaste) ||
		(!hasEditorShortcut && fontSizeShortcutDirection && handlers.onAdjustFontSize) ||
		(!hasEditorShortcut && textStyleShortcutName && handlers.onToggleTextStyle) ||
		(!hasEditorShortcut && undoShortcut && handlers.onUndo) ||
		(!hasEditorShortcut && redoShortcut && handlers.onRedo)
	);

	if (!shortcutKey || handlers.blocked) {
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
			handlers.onDismissEditor?.();
			finishGridKeyboardEvent(handlers);
			return true;
		}

		if ((event.key === 'Enter' && elements.editorElement.dataset.fieldType !== 'JSON' && !event.shiftKey) || event.key === 'Tab') {
			consumeGridKeyboardEvent(event, stopImmediatePropagation);
			void (async () => {
				const committed = await handlers.onEditorCommit?.(elements.editorElement!);
				await handlers.onEditorCommitValue?.(elements.editorElement!);

				if (event.key === 'Tab') {
					handlers.onTab?.(event.shiftKey ? 'backward' : 'forward');
				} else if (committed !== false) {
					handlers.onEditorCommitEnter?.(elements.editorElement!);
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
			handlers.onDismissLocalEditor?.();
		}

		finishGridKeyboardEvent(handlers);
		return true;
	}

	if (handlers.hasActiveEditState) {
		consumeGridKeyboardEvent(event, stopImmediatePropagation);

		if (event.key === 'Escape') {
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
		handlers.onArrow?.(arrowDirection, event.shiftKey);
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

	if (event.key === 'Enter' && !event.shiftKey) {
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
