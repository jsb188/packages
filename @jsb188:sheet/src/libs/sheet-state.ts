import type { SheetCellGQL } from '@jsb188/mday/types/sheet.d.ts';
import { atom } from 'jotai';
import type { SheetCanvasResizeState, SheetCanvasRowResizeState } from '../modules/SheetController.tsx';
import type { SheetPendingCellEdit, SheetRemotePendingCell } from '../libs/sheet-cell-store.ts';
import { getSheetRenderCellsByCoord } from '../libs/sheet-cell-store.ts';
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
	const confirmedCellsByCoordAtom = atom<Map<string, SheetCellGQL>>(new Map());
	const pendingCellEditsByCoordAtom = atom<Map<string, SheetPendingCellEdit>>(new Map());
	const remotePendingCellsByCoordAtom = atom<Map<string, SheetRemotePendingCell>>(new Map());

	return {
		...gridAtoms,
		confirmedCellsByCoordAtom,
		headerSelectionAtom: atom<SheetHeaderSelectionState | null>(null),
		localColumnWidthsAtom: atom<Record<string, number>>({}),
		localRowHeightsAtom: atom<Record<string, number>>({}),
		pendingCellEditsByCoordAtom,
		remotePendingCellsByCoordAtom,
		// Derived overlay: confirmed < remote-pending < own-pending previews
		renderCellsByCoordAtom: atom((get) =>
			getSheetRenderCellsByCoord(
				get(confirmedCellsByCoordAtom),
				get(pendingCellEditsByCoordAtom),
				get(remotePendingCellsByCoordAtom),
			)
		),
		resizeStateAtom: atom<SheetCanvasResizeState | null>(null),
		rowResizeStateAtom: atom<SheetCanvasRowResizeState | null>(null),
	};
}

export type SheetStateAtoms = ReturnType<typeof createSheetStateAtoms>;
