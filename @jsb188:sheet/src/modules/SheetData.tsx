import i18n from '@jsb188/app/i18n/index.ts';
import { useEditDataTableCells } from '@jsb188/graphql/hooks/use-dataTable-mtn';
import { useDeleteSheetRegion, useEditSheetCells, useEditSheetStructure, useUpdateSheet } from '@jsb188/graphql/hooks/use-sheet-mtn';
import {
	SHEET_CUSTOM_REGION_SOURCE_CHILD_ORGANIZATIONS,
	SHEET_CUSTOM_REGION_SOURCE_CHILD_ORGANIZATION_COLUMNS,
} from '@jsb188/mday/constants/sheet.ts';
import type { DataTableCellGQL, DataTableDesignCellGQL, DataTableGQL } from '@jsb188/mday/types/dataTable.d.ts';
import type { OrganizationOperationEnum } from '@jsb188/mday/types/organization.d.ts';
import type {
	SheetCellGQL,
	SheetCellSourceMetaObj,
	SheetDesignObj,
	SheetGQL,
	SheetRangeGQL,
	SheetRegionGQL,
	SheetStructureOperationEnum,
} from '@jsb188/mday/types/sheet.d.ts';
import { getOrganizationChildListCellFormulaValueFromId, isOrganizationChildProfileLinkCellKey } from '@jsb188/mday/utils/organization.ts';
import { getSheetChildOrganizationSourceOrgId, getSheetCustomRegionSourceColumns, getSheetRegionSourceId, getSheetRegionSourceType } from '@jsb188/mday/utils/sheet.ts';
import type { SetFloatingMessage } from '@jsb188/react-web/modules/layout/MainLayout';
import { useOpenModalPopUp, useOpenModalScreen } from '@jsb188/react/states';
import { useAtom, useSetAtom } from 'jotai';
import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createSheetStateAtoms, type SheetStateAtoms } from '../libs/sheet-state.ts';
import {
	SheetController,
	type SheetDesignPatchInput,
	type SheetInsertViewTableRequest,
} from './SheetController.tsx';
import {
	getDataTableCellSerializedValue,
	openDataTableCellLink,
	type DataTableOpenCellParams,
} from '../libs/dataTable-cell-editing.tsx';
import {
	getSheetPendingPreviewRebasedOnBase,
	sheetCellEditInputMatchesCell,
} from '../libs/sheet-history.ts';
import {
	getSheetCanvasCoordKey,
	getSheetCanvasDesign,
	getSheetRegionGridRect,
} from '../libs/sheet-utils.ts';
import { createThrottledInvoke } from '@jsb188/app/utils/logic.ts';
import { cn } from '@jsb188/app/utils/string.ts';
import { BigLoadingDelayed } from '@jsb188/react-web/ui/Loading';
import {
	removeConfirmedSheetRegionCells,
	type SheetPendingCellEdit,
} from '../libs/sheet-cell-store.ts';
import {
	clearAllSheetPendingEdits,
	clearSheetPendingEdits,
	markSheetPendingEditsSent,
	readSheetPendingEdits,
	SHEET_PENDING_PERSIST_TTL_MS,
} from '../libs/sheet-pending-persistence.ts';
import {
	applySheetStructureEditToCellsByCoord,
	applySheetStructureEditToPendingEdits,
	applySheetStructureEditToRanges,
	getSheetStructureDesignAfterEdit,
	getSheetStructureProtectedBounds,
} from '../libs/sheet-structure-edit.ts';
import {
	sheetStructureDesignMatchesServerDesign,
	waitForSheetStructureOptimisticPaint,
} from '../libs/sheet-structure-optimistic.ts';
import {
	getSheetCellFromCollabPayload,
	getSheetCollabCellPayload,
	type SheetCollabAdapter,
	type SheetCollabCellPayload,
	type SheetCollabUser,
} from '../libs/sheet-collab.ts';
import type { SheetRemotePendingCell } from '../libs/sheet-cell-store.ts';
import { useSheetPresence, type SheetRemoteChangeEvent } from '../libs/use-sheet-presence.ts';
import {
	getDataTableCellFieldsFromSheetSourceMeta,
	getSheetDataTableDesignCellForSourceKey,
	getSheetDataTableDesignCellsByTableId,
	getSourceDataTableCellsByTargetKey,
} from '../libs/sheet-dataTable-preview.ts';
import {
	getSheetPendingEditDataTableSourceKey,
	type SheetCellSaveEntry,
	useSheetCellSaves,
} from '../libs/use-sheet-cell-saves.ts';
import { useSheetLocalRegions } from '../libs/use-sheet-local-regions.ts';
import { useSheetViewState } from '../libs/use-sheet-view-state.ts';

