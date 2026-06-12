import { useCallback, useEffect, useRef } from 'react';

// Coalescing window for cell saves. Per-key buffering means a burst of edits
// to the same cell still sends one op; single-in-flight flushing means edits
// made while a batch is saving coalesce into the NEXT batch, so a short
// window self-throttles to the mutation round-trip on busy sheets while
// keeping the page-exit loss window small.
export const CELL_SAVE_BATCH_DELAY_MS = 400;

// One flush carries at most this many entries; the remainder re-flushes
// immediately after the batch settles, keeping any single request bounded
export const CELL_SAVE_BATCH_MAX_ITEMS = 500;

type CellSaveTargetId = string | number | bigint | null | undefined;

export type GroupedCellSaveItems<T> = {
	items: T[];
	organizationId: CellSaveTargetId;
	targetId: CellSaveTargetId;
};

/*
 * Return a stable grouping key for cell saves that target the same backend resource.
 */

function getCellSaveTargetGroupKey(organizationId: CellSaveTargetId, targetId: CellSaveTargetId) {
	return `${organizationId ?? ''}:${targetId ?? ''}`;
}

/*
 * Group pending cell saves by organization and resource id.
 */

export function groupCellSaveItemsByTarget<T>(
	items: T[],
	getTarget: (item: T) => Pick<GroupedCellSaveItems<T>, 'organizationId' | 'targetId'>,
) {
	const groupedItemsByKey = new Map<string, GroupedCellSaveItems<T>>();

	for (const item of items) {
		const target = getTarget(item);
		const groupKey = getCellSaveTargetGroupKey(target.organizationId, target.targetId);
		const group = groupedItemsByKey.get(groupKey);

		if (group) {
			group.items.push(item);
			continue;
		}

		groupedItemsByKey.set(groupKey, {
			items: [item],
			organizationId: target.organizationId,
			targetId: target.targetId,
		});
	}

	return Array.from(groupedItemsByKey.values());
}

/*
 * Return whether every grouped cell save batch was accepted by its sender.
 */

export function sendGroupedCellSaveItems<T>(
	groups: GroupedCellSaveItems<T>[],
	sendGroup: (group: GroupedCellSaveItems<T>) => boolean,
) {
	return groups.every(sendGroup);
}

/*
 * Queue keyed cell edits and flush the latest value for each key after a delay.
 */

export function useDebouncedCellSaveBatch<T>(params: {
	delayMs?: number;
	getKey: (item: T) => string;
	maxItems?: number;
	onBeaconFlush?: (items: T[]) => boolean;
	onError?: (items: T[], error: unknown) => void;
	onFlush: (items: T[]) => Promise<void> | void;
}) {
	const paramsRef = useRef(params);
	const flushingRef = useRef(false);
	const flushRequestedWhileRunningRef = useRef(false);
	const pendingItemsRef = useRef(new Map<string, T>());
	const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	paramsRef.current = params;

	const clearTimer = useCallback(() => {
		if (timerRef.current) {
			clearTimeout(timerRef.current);
			timerRef.current = null;
		}
	}, []);

	const flush = useCallback(() => {
		clearTimer();

		if (flushingRef.current) {
			flushRequestedWhileRunningRef.current = true;
			return;
		}

		// Take at most maxItems entries in insertion order; anything beyond
		// the cap stays buffered and re-flushes right after this batch settles
		const maxItems = paramsRef.current.maxItems ?? CELL_SAVE_BATCH_MAX_ITEMS;
		const items: T[] = [];

		for (const [key, item] of pendingItemsRef.current) {
			if (items.length >= maxItems) {
				break;
			}

			items.push(item);
			pendingItemsRef.current.delete(key);
		}

		if (!items.length) {
			return;
		}

		if (pendingItemsRef.current.size) {
			flushRequestedWhileRunningRef.current = true;
		}

		flushingRef.current = true;
		void (async () => {
			try {
				await paramsRef.current.onFlush(items);
			} catch (error) {
				paramsRef.current.onError?.(items, error);
			} finally {
				flushingRef.current = false;

				if (flushRequestedWhileRunningRef.current) {
					flushRequestedWhileRunningRef.current = false;
					flush();
				}
			}
		})();
	}, [clearTimer]);

	const flushWithBeacon = useCallback(() => {
		clearTimer();

		const items = Array.from(pendingItemsRef.current.values());
		if (!items.length) {
			return;
		}

		if (paramsRef.current.onBeaconFlush?.(items)) {
			pendingItemsRef.current.clear();
			return;
		}

		flush();
	}, [clearTimer, flush]);

	const queue = useCallback((item: T) => {
		pendingItemsRef.current.set(paramsRef.current.getKey(item), item);
		clearTimer();

		// A buffer at the batch cap flushes immediately; the debounce only
		// coalesces keystroke-sized bursts
		if (pendingItemsRef.current.size >= (paramsRef.current.maxItems ?? CELL_SAVE_BATCH_MAX_ITEMS)) {
			flush();
			return;
		}

		timerRef.current = setTimeout(flush, paramsRef.current.delayMs ?? CELL_SAVE_BATCH_DELAY_MS);
	}, [clearTimer, flush]);

	useEffect(() => {
		return () => {
			flush();
		};
	}, [flush]);

	useEffect(() => {
		if (typeof globalThis.addEventListener !== 'function' || typeof document === 'undefined') {
			return;
		}

		const flushBeforePageLeaves = () => {
			flushWithBeacon();
		};
		const flushWhenPageHidden = () => {
			if (document.visibilityState === 'hidden') {
				flushWithBeacon();
			}
		};

		globalThis.addEventListener('pagehide', flushBeforePageLeaves);
		document.addEventListener('visibilitychange', flushWhenPageHidden);

		return () => {
			globalThis.removeEventListener('pagehide', flushBeforePageLeaves);
			document.removeEventListener('visibilitychange', flushWhenPageHidden);
		};
	}, [flushWithBeacon]);

	return {
		flush,
		queue,
	};
}
