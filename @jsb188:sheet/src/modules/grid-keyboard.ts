export type GridArrowDirection = 'left' | 'right' | 'up' | 'down';
export type GridTabDirection = 'forward' | 'backward';

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
	onArrow?: (direction: GridArrowDirection, extendSelection: boolean) => void;
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
	onTab?: (direction: GridTabDirection) => void;
	onTextInput?: (pressed: string) => void;
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
				await handlers.onEditorCommit?.(elements.editorElement!);
				await handlers.onEditorCommitValue?.(elements.editorElement!);

				if (event.key === 'Tab') {
					handlers.onTab?.(event.shiftKey ? 'backward' : 'forward');
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
