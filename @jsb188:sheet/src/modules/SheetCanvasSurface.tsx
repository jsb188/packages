import { cn } from '@jsb188/app/utils/string.ts';
import { isDarkColor } from '@jsb188/app/utils/color.ts';
import { COLORS } from '@jsb188/app/constants/app.ts';
import i18n from '@jsb188/app/i18n/index.ts';
import { SHEET_DATA_TABLE_REGION_MAX_ROWS } from '@jsb188/mday/constants/sheet.ts';
import type { SheetMergedRangeObj, SheetRegionGQL } from '@jsb188/mday/types/sheet.d.ts';
import { getSheetMergedRangeAtCell, getSheetRegionSourceId, isSheetCellInMergedRange, isSheetGeneratedRegionSource } from '@jsb188/mday/utils/sheet.ts';
import {
  getSheetCellKey,
  SHEET_HEADER_HEIGHT,
  SHEET_ROW_NUMBER_WIDTH,
  type SheetColumnMetric,
  type SheetRowMetric,
  type SheetUIEditState,
  type SheetUIResizeGuide,
  type SheetUIRowResizeGuide,
  type SheetUISelectedCellKeyMap,
  type SheetUISelectedCellState,
} from '@jsb188/react-web/ui/SheetUI';
import { getIconSVGPathData } from '@jsb188/react-web/svgs/Icon';
import { parseLabelMarkdownText, type LabelMarkdownPart } from '@jsb188/react-web/utils/markdown';
import { memo, useEffect, useRef, type CSSProperties, type FocusEvent, type FormEvent, type MouseEvent, type PointerEvent, type ReactNode, type Ref } from 'react';
import { getGridSelectionBoxPosition } from '../libs/grid-selection.ts';
import {
  getSheetCanvasColumnDisplayLeft,
  getSheetCanvasGridDisplayRight,
  getSheetCanvasRowDisplayTop,
  sheetCanvasRectIsVisible,
} from '../libs/sheet-canvas-geometry.ts';
import {
  getSheetCanvasColumnIndexFromKey,
  getSheetCanvasStyleColor,
  getSheetCanvasStyleFontSize,
  getSheetCanvasRowIndexFromId,
  type SheetCanvasCell,
  type SheetCanvasCellStyle,
  type SheetCanvasColumn,
} from '../libs/sheet-utils.ts';
import type { DataTableLocalEditorPosition } from '../libs/dataTable-cell-editing.tsx';
import type { SheetRemoteSelection } from '../libs/sheet-collab.ts';
import type { SheetHeaderSelectionState } from '../libs/sheet-state.ts';

const SHEET_CANVAS_CELL_PADDING_X = 8;
const SHEET_CANVAS_GRID_LINE_WIDTH = 1;
const SHEET_CANVAS_READ_ONLY_TAG_PADDING_X = 5;
const SHEET_CANVAS_READ_ONLY_TAG_PADDING_Y = 4;
const SHEET_CANVAS_SELECTION_ALPHA = 0.09;
const SHEET_CANVAS_SELECTION_UNAVAILABLE_STRIPE_SIZE = 5.5;
const SHEET_CANVAS_FILL_HANDLE_SIZE = 7;
const SHEET_CANVAS_DATA_TABLE_ICON_PATH_CACHE = new Map<string, Path2D[]>();
const SHEET_CANVAS_TEXT_LINE_GAP = 2;
const SHEET_CANVAS_BORDER_SIDES = ['Top', 'Right', 'Bottom', 'Left'] as const;

type SheetCanvasTheme = {
	active: string;
	background: string;
	bodyText: string;
	contrast: string;
	main: string;
	fontFamily: string;
	fontFamilyMedium: string;
	fontFamilySemibold: string;
	headerFontSize: string;
	fontSize: string;
	fontLineHeightPx: number;
	grid: string;
	headerBackground: string;
	headerSelectedDivider: string;
	headerSelectedText: string;
	headerText: string;
	regionOutline: string;
	resizeGuide: string;
	sheetTopDivider: string;
	solid: string;
	selectionFill: string;
	selectionUnavailableStripe: string;
	selectPillBackgrounds: Record<string, string>;
	styleColors: Record<string, string>;
	tagFontSize: string;
	tagLineHeightPx: number;
};

type SheetCanvasTextStyle = {
	bold: boolean;
	italic: boolean;
	strikethrough: boolean;
	underline: boolean;
};

type SheetCanvasRect = {
	height: number;
	left: number;
	top: number;
	width: number;
};

type SheetCanvasDividerRect = SheetCanvasRect;

type SheetCanvasColumnRect = SheetCanvasRect & {
	cellKey: string;
	metric: SheetColumnMetric;
};

type SheetCanvasRowRect = SheetCanvasRect & {
	metric: SheetRowMetric;
};

type SheetCanvasRegionRect = SheetCanvasRect & {
	region: SheetRegionGQL;
};

type SheetCanvasRegionColumnTagTarget = {
	rect: SheetCanvasRect;
	sourceCellKey: string;
};

type SheetCanvasCellBorderSide = typeof SHEET_CANVAS_BORDER_SIDES[number];

type SheetCanvasCellBorderLine = {
	orientation: 'horizontal' | 'vertical';
	x1: number;
	x2: number;
	y1: number;
	y2: number;
};

type SheetCanvasMarkdownLine = {
	parts: LabelMarkdownPart[];
	width: number;
};

type SheetCanvasTextOverflow = {
	cell: SheetCanvasCell;
	rect: SheetCanvasRect;
};

export type SheetCanvasSurfaceProps = {
	canvasHeight: number;
	canvasWidth: number;
	cellLookup: Map<string, SheetCanvasCell>;
	className?: string;
	columns: SheetColumnMetric[];
	editState?: SheetUIEditState | null;
	formulaContent?: ReactNode;
	headerContent?: ReactNode;
	headerSelection?: SheetHeaderSelectionState | null;
	hoveredCellState?: SheetUISelectedCellState | null;
	onContextMenu?: (event: MouseEvent<HTMLDivElement>) => void;
	onDoubleClick?: (event: MouseEvent<HTMLDivElement>) => void;
	onFocusOut?: (event: FocusEvent<HTMLDivElement>) => void;
	onInput?: (event: FormEvent<HTMLDivElement>) => void;
	onPointerDown?: (event: PointerEvent<HTMLDivElement>) => void;
	onPointerDownCapture?: (event: PointerEvent<HTMLDivElement>) => void;
	onPointerLeave?: (event: PointerEvent<HTMLDivElement>) => void;
	onPointerMove?: (event: PointerEvent<HTMLDivElement>) => void;
	overlayContent?: ReactNode;
	regions?: SheetRegionGQL[] | null;
	regionDataTableLabelsById?: Map<string, string> | null;
	remoteSelections?: SheetRemoteSelection[] | null;
	/* Cells awaiting a server-computed value (animated dashed outline) */
	loadingCellCoords?: Array<{ rowIndex: number; columnIndex: number }> | null;
	/* Region areas awaiting server materialization (animated dashed outline) */
	loadingRegionRects?: Array<{
		startRowIndex: number;
		startColumnIndex: number;
		endRowIndex: number;
		endColumnIndex: number;
	}> | null;
	/* Merged cell ranges; covered cells render as one anchor-driven cell */
	mergedRanges?: SheetMergedRangeObj[] | null;
	/* Pending fill-handle drag target range (dashed preview border) */
	fillPreviewRange?: SheetMergedRangeObj | null;
	/* Render the fill handle dot at the selection's bottom-right corner */
	showFillHandle?: boolean;
	hoveredRegionId?: string | null;
	resizeGuide?: SheetUIResizeGuide | null;
	rowResizeGuide?: SheetUIRowResizeGuide | null;
	rowMetrics: SheetRowMetric[];
	scrollLeft: number;
	scrollRef?: Ref<HTMLDivElement>;
	scrollTop: number;
	selectedReadOnlyCellPosition?: DataTableLocalEditorPosition | null;
	selectedCellKeyMap?: SheetUISelectedCellKeyMap | null;
	selectedCellState?: SheetUISelectedCellState | null;
	stickyColumnCount?: number | null;
	stickyRowCount?: number | null;
	style?: CSSProperties;
	viewportHeight: number;
	viewportWidth: number;
};

/*
 * Convert a CSS variable or direct color into a canvas-safe color string.
 */
function getSheetCanvasCSSColor(styles: CSSStyleDeclaration, name: string, fallback: string) {
	const value = styles.getPropertyValue(name).trim();

	if (!value) {
		return fallback;
	}

	if (/^\d/.test(value)) {
		return `rgb(${value})`;
	}

	return value;
}

/*
 * Return a CSS variable value for canvas font declarations.
 */
function getSheetCanvasCSSValue(styles: CSSStyleDeclaration, name: string, fallback: string) {
	return styles.getPropertyValue(name).trim() || fallback;
}

/*
 * Resolve a CSS length value into pixels for canvas layout math.
 */
function getSheetCanvasCSSLengthPx(value: string, rootFontSizePx: number, fallback: number) {
	const trimmedValue = value.trim();

	if (trimmedValue.endsWith('rem')) {
		const remValue = Number(trimmedValue.slice(0, -3));

		return Number.isFinite(remValue) ? remValue * rootFontSizePx : fallback;
	}

	if (trimmedValue.endsWith('px')) {
		const pxValue = Number(trimmedValue.slice(0, -2));

		return Number.isFinite(pxValue) ? pxValue : fallback;
	}

	const numericValue = Number(trimmedValue);

	return Number.isFinite(numericValue) ? numericValue : fallback;
}

/*
 * Return theme colors resolved from the current app CSS variables.
 */
