import {
	isDataTableDateLikeFieldType,
	isDataTableNumberLikeFieldType,
} from '@jsb188/mday/utils/dataTable.ts';
import type { DataTableCellGQL } from '@jsb188/mday/types/dataTable.d.ts';
import type { SheetCellGQL, SheetRegionGQL } from '@jsb188/mday/types/sheet.d.ts';
import { getSheetRegionSourceId } from '@jsb188/mday/utils/sheet.ts';
import { useCallback, useEffect, useRef, useState } from 'react';
import { sendCellSaveBeacon } from './cell-save-beacon.ts';
import {
	getDataTableCellSerializedValue,
	getSheetEditorFieldType,
	type DataTableRuntimeDesignCell,
} from './dataTable-cell-editing.tsx';
import {
	type SheetDataTableCellEditTarget,
	type SheetDataTableCellHistoryChange,
} from './sheet-history.ts';
import {
	groupCellSaveItemsByTarget,
	sendGroupedCellSaveItems,
	useDebouncedCellSaveBatch,
} from './use-debounced-cell-save-batch.ts';

type SheetPendingDataTableCellSave = {
	cellKey: string;
	dataTableId: string;
	dataTableRowId: string;
	optimisticKey: string;
	organizationId: string | number | bigint | null;
	saveVersion: number;
	target: SheetDataTableCellEditTarget;
	value: string | null;
};

export type SheetSaveDataTableCellsParams = {
	cells: Array<{
		cellKey: string;
		dataTableRowId: string;
		value: string | null;
	}>;
	dataTableId: string;
};

export type UseSheetDataTableOptimisticValuesParams = {
	designCellsByDataTableId: Map<string, Map<string, DataTableRuntimeDesignCell>>;
	onSaveDataTableCells: (params: SheetSaveDataTableCellsParams) => Promise<unknown> | unknown;
	sheetId: string;
	sourceCellsByTargetKey: Map<string, DataTableCellGQL>;
};

/*
 * Return a stable key for a DataTable source cell target.
 */
export function getSheetDataTableSourceCellKey(dataTableId: string, dataTableRowId: string, cellKey: string) {
	return `${dataTableId}:${dataTableRowId}:${cellKey}`;
}

/*
 * Return the parts encoded inside a Sheet DataTable source cell key.
 */
function parseSheetDataTableSourceCellKey(sourceKey: string) {
	const parts = sourceKey.split(':');
	const cellKey = parts.pop() || '';
	const dataTableRowId = parts.pop() || '';
	const dataTableId = parts.join(':');

	return {
		cellKey,
		dataTableId,
		dataTableRowId,
	};
}

/*
 * Return hydrated source DataTable cells keyed by dataTable, row, and cell key.
 */
export function getSourceDataTableCellsByTargetKey(cells?: DataTableCellGQL[] | null) {
	return new Map((cells || [])
		.filter((cell) => cell?.dataTableId && cell.dataTableRowId && cell.cellKey)
		.map((cell) => [
			getSheetDataTableSourceCellKey(String(cell.dataTableId), String(cell.dataTableRowId), String(cell.cellKey)),
			cell,
		]));
}

/*
 * Return the design cell used to compare one Sheet DataTable optimistic value.
 */
function getSheetDataTableDesignCellForSourceKey(
	sourceKey: string,
	sourceCell: DataTableCellGQL | null | undefined,
	designCellsByDataTableId: Map<string, Map<string, DataTableRuntimeDesignCell>>,
) {
	const keyParts = parseSheetDataTableSourceCellKey(sourceKey);
	const dataTableId = String(sourceCell?.dataTableId || keyParts.dataTableId || '');
	const cellKey = String(sourceCell?.cellKey || keyParts.cellKey || '');

	return designCellsByDataTableId.get(dataTableId)?.get(cellKey) || null;
}

/*
 * Return the latest saved value for a queued Sheet DataTable cell save.
 */
