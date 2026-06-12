import type { SheetCellBorderStyleValue, SheetCellStyleObj } from '@jsb188/mday/types/sheet.d.ts';
import {
	getSheetCanvasColumnIndexFromKey,
	getSheetCanvasCoordKey,
	getSheetCanvasRowIndexFromId,
} from './sheet-utils.ts';

export const SHEET_BORDER_STYLE_PRESETS = {
	outlineAllCells: 'outlineAllCells',
	outlineAllSides: 'outlineAllSides',
	outlineBottom: 'outlineBottom',
	outlineInnerCells: 'outlineInnerCells',
	outlineInnerHorizontal: 'outlineInnerHorizontal',
	outlineInnerVertical: 'outlineInnerVertical',
	outlineLeft: 'outlineLeft',
	outlineNone: 'outlineNone',
	outlineRight: 'outlineRight',
	outlineTop: 'outlineTop',
} as const;

export const SHEET_BORDER_STYLE_PRESET_VALUE_LIST = Object.values(SHEET_BORDER_STYLE_PRESETS) as SheetBorderStylePresetValue[];

export type SheetBorderStylePresetValue = typeof SHEET_BORDER_STYLE_PRESETS[keyof typeof SHEET_BORDER_STYLE_PRESETS];

const SHEET_BORDER_SIDE_NAMES = ['Top', 'Right', 'Bottom', 'Left'] as const;
const SHEET_BORDER_DEFAULT_WIDTH = 1;
const SHEET_BORDER_DEFAULT_STYLE: SheetCellBorderStyleValue = 'solid';

type SheetBorderSideName = typeof SHEET_BORDER_SIDE_NAMES[number];

type SheetBorderStyleCellTarget = {
	cellKey: string;
	rowId: string;
};

export type SheetBorderStyleCellCoord = SheetBorderStyleCellTarget & {
	columnIndex: number;
	coordKey: string;
	rowIndex: number;
};

/*
 * Return whether an unknown value is one of the supported border preset values.
 */
export function isSheetBorderStylePresetValue(value: unknown): value is SheetBorderStylePresetValue {
	return SHEET_BORDER_STYLE_PRESET_VALUE_LIST.includes(value as SheetBorderStylePresetValue);
}

/*
 * Return selected Sheet cells with resolved one-based row and column indexes.
 */
export function getSheetBorderStyleCellCoords(cells: readonly SheetBorderStyleCellTarget[]) {
	return cells.flatMap((cell) => {
		const rowIndex = getSheetCanvasRowIndexFromId(cell.rowId);
		const columnIndex = getSheetCanvasColumnIndexFromKey(cell.cellKey);

		if (!rowIndex || !columnIndex) {
			return [];
		}

		return [{
			...cell,
			columnIndex,
			coordKey: getSheetCanvasCoordKey(rowIndex, columnIndex),
			rowIndex,
		} satisfies SheetBorderStyleCellCoord];
	});
}

/*
 * Return the style object key for one border side's width field.
 */
function getSheetCellBorderSideWidthKey(side: SheetBorderSideName) {
	return `border${side}Width` as keyof SheetCellStyleObj;
}

/*
 * Return the style object key for one border side's color field.
 */
function getSheetCellBorderSideColorKey(side: SheetBorderSideName) {
	return `border${side}Color` as keyof SheetCellStyleObj;
}

/*
 * Return the style object key for one border side's line style field.
 */
function getSheetCellBorderSideStyleKey(side: SheetBorderSideName) {
	return `border${side}Style` as keyof SheetCellStyleObj;
}

/*
 * Remove every style field for one cell border side.
 */
function clearSheetCellBorderSideStyle(style: Record<string, unknown>, side: SheetBorderSideName) {
	delete style[getSheetCellBorderSideWidthKey(side)];
	delete style[getSheetCellBorderSideColorKey(side)];
	delete style[getSheetCellBorderSideStyleKey(side)];
}

/*
 * Remove every supported border style field from one Sheet cell style.
 */
function clearSheetCellBorderStyle(style: Record<string, unknown>) {
	SHEET_BORDER_SIDE_NAMES.forEach((side) => clearSheetCellBorderSideStyle(style, side));
}

