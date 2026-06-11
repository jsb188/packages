import i18n from '@jsb188/app/i18n/index.ts';
import { useEditDataTableCells } from '@jsb188/graphql/hooks/use-dataTable-mtn';
import { useDeleteSheetRegion, useEditSheetCells, useEditSheetStructure, useUpdateSheet } from '@jsb188/graphql/hooks/use-sheet-mtn';
import { useDataTableRowsForSheetRegions } from '@jsb188/graphql/hooks/use-dataTable-qry';
import type { SheetGridViewportVariables } from '@jsb188/graphql/hooks/use-sheet-qry';
import {
	useReactiveSheetCells,
	useReactiveSheetFormulaReferences,
	useSheetFormulaReferences,
	useSheetGrid,
} from '@jsb188/graphql/hooks/use-sheet-qry';
import {
	SHEET_CUSTOM_REGION_SOURCE_CHILD_ORGANIZATIONS,
	SHEET_CUSTOM_REGION_SOURCE_CHILD_ORGANIZATION_COLUMNS,
} from '@jsb188/mday/constants/sheet.ts';
import type { DataTableCellGQL, DataTableDesignCellGQL, DataTableGQL, DataTableRowsForSheetRegionGQL } from '@jsb188/mday/types/dataTable.d.ts';
import type { OrganizationOperationEnum } from '@jsb188/mday/types/organization.d.ts';
import type {
	SheetCellGQL,
	SheetDesignObj,
	SheetFormulaReferenceObj,
	SheetGQL,
	SheetRangeGQL,
	SheetRegionGQL,
	SheetStructureOperationEnum,
} from '@jsb188/mday/types/sheet.d.ts';
import { getOrganizationChildListCellFormulaValueFromId, isOrganizationChildProfileLinkCellKey } from '@jsb188/mday/utils/organization.ts';
import { getSheetCustomRegionSourceColumns, getSheetRegionSourceId, getSheetRegionSourceType } from '@jsb188/mday/utils/sheet.ts';
import type { SetFloatingMessage } from '@jsb188/react-web/modules/Layout';
import { useOpenModalPopUp, useOpenModalScreen } from '@jsb188/react/states';
import { useAtom } from 'jotai';
import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createSheetStateAtoms, type SheetStateAtoms } from '../libs/sheet-state.ts';
import {
	type SheetCellEditInput,
	SheetController,
	type SheetDesignPatchInput,
	type SheetInsertViewTableRequest,
} from './SheetController.tsx';
import {
	openDataTableCellLink,
	type DataTableOpenCellParams,
} from '../libs/dataTable-cell-editing.tsx';
import {
	getSheetCellEditInputsForMutation,
	getSheetCellEditInputCoordKey,
	getSheetOptimisticCellRebasedOnBase,
	getSheetOptimisticCellKeysSyncedWithBase,
	sheetCellEditInputMatchesCell,
} from '../libs/sheet-history.ts';
import { sendCellSaveBeacon } from '../libs/cell-save-beacon.ts';
import {
	useDebouncedCellSaveBatch,
} from '../libs/use-debounced-cell-save-batch.ts';
import {
	getSheetCanvasCellsByCoord,
	getSheetCanvasCoordKey,
	getSheetCanvasDesign,
	getSheetCanvasFetchRowCount,
	getSheetCanvasGridViewport,
	getSheetCanvasInitialRowCount,
	getSheetCanvasLoadedRowCount,
	replaceSheetCanvasCellsInViewport,
	SHEET_CANVAS_DEFAULT_VIEWPORT_HEIGHT,
	type SheetLoadedGridState,
} from '../libs/sheet-utils.ts';
import {
	applySheetStructureEditToCellsByCoord,
	applySheetStructureEditToRanges,
	getSheetStructureDesignAfterEdit,
	getSheetStructureProtectedBounds,
} from '../libs/sheet-structure-edit.ts';
import {
	getSheetLoadedGridStateAfterStructureEdit,
	sheetGridCellsMatchPendingStructure,
	sheetGridRangesMatchPendingStructure,
	type SheetPendingStructureGridState,
	sheetStructureDesignMatchesServerDesign,
	waitForSheetStructureOptimisticPaint,
} from '../libs/sheet-structure-optimistic.ts';
import {
	getSheetFormulaReferenceCellsByCoord,
	getSheetFormulaReferencesById,
	getSheetFormulaReferencesFromCells,
	getSheetFormulaReferencesNeedingServerResolution,
} from '../libs/sheet-formula-evaluation.ts';

export interface SheetProps {
	sheet: SheetGQL;
	bufferColumns?: number;
	bufferRows?: number;
	children?: ReactNode;
	className?: string;
	dataTables?: DataTableGQL[] | null;
	disabled?: boolean;
	operation?: OrganizationOperationEnum | null;
	organizationId?: string | null;
	previewAuthToken?: string | null;
	onPreviewReady?: () => void;
	onOpenDataTable?: (route: string) => void;
	organizationProfileAllowEdit?: boolean;
	setFloatingMessage?: SetFloatingMessage;
	timeZone?: string | null;
}

/*
 * Return DataTable design cells for the built-in Child Organizations Sheet source.
 */
function getSheetBuiltInChildOrganizationDesignCells(): DataTableDesignCellGQL[] {
	return SHEET_CUSTOM_REGION_SOURCE_CHILD_ORGANIZATION_COLUMNS.map((column) => {
		const linksToOrganizationProfile = isOrganizationChildProfileLinkCellKey(column.key);

		return {
			key: column.key,
			label: i18n.t(column.labelKey),
			humanLabel: i18n.t(column.labelKey),
			iconName: null,
			fieldType: column.key === 'organizationId'
				? 'ID'
				: linksToOrganizationProfile ? 'ID_OR_TEXT' as DataTableDesignCellGQL['fieldType'] : 'TEXT',
			humanFieldType: linksToOrganizationProfile ? 'ID' : 'TEXT',
			format: null,
			instructions: null,
			source: null,
			options: [],
			openLink: linksToOrganizationProfile,
			humansOnly: false,
			humansCannotEdit: true,
			hidden: false,
			indexed: false,
			width: column.width,
		};
	});
}

/*
 * Return a DataTable-shaped source for custom Child Organizations Sheet regions.
 */
function getSheetBuiltInChildOrganizationsDataTable(organizationId: string): DataTableGQL {
	const columns = getSheetBuiltInChildOrganizationDesignCells();

	return {
		id: SHEET_CUSTOM_REGION_SOURCE_CHILD_ORGANIZATIONS,
		organizationId,
		name: SHEET_CUSTOM_REGION_SOURCE_CHILD_ORGANIZATIONS,
		title: i18n.t('form.vendors'),
		description: null,
		design: {
			id: SHEET_CUSTOM_REGION_SOURCE_CHILD_ORGANIZATIONS,
			cells: columns,
			cellsOrder: columns.map((column) => column.key),
			humansCannotEdit: true,
			instructions: null,
			stickyLeft: 0,
			stickyTop: 0,
		},
		active: true,
		deletedAt: null,
		createdAt: '',
		updatedAt: '',
	};
}

