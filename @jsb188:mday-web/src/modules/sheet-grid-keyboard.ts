export type SheetGridArrowDirection = 'left' | 'right' | 'up' | 'down';
export type SheetGridTabDirection = 'forward' | 'backward';

export type SheetGridKeyboardElements = {
	editorElement?: HTMLElement | null;
	headerEditorElement?: HTMLElement | null;
	localEditorElement?: HTMLElement | null;
};

export type SheetGridKeyboardHandlers = {
	blocked?: boolean;
	hasActiveCell?: boolean;
	hasActiveEditState?: boolean;
	isTextInputKey?: boolean;
	readClipboardText?: () => Promise<string>;
	onArrow?: (direction: SheetGridArrowDirection, extendSelection: boolean) => void;
	onClear?: () => Promise<void> | void;
	onCopy?: () => void;
	onDismissActiveEditor?: () => void;
	onDismissEditor?: () => void;
	onDismissHeaderEditor?: () => void;
	onDismissLocalEditor?: () => void;
	onEditorCommit?: (editorElement: HTMLElement) => Promise<void> | void;
	onEditorCommitValue?: (editorElement: HTMLElement) => Promise<void> | void;
	onEnter?: () => void;
	onEscapeSelection?: () => void;
	onHeaderEditorCommit?: (headerEditorElement: HTMLElement) => void;
	onKeyFinish?: () => void;
	onKeyStart?: (input: { metaKey: boolean; pressed: string }) => void;
	onPaste?: (clipboardText: string) => Promise<void> | void;
	onSelectAll?: () => void;
	onTab?: (direction: SheetGridTabDirection) => void;
	onTextInput?: (pressed: string) => void;
	stopImmediatePropagation?: boolean;
};

/*
 * Listen for global sheet-grid keyboard events with the shared capture-phase registration.
 */

export function addSheetGridKeyboardEventListener(onKeyDown: (event: KeyboardEvent) => void) {
	globalThis.addEventListener?.('keydown', onKeyDown, true);

	return () => {
		globalThis.removeEventListener?.('keydown', onKeyDown, true);
	};
}

/*
 * Return the browser arrow key as a sheet-grid navigation direction.
 */

