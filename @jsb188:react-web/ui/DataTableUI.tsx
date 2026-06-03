import { DataTableGridSurface, type DataTableGridSurfaceProps } from './DataTableGridSurface';

export type DataTableUIProps = DataTableGridSurfaceProps;

/*
 * Render the DataTable-owned DOM grid surface.
 */

export function DataTableUI(p: DataTableUIProps) {
	return <DataTableGridSurface {...p} />;
}

export default DataTableUI;
