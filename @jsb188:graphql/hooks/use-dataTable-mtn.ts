import type { UseMutationParams } from '@jsb188/graphql/types.d';
import { OpenModalPopUpFn } from '@jsb188/react/states';
import { deleteDataTableRowMtn, editDataTableCellMtn, editDataTableCellsMtn, editDataTableDesignMtn } from '../gql/mutations/dataTableMutations.ts';
import { useMutation } from './index.ts';

/**
 * Edit a single dataTable cell value.
 */

export function useEditDataTableCell(params: UseMutationParams = {}, openModalPopUp?: OpenModalPopUpFn) {
	const [editDataTableCell, mtnValues, mtnHandlers, updateObservers] = useMutation(
		editDataTableCellMtn,
		{
			openModalPopUp,
			...params,
		},
	);

	return {
		editDataTableCell,
		updateObservers,
		...mtnValues,
		...mtnHandlers,
	};
}

/**
 * Edit multiple dataTable cell values.
 */

export function useEditDataTableCells(params: UseMutationParams = {}, openModalPopUp?: OpenModalPopUpFn) {
	const [editDataTableCells, mtnValues, mtnHandlers, updateObservers] = useMutation(
		editDataTableCellsMtn,
		{
			openModalPopUp,
			...params,
		},
	);

	return {
		editDataTableCells,
		updateObservers,
		...mtnValues,
		...mtnHandlers,
	};
}

/**
 * Delete a single source dataTable row.
 */

export function useDeleteDataTableRow(params: UseMutationParams = {}, openModalPopUp?: OpenModalPopUpFn) {
	const [deleteDataTableRow, mtnValues, mtnHandlers] = useMutation(
		deleteDataTableRowMtn,
		{
			openModalPopUp,
			...params,
		},
	);

	return {
		deleteDataTableRow,
		...mtnValues,
		...mtnHandlers,
	};
}

/**
 * Edit the saved design object for one dataTable.
 */

export function useEditDataTableDesign(params: UseMutationParams = {}, openModalPopUp?: OpenModalPopUpFn) {
	const [editDataTableDesign, mtnValues, mtnHandlers, updateObservers] = useMutation(
		editDataTableDesignMtn,
		{
			openModalPopUp,
			...params,
		},
	);

	return {
		editDataTableDesign,
		updateObservers,
		...mtnValues,
		...mtnHandlers,
	};
}