/*
 * Return whether the Sheet has any generated Child Organizations regions.
 */
function hasSheetChildOrganizationsRegion(regions?: SheetRegionGQL[] | null) {
	return (regions || []).some((region) => {
		return getSheetRegionSourceType(region) === SHEET_CUSTOM_REGION_SOURCE_CHILD_ORGANIZATIONS;
	});
}

/*
 * Add built-in DataTable-shaped sources needed by custom Sheet regions.
 */
function getSheetDataTablesWithBuiltInSources(params: {
	dataTables?: DataTableGQL[] | null;
	organizationId: string;
	regions?: SheetRegionGQL[] | null;
}) {
	const dataTables = params.dataTables || [];
	if (!hasSheetChildOrganizationsRegion(params.regions)) {
		return dataTables;
	}

	if (dataTables.some((dataTable) => dataTable?.id === SHEET_CUSTOM_REGION_SOURCE_CHILD_ORGANIZATIONS)) {
		return dataTables;
	}

	return [
		...dataTables,
		getSheetBuiltInChildOrganizationsDataTable(params.organizationId),
	];
}

type SheetViewportRequest = {
	columnCount: number;
	startColumnIndex: number;
};

type SheetPendingCellSave = {
	coordKey: string;
	input: SheetCellEditInput;
	saveVersion: number;
};

type SheetLocalRegionRowsById = Record<string, DataTableRowsForSheetRegionGQL | null>;

export type SheetLocalRegionUpsertInput = {
	region: SheetRegionGQL;
	replaceRegionId?: string | null;
	rows?: DataTableRowsForSheetRegionGQL | null;
};

export type SheetLocalRegionDeleteInput = {
	regionId: string;
};

type SheetFormulaDependencyStateParams = {
	cellsByCoord: Map<string, SheetCellGQL>;
	optimisticCellsByCoord: Map<string, SheetCellGQL>;
	organizationId: string;
	previewAuthToken?: string | null;
	sheetId: string;
	timeZone?: string | null;
};

type SheetFormulaDependencyState = {
	formulaDependencyCellsByCoord: Map<string, SheetCellGQL>;
	formulaReferencesById: Map<string, SheetFormulaReferenceObj>;
};

/*
 * Return the initial empty loaded-grid state for one Sheet.
 */
function getInitialSheetLoadedGridState(
	initialRowCount: number,
): SheetLoadedGridState {
	return {
		cellsByCoord: new Map(),
		hasMoreRows: false,
		lastContentRowIndex: null,
		loadedRowCount: initialRowCount,
	};
}

/*
 * Return whether two sheetGrid viewport variable objects are equivalent.
 */
function sheetViewportVariablesAreEqual(
	a?: SheetGridViewportVariables | null,
	b?: SheetGridViewportVariables | null,
) {
	return a?.startRowIndex === b?.startRowIndex &&
		a?.startColumnIndex === b?.startColumnIndex &&
		a?.rowCount === b?.rowCount &&
		a?.columnCount === b?.columnCount;
}

/*
 * Return whether the current fetched Sheet viewport fully covers a requested viewport.
 */
function sheetViewportContainsRequest(
	currentViewport: SheetGridViewportVariables,
	nextViewport: SheetGridViewportVariables,
) {
	const currentEndRowIndex = currentViewport.startRowIndex +
		currentViewport.rowCount - 1;
	const currentEndColumnIndex = currentViewport.startColumnIndex +
		currentViewport.columnCount - 1;
	const nextEndRowIndex = nextViewport.startRowIndex + nextViewport.rowCount -
		1;
	const nextEndColumnIndex = nextViewport.startColumnIndex +
		nextViewport.columnCount - 1;

	return nextViewport.startRowIndex >= currentViewport.startRowIndex &&
		nextViewport.startColumnIndex >= currentViewport.startColumnIndex &&
		nextEndRowIndex <= currentEndRowIndex &&
		nextEndColumnIndex <= currentEndColumnIndex;
}

/*
 * Return whether one loaded-grid state still matches the blank initial state.
 */
function sheetLoadedGridStateMatchesInitial(
	state: SheetLoadedGridState,
	initialRowCount: number,
) {
	return state.cellsByCoord.size === 0 &&
		state.hasMoreRows === false &&
		state.lastContentRowIndex === null &&
		state.loadedRowCount === initialRowCount;
}

/*
 * Return a cell coordinate map with override cells applied.
 */
function mergeSheetCellCoordMaps(
	baseCellsByCoord: Map<string, SheetCellGQL>,
	overrideCellsByCoord?: Map<string, SheetCellGQL> | null,
) {
	if (!overrideCellsByCoord?.size) {
		return baseCellsByCoord;
	}

	const next = new Map(baseCellsByCoord);
	overrideCellsByCoord.forEach((cell, coordKey) => {
		next.set(coordKey, cell);
	});

	return next;
}

/*
 * Return formula references with later resolved references replacing earlier loading references by id.
 */
function mergeSheetFormulaReferences(
	baseReferences?: SheetFormulaReferenceObj[] | null,
	overrideReferences?: SheetFormulaReferenceObj[] | null,
) {
	if (!overrideReferences?.length) {
		return baseReferences || [];
	}

	const referencesById = new Map<string, SheetFormulaReferenceObj>();
	(baseReferences || []).forEach((reference) => {
		if (reference?.id) {
			referencesById.set(reference.id, reference);
		}
	});
	overrideReferences.forEach((reference) => {
		if (reference?.id) {
			referencesById.set(reference.id, reference);
		}
	});

	return Array.from(referencesById.values());
}

/*
 * Return Sheet regions with local optimistic region edits layered over server regions.
 */
function getSheetRegionsWithLocalUpdates(
	serverRegions?: SheetRegionGQL[] | null,
	localRegions?: SheetRegionGQL[] | null,
) {
	if (!localRegions) {
		return serverRegions || [];
	}

	const localRegionIds = new Set(localRegions.map((region) => String(region.id || '')));
	const activeServerRegions = (serverRegions || []).filter((region) => {
		return !localRegionIds.has(String(region.id || ''));
	});

	return [
		...activeServerRegions,
		...localRegions.filter((region) => region.active !== false),
	];
}

/*
 * Return local Sheet regions after one optimistic region upsert.
 */
function upsertSheetLocalRegion(
	currentRegions: SheetRegionGQL[] | null,
	serverRegions: SheetRegionGQL[] | null | undefined,
	input: SheetLocalRegionUpsertInput,
) {
	const baseRegions = getSheetRegionsWithLocalUpdates(serverRegions, currentRegions);
	const replaceRegionId = String(input.replaceRegionId || input.region.id || '');
	let inserted = false;
	const nextRegions = baseRegions.map((region) => {
		if (String(region.id || '') !== replaceRegionId) {
			return region;
		}

		inserted = true;
		return input.region;
	});

	return inserted ? nextRegions : [...nextRegions, input.region];
}

