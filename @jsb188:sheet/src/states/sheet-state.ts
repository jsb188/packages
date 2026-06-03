import type { SheetGridViewportVariables } from '@jsb188/graphql/hooks/use-sheet-qry';
import type { SheetCellGQL } from '@jsb188/mday/types/sheet.d.ts';
import { atom } from 'jotai';
import type { SheetCanvasResizeState, SheetCanvasRowResizeState } from '../modules/SheetController.tsx';
import type { SheetLoadedGridState } from '../modules/sheet-utils.ts';
import { createGridStateAtoms } from './grid-state.tsx';

export type SheetHeaderSelectionState =
	| {
			cellKeys: string[];
			type: 'COLUMN';
		}
	| {
			rowIds: string[];
			type: 'ROW';
		};

/*
 * Create the full Sheet atom group for one mounted Sheet instance.
 */
export function createSheetStateAtoms() {
	const gridAtoms = createGridStateAtoms();

	return {
		...gridAtoms,
		gridViewportAtom: atom<SheetGridViewportVariables | null>(null),
		headerSelectionAtom: atom<SheetHeaderSelectionState | null>(null),
		loadedGridStateAtom: atom<SheetLoadedGridState | null>(null),
		localColumnWidthsAtom: atom<Record<string, number>>({}),
		localRowHeightsAtom: atom<Record<string, number>>({}),
		optimisticCellsByCoordAtom: atom<Map<string, SheetCellGQL>>(new Map()),
		resizeStateAtom: atom<SheetCanvasResizeState | null>(null),
		rowResizeStateAtom: atom<SheetCanvasRowResizeState | null>(null),
	};
}

export type SheetStateAtoms = ReturnType<typeof createSheetStateAtoms>;