/*
 * Set one Sheet cell border side to the default border preset appearance.
 */
function setSheetCellBorderSideStyle(style: Record<string, unknown>, side: SheetBorderSideName) {
	style[getSheetCellBorderSideWidthKey(side)] = SHEET_BORDER_DEFAULT_WIDTH;
	style[getSheetCellBorderSideStyleKey(side)] = SHEET_BORDER_DEFAULT_STYLE;
	delete style[getSheetCellBorderSideColorKey(side)];
}

/*
 * Return whether one selected cell has another selected cell at the requested offset.
 */
function sheetBorderStyleSelectionHasNeighbor(params: {
	cell: SheetBorderStyleCellCoord;
	columnOffset: number;
	rowOffset: number;
	selectedCellCoordKeys: Set<string>;
}) {
	return params.selectedCellCoordKeys.has(getSheetCanvasCoordKey(
		params.cell.rowIndex + params.rowOffset,
		params.cell.columnIndex + params.columnOffset,
	));
}

export type SheetBorderSideNeighbors = {
	bottom: boolean;
	left: boolean;
	right: boolean;
	top: boolean;
};

/*
 * Return the border sides one preset should enable for a cell with the given
 * in-selection neighbors. Whole-line formatting computes a uniform interior
 * delta from synthetic neighbors instead of walking every selected cell.
 */
export function getSheetBorderPresetSidesForNeighbors(
	preset: SheetBorderStylePresetValue,
	neighbors: SheetBorderSideNeighbors,
) {
	const hasTopNeighbor = neighbors.top;
	const hasRightNeighbor = neighbors.right;
	const hasBottomNeighbor = neighbors.bottom;
	const hasLeftNeighbor = neighbors.left;
	const sides: SheetBorderSideName[] = [];

	switch (preset) {
		case SHEET_BORDER_STYLE_PRESETS.outlineAllCells:
			if (!hasTopNeighbor) {
				sides.push('Top');
			}
			sides.push('Right', 'Bottom');
			if (!hasLeftNeighbor) {
				sides.push('Left');
			}
			return sides;
		case SHEET_BORDER_STYLE_PRESETS.outlineInnerCells:
			if (hasRightNeighbor) {
				sides.push('Right');
			}
			if (hasBottomNeighbor) {
				sides.push('Bottom');
			}
			return sides;
		case SHEET_BORDER_STYLE_PRESETS.outlineInnerVertical:
			if (hasRightNeighbor) {
				sides.push('Right');
			}
			return sides;
		case SHEET_BORDER_STYLE_PRESETS.outlineInnerHorizontal:
			if (hasBottomNeighbor) {
				sides.push('Bottom');
			}
			return sides;
		case SHEET_BORDER_STYLE_PRESETS.outlineAllSides:
			if (!hasTopNeighbor) {
				sides.push('Top');
			}
			if (!hasRightNeighbor) {
				sides.push('Right');
			}
			if (!hasBottomNeighbor) {
				sides.push('Bottom');
			}
			if (!hasLeftNeighbor) {
				sides.push('Left');
			}
			return sides;
		case SHEET_BORDER_STYLE_PRESETS.outlineLeft:
			if (!hasLeftNeighbor) {
				sides.push('Left');
			}
			return sides;
		case SHEET_BORDER_STYLE_PRESETS.outlineTop:
			if (!hasTopNeighbor) {
				sides.push('Top');
			}
			return sides;
		case SHEET_BORDER_STYLE_PRESETS.outlineRight:
			if (!hasRightNeighbor) {
				sides.push('Right');
			}
			return sides;
		case SHEET_BORDER_STYLE_PRESETS.outlineBottom:
			if (!hasBottomNeighbor) {
				sides.push('Bottom');
			}
			return sides;
		case SHEET_BORDER_STYLE_PRESETS.outlineNone:
		default:
			return sides;
	}
}

/*
 * Return the border sides one preset should enable for one selected cell.
 */