/*
 * Return local Sheet regions after one optimistic region delete.
 */
function deleteSheetLocalRegion(
	currentRegions: SheetRegionGQL[] | null,
	serverRegions: SheetRegionGQL[] | null | undefined,
	input: SheetLocalRegionDeleteInput,
) {
	const regionId = String(input.regionId || '');
	const baseRegions = getSheetRegionsWithLocalUpdates(serverRegions, currentRegions);
	const nextRegions = baseRegions.filter((region) => String(region.id || '') !== regionId);

	return nextRegions.length === baseRegions.length ? currentRegions : nextRegions;
}

/*
 * Return local region row placements with one optimistic region payload upserted.
 */
function upsertSheetLocalRegionRows(
	currentRowsById: SheetLocalRegionRowsById,
	input: SheetLocalRegionUpsertInput,
) {
	const regionId = String(input.region.id || '');
	if (!regionId) {
		return currentRowsById;
	}

	const nextRowsById = { ...currentRowsById };
	if (input.replaceRegionId && input.replaceRegionId !== regionId) {
		delete nextRowsById[input.replaceRegionId];
	}
	nextRowsById[regionId] = input.rows || null;

	return nextRowsById;
}

/*
 * Return local region row placements after one optimistic region delete.
 */
function deleteSheetLocalRegionRows(
	currentRowsById: SheetLocalRegionRowsById,
	input: SheetLocalRegionDeleteInput,
) {
	if (!(input.regionId in currentRowsById)) {
		return currentRowsById;
	}

	const nextRowsById = { ...currentRowsById };
	delete nextRowsById[input.regionId];

	return nextRowsById;
}

/*
 * Return server region row placements with local optimistic row placements layered over them.
 */
function getSheetRegionRowsWithLocalUpdates(
	serverRegionRows?: DataTableRowsForSheetRegionGQL[] | null,
	localRowsById?: SheetLocalRegionRowsById | null,
) {
	const localEntries = Object.entries(localRowsById || {});
	if (!localEntries.length) {
		return serverRegionRows;
	}

	const localRegionIds = new Set(localEntries.map(([regionId]) => regionId));
	const nextRegionRows = (serverRegionRows || []).filter((region) => {
		return !localRegionIds.has(String(region.regionId || ''));
	});

	localEntries.forEach(([, rows]) => {
		if (rows) {
			nextRegionRows.push(rows);
		}
	});

	return nextRegionRows;
}

/*
 * Return an optimistic Sheet cell map with the provided coordinate keys removed.
 */
function removeSheetOptimisticCellKeys(
	currentCellsByCoord: Map<string, SheetCellGQL>,
	coordKeys: string[],
) {
	if (!coordKeys.length) {
		return currentCellsByCoord;
	}

	const next = new Map(currentCellsByCoord);
	let changed = false;

	coordKeys.forEach((coordKey) => {
		changed = next.delete(coordKey) || changed;
	});

	return changed ? next : currentCellsByCoord;
}

/*
 * Return whether one saved Sheet cell carries user-entered content fields.
 */
function sheetCellHasStoredContent(cell?: SheetCellGQL | null) {
	return [
		cell?.rawInput,
		cell?.value,
		cell?.textValue,
		cell?.numberValue,
		cell?.booleanValue,
		cell?.dateValue,
		cell?.datetimeValue,
		cell?.formula,
	].some((value) => value !== null && value !== undefined);
}

/*
 * Return a stable key for a source cell rendered through a Sheet generated region.
 */
function getSheetRegionSourceCellKey(
	sourceId: string,
	dataTableRowId: string,
	cellKey: string,
) {
	return `${sourceId}:${dataTableRowId}:${cellKey}`;
}

/*
 * Return source cells keyed by region source id, row id, and cell key.
 */
function getSheetRegionSourceCellsByKey(
	regions?: DataTableRowsForSheetRegionGQL[] | null,
) {
	const cellsByKey = new Map<string, DataTableCellGQL>();

	(regions || []).forEach((region) => {
		const sourceId = getSheetRegionSourceId(region);
		if (!sourceId) {
			return;
		}

		(region.rows || []).forEach((rowPlacement) => {
			(rowPlacement.row?.cells || []).forEach((cell) => {
				if (!cell?.dataTableRowId || !cell.cellKey) {
					return;
				}

				cellsByKey.set(
					getSheetRegionSourceCellKey(
						sourceId,
						String(cell.dataTableRowId),
						String(cell.cellKey),
					),
					cell,
				);
			});
		});
	});

	return cellsByKey;
}

/*
 * Return source cells nested under Sheet region row placements.
 */
function getSheetRegionSourceCells(
	regions?: DataTableRowsForSheetRegionGQL[] | null,
) {
	return (regions || []).flatMap((region) => (
		region.rows?.flatMap((rowPlacement) => rowPlacement.row?.cells || []) || []
	));
}

/*
 * Return the lightweight Sheet marker cell for one generated region source cell placement.
 */
function getSheetGeneratedRegionMarkerCell(params: {
	columnIndex: number;
	formulaValue?: SheetCellGQL['formulaValue'];
	organizationId: string;
	regionId: string;
	rowId: string;
	rowIndex: number;
	sheetId: string;
	sourceCell?: DataTableCellGQL | null;
	sourceCellKey: string;
}): SheetCellGQL {
	return {
		id: `region:${params.regionId}:${params.rowIndex}:${params.columnIndex}`,
		organizationId: params.organizationId,
		sheetId: params.sheetId,
		rowIndex: params.rowIndex,
		columnIndex: params.columnIndex,
		rawInput: null,
		value: params.sourceCell?.value ?? null,
		...(params.formulaValue !== undefined ? { formulaValue: params.formulaValue } : {}),
		textValue: params.sourceCell?.textValue ?? null,
		numberValue: params.sourceCell?.numberValue ?? null,
		booleanValue: params.sourceCell?.booleanValue ?? null,
		dateValue: params.sourceCell?.dateValue ?? null,
		datetimeValue: params.sourceCell?.datetimeValue ?? null,
		formula: null,
		style: null,
		format: null,
		note: null,
		sourceType: 'REGION_GENERATED',
		regionId: params.regionId,
		region: {
			regionId: params.regionId,
			sourceRowId: params.rowId,
			sourceCellKey: params.sourceCellKey,
		},
		createdAt: params.sourceCell?.createdAt || '',
		updatedAt: params.sourceCell?.updatedAt || '',
	};
}

/*
 * Return a region marker cell with saved Sheet-owned design fields overlaid.
 */
function applySheetCellDesignToRegionMarker(markerCell: SheetCellGQL, sheetCell?: SheetCellGQL | null): SheetCellGQL {
	if (!sheetCell) {
		return markerCell;
	}

	return {
		...markerCell,
		format: sheetCell.format ?? markerCell.format ?? null,
		note: sheetCell.note ?? markerCell.note ?? null,
		style: sheetCell.style ?? markerCell.style ?? null,
	};
}

