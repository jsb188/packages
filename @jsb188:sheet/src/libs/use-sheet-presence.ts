import WS_ACTIONS from '@jsb188/app/constants/wsActions.ts';
import { createThrottledInvoke } from '@jsb188/app/utils/logic.ts';
import type { SheetUISelectedCellKeyMap, SheetUISelectedCellState } from '@jsb188/react-web/ui/SheetUI';
import { useAtomValue } from 'jotai';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { PrimitiveAtom } from 'jotai';
import {
	getSheetCollabUserColor,
	type SheetCollabAdapter,
	type SheetCollabSelection,
	type SheetCollabUser,
	type SheetPresenceRosterEntry,
	type SheetRemoteSelection,
} from './sheet-collab.ts';

// Cadence for relaying the viewer's own selection to the room
const SHEET_SELECTION_BROADCAST_THROTTLE_MS = 100;

// Sweep cadence for dropping selections of users no longer in the roster
const SHEET_REMOTE_SELECTION_SWEEP_MS = 10000;

export type SheetRemoteChangeEvent = {
	sheetId: string;
	user: SheetCollabUser;
	change: Record<string, any>;
	at: number;
};

export type UseSheetPresenceParams = {
	adapter?: SheetCollabAdapter | null;
	connected?: boolean;
	onRemoteChange?: (event: SheetRemoteChangeEvent) => void;
	organizationId?: string | null;
	selectedCellKeyMapAtom: PrimitiveAtom<SheetUISelectedCellKeyMap | null>;
	selectedCellStateAtom: PrimitiveAtom<SheetUISelectedCellState | null>;
	selfUser?: SheetCollabUser | null;
	sheetId?: string | null;
};

/*
 * Return the index bounds of one selection key map; keys are
 * "rowIndex:columnIndex" strings.
 */
function getSheetSelectionBoundsFromKeyMap(selectedCellKeyMap?: SheetUISelectedCellKeyMap | null) {
	let startRowIndex = 0;
	let endRowIndex = 0;
	let startColumnIndex = 0;
	let endColumnIndex = 0;

	Object.keys(selectedCellKeyMap || {}).forEach((key) => {
		const [rowPart, columnPart] = key.split(':');
		const rowIndex = Math.floor(Number(rowPart));
		const columnIndex = Math.floor(Number(columnPart));
		if (!rowIndex || !columnIndex) {
			return;
		}

		startRowIndex = startRowIndex ? Math.min(startRowIndex, rowIndex) : rowIndex;
		endRowIndex = Math.max(endRowIndex, rowIndex);
		startColumnIndex = startColumnIndex ? Math.min(startColumnIndex, columnIndex) : columnIndex;
		endColumnIndex = Math.max(endColumnIndex, columnIndex);
	});

	if (!startRowIndex || !startColumnIndex) {
		return null;
	}

	return { startRowIndex, startColumnIndex, endRowIndex, endColumnIndex };
}

/*
 * Return the wire selection payload for the viewer's current selection state.
 */
function getSheetCollabSelectionPayload(
	selectedCellState?: SheetUISelectedCellState | null,
	selectedCellKeyMap?: SheetUISelectedCellKeyMap | null,
): SheetCollabSelection | null {
	const activeRowIndex = Math.floor(Number(selectedCellState?.rowId || 0));
	const activeColumnIndex = Math.floor(Number(selectedCellState?.cellKey || 0));
	const active = activeRowIndex && activeColumnIndex
		? { rowIndex: activeRowIndex, columnIndex: activeColumnIndex }
		: null;
	const range = getSheetSelectionBoundsFromKeyMap(selectedCellKeyMap) ||
		(active
			? {
				startRowIndex: active.rowIndex,
				startColumnIndex: active.columnIndex,
				endRowIndex: active.rowIndex,
				endColumnIndex: active.columnIndex,
			}
			: null);

	if (!range) {
		return null;
	}

	return { range, active };
}

/*
 * Own one sheet's collaboration presence: join/leave the sheet room, track
 * the viewer roster and remote selections, broadcast the viewer's own
 * selection, and relay local-change events both ways. Fully inert when no
 * adapter is provided (preview routes, tests, logged-out).
 */