function getSheetPendingDataTableCellSaveCurrentValue(
	item: SheetPendingDataTableCellSave,
	sourceCellsByTargetKey: Map<string, DataTableCellGQL>,
	designCellsByDataTableId: Map<string, Map<string, DataTableRuntimeDesignCell>>,
) {
	const sourceCell = sourceCellsByTargetKey.get(item.optimisticKey) || item.target.lookup.cell || null;
	const designCell = getSheetDataTableDesignCellForSourceKey(
		item.optimisticKey,
		sourceCell,
		designCellsByDataTableId,
	) || item.target.lookup.designCell;

	return getDataTableCellSerializedValue(sourceCell, designCell);
}

/*
 * Return optimistic DataTable source keys that have caught up to the latest server source cells.
 */
function getConfirmedSheetDataTableOptimisticKeys(params: {
	designCellsByDataTableId: Map<string, Map<string, DataTableRuntimeDesignCell>>;
	optimisticValues: Record<string, string | null>;
	sourceCellsByTargetKey: Map<string, DataTableCellGQL>;
}) {
	const confirmedKeys: string[] = [];

	Object.entries(params.optimisticValues).forEach(([sourceKey, optimisticValue]) => {
		const sourceCell = params.sourceCellsByTargetKey.get(sourceKey);

		if (!sourceCell) {
			return;
		}

		const designCell = getSheetDataTableDesignCellForSourceKey(
			sourceKey,
			sourceCell,
			params.designCellsByDataTableId,
		);

		if (!designCell) {
			return;
		}

		if (getDataTableCellSerializedValue(sourceCell || null, designCell) === optimisticValue) {
			confirmedKeys.push(sourceKey);
		}
	});

	return confirmedKeys;
}

/*
 * Return Sheet cell value fields that mirror one pending DataTable serialized value.
 */
function getSheetCellValueFieldsFromDataTableOptimisticValue(
	value: string | null,
	designCell?: DataTableRuntimeDesignCell | null,
) {
	if (value === null || value === undefined || value === '') {
		return {
			value: value ?? null,
			textValue: value ?? null,
			numberValue: null,
			booleanValue: null,
			dateValue: null,
			datetimeValue: null,
		};
	}

	const fieldType = designCell ? getSheetEditorFieldType(designCell) : null;
	if (isDataTableNumberLikeFieldType(fieldType)) {
		const numberValue = Number(value);

		return Number.isFinite(numberValue)
			? {
				value,
				textValue: null,
				numberValue,
				booleanValue: null,
				dateValue: null,
				datetimeValue: null,
			}
			: {
				value,
				textValue: value,
				numberValue: null,
				booleanValue: null,
				dateValue: null,
				datetimeValue: null,
			};
	}

	if (fieldType === 'BOOLEAN' && (value === 'true' || value === 'false')) {
		const booleanValue = value === 'true';

		return {
			value,
			textValue: booleanValue ? 'TRUE' : 'FALSE',
			numberValue: null,
			booleanValue,
			dateValue: null,
			datetimeValue: null,
		};
	}

	return {
		value,
		textValue: value,
		numberValue: null,
		booleanValue: null,
		dateValue: isDataTableDateLikeFieldType(fieldType) ? value : null,
		datetimeValue: fieldType === 'DATETIME' ? value : null,
	};
}

/*
 * Return generated region cells with pending DataTable values overlaid for instant formula recalculation.
 */
