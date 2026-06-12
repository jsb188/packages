import type { SheetCellGQL } from '@jsb188/mday/types/sheet.d.ts';
import type { SheetCellEditInput } from './sheet-history.ts';
import { getSheetCanvasCoordKey } from './sheet-utils.ts';

/*
 * Unified Sheet cell store primitives.
 *
 * The store holds two layers per Sheet instance:
 *   confirmedCellsByCoord — server-authoritative cells (sheetView result, WS
 *     patches, mutation results), merged through one revision-gated function
 *   pendingEditsByCoord — in-flight user edits (sheet-owned AND data
 *     table-backed), each carrying an instant previewCell
 * Rendering always reads the derived overlay of pending previews on top of
 * confirmed cells. This module is pure so it can be unit tested directly.
 */

export type SheetPendingCellEditState = 'pending' | 'saving' | 'error';

export type SheetPendingCellEdit = {
	/* Sheet-owned edit payload; history-compatible */
	input: SheetCellEditInput;
	/* Present when the edit targets a data table source cell through a region */
	dataTableTarget?: {
		cellKey: string;
		dataTableId: string;
		dataTableRowId: string;
		organizationId?: string | null;
		value: string | null;
	} | null;
	/* Instant render value; carries __formulaLoading when not client-previewable */
	previewCell: SheetCellGQL;
	saveVersion: number;
	state: SheetPendingCellEditState;
};

export type SheetDeletedCellCoord = {
	rowIndex: number;
	columnIndex: number;
	/* Tombstone identity: when present, the delete only applies while the
	 * stored cell still has this id (a different id means the coordinate was
	 * re-occupied, e.g. by a rematerialized region cell) */
	id?: string | null;
	revision?: number | null;
};

export type SheetRemotePendingCell = {
	/* Peer's local pending preview, applied until confirmed data arrives */
	cell: SheetCellGQL;
	accountId: string;
	at: number;
};

/*
 * Return whether an incoming confirmed cell should replace the stored one.
 * Same-id cells are revision-gated so out-of-order realtime patches cannot
 * roll a cell backwards; a different id at the same coordinate (for example a
 * rematerialized region cell) always wins.
 */
function confirmedSheetCellShouldReplace(
	existingCell: SheetCellGQL | undefined,
	incomingCell: SheetCellGQL,
) {
	if (!existingCell) {
		return true;
	}

	if (String(existingCell.id || '') !== String(incomingCell.id || '')) {
		return true;
	}

	const existingRevision = Number(existingCell.revision);
	const incomingRevision = Number(incomingCell.revision);
	if (Number.isFinite(existingRevision) && Number.isFinite(incomingRevision)) {
		return incomingRevision > existingRevision;
	}

	return true;
}

/*
 * Merge incoming server-confirmed cells (sheetView results, WS cell deltas,
 * mutation results) into the confirmed map, applying revision gating and
 * unconditional coordinate deletions. Returns the same map reference when
 * nothing changed.
 */
export function mergeConfirmedSheetCells(
	current: Map<string, SheetCellGQL>,
	incomingCells?: SheetCellGQL[] | null,
	deletedCoords?: SheetDeletedCellCoord[] | null,
) {
	let next = current;
	let changed = false;
	const ensureNext = () => {
		if (!changed) {
			next = new Map(current);
			changed = true;
		}
		return next;
	};

	(incomingCells || []).forEach((cell) => {
		const rowIndex = Math.floor(Number(cell?.rowIndex || 0));
		const columnIndex = Math.floor(Number(cell?.columnIndex || 0));
		if (!cell || rowIndex <= 0 || columnIndex <= 0) {
			return;
		}

		const coordKey = getSheetCanvasCoordKey(rowIndex, columnIndex);
		if (confirmedSheetCellShouldReplace(next.get(coordKey), cell)) {
			ensureNext().set(coordKey, cell);
		}
	});

	(deletedCoords || []).forEach((coord) => {
		const rowIndex = Math.floor(Number(coord?.rowIndex || 0));
		const columnIndex = Math.floor(Number(coord?.columnIndex || 0));
		if (rowIndex <= 0 || columnIndex <= 0) {
			return;
		}

		const coordKey = getSheetCanvasCoordKey(rowIndex, columnIndex);
		const existingCell = next.get(coordKey);
		if (!existingCell) {
			return;
		}

		// An id-stamped tombstone only deletes the cell it was issued for;
		// missing ids fall back to unconditional deletion
		if (coord.id && String(existingCell.id || '') !== String(coord.id)) {
			return;
		}

		ensureNext().delete(coordKey);
	});

	return next;
}

/*
 * Return the render map layered confirmed < remote-pending < own-pending, so
 * the viewer's own edits always win locally. Returns the confirmed map
 * reference unchanged when nothing is pending.
 */
export function getSheetRenderCellsByCoord(
	confirmedCellsByCoord: Map<string, SheetCellGQL>,
	pendingEditsByCoord: Map<string, SheetPendingCellEdit>,
	remotePendingCellsByCoord?: Map<string, SheetRemotePendingCell> | null,
) {
	if (!pendingEditsByCoord.size && !remotePendingCellsByCoord?.size) {
		return confirmedCellsByCoord;
	}

	const next = new Map(confirmedCellsByCoord);
	remotePendingCellsByCoord?.forEach((remotePending, coordKey) => {
		next.set(coordKey, remotePending.cell);
	});
	pendingEditsByCoord.forEach((pendingEdit, coordKey) => {
		next.set(coordKey, pendingEdit.previewCell);
	});

	return next;
}

/*
 * Remove every confirmed cell that belongs to one Sheet region. Used for the
 * instant local clear when a region is deleted; the authoritative state lands
 * with the next sheetView refetch.
 */
export function removeConfirmedSheetRegionCells(
	current: Map<string, SheetCellGQL>,
	regionId: string,
) {
	if (!regionId) {
		return current;
	}

	let next = current;
	let changed = false;

	current.forEach((cell, coordKey) => {
		const cellRegionId = String(cell.regionId || cell.region?.regionId || '');
		if (cell.sourceType === 'REGION_GENERATED' && cellRegionId === regionId) {
			if (!changed) {
				next = new Map(current);
				changed = true;
			}
			next.delete(coordKey);
		}
	});

	return next;
}