/*
 * Return one generated-region source column definition for runtime cell behavior.
 */
function getSheetGeneratedRegionSourceColumn(sourceType: string | null | undefined, sourceCellKey: string) {
	return getSheetCustomRegionSourceColumns(sourceType).find((column) => column.key === sourceCellKey) || null;
}

/*
 * Return Sheet marker cells keyed by coordinate for generated region rows.
 */
function getSheetGeneratedRegionCellsByCoord(params: {
	baseCellsByCoord: Map<string, SheetCellGQL>;
	organizationId: string;
	regions?: DataTableRowsForSheetRegionGQL[] | null;
	sheetId: string;
}) {
	const sourceCellsByKey = getSheetRegionSourceCellsByKey(
		params.regions,
	);
	const cellsByCoord = new Map<string, SheetCellGQL>();

	(params.regions || []).forEach((region) => {
		const regionId = String(region.regionId || '');
		const sourceId = getSheetRegionSourceId(region);
		const sourceType = getSheetRegionSourceType(region);
		if (!regionId || !sourceId) {
			return;
		}

		(region.rows || []).forEach((rowPlacement) => {
			const row = rowPlacement.row;
			const rowId = String(row?.id || '');
			const rowIndex = Math.floor(Number(rowPlacement.sheetRowIndex || 0));
			if (!rowId || rowIndex <= 0) {
				return;
			}

			(region.columns || []).forEach((column) => {
				const sourceCellKey = String(column.sourceCellKey || '');
				const columnIndex = Math.floor(Number(column.sheetColumnIndex || 0));
				if (!sourceCellKey || column.kind === 'FORMULA' || columnIndex <= 0) {
					return;
				}

				const coordKey = getSheetCanvasCoordKey(rowIndex, columnIndex);
				const baseCell = params.baseCellsByCoord.get(coordKey);
				if (baseCell && baseCell.sourceType !== 'REGION_OVERRIDE' && sheetCellHasStoredContent(baseCell)) {
					return;
				}

				const sourceKey = getSheetRegionSourceCellKey(
					sourceId,
					rowId,
					sourceCellKey,
				);
				const sourceColumn = getSheetGeneratedRegionSourceColumn(sourceType, sourceCellKey);
				const markerCell = getSheetGeneratedRegionMarkerCell({
					columnIndex,
					formulaValue: getOrganizationChildListCellFormulaValueFromId(rowId, sourceColumn?.formulaValueSource) ?? undefined,
					organizationId: params.organizationId,
					regionId,
					rowId,
					rowIndex,
					sheetId: params.sheetId,
					sourceCell: sourceCellsByKey.get(sourceKey) || null,
					sourceCellKey,
				});
				cellsByCoord.set(
					coordKey,
					applySheetCellDesignToRegionMarker(markerCell, baseCell),
				);
			});
		});
	});

	return cellsByCoord;
}

/*
 * Return only active SheetCell fragments that still carry usable coordinate data.
 */
function getActiveSheetCells(cells?: SheetCellGQL[] | null) {
	return (cells || []).filter((cell) => {
		const deleted = (cell as SheetCellGQL & { __deleted?: boolean } | null | undefined)
			?.__deleted;

		return !!cell && !deleted && Number(cell.rowIndex || 0) > 0 &&
			Number(cell.columnIndex || 0) > 0;
	});
}

/*
 * Resolve the reactive formula dependency state needed by cells that declare formula references.
 */
function useSheetFormulaDependencyState(
	params: SheetFormulaDependencyStateParams,
): SheetFormulaDependencyState {
	const formulaBaseCellsByCoord = useMemo(() => {
		return mergeSheetCellCoordMaps(
			params.cellsByCoord,
			params.optimisticCellsByCoord,
		);
	}, [params.cellsByCoord, params.optimisticCellsByCoord]);
	const baseFormulaReferences = useMemo(() => {
		return getSheetFormulaReferencesFromCells(formulaBaseCellsByCoord);
	}, [formulaBaseCellsByCoord]);
	const reactiveBaseFormulaReferences = useReactiveSheetFormulaReferences(
		baseFormulaReferences,
	);
	const baseFormulaReferenceSource = reactiveBaseFormulaReferences ||
		baseFormulaReferences;
	const baseFormulaDependencyCellsByCoord = useMemo(() => {
		return getSheetFormulaReferenceCellsByCoord(baseFormulaReferenceSource);
	}, [baseFormulaReferenceSource]);
	const formulaCellsWithBaseDependenciesByCoord = useMemo(() => {
		return mergeSheetCellCoordMaps(
			formulaBaseCellsByCoord,
			baseFormulaDependencyCellsByCoord,
		);
	}, [baseFormulaDependencyCellsByCoord, formulaBaseCellsByCoord]);
	const formulaReferences = useMemo(() => {
		return getSheetFormulaReferencesFromCells(
			formulaCellsWithBaseDependenciesByCoord,
		);
	}, [formulaCellsWithBaseDependenciesByCoord]);
	const reactiveFormulaReferences = useReactiveSheetFormulaReferences(
		formulaReferences,
	);
	const formulaReferenceSource = reactiveFormulaReferences || formulaReferences;
		const formulaReferencesById = useMemo(() => {
			return getSheetFormulaReferencesById(formulaReferenceSource);
		}, [formulaReferenceSource]);
	const formulaDependencyCells = useMemo(() => {
		return getActiveSheetCells(
			Array.from(
				getSheetFormulaReferenceCellsByCoord(formulaReferenceSource).values(),
			),
		);
	}, [formulaReferenceSource]);
	const reactiveFormulaDependencyCells = useReactiveSheetCells(
		formulaDependencyCells,
	) as SheetCellGQL[] | null;
	const formulaDependencyCellsByCoord = useMemo(() => {
		return getSheetCanvasCellsByCoord(
			getActiveSheetCells(
				reactiveFormulaDependencyCells || formulaDependencyCells,
			),
		);
	}, [formulaDependencyCells, reactiveFormulaDependencyCells]);
	const formulaResolutionCellsByCoord = useMemo(() => {
		return mergeSheetCellCoordMaps(
			formulaBaseCellsByCoord,
			formulaDependencyCellsByCoord,
		);
	}, [formulaBaseCellsByCoord, formulaDependencyCellsByCoord]);
	const formulaReferencesToResolve = useMemo(() => {
		return getSheetFormulaReferencesNeedingServerResolution({
			cellsByCoord: formulaResolutionCellsByCoord,
			references: formulaReferenceSource,
			referencesById: formulaReferencesById,
			timeZone: params.timeZone,
		});
	}, [
		formulaReferenceSource,
		formulaReferencesById,
		formulaResolutionCellsByCoord,
		params.timeZone,
	]);

		const { sheetFormulaReferences: fetchedFormulaReferences } = useSheetFormulaReferences(
			params.sheetId,
			params.organizationId,
			formulaReferencesToResolve,
			{
				authToken: params.previewAuthToken || null,
				skip: !formulaReferencesToResolve.length,
			},
		);
		const resolvedFormulaReferenceSource = useMemo(() => {
			return mergeSheetFormulaReferences(formulaReferenceSource, fetchedFormulaReferences);
		}, [fetchedFormulaReferences, formulaReferenceSource]);
		const resolvedFormulaReferencesById = useMemo(() => {
			return getSheetFormulaReferencesById(resolvedFormulaReferenceSource);
		}, [resolvedFormulaReferenceSource]);

		return {
			formulaDependencyCellsByCoord,
			formulaReferencesById: resolvedFormulaReferencesById,
		};
	}

