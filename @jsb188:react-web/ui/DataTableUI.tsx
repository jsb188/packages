import { SheetGridSurface, type SheetGridSurfaceProps } from './SheetGridSurface';

export type DataTableUIProps = SheetGridSurfaceProps;

/*
 * Render the shared grid surface through a DataTable-specific UI boundary.
 */

export function DataTableUI(p: DataTableUIProps) {
	return <SheetGridSurface {...p} />;
}

export default DataTableUI;