function getSheetBorderPresetSidesForCell(
	preset: SheetBorderStylePresetValue,
	cell: SheetBorderStyleCellCoord,
	selectedCellCoordKeys: Set<string>,
) {
	return getSheetBorderPresetSidesForNeighbors(preset, {
		bottom: sheetBorderStyleSelectionHasNeighbor({ cell, columnOffset: 0, rowOffset: 1, selectedCellCoordKeys }),
		left: sheetBorderStyleSelectionHasNeighbor({ cell, columnOffset: -1, rowOffset: 0, selectedCellCoordKeys }),
		right: sheetBorderStyleSelectionHasNeighbor({ cell, columnOffset: 1, rowOffset: 0, selectedCellCoordKeys }),
		top: sheetBorderStyleSelectionHasNeighbor({ cell, columnOffset: 0, rowOffset: -1, selectedCellCoordKeys }),
	});
}

/*
 * Apply one border placement preset to one selected Sheet cell style.
 */
export function applySheetBorderPresetStyleToCell(params: {
	cell: SheetBorderStyleCellCoord;
	preset: SheetBorderStylePresetValue;
	selectedCellCoordKeys: Set<string>;
	style: Record<string, unknown>;
}) {
	if (params.preset === SHEET_BORDER_STYLE_PRESETS.outlineNone) {
		clearSheetCellBorderStyle(params.style);
		return;
	}

	getSheetBorderPresetSidesForCell(params.preset, params.cell, params.selectedCellCoordKeys)
		.forEach((side) => setSheetCellBorderSideStyle(params.style, side));
}

/*
 * Return the style delta one border preset writes for a cell with the given
 * in-selection neighbors: enabled sides get default width/style values, and
 * outlineNone nulls every border key so merges remove them.
 */
export function getSheetBorderPresetStyleDeltaForNeighbors(
	preset: SheetBorderStylePresetValue,
	neighbors: SheetBorderSideNeighbors,
) {
	const delta: Record<string, unknown> = {};

	if (preset === SHEET_BORDER_STYLE_PRESETS.outlineNone) {
		SHEET_BORDER_SIDE_NAMES.forEach((side) => {
			delta[getSheetCellBorderSideWidthKey(side)] = null;
			delta[getSheetCellBorderSideColorKey(side)] = null;
			delta[getSheetCellBorderSideStyleKey(side)] = null;
		});

		return delta;
	}

	getSheetBorderPresetSidesForNeighbors(preset, neighbors).forEach((side) => {
		delta[getSheetCellBorderSideWidthKey(side)] = SHEET_BORDER_DEFAULT_WIDTH;
		delta[getSheetCellBorderSideStyleKey(side)] = SHEET_BORDER_DEFAULT_STYLE;
		delta[getSheetCellBorderSideColorKey(side)] = null;
	});

	return delta;
}

/*
 * Return the color delta that paints every border side enabled in one saved
 * line style; null when the style has no enabled sides.
 */
export function getSheetBorderColorStyleDelta(style: Record<string, unknown>, color: string) {
	const normalizedColor = color.trim();
	const delta: Record<string, unknown> = {};
	let applied = false;

	SHEET_BORDER_SIDE_NAMES.forEach((side) => {
		if (!sheetCellStyleHasBorderSide(style, side)) {
			return;
		}

		applied = true;
		delta[getSheetCellBorderSideColorKey(side)] = normalizedColor || null;
	});

	return applied ? delta : null;
}

/*
 * Return whether one Sheet cell style has an enabled border side.
 */
function sheetCellStyleHasBorderSide(style: Record<string, unknown>, side: SheetBorderSideName) {
	return Boolean(style[getSheetCellBorderSideWidthKey(side)]);
}

/*
 * Apply a color to every already-enabled border side in one Sheet cell style.
 */
export function applySheetBorderColorToEnabledSides(style: Record<string, unknown>, color: string) {
	const normalizedColor = color.trim();
	let applied = false;

	SHEET_BORDER_SIDE_NAMES.forEach((side) => {
		if (!sheetCellStyleHasBorderSide(style, side)) {
			return;
		}

		applied = true;

		if (normalizedColor) {
			style[getSheetCellBorderSideColorKey(side)] = normalizedColor;
			return;
		}

		delete style[getSheetCellBorderSideColorKey(side)];
	});

	return applied;
}
