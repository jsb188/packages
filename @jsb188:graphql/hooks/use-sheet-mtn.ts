import type { UseMutationParams } from '@jsb188/graphql/types.d';
import { OpenModalPopUpFn } from '@jsb188/react/states';
import { editSheetCellMtn } from '../gql/mutations/sheetMutations.ts';
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
