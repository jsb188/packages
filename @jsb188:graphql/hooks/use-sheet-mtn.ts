import type { UseMutationParams } from '@jsb188/graphql/types.d';
import { OpenModalPopUpFn } from '@jsb188/react/states';
import {
	createSheetMtn,
	deleteSheetMtn,
	deleteSheetRangeMtn,
	deleteSheetRegionMtn,
	editSheetCellsMtn,
	editSheetStructureMtn,
	updateSheetMtn,
	upsertSheetDataTableRegionMtn,
	upsertSheetRangeMtn,
} from '../gql/mutations/sheetMutations.ts';
import { useMutation } from './index.ts';

/*
 * Create a sheet.
 */

export function useCreateSheet(params: UseMutationParams = {}, openModalPopUp?: OpenModalPopUpFn) {
	const [createSheet, mtnValues, mtnHandlers, updateObservers] = useMutation(
		createSheetMtn,
		{
			openModalPopUp,
			...params,
		},
	);

	return {
		createSheet,
		updateObservers,
		...mtnValues,
		...mtnHandlers,
	};
}

/*
 * Update a sheet.
 */

export function useUpdateSheet(params: UseMutationParams = {}, openModalPopUp?: OpenModalPopUpFn) {
	const [updateSheet, mtnValues, mtnHandlers, updateObservers] = useMutation(
		updateSheetMtn,
		{
			openModalPopUp,
			...params,
		},
	);

	return {
		updateSheet,
		updateObservers,
		...mtnValues,
		...mtnHandlers,
	};
}

/*
 * Delete a sheet.
 */

export function useDeleteSheet(params: UseMutationParams = {}, openModalPopUp?: OpenModalPopUpFn) {
	const [deleteSheet, mtnValues, mtnHandlers, updateObservers] = useMutation(
		deleteSheetMtn,
		{
			openModalPopUp,
			...params,
		},
	);

	return {
		deleteSheet,
		updateObservers,
		...mtnValues,
		...mtnHandlers,
	};
}

/*
 * Edit multiple sheet cells.
 */

export function useEditSheetCells(params: UseMutationParams = {}, openModalPopUp?: OpenModalPopUpFn) {
	const [editSheetCells, mtnValues, mtnHandlers, updateObservers] = useMutation(
		editSheetCellsMtn,
		{
			openModalPopUp,
			...params,
		},
	);

	return {
		editSheetCells,
		updateObservers,
		...mtnValues,
		...mtnHandlers,
	};
}

/*
 * Insert or delete a sheet row or column.
 */

export function useEditSheetStructure(params: UseMutationParams = {}, openModalPopUp?: OpenModalPopUpFn) {
	const [editSheetStructure, mtnValues, mtnHandlers, updateObservers] = useMutation(
		editSheetStructureMtn,
		{
			openModalPopUp,
			...params,
		},
	);

	return {
		editSheetStructure,
		updateObservers,
		...mtnValues,
		...mtnHandlers,
	};
}

/*
 * Create or update one sheet range.
 */

export function useUpsertSheetRange(params: UseMutationParams = {}, openModalPopUp?: OpenModalPopUpFn) {
	const [upsertSheetRange, mtnValues, mtnHandlers, updateObservers] = useMutation(
		upsertSheetRangeMtn,
		{
			openModalPopUp,
			...params,
		},
	);

	return {
		upsertSheetRange,
		updateObservers,
		...mtnValues,
		...mtnHandlers,
	};
}

/*
 * Delete one sheet range.
 */

export function useDeleteSheetRange(params: UseMutationParams = {}, openModalPopUp?: OpenModalPopUpFn) {
	const [deleteSheetRange, mtnValues, mtnHandlers, updateObservers] = useMutation(
		deleteSheetRangeMtn,
		{
			openModalPopUp,
			...params,
		},
	);

	return {
		deleteSheetRange,
		updateObservers,
		...mtnValues,
		...mtnHandlers,
	};
}

/*
 * Create or update one data table-backed sheet region.
 */

export function useUpsertSheetDataTableRegion(params: UseMutationParams = {}, openModalPopUp?: OpenModalPopUpFn) {
	const [upsertSheetDataTableRegion, mtnValues, mtnHandlers, updateObservers] = useMutation(
		upsertSheetDataTableRegionMtn,
		{
			openModalPopUp,
			...params,
		},
	);

	return {
		upsertSheetDataTableRegion,
		updateObservers,
		...mtnValues,
		...mtnHandlers,
	};
}

/*
 * Delete one sheet region.
 */

export function useDeleteSheetRegion(params: UseMutationParams = {}, openModalPopUp?: OpenModalPopUpFn) {
	const [deleteSheetRegion, mtnValues, mtnHandlers, updateObservers] = useMutation(
		deleteSheetRegionMtn,
		{
			openModalPopUp,
			...params,
		},
	);

	return {
		deleteSheetRegion,
		updateObservers,
		...mtnValues,
		...mtnHandlers,
	};
}
