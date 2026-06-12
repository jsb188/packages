import type { SheetPendingCellEdit } from './sheet-cell-store.ts';
import type { SheetCellEditInput } from './sheet-history.ts';
import type { SheetCellGQL } from '@jsb188/mday/types/sheet.d.ts';

/*
 * Persistence layer for the Sheet pending-edit overlay.
 *
 * Pending cell edits normally live in per-mount React state, so they vanish
 * when the user navigates away or hard-refreshes while the debounced save (or
 * the pagehide beacon) is still in flight server-side. This module keeps a
 * per-sheet copy of those edits in a module-level Map (survives SPA
 * navigation) mirrored to sessionStorage (survives hard refresh, per-tab), so
 * a remounting Sheet can rehydrate its previews and mask the stale snapshot
 * the next sheetView fetch returns.
 *
 * The in-memory Map is the source of truth; sessionStorage writes are
 * best-effort. Entry removal is gated on a monotonic `seq` token so a flush
 * callback that resolves after a remount cannot clear a newer persisted edit
 * at the same coordinate.
 */

export type SheetPendingFlushState = 'queued' | 'sent';

export type PersistedSheetPendingEntry = {
	/* Confirmed cell revision at edit time; drives the rehydrated catch-up rule */
	baseRevision?: number | null;
	dataTableTarget?: SheetPendingCellEdit['dataTableTarget'];
	editedAt: number;
	/* 'queued' until a mutation or an accepted beacon carries the edit */
	flushState: SheetPendingFlushState;
	input: SheetCellEditInput;
	previewCell: SheetCellGQL;
	/* Monotonic write token; clears and sent-marks are gated on it */
	seq: number;
};

export const SHEET_PENDING_PERSIST_TTL_MS = 45_000;

const STORAGE_KEY_PREFIX = 'sheetPendingEdits:';

const entriesBySheetId = new Map<string, Map<string, PersistedSheetPendingEntry>>();
const hydratedSheetIds = new Set<string>();
let seqCounter = 1;

/*
 * Return the sessionStorage key for one sheet's persisted entries.
 */
function getSheetPendingStorageKey(sheetId: string) {
	return STORAGE_KEY_PREFIX + sheetId;
}

/*
 * Serialize one sheet's entries, converting bigint values (e.g. regionId) to
 * strings so JSON.stringify does not throw.
 */
function stringifySheetPendingEntries(entries: Map<string, PersistedSheetPendingEntry>) {
	return JSON.stringify(
		Object.fromEntries(entries),
		(_key, value) => typeof value === 'bigint' ? String(value) : value,
	);
}

/*
 * Mirror one sheet's in-memory entries to sessionStorage; storage failures
 * (quota, privacy mode, SSR) are swallowed because storage is best-effort.
 */
function writeSheetPendingStorage(sheetId: string) {
	try {
		const entries = entriesBySheetId.get(sheetId);
		if (!entries?.size) {
			globalThis.sessionStorage?.removeItem(getSheetPendingStorageKey(sheetId));
			return;
		}

		globalThis.sessionStorage?.setItem(getSheetPendingStorageKey(sheetId), stringifySheetPendingEntries(entries));
	} catch {
		// Best-effort mirror; the in-memory Map still covers SPA navigation
	}
}

/*
 * Return one persisted entry when it carries the minimum shape needed to
 * rehydrate a preview; malformed storage payloads are dropped.
 */
function sanitizePersistedSheetPendingEntry(value: any): PersistedSheetPendingEntry | null {
	if (
		!value ||
		typeof value !== 'object' ||
		!value.input?.cell ||
		!value.previewCell ||
		!Number.isFinite(Number(value.editedAt)) ||
		(value.flushState !== 'queued' && value.flushState !== 'sent')
	) {
		return null;
	}

	return {
		baseRevision: Number.isFinite(Number(value.baseRevision)) ? Number(value.baseRevision) : null,
		dataTableTarget: value.dataTableTarget || null,
		editedAt: Number(value.editedAt),
		flushState: value.flushState,
		input: value.input,
		previewCell: value.previewCell,
		seq: Number.isFinite(Number(value.seq)) ? Number(value.seq) : 0,
	};
}

/*
 * Return one sheet's in-memory entry map, lazily hydrating it from
 * sessionStorage the first time the sheet is touched after a page load and
 * keeping the seq counter monotonic across reloads.
 */
