import { getAppColorHexByIndex } from '@jsb188/app/utils/color.ts';
import { hashStringFNV1a } from '@jsb188/app/utils/string.ts';
import type { SheetCellGQL } from '@jsb188/mday/types/sheet.d.ts';

/*
 * WebSocket interface the host app injects into the Sheet module; the sheet
 * package cannot import the app's wsClient directly. on() returns the handler
 * reference that must be passed back to off().
 */
export interface SheetCollabAdapter {
	emit: (name: string, args?: object) => void;
	on: (name: string, callback: (data: any) => void) => (data: any) => void;
	off: (name: string, handler: (data: any) => void) => void;
}

export interface SheetCollabUser {
	accountId: string;
	displayName: string;
	photoUri?: string | null;
}

export type SheetCollabSelectionBounds = {
	startRowIndex: number;
	startColumnIndex: number;
	endRowIndex: number;
	endColumnIndex: number;
};

export type SheetCollabSelection = {
	/* Bounding box of the selected range */
	range: SheetCollabSelectionBounds;
	/* The active (cursor) cell inside the selection */
	active: {
		rowIndex: number;
		columnIndex: number;
	} | null;
};

export type SheetRemoteSelection = {
	user: SheetCollabUser;
	color: string;
	selection: SheetCollabSelection;
	at: number;
};

export type SheetPresenceRosterEntry = {
	user: SheetCollabUser;
	color: string;
	lastSeenAt: number;
};

/*
 * Return the deterministic collaboration color for one account. Every client
 * derives the same color from the same accountId without any shared state.
 */
export function getSheetCollabUserColor(accountId: string) {
	return getAppColorHexByIndex(parseInt(hashStringFNV1a(String(accountId)), 16));
}

export type SheetCollabCellPayload = {
	rowIndex: number;
	columnIndex: number;
	value: any;
	textValue: string | null;
	numberValue: number | null;
	booleanValue: boolean | null;
	dateValue: string | null;
	datetimeValue: string | null;
	formulaText: string | null;
	__formulaLoading?: boolean;
	style: SheetCellGQL['style'];
	format: SheetCellGQL['format'];
	note: string | null;
};

/*
 * Return the wire payload for relaying one pending preview cell to peers.
 */
export function getSheetCollabCellPayload(previewCell: SheetCellGQL): SheetCollabCellPayload | null {
	const rowIndex = Math.floor(Number(previewCell.rowIndex || 0));
	const columnIndex = Math.floor(Number(previewCell.columnIndex || 0));
	if (!rowIndex || !columnIndex) {
		return null;
	}

	return {
		rowIndex,
		columnIndex,
		value: previewCell.value ?? null,
		textValue: previewCell.textValue ?? null,
		numberValue: previewCell.numberValue ?? null,
		booleanValue: previewCell.booleanValue ?? null,
		dateValue: previewCell.dateValue ?? null,
		datetimeValue: previewCell.datetimeValue ?? null,
		formulaText: previewCell.formulaText ?? previewCell.formula?.text ?? null,
		__formulaLoading: (previewCell as SheetCellGQL & { __formulaLoading?: boolean }).__formulaLoading || undefined,
		style: previewCell.style ?? null,
		format: previewCell.format ?? null,
		note: previewCell.note ?? null,
	};
}

/*
 * Return a renderable preview cell from one relayed peer payload, blended over
 * the confirmed cell currently at that coordinate (preserves identity and
 * provenance fields so region/source behavior stays intact).
 */
export function getSheetCellFromCollabPayload(
	payload: SheetCollabCellPayload,
	confirmedCell?: SheetCellGQL | null,
): SheetCellGQL {
	return {
		...(confirmedCell || {}),
		rowIndex: payload.rowIndex,
		columnIndex: payload.columnIndex,
		value: payload.value ?? null,
		textValue: payload.textValue ?? null,
		numberValue: payload.numberValue ?? null,
		booleanValue: payload.booleanValue ?? null,
		dateValue: payload.dateValue ?? null,
		datetimeValue: payload.datetimeValue ?? null,
		formulaText: payload.formulaText ?? null,
		__formulaLoading: payload.__formulaLoading || undefined,
		style: payload.style ?? null,
		format: payload.format ?? null,
		note: payload.note ?? null,
	} as SheetCellGQL;
}
