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

	it('runs redo for Cmd+Y on macOS', () => {
		const onRedo = vi.fn();
		const event = createGridKeyboardEvent('y', { metaKey: true });

		const handled = handleGridKeyboardEvent(event, {}, {
			hasActiveCell: true,
			onRedo,
		});

		expect(handled).toBe(true);
		expect(onRedo).toHaveBeenCalledTimes(1);
	});

	it('cuts the selection for Cmd+X but keeps Cmd+Shift+X as strikethrough', () => {
		const onCut = vi.fn();
		const onToggleTextStyle = vi.fn();
		const cutEvent = createGridKeyboardEvent('x', { metaKey: true });
		const strikeEvent = createGridKeyboardEvent('x', { metaKey: true, shiftKey: true });

		handleGridKeyboardEvent(cutEvent, {}, {
			hasActiveCell: true,
			onCut,
			onToggleTextStyle,
		});
		handleGridKeyboardEvent(strikeEvent, {}, {
			hasActiveCell: true,
			onCut,
			onToggleTextStyle,
		});

		expect(onCut).toHaveBeenCalledTimes(1);
		expect(onToggleTextStyle).toHaveBeenCalledWith('strikethrough');
	});

	it('routes Cmd+D and Cmd+R to fill handlers', () => {
		const onFill = vi.fn();

		handleGridKeyboardEvent(createGridKeyboardEvent('d', { metaKey: true }), {}, {
			hasActiveCell: true,
			onFill,
		});
		handleGridKeyboardEvent(createGridKeyboardEvent('r', { ctrlKey: true }), {}, {
			hasActiveCell: true,
			onFill,
		});

		expect(onFill).toHaveBeenNthCalledWith(1, 'down');
		expect(onFill).toHaveBeenNthCalledWith(2, 'right');
	});

	it('clears formatting for Cmd+backslash', () => {
		const onClearFormatting = vi.fn();
		const event = createGridKeyboardEvent('\\', { metaKey: true });

		const handled = handleGridKeyboardEvent(event, {}, {
			hasActiveCell: true,
			onClearFormatting,
		});

		expect(handled).toBe(true);
		expect(onClearFormatting).toHaveBeenCalledTimes(1);
	});

	it('selects the row for Shift+Space and the column for Ctrl+Space', () => {
		const onSelectColumn = vi.fn();
		const onSelectRow = vi.fn();
		const onTextInput = vi.fn();

		handleGridKeyboardEvent(createGridKeyboardEvent(' ', { shiftKey: true }), {}, {
			hasActiveCell: true,
			isTextInputKey: true,
			onSelectColumn,
			onSelectRow,
			onTextInput,
		});
		handleGridKeyboardEvent(createGridKeyboardEvent(' ', { ctrlKey: true }), {}, {
			hasActiveCell: true,
			onSelectColumn,
			onSelectRow,
			onTextInput,
		});

		expect(onSelectRow).toHaveBeenCalledTimes(1);
		expect(onSelectColumn).toHaveBeenCalledTimes(1);
		expect(onTextInput).not.toHaveBeenCalled();
	});

	it('opens the editor for F2 like Enter', () => {
		const onEnter = vi.fn();
		const event = createGridKeyboardEvent('F2');

		const handled = handleGridKeyboardEvent(event, {}, {
			hasActiveCell: true,
			onEnter,
		});

		expect(handled).toBe(true);
		expect(onEnter).toHaveBeenCalledTimes(1);
	});

	it('passes the meta key through arrows as the data-edge jump flag', () => {
		const onArrow = vi.fn();

		handleGridKeyboardEvent(createGridKeyboardEvent('ArrowDown', { metaKey: true, shiftKey: true }), {}, {
			hasActiveCell: true,
			onArrow,
		});

		expect(onArrow).toHaveBeenCalledWith('down', true, true);
	});

	it('routes Home/End and PageUp/PageDown to navigation handlers', () => {
		const onHomeEnd = vi.fn();
		const onPage = vi.fn();

		handleGridKeyboardEvent(createGridKeyboardEvent('Home', { metaKey: true }), {}, {
			hasActiveCell: true,
			onHomeEnd,
			onPage,
		});
		handleGridKeyboardEvent(createGridKeyboardEvent('PageDown', { shiftKey: true }), {}, {
			hasActiveCell: true,
			onHomeEnd,
			onPage,
		});

		expect(onHomeEnd).toHaveBeenCalledWith('start', true, false);
		expect(onPage).toHaveBeenCalledWith('down', true);
	});

	it('commits with Shift+Enter and navigates up', async () => {
		const editorElement = { dataset: {}, matches: () => false } as unknown as HTMLElement;
		const onEditorCommit = vi.fn().mockResolvedValue(true);
		const onEditorCommitEnter = vi.fn();
		const event = createGridKeyboardEvent('Enter', { shiftKey: true });

		const handled = handleGridKeyboardEvent(event, { editorElement }, {
			hasActiveCell: true,
			onEditorCommit,
			onEditorCommitEnter,
		});

		expect(handled).toBe(true);
		await vi.waitFor(() => {
			expect(onEditorCommitEnter).toHaveBeenCalledWith(editorElement, 'up');
		});
	});
});
