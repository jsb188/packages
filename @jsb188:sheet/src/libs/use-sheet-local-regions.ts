import type { DataTableRowsForSheetRegionGQL } from '@jsb188/mday/types/dataTable.d.ts';
import type { SheetRegionGQL } from '@jsb188/mday/types/sheet.d.ts';
import { useCallback, useMemo, useState } from 'react';
import {
	deleteSheetLocalRegion,
	deleteSheetLocalRegionRows,
	getSheetRegionRowsWithLocalUpdates,
	getSheetRegionsWithLocalUpdates,
	type SheetLocalRegionDeleteInput,
	type SheetLocalRegionRowsById,
	type SheetLocalRegionUpsertInput,
	upsertSheetLocalRegion,
	upsertSheetLocalRegionRows,
} from './sheet-local-state.ts';

/*
 * Own optimistic Sheet region overlays and generated row placements before server data refreshes.
 */
export function useSheetLocalRegions(serverRegions?: SheetRegionGQL[] | null) {
	const [localRegions, setLocalRegions] = useState<SheetRegionGQL[] | null>(null);
	const [localRegionRowsById, setLocalRegionRowsById] = useState<SheetLocalRegionRowsById>({});
	const sheetRegions = useMemo(() => {
		return getSheetRegionsWithLocalUpdates(serverRegions, localRegions);
	}, [localRegions, serverRegions]);
	const resetLocalRegions = useCallback(() => {
		setLocalRegionRowsById({});
		setLocalRegions(null);
	}, []);
	const applyLocalSheetRegionUpsert = useCallback((input: SheetLocalRegionUpsertInput) => {
		setLocalRegions((currentRegions) => {
			return upsertSheetLocalRegion(currentRegions, serverRegions, input);
		});
		setLocalRegionRowsById((currentRowsById) => {
			return upsertSheetLocalRegionRows(currentRowsById, input);
		});
	}, [serverRegions]);
	const applyLocalSheetRegionDelete = useCallback((input: SheetLocalRegionDeleteInput) => {
		setLocalRegions((currentRegions) => {
			return deleteSheetLocalRegion(currentRegions, serverRegions, input);
		});
		setLocalRegionRowsById((currentRowsById) => {
			return deleteSheetLocalRegionRows(currentRowsById, input);
		});
	}, [serverRegions]);
	const getRegionRowsWithLocalUpdates = useCallback((serverRows?: DataTableRowsForSheetRegionGQL[] | null) => {
		return getSheetRegionRowsWithLocalUpdates(serverRows, localRegionRowsById);
	}, [localRegionRowsById]);

	return {
		applyLocalSheetRegionDelete,
		applyLocalSheetRegionUpsert,
		getRegionRowsWithLocalUpdates,
		resetLocalRegions,
		sheetRegions,
	};
}
