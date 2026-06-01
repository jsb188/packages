import {
	getSheetCellKey,
	type SheetUICellRenderSnapshot,
	type SheetUICellRenderStore,
} from '@jsb188/react-web/ui/SheetUI';

type DataTableRenderStoreListener = () => void;

/*
 * Return whether two cell render snapshots expose the same UI state.
 */

function areDataTableCellRenderSnapshotsEqual(
	a: SheetUICellRenderSnapshot | undefined,
	b: SheetUICellRenderSnapshot,
) {
	return a?.cell === b.cell &&
		Boolean(a?.active) === Boolean(b.active) &&
		a?.editState === b.editState &&
		Boolean(a?.selected) === Boolean(b.selected);
}

/*
 * Create the small per-cell subscription store used by the DataTable grid renderer.
 */

export function createDataTableUICellRenderStore(): SheetUICellRenderStore & {
	deleteMissing: (activeKeys: Set<string>) => void;
	setSnapshot: (rowId: string, cellKey: string, snapshot: SheetUICellRenderSnapshot) => void;
} {
	const snapshots = new Map<string, SheetUICellRenderSnapshot>();
	const listeners = new Map<string, Set<DataTableRenderStoreListener>>();
	const pendingKeys = new Set<string>();
	let flushQueued = false;
	const emptySnapshot: SheetUICellRenderSnapshot = {
		active: false,
		editState: null,
		selected: false,
	};

	const queueEmit = (key: string) => {
		pendingKeys.add(key);

		if (flushQueued) {
			return;
		}

		flushQueued = true;
		queueMicrotask(() => {
			const keys = Array.from(pendingKeys);

			pendingKeys.clear();
			flushQueued = false;

			keys.forEach((pendingKey) => {
				listeners.get(pendingKey)?.forEach((listener) => {
					listener();
				});
			});
		});
	};

	return {
		deleteMissing: (activeKeys: Set<string>) => {
			Array.from(snapshots.keys()).forEach((key) => {
				if (activeKeys.has(key)) {
					return;
				}

				snapshots.delete(key);
				queueEmit(key);
			});
		},
		getSnapshot: (rowId: string, cellKey: string) => {
			return snapshots.get(getSheetCellKey(rowId, cellKey)) || emptySnapshot;
		},
		setSnapshot: (rowId: string, cellKey: string, snapshot: SheetUICellRenderSnapshot) => {
			const key = getSheetCellKey(rowId, cellKey);

			if (areDataTableCellRenderSnapshotsEqual(snapshots.get(key), snapshot)) {
				return;
			}

			snapshots.set(key, snapshot);
			queueEmit(key);
		},
		subscribe: (rowId: string, cellKey: string, listener: DataTableRenderStoreListener) => {
			const key = getSheetCellKey(rowId, cellKey);
			const keyListeners = listeners.get(key) || new Set<DataTableRenderStoreListener>();

			keyListeners.add(listener);
			listeners.set(key, keyListeners);

			return () => {
				keyListeners.delete(listener);

				if (!keyListeners.size) {
					listeners.delete(key);
				}
			};
		},
	};
}