export function getSheetCellsWithOptimisticDataTableValues(params: {
	cellsByCoord: Map<string, SheetCellGQL>;
	designCellsByDataTableId: Map<string, Map<string, DataTableRuntimeDesignCell>>;
	optimisticValues: Record<string, string | null>;
	regionsById: Map<string, SheetRegionGQL>;
	sourceCellsByTargetKey: Map<string, DataTableCellGQL>;
}) {
	const optimisticEntries = Object.entries(params.optimisticValues);
	if (!optimisticEntries.length) {
		return params.cellsByCoord;
	}

	let nextCellsByCoord: Map<string, SheetCellGQL> | null = null;
	const optimisticValuesByKey = new Map(optimisticEntries);

	params.cellsByCoord.forEach((cell, coordKey) => {
		if (cell.sourceType !== 'REGION_GENERATED') {
			return;
		}

		const regionId = String(cell.regionId || cell.region?.regionId || '');
		const sourceRowId = String(cell.region?.sourceRowId || '');
		const sourceCellKey = String(cell.region?.sourceCellKey || '');
		const region = params.regionsById.get(regionId);
		const sourceId = getSheetRegionSourceId(region);

		if (!sourceId || !sourceRowId || !sourceCellKey) {
			return;
		}

		const sourceKey = getSheetDataTableSourceCellKey(sourceId, sourceRowId, sourceCellKey);
		if (!optimisticValuesByKey.has(sourceKey)) {
			return;
		}

		const sourceCell = params.sourceCellsByTargetKey.get(sourceKey);
		const designCell = getSheetDataTableDesignCellForSourceKey(
			sourceKey,
			sourceCell,
			params.designCellsByDataTableId,
		);
		const optimisticValue = optimisticValuesByKey.get(sourceKey) ?? null;

		if (!nextCellsByCoord) {
			nextCellsByCoord = new Map(params.cellsByCoord);
		}
		nextCellsByCoord.set(coordKey, {
			...cell,
			...getSheetCellValueFieldsFromDataTableOptimisticValue(optimisticValue, designCell),
		});
	});

	return nextCellsByCoord || params.cellsByCoord;
}

/*
 * Own optimistic DataTable cell values rendered through Sheet regions and queue their background saves.
 */