/*
 * Render one Sheet inside an isolated local grid state store.
 */
export function Sheet(p: SheetProps) {
	const stateAtomsRef = useRef<SheetStateAtoms | null>(null);

	if (!stateAtomsRef.current) {
		stateAtomsRef.current = createSheetStateAtoms();
	}

	return <SheetDataContent {...p} stateAtoms={stateAtomsRef.current} />;
}

type SheetDataContentProps = SheetProps & {
	stateAtoms: SheetStateAtoms;
};

/*
 * Render the Sheet data boundary that owns GraphQL fetch and mutation hooks.
 */
function SheetDataContent(p: SheetDataContentProps) {
	const sheetId = p.sheet.id || '';
	const organizationId = p.organizationId || p.sheet.organizationId || '';

	const serverDesign = useMemo(() => {
		return getSheetCanvasDesign(p.sheet.design);
	}, [p.sheet.design]);
	const [optimisticStructureDesign, setOptimisticStructureDesign] = useState<
		SheetDesignObj | null
	>(null);
	const [optimisticRanges, setOptimisticRanges] = useState<
		SheetRangeGQL[] | null
	>(null);
	const [localRegions, setLocalRegions] = useState<SheetRegionGQL[] | null>(null);
	const [localRegionRowsById, setLocalRegionRowsById] = useState<SheetLocalRegionRowsById>({});
	const design = optimisticStructureDesign || serverDesign;
	const initialRowCount = useMemo(() => {
		return getSheetCanvasInitialRowCount(
			globalThis.window?.innerHeight || SHEET_CANVAS_DEFAULT_VIEWPORT_HEIGHT,
			serverDesign.grid.rowCount,
		);
	}, [serverDesign.grid.rowCount]);
	const initialGridViewport = useMemo(() => {
		return getSheetCanvasGridViewport({
			columnCount: Math.min(100, serverDesign.grid.columnCount),
			rowCount: initialRowCount,
		});
	}, [initialRowCount, serverDesign.grid.columnCount]);
	const initialLoadedGridState = useMemo(() => {
		return getInitialSheetLoadedGridState(initialRowCount);
	}, [initialRowCount]);
	const [gridViewportValue, setGridViewportValue] = useAtom(
		p.stateAtoms.gridViewportAtom,
	);
	const [loadedGridStateValue, setLoadedGridStateValue] = useAtom(
		p.stateAtoms.loadedGridStateAtom,
	);
	const [optimisticCellsByCoord, setOptimisticCellsByCoord] = useAtom(
		p.stateAtoms.optimisticCellsByCoordAtom,
	);
	const gridViewport = gridViewportValue;
	const loadedGridState = loadedGridStateValue || initialLoadedGridState;
	const setGridViewport = useCallback(
		(
			update:
				| SheetGridViewportVariables
				| ((
					currentState: SheetGridViewportVariables,
				) => SheetGridViewportVariables),
		) => {
			setGridViewportValue((currentState) => {
				const baseState = currentState || initialGridViewport;

				return typeof update === 'function' ? update(baseState) : update;
			});
		},
		[initialGridViewport, setGridViewportValue],
	);
	const setLoadedGridState = useCallback(
		(
			update:
				| SheetLoadedGridState
				| ((currentState: SheetLoadedGridState) => SheetLoadedGridState),
		) => {
			setLoadedGridStateValue((currentState) => {
				const baseState = currentState || initialLoadedGridState;

				return typeof update === 'function' ? update(baseState) : update;
			});
		},
		[initialLoadedGridState, setLoadedGridStateValue],
	);

	const fetchingMoreRef = useRef(false);
	const sheetCellSaveVersionRef = useRef<Record<string, number>>({});
	const openModalPopUp = useOpenModalPopUp();
	const openModalScreen = useOpenModalScreen();
	const { editDataTableCells } = useEditDataTableCells({}, openModalPopUp);
	const { deleteSheetRegion } = useDeleteSheetRegion({}, openModalPopUp);
	const { editSheetCells } = useEditSheetCells({}, openModalPopUp);
	const { editSheetStructure } = useEditSheetStructure({}, openModalPopUp);
	const { updateSheet } = useUpdateSheet({}, openModalPopUp);
	const [sheetStructureGridMergePaused, setSheetStructureGridMergePaused] = useState(false);
	const sheetStructureGridRefetchStartedRef = useRef(false);
	const pendingSheetStructureGridRef = useRef<
		SheetPendingStructureGridState | null
	>(null);
	const loadedGridSheetIdRef = useRef(sheetId);
	const {
		loading: sheetGridLoading,
		sheetGrid,
	} = useSheetGrid(sheetId, organizationId, gridViewport, {
		authToken: p.previewAuthToken || null,
	});

	useEffect(() => {
		const sheetChanged = loadedGridSheetIdRef.current !== sheetId;
		loadedGridSheetIdRef.current = sheetId;

		if (!sheetChanged) {
			setLoadedGridStateValue((currentState) => {
				if (!currentState) {
					return currentState;
				}

				return sheetLoadedGridStateMatchesInitial(currentState, initialRowCount)
					? getInitialSheetLoadedGridState(initialRowCount)
					: currentState;
			});
			return;
		}

		setGridViewportValue(null);
		setLoadedGridStateValue(getInitialSheetLoadedGridState(initialRowCount));
		setLocalRegionRowsById({});
		setLocalRegions(null);
		setOptimisticCellsByCoord(new Map());
		sheetCellSaveVersionRef.current = {};
	}, [initialRowCount, setGridViewportValue, setLoadedGridStateValue, setOptimisticCellsByCoord, sheetId]);

	useEffect(() => {
		if (!sheetGridLoading) {
			fetchingMoreRef.current = false;
		}
	}, [sheetGridLoading]);

	useEffect(() => {
		if (!sheetStructureGridMergePaused) {
			return;
		}

		if (sheetGridLoading) {
			sheetStructureGridRefetchStartedRef.current = true;
			return;
		}

		if (!sheetStructureGridRefetchStartedRef.current || !sheetGrid) {
			return;
		}

		const pendingGrid = pendingSheetStructureGridRef.current;
		if (
			pendingGrid &&
			(
				!sheetGridCellsMatchPendingStructure(sheetGrid, pendingGrid) ||
				!sheetGridRangesMatchPendingStructure(sheetGrid, pendingGrid)
			)
		) {
			return;
		}

		pendingSheetStructureGridRef.current = null;
		sheetStructureGridRefetchStartedRef.current = false;
		setSheetStructureGridMergePaused(false);
		setOptimisticRanges(null);
		if (
			sheetStructureDesignMatchesServerDesign(
				serverDesign,
				pendingGrid?.design || optimisticStructureDesign,
			)
		) {
			setOptimisticStructureDesign(null);
		}
	}, [
		optimisticStructureDesign,
		serverDesign,
		sheetGrid,
		sheetGridLoading,
		sheetStructureGridMergePaused,
	]);

	useEffect(() => {
		pendingSheetStructureGridRef.current = null;
		sheetStructureGridRefetchStartedRef.current = false;
		setSheetStructureGridMergePaused(false);
		setOptimisticRanges(null);
		setOptimisticStructureDesign(null);
	}, [sheetId]);

	useEffect(() => {
		if (
			sheetStructureDesignMatchesServerDesign(
				serverDesign,
				optimisticStructureDesign,
			)
		) {
			setOptimisticStructureDesign(null);
		}
	}, [optimisticStructureDesign, serverDesign]);

	useEffect(() => {
		if (sheetGridLoading || !sheetGrid || !p.onPreviewReady) {
			return;
		}

		const frameId = globalThis.requestAnimationFrame(() => {
			p.onPreviewReady?.();
		});

		return () => {
			globalThis.cancelAnimationFrame(frameId);
		};
	}, [p.onPreviewReady, sheetGrid, sheetGridLoading]);

	useEffect(() => {
		if (!sheetGrid || sheetStructureGridMergePaused) {
			return;
		}

		setLoadedGridState((currentState) => {
			const requestedRowCount = Number(
				sheetGrid.viewport?.rowCount || gridViewport?.rowCount ||
					initialRowCount,
			);
			const loadedRowCount = Math.min(
				design.grid.rowCount,
				getSheetCanvasLoadedRowCount({
					currentLoadedRowCount: currentState.loadedRowCount,
					pageInfo: sheetGrid.pageInfo,
					requestedRowCount,
					returnedRowCount: sheetGrid.rows?.length || 0,
				}),
			);
			const cellsByCoord = replaceSheetCanvasCellsInViewport(
				currentState.cellsByCoord,
				sheetGrid.cells as SheetCellGQL[] | null,
				sheetGrid.viewport,
			);
			const hasMoreRows = Boolean(sheetGrid.pageInfo?.hasMoreRows) &&
				loadedRowCount < design.grid.rowCount;
			const lastContentRowIndex = sheetGrid.pageInfo?.lastContentRowIndex ||
				null;

			if (
				currentState.cellsByCoord === cellsByCoord &&
				currentState.hasMoreRows === hasMoreRows &&
				currentState.lastContentRowIndex === lastContentRowIndex &&
				currentState.loadedRowCount === loadedRowCount
			) {
				return currentState;
			}

			return {
				cellsByCoord,
				hasMoreRows,
				lastContentRowIndex,
				loadedRowCount,
			};
		});
	}, [
		design.grid.rowCount,
		gridViewport?.rowCount,
		initialRowCount,
		sheetGrid,
		sheetStructureGridMergePaused,
	]);

	const requestViewport = useCallback((viewport: SheetViewportRequest) => {
		setGridViewportValue((currentViewport) => {
			const baseViewport = currentViewport || initialGridViewport;
			const nextViewport = getSheetCanvasGridViewport({
				columnCount: Math.min(100, Math.max(1, viewport.columnCount)),
				rowCount: baseViewport.rowCount,
				startColumnIndex: viewport.startColumnIndex,
			});

			if (
				currentViewport &&
				(
					sheetViewportVariablesAreEqual(currentViewport, nextViewport) ||
					sheetViewportContainsRequest(currentViewport, nextViewport)
				)
			) {
				return currentViewport;
			}

			return nextViewport;
		});
	}, [initialGridViewport, setGridViewportValue]);

	const fetchMoreRows = useCallback(async () => {
		if (
			fetchingMoreRef.current || sheetGridLoading ||
			!loadedGridState.hasMoreRows ||
			!gridViewport
		) {
			return;
		}

		const nextRowCountDelta = getSheetCanvasFetchRowCount(
			loadedGridState.loadedRowCount,
			design.grid.rowCount,
		);
		if (nextRowCountDelta <= 0) {
			return;
		}

		const nextViewport = getSheetCanvasGridViewport({
			columnCount: gridViewport.columnCount,
			rowCount: loadedGridState.loadedRowCount + nextRowCountDelta,
			startColumnIndex: gridViewport.startColumnIndex,
		});

		fetchingMoreRef.current = true;
		setGridViewport(nextViewport);
	}, [
		design.grid.rowCount,
		gridViewport,
		loadedGridState.hasMoreRows,
		loadedGridState.loadedRowCount,
		sheetGridLoading,
	]);

	const saveDataTableCells = useCallback((params: {
		cells: Array<{
			cellKey: string;
			dataTableRowId: string;
			value: string | null;
		}>;
		dataTableId: string;
	}) => {
		return editDataTableCells({
			variables: {
				cells: params.cells,
				dataTableId: params.dataTableId,
				organizationId,
			},
		});
	}, [editDataTableCells, organizationId]);

	const updateSheetDesign = useCallback((nextDesign: SheetDesignPatchInput) => {
		return updateSheet({
			variables: {
				design: nextDesign,
				organizationId,
				sheetId,
			},
		});
	}, [organizationId, sheetId, updateSheet]);

	/*
	 * Apply a local Sheet region upsert before the server region query refreshes.
	 */
	const applyLocalSheetRegionUpsert = useCallback((input: SheetLocalRegionUpsertInput) => {
		setLocalRegions((currentRegions) => {
			return upsertSheetLocalRegion(currentRegions, sheetGrid?.regions, input);
		});
		setLocalRegionRowsById((currentRowsById) => {
			return upsertSheetLocalRegionRows(currentRowsById, input);
		});
	}, [sheetGrid?.regions]);

	/*
	 * Apply a local Sheet region delete before the server region query refreshes.
	 */
	const applyLocalSheetRegionDelete = useCallback((input: SheetLocalRegionDeleteInput) => {
		setLocalRegions((currentRegions) => {
			return deleteSheetLocalRegion(currentRegions, sheetGrid?.regions, input);
		});
		setLocalRegionRowsById((currentRowsById) => {
			return deleteSheetLocalRegionRows(currentRowsById, input);
		});
	}, [sheetGrid?.regions]);

	/*
	 * Delete one data table-backed region from the Sheet, optionally opening a confirmation popup first.
	 */
	const removeDataTableRegion = useCallback((regionId: string, options?: { skipConfirmation?: boolean }) => {
		if (!organizationId || !sheetId || !regionId) {
			return;
		}

		if (options?.skipConfirmation) {
			applyLocalSheetRegionDelete({ regionId });
			return deleteSheetRegion({
				variables: {
					organizationId,
					regionId,
					sheetId,
				},
			});
		}

		openModalPopUp({
			name: 'delete_sheet_region',
			preset: 'DELETE_SHEET_REGION',
			props: {
				organizationId,
				onLocalSheetRegionDelete: applyLocalSheetRegionDelete,
				regionId,
				sheetId,
			},
		});
	}, [applyLocalSheetRegionDelete, deleteSheetRegion, openModalPopUp, organizationId, sheetId]);

	/*
	 * Open the app modal that creates a data table-backed region for this Sheet.
	 */
	const openPopulateFromDataTableModal = useCallback(
		(request: SheetInsertViewTableRequest) => {
			if (!organizationId || !sheetId) {
				return;
			}

			openModalScreen({
				name: 'SHEET_INSERT_VIEW',
				props: {
					...request,
					onLocalSheetRegionDelete: applyLocalSheetRegionDelete,
					onLocalSheetRegionUpsert: applyLocalSheetRegionUpsert,
					operation: p.operation || null,
					organizationId,
					sheetId,
				},
			});
		},
		[applyLocalSheetRegionDelete, applyLocalSheetRegionUpsert, openModalScreen, organizationId, p.operation, sheetId],
	);
	/*
	 * Open the organization profile modal for a child-organization Sheet source row.
	 */
	const openOrganizationProfile = useCallback(
		(childId: string) => {
			if (!childId) {
				return;
			}

			openModalScreen({
				name: 'ORG_PROFILE',
				props: {
					childId,
					parentOperation: p.operation || null,
					allowEdit: Boolean(p.organizationProfileAllowEdit),
				},
			});
		},
		[openModalScreen, p.operation, p.organizationProfileAllowEdit],
	);

	/*
	 * Open a DataTable link cell from a generated Sheet region using the same behavior as DataTable.
	 */
	const openSheetDataTableCellLink = useCallback(
		(params: DataTableOpenCellParams) => {
			openDataTableCellLink({
				...params,
				getOrganizationProfileProps: (childId) => ({
					childId,
					parentOperation: p.operation || null,
					allowEdit: Boolean(p.organizationProfileAllowEdit),
				}),
				openInboundContactEditor: () => {},
				openModalScreen,
				openSiteLocationEditor: () => {},
				setFloatingMessage: p.setFloatingMessage,
			});
		},
		[openModalScreen, p.operation, p.organizationProfileAllowEdit, p.setFloatingMessage],
	);

	const cellsByCoord = useMemo(() => {
		return sheetGrid?.cells?.length && !loadedGridState.cellsByCoord.size
			? getSheetCanvasCellsByCoord(sheetGrid.cells as SheetCellGQL[])
			: loadedGridState.cellsByCoord;
	}, [loadedGridState.cellsByCoord, sheetGrid?.cells]);
	const {
		dataTableRowsForSheetRegions,
	} = useDataTableRowsForSheetRegions(
		organizationId,
		sheetId,
		gridViewport,
		{
			authToken: p.previewAuthToken || null,
		},
	);
	const effectiveDataTableRowsForSheetRegions = useMemo(() => {
		return getSheetRegionRowsWithLocalUpdates(dataTableRowsForSheetRegions, localRegionRowsById);
	}, [dataTableRowsForSheetRegions, localRegionRowsById]);
	const dataTableRegionCellsByCoord = useMemo(() => {
		return getSheetGeneratedRegionCellsByCoord({
			baseCellsByCoord: cellsByCoord,
			organizationId,
			regions: effectiveDataTableRowsForSheetRegions,
			sheetId,
		});
	}, [cellsByCoord, effectiveDataTableRowsForSheetRegions, organizationId, sheetId]);
	const gridCellsByCoord = useMemo(() => {
		return mergeSheetCellCoordMaps(cellsByCoord, dataTableRegionCellsByCoord);
	}, [cellsByCoord, dataTableRegionCellsByCoord]);

	useEffect(() => {
		const confirmedKeys = getSheetOptimisticCellKeysSyncedWithBase(
			optimisticCellsByCoord,
			gridCellsByCoord,
		);

		if (!confirmedKeys.length && !optimisticCellsByCoord.size) {
			return;
		}

		setOptimisticCellsByCoord((currentState) => {
			const confirmedCurrentKeys = getSheetOptimisticCellKeysSyncedWithBase(
				currentState,
				gridCellsByCoord,
			);
			const confirmedCurrentKeySet = new Set(confirmedCurrentKeys);
			let nextState = removeSheetOptimisticCellKeys(currentState, confirmedCurrentKeys);
			let changed = nextState !== currentState;

			currentState.forEach((optimisticCell, coordKey) => {
				if (confirmedCurrentKeySet.has(coordKey)) {
					return;
				}

				const rebasedCell = getSheetOptimisticCellRebasedOnBase(
					optimisticCell,
					gridCellsByCoord.get(coordKey),
				);

				if (rebasedCell === optimisticCell) {
					return;
				}

				if (!changed) {
					nextState = new Map(currentState);
					changed = true;
				}

				nextState.set(coordKey, rebasedCell);
			});

			return changed ? nextState : currentState;
		});
	}, [gridCellsByCoord, optimisticCellsByCoord, setOptimisticCellsByCoord]);

	const { queue: queueSheetCellSave } = useDebouncedCellSaveBatch<SheetPendingCellSave>({
		getKey: (item) => item.coordKey,
		onError: (items) => {
			setOptimisticCellsByCoord((currentState) => {
				const revertKeys = items
					.filter((item) => sheetCellSaveVersionRef.current[item.coordKey] === item.saveVersion)
					.map((item) => item.coordKey);

				return removeSheetOptimisticCellKeys(currentState, revertKeys);
			});
		},
		onBeaconFlush: (items) => {
			const mutationCells = getSheetCellEditInputsForMutation(
				items.map((item) => item.input),
				gridCellsByCoord,
			);

			if (!mutationCells.length) {
				return true;
			}

			return sendCellSaveBeacon({
				cells: mutationCells,
				organizationId,
				targetId: sheetId,
				targetType: 'sheet',
			});
		},
		onFlush: async (items) => {
			const syncedKeys = items
				.filter((item) => {
					return sheetCellSaveVersionRef.current[item.coordKey] === item.saveVersion &&
						sheetCellEditInputMatchesCell(
							item.input,
							gridCellsByCoord.get(item.coordKey),
						);
				})
				.map((item) => item.coordKey);

			if (syncedKeys.length) {
				setOptimisticCellsByCoord((currentState) => {
					return removeSheetOptimisticCellKeys(currentState, syncedKeys);
				});
			}

			const mutationItems = items.filter((item) => !syncedKeys.includes(item.coordKey));
			const mutationCells = getSheetCellEditInputsForMutation(
				mutationItems.map((item) => item.input),
				gridCellsByCoord,
			);

			if (!mutationCells.length) {
				return;
			}

			const result = await editSheetCells({
				variables: {
					cells: mutationCells,
					organizationId,
					sheetId,
				},
			});
			const savedCellsByCoord = getSheetCanvasCellsByCoord(
				(result?.editSheetCells || []) as SheetCellGQL[],
			);

			if (!savedCellsByCoord.size) {
				return;
			}

			setOptimisticCellsByCoord((currentState) => {
				const next = new Map(currentState);
				let changed = false;

				mutationItems.forEach((item) => {
					const savedCell = savedCellsByCoord.get(item.coordKey);

					if (
						savedCell &&
						sheetCellSaveVersionRef.current[item.coordKey] === item.saveVersion
					) {
						next.set(item.coordKey, savedCell);
						changed = true;
					}
				});

				return changed ? next : currentState;
			});
		},
	});
	const saveCells = useCallback((cells: SheetCellEditInput[]) => {
		if (!cells.length) {
			return;
		}

		const revertedCoordKeys: string[] = [];

		cells.forEach((input) => {
			const coordKey = getSheetCellEditInputCoordKey(input);
			const saveVersion = (sheetCellSaveVersionRef.current[coordKey] || 0) + 1;

			sheetCellSaveVersionRef.current[coordKey] = saveVersion;

			if (sheetCellEditInputMatchesCell(input, gridCellsByCoord.get(coordKey))) {
				revertedCoordKeys.push(coordKey);
			}

			queueSheetCellSave({
				coordKey,
				input,
				saveVersion,
			});
		});

		if (revertedCoordKeys.length) {
			setOptimisticCellsByCoord((currentState) => {
				return removeSheetOptimisticCellKeys(currentState, revertedCoordKeys);
			});
		}
	}, [gridCellsByCoord, organizationId, queueSheetCellSave, setOptimisticCellsByCoord, sheetId]);
	const {
		formulaDependencyCellsByCoord,
		formulaReferencesById,
	} = useSheetFormulaDependencyState({
		cellsByCoord: gridCellsByCoord,
		optimisticCellsByCoord,
		organizationId,
		previewAuthToken: p.previewAuthToken || null,
		sheetId,
	});
	const sourceDataTableCells = useMemo(() => {
		return getSheetRegionSourceCells(effectiveDataTableRowsForSheetRegions);
	}, [effectiveDataTableRowsForSheetRegions]);
	const sheetRanges = useMemo(() => {
		return optimisticRanges || sheetGrid?.ranges || [];
	}, [optimisticRanges, sheetGrid?.ranges]);
	const sheetRegions = useMemo(() => {
		return getSheetRegionsWithLocalUpdates(sheetGrid?.regions, localRegions);
	}, [localRegions, sheetGrid?.regions]);
	const dataTablesWithBuiltInSources = useMemo(() => {
		return getSheetDataTablesWithBuiltInSources({
			dataTables: p.dataTables,
			organizationId,
			regions: sheetRegions,
		});
	}, [organizationId, p.dataTables, sheetRegions]);

	/*
	 * Save one row or column structure edit after applying the matching local projection.
	 */
	const editSheetGridStructure = useCallback(
		async (operation: SheetStructureOperationEnum, index: number) => {
			const bounds = getSheetStructureProtectedBounds(sheetRegions);
			const nextDesign = getSheetStructureDesignAfterEdit(
				design,
				operation,
				index,
				bounds,
			);
			const nextRanges = applySheetStructureEditToRanges(
				sheetRanges,
				operation,
				index,
				bounds,
			);
			const previousLoadedGridState = loadedGridState;
			const previousOptimisticCellsByCoord = optimisticCellsByCoord;
			const previousOptimisticRanges = optimisticRanges;
			const previousOptimisticStructureDesign = optimisticStructureDesign;
			const nextLoadedGridState = getSheetLoadedGridStateAfterStructureEdit({
				bounds,
				currentState: previousLoadedGridState,
				fallbackCellsByCoord: gridCellsByCoord,
				nextDesign,
				operation,
				targetIndex: index,
			});

			sheetStructureGridRefetchStartedRef.current = false;
			pendingSheetStructureGridRef.current = {
				cellsByCoord: nextLoadedGridState.cellsByCoord,
				design: nextDesign,
				ranges: nextRanges,
			};
			setSheetStructureGridMergePaused(true);
			setOptimisticStructureDesign(nextDesign);
			setOptimisticRanges(nextRanges);
			setLoadedGridState(nextLoadedGridState);
			setOptimisticCellsByCoord((currentState) =>
				applySheetStructureEditToCellsByCoord(
					currentState,
					operation,
					index,
					bounds,
				)
			);

			try {
				await waitForSheetStructureOptimisticPaint();

				return await editSheetStructure({
					variables: {
						index,
						operation,
						organizationId,
						sheetId,
					},
				});
			} catch (error) {
				pendingSheetStructureGridRef.current = null;
				sheetStructureGridRefetchStartedRef.current = false;
				setSheetStructureGridMergePaused(false);
				setLoadedGridState(previousLoadedGridState);
				setOptimisticCellsByCoord(previousOptimisticCellsByCoord);
				setOptimisticRanges(previousOptimisticRanges);
				setOptimisticStructureDesign(previousOptimisticStructureDesign);
				throw error;
			}
		},
		[
			design,
			editSheetStructure,
			gridCellsByCoord,
			loadedGridState,
			optimisticCellsByCoord,
			optimisticRanges,
			optimisticStructureDesign,
			organizationId,
			setLoadedGridState,
			setOptimisticCellsByCoord,
			sheetId,
			sheetRanges,
			sheetRegions,
		],
	);

	return (
		<SheetController
			bufferColumns={p.bufferColumns}
			bufferRows={p.bufferRows}
			canFetchMoreRows={!sheetGridLoading}
			cellsByCoord={gridCellsByCoord}
			children={p.children}
			className={p.className}
			dataTables={dataTablesWithBuiltInSources}
			design={design}
			disabled={p.disabled}
			formulaDependencyCellsByCoord={formulaDependencyCellsByCoord}
			formulaReferencesById={formulaReferencesById}
			hasMoreRows={loadedGridState.hasMoreRows}
			loadedRowCount={loadedGridState.loadedRowCount}
			operation={p.operation}
			onFetchMoreRows={fetchMoreRows}
			onOpenDataTable={p.onOpenDataTable}
			onOpenDataTableCellLink={openSheetDataTableCellLink}
			onOpenOrganizationProfile={openOrganizationProfile}
			onPopulateFromDataTable={openPopulateFromDataTableModal}
			onRemoveDataTableRegion={removeDataTableRegion}
			onEditSheetStructure={editSheetGridStructure}
			onSaveDataTableCells={saveDataTableCells}
			onSaveCells={saveCells}
			onUpdateSheetDesign={updateSheetDesign}
			onViewportRequest={requestViewport}
			ranges={sheetRanges}
			regions={sheetRegions}
			setFloatingMessage={p.setFloatingMessage}
			sheetId={sheetId}
			sourceDataTableCells={sourceDataTableCells}
			stateAtoms={p.stateAtoms}
			timeZone={p.timeZone}
		/>
	);
}

export default Sheet;
