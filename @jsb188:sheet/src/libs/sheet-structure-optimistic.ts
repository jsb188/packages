import type {
	SheetDesignObj,
} from '@jsb188/mday/types/sheet.d.ts';

/*
 * Give React and the browser one frame to paint the optimistic structure edit before starting the mutation.
 */
export function waitForSheetStructureOptimisticPaint() {
	return new Promise<void>((resolve) => {
		if (typeof globalThis.requestAnimationFrame === 'function') {
			globalThis.requestAnimationFrame(() => resolve());
			return;
		}

		globalThis.setTimeout(resolve, 0);
	});
}

/*
 * Return whether the server Sheet design has caught up to one optimistic structure design.
 */
export function sheetStructureDesignMatchesServerDesign(serverDesign: SheetDesignObj, optimisticDesign?: SheetDesignObj | null) {
	if (!optimisticDesign) {
		return false;
	}

	return (
		serverDesign.grid.rowCount === optimisticDesign.grid.rowCount &&
		serverDesign.grid.columnCount === optimisticDesign.grid.columnCount &&
		JSON.stringify(serverDesign.rows || {}) === JSON.stringify(optimisticDesign.rows || {}) &&
		JSON.stringify(serverDesign.columns || {}) === JSON.stringify(optimisticDesign.columns || {})
	);
}