function getSheetPendingEntries(sheetId: string) {
	let entries = entriesBySheetId.get(sheetId);
	if (!entries) {
		entries = new Map();
		entriesBySheetId.set(sheetId, entries);
	}

	if (!hydratedSheetIds.has(sheetId)) {
		hydratedSheetIds.add(sheetId);

		try {
			const storedJSON = globalThis.sessionStorage?.getItem(getSheetPendingStorageKey(sheetId));
			if (storedJSON) {
				const storedEntries = JSON.parse(storedJSON) as Record<string, any>;
				Object.entries(storedEntries || {}).forEach(([coordKey, storedEntry]) => {
					const entry = sanitizePersistedSheetPendingEntry(storedEntry);
					// In-memory entries written before hydration stay authoritative
					if (entry && !entries!.has(coordKey)) {
						entries!.set(coordKey, entry);
						seqCounter = Math.max(seqCounter, entry.seq + 1);
					}
				});
			}
		} catch {
			// Unreadable storage payloads degrade to an empty overlay
		}
	}

	return entries;
}

/*
 * Persist (or overwrite) one pending edit for a sheet and return its seq token.
 */
export function persistSheetPendingEdit(
	sheetId: string,
	coordKey: string,
	entry: Omit<PersistedSheetPendingEntry, 'seq'>,
) {
	const seq = seqCounter++;
	getSheetPendingEntries(sheetId).set(coordKey, { ...entry, seq });
	writeSheetPendingStorage(sheetId);

	return seq;
}

/*
 * Mark persisted entries as sent (carried by a mutation or an accepted
 * beacon); only an entry still holding the matching seq is updated.
 */
export function markSheetPendingEditsSent(
	sheetId: string,
	refs: Array<{ coordKey: string; seq: number }>,
) {
	const entries = getSheetPendingEntries(sheetId);
	let changed = false;

	refs.forEach((ref) => {
		const entry = entries.get(ref.coordKey);
		if (entry && entry.seq === ref.seq && entry.flushState !== 'sent') {
			entries.set(ref.coordKey, { ...entry, flushState: 'sent' });
			changed = true;
		}
	});

	if (changed) {
		writeSheetPendingStorage(sheetId);
	}
}

/*
 * Remove persisted entries; when a ref carries a seq, only an entry still
 * holding that seq is removed (so stale flush callbacks cannot clear newer
 * edits), otherwise the removal is unconditional.
 */
export function clearSheetPendingEdits(
	sheetId: string,
	refs: Array<{ coordKey: string; seq?: number }>,
) {
	const entries = getSheetPendingEntries(sheetId);
	let changed = false;

	refs.forEach((ref) => {
		const entry = entries.get(ref.coordKey);
		if (entry && (ref.seq === undefined || entry.seq === ref.seq)) {
			entries.delete(ref.coordKey);
			changed = true;
		}
	});

	if (changed) {
		writeSheetPendingStorage(sheetId);
	}
}

/*
 * Return one sheet's persisted entries, dropping (and pruning) entries older
 * than the TTL so a permanently failed save cannot pin a stale preview.
 */
export function readSheetPendingEdits(
	sheetId: string,
	ttlMs: number = SHEET_PENDING_PERSIST_TTL_MS,
) {
	const entries = getSheetPendingEntries(sheetId);
	const expiredCoordKeys: string[] = [];
	const now = Date.now();

	entries.forEach((entry, coordKey) => {
		if (now - entry.editedAt > ttlMs) {
			expiredCoordKeys.push(coordKey);
		}
	});

	if (expiredCoordKeys.length) {
		expiredCoordKeys.forEach((coordKey) => entries.delete(coordKey));
		writeSheetPendingStorage(sheetId);
	}

	return new Map(entries);
}

/*
 * Drop every persisted entry for one sheet. Used when a structure operation
 * shifts coordinates, which would leave persisted coordinate keys stale.
 */
export function clearAllSheetPendingEdits(sheetId: string) {
	const entries = entriesBySheetId.get(sheetId);
	if (entries?.size) {
		entries.clear();
	}

	try {
		globalThis.sessionStorage?.removeItem(getSheetPendingStorageKey(sheetId));
	} catch {
		// Best-effort mirror cleanup
	}
}