export function getSheetGridShortcutArrowDirection(pressed?: string | null): SheetGridArrowDirection | null {
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
 * Consume a keyboard event that belongs to a sheet-like grid interaction.
 */

function consumeSheetGridKeyboardEvent(event: KeyboardEvent, stopImmediatePropagation?: boolean) {
	event.preventDefault();

	if (stopImmediatePropagation) {
		event.stopImmediatePropagation();
	}
}

/*
 * Finish one sheet-grid shortcut, allowing callers to reset transient keyboard state.
 */

function finishSheetGridKeyboardEvent(handlers: SheetGridKeyboardHandlers) {
	handlers.onKeyFinish?.();
}

/*
 * Route one keyboard event through shared sheet-grid shortcut behavior.
 */

export function handleSheetGridKeyboardEvent(
	event: KeyboardEvent,
	elements: SheetGridKeyboardElements,
	handlers: SheetGridKeyboardHandlers,
) {
	const arrowDirection = getSheetGridShortcutArrowDirection(event.key);
	const metaKey = event.metaKey || event.ctrlKey;
	const stopImmediatePropagation = handlers.stopImmediatePropagation;
	const hasEditorShortcut = Boolean(elements.editorElement || elements.headerEditorElement || elements.localEditorElement || handlers.hasActiveEditState);
	const shortcutKey = Boolean(
		(arrowDirection && handlers.onArrow) ||
		(event.key === 'Enter' && (hasEditorShortcut || handlers.onEnter)) ||
		(event.key === 'Escape' && (hasEditorShortcut || handlers.onEscapeSelection)) ||
		(event.key === 'Tab' && (hasEditorShortcut || handlers.onTab)) ||
		((event.key === 'Delete' || event.key === 'Backspace') && handlers.onClear) ||
		(handlers.isTextInputKey && handlers.onTextInput) ||
		(metaKey && event.key.toLowerCase() === 'a' && handlers.onSelectAll) ||
		(metaKey && event.key.toLowerCase() === 'c' && handlers.onCopy) ||
		(metaKey && event.key.toLowerCase() === 'v' && handlers.onPaste)
	);

	if (!shortcutKey || handlers.blocked) {
		return false;
	}

	handlers.onKeyStart?.({
		metaKey,
		pressed: event.key,
	});

	if (elements.headerEditorElement) {
		if (event.key === 'Escape') {
			consumeSheetGridKeyboardEvent(event, stopImmediatePropagation);
			handlers.onDismissHeaderEditor?.();
			finishSheetGridKeyboardEvent(handlers);
			return true;
		}

		if (event.key === 'Enter') {
			consumeSheetGridKeyboardEvent(event, stopImmediatePropagation);
			handlers.onHeaderEditorCommit?.(elements.headerEditorElement);
		}

		finishSheetGridKeyboardEvent(handlers);
		return true;
	}

	if (elements.editorElement) {
		if (arrowDirection) {
			consumeSheetGridKeyboardEvent(event, stopImmediatePropagation);
			finishSheetGridKeyboardEvent(handlers);
			return true;
		}

		if (event.key === 'Escape') {
			consumeSheetGridKeyboardEvent(event, stopImmediatePropagation);
			handlers.onDismissEditor?.();
			finishSheetGridKeyboardEvent(handlers);
			return true;
		}

		if ((event.key === 'Enter' && elements.editorElement.dataset.fieldType !== 'JSON' && !event.shiftKey) || event.key === 'Tab') {
			consumeSheetGridKeyboardEvent(event, stopImmediatePropagation);
			void (async () => {
				await handlers.onEditorCommit?.(elements.editorElement!);
				await handlers.onEditorCommitValue?.(elements.editorElement!);

				if (event.key === 'Tab') {
					handlers.onTab?.(event.shiftKey ? 'backward' : 'forward');
				}

				finishSheetGridKeyboardEvent(handlers);
			})();
			return true;
		}

		finishSheetGridKeyboardEvent(handlers);
		return true;
	}

	if (elements.localEditorElement) {
		if (event.key === 'Escape') {
			consumeSheetGridKeyboardEvent(event, stopImmediatePropagation);
			handlers.onDismissLocalEditor?.();
		}

		finishSheetGridKeyboardEvent(handlers);
		return true;
	}

	if (handlers.hasActiveEditState) {
		consumeSheetGridKeyboardEvent(event, stopImmediatePropagation);

		if (event.key === 'Escape') {
			handlers.onDismissActiveEditor?.();
		}

		finishSheetGridKeyboardEvent(handlers);
		return true;
	}

	if (!handlers.hasActiveCell) {
		finishSheetGridKeyboardEvent(handlers);
		return false;
	}

	if (arrowDirection) {
		consumeSheetGridKeyboardEvent(event, stopImmediatePropagation);
		handlers.onArrow?.(arrowDirection, event.shiftKey);
		finishSheetGridKeyboardEvent(handlers);
		return true;
	}

	if (event.key === 'Tab') {
		consumeSheetGridKeyboardEvent(event, stopImmediatePropagation);
		handlers.onTab?.(event.shiftKey ? 'backward' : 'forward');
		finishSheetGridKeyboardEvent(handlers);
		return true;
	}

	if (metaKey && event.key.toLowerCase() === 'a') {
		consumeSheetGridKeyboardEvent(event, stopImmediatePropagation);
		handlers.onSelectAll?.();
		finishSheetGridKeyboardEvent(handlers);
		return true;
	}

	if (metaKey && event.key.toLowerCase() === 'c') {
		consumeSheetGridKeyboardEvent(event, stopImmediatePropagation);
		handlers.onCopy?.();
		finishSheetGridKeyboardEvent(handlers);
		return true;
	}

	if (metaKey && event.key.toLowerCase() === 'v') {
		consumeSheetGridKeyboardEvent(event, stopImmediatePropagation);
		void (async () => {
			await handlers.onPaste?.(handlers.readClipboardText ? await handlers.readClipboardText() : '');
			finishSheetGridKeyboardEvent(handlers);
		})();
		return true;
	}

	if (event.key === 'Delete' || event.key === 'Backspace') {
		consumeSheetGridKeyboardEvent(event, stopImmediatePropagation);
		void (async () => {
			await handlers.onClear?.();
			finishSheetGridKeyboardEvent(handlers);
		})();
		return true;
	}

	if (event.key === 'Enter' && !event.shiftKey) {
		consumeSheetGridKeyboardEvent(event, stopImmediatePropagation);
		handlers.onEnter?.();
		finishSheetGridKeyboardEvent(handlers);
		return true;
	}

	if (event.key === 'Escape') {
		consumeSheetGridKeyboardEvent(event, stopImmediatePropagation);
		handlers.onEscapeSelection?.();
		finishSheetGridKeyboardEvent(handlers);
		return true;
	}

	if (handlers.isTextInputKey) {
		consumeSheetGridKeyboardEvent(event, stopImmediatePropagation);
		handlers.onTextInput?.(event.key);
		finishSheetGridKeyboardEvent(handlers);
		return true;
	}

	finishSheetGridKeyboardEvent(handlers);
	return false;
}
