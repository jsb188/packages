import {
	SHEET_COLUMN_MAX_WIDTH,
	SHEET_COLUMN_MIN_WIDTH,
} from '../constants/sheet.ts';

/*
 * Keep a user-resized sheet column width inside the usable spreadsheet range.
 */

export function clampSheetColumnWidth(width: number) {
	return Math.min(SHEET_COLUMN_MAX_WIDTH, Math.max(SHEET_COLUMN_MIN_WIDTH, Math.round(width)));
}