function getSheetCanvasTheme(canvas: HTMLCanvasElement): SheetCanvasTheme {
	const styles = getComputedStyle(canvas);
	const rootStyles = getComputedStyle(document.documentElement);
	const rootFontSizePx = getSheetCanvasCSSLengthPx(rootStyles.fontSize || '16px', 16, 16);
	const active = getSheetCanvasCSSColor(styles, '--color-primary', '#2563eb');
	const activeBackground = getSheetCanvasCSSColor(styles, '--color-bg-active', '#e5e7eb');
	const primaryRgb = getSheetCanvasCSSValue(styles, '--color-primary', '37, 99, 235');
	const fontSize = getSheetCanvasCSSValue(styles, '--text-xsmall', '0.875rem');
	const tagFontSize = getSheetCanvasCSSValue(styles, '--text-xxsmall', '0.75rem');
	const styleColors = COLORS.reduce<Record<string, string>>((result, colorName) => {
		result[colorName] = getSheetCanvasCSSColor(styles, `--color-${colorName}-default`, '#111827');

		return result;
	}, {});
	const selectPillBackgrounds = COLORS.reduce<Record<string, string>>((result, colorName) => {
		const cssVarName = `--color-${colorName}-medium`;
		const color = getSheetCanvasCSSColor(styles, cssVarName, '#e5e7eb');

		result[colorName] = color;
		result[cssVarName] = color;

		return result;
	}, {});

	return {
		active,
		background: getSheetCanvasCSSColor(styles, '--color-bg', '#ffffff'),
		bodyText: getSheetCanvasCSSColor(styles, '--color-text', '#111827'),
		contrast: getSheetCanvasCSSColor(styles, '--color-contrast', active),
		fontFamily: getSheetCanvasCSSValue(styles, '--font-sans', 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'),
		fontFamilyMedium: getSheetCanvasCSSValue(styles, '--font-sans-medium', 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'),
		fontFamilySemibold: getSheetCanvasCSSValue(styles, '--font-sans-semibold', 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'),
		headerFontSize: getSheetCanvasCSSValue(styles, '--text-xxsmall', '0.8125rem'),
		fontLineHeightPx: getSheetCanvasCSSLengthPx(fontSize, rootFontSizePx, 14) * 1.4,
		fontSize,
		grid: getSheetCanvasCSSColor(styles, '--color-darker-light', 'rgba(0,0,0,.08)'),
		headerBackground: getSheetCanvasCSSColor(styles, '--color-bg-fade', '#f8fafc'),
		headerSelectedDivider: getSheetCanvasCSSColor(styles, '--color-primary-hover', '#1d4ed8'),
		headerSelectedText: getSheetCanvasCSSColor(styles, '--color-solid', '#ffffff'),
		headerText: getSheetCanvasCSSColor(styles, '--color-text-medium', '#475569'),
		main: getSheetCanvasCSSColor(styles, '--color-main', active),
		regionOutline: getSheetCanvasCSSColor(styles, '--color-bg-medium', '#e5e7eb'),
		resizeGuide: activeBackground,
		sheetTopDivider: activeBackground,
		solid: getSheetCanvasCSSColor(styles, '--color-solid', '#ffffff'),
		selectionFill: active,
		selectionUnavailableStripe: `rgba(${primaryRgb}, 0.35)`,
		selectPillBackgrounds,
		styleColors,
		tagFontSize,
		tagLineHeightPx: getSheetCanvasCSSLengthPx(tagFontSize, rootFontSizePx, 12) * 1.1,
	};
}

/*
 * Resolve saved app color names into canvas-safe theme colors.
 */
function getSheetCanvasResolvedStyleColor(theme: SheetCanvasTheme, color?: string | null) {
	return color ? theme.styleColors[color] || color : null;
}

/*
 * Return a supported border width for one styled Sheet cell side.
 */
function getSheetCanvasCellBorderWidth(style: SheetCanvasCell['style'] | null | undefined, side: typeof SHEET_CANVAS_BORDER_SIDES[number]) {
	const width = Math.round(Number(style?.[`border${side}Width` as keyof SheetCanvasCell['style']]));

	return Number.isFinite(width) && width >= 1 && width <= 4 ? width : null;
}

/*
 * Return the border style used to draw one Sheet cell side.
 */
function getSheetCanvasCellBorderStyle(style: SheetCanvasCell['style'] | null | undefined, side: typeof SHEET_CANVAS_BORDER_SIDES[number]) {
	const value = style?.[`border${side}Style` as keyof SheetCanvasCell['style']];

	return value === 'dashed' || value === 'dotted' || value === 'double' ? value : 'solid';
}

/*
 * Return the border color used to draw one Sheet cell side.
 */
function getSheetCanvasCellBorderColor(style: SheetCanvasCell['style'] | null | undefined, side: typeof SHEET_CANVAS_BORDER_SIDES[number], theme: SheetCanvasTheme) {
	const value = style?.[`border${side}Color` as keyof SheetCanvasCell['style']];

	return getSheetCanvasResolvedStyleColor(theme, typeof value === 'string' ? value : null) || theme.bodyText;
}

/*
 * Apply the line dash pattern needed for one Sheet border style.
 */
function setSheetCanvasBorderLineDash(ctx: CanvasRenderingContext2D, style: string, width: number) {
	if (style === 'dashed') {
		ctx.setLineDash([Math.max(4, width * 4), Math.max(3, width * 3)]);
		return;
	}

	if (style === 'dotted') {
		ctx.setLineDash([1, Math.max(2, width * 2)]);
		return;
	}

	ctx.setLineDash([]);
}

/*
 * Return the canvas font-size declaration for one styled Sheet cell.
 */
function getSheetCanvasCellFontSize(style: SheetCanvasCell['style'] | null | undefined, theme: SheetCanvasTheme) {
	const fontSize = getSheetCanvasStyleFontSize(style);

	return fontSize ? `${fontSize}px` : theme.fontSize;
}

/*
 * Return the line height that matches one styled Sheet cell font size.
 */
function getSheetCanvasCellLineHeightPx(style: SheetCanvasCell['style'] | null | undefined, theme: SheetCanvasTheme) {
	const fontSize = getSheetCanvasStyleFontSize(style);

	return fontSize ? fontSize * 1.4 : theme.fontLineHeightPx;
}

/*
 * Draw a sheet cell fill rectangle without painting over divider lines.
 */
function drawSheetCanvasCellFillRect(params: {
	ctx: CanvasRenderingContext2D;
	color: string;
	height: number;
	left: number;
	top: number;
	width: number;
}) {
	// Bleed one grid-line width past the cell box so adjacent fills meet
	// UNDER the divider lines; grid lines repaint on top afterwards, and text
	// is positioned off the unchanged cell box, so spacing stays identical
	const bleed = SHEET_CANVAS_GRID_LINE_WIDTH;
	const left = Math.round(params.left);
	const top = Math.round(params.top);
	const width = Math.max(0, Math.round(params.width) + bleed);
	const height = Math.max(0, Math.round(params.height) + bleed);

	if (!width || !height) {
		return;
	}

	params.ctx.fillStyle = params.color;
	params.ctx.fillRect(left, top, width, height);
}

/*
 * Draw the unavailable-region selection stripe pattern over one selected Sheet cell.
 */
function drawSheetCanvasUnavailableSelectionStripeRect(params: {
	ctx: CanvasRenderingContext2D;
	height: number;
	left: number;
	theme: SheetCanvasTheme;
	top: number;
	width: number;
}) {
	const width = Math.max(0, Math.round(params.width));
	const height = Math.max(0, Math.round(params.height));

	if (!width || !height) {
		return;
	}

	const left = Math.round(params.left);
	const top = Math.round(params.top);
	const diagonal = Math.ceil(Math.sqrt(width * width + height * height));

	params.ctx.save();
	params.ctx.beginPath();
	params.ctx.rect(left, top, width, height);
	params.ctx.clip();
	params.ctx.translate(left + width / 2, top + height / 2);
	params.ctx.rotate(Math.PI / 4);
	params.ctx.beginPath();
	params.ctx.strokeStyle = params.theme.selectionUnavailableStripe;
	params.ctx.lineWidth = 1;

	for (let x = -diagonal; x <= diagonal; x += SHEET_CANVAS_SELECTION_UNAVAILABLE_STRIPE_SIZE) {
		params.ctx.moveTo(x, -diagonal);
		params.ctx.lineTo(x, diagonal);
	}

	params.ctx.stroke();
	params.ctx.restore();
}

/*
 * Stroke one straight Sheet cell border line.
 */
function strokeSheetCanvasCellBorderLine(params: {
	ctx: CanvasRenderingContext2D;
	x1: number;
	x2: number;
	y1: number;
	y2: number;
}) {
	params.ctx.beginPath();
	params.ctx.moveTo(params.x1, params.y1);
	params.ctx.lineTo(params.x2, params.y2);
	params.ctx.stroke();
}

/*
 * Return the crisp canvas coordinate used by Sheet divider lines.
 */
function getSheetCanvasDividerStrokeCoordinate(value: number) {
	return Math.round(value) + 0.5;
}

/*
 * Return the divider-aligned stroke line for one Sheet cell border side.
 */
function getSheetCanvasCellBorderLine(params: {
	height: number;
	left: number;
	side: SheetCanvasCellBorderSide;
	top: number;
	width: number;
}): SheetCanvasCellBorderLine {
	const left = getSheetCanvasDividerStrokeCoordinate(params.left);
	const right = getSheetCanvasDividerStrokeCoordinate(params.left + params.width);
	const top = getSheetCanvasDividerStrokeCoordinate(params.top);
	const bottom = getSheetCanvasDividerStrokeCoordinate(params.top + params.height);

	if (params.side === 'Top') {
		return { orientation: 'horizontal', x1: left, x2: right, y1: top, y2: top };
	}

	if (params.side === 'Right') {
		return { orientation: 'vertical', x1: right, x2: right, y1: top, y2: bottom };
	}

	if (params.side === 'Bottom') {
		return { orientation: 'horizontal', x1: left, x2: right, y1: bottom, y2: bottom };
	}

	return { orientation: 'vertical', x1: left, x2: left, y1: top, y2: bottom };
}

/*
 * Return a stable key for one Sheet cell border line shared by neighboring cells.
 */
function getSheetCanvasCellBorderLineKey(line: SheetCanvasCellBorderLine) {
	return [
		line.orientation,
		Math.round(line.x1 * 2),
		Math.round(line.y1 * 2),
		Math.round(line.x2 * 2),
		Math.round(line.y2 * 2),
	].join(':');
}

/*
 * Draw one regular Sheet cell border side.
 */
function drawSheetCanvasCellSimpleBorderSide(params: {
	ctx: CanvasRenderingContext2D;
	height: number;
	left: number;
	side: SheetCanvasCellBorderSide;
	style: string;
	top: number;
	width: number;
}) {
	const line = getSheetCanvasCellBorderLine(params);

	setSheetCanvasBorderLineDash(params.ctx, params.style, params.ctx.lineWidth);
	strokeSheetCanvasCellBorderLine({ ctx: params.ctx, x1: line.x1, x2: line.x2, y1: line.y1, y2: line.y2 });
}

/*
 * Draw one double-line Sheet cell border side.
 */
function drawSheetCanvasCellDoubleBorderSide(params: {
	ctx: CanvasRenderingContext2D;
	height: number;
	left: number;
	side: SheetCanvasCellBorderSide;
	top: number;
	width: number;
}) {
	const line = getSheetCanvasCellBorderLine(params);
	const innerOffset = 2;

	params.ctx.setLineDash([]);
	params.ctx.lineWidth = 1;

	if (params.side === 'Top') {
		strokeSheetCanvasCellBorderLine({ ctx: params.ctx, x1: line.x1, x2: line.x2, y1: line.y1, y2: line.y2 });
		strokeSheetCanvasCellBorderLine({ ctx: params.ctx, x1: line.x1, x2: line.x2, y1: line.y1 + innerOffset, y2: line.y2 + innerOffset });
	} else if (params.side === 'Right') {
		strokeSheetCanvasCellBorderLine({ ctx: params.ctx, x1: line.x1, x2: line.x2, y1: line.y1, y2: line.y2 });
		strokeSheetCanvasCellBorderLine({ ctx: params.ctx, x1: line.x1 - innerOffset, x2: line.x2 - innerOffset, y1: line.y1, y2: line.y2 });
	} else if (params.side === 'Bottom') {
		strokeSheetCanvasCellBorderLine({ ctx: params.ctx, x1: line.x1, x2: line.x2, y1: line.y1, y2: line.y2 });
		strokeSheetCanvasCellBorderLine({ ctx: params.ctx, x1: line.x1, x2: line.x2, y1: line.y1 - innerOffset, y2: line.y2 - innerOffset });
	} else {
		strokeSheetCanvasCellBorderLine({ ctx: params.ctx, x1: line.x1, x2: line.x2, y1: line.y1, y2: line.y2 });
		strokeSheetCanvasCellBorderLine({ ctx: params.ctx, x1: line.x1 + innerOffset, x2: line.x2 + innerOffset, y1: line.y1, y2: line.y2 });
	}
}

/*
 * Draw all configured border sides for one Sheet canvas cell.
 */
function drawSheetCanvasCellBorders(params: {
	cell?: SheetCanvasCell | null;
	ctx: CanvasRenderingContext2D;
	height: number;
	renderedBorderLineKeys: Set<string>;
	theme: SheetCanvasTheme;
	width: number;
	x: number;
	y: number;
}) {
	const style = params.cell?.style;
	if (!style) {
		return;
	}

	params.ctx.save();
	SHEET_CANVAS_BORDER_SIDES.forEach((side) => {
		const borderWidth = getSheetCanvasCellBorderWidth(style, side);
		if (!borderWidth) {
			return;
		}

		const borderLine = getSheetCanvasCellBorderLine({
			height: params.height,
			left: params.x,
			side,
			top: params.y,
			width: params.width,
		});
		const borderLineKey = getSheetCanvasCellBorderLineKey(borderLine);

		if (params.renderedBorderLineKeys.has(borderLineKey)) {
			return;
		}

		params.renderedBorderLineKeys.add(borderLineKey);

		const borderStyle = getSheetCanvasCellBorderStyle(style, side);
		params.ctx.strokeStyle = getSheetCanvasCellBorderColor(style, side, params.theme);
		params.ctx.lineCap = borderStyle === 'dotted' ? 'round' : 'butt';
		params.ctx.lineWidth = borderWidth;

		if (borderStyle === 'double') {
			drawSheetCanvasCellDoubleBorderSide({
				ctx: params.ctx,
				height: params.height,
				left: params.x,
				side,
				top: params.y,
				width: params.width,
			});
			return;
		}

		drawSheetCanvasCellSimpleBorderSide({
			ctx: params.ctx,
			height: params.height,
			left: params.x,
			side,
			style: borderStyle,
			top: params.y,
			width: params.width,
		});
	});
	params.ctx.restore();
}

/*
 * Split a single text value into canvas-renderable lines that fit one width.
 */
function getSheetCanvasWrappedTextLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
	if (!text || maxWidth <= 0) {
		return [];
	}

	const lines: string[] = [];
	const sourceLines = text.split(/\r?\n/);

	sourceLines.forEach((sourceLine) => {
		const words = sourceLine.split(/(\s+)/).filter((part) => part.length > 0);
		let line = '';

		words.forEach((word) => {
			const nextLine = line ? `${line}${word}` : word.trimStart();

			if (ctx.measureText(nextLine).width <= maxWidth) {
				line = nextLine;
				return;
			}

			if (line) {
				lines.push(line.trimEnd());
			}
			line = word.trimStart();

			while (line && ctx.measureText(line).width > maxWidth) {
				let splitIndex = 1;

				while (
					splitIndex < line.length &&
					ctx.measureText(line.slice(0, splitIndex + 1)).width <= maxWidth
				) {
					splitIndex += 1;
				}

				lines.push(line.slice(0, splitIndex));
				line = line.slice(splitIndex);
			}
		});

		lines.push(line.trimEnd());
	});

	return lines;
}

/*
 * Return the underline y coordinate for canvas text drawn with a middle baseline.
 */
function getSheetCanvasTextUnderlineY(textMiddleY: number, lineHeight: number) {
	return Math.round(textMiddleY + lineHeight * 0.25) + 0.5;
}

/*
 * Return the underline stroke width scaled to the same line height as the rendered text.
 */
function getSheetCanvasTextUnderlineWidth(lineHeight: number) {
	return Math.max(1, lineHeight / 20);
}

/*
 * Return the strikethrough y coordinate for canvas text drawn with a middle baseline.
 */
function getSheetCanvasTextStrikethroughY(textMiddleY: number) {
	return Math.round(textMiddleY) + 0.5;
}

/*
 * Return the full-cell text style flags saved on one Sheet style object.
 */
function getSheetCanvasCellTextStyle(style?: SheetCanvasCellStyle | null): SheetCanvasTextStyle {
	return {
		bold: style?.bold === true,
		italic: style?.italic === true,
		strikethrough: style?.strikethrough === true,
		underline: style?.underline === true,
	};
}

/*
 * Return the font family that represents one cell-level text style.
 */
function getSheetCanvasCellTextFontFamily(style: SheetCanvasTextStyle, theme: SheetCanvasTheme, fallback?: string) {
	return style.bold ? theme.fontFamilySemibold : fallback || theme.fontFamily;
}

/*
 * Return one canvas font declaration for plain cell text.
 */
function getSheetCanvasTextFont(params: {
	fontFamily?: string;
	fontSize?: string;
	italic?: boolean;
	theme: SheetCanvasTheme;
}) {
	const fontStyle = params.italic ? 'italic ' : '';

	return `${fontStyle}${params.fontSize || params.theme.fontSize} ${params.fontFamily || params.theme.fontFamily}`;
}

/*
 * Add full-cell text styles onto parsed markdown parts without removing inline markdown styles.
 */
function getSheetCanvasMarkdownPartsWithTextStyle(parts: LabelMarkdownPart[], textStyle: SheetCanvasTextStyle) {
	if (!textStyle.bold && !textStyle.italic && !textStyle.strikethrough && !textStyle.underline) {
		return parts;
	}

	return parts.map((part) => ({
		...part,
		italic: textStyle.italic || part.italic,
		semibold: textStyle.bold || part.semibold,
		strikethrough: textStyle.strikethrough || part.strikethrough,
		underline: textStyle.underline || part.underline,
	}));
}

/*
 * Draw underline and strikethrough decorations for one plain text segment.
 */
function drawSheetCanvasTextDecorations(params: {
	color: string;
	ctx: CanvasRenderingContext2D;
	lineHeight: number;
	strikethrough?: boolean;
	textMiddleY: number;
	underline?: boolean;
	width: number;
	x: number;
}) {
	if (!params.underline && !params.strikethrough) {
		return;
	}

	params.ctx.beginPath();
	params.ctx.strokeStyle = params.color;
	params.ctx.lineWidth = getSheetCanvasTextUnderlineWidth(params.lineHeight);

	if (params.underline) {
		const underlineY = getSheetCanvasTextUnderlineY(params.textMiddleY, params.lineHeight);

		params.ctx.moveTo(params.x, underlineY);
		params.ctx.lineTo(params.x + params.width, underlineY);
	}

	if (params.strikethrough) {
		const strikethroughY = getSheetCanvasTextStrikethroughY(params.textMiddleY);

		params.ctx.moveTo(params.x, strikethroughY);
		params.ctx.lineTo(params.x + params.width, strikethroughY);
	}

	params.ctx.stroke();
}

/*
 * Return the canvas font declaration for one label-markdown text part.
 */
function getSheetCanvasMarkdownPartFont(params: {
	fontFamily?: string;
	fontSize?: string;
	part: LabelMarkdownPart;
	theme: SheetCanvasTheme;
}) {
	const fontStyle = params.part.italic ? 'italic ' : '';
	const fontFamily = params.part.semibold
		? params.theme.fontFamilySemibold
		: params.part.medium
			? params.theme.fontFamilyMedium
			: params.fontFamily || params.theme.fontFamily;

	return `${fontStyle}${params.fontSize || params.theme.fontSize} ${fontFamily}`;
}

/*
 * Return the measured width for one label-markdown text part.
 */
function getSheetCanvasMarkdownPartWidth(params: {
	ctx: CanvasRenderingContext2D;
	fontFamily?: string;
	fontSize?: string;
	part: LabelMarkdownPart;
	theme: SheetCanvasTheme;
}) {
	params.ctx.font = getSheetCanvasMarkdownPartFont(params);

	return params.ctx.measureText(params.part.text).width;
}

/*
 * Return a copy of one label-markdown part with different text.
 */
function getSheetCanvasMarkdownPartText(part: LabelMarkdownPart, text: string): LabelMarkdownPart {
	return {
		...part,
		text,
	};
}

/*
 * Recalculate the width for one wrapped markdown line.
 */
function getSheetCanvasMarkdownLineWidth(params: {
	ctx: CanvasRenderingContext2D;
	fontFamily?: string;
	fontSize?: string;
	line: SheetCanvasMarkdownLine;
	theme: SheetCanvasTheme;
}) {
	return params.line.parts.reduce((width, part) => {
		return width + getSheetCanvasMarkdownPartWidth({
			ctx: params.ctx,
			fontFamily: params.fontFamily,
			fontSize: params.fontSize,
			part,
			theme: params.theme,
		});
	}, 0);
}

/*
 * Remove trailing whitespace from one wrapped markdown line.
 */
function trimSheetCanvasMarkdownLineEnd(params: {
	ctx: CanvasRenderingContext2D;
	fontFamily?: string;
	fontSize?: string;
	line: SheetCanvasMarkdownLine;
	theme: SheetCanvasTheme;
}) {
	while (params.line.parts.length) {
		const lastPart = params.line.parts[params.line.parts.length - 1];
		const trimmedText = lastPart.text.trimEnd();

		if (trimmedText === lastPart.text) {
			break;
		}

		if (trimmedText) {
			params.line.parts[params.line.parts.length - 1] = getSheetCanvasMarkdownPartText(lastPart, trimmedText);
			break;
		}

		params.line.parts.pop();
	}

	params.line.width = getSheetCanvasMarkdownLineWidth(params);
}

/*
 * Add one markdown part to a wrapped markdown line.
 */
function appendSheetCanvasMarkdownLinePart(params: {
	ctx: CanvasRenderingContext2D;
	fontFamily?: string;
	fontSize?: string;
	line: SheetCanvasMarkdownLine;
	part: LabelMarkdownPart;
	theme: SheetCanvasTheme;
}) {
	const width = getSheetCanvasMarkdownPartWidth({
		ctx: params.ctx,
		fontFamily: params.fontFamily,
		fontSize: params.fontSize,
		part: params.part,
		theme: params.theme,
	});

	params.line.parts.push(params.part);
	params.line.width += width;
}

/*
 * Push one wrapped markdown line when it contains visible text.
 */
function pushSheetCanvasMarkdownLine(params: {
	ctx: CanvasRenderingContext2D;
	fontFamily?: string;
	fontSize?: string;
	line: SheetCanvasMarkdownLine;
	lines: SheetCanvasMarkdownLine[];
	theme: SheetCanvasTheme;
}) {
	trimSheetCanvasMarkdownLineEnd(params);

	if (params.line.parts.length) {
		params.lines.push({
			parts: params.line.parts,
			width: params.line.width,
		});
	}

	params.line.parts = [];
	params.line.width = 0;
}

/*
 * Return how many characters from one markdown part fit within the requested width.
 */
function getSheetCanvasMarkdownFittingTextLength(params: {
	ctx: CanvasRenderingContext2D;
	fontFamily?: string;
	fontSize?: string;
	maxWidth: number;
	part: LabelMarkdownPart;
	theme: SheetCanvasTheme;
}) {
	let low = 1;
	let high = params.part.text.length;
	let fitLength = 1;

	while (low <= high) {
		const mid = Math.floor((low + high) / 2);
		const nextPart = getSheetCanvasMarkdownPartText(params.part, params.part.text.slice(0, mid));
		const width = getSheetCanvasMarkdownPartWidth({
			ctx: params.ctx,
			fontFamily: params.fontFamily,
			fontSize: params.fontSize,
			part: nextPart,
			theme: params.theme,
		});

		if (width <= params.maxWidth) {
			fitLength = mid;
			low = mid + 1;
		} else {
			high = mid - 1;
		}
	}

	return fitLength;
}

/*
 * Append one markdown text token into wrapped markdown lines.
 */
function appendSheetCanvasMarkdownToken(params: {
	ctx: CanvasRenderingContext2D;
	fontFamily?: string;
	fontSize?: string;
	line: SheetCanvasMarkdownLine;
	lines: SheetCanvasMarkdownLine[];
	maxWidth: number;
	part: LabelMarkdownPart;
	theme: SheetCanvasTheme;
}) {
	let part = params.line.parts.length ? params.part : getSheetCanvasMarkdownPartText(params.part, params.part.text.trimStart());

	if (!part.text) {
		return;
	}

	const isWhitespace = !part.text.trim();
	if (isWhitespace && !params.line.parts.length) {
		return;
	}

	const partWidth = getSheetCanvasMarkdownPartWidth({
		ctx: params.ctx,
		fontFamily: params.fontFamily,
		fontSize: params.fontSize,
		part,
		theme: params.theme,
	});

	if (params.line.width + partWidth <= params.maxWidth) {
		appendSheetCanvasMarkdownLinePart({ ...params, part });
		return;
	}

	if (isWhitespace) {
		pushSheetCanvasMarkdownLine(params);
		return;
	}

	if (params.line.parts.length) {
		pushSheetCanvasMarkdownLine(params);
		part = getSheetCanvasMarkdownPartText(part, part.text.trimStart());
	}

	while (part.text) {
		const width = getSheetCanvasMarkdownPartWidth({
			ctx: params.ctx,
			fontFamily: params.fontFamily,
			fontSize: params.fontSize,
			part,
			theme: params.theme,
		});

		if (width <= params.maxWidth) {
			appendSheetCanvasMarkdownLinePart({ ...params, part });
			return;
		}

		const fitLength = getSheetCanvasMarkdownFittingTextLength({
			ctx: params.ctx,
			fontFamily: params.fontFamily,
			fontSize: params.fontSize,
			maxWidth: params.maxWidth,
			part,
			theme: params.theme,
		});
		const nextPart = getSheetCanvasMarkdownPartText(part, part.text.slice(0, fitLength));

		appendSheetCanvasMarkdownLinePart({ ...params, part: nextPart });
		pushSheetCanvasMarkdownLine(params);
		part = getSheetCanvasMarkdownPartText(part, part.text.slice(fitLength).trimStart());
	}
}

/*
 * Split label-markdown text into canvas-renderable wrapped lines.
 */
function getSheetCanvasWrappedMarkdownLines(params: {
	ctx: CanvasRenderingContext2D;
	fontFamily?: string;
	fontSize?: string;
	maxWidth: number;
	parts: LabelMarkdownPart[];
	theme: SheetCanvasTheme;
}) {
	const lines: SheetCanvasMarkdownLine[] = [];
	const line: SheetCanvasMarkdownLine = { parts: [], width: 0 };

	params.parts.forEach((part) => {
		const tokens = part.text.split(/(\r?\n|\s+)/).filter((token) => token.length > 0);

		tokens.forEach((token) => {
			if (/^\r?\n$/.test(token)) {
				pushSheetCanvasMarkdownLine({ ...params, line, lines });
				return;
			}

			appendSheetCanvasMarkdownToken({
				...params,
				line,
				lines,
				part: getSheetCanvasMarkdownPartText(part, token),
			});
		});
	});

	pushSheetCanvasMarkdownLine({ ...params, line, lines });

	return lines;
}

/*
 * Draw underline and strikethrough decorations for one markdown part.
 */
function drawSheetCanvasMarkdownPartDecorations(params: {
	color: string;
	ctx: CanvasRenderingContext2D;
	lineHeight: number;
	part: LabelMarkdownPart;
	textMiddleY: number;
	width: number;
	x: number;
}) {
	if (!params.part.underline && !params.part.strikethrough) {
		return;
	}

	params.ctx.beginPath();
	params.ctx.strokeStyle = params.color;
	params.ctx.lineWidth = getSheetCanvasTextUnderlineWidth(params.lineHeight);

	if (params.part.underline) {
		const underlineY = getSheetCanvasTextUnderlineY(params.textMiddleY, params.lineHeight);

		params.ctx.moveTo(params.x, underlineY);
		params.ctx.lineTo(params.x + params.width, underlineY);
	}

	if (params.part.strikethrough) {
		const strikethroughY = getSheetCanvasTextStrikethroughY(params.textMiddleY);

		params.ctx.moveTo(params.x, strikethroughY);
		params.ctx.lineTo(params.x + params.width, strikethroughY);
	}

	params.ctx.stroke();
}

/*
 * Draw label-preset markdown text clipped to one Sheet canvas cell rectangle.
 */
function drawSheetCanvasMarkdownText(params: {
	color: string;
	ctx: CanvasRenderingContext2D;
	fontFamily?: string;
	fontSize?: string;
	height: number;
	lineHeight?: number;
	textStyle?: SheetCanvasTextStyle;
	text: string;
	theme: SheetCanvasTheme;
	width: number;
	x: number;
	y: number;
}) {
	if (!params.text) {
		return;
	}

	const lineHeight = params.lineHeight || params.theme.fontLineHeightPx;
	const maxWidth = Math.max(0, params.width - SHEET_CANVAS_CELL_PADDING_X * 2);
	if (maxWidth <= 0) {
		return;
	}

	params.ctx.save();
	params.ctx.beginPath();
	params.ctx.rect(params.x + 1, params.y + 1, Math.max(0, params.width - 1), Math.max(0, params.height - 1));
	params.ctx.clip();
	params.ctx.fillStyle = params.color;
	params.ctx.textAlign = 'left';
	params.ctx.textBaseline = 'middle';

	const textX = params.x + SHEET_CANVAS_CELL_PADDING_X;
	const textY = params.y + 1;
	const textHeight = Math.max(0, params.height - 1);
	const lines = getSheetCanvasWrappedMarkdownLines({
		ctx: params.ctx,
		fontFamily: params.fontFamily,
		fontSize: params.fontSize,
		maxWidth,
		parts: getSheetCanvasMarkdownPartsWithTextStyle(
			parseLabelMarkdownText(params.text),
			params.textStyle || getSheetCanvasCellTextStyle(),
		),
		theme: params.theme,
	});
	const maxLineCount = Math.max(1, Math.floor((textHeight + SHEET_CANVAS_TEXT_LINE_GAP) / (lineHeight + SHEET_CANVAS_TEXT_LINE_GAP)));
	const visibleLines = lines.slice(0, maxLineCount);
	const totalTextHeight = visibleLines.length * lineHeight + Math.max(0, visibleLines.length - 1) * SHEET_CANVAS_TEXT_LINE_GAP;
	const firstBaselineY = textY + (textHeight - totalTextHeight) / 2 + lineHeight / 2;

	visibleLines.forEach((line, lineIndex) => {
		const baselineY = firstBaselineY + lineIndex * (lineHeight + SHEET_CANVAS_TEXT_LINE_GAP);
		let partX = textX;

		line.parts.forEach((part) => {
			const width = getSheetCanvasMarkdownPartWidth({
				ctx: params.ctx,
				fontFamily: params.fontFamily,
				fontSize: params.fontSize,
				part,
				theme: params.theme,
			});

			params.ctx.font = getSheetCanvasMarkdownPartFont({
				fontFamily: params.fontFamily,
				fontSize: params.fontSize,
				part,
				theme: params.theme,
			});
			params.ctx.fillText(part.text, partX, baselineY);
			drawSheetCanvasMarkdownPartDecorations({
				color: params.color,
				ctx: params.ctx,
				lineHeight,
				part,
				textMiddleY: baselineY,
				width: Math.min(width, Math.max(0, textX + maxWidth - partX)),
				x: partX,
			});
			partX += width;
		});
	});

	params.ctx.restore();
}

/*
 * Draw wrapped cell text while keeping it clipped to the cell rectangle.
 */
function drawSheetCanvasWrappedText(params: {
	color: string;
	ctx: CanvasRenderingContext2D;
	height: number;
	lineHeight: number;
	maxWidth: number;
	strikethrough?: boolean;
	text: string;
	underline?: boolean;
	x: number;
	y: number;
}) {
	if (!params.text || params.maxWidth <= 0) {
		return;
	}

	const lines = getSheetCanvasWrappedTextLines(params.ctx, params.text, params.maxWidth);
	const maxLineCount = Math.max(1, Math.floor((params.height + SHEET_CANVAS_TEXT_LINE_GAP) / (params.lineHeight + SHEET_CANVAS_TEXT_LINE_GAP)));
	const visibleLines = lines.slice(0, maxLineCount);
	const totalTextHeight = visibleLines.length * params.lineHeight + Math.max(0, visibleLines.length - 1) * SHEET_CANVAS_TEXT_LINE_GAP;
	const firstBaselineY = params.y + (params.height - totalTextHeight) / 2 + params.lineHeight / 2;

	params.ctx.fillStyle = params.color;
	params.ctx.textAlign = 'left';
	params.ctx.textBaseline = 'middle';

	visibleLines.forEach((line, index) => {
		const baselineY = firstBaselineY + index * (params.lineHeight + SHEET_CANVAS_TEXT_LINE_GAP);

		params.ctx.fillText(line, params.x, baselineY);

		drawSheetCanvasTextDecorations({
			color: params.color,
			ctx: params.ctx,
			lineHeight: params.lineHeight,
			strikethrough: params.strikethrough,
			textMiddleY: baselineY,
			underline: params.underline,
			width: Math.min(params.ctx.measureText(line).width, params.maxWidth),
			x: params.x,
		});
	});
}

/*
 * Draw clipped cell text inside one canvas rectangle.
 */
function drawSheetCanvasText(params: {
	align?: CanvasTextAlign;
	color: string;
	ctx: CanvasRenderingContext2D;
	fontFamily?: string;
	fontSize?: string;
	height: number;
	italic?: boolean;
	lineHeight?: number;
	strikethrough?: boolean;
	text: string;
	theme: SheetCanvasTheme;
	underline?: boolean;
	width: number;
	wrap?: boolean;
	x: number;
	y: number;
}) {
	if (!params.text) {
		return;
	}

	params.ctx.save();
	params.ctx.beginPath();
	params.ctx.rect(params.x + 1, params.y + 1, Math.max(0, params.width - 1), Math.max(0, params.height - 1));
	params.ctx.clip();
	params.ctx.fillStyle = params.color;
	params.ctx.font = getSheetCanvasTextFont({
		fontFamily: params.fontFamily,
		fontSize: params.fontSize,
		italic: params.italic,
		theme: params.theme,
	});
	params.ctx.textAlign = params.align || 'left';
	params.ctx.textBaseline = 'middle';

	const textX = params.align === 'center'
		? params.x + params.width / 2
		: params.x + SHEET_CANVAS_CELL_PADDING_X;
	const textY = params.y + 1;
	const textHeight = Math.max(0, params.height - 1);

	if (params.wrap && params.align !== 'center') {
		drawSheetCanvasWrappedText({
			color: params.color,
			ctx: params.ctx,
			height: textHeight,
			lineHeight: params.lineHeight || params.theme.fontLineHeightPx,
			maxWidth: Math.max(0, params.width - SHEET_CANVAS_CELL_PADDING_X * 2),
			strikethrough: params.strikethrough,
			text: params.text,
			underline: params.underline,
			x: textX,
			y: textY,
		});
	} else {
		params.ctx.fillText(
			params.text,
			textX,
			textY + textHeight / 2,
		);

		const lineHeight = params.lineHeight || params.theme.fontLineHeightPx;
		const textWidth = Math.min(params.ctx.measureText(params.text).width, Math.max(0, params.width - SHEET_CANVAS_CELL_PADDING_X * 2));
		const decorationLeft = params.align === 'center' ? textX - textWidth / 2 : textX;

		drawSheetCanvasTextDecorations({
			color: params.color,
			ctx: params.ctx,
			lineHeight,
			strikethrough: params.strikethrough,
			textMiddleY: textY + textHeight / 2,
			underline: params.underline,
			width: textWidth,
			x: decorationLeft,
		});
	}
	params.ctx.restore();
}

/*
 * Return whether one cell value can use spreadsheet-style horizontal overflow.
 */
function canSheetCanvasCellTextOverflow(cell?: SheetCanvasCell | null) {
	const text = cell?.displayValue || '';

	if (!text || cell?.dataTableDisplay || /\r?\n/.test(text)) {
		return false;
	}

	if (cell?.style?.disableMarkdown === true) {
		return true;
	}

	const parts = parseLabelMarkdownText(text);
	const onlyPart = parts[0];

	return parts.length === 1 &&
		onlyPart?.text === text &&
		!onlyPart.italic &&
		!onlyPart.medium &&
		!onlyPart.semibold &&
		!onlyPart.strikethrough &&
		!onlyPart.underline;
}

/*
 * Return whether one neighboring cell should stop horizontal text overflow.
 */
function isSheetCanvasTextOverflowBlocker(cell?: SheetCanvasCell | null) {
	return Boolean(cell && (cell.displayValue || cell.dataTableDisplay?.text));
}

/*
 * Return the canvas font declaration used to measure and draw plain Sheet text.
 */
function getSheetCanvasPlainTextFont(params: {
	cell?: SheetCanvasCell | null;
	theme: SheetCanvasTheme;
}) {
	const textStyle = getSheetCanvasCellTextStyle(params.cell?.style);
	const fontFamily = getSheetCanvasCellTextFontFamily(textStyle, params.theme);

	return getSheetCanvasTextFont({
		fontFamily,
		fontSize: getSheetCanvasCellFontSize(params.cell?.style, params.theme),
		italic: textStyle.italic,
		theme: params.theme,
	});
}

/*
 * Return whether one cell's plain text exceeds the current cell width.
 */
function sheetCanvasCellTextExceedsWidth(params: {
	cell?: SheetCanvasCell | null;
	ctx: CanvasRenderingContext2D;
	theme: SheetCanvasTheme;
	width: number;
}) {
	if (!canSheetCanvasCellTextOverflow(params.cell)) {
		return false;
	}

	params.ctx.save();
	params.ctx.font = getSheetCanvasPlainTextFont({
		cell: params.cell,
		theme: params.theme,
	});

	const textWidth = params.ctx.measureText(params.cell?.displayValue || '').width;
	params.ctx.restore();

	return textWidth > Math.max(0, params.width - SHEET_CANVAS_CELL_PADDING_X * 2);
}

/*
 * Return the visible rectangle available to one overflowing Sheet cell.
 */
function getSheetCanvasCellTextOverflow(params: {
	cell?: SheetCanvasCell | null;
	cellLookup: Map<string, SheetCanvasCell>;
	columnRect: SheetCanvasColumnRect;
	columnRects: SheetCanvasColumnRect[];
	ctx: CanvasRenderingContext2D;
	rowRect: SheetCanvasRowRect;
	theme: SheetCanvasTheme;
}): SheetCanvasTextOverflow | null {
	const cell = params.cell;

	if (!cell || !canSheetCanvasCellTextOverflow(cell)) {
		return null;
	}

	params.ctx.save();
	params.ctx.font = getSheetCanvasPlainTextFont({
		cell,
		theme: params.theme,
	});

	const textWidth = params.ctx.measureText(cell.displayValue).width;
	params.ctx.restore();

	const requiredWidth = textWidth + SHEET_CANVAS_CELL_PADDING_X * 2;
	if (requiredWidth <= params.columnRect.width) {
		return null;
	}

	const sourceIndex = params.columnRects.findIndex((rect) => rect.cellKey === params.columnRect.cellKey);
	if (sourceIndex < 0) {
		return null;
	}

	let right = params.columnRect.left + params.columnRect.width;
	let previousColumnIndex = params.columnRect.metric.columnIndex;

	for (let index = sourceIndex + 1; index < params.columnRects.length && right - params.columnRect.left < requiredWidth; index += 1) {
		const nextRect = params.columnRects[index];

		if (nextRect.metric.columnIndex !== previousColumnIndex + 1) {
			break;
		}

		const neighborCell = params.cellLookup.get(getSheetCellKey(params.rowRect.metric.rowKey, nextRect.cellKey));
		if (isSheetCanvasTextOverflowBlocker(neighborCell)) {
			break;
		}

		right = nextRect.left + nextRect.width;
		previousColumnIndex = nextRect.metric.columnIndex;
	}

	return {
		cell,
		rect: {
			height: params.rowRect.height,
			left: params.columnRect.left,
			top: params.rowRect.top,
			width: Math.max(0, right - params.columnRect.left),
		},
	};
}

/*
 * Draw one horizontally overflowing text cell above default grid lines.
 */
function drawSheetCanvasTextOverflow(params: {
	ctx: CanvasRenderingContext2D;
	overflow: SheetCanvasTextOverflow;
	theme: SheetCanvasTheme;
}) {
	const cell = params.overflow.cell;
	const rect = params.overflow.rect;
	const textStyle = getSheetCanvasCellTextStyle(cell.style);
	const backgroundColor = getSheetCanvasResolvedStyleColor(params.theme, getSheetCanvasStyleColor(cell.style, 'fillColor')) || params.theme.background;
	const textColor = getSheetCanvasResolvedStyleColor(params.theme, getSheetCanvasStyleColor(cell.style, 'textColor')) || params.theme.bodyText;
	const contentOpacity = cell.formulaLoading ? 0.5 : 1;

	drawSheetCanvasCellFillRect({
		ctx: params.ctx,
		color: backgroundColor,
		height: rect.height,
		left: rect.left,
		top: rect.top,
		width: rect.width,
	});

	params.ctx.save();
	params.ctx.globalAlpha *= contentOpacity;
	drawSheetCanvasText({
		color: textColor,
		ctx: params.ctx,
		fontFamily: getSheetCanvasCellTextFontFamily(textStyle, params.theme),
		fontSize: getSheetCanvasCellFontSize(cell.style, params.theme),
		height: rect.height,
		italic: textStyle.italic,
		lineHeight: getSheetCanvasCellLineHeightPx(cell.style, params.theme),
		strikethrough: textStyle.strikethrough,
		text: cell.displayValue,
		theme: params.theme,
		underline: textStyle.underline,
		width: rect.width,
		x: rect.left,
		y: rect.top,
	});
	params.ctx.restore();
}

/*
 * Draw a rounded rectangle with a fallback for browsers that do not support roundRect.
 */
function drawSheetCanvasRoundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
	const safeRadius = Math.max(0, Math.min(radius, width / 2, height / 2));

	if (typeof ctx.roundRect === 'function') {
		ctx.roundRect(x, y, width, height, safeRadius);
		return;
	}

	ctx.moveTo(x + safeRadius, y);
	ctx.lineTo(x + width - safeRadius, y);
	ctx.quadraticCurveTo(x + width, y, x + width, y + safeRadius);
	ctx.lineTo(x + width, y + height - safeRadius);
	ctx.quadraticCurveTo(x + width, y + height, x + width - safeRadius, y + height);
	ctx.lineTo(x + safeRadius, y + height);
	ctx.quadraticCurveTo(x, y + height, x, y + height - safeRadius);
	ctx.lineTo(x, y + safeRadius);
	ctx.quadraticCurveTo(x, y, x + safeRadius, y);
}

/*
 * Return the rendered height for one small Sheet canvas tag.
 */
function getSheetCanvasTagHeight(theme: SheetCanvasTheme) {
	return Math.ceil(theme.tagLineHeightPx + (SHEET_CANVAS_READ_ONLY_TAG_PADDING_Y * 2));
}

/*
 * Return the visible canvas body area below the column headers and beside the row numbers.
 */
function getSheetCanvasBodyClipRect(viewportWidth: number, viewportHeight: number): SheetCanvasRect {
	return {
		height: Math.max(0, viewportHeight - SHEET_HEADER_HEIGHT),
		left: SHEET_ROW_NUMBER_WIDTH,
		top: SHEET_HEADER_HEIGHT,
		width: Math.max(0, viewportWidth - SHEET_ROW_NUMBER_WIDTH),
	};
}

/*
 * Draw one small Sheet canvas tag with the same spacing as the shared DOM tag.
 */
function drawSheetCanvasTag(params: {
	align?: 'left' | 'right';
	backgroundColor: string;
	borderColor?: string | null;
	clipRect?: SheetCanvasRect | null;
	ctx: CanvasRenderingContext2D;
	heightOffset?: number;
	left: number;
	text: string;
	textColor: string;
	theme: SheetCanvasTheme;
	top: number;
	viewportHeight: number;
	viewportWidth: number;
}) {
	if (!params.text) {
		return;
	}

	const height = Math.max(1, getSheetCanvasTagHeight(params.theme) + (params.heightOffset || 0));
	const font = `${params.theme.tagFontSize} ${params.theme.fontFamilyMedium}`;

	params.ctx.save();
	params.ctx.font = font;

	const width = Math.ceil(params.ctx.measureText(params.text).width + (SHEET_CANVAS_READ_ONLY_TAG_PADDING_X * 2));
	const x = Math.round(params.align === 'right' ? params.left - width : params.left);
	const y = Math.round(params.top);
	if (!sheetCanvasRectIsVisible({ height, left: x, top: y, width }, params.viewportWidth, params.viewportHeight)) {
		params.ctx.restore();
		return;
	}

	if (params.clipRect) {
		const clipRight = params.clipRect.left + params.clipRect.width;
		const clipBottom = params.clipRect.top + params.clipRect.height;
		const tagRight = x + width;
		const tagBottom = y + height;

		if (
			tagRight <= params.clipRect.left ||
			x >= clipRight ||
			tagBottom <= params.clipRect.top ||
			y >= clipBottom
		) {
			params.ctx.restore();
			return;
		}

		params.ctx.beginPath();
		params.ctx.rect(
			params.clipRect.left,
			params.clipRect.top,
			params.clipRect.width,
			params.clipRect.height,
		);
		params.ctx.clip();
	}

	params.ctx.fillStyle = params.backgroundColor;
	params.ctx.fillRect(x, y, width, height);
	if (params.borderColor) {
		params.ctx.strokeStyle = params.borderColor;
		params.ctx.lineWidth = 1;
		params.ctx.strokeRect(
			x + 0.5,
			y + 0.5,
			Math.max(0, width - 1),
			Math.max(0, height - 1),
		);
	}
	params.ctx.fillStyle = params.textColor;
	params.ctx.font = font;
	params.ctx.textAlign = 'left';
	params.ctx.textBaseline = 'middle';
	params.ctx.fillText(
		params.text,
		x + SHEET_CANVAS_READ_ONLY_TAG_PADDING_X,
		y + height / 2,
	);
	params.ctx.restore();
}

/*
 * Draw the Sheet read-only DataTable tag with the same spacing and colors as the shared DOM tag.
 */
function drawSheetCanvasReadOnlyTag(params: {
	ctx: CanvasRenderingContext2D;
	position?: DataTableLocalEditorPosition | null;
	scrollLeft: number;
	scrollTop: number;
	theme: SheetCanvasTheme;
	viewportHeight: number;
	viewportWidth: number;
}) {
	if (!params.position) {
		return;
	}

	drawSheetCanvasTag({
		backgroundColor: params.theme.contrast,
		ctx: params.ctx,
		left: params.position.left - params.scrollLeft - 1,
		text: i18n.t('form.not_editable'),
		textColor: params.theme.solid,
		theme: params.theme,
		top: params.position.top - params.scrollTop - 1,
		viewportHeight: params.viewportHeight,
		viewportWidth: params.viewportWidth,
	});
}

/*
 * Draw one DataTable icon in the Sheet canvas using the same semantic icon name as DataTable DOM cells.
 */
function drawSheetCanvasDataTableIcon(params: {
	color: string;
	ctx: CanvasRenderingContext2D;
	name?: string | null;
	size: number;
	x: number;
	y: number;
}) {
	const paths = params.name ? getSheetCanvasDataTableIconPaths(params.name) : null;
	if (!paths?.length) {
		return;
	}

	params.ctx.save();
	params.ctx.translate(params.x, params.y);
	params.ctx.scale(params.size / 24, params.size / 24);
	params.ctx.strokeStyle = params.color;
	params.ctx.lineWidth = 1.5;
	params.ctx.lineCap = 'round';
	params.ctx.lineJoin = 'round';
	paths.forEach((path) => {
		params.ctx.stroke(path);
	});
	params.ctx.restore();
}

/*
 * Return cached Path2D instances for one DataTable display icon.
 */
function getSheetCanvasDataTableIconPaths(name: string) {
	if (typeof Path2D === 'undefined') {
		return null;
	}

	const cachedPaths = SHEET_CANVAS_DATA_TABLE_ICON_PATH_CACHE.get(name);
	if (cachedPaths) {
		return cachedPaths;
	}

	const pathData = getIconSVGPathData(name);
	if (!pathData?.length) {
		return null;
	}

	const paths = pathData.map((path) => new Path2D(path));
	SHEET_CANVAS_DATA_TABLE_ICON_PATH_CACHE.set(name, paths);

	return paths;
}

/*
 * Draw text clipped to a DataTable display area and optionally underline it for link cells.
 */
function drawSheetCanvasDataTableText(params: {
	color: string;
	ctx: CanvasRenderingContext2D;
	fontFamily?: string;
	fontSize?: string;
	height: number;
	italic?: boolean;
	lineHeight?: number;
	maxWidth: number;
	strikethrough?: boolean;
	text: string;
	theme: SheetCanvasTheme;
	underline?: boolean;
	x: number;
	y: number;
}) {
	if (!params.text || params.maxWidth <= 0) {
		return;
	}

	params.ctx.save();
	params.ctx.beginPath();
	params.ctx.rect(params.x, params.y, params.maxWidth, params.height);
	params.ctx.clip();
	params.ctx.fillStyle = params.color;
	params.ctx.font = getSheetCanvasTextFont({
		fontFamily: params.fontFamily,
		fontSize: params.fontSize,
		italic: params.italic,
		theme: params.theme,
	});
	params.ctx.textAlign = 'left';
	params.ctx.textBaseline = 'middle';

	drawSheetCanvasWrappedText({
		color: params.color,
		ctx: params.ctx,
		height: params.height,
		lineHeight: params.lineHeight || params.theme.fontLineHeightPx,
		maxWidth: params.maxWidth,
		strikethrough: params.strikethrough,
		text: params.text,
		underline: params.underline,
		x: params.x,
		y: params.y,
	});

	params.ctx.restore();
}

/*
 * Resolve the canvas fill color for one DataTable select-style pill.
 */
function getSheetCanvasDataTablePillBackground(theme: SheetCanvasTheme, model: NonNullable<SheetCanvasCell['dataTableDisplay']>) {
	const backgroundKey = model.pillBackgroundCssVar || model.pillColorName || '';

	return backgroundKey ? theme.selectPillBackgrounds[backgroundKey] || '#e5e7eb' : '#e5e7eb';
}

/*
 * Draw DataTable display semantics into the Sheet canvas cell renderer.
 */
function drawSheetCanvasDataTableDisplay(params: {
	cell: SheetCanvasCell;
	color: string;
	ctx: CanvasRenderingContext2D;
	fontFamily?: string;
	fontSize?: string;
	height: number;
	italic?: boolean;
	lineHeight?: number;
	strikethrough?: boolean;
	theme: SheetCanvasTheme;
	underline?: boolean;
	width: number;
	x: number;
	y: number;
}) {
	const model = params.cell.dataTableDisplay;
	if (!model?.text) {
		return;
	}

	const clipX = params.x + 1;
	const clipY = params.y + 1;
	const clipWidth = Math.max(0, params.width - 1);
	const clipHeight = Math.max(0, params.height - 1);
	const contentX = params.x + SHEET_CANVAS_CELL_PADDING_X;
	const contentRight = params.x + params.width - SHEET_CANVAS_CELL_PADDING_X;

	if (model.kind === 'selectPill') {
		params.ctx.save();
		params.ctx.font = getSheetCanvasTextFont({
			fontFamily: params.fontFamily,
			fontSize: params.fontSize,
			italic: params.italic,
			theme: params.theme,
		});

		const metrics = params.ctx.measureText(model.text);
		const lineHeight = params.lineHeight || params.theme.fontLineHeightPx;
		const pillHeight = Math.min(clipHeight, Math.max(0, lineHeight + model.pillPaddingY * 2));
		const pillWidth = Math.min(Math.max(0, contentRight - contentX), Math.ceil(metrics.width) + model.pillPaddingX * 2);
		const pillY = params.y + (params.height - pillHeight) / 2;

		params.ctx.beginPath();
		params.ctx.rect(clipX, clipY, clipWidth, clipHeight);
		params.ctx.clip();
		params.ctx.beginPath();
		drawSheetCanvasRoundedRect(params.ctx, contentX, pillY, pillWidth, pillHeight, model.pillRadius);
		params.ctx.fillStyle = getSheetCanvasDataTablePillBackground(params.theme, model);
		params.ctx.fill();
		params.ctx.beginPath();
		params.ctx.rect(contentX + model.pillPaddingX, pillY, Math.max(0, pillWidth - model.pillPaddingX * 2), pillHeight);
		params.ctx.clip();
		params.ctx.fillStyle = params.color;
		params.ctx.textAlign = 'left';
		params.ctx.textBaseline = 'middle';
		params.ctx.fillText(model.text, contentX + model.pillPaddingX, pillY + pillHeight / 2);
		drawSheetCanvasTextDecorations({
			color: params.color,
			ctx: params.ctx,
			lineHeight,
			strikethrough: params.strikethrough,
			textMiddleY: pillY + pillHeight / 2,
			underline: params.underline,
			width: Math.min(metrics.width, Math.max(0, pillWidth - model.pillPaddingX * 2)),
			x: contentX + model.pillPaddingX,
		});
		params.ctx.restore();
		return;
	}

	params.ctx.save();
	params.ctx.beginPath();
	params.ctx.rect(clipX, clipY, clipWidth, clipHeight);
	params.ctx.clip();

	let textX = contentX;
	if (model.iconName) {
		const iconY = params.y + (params.height - model.iconSize) / 2;

		drawSheetCanvasDataTableIcon({
			color: params.color,
			ctx: params.ctx,
			name: model.iconName,
			size: model.iconSize,
			x: contentX,
			y: iconY,
		});
		textX += model.iconSize + model.iconGap;
	}

	params.ctx.restore();
	drawSheetCanvasDataTableText({
		color: params.color,
		ctx: params.ctx,
		fontFamily: params.fontFamily,
		fontSize: params.fontSize,
		height: clipHeight,
		italic: params.italic,
		lineHeight: params.lineHeight,
		maxWidth: Math.max(0, contentRight - textX),
		strikethrough: params.strikethrough,
		text: model.text,
		theme: params.theme,
		underline: params.underline || model.canOpen,
		x: textX,
		y: clipY,
	});
}

/*
 * Draw an active selection border inside the selected cell rectangle.
 */
function drawSheetCanvasCellActiveBorder(params: {
	color?: string;
	ctx: CanvasRenderingContext2D;
	height: number;
	left: number;
	top: number;
	theme: SheetCanvasTheme;
	width: number;
}) {
	const left = Math.round(params.left);
	const top = Math.round(params.top);
	const right = left + Math.max(0, Math.round(params.width)) + 1;
	const bottom = top + Math.max(0, Math.round(params.height)) + 1;

	params.ctx.fillStyle = params.color || params.theme.active;
	params.ctx.fillRect(left, top, right - left, 2);
	params.ctx.fillRect(left, bottom - 2, right - left, 2);
	params.ctx.fillRect(left, top, 2, bottom - top);
	params.ctx.fillRect(right - 2, top, 2, bottom - top);
}

/*
 * Return visible column rectangles with sheet coordinate metadata resolved once per paint.
 */
function getSheetCanvasVisibleColumnRects(params: {
	columns: SheetColumnMetric[];
	scrollLeft: number;
	stickyColumnCount: number;
	viewportHeight: number;
	viewportWidth: number;
}) {
	const rects: SheetCanvasColumnRect[] = [];

	params.columns.forEach((metric) => {
		const canvasColumn = metric.column as SheetCanvasColumn;
		const columnIndex = canvasColumn.sheetColumnIndex || Number(metric.column.key || 0);
		const rect = {
			cellKey: String(columnIndex || metric.column.key),
			height: params.viewportHeight,
			left: getSheetCanvasColumnDisplayLeft(metric, params.scrollLeft, params.stickyColumnCount),
			metric,
			top: 0,
			width: metric.width,
		};

		if (sheetCanvasRectIsVisible(rect, params.viewportWidth, params.viewportHeight)) {
			rects.push(rect);
		}
	});

	return rects;
}

/*
 * Return visible row rectangles with sheet coordinate metadata resolved once per paint.
 */
function getSheetCanvasVisibleRowRects(params: {
	rowMetrics: SheetRowMetric[];
	scrollTop: number;
	viewportHeight: number;
	viewportWidth: number;
}) {
	const rects: SheetCanvasRowRect[] = [];

	params.rowMetrics.forEach((metric) => {
		const rect = {
			height: metric.height,
			left: SHEET_ROW_NUMBER_WIDTH,
			metric,
			top: getSheetCanvasRowDisplayTop(metric, params.scrollTop),
			width: Math.max(0, params.viewportWidth - SHEET_ROW_NUMBER_WIDTH),
		};

		if (sheetCanvasRectIsVisible(rect, params.viewportWidth, params.viewportHeight)) {
			rects.push(rect);
		}
	});

	return rects;
}

/*
 * Return the visible pixel rectangle that covers one sheet index range, or
 * null when no visible columns/rows intersect it.
 */
function getSheetCanvasIndexRangeRect(params: {
	columns: SheetColumnMetric[];
	endColumnIndex: number;
	endRowIndex: number;
	rowMetrics: SheetRowMetric[];
	scrollLeft: number;
	scrollTop: number;
	startColumnIndex: number;
	startRowIndex: number;
	stickyColumnCount: number;
}): SheetCanvasRect | null {
	let left = Infinity;
	let right = -Infinity;
	let top = Infinity;
	let bottom = -Infinity;

	params.columns.forEach((metric) => {
		const canvasColumn = metric.column as SheetCanvasColumn;
		const columnIndex = canvasColumn.sheetColumnIndex || Number(metric.column.key || 0);
		if (columnIndex >= params.startColumnIndex && columnIndex <= params.endColumnIndex) {
			const displayLeft = getSheetCanvasColumnDisplayLeft(metric, params.scrollLeft, params.stickyColumnCount);
			left = Math.min(left, displayLeft);
			right = Math.max(right, displayLeft + metric.width);
		}
	});

	params.rowMetrics.forEach((metric) => {
		const rowIndex = Math.floor(Number(metric.rowKey || 0));
		if (rowIndex >= params.startRowIndex && rowIndex <= params.endRowIndex) {
			const displayTop = getSheetCanvasRowDisplayTop(metric, params.scrollTop);
			top = Math.min(top, displayTop);
			bottom = Math.max(bottom, displayTop + metric.height);
		}
	});

	if (!Number.isFinite(left) || !Number.isFinite(right) || !Number.isFinite(top) || !Number.isFinite(bottom)) {
		return null;
	}

	return {
		height: bottom - top,
		left,
		top,
		width: right - left,
	};
}

/*
 * Draw other viewers' live selections: a solid range border and active cell
 * border in each user's color (the local user's own selection stays dashed),
 * plus a name chip anchored to the active cell.
 */
function drawSheetCanvasRemoteSelections(params: {
	bodyClipRect: SheetCanvasRect;
	columns: SheetColumnMetric[];
	ctx: CanvasRenderingContext2D;
	remoteSelections?: SheetRemoteSelection[] | null;
	rowMetrics: SheetRowMetric[];
	scrollLeft: number;
	scrollTop: number;
	stickyColumnCount: number;
	theme: SheetCanvasTheme;
	viewportHeight: number;
	viewportWidth: number;
}) {
	if (!params.remoteSelections?.length) {
		return;
	}

	const { ctx } = params;
	ctx.save();
	ctx.beginPath();
	ctx.rect(params.bodyClipRect.left, params.bodyClipRect.top, params.bodyClipRect.width, params.bodyClipRect.height);
	ctx.clip();

	params.remoteSelections.forEach((remoteSelection) => {
		const { color, selection, user } = remoteSelection;
		const rangeRect = getSheetCanvasIndexRangeRect({
			columns: params.columns,
			endColumnIndex: selection.range.endColumnIndex,
			endRowIndex: selection.range.endRowIndex,
			rowMetrics: params.rowMetrics,
			scrollLeft: params.scrollLeft,
			scrollTop: params.scrollTop,
			startColumnIndex: selection.range.startColumnIndex,
			startRowIndex: selection.range.startRowIndex,
			stickyColumnCount: params.stickyColumnCount,
		});

		if (rangeRect && sheetCanvasRectIsVisible(rangeRect, params.viewportWidth, params.viewportHeight)) {
			ctx.save();
			ctx.beginPath();
			ctx.strokeStyle = color;
			ctx.lineWidth = 1;
			ctx.strokeRect(
				Math.round(rangeRect.left) + 0.5,
				Math.round(rangeRect.top) + 0.5,
				Math.max(0, Math.round(rangeRect.width) - 1),
				Math.max(0, Math.round(rangeRect.height) - 1),
			);
			ctx.restore();
		}

		const activeRect = selection.active
			? getSheetCanvasIndexRangeRect({
				columns: params.columns,
				endColumnIndex: selection.active.columnIndex,
				endRowIndex: selection.active.rowIndex,
				rowMetrics: params.rowMetrics,
				scrollLeft: params.scrollLeft,
				scrollTop: params.scrollTop,
				startColumnIndex: selection.active.columnIndex,
				startRowIndex: selection.active.rowIndex,
				stickyColumnCount: params.stickyColumnCount,
			})
			: null;

		if (activeRect && sheetCanvasRectIsVisible(activeRect, params.viewportWidth, params.viewportHeight)) {
			ctx.save();
			ctx.globalAlpha = 0.6;
			drawSheetCanvasCellActiveBorder({
				color,
				ctx,
				height: activeRect.height - 1,
				left: activeRect.left,
				top: activeRect.top,
				theme: params.theme,
				width: activeRect.width - 1,
			});
			ctx.restore();
		}

		// Anchor the name chip above the active cell; below when clipped
		const chipAnchorRect = activeRect || rangeRect;
		if (chipAnchorRect && user.displayName) {
			const chipHeight = getSheetCanvasTagHeight(params.theme);
			const chipTop = chipAnchorRect.top - chipHeight >= params.bodyClipRect.top
				? chipAnchorRect.top - chipHeight
				: chipAnchorRect.top + chipAnchorRect.height;

			drawSheetCanvasTag({
				backgroundColor: color,
				ctx,
				left: chipAnchorRect.left,
				text: user.displayName,
				textColor: isDarkColor(color) ? '#ffffff' : '#1f2937',
				theme: params.theme,
				top: chipTop,
				viewportHeight: params.viewportHeight,
				viewportWidth: params.viewportWidth,
			});
		}
	});

	ctx.restore();
}

// Loading outline: same dash pattern as the selection border, animated
const SHEET_CANVAS_LOADING_DASH = [4, 3];
const SHEET_CANVAS_LOADING_DASH_SPEED = 0.02;

/*
 * Draw animated dashed outlines around cells and region areas that are
 * waiting on server-computed data. The dash offset advances with time, so the
 * outline appears to rotate while the surface repaints each frame.
 */
function drawSheetCanvasLoadingOutlines(params: {
	bodyClipRect: SheetCanvasRect;
	columns: SheetColumnMetric[];
	ctx: CanvasRenderingContext2D;
	loadingCellCoords?: Array<{ rowIndex: number; columnIndex: number }> | null;
	loadingRegionRects?: Array<{
		startRowIndex: number;
		startColumnIndex: number;
		endRowIndex: number;
		endColumnIndex: number;
	}> | null;
	rowMetrics: SheetRowMetric[];
	scrollLeft: number;
	scrollTop: number;
	stickyColumnCount: number;
	theme: SheetCanvasTheme;
	viewportHeight: number;
	viewportWidth: number;
}) {
	if (!params.loadingCellCoords?.length && !params.loadingRegionRects?.length) {
		return;
	}

	const { ctx } = params;
	const dashLength = SHEET_CANVAS_LOADING_DASH[0] + SHEET_CANVAS_LOADING_DASH[1];
	const dashOffset = -((performance.now() * SHEET_CANVAS_LOADING_DASH_SPEED) % dashLength);

	ctx.save();
	ctx.beginPath();
	ctx.rect(params.bodyClipRect.left, params.bodyClipRect.top, params.bodyClipRect.width, params.bodyClipRect.height);
	ctx.clip();
	ctx.setLineDash(SHEET_CANVAS_LOADING_DASH);
	ctx.lineDashOffset = dashOffset;
	ctx.strokeStyle = params.theme.active;
	ctx.lineWidth = 1;

	const strokeIndexRange = (startRowIndex: number, startColumnIndex: number, endRowIndex: number, endColumnIndex: number) => {
		const rect = getSheetCanvasIndexRangeRect({
			columns: params.columns,
			endColumnIndex,
			endRowIndex,
			rowMetrics: params.rowMetrics,
			scrollLeft: params.scrollLeft,
			scrollTop: params.scrollTop,
			startColumnIndex,
			startRowIndex,
			stickyColumnCount: params.stickyColumnCount,
		});

		if (!rect) {
			return;
		}

		// Identical box geometry to drawSheetCanvasSelectionBorder so the
		// loading outline lands exactly where the selection outline renders
		const position = {
			height: rect.height + 1,
			left: rect.left - 1,
			top: rect.top - 1,
			width: rect.width + 1,
		};

		if (sheetCanvasRectIsVisible(position, params.viewportWidth, params.viewportHeight)) {
			ctx.strokeRect(
				Math.round(position.left) + 1.5,
				Math.round(position.top) + 1.5,
				Math.max(0, Math.round(position.width) - 1),
				Math.max(0, Math.round(position.height) - 1),
			);
		}
	};

	(params.loadingCellCoords || []).forEach((coord) => {
		strokeIndexRange(coord.rowIndex, coord.columnIndex, coord.rowIndex, coord.columnIndex);
	});
	(params.loadingRegionRects || []).forEach((rect) => {
		strokeIndexRange(rect.startRowIndex, rect.startColumnIndex, rect.endRowIndex, rect.endColumnIndex);
	});

	ctx.restore();
}

/*
 * Draw a dashed border around the full multi-cell selection range.
 */
function drawSheetCanvasSelectionBorder(params: {
	columns: SheetColumnMetric[];
	ctx: CanvasRenderingContext2D;
	rowMetrics: SheetRowMetric[];
	scrollLeft: number;
	scrollTop: number;
	selectedCellKeyMap?: SheetUISelectedCellKeyMap | null;
	stickyColumnCount: number;
	theme: SheetCanvasTheme;
	viewportHeight: number;
	viewportWidth: number;
}) {
	const position = getGridSelectionBoxPosition({
		columnMetrics: params.columns,
		getColumnDisplayLeft: (metric) => {
			return getSheetCanvasColumnDisplayLeft(metric, params.scrollLeft, params.stickyColumnCount) - SHEET_ROW_NUMBER_WIDTH;
		},
		getRowDisplayTop: (metric) => {
			return metric.top - params.scrollTop;
		},
		rowMetrics: params.rowMetrics,
		selectedCellKeyMap: params.selectedCellKeyMap,
		stickyHeaderHeight: SHEET_HEADER_HEIGHT,
	});

	if (!position || !sheetCanvasRectIsVisible(position, params.viewportWidth, params.viewportHeight)) {
		return;
	}

	params.ctx.save();
	params.ctx.beginPath();
	params.ctx.setLineDash([4, 3]);
	params.ctx.strokeStyle = params.theme.active;
	params.ctx.lineWidth = 1;
	params.ctx.strokeRect(
		Math.round(position.left) + 1.5,
		Math.round(position.top) + 1.5,
		Math.max(0, Math.round(position.width) - 1),
		Math.max(0, Math.round(position.height) - 1),
	);
	params.ctx.restore();
}

/*
 * Draw a dashed preview border around the pending fill-handle target range.
 */
function drawSheetCanvasFillPreviewBorder(params: {
	columns: SheetColumnMetric[];
	ctx: CanvasRenderingContext2D;
	fillPreviewRange?: SheetMergedRangeObj | null;
	rowMetrics: SheetRowMetric[];
	scrollLeft: number;
	scrollTop: number;
	stickyColumnCount: number;
	theme: SheetCanvasTheme;
	viewportHeight: number;
	viewportWidth: number;
}) {
	if (!params.fillPreviewRange) {
		return;
	}

	const rect = getSheetCanvasIndexRangeRect({
		columns: params.columns,
		endColumnIndex: params.fillPreviewRange.endColumnIndex,
		endRowIndex: params.fillPreviewRange.endRowIndex,
		rowMetrics: params.rowMetrics,
		scrollLeft: params.scrollLeft,
		scrollTop: params.scrollTop,
		startColumnIndex: params.fillPreviewRange.startColumnIndex,
		startRowIndex: params.fillPreviewRange.startRowIndex,
		stickyColumnCount: params.stickyColumnCount,
	});

	if (!rect || !sheetCanvasRectIsVisible(rect, params.viewportWidth, params.viewportHeight)) {
		return;
	}

	params.ctx.save();
	params.ctx.beginPath();
	params.ctx.setLineDash([3, 3]);
	params.ctx.strokeStyle = params.theme.contrast;
	params.ctx.lineWidth = 1;
	params.ctx.strokeRect(
		Math.round(rect.left) + 0.5,
		Math.round(rect.top) + 0.5,
		Math.max(0, Math.round(rect.width)),
		Math.max(0, Math.round(rect.height)),
	);
	params.ctx.restore();
}

/*
 * Draw the fill handle dot at the bottom-right corner of the local selection,
 * preferring the multi-cell selection box over the single active cell.
 */
function drawSheetCanvasFillHandle(params: {
	activeCellRect?: SheetCanvasRect | null;
	columns: SheetColumnMetric[];
	ctx: CanvasRenderingContext2D;
	rowMetrics: SheetRowMetric[];
	scrollLeft: number;
	scrollTop: number;
	selectedCellKeyMap?: SheetUISelectedCellKeyMap | null;
	stickyColumnCount: number;
	theme: SheetCanvasTheme;
}) {
	const selectionBox = getGridSelectionBoxPosition({
		columnMetrics: params.columns,
		getColumnDisplayLeft: (metric) => {
			return getSheetCanvasColumnDisplayLeft(metric, params.scrollLeft, params.stickyColumnCount) - SHEET_ROW_NUMBER_WIDTH;
		},
		getRowDisplayTop: (metric) => {
			return metric.top - params.scrollTop;
		},
		rowMetrics: params.rowMetrics,
		selectedCellKeyMap: params.selectedCellKeyMap,
		stickyHeaderHeight: SHEET_HEADER_HEIGHT,
	});
	const cornerRect = selectionBox || params.activeCellRect;

	if (!cornerRect) {
		return;
	}

	const size = SHEET_CANVAS_FILL_HANDLE_SIZE;
	const left = Math.round(cornerRect.left + cornerRect.width) - Math.ceil(size / 2);
	const top = Math.round(cornerRect.top + cornerRect.height) - Math.ceil(size / 2);

	// Background halo so the dot stays readable over cell content and borders
	params.ctx.fillStyle = params.theme.background;
	params.ctx.fillRect(left - 1, top - 1, size + 2, size + 2);
	params.ctx.fillStyle = params.theme.active;
	params.ctx.fillRect(left, top, size, size);
}

/*
 * Return the configured one-based end row for one generated Sheet region.
 */
function getSheetCanvasDataTableRegionEndRow(region: SheetRegionGQL) {
	const configuredEndRowIndex = Number(region.options?.endRowIndex || 0);
	const startRowIndex = Number(region.startRowIndex || 0);

	if (Number.isFinite(configuredEndRowIndex) && configuredEndRowIndex >= startRowIndex) {
		return configuredEndRowIndex;
	}

	return startRowIndex + SHEET_DATA_TABLE_REGION_MAX_ROWS - 1;
}

/*
 * Return whether one Sheet region is backed by a generated source.
 */
function isSheetCanvasGeneratedRegion(region?: SheetRegionGQL | null) {
	return Boolean(region?.type === 'DATA_TABLE' && isSheetGeneratedRegionSource(region.source));
}

/*
 * Return whether one rendered Sheet cell belongs to a generated Sheet region.
 */
function isSheetCanvasDataTableRegionCell(cell?: SheetCanvasCell | null, regions?: SheetRegionGQL[] | null) {
	if (cell?.cell?.sourceType !== 'REGION_GENERATED') {
		return false;
	}

	const regionId = String(cell.cell.region?.regionId || cell.cell.regionId || '');
	if (!regionId || !cell.cell.region?.sourceRowId || !cell.cell.region?.sourceCellKey) {
		return false;
	}

	return (regions || []).some((region) => {
		return String(region.id || '') === regionId &&
			isSheetCanvasGeneratedRegion(region);
	});
}

/*
 * Return the generated Sheet region that contains one Sheet row and column index.
 */
function getSheetCanvasDataTableRegionAtCell(rowIndex: number, columnIndex: number, regions?: SheetRegionGQL[] | null) {
	return (regions || []).find((region) => {
		if (!isSheetCanvasGeneratedRegion(region) || !region.columns?.length) {
			return false;
		}

		const startColumnIndex = Number(region.startColumnIndex || 0);
		const endColumnIndex = startColumnIndex + region.columns.length - 1;
		const startRowIndex = Number(region.startRowIndex || 0);
		const endRowIndex = getSheetCanvasDataTableRegionEndRow(region);

		return rowIndex >= startRowIndex &&
			rowIndex <= endRowIndex &&
			columnIndex >= startColumnIndex &&
			columnIndex <= endColumnIndex;
	}) || null;
}

/*
 * Return the source DataTable column key for one Sheet column inside a region.
 */
function getSheetCanvasDataTableRegionSourceCellKey(region: SheetRegionGQL, columnIndex: number) {
	const startColumnIndex = Number(region.startColumnIndex || 0);
	const regionColumnIndex = columnIndex - startColumnIndex;

	return region.columns?.[regionColumnIndex]?.sourceCellKey || '';
}

/*
 * Return the visible column-top cell rectangle and source key for one Sheet region column tag target.
 */
function getSheetCanvasRegionColumnTagTarget(params: {
	cellState?: SheetUISelectedCellState | null;
	columns: SheetColumnMetric[];
	regions?: SheetRegionGQL[] | null;
	rowMetrics: SheetRowMetric[];
	scrollLeft: number;
	scrollTop: number;
	stickyColumnCount: number;
	viewportHeight: number;
	viewportWidth: number;
}): SheetCanvasRegionColumnTagTarget | null {
	const rowIndex = getSheetCanvasRowIndexFromId(params.cellState?.rowId);
	const columnIndex = getSheetCanvasColumnIndexFromKey(params.cellState?.cellKey);

	if (!rowIndex || !columnIndex) {
		return null;
	}

	const region = getSheetCanvasDataTableRegionAtCell(rowIndex, columnIndex, params.regions);
	const sourceCellKey = region ? getSheetCanvasDataTableRegionSourceCellKey(region, columnIndex) : '';
	const regionStartRowIndex = Number(region?.startRowIndex || 0);
	const columnMetric = params.columns.find((metric) => Number(metric.column.key || 0) === columnIndex);
	const rowMetric = params.rowMetrics.find((metric) => Number(metric.rowKey || 0) === regionStartRowIndex);

	if (!region || !sourceCellKey || !columnMetric || !rowMetric) {
		return null;
	}

	const rect = {
		height: rowMetric.height,
		left: getSheetCanvasColumnDisplayLeft(columnMetric, params.scrollLeft, params.stickyColumnCount),
		top: getSheetCanvasRowDisplayTop(rowMetric, params.scrollTop),
		width: columnMetric.width,
	};

	if (!sheetCanvasRectIsVisible(rect, params.viewportWidth, params.viewportHeight)) {
		return null;
	}

	return {
		rect,
		sourceCellKey,
	};
}

/*
 * Return whether one selected coordinate is an empty slot inside a generated region.
 */
function isSheetCanvasEmptyDataTableRegionCell(params: {
	cell?: SheetCanvasCell | null;
	columnIndex: number;
	regions?: SheetRegionGQL[] | null;
	rowIndex: number;
}) {
	return Boolean(
		getSheetCanvasDataTableRegionAtCell(params.rowIndex, params.columnIndex, params.regions) &&
		!isSheetCanvasDataTableRegionCell(params.cell, params.regions),
	);
}

/*
 * Return the selected fill color and opacity for one Sheet canvas cell.
 */
function getSheetCanvasSelectedCellFillStyle(params: {
	cell?: SheetCanvasCell | null;
	columnIndex: number;
	regions?: SheetRegionGQL[] | null;
	rowIndex: number;
	theme: SheetCanvasTheme;
}) {
	if (isSheetCanvasEmptyDataTableRegionCell(params)) {
		return {
			color: params.theme.selectionFill,
			opacity: SHEET_CANVAS_SELECTION_ALPHA,
			stripe: true,
		};
	}

	return {
		color: params.theme.selectionFill,
		opacity: SHEET_CANVAS_SELECTION_ALPHA,
		stripe: false,
	};
}

/*
 * Return the active border color for one selected Sheet canvas cell.
 */
function getSheetCanvasActiveBorderColor(params: {
	cell?: SheetCanvasCell | null;
	columnIndex: number;
	regions?: SheetRegionGQL[] | null;
	rowIndex: number;
	theme: SheetCanvasTheme;
}) {
	if (!isSheetCanvasDataTableRegionCell(params.cell, params.regions)) {
		return params.theme.active;
	}

	return params.cell?.dataTableDisplay?.canEdit ? params.theme.main : params.theme.contrast;
}

/*
 * Return whether the current selection intersects one generated region.
 */
function isSheetCanvasDataTableRegionSelected(params: {
	region: SheetRegionGQL;
	selectedCellKeyMap?: SheetUISelectedCellKeyMap | null;
	selectedCellState?: SheetUISelectedCellState | null;
}) {
	const {
		region,
		selectedCellKeyMap: initialSelectedCellKeyMap,
		selectedCellState,
	} = params;
	let selectedCellKeyMap = initialSelectedCellKeyMap;

	if (!selectedCellKeyMap && selectedCellState?.rowId && selectedCellState?.cellKey) {
		selectedCellKeyMap = {
			[getSheetCellKey(selectedCellState.rowId, selectedCellState.cellKey)]: true,
		};
	}

	if (!selectedCellKeyMap) {
		return false;
	}

	const startColumnIndex = Number(region.startColumnIndex || 0);
	const endColumnIndex = startColumnIndex + Math.max(0, region.columns?.length || 0) - 1;
	const startRowIndex = Number(region.startRowIndex || 0);
	const endRowIndex = getSheetCanvasDataTableRegionEndRow(region);

	for (const mapKey in selectedCellKeyMap) {
		if (!selectedCellKeyMap[mapKey]) {
			continue;
		}

		const [rowId, cellKey] = mapKey.split(':');
		const selectedRowIndex = getSheetCanvasRowIndexFromId(rowId);
		const selectedColumnIndex = getSheetCanvasColumnIndexFromKey(cellKey);

		if (!selectedRowIndex || !selectedColumnIndex) {
			continue;
		}

		if (
			selectedRowIndex >= startRowIndex &&
			selectedRowIndex <= endRowIndex &&
			selectedColumnIndex >= startColumnIndex &&
			selectedColumnIndex <= endColumnIndex
		) {
			return true;
		}
	}

	return false;
}

/*
 * Run a callback for every visible generated region whose hover or selection outline is active.
 */
function forEachVisibleSheetCanvasDataTableRegionRect(params: {
	columns: SheetColumnMetric[];
	hoveredRegionId?: string | null;
	onRegionRect: (rect: SheetCanvasRegionRect) => void;
	selectedCellKeyMap?: SheetUISelectedCellKeyMap | null;
	selectedCellState?: SheetUISelectedCellState | null;
	regions?: SheetRegionGQL[] | null;
	rowMetrics: SheetRowMetric[];
	scrollLeft: number;
	scrollTop: number;
	stickyColumnCount: number;
	viewportHeight: number;
	viewportWidth: number;
}) {
	(params.regions || []).forEach((region) => {
		if (!isSheetCanvasGeneratedRegion(region) || !region.columns?.length) {
			return;
		}

		const regionId = String(region.id || '');
		const isHovered = Boolean(regionId && params.hoveredRegionId === regionId);
		const isSelected = isSheetCanvasDataTableRegionSelected({
			region,
			selectedCellKeyMap: params.selectedCellKeyMap,
			selectedCellState: params.selectedCellState,
		});

		if (!isHovered && !isSelected) {
			return;
		}

		const startColumnIndex = Number(region.startColumnIndex || 0);
		const endColumnIndex = startColumnIndex + region.columns.length - 1;
		const startRowIndex = Number(region.startRowIndex || 0);
		const endRowIndex = getSheetCanvasDataTableRegionEndRow(region);
		const regionColumns = params.columns.filter((metric) => {
			const columnIndex = Number(metric.column.key || 0);

			return columnIndex >= startColumnIndex && columnIndex <= endColumnIndex;
		});
		const regionRows = params.rowMetrics.filter((metric) => {
			const rowIndex = Number(metric.rowKey || 0);

			return rowIndex >= startRowIndex && rowIndex <= endRowIndex;
		});
		const firstColumn = regionColumns[0];
		const lastColumn = regionColumns[regionColumns.length - 1];
		const firstRow = regionRows[0];
		const lastRow = regionRows[regionRows.length - 1];

		if (!firstColumn || !lastColumn || !firstRow || !lastRow) {
			return;
		}

		const left = getSheetCanvasColumnDisplayLeft(firstColumn, params.scrollLeft, params.stickyColumnCount);
		const right = getSheetCanvasColumnDisplayLeft(lastColumn, params.scrollLeft, params.stickyColumnCount) + lastColumn.width;
		const top = getSheetCanvasRowDisplayTop(firstRow, params.scrollTop);
		const bottom = getSheetCanvasRowDisplayTop(lastRow, params.scrollTop) + lastRow.height;
		const rect = {
			height: bottom - top,
			left,
			top,
			width: right - left,
		};

		if (!sheetCanvasRectIsVisible(rect, params.viewportWidth, params.viewportHeight)) {
			return;
		}

		params.onRegionRect({
			...rect,
			region,
		});
	});
}

/*
 * Draw dashed outlines around visible DataTable-populated Sheet regions.
 */
function drawSheetCanvasDataTableRegionOutlines(params: {
	columns: SheetColumnMetric[];
	ctx: CanvasRenderingContext2D;
	hoveredRegionId?: string | null;
	selectedCellKeyMap?: SheetUISelectedCellKeyMap | null;
	selectedCellState?: SheetUISelectedCellState | null;
	regions?: SheetRegionGQL[] | null;
	rowMetrics: SheetRowMetric[];
	scrollLeft: number;
	scrollTop: number;
	stickyColumnCount: number;
	theme: SheetCanvasTheme;
	viewportHeight: number;
	viewportWidth: number;
}) {
	forEachVisibleSheetCanvasDataTableRegionRect({
		columns: params.columns,
		hoveredRegionId: params.hoveredRegionId,
		onRegionRect: (rect) => {
			params.ctx.save();
			params.ctx.beginPath();
			params.ctx.setLineDash([6, 4]);
			params.ctx.strokeStyle = params.theme.regionOutline;
			params.ctx.lineWidth = 1;
			params.ctx.strokeRect(
				Math.round(rect.left) + 0.5,
				Math.round(rect.top) + 0.5,
				Math.max(0, Math.round(rect.width)),
				Math.max(0, Math.round(rect.height)),
			);
			params.ctx.restore();
		},
		regions: params.regions,
		selectedCellKeyMap: params.selectedCellKeyMap,
		selectedCellState: params.selectedCellState,
		rowMetrics: params.rowMetrics,
		scrollLeft: params.scrollLeft,
		scrollTop: params.scrollTop,
		stickyColumnCount: params.stickyColumnCount,
		viewportHeight: params.viewportHeight,
		viewportWidth: params.viewportWidth,
	});
}

/*
 * Draw the DataTable name tags for visible DataTable-populated Sheet region outlines.
 */
function drawSheetCanvasDataTableRegionLabels(params: {
	columns: SheetColumnMetric[];
	ctx: CanvasRenderingContext2D;
	hoveredRegionId?: string | null;
	regionDataTableLabelsById?: Map<string, string> | null;
	selectedCellKeyMap?: SheetUISelectedCellKeyMap | null;
	selectedCellState?: SheetUISelectedCellState | null;
	regions?: SheetRegionGQL[] | null;
	rowMetrics: SheetRowMetric[];
	scrollLeft: number;
	scrollTop: number;
	stickyColumnCount: number;
	theme: SheetCanvasTheme;
	viewportHeight: number;
	viewportWidth: number;
}) {
	const clipRect = getSheetCanvasBodyClipRect(params.viewportWidth, params.viewportHeight);

	forEachVisibleSheetCanvasDataTableRegionRect({
		columns: params.columns,
		hoveredRegionId: params.hoveredRegionId,
		onRegionRect: (rect) => {
			const sourceId = getSheetRegionSourceId(rect.region.source);
			const dataTableLabel = sourceId ? params.regionDataTableLabelsById?.get(sourceId) : null;
			if (dataTableLabel) {
				drawSheetCanvasTag({
					backgroundColor: params.theme.background,
					borderColor: params.theme.bodyText,
					clipRect,
					ctx: params.ctx,
					heightOffset: -1,
					left: rect.left,
					text: dataTableLabel,
					textColor: params.theme.bodyText,
					theme: params.theme,
					top: rect.top - getSheetCanvasTagHeight(params.theme) + 2,
					viewportHeight: params.viewportHeight,
					viewportWidth: params.viewportWidth,
				});
			}
		},
		regions: params.regions,
		selectedCellKeyMap: params.selectedCellKeyMap,
		selectedCellState: params.selectedCellState,
		rowMetrics: params.rowMetrics,
		scrollLeft: params.scrollLeft,
		scrollTop: params.scrollTop,
		stickyColumnCount: params.stickyColumnCount,
		viewportHeight: params.viewportHeight,
		viewportWidth: params.viewportWidth,
	});
}

/*
 * Draw the source column key tag for the hovered or selected generated region cell.
 */
function drawSheetCanvasDataTableRegionColumnKeyLabel(params: {
	columns: SheetColumnMetric[];
	ctx: CanvasRenderingContext2D;
	hoveredCellState?: SheetUISelectedCellState | null;
	regions?: SheetRegionGQL[] | null;
	rowMetrics: SheetRowMetric[];
	scrollLeft: number;
	scrollTop: number;
	selectedCellState?: SheetUISelectedCellState | null;
	stickyColumnCount: number;
	theme: SheetCanvasTheme;
	viewportHeight: number;
	viewportWidth: number;
}) {
	const target = getSheetCanvasRegionColumnTagTarget({
		cellState: params.hoveredCellState,
		columns: params.columns,
		regions: params.regions,
		rowMetrics: params.rowMetrics,
		scrollLeft: params.scrollLeft,
		scrollTop: params.scrollTop,
		stickyColumnCount: params.stickyColumnCount,
		viewportHeight: params.viewportHeight,
		viewportWidth: params.viewportWidth,
	}) || getSheetCanvasRegionColumnTagTarget({
		cellState: params.selectedCellState,
		columns: params.columns,
		regions: params.regions,
		rowMetrics: params.rowMetrics,
		scrollLeft: params.scrollLeft,
		scrollTop: params.scrollTop,
		stickyColumnCount: params.stickyColumnCount,
		viewportHeight: params.viewportHeight,
		viewportWidth: params.viewportWidth,
	});

	if (!target) {
		return;
	}

	const clipRect = getSheetCanvasBodyClipRect(params.viewportWidth, params.viewportHeight);

	drawSheetCanvasTag({
		align: 'right',
		backgroundColor: params.theme.regionOutline,
		clipRect,
		ctx: params.ctx,
		heightOffset: -1,
		left: target.rect.left + target.rect.width,
		text: target.sourceCellKey,
		textColor: params.theme.solid,
		theme: params.theme,
		top: target.rect.top - getSheetCanvasTagHeight(params.theme) + 2,
		viewportHeight: params.viewportHeight,
		viewportWidth: params.viewportWidth,
	});
}

/*
 * Draw one visible sheet body cell.
 */
function drawSheetCanvasCell(params: {
	cell?: SheetCanvasCell;
	ctx: CanvasRenderingContext2D;
	height: number;
	isSelected: boolean;
	selectedFillColor?: string;
	selectedFillOpacity?: number;
	selectedFillStripe?: boolean;
	suppressText?: boolean;
	theme: SheetCanvasTheme;
	width: number;
	x: number;
	y: number;
}) {
	const backgroundColor = params.cell?.style
		? getSheetCanvasResolvedStyleColor(params.theme, getSheetCanvasStyleColor(params.cell.style, 'fillColor'))
		: null;
	const textColor = params.cell?.style
		? getSheetCanvasResolvedStyleColor(params.theme, getSheetCanvasStyleColor(params.cell.style, 'textColor'))
		: null;
	const textStyle = getSheetCanvasCellTextStyle(params.cell?.style);
	const fontSize = getSheetCanvasCellFontSize(params.cell?.style, params.theme);
	const lineHeight = getSheetCanvasCellLineHeightPx(params.cell?.style, params.theme);
	const fontFamily = getSheetCanvasCellTextFontFamily(textStyle, params.theme);

	if (backgroundColor) {
		drawSheetCanvasCellFillRect({
			ctx: params.ctx,
			color: backgroundColor,
			height: params.height,
			left: params.x,
			top: params.y,
			width: params.width,
		});
	}

	if (params.isSelected) {
		params.ctx.save();
		params.ctx.globalAlpha = params.selectedFillOpacity ?? SHEET_CANVAS_SELECTION_ALPHA;
		drawSheetCanvasCellFillRect({
			ctx: params.ctx,
			color: params.selectedFillColor || params.theme.selectionFill,
			height: params.height,
			left: params.x,
			top: params.y,
			width: params.width,
		});
		params.ctx.restore();

		if (params.selectedFillStripe) {
			drawSheetCanvasUnavailableSelectionStripeRect({
				ctx: params.ctx,
				height: params.height,
				left: params.x,
				theme: params.theme,
				top: params.y,
				width: params.width,
			});
		}
	}

	if (params.suppressText) {
		return;
	}

	const contentOpacity = params.cell?.formulaLoading ? 0.5 : 1;

	if (params.cell?.dataTableDisplay) {
		params.ctx.save();
		params.ctx.globalAlpha *= contentOpacity;
		drawSheetCanvasDataTableDisplay({
			cell: params.cell,
			color: textColor || params.theme.bodyText,
			ctx: params.ctx,
			fontFamily,
			fontSize,
			height: params.height,
			italic: textStyle.italic,
			lineHeight,
			strikethrough: textStyle.strikethrough,
			theme: params.theme,
			underline: textStyle.underline,
			width: params.width,
			x: params.x,
			y: params.y,
		});
		params.ctx.restore();
		return;
	}

	params.ctx.save();
	params.ctx.globalAlpha *= contentOpacity;
	if (params.cell?.style?.disableMarkdown === true) {
		drawSheetCanvasText({
			color: textColor || params.theme.bodyText,
			ctx: params.ctx,
			fontFamily,
			fontSize,
			height: params.height,
			italic: textStyle.italic,
			lineHeight,
			strikethrough: textStyle.strikethrough,
			text: params.cell?.displayValue || '',
			theme: params.theme,
			underline: textStyle.underline,
			width: params.width,
			wrap: true,
			x: params.x,
			y: params.y,
		});
	} else {
		drawSheetCanvasMarkdownText({
			color: textColor || params.theme.bodyText,
			ctx: params.ctx,
			fontFamily,
			fontSize,
			height: params.height,
			lineHeight,
			textStyle,
			text: params.cell?.displayValue || '',
			theme: params.theme,
			width: params.width,
			x: params.x,
			y: params.y,
		});
	}
	params.ctx.restore();
}

/*
 * Return the merged range covering one rendered cell, or null. Covered cells
 * (anchor included) skip the normal painters; the merge pass draws them.
 */
function getSheetCanvasMergeForRenderCell(
	mergedRanges: SheetMergedRangeObj[] | null | undefined,
	rowKey: string,
	cellKey: string,
) {
	if (!mergedRanges?.length) {
		return null;
	}

	const rowIndex = Math.floor(Number(rowKey || 0));
	const columnIndex = Math.floor(Number(cellKey || 0));
	if (!rowIndex || !columnIndex) {
		return null;
	}

	return getSheetMergedRangeAtCell(mergedRanges, rowIndex, columnIndex);
}

/*
 * Draw one visible body cell, optionally suppressing selection decoration for overlay panes.
 */
function drawSheetCanvasBodyCell(params: {
	cellLookup: Map<string, SheetCanvasCell>;
	columnRect: SheetCanvasColumnRect;
	ctx: CanvasRenderingContext2D;
	rowRect: SheetCanvasRowRect;
	selectedCellKeyMap?: SheetUISelectedCellKeyMap | null;
	selectedCellState?: SheetUISelectedCellState | null;
	regions?: SheetRegionGQL[] | null;
	suppressSelection?: boolean;
	theme: SheetCanvasTheme;
}) {
	const rect = {
		height: params.rowRect.height,
		left: params.columnRect.left,
		top: params.rowRect.top,
		width: params.columnRect.width,
	};
	const renderKey = getSheetCellKey(params.rowRect.metric.rowKey, params.columnRect.cellKey);
	const cell = params.cellLookup.get(renderKey);
	const isActive = params.selectedCellState?.rowId === params.rowRect.metric.rowKey &&
		params.selectedCellState.cellKey === params.columnRect.cellKey;
	const isSelected = !params.suppressSelection && Boolean(params.selectedCellKeyMap?.[renderKey] || isActive);
	const suppressText = sheetCanvasCellTextExceedsWidth({
		cell,
		ctx: params.ctx,
		theme: params.theme,
		width: rect.width,
	});
	const selectedFillStyle = isSelected
		? getSheetCanvasSelectedCellFillStyle({
			cell,
			columnIndex: Number(params.columnRect.cellKey || 0),
			regions: params.regions,
			rowIndex: Number(params.rowRect.metric.rowKey || 0),
			theme: params.theme,
		})
		: null;

	if (params.suppressSelection) {
		params.ctx.fillStyle = params.theme.background;
		params.ctx.fillRect(
			Math.round(rect.left),
			Math.round(rect.top),
			Math.max(0, Math.round(rect.width) + SHEET_CANVAS_GRID_LINE_WIDTH),
			Math.max(0, Math.round(rect.height) + SHEET_CANVAS_GRID_LINE_WIDTH),
		);
	}

	drawSheetCanvasCell({
		cell,
		ctx: params.ctx,
		height: rect.height,
		isSelected,
		selectedFillColor: selectedFillStyle?.color,
		selectedFillOpacity: selectedFillStyle?.opacity,
		selectedFillStripe: selectedFillStyle?.stripe,
		suppressText,
		theme: params.theme,
		width: rect.width,
		x: rect.left,
		y: rect.top,
	});

	return {
		isActive,
		rect,
	};
}

/*
 * Draw the visible body cells and return the current active cell rectangle.
 */
function drawSheetCanvasBodyCells(params: {
	cellLookup: Map<string, SheetCanvasCell>;
	columnRects: SheetCanvasColumnRect[];
	ctx: CanvasRenderingContext2D;
	mergedRanges?: SheetMergedRangeObj[] | null;
	rowRects: SheetCanvasRowRect[];
	selectedCellKeyMap?: SheetUISelectedCellKeyMap | null;
	selectedCellState?: SheetUISelectedCellState | null;
	regions?: SheetRegionGQL[] | null;
	theme: SheetCanvasTheme;
}): SheetCanvasRect | null {
	let activeCellRect: SheetCanvasRect | null = null;

	params.rowRects.forEach((rowRect) => {
		params.columnRects.forEach((columnRect) => {
			if (getSheetCanvasMergeForRenderCell(params.mergedRanges, rowRect.metric.rowKey, columnRect.cellKey)) {
				return;
			}

			const result = drawSheetCanvasBodyCell({
				cellLookup: params.cellLookup,
				columnRect,
				ctx: params.ctx,
				rowRect,
				selectedCellKeyMap: params.selectedCellKeyMap,
				selectedCellState: params.selectedCellState,
				regions: params.regions,
				theme: params.theme,
			});

			if (result.isActive) {
				activeCellRect = result.rect;
			}
		});
	});

	return activeCellRect;
}

/*
 * Draw plain-text overflow above default grid lines while preserving grid hit targets.
 */
function drawSheetCanvasBodyTextOverflows(params: {
	cellLookup: Map<string, SheetCanvasCell>;
	columnRects: SheetCanvasColumnRect[];
	ctx: CanvasRenderingContext2D;
	mergedRanges?: SheetMergedRangeObj[] | null;
	rowRects: SheetCanvasRowRect[];
	theme: SheetCanvasTheme;
	viewportHeight: number;
	viewportWidth: number;
}) {
	const bodyWidth = Math.max(0, params.viewportWidth - SHEET_ROW_NUMBER_WIDTH);
	const bodyHeight = Math.max(0, params.viewportHeight - SHEET_HEADER_HEIGHT);

	if (!bodyWidth || !bodyHeight) {
		return;
	}

	params.ctx.save();
	params.ctx.beginPath();
	params.ctx.rect(SHEET_ROW_NUMBER_WIDTH, SHEET_HEADER_HEIGHT, bodyWidth, bodyHeight);
	params.ctx.clip();
	params.rowRects.forEach((rowRect) => {
		params.columnRects.forEach((columnRect) => {
			if (getSheetCanvasMergeForRenderCell(params.mergedRanges, rowRect.metric.rowKey, columnRect.cellKey)) {
				return;
			}

			const renderKey = getSheetCellKey(rowRect.metric.rowKey, columnRect.cellKey);
			const overflow = getSheetCanvasCellTextOverflow({
				cell: params.cellLookup.get(renderKey),
				cellLookup: params.cellLookup,
				columnRect,
				columnRects: params.columnRects,
				ctx: params.ctx,
				rowRect,
				theme: params.theme,
			});

			if (!overflow) {
				return;
			}

			drawSheetCanvasTextOverflow({
				ctx: params.ctx,
				overflow,
				theme: params.theme,
			});
		});
	});
	params.ctx.restore();
}

/*
 * Draw configured Sheet cell borders above the default grid lines.
 */
function drawSheetCanvasBodyCellBorders(params: {
	cellLookup: Map<string, SheetCanvasCell>;
	columnRects: SheetCanvasColumnRect[];
	ctx: CanvasRenderingContext2D;
	mergedRanges?: SheetMergedRangeObj[] | null;
	rowRects: SheetCanvasRowRect[];
	theme: SheetCanvasTheme;
	viewportHeight: number;
	viewportWidth: number;
}) {
	const renderedBorderLineKeys = new Set<string>();
	const bodyWidth = Math.max(0, params.viewportWidth - SHEET_ROW_NUMBER_WIDTH);
	const bodyHeight = Math.max(0, params.viewportHeight - SHEET_HEADER_HEIGHT);

	if (!bodyWidth || !bodyHeight) {
		return;
	}

	params.ctx.save();
	params.ctx.beginPath();
	params.ctx.rect(SHEET_ROW_NUMBER_WIDTH, SHEET_HEADER_HEIGHT, bodyWidth, bodyHeight);
	params.ctx.clip();
	params.rowRects.forEach((rowRect) => {
		params.columnRects.forEach((columnRect) => {
			if (getSheetCanvasMergeForRenderCell(params.mergedRanges, rowRect.metric.rowKey, columnRect.cellKey)) {
				return;
			}

			const renderKey = getSheetCellKey(rowRect.metric.rowKey, columnRect.cellKey);
			const cell = params.cellLookup.get(renderKey);

			if (!cell?.style) {
				return;
			}

			drawSheetCanvasCellBorders({
				cell,
				ctx: params.ctx,
				height: rowRect.height,
				renderedBorderLineKeys,
				theme: params.theme,
				width: columnRect.width,
				x: columnRect.left,
				y: rowRect.top,
			});
		});
	});
	params.ctx.restore();
}

/*
 * Repaint sticky Sheet panes above selection overlays and active-cell outlines.
 */
function drawSheetCanvasStickyBodyCells(params: {
	cellLookup: Map<string, SheetCanvasCell>;
	columnRects: SheetCanvasColumnRect[];
	ctx: CanvasRenderingContext2D;
	mergedRanges?: SheetMergedRangeObj[] | null;
	rowRects: SheetCanvasRowRect[];
	selectedCellKeyMap?: SheetUISelectedCellKeyMap | null;
	selectedCellState?: SheetUISelectedCellState | null;
	regions?: SheetRegionGQL[] | null;
	stickyColumnCount: number;
	stickyRowCount: number;
	theme: SheetCanvasTheme;
}) {
	if (!params.stickyColumnCount && !params.stickyRowCount) {
		return;
	}

	params.rowRects.forEach((rowRect) => {
		const isStickyRow = rowRect.metric.rowIndex < params.stickyRowCount;

		params.columnRects.forEach((columnRect) => {
			const isStickyColumn = columnRect.metric.columnIndex < params.stickyColumnCount;

			if (!isStickyColumn && !isStickyRow) {
				return;
			}

			if (getSheetCanvasMergeForRenderCell(params.mergedRanges, rowRect.metric.rowKey, columnRect.cellKey)) {
				return;
			}

			drawSheetCanvasBodyCell({
				cellLookup: params.cellLookup,
				columnRect,
				ctx: params.ctx,
				rowRect,
				selectedCellKeyMap: params.selectedCellKeyMap,
				selectedCellState: params.selectedCellState,
				regions: params.regions,
				suppressSelection: true,
				theme: params.theme,
			});
		});
	});
}

/*
 * Draw merged cell ranges as single anchor-driven cells. Runs after the grid
 * lines pass so interior dividers get erased; the merge boundary is
 * re-stroked so merged cells keep a crisp outline. Returns the merge rect of
 * the active selection when the selected cell sits inside a merge, so the
 * active border spans the whole merged area.
 */
function drawSheetCanvasMergedCells(params: {
	bodyClipRect: SheetCanvasRect;
	cellLookup: Map<string, SheetCanvasCell>;
	columns: SheetColumnMetric[];
	ctx: CanvasRenderingContext2D;
	mergedRanges?: SheetMergedRangeObj[] | null;
	regions?: SheetRegionGQL[] | null;
	rowMetrics: SheetRowMetric[];
	scrollLeft: number;
	scrollTop: number;
	selectedCellKeyMap?: SheetUISelectedCellKeyMap | null;
	selectedCellState?: SheetUISelectedCellState | null;
	stickyColumnCount: number;
	theme: SheetCanvasTheme;
	viewportHeight: number;
	viewportWidth: number;
}): SheetCanvasRect | null {
	if (!params.mergedRanges?.length) {
		return null;
	}

	const { ctx } = params;
	let activeMergeRect: SheetCanvasRect | null = null;

	const activeRowIndex = Math.floor(Number(params.selectedCellState?.rowId || 0));
	const activeColumnIndex = Math.floor(Number(params.selectedCellState?.cellKey || 0));
	const selectedCoords = Object.keys(params.selectedCellKeyMap || {}).map((key) => {
		const [rowPart, columnPart] = key.split(':');
		return [Math.floor(Number(rowPart)), Math.floor(Number(columnPart))] as const;
	});

	ctx.save();
	ctx.beginPath();
	ctx.rect(params.bodyClipRect.left, params.bodyClipRect.top, params.bodyClipRect.width, params.bodyClipRect.height);
	ctx.clip();

	params.mergedRanges.forEach((merge) => {
		const rect = getSheetCanvasIndexRangeRect({
			columns: params.columns,
			endColumnIndex: merge.endColumnIndex,
			endRowIndex: merge.endRowIndex,
			rowMetrics: params.rowMetrics,
			scrollLeft: params.scrollLeft,
			scrollTop: params.scrollTop,
			startColumnIndex: merge.startColumnIndex,
			startRowIndex: merge.startRowIndex,
			stickyColumnCount: params.stickyColumnCount,
		});

		if (!rect || !sheetCanvasRectIsVisible(rect, params.viewportWidth, params.viewportHeight)) {
			return;
		}

		const renderKey = getSheetCellKey(String(merge.startRowIndex), String(merge.startColumnIndex));
		const cell = params.cellLookup.get(renderKey);
		const isActive = Boolean(
			activeRowIndex && activeColumnIndex &&
				isSheetCellInMergedRange(merge, activeRowIndex, activeColumnIndex),
		);
		const isSelected = isActive ||
			selectedCoords.some(([rowIndex, columnIndex]) => isSheetCellInMergedRange(merge, rowIndex, columnIndex));
		const selectedFillStyle = isSelected
			? getSheetCanvasSelectedCellFillStyle({
				cell,
				columnIndex: merge.startColumnIndex,
				regions: params.regions,
				rowIndex: merge.startRowIndex,
				theme: params.theme,
			})
			: null;

		// Erase interior grid lines + stale content under the merge
		ctx.fillStyle = params.theme.background;
		ctx.fillRect(
			Math.round(rect.left),
			Math.round(rect.top),
			Math.max(0, Math.round(rect.width) + SHEET_CANVAS_GRID_LINE_WIDTH),
			Math.max(0, Math.round(rect.height) + SHEET_CANVAS_GRID_LINE_WIDTH),
		);

		drawSheetCanvasCell({
			cell,
			ctx,
			height: rect.height,
			isSelected,
			selectedFillColor: selectedFillStyle?.color,
			selectedFillOpacity: selectedFillStyle?.opacity,
			selectedFillStripe: selectedFillStyle?.stripe,
			suppressText: sheetCanvasCellTextExceedsWidth({
				cell,
				ctx,
				theme: params.theme,
				width: rect.width,
			}),
			theme: params.theme,
			width: rect.width,
			x: rect.left,
			y: rect.top,
		});

		// Crisp outer boundary in place of the erased grid lines
		ctx.save();
		ctx.strokeStyle = params.theme.grid;
		ctx.lineWidth = SHEET_CANVAS_GRID_LINE_WIDTH;
		ctx.strokeRect(
			Math.round(rect.left) + 0.5,
			Math.round(rect.top) + 0.5,
			Math.max(0, Math.round(rect.width)),
			Math.max(0, Math.round(rect.height)),
		);
		ctx.restore();

		if (isActive) {
			activeMergeRect = rect;
		}
	});

	ctx.restore();

	return activeMergeRect;
}

/*
 * Return whether one header selection contains the requested column header.
 */
function sheetCanvasHeaderSelectionHasColumn(selection: SheetHeaderSelectionState | null | undefined, cellKey: string) {
	return selection?.type === 'COLUMN' && selection.cellKeys.includes(cellKey);
}

/*
 * Return whether one header selection contains the requested row header.
 */
function sheetCanvasHeaderSelectionHasRow(selection: SheetHeaderSelectionState | null | undefined, rowId: string) {
	return selection?.type === 'ROW' && selection.rowIds.includes(rowId);
}

/*
 * Return quick row and column lookups represented by the active body-cell selection.
 */
function getSheetCanvasSelectedHeaderKeySets(params: {
	selectedCellKeyMap?: SheetUISelectedCellKeyMap | null;
	selectedCellState?: SheetUISelectedCellState | null;
}) {
	const columnKeys = new Set<string>();
	const rowIds = new Set<string>();

	if (params.selectedCellState) {
		columnKeys.add(params.selectedCellState.cellKey);
		rowIds.add(params.selectedCellState.rowId);
	}

	if (params.selectedCellKeyMap) {
		for (const key in params.selectedCellKeyMap) {
			if (!params.selectedCellKeyMap[key]) {
				continue;
			}

			const [rowId, cellKey] = key.split(':');

			if (rowId) {
				rowIds.add(rowId);
			}

			if (cellKey) {
				columnKeys.add(cellKey);
			}
		}
	}

	return {
		columnKeys,
		rowIds,
	};
}

/*
 * Return whether two ordered string lists contain the same values.
 */
function sheetCanvasStringArraysAreEqual(a?: string[] | null, b?: string[] | null) {
	if (a === b) {
		return true;
	}

	if (!a || !b || a.length !== b.length) {
		return false;
	}

	return a.every((value, index) => value === b[index]);
}

/*
 * Return whether two header selections describe the same highlighted headers.
 */
function sheetCanvasHeaderSelectionsAreEqual(a?: SheetHeaderSelectionState | null, b?: SheetHeaderSelectionState | null) {
	if (a === b) {
		return true;
	}

	if (!a || !b || a.type !== b.type) {
		return false;
	}

	if (a.type === 'COLUMN' && b.type === 'COLUMN') {
		return sheetCanvasStringArraysAreEqual(a.cellKeys, b.cellKeys);
	}

	if (a.type === 'ROW' && b.type === 'ROW') {
		return sheetCanvasStringArraysAreEqual(a.rowIds, b.rowIds);
	}

	return false;
}

/*
 * Draw sticky column and row headers for the canvas grid.
 */
function drawSheetCanvasHeaders(params: {
	columns: SheetColumnMetric[];
	ctx: CanvasRenderingContext2D;
	headerSelection?: SheetHeaderSelectionState | null;
	rowMetrics: SheetRowMetric[];
	scrollLeft: number;
	scrollTop: number;
	selectedCellKeyMap?: SheetUISelectedCellKeyMap | null;
	selectedCellState?: SheetUISelectedCellState | null;
	stickyColumnCount: number;
	theme: SheetCanvasTheme;
	viewportHeight: number;
	viewportWidth: number;
}) {
	const selectedHeaderKeys = params.headerSelection
		? {
			columnKeys: new Set<string>(),
			rowIds: new Set<string>(),
		}
		: getSheetCanvasSelectedHeaderKeySets({
			selectedCellKeyMap: params.selectedCellKeyMap,
			selectedCellState: params.selectedCellState,
		});

	drawSheetCanvasCellFillRect({
		ctx: params.ctx,
		color: params.theme.headerBackground,
		height: SHEET_HEADER_HEIGHT,
		left: 0,
		top: 0,
		width: params.viewportWidth,
	});
	drawSheetCanvasCellFillRect({
		ctx: params.ctx,
		color: params.theme.headerBackground,
		height: Math.max(0, params.viewportHeight - SHEET_HEADER_HEIGHT),
		left: 0,
		top: SHEET_HEADER_HEIGHT,
		width: SHEET_ROW_NUMBER_WIDTH,
	});

	params.columns.forEach((metric) => {
		const x = getSheetCanvasColumnDisplayLeft(metric, params.scrollLeft, params.stickyColumnCount);
		const rect = {
			height: SHEET_HEADER_HEIGHT,
			left: x,
			top: 0,
			width: metric.width,
		};

		if (!sheetCanvasRectIsVisible(rect, params.viewportWidth, SHEET_HEADER_HEIGHT)) {
			return;
		}

		const cellKey = getSheetCanvasHeaderColumnCellKey(metric);
		const headerSelected = sheetCanvasHeaderSelectionHasColumn(params.headerSelection, cellKey);
		const bodySelected = selectedHeaderKeys.columnKeys.has(cellKey);

		drawSheetCanvasCellFillRect({
			ctx: params.ctx,
			color: headerSelected ? params.theme.active : params.theme.headerBackground,
			height: rect.height,
			left: rect.left,
			top: rect.top,
			width: rect.width,
		});
		if (bodySelected) {
			params.ctx.save();
			params.ctx.globalAlpha = SHEET_CANVAS_SELECTION_ALPHA;
			drawSheetCanvasCellFillRect({
				ctx: params.ctx,
				color: params.theme.selectionFill,
				height: rect.height,
				left: rect.left,
				top: rect.top,
				width: rect.width,
			});
			params.ctx.restore();
		}
		drawSheetCanvasText({
			align: 'center',
			color: headerSelected ? params.theme.headerSelectedText : bodySelected ? params.theme.bodyText : params.theme.headerText,
			ctx: params.ctx,
			fontFamily: params.theme.fontFamilyMedium,
			fontSize: params.theme.headerFontSize,
			height: rect.height,
			text: metric.column.label,
			theme: params.theme,
			width: rect.width,
			x: rect.left,
			y: rect.top + 1,
		});
	});

	// Re-cover the top-left row number corner so horizontally scrolled column labels cannot show through.
	drawSheetCanvasCellFillRect({
		ctx: params.ctx,
		color: params.theme.headerBackground,
		height: SHEET_HEADER_HEIGHT,
		left: 0,
		top: 0,
		width: SHEET_ROW_NUMBER_WIDTH,
	});

	params.rowMetrics.forEach((metric) => {
		const y = getSheetCanvasRowDisplayTop(metric, params.scrollTop);
		const rect = {
			height: metric.height,
			left: 0,
			top: y,
			width: SHEET_ROW_NUMBER_WIDTH,
		};

		if (!sheetCanvasRectIsVisible(rect, SHEET_ROW_NUMBER_WIDTH, params.viewportHeight)) {
			return;
		}

		const headerSelected = sheetCanvasHeaderSelectionHasRow(params.headerSelection, metric.rowKey);
		const bodySelected = selectedHeaderKeys.rowIds.has(metric.rowKey);

		drawSheetCanvasCellFillRect({
			ctx: params.ctx,
			color: headerSelected ? params.theme.active : params.theme.headerBackground,
			height: rect.height,
			left: rect.left,
			top: rect.top,
			width: rect.width,
		});
		if (bodySelected) {
			params.ctx.save();
			params.ctx.globalAlpha = SHEET_CANVAS_SELECTION_ALPHA;
			drawSheetCanvasCellFillRect({
				ctx: params.ctx,
				color: params.theme.selectionFill,
				height: rect.height,
				left: rect.left,
				top: rect.top,
				width: rect.width,
			});
			params.ctx.restore();
		}
		drawSheetCanvasText({
			align: 'center',
			color: headerSelected ? params.theme.headerSelectedText : bodySelected ? params.theme.bodyText : params.theme.headerText,
			ctx: params.ctx,
			fontFamily: params.theme.fontFamilyMedium,
			fontSize: params.theme.headerFontSize,
			height: rect.height,
			text: String(metric.rowKey),
			theme: params.theme,
			width: rect.width,
			x: rect.left,
			y: rect.top + 1,
		});
	});
}

/*
 * Draw the top-left Sheet corner above every canvas layer.
 */
function drawSheetCanvasTopLeftCornerCover(params: {
	ctx: CanvasRenderingContext2D;
	theme: SheetCanvasTheme;
}) {
	params.ctx.fillStyle = params.theme.headerBackground;
	params.ctx.fillRect(
		0,
		SHEET_CANVAS_GRID_LINE_WIDTH,
		SHEET_ROW_NUMBER_WIDTH - SHEET_CANVAS_GRID_LINE_WIDTH,
		SHEET_HEADER_HEIGHT - SHEET_CANVAS_GRID_LINE_WIDTH,
	);
}

/*
 * Add one crisp vertical canvas line to a batched grid path.
 */
function addSheetCanvasVerticalGridLine(params: {
	bottom: number;
	ctx: CanvasRenderingContext2D;
	seen: Set<number>;
	top: number;
	x: number;
}) {
	const key = Math.round(params.x);
	const x = key + 0.5;
	const top = Math.round(params.top) + 0.5;
	const bottom = Math.round(params.bottom) + 0.5;

	if (params.seen.has(key) || bottom <= top) {
		return;
	}

	params.seen.add(key);
	params.ctx.moveTo(x, top);
	params.ctx.lineTo(x, bottom);
}

/*
 * Add one crisp horizontal canvas line to a batched grid path.
 */
function addSheetCanvasHorizontalGridLine(params: {
	ctx: CanvasRenderingContext2D;
	left: number;
	right: number;
	seen: Set<number>;
	y: number;
}) {
	const key = Math.round(params.y);
	const y = key + 0.5;
	const left = Math.round(params.left) + 0.5;
	const right = Math.round(params.right) + 0.5;

	if (params.seen.has(key) || right <= left) {
		return;
	}

	params.seen.add(key);
	params.ctx.moveTo(left, y);
	params.ctx.lineTo(right, y);
}

/*
 * Return the Sheet cell key represented by one rendered column metric.
 */
function getSheetCanvasHeaderColumnCellKey(metric?: SheetColumnMetric | null) {
	if (!metric) {
		return '';
	}

	const canvasColumn = metric.column as SheetCanvasColumn;
	return String(canvasColumn.sheetColumnIndex || metric.column.key);
}

/*
 * Fill a list of selected-header divider rectangles with one canvas-safe color.
 */
function fillSheetCanvasDividerRects(ctx: CanvasRenderingContext2D, color: string, rects: SheetCanvasDividerRect[]) {
	if (!rects.length) {
		return;
	}

	ctx.fillStyle = color;
	rects.forEach((rect) => {
		ctx.fillRect(
			Math.round(rect.left),
			Math.round(rect.top),
			Math.max(0, Math.round(rect.width)),
			Math.max(0, Math.round(rect.height)),
		);
	});
}

/*
 * Draw selected-header dividers with hover lines inside the selection and primary lines on outer edges.
 */
function drawSheetCanvasSelectedHeaderGridLines(params: {
	columns: SheetColumnMetric[];
	ctx: CanvasRenderingContext2D;
	headerSelection?: SheetHeaderSelectionState | null;
	rowMetrics: SheetRowMetric[];
	scrollLeft: number;
	scrollTop: number;
	stickyColumnCount: number;
	theme: SheetCanvasTheme;
	viewportHeight: number;
	viewportWidth: number;
}) {
	if (!params.headerSelection) {
		return;
	}

	const primaryRects: SheetCanvasDividerRect[] = [];
	params.ctx.save();
	params.ctx.beginPath();
	params.ctx.strokeStyle = params.theme.headerSelectedDivider;
	params.ctx.lineWidth = SHEET_CANVAS_GRID_LINE_WIDTH;

	if (params.headerSelection.type === 'COLUMN') {
		const selectedCellKeys = new Set(params.headerSelection.cellKeys);
		const selectedColumnVerticalLines = new Set<number>();

		params.columns.forEach((metric, index) => {
			const cellKey = getSheetCanvasHeaderColumnCellKey(metric);

			if (!selectedCellKeys.has(cellKey)) {
				return;
			}

			const left = getSheetCanvasColumnDisplayLeft(metric, params.scrollLeft, params.stickyColumnCount);
			const right = left + metric.width;
			const rect = {
				height: SHEET_HEADER_HEIGHT,
				left,
				top: 0,
				width: metric.width,
			};

			if (!sheetCanvasRectIsVisible(rect, params.viewportWidth, SHEET_HEADER_HEIGHT)) {
				return;
			}

			[left, right].forEach((x) => {
				addSheetCanvasVerticalGridLine({
					bottom: SHEET_HEADER_HEIGHT,
					ctx: params.ctx,
					seen: selectedColumnVerticalLines,
					top: 0,
					x,
				});
			});
			const horizontalLines = new Set<number>();

			[0, SHEET_HEADER_HEIGHT].forEach((y) => {
				addSheetCanvasHorizontalGridLine({
					ctx: params.ctx,
					left,
					right,
					seen: horizontalLines,
					y,
				});
			});

			if (!selectedCellKeys.has(getSheetCanvasHeaderColumnCellKey(params.columns[index - 1]))) {
				primaryRects.push({
					height: SHEET_HEADER_HEIGHT,
					left,
					top: 0,
					width: SHEET_CANVAS_GRID_LINE_WIDTH,
				});
			}

			if (!selectedCellKeys.has(getSheetCanvasHeaderColumnCellKey(params.columns[index + 1]))) {
				primaryRects.push({
					height: SHEET_HEADER_HEIGHT,
					left: right,
					top: 0,
					width: SHEET_CANVAS_GRID_LINE_WIDTH,
				});
			}

			primaryRects.push(
				{ height: SHEET_CANVAS_GRID_LINE_WIDTH, left, top: 0, width: right - left },
				{ height: SHEET_CANVAS_GRID_LINE_WIDTH, left, top: SHEET_HEADER_HEIGHT, width: right - left },
			);
		});
	}

	if (params.headerSelection.type === 'ROW') {
		const selectedRowIds = new Set(params.headerSelection.rowIds);
		const selectedRowHorizontalLines = new Set<number>();

		params.rowMetrics.forEach((metric, index) => {
			if (!selectedRowIds.has(metric.rowKey)) {
				return;
			}

			const top = getSheetCanvasRowDisplayTop(metric, params.scrollTop);
			const bottom = top + metric.height;
			const rect = {
				height: metric.height,
				left: 0,
				top,
				width: SHEET_ROW_NUMBER_WIDTH,
			};

			if (!sheetCanvasRectIsVisible(rect, SHEET_ROW_NUMBER_WIDTH, params.viewportHeight)) {
				return;
			}

			const verticalLines = new Set<number>();

			[0, SHEET_ROW_NUMBER_WIDTH].forEach((x) => {
				addSheetCanvasVerticalGridLine({
					bottom,
					ctx: params.ctx,
					seen: verticalLines,
					top,
					x,
				});
			});
			[top, bottom].forEach((y) => {
				addSheetCanvasHorizontalGridLine({
					ctx: params.ctx,
					left: 0,
					right: SHEET_ROW_NUMBER_WIDTH,
					seen: selectedRowHorizontalLines,
					y,
				});
			});

			primaryRects.push(
				{ height: bottom - top, left: 0, top, width: SHEET_CANVAS_GRID_LINE_WIDTH },
				{ height: bottom - top, left: SHEET_ROW_NUMBER_WIDTH, top, width: SHEET_CANVAS_GRID_LINE_WIDTH },
			);

			if (!selectedRowIds.has(params.rowMetrics[index - 1]?.rowKey || '')) {
				primaryRects.push({
					height: SHEET_CANVAS_GRID_LINE_WIDTH,
					left: 0,
					top,
					width: SHEET_ROW_NUMBER_WIDTH,
				});
			}

			if (!selectedRowIds.has(params.rowMetrics[index + 1]?.rowKey || '')) {
				primaryRects.push({
					height: SHEET_CANVAS_GRID_LINE_WIDTH,
					left: 0,
					top: bottom,
					width: SHEET_ROW_NUMBER_WIDTH,
				});
			}
		});
	}

	params.ctx.stroke();
	fillSheetCanvasDividerRects(params.ctx, params.theme.active, primaryRects);
	params.ctx.restore();
}

/*
 * Draw shared 1px grid dividers once for the visible Sheet viewport.
 */
function drawSheetCanvasGridLines(params: {
	columns: SheetColumnMetric[];
	ctx: CanvasRenderingContext2D;
	gridRight: number;
	headerSelection?: SheetHeaderSelectionState | null;
	rowMetrics: SheetRowMetric[];
	scrollLeft: number;
	scrollTop: number;
	stickyColumnCount: number;
	theme: SheetCanvasTheme;
	viewportHeight: number;
	viewportWidth: number;
}) {
	const bodyHorizontalLines = new Set<number>();
	const bodyVerticalLines = new Set<number>();
	const fullHeightVerticalLines = new Set<number>();
	const fullWidthHorizontalLines = new Set<number>();
	const headerVerticalLines = new Set<number>();
	const rowHeaderHorizontalLines = new Set<number>();
	const bodyTop = SHEET_HEADER_HEIGHT;
	const bodyBottom = params.viewportHeight;
	const bodyLeft = SHEET_ROW_NUMBER_WIDTH;
	const bodyRight = Math.max(bodyLeft, Math.min(params.viewportWidth, params.gridRight));
	const headerDividerRight = bodyRight;

	params.ctx.beginPath();
	params.ctx.strokeStyle = params.theme.grid;
	params.ctx.lineWidth = SHEET_CANVAS_GRID_LINE_WIDTH;

	addSheetCanvasVerticalGridLine({
		bottom: params.viewportHeight,
		ctx: params.ctx,
		seen: fullHeightVerticalLines,
		top: 0,
		x: SHEET_ROW_NUMBER_WIDTH,
	});
	addSheetCanvasHorizontalGridLine({
		ctx: params.ctx,
		left: 0,
		right: headerDividerRight,
		seen: fullWidthHorizontalLines,
		y: SHEET_HEADER_HEIGHT,
	});

	params.columns.forEach((metric) => {
		const left = getSheetCanvasColumnDisplayLeft(metric, params.scrollLeft, params.stickyColumnCount);
		const right = left + metric.width;
		const visible = right >= bodyLeft && left <= params.viewportWidth;

		if (!visible) {
			return;
		}

		[left, right].forEach((x) => {
			if (x <= bodyLeft || x > params.viewportWidth) {
				return;
			}

			addSheetCanvasVerticalGridLine({
				bottom: SHEET_HEADER_HEIGHT,
				ctx: params.ctx,
				seen: headerVerticalLines,
				top: 0,
				x,
			});
			addSheetCanvasVerticalGridLine({
				bottom: bodyBottom,
				ctx: params.ctx,
				seen: bodyVerticalLines,
				top: bodyTop,
				x,
			});
		});
	});

	params.rowMetrics.forEach((metric) => {
		const top = getSheetCanvasRowDisplayTop(metric, params.scrollTop);
		const bottom = top + metric.height;
		const visible = bottom >= SHEET_HEADER_HEIGHT && top <= params.viewportHeight;

		if (!visible) {
			return;
		}

		[top, bottom].forEach((y) => {
			if (y <= SHEET_HEADER_HEIGHT || y > params.viewportHeight) {
				return;
			}

			addSheetCanvasHorizontalGridLine({
				ctx: params.ctx,
				left: 0,
				right: SHEET_ROW_NUMBER_WIDTH,
				seen: rowHeaderHorizontalLines,
				y,
			});
			addSheetCanvasHorizontalGridLine({
				ctx: params.ctx,
				left: bodyLeft,
				right: bodyRight,
				seen: bodyHorizontalLines,
				y,
			});
		});
	});

	params.ctx.stroke();

	params.ctx.beginPath();
	params.ctx.strokeStyle = params.theme.sheetTopDivider;
	params.ctx.lineWidth = SHEET_CANVAS_GRID_LINE_WIDTH;
	addSheetCanvasHorizontalGridLine({
		ctx: params.ctx,
		left: 0,
		right: params.viewportWidth,
		seen: fullWidthHorizontalLines,
		y: 0,
	});
	params.ctx.stroke();

	drawSheetCanvasSelectedHeaderGridLines({
		columns: params.columns,
		ctx: params.ctx,
		headerSelection: params.headerSelection,
		rowMetrics: params.rowMetrics,
		scrollLeft: params.scrollLeft,
		scrollTop: params.scrollTop,
		stickyColumnCount: params.stickyColumnCount,
		theme: params.theme,
		viewportHeight: params.viewportHeight,
		viewportWidth: params.viewportWidth,
	});
}

/*
 * Fill the non-selectable area to the right of the Sheet grid.
 */
function drawSheetCanvasRightPaddingArea(params: {
	ctx: CanvasRenderingContext2D;
	gridRight: number;
	theme: SheetCanvasTheme;
	viewportHeight: number;
	viewportWidth: number;
}) {
	const left = Math.max(SHEET_ROW_NUMBER_WIDTH, Math.min(params.viewportWidth, Math.round(params.gridRight) + 1));
	const width = Math.max(0, params.viewportWidth - left);

	if (!width) {
		return;
	}

	params.ctx.fillStyle = params.theme.headerBackground;
	params.ctx.fillRect(left, 0, width, params.viewportHeight);
}

/*
 * Draw the canvas sheet body, headers, and interaction guides.
 */
function drawSheetCanvasSurface(canvas: HTMLCanvasElement, p: SheetCanvasSurfaceProps) {
	const dpr = Math.max(1, globalThis.window?.devicePixelRatio || 1);
	const viewportWidth = Math.max(1, Math.floor(p.viewportWidth || canvas.clientWidth || 1));
	const viewportHeight = Math.max(1, Math.floor(p.viewportHeight || canvas.clientHeight || 1));
	const nextWidth = Math.max(1, Math.floor(viewportWidth * dpr));
	const nextHeight = Math.max(1, Math.floor(viewportHeight * dpr));

	if (canvas.width !== nextWidth) {
		canvas.width = nextWidth;
	}

	if (canvas.height !== nextHeight) {
		canvas.height = nextHeight;
	}

	canvas.style.width = `${viewportWidth}px`;
	canvas.style.height = `${viewportHeight}px`;

	const ctx = canvas.getContext('2d');
	if (!ctx) {
		return;
	}

	const theme = getSheetCanvasTheme(canvas);
	const stickyColumnCount = Math.max(0, p.stickyColumnCount || 0);
	const stickyRowCount = Math.max(0, p.stickyRowCount || 0);
	const gridRight = getSheetCanvasGridDisplayRight(p.columns, p.scrollLeft, stickyColumnCount);
	const bodyClipRect = getSheetCanvasBodyClipRect(viewportWidth, viewportHeight);
	const visibleColumnRects = getSheetCanvasVisibleColumnRects({
		columns: p.columns,
		scrollLeft: p.scrollLeft,
		stickyColumnCount,
		viewportHeight,
		viewportWidth,
	});
	const visibleRowRects = getSheetCanvasVisibleRowRects({
		rowMetrics: p.rowMetrics,
		scrollTop: p.scrollTop,
		viewportHeight,
		viewportWidth,
	});
	ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
	ctx.clearRect(0, 0, viewportWidth, viewportHeight);
	ctx.fillStyle = theme.background;
	ctx.fillRect(0, 0, viewportWidth, viewportHeight);

	ctx.save();
	ctx.beginPath();
	ctx.rect(SHEET_ROW_NUMBER_WIDTH, SHEET_HEADER_HEIGHT, Math.max(0, viewportWidth - SHEET_ROW_NUMBER_WIDTH), Math.max(0, viewportHeight - SHEET_HEADER_HEIGHT));
	ctx.clip();

	const activeCellRect = drawSheetCanvasBodyCells({
		cellLookup: p.cellLookup,
		columnRects: visibleColumnRects,
		ctx,
		mergedRanges: p.mergedRanges,
		rowRects: visibleRowRects,
		selectedCellKeyMap: p.selectedCellKeyMap,
		selectedCellState: p.selectedCellState,
		regions: p.regions,
		theme,
	});

	ctx.restore();

	drawSheetCanvasRightPaddingArea({
		ctx,
		gridRight,
		theme,
		viewportHeight,
		viewportWidth,
	});
	drawSheetCanvasDataTableRegionOutlines({
		columns: p.columns,
		ctx,
		hoveredRegionId: p.hoveredRegionId,
		regions: p.regions,
		selectedCellKeyMap: p.selectedCellKeyMap,
		selectedCellState: p.selectedCellState,
		rowMetrics: p.rowMetrics,
		scrollLeft: p.scrollLeft,
		scrollTop: p.scrollTop,
		stickyColumnCount,
		theme,
		viewportHeight,
		viewportWidth,
	});
	drawSheetCanvasRemoteSelections({
		bodyClipRect,
		columns: p.columns,
		ctx,
		remoteSelections: p.remoteSelections,
		rowMetrics: p.rowMetrics,
		scrollLeft: p.scrollLeft,
		scrollTop: p.scrollTop,
		stickyColumnCount,
		theme,
		viewportHeight,
		viewportWidth,
	});
	drawSheetCanvasSelectionBorder({
		columns: p.columns,
		ctx,
		rowMetrics: p.rowMetrics,
		scrollLeft: p.scrollLeft,
		scrollTop: p.scrollTop,
		selectedCellKeyMap: p.selectedCellKeyMap,
		stickyColumnCount,
		theme,
		viewportHeight,
		viewportWidth,
	});

	drawSheetCanvasStickyBodyCells({
		cellLookup: p.cellLookup,
		columnRects: visibleColumnRects,
		ctx,
		mergedRanges: p.mergedRanges,
		rowRects: visibleRowRects,
		selectedCellKeyMap: p.selectedCellKeyMap,
		selectedCellState: p.selectedCellState,
		regions: p.regions,
		stickyColumnCount,
		stickyRowCount,
		theme,
	});
	drawSheetCanvasHeaders({
		columns: p.columns,
		ctx,
		headerSelection: p.headerSelection,
		rowMetrics: p.rowMetrics,
		scrollLeft: p.scrollLeft,
		scrollTop: p.scrollTop,
		selectedCellKeyMap: p.selectedCellKeyMap,
		selectedCellState: p.selectedCellState,
		stickyColumnCount,
		theme,
		viewportHeight,
		viewportWidth,
	});
	drawSheetCanvasGridLines({
		columns: p.columns,
		ctx,
		gridRight,
		headerSelection: p.headerSelection,
		rowMetrics: p.rowMetrics,
		scrollLeft: p.scrollLeft,
		scrollTop: p.scrollTop,
		stickyColumnCount,
		theme,
		viewportHeight,
		viewportWidth,
	});
	const activeMergeCellRect = drawSheetCanvasMergedCells({
		bodyClipRect,
		cellLookup: p.cellLookup,
		columns: p.columns,
		ctx,
		mergedRanges: p.mergedRanges,
		regions: p.regions,
		rowMetrics: p.rowMetrics,
		scrollLeft: p.scrollLeft,
		scrollTop: p.scrollTop,
		selectedCellKeyMap: p.selectedCellKeyMap,
		selectedCellState: p.selectedCellState,
		stickyColumnCount,
		theme,
		viewportHeight,
		viewportWidth,
	});
	if (p.mergedRanges?.length) {
		// The merge backgrounds erased any selection dashes crossing them
		drawSheetCanvasSelectionBorder({
			columns: p.columns,
			ctx,
			rowMetrics: p.rowMetrics,
			scrollLeft: p.scrollLeft,
			scrollTop: p.scrollTop,
			selectedCellKeyMap: p.selectedCellKeyMap,
			stickyColumnCount,
			theme,
			viewportHeight,
			viewportWidth,
		});
	}
	drawSheetCanvasBodyTextOverflows({
		cellLookup: p.cellLookup,
		columnRects: visibleColumnRects,
		ctx,
		mergedRanges: p.mergedRanges,
		rowRects: visibleRowRects,
		theme,
		viewportHeight,
		viewportWidth,
	});
	drawSheetCanvasBodyCellBorders({
		cellLookup: p.cellLookup,
		columnRects: visibleColumnRects,
		ctx,
		mergedRanges: p.mergedRanges,
		rowRects: visibleRowRects,
		theme,
		viewportHeight,
		viewportWidth,
	});
	drawSheetCanvasDataTableRegionLabels({
		columns: p.columns,
		ctx,
		hoveredRegionId: p.hoveredRegionId,
		regionDataTableLabelsById: p.regionDataTableLabelsById,
		regions: p.regions,
		selectedCellKeyMap: p.selectedCellKeyMap,
		selectedCellState: p.selectedCellState,
		rowMetrics: p.rowMetrics,
		scrollLeft: p.scrollLeft,
		scrollTop: p.scrollTop,
		stickyColumnCount,
		theme,
		viewportHeight,
		viewportWidth,
	});
	drawSheetCanvasDataTableRegionColumnKeyLabel({
		columns: p.columns,
		ctx,
		hoveredCellState: p.hoveredCellState,
		regions: p.regions,
		rowMetrics: p.rowMetrics,
		scrollLeft: p.scrollLeft,
		scrollTop: p.scrollTop,
		selectedCellState: p.selectedCellState,
		stickyColumnCount,
		theme,
		viewportHeight,
		viewportWidth,
	});

	// Keep selected-cell overlays above body content without painting over sticky headers.
	ctx.save();
	ctx.beginPath();
	ctx.rect(
		bodyClipRect.left,
		bodyClipRect.top,
		bodyClipRect.width,
		bodyClipRect.height,
	);
	ctx.clip();
	const effectiveActiveCellRect = activeMergeCellRect || activeCellRect;
	if (effectiveActiveCellRect && !p.editState) {
		const activeCell = p.selectedCellState
			? p.cellLookup.get(getSheetCellKey(p.selectedCellState.rowId, p.selectedCellState.cellKey))
			: null;
		const activeRowIndex = getSheetCanvasRowIndexFromId(p.selectedCellState?.rowId);
		const activeColumnIndex = getSheetCanvasColumnIndexFromKey(p.selectedCellState?.cellKey);

		// A loading cell's selection border fades out so the animated loading
		// outline stays clearly visible underneath
		const activeCellIsLoading = Boolean(
			activeRowIndex && activeColumnIndex &&
				(p.loadingCellCoords || []).some((coord) => {
					return coord.rowIndex === activeRowIndex && coord.columnIndex === activeColumnIndex;
				}),
		);

		ctx.save();
		if (activeCellIsLoading) {
			ctx.globalAlpha = 0.25;
		}
		drawSheetCanvasCellActiveBorder({
			color: activeRowIndex && activeColumnIndex
				? getSheetCanvasActiveBorderColor({
					cell: activeCell,
					columnIndex: activeColumnIndex,
					regions: p.regions,
					rowIndex: activeRowIndex,
					theme,
				})
				: theme.active,
			ctx,
			height: effectiveActiveCellRect.height,
			left: effectiveActiveCellRect.left,
			top: effectiveActiveCellRect.top,
			theme,
			width: effectiveActiveCellRect.width,
		});
		ctx.restore();
	}
	drawSheetCanvasFillPreviewBorder({
		columns: p.columns,
		ctx,
		fillPreviewRange: p.fillPreviewRange,
		rowMetrics: p.rowMetrics,
		scrollLeft: p.scrollLeft,
		scrollTop: p.scrollTop,
		stickyColumnCount,
		theme,
		viewportHeight,
		viewportWidth,
	});
	if (p.showFillHandle && !p.editState) {
		drawSheetCanvasFillHandle({
			activeCellRect: effectiveActiveCellRect,
			columns: p.columns,
			ctx,
			rowMetrics: p.rowMetrics,
			scrollLeft: p.scrollLeft,
			scrollTop: p.scrollTop,
			selectedCellKeyMap: p.selectedCellKeyMap,
			stickyColumnCount,
			theme,
		});
	}
	drawSheetCanvasLoadingOutlines({
		bodyClipRect,
		columns: p.columns,
		ctx,
		loadingCellCoords: p.loadingCellCoords,
		loadingRegionRects: p.loadingRegionRects,
		rowMetrics: p.rowMetrics,
		scrollLeft: p.scrollLeft,
		scrollTop: p.scrollTop,
		stickyColumnCount,
		theme,
		viewportHeight,
		viewportWidth,
	});
	ctx.restore();

	if (p.resizeGuide) {
		ctx.strokeStyle = theme.resizeGuide;
		ctx.lineWidth = 3;
		ctx.beginPath();
		ctx.moveTo(p.resizeGuide.left + 0.5, 0);
		ctx.lineTo(p.resizeGuide.left + 0.5, Math.max(SHEET_HEADER_HEIGHT, p.resizeGuide.height));
		ctx.stroke();
	}

	if (p.rowResizeGuide) {
		ctx.strokeStyle = theme.resizeGuide;
		ctx.lineWidth = 3;
		ctx.beginPath();
		ctx.moveTo(0, p.rowResizeGuide.top + 0.5);
		ctx.lineTo(Math.max(SHEET_ROW_NUMBER_WIDTH, p.rowResizeGuide.width), p.rowResizeGuide.top + 0.5);
		ctx.stroke();
	}

	// The read-only tag should float over cells, but never over row or column headers.
	ctx.save();
	ctx.beginPath();
	ctx.rect(
		bodyClipRect.left,
		bodyClipRect.top,
		bodyClipRect.width,
		bodyClipRect.height,
	);
	ctx.clip();
	drawSheetCanvasReadOnlyTag({
		ctx,
		position: p.selectedReadOnlyCellPosition,
		scrollLeft: p.scrollLeft,
		scrollTop: p.scrollTop,
		theme,
		viewportHeight,
		viewportWidth,
	});
	ctx.restore();

	drawSheetCanvasTopLeftCornerCover({
		ctx,
		theme,
	});
}

/*
 * Render the pure canvas Sheet surface and overlay slot.
 */
export const SheetCanvasSurface = memo((p: SheetCanvasSurfaceProps) => {
	const canvasRef = useRef<HTMLCanvasElement | null>(null);
	const latestPropsRef = useRef(p);
	latestPropsRef.current = p;

	useEffect(() => {
		const canvas = canvasRef.current;

		if (!canvas) {
			return;
		}

		drawSheetCanvasSurface(canvas, p);
	});

	// Continuous repaint loop only while loading outlines animate
	const hasLoadingOutlines = Boolean(p.loadingCellCoords?.length || p.loadingRegionRects?.length);

	useEffect(() => {
		if (!hasLoadingOutlines) {
			return;
		}

		let frameId = 0;
		const paintFrame = () => {
			const canvas = canvasRef.current;
			if (canvas) {
				drawSheetCanvasSurface(canvas, latestPropsRef.current);
			}
			frameId = globalThis.requestAnimationFrame(paintFrame);
		};

		frameId = globalThis.requestAnimationFrame(paintFrame);

		return () => {
			globalThis.cancelAnimationFrame(frameId);
		};
	}, [hasLoadingOutlines]);

	return <div
		className={cn('v_stretch h_f w_f rel bg', p.className)}
		style={p.style}
	>
		{p.headerContent
			? <div
				className='no_shrink bd_b_1 bd_lt'
				data-sheet-header-content='true'
			>
				{p.headerContent}
			</div>
			: null}

		{p.formulaContent}

		<div
			ref={p.scrollRef}
			className='sheet_ui_scroll app_scr of_x f w_f rel bg_fade ft_xs'
			data-sheet-scroll-viewport='true'
			onContextMenu={p.onContextMenu}
			onDoubleClick={p.onDoubleClick}
			onBlur={p.onFocusOut}
			onInput={p.onInput}
			onPointerDown={p.onPointerDown}
			onPointerDownCapture={p.onPointerDownCapture}
			onPointerLeave={p.onPointerLeave}
			onPointerMove={p.onPointerMove}
			style={{
				overflowAnchor: 'none',
			}}
		>
			<div
				className='sticky top_0 left_0 noclick'
				data-sheet-canvas-viewport='true'
				style={{
					height: 0,
					pointerEvents: 'none',
					position: 'sticky',
					left: 0,
					top: 0,
					width: 0,
					zIndex: 1,
				}}
			>
				<canvas
					ref={canvasRef}
					className='bl noclick'
					data-sheet-canvas='true'
					style={{
						pointerEvents: 'none',
					}}
				/>
			</div>
			<div
				className='sheet_ui_canvas rel bg_fade'
				data-cell-count={p.rowMetrics.length * p.columns.length}
				style={{
					height: p.canvasHeight,
					width: p.canvasWidth,
				}}
			/>
			{p.overlayContent}
		</div>
	</div>;
}, (prev, next) => (
	prev.canvasHeight === next.canvasHeight &&
	prev.canvasWidth === next.canvasWidth &&
	prev.cellLookup === next.cellLookup &&
	prev.className === next.className &&
	prev.columns === next.columns &&
	prev.editState?.cellKey === next.editState?.cellKey &&
	prev.editState?.rowId === next.editState?.rowId &&
	prev.editState?.draftValue === next.editState?.draftValue &&
	prev.fillPreviewRange?.startRowIndex === next.fillPreviewRange?.startRowIndex &&
	prev.fillPreviewRange?.startColumnIndex === next.fillPreviewRange?.startColumnIndex &&
	prev.fillPreviewRange?.endRowIndex === next.fillPreviewRange?.endRowIndex &&
	prev.fillPreviewRange?.endColumnIndex === next.fillPreviewRange?.endColumnIndex &&
	prev.showFillHandle === next.showFillHandle &&
	prev.formulaContent === next.formulaContent &&
	prev.headerContent === next.headerContent &&
	sheetCanvasHeaderSelectionsAreEqual(prev.headerSelection, next.headerSelection) &&
	prev.hoveredCellState?.cellKey === next.hoveredCellState?.cellKey &&
	prev.hoveredCellState?.rowId === next.hoveredCellState?.rowId &&
	prev.onContextMenu === next.onContextMenu &&
	prev.onDoubleClick === next.onDoubleClick &&
	prev.onFocusOut === next.onFocusOut &&
	prev.onInput === next.onInput &&
	prev.onPointerDown === next.onPointerDown &&
	prev.onPointerDownCapture === next.onPointerDownCapture &&
	prev.onPointerLeave === next.onPointerLeave &&
	prev.onPointerMove === next.onPointerMove &&
	prev.overlayContent === next.overlayContent &&
	prev.regions === next.regions &&
	prev.regionDataTableLabelsById === next.regionDataTableLabelsById &&
	prev.hoveredRegionId === next.hoveredRegionId &&
	prev.resizeGuide?.columnKey === next.resizeGuide?.columnKey &&
	prev.resizeGuide?.height === next.resizeGuide?.height &&
	prev.resizeGuide?.left === next.resizeGuide?.left &&
	prev.rowMetrics === next.rowMetrics &&
	prev.rowResizeGuide?.rowKey === next.rowResizeGuide?.rowKey &&
	prev.rowResizeGuide?.top === next.rowResizeGuide?.top &&
	prev.rowResizeGuide?.width === next.rowResizeGuide?.width &&
	prev.scrollLeft === next.scrollLeft &&
	prev.scrollRef === next.scrollRef &&
	prev.scrollTop === next.scrollTop &&
	prev.selectedReadOnlyCellPosition?.isStickyLeft === next.selectedReadOnlyCellPosition?.isStickyLeft &&
	prev.selectedReadOnlyCellPosition?.left === next.selectedReadOnlyCellPosition?.left &&
	prev.selectedReadOnlyCellPosition?.rowWidth === next.selectedReadOnlyCellPosition?.rowWidth &&
	prev.selectedReadOnlyCellPosition?.top === next.selectedReadOnlyCellPosition?.top &&
	prev.selectedReadOnlyCellPosition?.width === next.selectedReadOnlyCellPosition?.width &&
	prev.selectedCellKeyMap === next.selectedCellKeyMap &&
	prev.selectedCellState?.cellKey === next.selectedCellState?.cellKey &&
	prev.selectedCellState?.rowId === next.selectedCellState?.rowId &&
	prev.stickyColumnCount === next.stickyColumnCount &&
	prev.stickyRowCount === next.stickyRowCount &&
	prev.style === next.style &&
	prev.viewportHeight === next.viewportHeight &&
	prev.viewportWidth === next.viewportWidth
));

SheetCanvasSurface.displayName = 'SheetCanvasSurface';

export default SheetCanvasSurface;