export interface SheetProps {
	sheet: SheetGQL;
	bufferColumns?: number;
	bufferRows?: number;
	children?: ReactNode;
	className?: string;
	collabAdapter?: SheetCollabAdapter | null;
	collabConnected?: boolean;
	collabUser?: SheetCollabUser | null;
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
 * Return one generated-region source column definition for runtime cell behavior.
 */
function getSheetGeneratedRegionSourceColumn(sourceType: string | null | undefined, sourceCellKey: string) {
	return getSheetCustomRegionSourceColumns(sourceType).find((column) => column.key === sourceCellKey) || null;
}

/*
 * Return the region pointer fields carried by one materialized region cell.
 */
function getSheetConfirmedRegionCellPointer(cell: SheetCellGQL) {
	return {
		regionId: String(cell.region?.regionId || cell.regionId || ''),
		sourceCellKey: String(cell.region?.sourceCellKey || cell.sourceCellKey || ''),
		sourceRowId: String(cell.region?.sourceRowId || cell.sourceDataTableRowId || ''),
	};
}

/*
 * Return whether two Sheet cell source metadata objects carry the same link data.
 */
function areSheetCellSourceMetaEqual(
	a?: SheetCellSourceMetaObj | null,
	b?: SheetCellSourceMetaObj | null,
) {
	return (a?.relatedTable || null) === (b?.relatedTable || null) &&
		(a?.relatedId || null) === (b?.relatedId || null) &&
		(a?.referenceStatus || null) === (b?.referenceStatus || null) &&
		(a?.iconName || null) === (b?.iconName || null);
}

/*
 * Return client-derived source metadata for custom child-organization profile links.
 */
function getSheetCustomSourceCellSourceMeta(
	sourceType: string | null | undefined,
	pointer: ReturnType<typeof getSheetConfirmedRegionCellPointer>,
	existingMeta?: SheetCellSourceMetaObj | null,
): SheetCellSourceMetaObj | null {
	if (
		sourceType !== SHEET_CUSTOM_REGION_SOURCE_CHILD_ORGANIZATIONS ||
		!pointer.sourceRowId ||
		!isOrganizationChildProfileLinkCellKey(pointer.sourceCellKey)
	) {
		return null;
	}

	return {
		relatedTable: 'organizations',
		// The server materializes the OrganizationChild relationship id into
		// sourceMeta.relatedId; that id is what the organization profile modal
		// expects. The source row id (the child organization id) is only a
		// fallback for cells that have not been materialized yet
		relatedId: existingMeta?.relatedId || pointer.sourceRowId,
		referenceStatus: null,
		iconName: null,
	};
}

/*
 * Overlay client-derived formula link values onto materialized cells of
 * custom-source regions (child organizations). The server materializes the
 * display values; the profile-link formula value is derived from the source
 * row id exactly like the legacy synthesized markers did.
 */
function applySheetCustomSourceFormulaValues(
	cellsByCoord: Map<string, SheetCellGQL>,
	regions?: SheetRegionGQL[] | null,
) {
	const customRegionIds = new Set(
		(regions || [])
			.filter((region) => getSheetRegionSourceType(region) === SHEET_CUSTOM_REGION_SOURCE_CHILD_ORGANIZATIONS)
			.map((region) => String(region.id || '')),
	);
	if (!customRegionIds.size) {
		return cellsByCoord;
	}

	let next = cellsByCoord;
	let changed = false;

	cellsByCoord.forEach((cell, coordKey) => {
		if (cell.sourceType !== 'REGION_GENERATED') {
			return;
		}

		const pointer = getSheetConfirmedRegionCellPointer(cell);
		if (!customRegionIds.has(pointer.regionId) || !pointer.sourceRowId || !pointer.sourceCellKey) {
			return;
		}

		const sourceColumn = getSheetGeneratedRegionSourceColumn(
			SHEET_CUSTOM_REGION_SOURCE_CHILD_ORGANIZATIONS,
			pointer.sourceCellKey,
		);
		const formulaValue = getOrganizationChildListCellFormulaValueFromId(
			pointer.sourceRowId,
			sourceColumn?.formulaValueSource,
		);
		if (formulaValue === null || formulaValue === undefined || cell.formulaValue === formulaValue) {
			return;
		}

		if (!changed) {
			next = new Map(cellsByCoord);
			changed = true;
		}
		next.set(coordKey, { ...cell, formulaValue });
	});

	return next;
}

/*
 * Overlay client-derived source metadata onto custom-source region cells.
 */
function applySheetCustomSourceCellSourceMeta(
	cellsByCoord: Map<string, SheetCellGQL>,
	regions?: SheetRegionGQL[] | null,
) {
	const sourceTypeByRegionId = new Map(
		(regions || []).map((region) => [String(region.id || ''), getSheetRegionSourceType(region)]),
	);
	if (!sourceTypeByRegionId.size) {
		return cellsByCoord;
	}

	let next = cellsByCoord;
	let changed = false;

	cellsByCoord.forEach((cell, coordKey) => {
		if (cell.sourceType !== 'REGION_GENERATED') {
			return;
		}

		const pointer = getSheetConfirmedRegionCellPointer(cell);
		const sourceMeta = getSheetCustomSourceCellSourceMeta(
			sourceTypeByRegionId.get(pointer.regionId),
			pointer,
			cell.sourceMeta,
		);

		if (!sourceMeta || areSheetCellSourceMetaEqual(cell.sourceMeta, sourceMeta)) {
			return;
		}

		if (!changed) {
			next = new Map(cellsByCoord);
			changed = true;
		}

		next.set(coordKey, {
			...cell,
			sourceMeta: {
				...cell.sourceMeta,
				...sourceMeta,
			},
		});
	});

	return next;
}

/*
 * Build DataTable source cell facades from materialized region cells. The
 * cell editor and link-opening behaviors consume these in place of the
 * legacy region-rows payload.
 */
function getSheetSourceDataTableCellsFromConfirmed(
	cellsByCoord: Map<string, SheetCellGQL>,
	regions?: SheetRegionGQL[] | null,
) {
	const sourceIdByRegionId = new Map(
		(regions || []).map((region) => [String(region.id || ''), getSheetRegionSourceId(region)]),
	);
	const sourceTypeByRegionId = new Map(
		(regions || []).map((region) => [String(region.id || ''), getSheetRegionSourceType(region)]),
	);
	const cellsByTargetKey = new Map<string, DataTableCellGQL>();

	cellsByCoord.forEach((cell) => {
		if (cell.sourceType !== 'REGION_GENERATED') {
			return;
		}

		const pointer = getSheetConfirmedRegionCellPointer(cell);
		const dataTableId = sourceIdByRegionId.get(pointer.regionId) || '';
		const customSourceMeta = getSheetCustomSourceCellSourceMeta(
			sourceTypeByRegionId.get(pointer.regionId),
			pointer,
			cell.sourceMeta,
		);
		const sourceMeta = customSourceMeta
			? { ...cell.sourceMeta, ...customSourceMeta }
			: cell.sourceMeta || null;
		if (!dataTableId || !pointer.sourceRowId || !pointer.sourceCellKey) {
			return;
		}

		cellsByTargetKey.set(`${dataTableId}:${pointer.sourceRowId}:${pointer.sourceCellKey}`, {
			id: cell.id || `sheet:${cell.sheetId}:${cell.rowIndex}:${cell.columnIndex}`,
			dataTableId,
			dataTableRowId: pointer.sourceRowId,
			cellKey: pointer.sourceCellKey,
			value: cell.value ?? null,
			textValue: cell.textValue ?? null,
			numberValue: cell.numberValue ?? null,
			booleanValue: cell.booleanValue ?? null,
			dateValue: cell.dateValue ?? null,
			datetimeValue: cell.datetimeValue ?? null,
			...getDataTableCellFieldsFromSheetSourceMeta({
				...cell,
				sourceMeta,
			}),
			createdAt: cell.createdAt || '',
			updatedAt: cell.updatedAt || '',
		});
	});

	return [...cellsByTargetKey.values()];
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
	const [pendingCellEdits, setPendingCellEdits] = useAtom(
		p.stateAtoms.pendingCellEditsByCoordAtom,
	);
	const setRemotePendingCells = useSetAtom(p.stateAtoms.remotePendingCellsByCoordAtom);
	const openModalPopUp = useOpenModalPopUp();
	const openModalScreen = useOpenModalScreen();
	const { editDataTableCells } = useEditDataTableCells({}, openModalPopUp);
	const { deleteSheetRegion } = useDeleteSheetRegion({}, openModalPopUp);
	const { editSheetCells } = useEditSheetCells({}, openModalPopUp);
	const { editSheetStructure } = useEditSheetStructure({}, openModalPopUp);
	const { updateSheet } = useUpdateSheet({}, openModalPopUp);
	const [sheetStructureGridMergePaused, setSheetStructureGridMergePaused] = useState(false);
	// Ref-indirected callbacks: the handlers close over state defined below
	const remoteStructureOpHandlerRef = useRef<(structureOp: { opId: string | null; operation: string; index: number }) => void>(() => {});
	const confirmedCellsMergedHandlerRef = useRef<(cells: SheetCellGQL[], deletedCoords: Array<{ rowIndex: number; columnIndex: number }>) => void>(() => {});
	const {
		confirmedCellsByCoord,
		loading: sheetViewLoading,
		ranges: sheetViewRanges,
		regions: sheetViewRegions,
		setConfirmedCellsByCoord,
		sheetView,
	} = useSheetViewState({
		onConfirmedCellsMerged: (cells, deletedCoords) => confirmedCellsMergedHandlerRef.current(cells, deletedCoords),
		onRemoteStructureOp: (structureOp) => remoteStructureOpHandlerRef.current(structureOp),
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
		resetLocalRegions,
		sheetRegions,
	} = useSheetLocalRegions(sheetViewRegions);

	/*
	 * Region areas awaiting server data render an animated loading outline.
	 * Rects are snapshotted at operation start so delete outlines survive the
	 * local removal of the region definition.
	 */
	const [loadingRegionRectsById, setLoadingRegionRectsById] = useState<
		Map<string, {
			at: number;
			kind: 'UPSERT' | 'DELETE';
			rect: NonNullable<ReturnType<typeof getSheetRegionGridRect>>;
		}>
	>(() => new Map());

	useEffect(() => {
		setLoadingRegionRectsById(new Map());
	}, [sheetId]);

	useEffect(() => {
		resetLocalRegions();
		setPendingCellEdits(() => new Map());
		setRemotePendingCells(() => new Map());
	}, [resetLocalRegions, setPendingCellEdits, setRemotePendingCells, sheetId]);

	useEffect(() => {
		setSheetStructureGridMergePaused(false);
		setOptimisticRanges(null);
		setOptimisticStructureDesign(null);
	}, [sheetId]);

	// A fresh server ranges emission is the authoritative range list: drop the
	// local optimistic ranges projection
	const lastSheetViewRangesRef = useRef(sheetViewRanges);
	useEffect(() => {
		if (lastSheetViewRangesRef.current !== sheetViewRanges) {
			lastSheetViewRangesRef.current = sheetViewRanges;
			setOptimisticRanges(null);
		}
	}, [sheetViewRanges]);

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
		if (sheetViewLoading || !sheetView || !p.onPreviewReady) {
			return;
		}

		const frameId = globalThis.requestAnimationFrame(() => {
			p.onPreviewReady?.();
		});

		return () => {
			globalThis.cancelAnimationFrame(frameId);
		};
	}, [p.onPreviewReady, sheetView, sheetViewLoading]);

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
	 * Apply one local region upsert and mark its area as loading until the
	 * materialized cells arrive from the server.
	 */
	const applyLocalSheetRegionUpsertWithLoading = useCallback((input: Parameters<typeof applyLocalSheetRegionUpsert>[0]) => {
		applyLocalSheetRegionUpsert(input);

		const regionId = String(input.region.id || '');
		const rect = getSheetRegionGridRect(input.region);
		if (!regionId || !rect) {
			return;
		}

		setLoadingRegionRectsById((currentState) => {
			const next = new Map(currentState);
			if (input.replaceRegionId && input.replaceRegionId !== regionId) {
				next.delete(String(input.replaceRegionId));
			}
			next.set(regionId, { at: Date.now(), kind: 'UPSERT', rect });
			return next;
		});
	}, [applyLocalSheetRegionUpsert]);

