import type { SheetRegionGQL } from '@jsb188/mday/types/sheet.d.ts';
import { useCallback, useMemo, useState } from 'react';
import {
	deleteSheetLocalRegion,
	getSheetRegionsWithLocalUpdates,
	type SheetLocalRegionDeleteInput,
	type SheetLocalRegionUpsertInput,
	upsertSheetLocalRegion,
} from './sheet-local-state.ts';

/*
 * Own optimistic Sheet region overlays before server data refreshes. Region
 * CELLS are materialized server-side and live in the confirmed cell store;
 * this hook only overlays the region frame definitions.
 */
export function useSheetLocalRegions(serverRegions?: SheetRegionGQL[] | null) {
	const [localRegions, setLocalRegions] = useState<SheetRegionGQL[] | null>(null);
	const sheetRegions = useMemo(() => {
		return getSheetRegionsWithLocalUpdates(serverRegions, localRegions);
	}, [localRegions, serverRegions]);
	const resetLocalRegions = useCallback(() => {
		setLocalRegions(null);
	}, []);
	const applyLocalSheetRegionUpsert = useCallback((input: SheetLocalRegionUpsertInput) => {
		setLocalRegions((currentRegions) => {
			return upsertSheetLocalRegion(currentRegions, serverRegions, input);
		});
	}, [serverRegions]);
	const applyLocalSheetRegionDelete = useCallback((input: SheetLocalRegionDeleteInput) => {
		setLocalRegions((currentRegions) => {
			return deleteSheetLocalRegion(currentRegions, serverRegions, input);
		});
	}, [serverRegions]);

	return {
		applyLocalSheetRegionDelete,
		applyLocalSheetRegionUpsert,
		resetLocalRegions,
		sheetRegions,
	};
}
