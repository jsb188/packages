import type {
	SheetUIEditState,
	SheetUISelectedCellKeyMap,
	SheetUISelectedCellState,
} from '@jsb188/react-web/ui/SheetUI';
import { atom, type PrimitiveAtom } from 'jotai';

export type GridScrollState = {
	scrollLeft: number;
	scrollTop: number;
};

/*
 * Return the default scroll state for one grid instance.
 */
export function getInitialGridScrollState(): GridScrollState {
	return {
		scrollLeft: 0,
		scrollTop: 0,
	};
}

/*
 * Create the shared atom group used by one mounted grid instance.
 */
export function createGridStateAtoms() {
	return {
		editStateAtom: atom<SheetUIEditState | null>(null),
		scrollStateAtom: atom<GridScrollState>(getInitialGridScrollState()),
		selectedCellKeyMapAtom: atom<SheetUISelectedCellKeyMap | null>(null),
		selectedCellStateAtom: atom<SheetUISelectedCellState | null>(null),
	};
}

/*
 * Create a write-only atom that applies reducer actions to a value atom.
 */
export function createReducerDispatchAtom<Value, Action>(
	valueAtom: PrimitiveAtom<Value>,
	reducer: (state: Value, action: Action) => Value,
) {
	return atom(null, (get, set, action: Action) => {
		set(valueAtom, (current) => reducer(current, action));
	});
}
