import { describe, expect, it, vi } from 'vitest';
import { handleGridKeyboardEvent } from '../src/libs/grid-keyboard.ts';

/*
 * Build one keyboard event for grid keyboard helper tests.
 */
function createGridKeyboardEvent(key: string, init: KeyboardEventInit = {}) {
	let defaultPrevented = false;

	return {
		altKey: false,
		ctrlKey: false,
		key,
		metaKey: false,
		preventDefault: () => {
			defaultPrevented = true;
		},
		shiftKey: false,
		stopImmediatePropagation: vi.fn(),
		...init,
		get defaultPrevented() {
			return defaultPrevented;
		},
	} as KeyboardEvent;
}

/*
 * Build one editor element fake with selector matching support.
 */
function createGridEditorElement(formulaInput = false) {
	return {
		matches: (selector: string) => formulaInput && selector === '[data-sheet-formula-input="true"]',
	} as HTMLElement;
}

describe('grid keyboard helpers', () => {
	it('lets formula input arrow keys use native caret movement', () => {
		const editorElement = createGridEditorElement(true);
		const onArrow = vi.fn();
		const event = createGridKeyboardEvent('ArrowLeft');

		const handled = handleGridKeyboardEvent(event, { editorElement }, {
			hasActiveCell: true,
			onArrow,
		});

		expect(handled).toBe(false);
		expect(event.defaultPrevented).toBe(false);
		expect(onArrow).not.toHaveBeenCalled();
	});

	it('lets regular editor arrow keys use native caret movement', () => {
		const editorElement = createGridEditorElement();
		const onArrow = vi.fn();
		const event = createGridKeyboardEvent('ArrowLeft');

		const handled = handleGridKeyboardEvent(event, { editorElement }, {
			hasActiveCell: true,
			onArrow,
		});

		expect(handled).toBe(false);
		expect(event.defaultPrevented).toBe(false);
		expect(onArrow).not.toHaveBeenCalled();
	});
});
