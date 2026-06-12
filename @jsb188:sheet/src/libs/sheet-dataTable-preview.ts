import type { DataTableCellGQL, DataTableGQL } from '@jsb188/mday/types/dataTable.d.ts';
import type { SheetCellGQL, SheetRegionGQL } from '@jsb188/mday/types/sheet.d.ts';
import {
	isDataTableDateLikeFieldType,
	isDataTableNumberLikeFieldType,
} from '@jsb188/mday/utils/dataTable.ts';
import { getSheetRegionSourceId } from '@jsb188/mday/utils/sheet.ts';
import {
	getDataTableCellSerializedValue,
	getSheetEditorFieldType,
	type DataTableRuntimeDesignCell,
} from './dataTable-cell-editing.tsx';

/*
 * Pure helpers for previewing DataTable source cell values inside Sheet
 * regions: source-key encoding, serialized-value lookups, and the value-field
 * mapping used to build instant pending previews.
 */

/*
 * Return DataTable design cells indexed by table id and source cell key for
 * Sheet-region lookups.
 */
export function getSheetDataTableDesignCellsByTableId(dataTables?: DataTableGQL[] | null) {
	return new Map((dataTables || []).map((dataTable) => {
		return [
			String(dataTable.id || ''),
			new Map((dataTable.design?.cells || []).map((cell) => {
				return [cell.key, cell as DataTableRuntimeDesignCell];
			})),
		];
	}));
}

/*
 * Return a stable key for a DataTable source cell target.
 */
export function getSheetDataTableSourceCellKey(dataTableId: string, dataTableRowId: string, cellKey: string) {
	return `${dataTableId}:${dataTableRowId}:${cellKey}`;
}

/*
 * Return the parts encoded inside a Sheet DataTable source cell key.
 */
export function parseSheetDataTableSourceCellKey(sourceKey: string) {
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
 * Return the design cell used to interpret one Sheet DataTable source value.
 */
export function getSheetDataTableDesignCellForSourceKey(
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
 * Return the latest confirmed serialized value for one DataTable source key.
 */
export function getSheetDataTableSourceCellCurrentValue(
	sourceKey: string,
	sourceCellsByTargetKey: Map<string, DataTableCellGQL>,
	designCellsByDataTableId: Map<string, Map<string, DataTableRuntimeDesignCell>>,
	fallbackCell?: DataTableCellGQL | null,
	fallbackDesignCell?: DataTableRuntimeDesignCell | null,
) {
	const sourceCell = sourceCellsByTargetKey.get(sourceKey) || fallbackCell || null;
	const designCell = getSheetDataTableDesignCellForSourceKey(
		sourceKey,
		sourceCell,
		designCellsByDataTableId,
	) || fallbackDesignCell;

	return getDataTableCellSerializedValue(sourceCell, designCell as DataTableRuntimeDesignCell);
}

/*
 * Return Sheet cell value fields that mirror one pending DataTable serialized value.
 */
export function getSheetCellValueFieldsFromDataTableOptimisticValue(
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
 * Return the DataTable cell metadata fields projected onto one materialized
 * region cell (sourceMeta), so facades mirror DataTable link, icon, and
 * edit-lock behavior. The iconName key must always be PRESENT on facades:
 * the display model checks ('iconName' in cell) before falling back to the
 * design cell icon.
 */
export function getDataTableCellFieldsFromSheetSourceMeta(cell: SheetCellGQL) {
	return {
		iconName: cell.sourceMeta?.iconName ?? null,
		relatedTable: cell.sourceMeta?.relatedTable ?? null,
		relatedId: cell.sourceMeta?.relatedId ?? null,
		reference: null,
		referenceStatus: cell.sourceMeta?.referenceStatus ?? null,
	};
}

/*
 * Return the DataTable source key one materialized region cell mirrors, or
 * null when the cell is not a region-generated DataTable projection.
 */
export function getSheetCellDataTableSourceKey(
	cell: SheetCellGQL,
	regionsById: Map<string, SheetRegionGQL>,
) {
	if (cell.sourceType !== 'REGION_GENERATED') {
		return null;
	}

	const regionId = String(cell.regionId || cell.region?.regionId || '');
	const sourceRowId = String(cell.region?.sourceRowId || '');
	const sourceCellKey = String(cell.region?.sourceCellKey || '');
	const sourceId = getSheetRegionSourceId(regionsById.get(regionId));

	if (!sourceId || !sourceRowId || !sourceCellKey) {
		return null;
	}

	return getSheetDataTableSourceCellKey(sourceId, sourceRowId, sourceCellKey);
}