export function useSheetDataTableOptimisticValues(params: UseSheetDataTableOptimisticValuesParams) {
	const [optimisticValues, setOptimisticValues] = useState<Record<string, string | null>>({});
	const saveVersionRef = useRef<Record<string, number>>({});
	const { queue } = useDebouncedCellSaveBatch<SheetPendingDataTableCellSave>({
		getKey: (item) => item.optimisticKey,
		onError: (items) => {
			setOptimisticValues((currentValues) => {
				const next = { ...currentValues };
				let changed = false;

				items.forEach((item) => {
					if (saveVersionRef.current[item.optimisticKey] === item.saveVersion) {
						delete next[item.optimisticKey];
						changed = true;
					}
				});

				return changed ? next : currentValues;
			});
		},
		onBeaconFlush: (items) => {
			const mutationItems = items.filter((item) => {
				return getSheetPendingDataTableCellSaveCurrentValue(
					item,
					params.sourceCellsByTargetKey,
					params.designCellsByDataTableId,
				) !== item.value;
			});
			const groups = groupCellSaveItemsByTarget(mutationItems, (item) => ({
				organizationId: item.organizationId,
				targetId: item.dataTableId,
			}));

			return sendGroupedCellSaveItems(groups, (group) => {
				return sendCellSaveBeacon({
					cells: group.items.map((item) => ({
						cellKey: item.cellKey,
						dataTableRowId: item.dataTableRowId,
						value: item.value,
					})),
					organizationId: group.organizationId || null,
					targetId: group.targetId || null,
					targetType: 'dataTable',
				});
			});
		},
		onFlush: async (items) => {
			const syncedKeys = items
				.filter((item) => {
					return saveVersionRef.current[item.optimisticKey] === item.saveVersion &&
						getSheetPendingDataTableCellSaveCurrentValue(
							item,
							params.sourceCellsByTargetKey,
							params.designCellsByDataTableId,
						) === item.value;
				})
				.map((item) => item.optimisticKey);

			if (syncedKeys.length) {
				setOptimisticValues((currentValues) => {
					const next = { ...currentValues };
					let changed = false;

					syncedKeys.forEach((key) => {
						delete next[key];
						changed = true;
					});

					return changed ? next : currentValues;
				});
			}

			const mutationItems = items.filter((item) => !syncedKeys.includes(item.optimisticKey));
			const groups = groupCellSaveItemsByTarget(
				mutationItems.filter((item) => {
					return getSheetPendingDataTableCellSaveCurrentValue(
						item,
						params.sourceCellsByTargetKey,
						params.designCellsByDataTableId,
					) !== item.value;
				}),
				(item) => ({
					organizationId: item.organizationId,
					targetId: item.dataTableId,
				}),
			);
			const savedCellsByKey = new Map<string, DataTableCellGQL>();

			for (const group of groups) {
				if (!group.targetId) {
					continue;
				}

				const result = await params.onSaveDataTableCells({
					dataTableId: String(group.targetId),
					cells: group.items.map((item) => ({
						cellKey: item.cellKey,
						dataTableRowId: item.dataTableRowId,
						value: item.value,
					})),
				}) as { editDataTableCells?: DataTableCellGQL[] } | undefined;
				const savedCells = (result?.editDataTableCells || []) as DataTableCellGQL[];

				savedCells.forEach((cell) => {
					if (!cell?.dataTableId || !cell.dataTableRowId || !cell.cellKey) {
						return;
					}

					savedCellsByKey.set(
						getSheetDataTableSourceCellKey(
							String(cell.dataTableId),
							String(cell.dataTableRowId),
							String(cell.cellKey),
						),
						cell,
					);
				});
			}

			if (!savedCellsByKey.size) {
				return;
			}

			setOptimisticValues((currentValues) => {
				const next = { ...currentValues };
				let changed = false;

				mutationItems.forEach((item) => {
					const savedCell = savedCellsByKey.get(item.optimisticKey);

					if (
						savedCell &&
						saveVersionRef.current[item.optimisticKey] === item.saveVersion
					) {
						next[item.optimisticKey] = getDataTableCellSerializedValue(
							savedCell,
							item.target.lookup.designCell,
						);
						changed = true;
					}
				});

				return changed ? next : currentValues;
			});
		},
	});

	useEffect(() => {
		setOptimisticValues({});
		saveVersionRef.current = {};
	}, [params.sheetId]);

	useEffect(() => {
		const confirmedKeys = getConfirmedSheetDataTableOptimisticKeys({
			designCellsByDataTableId: params.designCellsByDataTableId,
			optimisticValues,
			sourceCellsByTargetKey: params.sourceCellsByTargetKey,
		});

		if (!confirmedKeys.length) {
			return;
		}

		setOptimisticValues((currentValues) => {
			const next = { ...currentValues };
			let changed = false;

			getConfirmedSheetDataTableOptimisticKeys({
				designCellsByDataTableId: params.designCellsByDataTableId,
				optimisticValues: currentValues,
				sourceCellsByTargetKey: params.sourceCellsByTargetKey,
			}).forEach((key) => {
				delete next[key];
				changed = true;
			});

			return changed ? next : currentValues;
		});
	}, [optimisticValues, params.designCellsByDataTableId, params.sourceCellsByTargetKey]);

	const applyChanges = useCallback((changes: SheetDataTableCellHistoryChange[], direction: 'after' | 'before') => {
		if (!changes.length) {
			return;
		}

		const pendingSaves = changes.flatMap((change) => {
			const dataTableId = String(change.target.dataTable.id || '');

			if (!dataTableId) {
				return [];
			}

			const optimisticKey = getSheetDataTableSourceCellKey(
				dataTableId,
				change.target.sourceRowId,
				change.target.sourceCellKey,
			);
			const saveVersion = (saveVersionRef.current[optimisticKey] || 0) + 1;

			saveVersionRef.current[optimisticKey] = saveVersion;

			return [{
				cellKey: change.target.sourceCellKey,
				dataTableId,
				dataTableRowId: change.target.sourceRowId,
				optimisticKey,
				organizationId: change.target.dataTable.organizationId || null,
				saveVersion,
				target: change.target,
				value: change[direction],
			} satisfies SheetPendingDataTableCellSave];
		});

		setOptimisticValues((current) => {
			const next = { ...current };

			pendingSaves.forEach((item) => {
				next[item.optimisticKey] = item.value;
			});
			return next;
		});

		pendingSaves.forEach(queue);
	}, [queue]);

	const clearOptimisticValue = useCallback((optimisticKey: string) => {
		setOptimisticValues((current) => {
			if (!(optimisticKey in current)) {
				return current;
			}

			const next = { ...current };
			delete next[optimisticKey];
			return next;
		});
	}, []);

	return {
		applyChanges,
		clearOptimisticValue,
		optimisticValues,
	};
}