export function useSheetPresence(params: UseSheetPresenceParams) {
	const { adapter, connected, onRemoteChange, organizationId, selfUser, sheetId } = params;
	const selectedCellState = useAtomValue(params.selectedCellStateAtom);
	const selectedCellKeyMap = useAtomValue(params.selectedCellKeyMapAtom);

	const [rosterByAccountId, setRosterByAccountId] = useState<Map<string, SheetPresenceRosterEntry>>(() => new Map());
	const [remoteSelectionsByAccountId, setRemoteSelectionsByAccountId] = useState<Map<string, SheetRemoteSelection>>(
		() => new Map(),
	);

	const selfAccountId = selfUser?.accountId || '';
	const enabled = Boolean(adapter && connected && selfAccountId && sheetId && organizationId);

	const onRemoteChangeRef = useRef(onRemoteChange);
	onRemoteChangeRef.current = onRemoteChange;

	const ownSelectionRef = useRef<SheetCollabSelection | null>(null);

	/*
	 * Join the sheet room and subscribe to presence/selection/change events.
	 * connected cycles on reconnect, so this re-joins automatically.
	 */
	useEffect(() => {
		if (!enabled || !adapter || !sheetId) {
			return;
		}

		adapter.emit(WS_ACTIONS.sheet_join, { sheetId, organizationId });

		const presenceHandler = adapter.on(WS_ACTIONS.sheet_presence, (data: any) => {
			if (data?.sheetId !== sheetId) {
				return;
			}

			if (data.type === 'SNAPSHOT' && Array.isArray(data.users)) {
				const now = Date.now();
				const nextRoster = new Map<string, SheetPresenceRosterEntry>();
				data.users.forEach((user: SheetCollabUser) => {
					if (user?.accountId && user.accountId !== selfAccountId) {
						nextRoster.set(user.accountId, {
							user,
							color: getSheetCollabUserColor(user.accountId),
							lastSeenAt: now,
						});
					}
				});
				setRosterByAccountId(nextRoster);

				// Stale selections from users absent in the snapshot are ghosts
				setRemoteSelectionsByAccountId((current) => {
					const next = new Map([...current].filter(([accountId]) => nextRoster.has(accountId)));
					return next.size === current.size ? current : next;
				});
				return;
			}

			if (data.type === 'JOIN' && data.user?.accountId && data.user.accountId !== selfAccountId) {
				// Re-announce this viewer's selection so the joiner sees it
				// without waiting for the next local selection change
				if (ownSelectionRef.current) {
					adapter.emit(WS_ACTIONS.sheet_selection, { sheetId, selection: ownSelectionRef.current });
				}

				setRosterByAccountId((current) => {
					const next = new Map(current);
					next.set(data.user.accountId, {
						user: data.user,
						color: getSheetCollabUserColor(data.user.accountId),
						lastSeenAt: Date.now(),
					});
					return next;
				});
				return;
			}

			if (data.type === 'LEAVE' && data.accountId) {
				setRosterByAccountId((current) => {
					if (!current.has(data.accountId)) {
						return current;
					}
					const next = new Map(current);
					next.delete(data.accountId);
					return next;
				});
				setRemoteSelectionsByAccountId((current) => {
					if (!current.has(data.accountId)) {
						return current;
					}
					const next = new Map(current);
					next.delete(data.accountId);
					return next;
				});
			}
		});

		const selectionHandler = adapter.on(WS_ACTIONS.sheet_selection, (data: any) => {
			const accountId = data?.user?.accountId;
			if (data?.sheetId !== sheetId || !accountId || accountId === selfAccountId) {
				return;
			}

			setRemoteSelectionsByAccountId((current) => {
				const next = new Map(current);
				if (data.selection?.range) {
					next.set(accountId, {
						user: data.user,
						color: getSheetCollabUserColor(accountId),
						selection: data.selection,
						at: Number(data.at) || Date.now(),
					});
				} else {
					if (!next.has(accountId)) {
						return current;
					}
					next.delete(accountId);
				}
				return next;
			});
		});

		const changeHandler = adapter.on(WS_ACTIONS.sheet_change, (data: any) => {
			if (data?.sheetId !== sheetId || !data?.change) {
				return;
			}

			onRemoteChangeRef.current?.(data as SheetRemoteChangeEvent);
		});

		return () => {
			adapter.emit(WS_ACTIONS.sheet_leave, { sheetId });
			adapter.off(WS_ACTIONS.sheet_presence, presenceHandler);
			adapter.off(WS_ACTIONS.sheet_selection, selectionHandler);
			adapter.off(WS_ACTIONS.sheet_change, changeHandler);
			setRosterByAccountId(new Map());
			setRemoteSelectionsByAccountId(new Map());
		};
	}, [adapter, enabled, organizationId, selfAccountId, sheetId]);

	/*
	 * Periodic ghost sweep: selections from users no longer in the roster.
	 */
	useEffect(() => {
		if (!enabled) {
			return;
		}

		const intervalId = setInterval(() => {
			setRemoteSelectionsByAccountId((current) => {
				if (!current.size) {
					return current;
				}
				const next = new Map([...current].filter(([accountId]) => rosterByAccountId.has(accountId)));
				return next.size === current.size ? current : next;
			});
		}, SHEET_REMOTE_SELECTION_SWEEP_MS);

		return () => clearInterval(intervalId);
	}, [enabled, rosterByAccountId]);

	/*
	 * Broadcast the viewer's own selection, throttled to the wire cadence.
	 */
	const selectionThrottle = useMemo(() => {
		if (!enabled || !adapter || !sheetId) {
			return null;
		}

		return createThrottledInvoke((selection: SheetCollabSelection | null) => {
			adapter.emit(WS_ACTIONS.sheet_selection, { sheetId, selection });
		}, SHEET_SELECTION_BROADCAST_THROTTLE_MS);
	}, [adapter, enabled, sheetId]);

	const lastSentSelectionRef = useRef<string>('');

	useEffect(() => {
		if (!selectionThrottle) {
			return;
		}

		const selection = getSheetCollabSelectionPayload(selectedCellState, selectedCellKeyMap);
		const serialized = JSON.stringify(selection);
		ownSelectionRef.current = selection;
		if (serialized === lastSentSelectionRef.current) {
			return;
		}

		lastSentSelectionRef.current = serialized;
		selectionThrottle.invoke(selection);
	}, [selectedCellKeyMap, selectedCellState, selectionThrottle]);

	useEffect(() => {
		// A recreated throttle means a fresh room session: drop the dedupe so
		// the current selection re-broadcasts after a reconnect
		lastSentSelectionRef.current = '';
		return () => selectionThrottle?.cancel();
	}, [selectionThrottle]);

	/*
	 * Relay one local change payload to the room (cell previews, clears, or
	 * structure operations).
	 */
	const broadcastChange = useCallback((change: Record<string, any>) => {
		if (enabled && adapter && sheetId) {
			adapter.emit(WS_ACTIONS.sheet_change, { sheetId, change });
		}
	}, [adapter, enabled, sheetId]);

	const roster = useMemo(() => [...rosterByAccountId.values()], [rosterByAccountId]);
	const remoteSelections = useMemo(() => [...remoteSelectionsByAccountId.values()], [remoteSelectionsByAccountId]);

	return {
		broadcastChange,
		remoteSelections,
		roster,
	};
}
