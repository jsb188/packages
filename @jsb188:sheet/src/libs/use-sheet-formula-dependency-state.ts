import {
	useReactiveSheetCells,
	useReactiveSheetFormulaReferences,
	useSheetFormulaReferences,
} from '@jsb188/graphql/hooks/use-sheet-qry';
import type { SheetCellGQL, SheetFormulaReferenceObj } from '@jsb188/mday/types/sheet.d.ts';
import { useMemo } from 'react';
import {
	getSheetFormulaReferenceCellsByCoord,
	getSheetFormulaReferencesById,
	getSheetFormulaReferencesFromCells,
	getSheetFormulaReferencesNeedingServerResolution,
} from './sheet-formula-evaluation.ts';
import { mergeSheetCellCoordMaps } from './sheet-local-state.ts';
import {
	getSheetCanvasCellsByCoord,
} from './sheet-utils.ts';

export type SheetFormulaDependencyStateParams = {
	cellsByCoord: Map<string, SheetCellGQL>;
	optimisticCellsByCoord: Map<string, SheetCellGQL>;
	organizationId: string;
	previewAuthToken?: string | null;
	sheetId: string;
	timeZone?: string | null;
};

export type SheetFormulaDependencyState = {
	formulaDependencyCellsByCoord: Map<string, SheetCellGQL>;
	formulaReferencesById: Map<string, SheetFormulaReferenceObj>;
};

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
export function useSheetFormulaDependencyState(
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