	const sheetRegionsForDeleteRef = useRef<SheetRegionGQL[]>([]);

	/*
	 * Apply one local region delete: hide the region frame, instantly clear
	 * its materialized cells, and mark the area as loading until the server
	 * tombstones and dependent recalculations arrive. Deleting a region whose
	 * upsert was still loading is a rollback: just drop the loading mark.
	 */
	const applyLocalSheetRegionDeleteWithCells = useCallback((params: { regionId: string }) => {
		const region = sheetRegionsForDeleteRef.current.find((sheetRegion) => String(sheetRegion.id || '') === params.regionId) || null;

		applyLocalSheetRegionDelete(params);
		setConfirmedCellsByCoord((currentState) => {
			return removeConfirmedSheetRegionCells(currentState, params.regionId);
		});

		setLoadingRegionRectsById((currentState) => {
			const existing = currentState.get(params.regionId);
			const rect = getSheetRegionGridRect(region);
			if (!existing && !rect) {
				return currentState;
			}

			const next = new Map(currentState);
			if (existing?.kind === 'UPSERT') {
				next.delete(params.regionId);
			} else if (rect) {
				next.set(params.regionId, { at: Date.now(), kind: 'DELETE', rect });
			}
			return next;
		});
	}, [applyLocalSheetRegionDelete, setConfirmedCellsByCoord]);

