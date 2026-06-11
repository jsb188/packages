import i18n from '@jsb188/app/i18n/index.ts';
import { useEditDataTableCells } from '@jsb188/graphql/hooks/use-dataTable-mtn';
import { useDeleteSheetRegion, useEditSheetCells, useEditSheetStructure, useUpdateSheet } from '@jsb188/graphql/hooks/use-sheet-mtn';
import { useDataTableRowsForSheetRegions } from '@jsb188/graphql/hooks/use-dataTable-qry';
import {
	SHEET_CUSTOM_REGION_SOURCE_CHILD_ORGANIZATIONS,
	SHEET_CUSTOM_REGION_SOURCE_CHILD_ORGANIZATION_COLUMNS,
} from '@jsb188/mday/constants/sheet.ts';
import type { DataTableCellGQL, DataTableDesignCellGQL, DataTableGQL, DataTableRowsForSheetRegionGQL } from '@jsb188/mday/types/dataTable.d.ts';
import type { OrganizationOperationEnum } from '@jsb188/mday/types/organization.d.ts';
import type {
	SheetCellGQL,
	SheetDesignObj,
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
	SheetController,
	type SheetDesignPatchInput,
	type SheetInsertViewTableRequest,
} from './SheetController.tsx';
import {
	openDataTableCellLink,
	type DataTableOpenCellParams,
} from '../libs/dataTable-cell-editing.tsx';
import {
	getSheetOptimisticCellRebasedOnBase,
	getSheetOptimisticCellKeysSyncedWithBase,
} from '../libs/sheet-history.ts';
import {
	getSheetCanvasCellsByCoord,
	getSheetCanvasCoordKey,
	getSheetCanvasDesign,
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
} from '../libs/sheet-formula-evaluation.ts';
import {
	mergeSheetCellCoordMaps,
	removeSheetOptimisticCellKeys,
} from '../libs/sheet-local-state.ts';
import { useSheetCellSaveQueue } from '../libs/use-sheet-cell-save-queue.ts';
import { useSheetFormulaDependencyState } from '../libs/use-sheet-formula-dependency-state.ts';
import { useSheetLoadedGridState } from '../libs/use-sheet-loaded-grid-state.ts';
import { useSheetLocalRegions } from '../libs/use-sheet-local-regions.ts';

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
	const design = optimisticStructureDesign || serverDesign;
	const [optimisticCellsByCoord, setOptimisticCellsByCoord] = useAtom(
		p.stateAtoms.optimisticCellsByCoordAtom,
	);
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
	const {
		fetchMoreRows,
		gridViewport,
		loadedGridState,
		requestViewport,
		setLoadedGridState,
		sheetGrid,
		sheetGridLoading,
	} = useSheetLoadedGridState({
		design,
		organizationId,
		previewAuthToken: p.previewAuthToken || null,
		serverDesign,
		sheetId,
		sheetStructureGridMergePaused,
		stateAtoms: p.stateAtoms,
	});
	const {
		applyLocalSheetRegionDelete,
		applyLocalSheetRegionUpsert,
		getRegionRowsWithLocalUpdates,
		resetLocalRegions,
		sheetRegions,
	} = useSheetLocalRegions(sheetGrid?.regions);

	useEffect(() => {
		resetLocalRegions();
		setOptimisticCellsByCoord(new Map());
	}, [resetLocalRegions, setOptimisticCellsByCoord, sheetId]);

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
		return getRegionRowsWithLocalUpdates(dataTableRowsForSheetRegions);
	}, [dataTableRowsForSheetRegions, getRegionRowsWithLocalUpdates]);
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

	const { saveCells } = useSheetCellSaveQueue({
		editSheetCells,
		gridCellsByCoord,
		organizationId,
		setOptimisticCellsByCoord,
		sheetId,
	});
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
