export const GRID_UNDO_REDO_HISTORY_LIMIT = 100;

export type GridUndoRedoDirection = 'after' | 'before';

export type GridUndoRedoStack<Entry> = {
	redo: Entry[];
	undo: Entry[];
};

/*
 * Create an empty local undo/redo stack for one mounted grid.
 */
export function createGridUndoRedoStack<Entry>(): GridUndoRedoStack<Entry> {
	return {
		redo: [],
		undo: [],
	};
}

/*
 * Push one new undoable entry and clear redo history after a fresh user edit.
 */
export function pushGridUndoEntry<Entry>(
	stack: GridUndoRedoStack<Entry>,
	entry: Entry,
	limit = GRID_UNDO_REDO_HISTORY_LIMIT,
) {
	stack.undo.push(entry);
	stack.redo = [];

	if (stack.undo.length > limit) {
		stack.undo.splice(0, stack.undo.length - limit);
	}
}

/*
 * Move the latest undo entry to redo history and return it for replay.
 */
export function takeGridUndoEntry<Entry>(stack: GridUndoRedoStack<Entry>) {
	const entry = stack.undo.pop();

	if (entry) {
		stack.redo.push(entry);
	}

	return entry || null;
}

/*
 * Move the latest redo entry back to undo history and return it for replay.
 */
export function takeGridRedoEntry<Entry>(stack: GridUndoRedoStack<Entry>) {
	const entry = stack.redo.pop();

	if (entry) {
		stack.undo.push(entry);
	}

	return entry || null;
}
