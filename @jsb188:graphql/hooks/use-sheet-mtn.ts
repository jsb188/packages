import type { UseMutationParams } from '@jsb188/graphql/types.d';
import { OpenModalPopUpFn } from '@jsb188/react/states';
import { editSheetCellMtn, editSheetDesignMtn } from '../gql/mutations/sheetMutations.ts';
import { useMutation } from './index.ts';

/**
 * Edit a single sheet cell value.
 */

export function useEditSheetCell(params: UseMutationParams = {}, openModalPopUp?: OpenModalPopUpFn) {
	const [editSheetCell, mtnValues, mtnHandlers, updateObservers] = useMutation(
		editSheetCellMtn,
		{
			openModalPopUp,
			...params,
		},
	);

	return {
		editSheetCell,
		updateObservers,
		...mtnValues,
		...mtnHandlers,
	};
}

/**
 * Edit the saved design object for one sheet.
 */

export function useEditSheetDesign(params: UseMutationParams = {}, openModalPopUp?: OpenModalPopUpFn) {
	const [editSheetDesign, mtnValues, mtnHandlers, updateObservers] = useMutation(
		editSheetDesignMtn,
		{
			openModalPopUp,
			...params,
		},
	);

	return {
		editSheetDesign,
		updateObservers,
		...mtnValues,
		...mtnHandlers,
	};
}