	/*
	 * Delete one data table-backed region from the Sheet, optionally opening a confirmation popup first.
	 */
	const removeDataTableRegion = useCallback((regionId: string, options?: { skipConfirmation?: boolean }) => {
		if (!organizationId || !sheetId || !regionId) {
			return;
		}

		if (options?.skipConfirmation) {
			applyLocalSheetRegionDeleteWithCells({ regionId });
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
				onLocalSheetRegionDelete: applyLocalSheetRegionDeleteWithCells,
				regionId,
				sheetId,
			},
		});
	}, [applyLocalSheetRegionDeleteWithCells, deleteSheetRegion, openModalPopUp, organizationId, sheetId]);

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
					onLocalSheetRegionDelete: applyLocalSheetRegionDeleteWithCells,
					onLocalSheetRegionUpsert: applyLocalSheetRegionUpsertWithLoading,
					operation: p.operation || null,
					organizationId,
					sheetId,
				},
			});
		},
		[applyLocalSheetRegionDeleteWithCells, applyLocalSheetRegionUpsertWithLoading, openModalScreen, organizationId, p.operation, sheetId],
	);
	/*
	 * Open the organization profile modal for a child-organization Sheet source row.
	 * The Sheet page does not load the childOrganizations list query, so the
	 * modal also receives the parent organization id and child organization id
	 * to fetch the relationship itself.
	 */
	const openOrganizationProfile = useCallback(
		(childId: string, childOrgId?: string | null) => {
			if (!childId) {
				return;
			}

			openModalScreen({
				name: 'ORG_PROFILE',
				props: {
					childId,
					childOrgId: childOrgId || null,
					organizationId,
					parentOperation: p.operation || null,
					allowEdit: Boolean(p.organizationProfileAllowEdit),
				},
			});
		},
		[openModalScreen, organizationId, p.operation, p.organizationProfileAllowEdit],
	);

	/*
	 * Open a DataTable link cell from a generated Sheet region using the same behavior as DataTable.
	 */
	const openSheetDataTableCellLink = useCallback(
		(params: DataTableOpenCellParams) => {
			// Contact/site lookups are routed to the Sheet's in-grid overlay
			// editors by the controller before reaching this handler; these
			// fallbacks only fire for unexpected payloads
			const handleUnsupportedLink = () => {
				p.setFloatingMessage?.({
					text: i18n.t('sheet.unsupported_link_msg'),
					type: 'NOTICE',
				});
			};

			openDataTableCellLink({
				...params,
				getOrganizationProfileProps: (childId, linkParams) => ({
					childId,
					childOrgId: getSheetChildOrganizationSourceOrgId(linkParams.cell),
					organizationId,
					parentOperation: p.operation || null,
					allowEdit: Boolean(p.organizationProfileAllowEdit),
				}),
				openInboundContactEditor: handleUnsupportedLink,
				openModalScreen,
				openSiteLocationEditor: handleUnsupportedLink,
				setFloatingMessage: p.setFloatingMessage,
			});
		},
		[openModalScreen, organizationId, p.operation, p.organizationProfileAllowEdit, p.setFloatingMessage],
	);

	/*
	 * Materialized region cells arrive inside the confirmed map with their
	 * final server-computed values; custom-source regions still derive profile
	 * formula values and link metadata from their source row ids.
	 */
	const gridCellsByCoord = useMemo(() => {
		return applySheetCustomSourceCellSourceMeta(
			applySheetCustomSourceFormulaValues(confirmedCellsByCoord, sheetRegions),
			sheetRegions,
		);
	}, [confirmedCellsByCoord, sheetRegions]);



	/*
	 * Surface circular reference chains reported by the save mutation.
	 */
	const handleCycleCells = useCallback((cycleCellIds: string[]) => {
		if (cycleCellIds.length) {
			p.setFloatingMessage?.({
				text: i18n.t('sheet.formula_circular_reference_msg'),
				type: 'NOTICE',
			});
		}
	}, [p.setFloatingMessage]);

	sheetRegionsForDeleteRef.current = sheetRegions;

	const sourceDataTableCells = useMemo(() => {
		return getSheetSourceDataTableCellsFromConfirmed(confirmedCellsByCoord, sheetRegions);
	}, [confirmedCellsByCoord, sheetRegions]);
	const sourceCellsByTargetKey = useMemo(() => {
		return getSourceDataTableCellsByTargetKey(sourceDataTableCells);
	}, [sourceDataTableCells]);
	const sheetRanges = useMemo(() => {
		return optimisticRanges || sheetViewRanges || [];
	}, [optimisticRanges, sheetViewRanges]);
	const dataTablesWithBuiltInSources = useMemo(() => {
		return getSheetDataTablesWithBuiltInSources({
			dataTables: p.dataTables,
			organizationId,
			regions: sheetRegions,
		});
	}, [organizationId, p.dataTables, sheetRegions]);
	const designCellsByDataTableId = useMemo(() => {
		return getSheetDataTableDesignCellsByTableId(dataTablesWithBuiltInSources);
	}, [dataTablesWithBuiltInSources]);

	const { clearDataTablePendingEdits, saveCells, saveDataTableCellEdits } = useSheetCellSaves({
		baseCellsByCoord: gridCellsByCoord,
		designCellsByDataTableId,
		editSheetCells,
		onCycleCells: handleCycleCells,
		onPendingCoordsCleared: (coordKeys) => pendingCoordsClearedHandlerRef.current(coordKeys),
		onSaveDataTableCells: saveDataTableCells,
		organizationId,
		setConfirmedCellsByCoord,
		setPendingCellEdits,
		sheetId,
		sourceCellsByTargetKey,
	});

	/*
	 * Rehydrate persisted pending edits once per sheet, after the first
	 * authoritative sheetView snapshot for that sheet has been applied: the
	 * restored previews mask the stale cells a quick navigation or refresh
	 * fetched while the flushed save was still in flight server-side, and
	 * edits whose flush never ran (crashed tab, rejected beacon) are re-sent.
	 * Waiting for the sheetView gate also keeps a rehydrated clear-edit from
	 * being reconciled away against the empty pre-fetch confirmed map.
	 */
	const rehydratedSheetIdRef = useRef<string | null>(null);
	useEffect(() => {
		if (!sheetView || String(sheetView.id || '') !== sheetId || rehydratedSheetIdRef.current === sheetId) {
			return;
		}
		rehydratedSheetIdRef.current = sheetId;

		const persistedEntries = readSheetPendingEdits(sheetId);
		if (!persistedEntries.size) {
			return;
		}

		const queuedSheetEntries: SheetCellSaveEntry[] = [];
		const queuedDataTableCellsByTableId = new Map<string, Array<{ cellKey: string; dataTableRowId: string; value: string | null }>>();
		const queuedDataTableRefs: Array<{ coordKey: string; seq: number }> = [];
		const restoredByCoord = new Map<string, SheetPendingCellEdit>();

		persistedEntries.forEach((entry, coordKey) => {
			if (entry.flushState === 'queued' && !entry.dataTableTarget) {
				// Sheet-owned edits whose flush never ran re-enter the live
				// save path: preview, debounce, synced-skip, re-persist
				queuedSheetEntries.push({ input: entry.input, previewCell: entry.previewCell });
				return;
			}

			restoredByCoord.set(coordKey, {
				dataTableTarget: entry.dataTableTarget || null,
				input: entry.input,
				previewCell: entry.previewCell,
				rehydrated: { baseRevision: entry.baseRevision ?? null, editedAt: entry.editedAt },
				saveVersion: 0,
				state: 'saving',
			});

			if (entry.flushState === 'queued' && entry.dataTableTarget) {
				const target = entry.dataTableTarget;
				const cells = queuedDataTableCellsByTableId.get(target.dataTableId) || [];
				// Edits fanned out to several coordinates share one source cell
				if (!cells.some((cell) => cell.dataTableRowId === target.dataTableRowId && cell.cellKey === target.cellKey)) {
					cells.push({ cellKey: target.cellKey, dataTableRowId: target.dataTableRowId, value: target.value });
				}
				queuedDataTableCellsByTableId.set(target.dataTableId, cells);
				queuedDataTableRefs.push({ coordKey, seq: entry.seq });
			}
		});

		if (restoredByCoord.size) {
			setPendingCellEdits((currentState) => {
				const next = new Map(currentState);
				restoredByCoord.forEach((pendingEdit, coordKey) => {
					// Live edits made before rehydration stay authoritative
					if (!next.has(coordKey)) {
						next.set(coordKey, pendingEdit);
					}
				});
				return next;
			});
		}

		if (queuedSheetEntries.length) {
			saveCells(queuedSheetEntries);
		}

		queuedDataTableCellsByTableId.forEach((cells, dataTableId) => {
			void saveDataTableCells({ cells, dataTableId });
		});
		if (queuedDataTableRefs.length) {
			// The re-dispatched DataTable mutation now carries these edits
			markSheetPendingEditsSent(sheetId, queuedDataTableRefs);
		}
	}, [saveCells, saveDataTableCells, setPendingCellEdits, sheetId, sheetView]);

	/*
	 * Collaboration presence: roster + remote selections + the change relay
	 * channel for instant peer previews and structure operations.
	 */
	const remoteChangeHandlerRef = useRef<(event: SheetRemoteChangeEvent) => void>(() => {});
	const pendingCoordsClearedHandlerRef = useRef<(coordKeys: string[]) => void>(() => {});
	const { broadcastChange, remoteSelections, roster: presenceRoster } = useSheetPresence({
		adapter: p.collabAdapter,
		connected: p.collabConnected,
		onRemoteChange: (event) => remoteChangeHandlerRef.current(event),
		organizationId,
		selectedCellKeyMapAtom: p.stateAtoms.selectedCellKeyMapAtom,
		selectedCellStateAtom: p.stateAtoms.selectedCellStateAtom,
		selfUser: p.collabUser,
		sheetId,
	});

	/*
	 * Relay local pending previews, batched through a trailing throttle so a
	 * burst of edits ships as one CELLS message.
	 */
	const broadcastChangeRef = useRef(broadcastChange);
	broadcastChangeRef.current = broadcastChange;
	const pendingBroadcastCellsRef = useRef<Map<string, SheetCollabCellPayload>>(new Map());
	const cellsBroadcastThrottle = useMemo(() => {
		return createThrottledInvoke(() => {
			const cells = [...pendingBroadcastCellsRef.current.values()];
			pendingBroadcastCellsRef.current = new Map();
			if (cells.length) {
				broadcastChangeRef.current({ cells, kind: 'CELLS' });
			}
		}, 100);
	}, []);

	useEffect(() => {
		return () => cellsBroadcastThrottle.cancel();
	}, [cellsBroadcastThrottle]);

	const broadcastCellEdits = useCallback((previews: Array<{ coordKey: string; previewCell: SheetCellGQL }>) => {
		previews.forEach(({ coordKey, previewCell }) => {
			const payload = getSheetCollabCellPayload(previewCell);
			if (payload) {
				pendingBroadcastCellsRef.current.set(coordKey, payload);
			}
		});
		if (pendingBroadcastCellsRef.current.size) {
			cellsBroadcastThrottle.invoke();
		}
	}, [cellsBroadcastThrottle]);

	/*
	 * Apply one structure operation's coordinate shift to every local cell
	 * layer plus the optimistic ranges/design projections. Shared by the
	 * acting client, peer relays, and the server fragment backstop.
	 */
	const designRef = useRef(design);
	designRef.current = design;
	const sheetRegionsRef = useRef(sheetRegions);
	sheetRegionsRef.current = sheetRegions;
	const sheetRangesRef = useRef(sheetRanges);
	sheetRangesRef.current = sheetRanges;

	const applySheetStructureShiftToLocalState = useCallback((operation: SheetStructureOperationEnum, index: number) => {
		const bounds = getSheetStructureProtectedBounds(sheetRegionsRef.current);

		// Persisted pending edits are keyed by coordinate, which a structure
		// shift invalidates: drop them instead of rehydrating stale coordinates
		clearAllSheetPendingEdits(sheetId);

		setConfirmedCellsByCoord((currentState) =>
			applySheetStructureEditToCellsByCoord(currentState, operation, index, bounds)
		);
		setPendingCellEdits((currentState) =>
			applySheetStructureEditToPendingEdits(currentState, operation, index, bounds)
		);
		setRemotePendingCells((currentState) => {
			if (!currentState.size) {
				return currentState;
			}

			const remoteCells = new Map(
				[...currentState].map(([coordKey, remotePending]) => [coordKey, remotePending.cell]),
			);
			const shiftedCells = applySheetStructureEditToCellsByCoord(remoteCells, operation, index, bounds);
			if (shiftedCells === remoteCells) {
				return currentState;
			}

			const next = new Map<string, SheetRemotePendingCell>();
			shiftedCells.forEach((cell, coordKey) => {
				const previous = currentState.get(coordKey);
				next.set(coordKey, {
					accountId: previous?.accountId || '',
					at: previous?.at || Date.now(),
					cell,
				});
			});
			return next;
		});
		setOptimisticRanges(applySheetStructureEditToRanges(sheetRangesRef.current, operation, index, bounds));
		setOptimisticStructureDesign(getSheetStructureDesignAfterEdit(designRef.current, operation, index, bounds));
	}, [setConfirmedCellsByCoord, setPendingCellEdits, setRemotePendingCells, sheetId]);

	/*
	 * Idempotence guard: structure operations arrive through both the peer
	 * relay and the server fragment backstop; each opId applies once.
	 */
	const appliedStructureOpIdsRef = useRef<string[]>([]);
	const recordAppliedStructureOpId = useCallback((opId: string) => {
		if (appliedStructureOpIdsRef.current.includes(opId)) {
			return false;
		}

		appliedStructureOpIdsRef.current.push(opId);
		if (appliedStructureOpIdsRef.current.length > 20) {
			appliedStructureOpIdsRef.current.shift();
		}
		return true;
	}, []);

	const applyRemoteSheetStructureOp = useCallback((structureOp: { opId: string | null; operation: string; index: number }) => {
		const opId = String(structureOp.opId || '');
		if (opId && !recordAppliedStructureOpId(opId)) {
			return;
		}

		applySheetStructureShiftToLocalState(
			structureOp.operation as SheetStructureOperationEnum,
			structureOp.index,
		);
	}, [applySheetStructureShiftToLocalState, recordAppliedStructureOpId]);

	remoteStructureOpHandlerRef.current = applyRemoteSheetStructureOp;

	/*
	 * Confirmed data clears the matching remote previews: the peer's
	 * authoritative values now render from the confirmed layer.
	 */
	confirmedCellsMergedHandlerRef.current = (cells, deletedCoords) => {
		const arrivedAt = Date.now();

		// Region loading outlines clear once the server data lands: upserts
		// when materialized cells with the region id arrive, deletes when
		// tombstones inside the snapshotted area arrive
		setLoadingRegionRectsById((currentState) => {
			if (!currentState.size) {
				return currentState;
			}

			let next = currentState;
			let changed = false;
			currentState.forEach((entry, regionId) => {
				const settled = entry.kind === 'UPSERT'
					? cells.some((cell) => String(cell.regionId || cell.region?.regionId || '') === regionId)
					: deletedCoords.some((coord) =>
						coord.rowIndex >= entry.rect.startRowIndex &&
						coord.rowIndex <= entry.rect.endRowIndex &&
						coord.columnIndex >= entry.rect.startColumnIndex &&
						coord.columnIndex <= entry.rect.endColumnIndex
					);

				if (settled) {
					if (!changed) {
						next = new Map(currentState);
						changed = true;
					}
					next.delete(regionId);
				}
			});
			return next;
		});
		setRemotePendingCells((currentState) => {
			if (!currentState.size) {
				return currentState;
			}

			let next = currentState;
			let changed = false;
			const removeCoord = (rowIndex: number, columnIndex: number) => {
				const coordKey = getSheetCanvasCoordKey(rowIndex, columnIndex);
				const remotePending = next.get(coordKey);
				if (remotePending && remotePending.at <= arrivedAt) {
					if (!changed) {
						next = new Map(currentState);
						changed = true;
					}
					next.delete(coordKey);
				}
			};

			cells.forEach((cell) => removeCoord(Number(cell.rowIndex || 0), Number(cell.columnIndex || 0)));
			deletedCoords.forEach((coord) => removeCoord(coord.rowIndex, coord.columnIndex));

			return next;
		});
	};

	/*
	 * Save errors clear the local previews; tell peers to drop theirs too.
	 */
	pendingCoordsClearedHandlerRef.current = (coordKeys) => {
		broadcastChangeRef.current({
			coords: coordKeys.map((coordKey) => {
				const [rowPart, columnPart] = coordKey.split(':');
				return {
					rowIndex: Math.floor(Number(rowPart)),
					columnIndex: Math.floor(Number(columnPart)),
				};
			}),
			kind: 'CELLS_CLEAR',
		});
	};

	/*
	 * Safety TTL for remote previews: a peer whose mutation never lands (lost
	 * connection, dropped save) must not leave its preview stuck; confirmed
	 * data or the peer's own CELLS_CLEAR normally remove entries much sooner.
	 */
	useEffect(() => {
		const intervalId = setInterval(() => {
			const expiresBefore = Date.now() - 15000;
			setRemotePendingCells((currentState) => {
				if (!currentState.size) {
					return currentState;
				}

				const next = new Map([...currentState].filter(([, remotePending]) => remotePending.at > expiresBefore));
				return next.size === currentState.size ? currentState : next;
			});

			// Region loading outlines have a generous safety timeout in case
			// the settling deltas were missed entirely
			const regionExpiresBefore = Date.now() - 20000;
			setLoadingRegionRectsById((currentState) => {
				if (!currentState.size) {
					return currentState;
				}

				const next = new Map([...currentState].filter(([, entry]) => entry.at > regionExpiresBefore));
				return next.size === currentState.size ? currentState : next;
			});

			// Rehydrated previews whose save never confirms (lost echo, failed
			// beacon) eventually reveal the confirmed truth instead of masking
			// it forever
			const pendingExpiresBefore = Date.now() - SHEET_PENDING_PERSIST_TTL_MS;
			setPendingCellEdits((currentState) => {
				if (!currentState.size) {
					return currentState;
				}

				const next = new Map([...currentState].filter(([, pendingEdit]) => {
					return !pendingEdit.rehydrated || pendingEdit.rehydrated.editedAt > pendingExpiresBefore;
				}));
				return next.size === currentState.size ? currentState : next;
			});

			// Reading prunes TTL-expired persisted entries so storage cannot
			// resurrect stale previews on the next refresh
			readSheetPendingEdits(sheetId);
		}, 5000);

		return () => clearInterval(intervalId);
	}, [setPendingCellEdits, setRemotePendingCells, sheetId]);

	/*
	 * Incoming peer changes: instant previews, preview clears, and structure
	 * operations applied to local state.
	 */
	const confirmedCellsRef = useRef(confirmedCellsByCoord);
	confirmedCellsRef.current = confirmedCellsByCoord;

	remoteChangeHandlerRef.current = (event) => {
		const change = event.change;

		if (change.kind === 'CELLS' && Array.isArray(change.cells)) {
			const accountId = event.user?.accountId || '';
			const at = Number(event.at) || Date.now();

			setRemotePendingCells((currentState) => {
				const next = new Map(currentState);
				(change.cells as SheetCollabCellPayload[]).forEach((payload) => {
					const rowIndex = Math.floor(Number(payload?.rowIndex || 0));
					const columnIndex = Math.floor(Number(payload?.columnIndex || 0));
					if (!rowIndex || !columnIndex) {
						return;
					}

					const coordKey = getSheetCanvasCoordKey(rowIndex, columnIndex);
					next.set(coordKey, {
						accountId,
						at,
						cell: getSheetCellFromCollabPayload(payload, confirmedCellsRef.current.get(coordKey)),
					});
				});
				return next;
			});
			return;
		}

		if (change.kind === 'CELLS_CLEAR' && Array.isArray(change.coords)) {
			setRemotePendingCells((currentState) => {
				let next = currentState;
				let changed = false;
				change.coords.forEach((coord: { rowIndex: number; columnIndex: number }) => {
					const coordKey = getSheetCanvasCoordKey(Number(coord?.rowIndex || 0), Number(coord?.columnIndex || 0));
					if (next.has(coordKey)) {
						if (!changed) {
							next = new Map(currentState);
							changed = true;
						}
						next.delete(coordKey);
					}
				});
				return next;
			});
			return;
		}

		if (change.kind === 'STRUCTURE') {
			applyRemoteSheetStructureOp({
				opId: String(change.opId || '') || null,
				operation: String(change.operation || ''),
				index: Number(change.index),
			});
		}
	};

	/*
	 * Pending-edit reconciliation against fresh confirmed data: drop sheet
	 * edits whose value the base now carries, rebase the remaining previews
	 * over the new base cells, and drop DataTable previews once the confirmed
	 * source cells caught up to their pending value.
	 */
	useEffect(() => {
		if (!pendingCellEdits.size) {
			return;
		}

		// Decisions are computed outside the state updater (which must stay
		// pure) so confirmed entries can also drop their persisted twins
		const removeCoordKeys: string[] = [];
		const rebasedByCoord = new Map<string, SheetPendingCellEdit>();

		pendingCellEdits.forEach((pendingEdit, coordKey) => {
			const baseCell = gridCellsByCoord.get(coordKey);
			const sourceKey = getSheetPendingEditDataTableSourceKey(pendingEdit);

			if (sourceKey) {
				// DataTable preview: cleared when the confirmed source cell
				// reports the pending value
				const sourceCell = sourceCellsByTargetKey.get(sourceKey);
				const designCell = sourceCell
					? getSheetDataTableDesignCellForSourceKey(sourceKey, sourceCell, designCellsByDataTableId)
					: null;

				if (
					sourceCell && designCell &&
					getDataTableCellSerializedValue(sourceCell, designCell) === (pendingEdit.dataTableTarget?.value ?? null)
				) {
					removeCoordKeys.push(coordKey);
				}
				return;
			}

			if (sheetCellEditInputMatchesCell(pendingEdit.input, baseCell)) {
				removeCoordKeys.push(coordKey);
				return;
			}

			// Rehydrated previews also clear once the confirmed cell moved
			// past the revision their edit was based on: the server processed
			// newer data even if input normalization keeps the exact match
			// from firing. Clear-edits are excluded so a peer's unrelated
			// revision bump cannot resurrect-then-mask a deleted cell
			const baseRevision = Number(baseCell?.revision);
			if (
				pendingEdit.rehydrated && !pendingEdit.input.clear &&
				Number.isFinite(baseRevision) &&
				(pendingEdit.rehydrated.baseRevision === null || baseRevision > pendingEdit.rehydrated.baseRevision)
			) {
				removeCoordKeys.push(coordKey);
				return;
			}

			// Previews awaiting a server-computed value must not rebase:
			// rebuilding them from their input would restore the raw
			// formula text and strip the loading marker; the save flush
			// clears them when the computed cell arrives
			if ((pendingEdit.previewCell as SheetCellGQL & { __formulaLoading?: boolean }).__formulaLoading) {
				return;
			}

			const rebasedCell = getSheetPendingPreviewRebasedOnBase(pendingEdit.input, pendingEdit.previewCell, baseCell);
			if (rebasedCell !== pendingEdit.previewCell) {
				rebasedByCoord.set(coordKey, {
					...pendingEdit,
					previewCell: rebasedCell,
				});
			}
		});

		if (!removeCoordKeys.length && !rebasedByCoord.size) {
			return;
		}

		// Confirmed entries no longer need their persisted twins; without this
		// write-back the next refresh would resurrect already-settled previews
		if (removeCoordKeys.length) {
			clearSheetPendingEdits(sheetId, removeCoordKeys.map((coordKey) => ({ coordKey })));
		}

		setPendingCellEdits((currentState) => {
			let nextState = currentState;
			let changed = false;
			const ensureNext = () => {
				if (!changed) {
					nextState = new Map(currentState);
					changed = true;
				}
				return nextState;
			};

			// Each decision only applies while the entry it was made for is
			// still current; a newer live edit at the coordinate wins
			removeCoordKeys.forEach((coordKey) => {
				if (currentState.has(coordKey) && currentState.get(coordKey) === pendingCellEdits.get(coordKey)) {
					ensureNext().delete(coordKey);
				}
			});
			rebasedByCoord.forEach((pendingEdit, coordKey) => {
				if (currentState.get(coordKey) === pendingCellEdits.get(coordKey)) {
					ensureNext().set(coordKey, pendingEdit);
				}
			});

			return changed ? nextState : currentState;
		});
	}, [designCellsByDataTableId, gridCellsByCoord, pendingCellEdits, setPendingCellEdits, sheetId, sourceCellsByTargetKey]);

	/*
	 * Save one row or column structure edit after applying the matching local projection.
	 */
	const editSheetGridStructure = useCallback(
		async (operation: SheetStructureOperationEnum, index: number) => {
			const previousConfirmedCellsByCoord = confirmedCellsByCoord;
			const previousPendingCellEdits = pendingCellEdits;
			const previousOptimisticRanges = optimisticRanges;
			const previousOptimisticStructureDesign = optimisticStructureDesign;

			// Recording the opId before broadcasting makes the relay echo and
			// the server fragment backstop no-ops on this client
			const opId = crypto.randomUUID();
			recordAppliedStructureOpId(opId);
			applySheetStructureShiftToLocalState(operation, index);
			broadcastChangeRef.current({ index, kind: 'STRUCTURE', opId, operation });

			// Pause realtime cell merges only while the mutation is in flight:
			// deltas in this window carry pre-operation coordinates. Dropped
			// third-party deltas self-heal through later revision-gated emits.
			setSheetStructureGridMergePaused(true);

			try {
				await waitForSheetStructureOptimisticPaint();

				return await editSheetStructure({
					variables: {
						index,
						opId,
						operation,
						organizationId,
						sheetId,
					},
				});
			} catch (error) {
				setConfirmedCellsByCoord(previousConfirmedCellsByCoord);
				setPendingCellEdits(() => previousPendingCellEdits);
				setOptimisticRanges(previousOptimisticRanges);
				setOptimisticStructureDesign(previousOptimisticStructureDesign);
				throw error;
			} finally {
				setSheetStructureGridMergePaused(false);
			}
		},
		[
			applySheetStructureShiftToLocalState,
			confirmedCellsByCoord,
			editSheetStructure,
			optimisticRanges,
			optimisticStructureDesign,
			organizationId,
			pendingCellEdits,
			recordAppliedStructureOpId,
			setConfirmedCellsByCoord,
			setPendingCellEdits,
			sheetId,
		],
	);

	const loadingRegionRects = useMemo(() => {
		return [...loadingRegionRectsById.values()].map((entry) => entry.rect);
	}, [loadingRegionRectsById]);

	/*
	 * Hold the grid's first paint until the sheetView snapshot is in memory,
	 * so cells, styles, and formats all draw in one pass instead of flashing
	 * an empty grid. The loader stays invisible for fast loads.
	 */
	if (!sheetView) {
		return (
			<div className={cn('v_stretch h_f w_f rel bg', p.className)}>
				{p.children
					? <div className='no_shrink bd_b_1 bd_lt'>
						{p.children}
					</div>
					: null}
				<div className='fc v_center'>
					<BigLoadingDelayed delay={350} />
				</div>
			</div>
		);
	}

	return (
		<SheetController
			bufferColumns={p.bufferColumns}
			bufferRows={p.bufferRows}
			cellsByCoord={gridCellsByCoord}
			children={p.children}
			className={p.className}
			dataTables={dataTablesWithBuiltInSources}
			design={design}
			disabled={p.disabled}
			loadedRowCount={design.grid.rowCount}
			operation={p.operation}
			onOpenDataTable={p.onOpenDataTable}
			onOpenDataTableCellLink={openSheetDataTableCellLink}
			onOpenOrganizationProfile={openOrganizationProfile}
			onPopulateFromDataTable={openPopulateFromDataTableModal}
			onRemoveDataTableRegion={removeDataTableRegion}
			onEditSheetStructure={editSheetGridStructure}
			loadingRegionRects={loadingRegionRects}
			onBroadcastCellEdits={broadcastCellEdits}
			onClearDataTablePendingEdits={clearDataTablePendingEdits}
			onSaveDataTableCellEdits={saveDataTableCellEdits}
			onSaveCells={saveCells}
			presenceRoster={presenceRoster}
			remoteSelections={remoteSelections}
			onUpdateSheetDesign={updateSheetDesign}
			ranges={sheetRanges}
			regions={sheetRegions}
			organizationId={organizationId}
			setFloatingMessage={p.setFloatingMessage}
			sheetId={sheetId}
			sourceDataTableCells={sourceDataTableCells}
			stateAtoms={p.stateAtoms}
			timeZone={p.timeZone}
		/>
	);
}

export default Sheet;
