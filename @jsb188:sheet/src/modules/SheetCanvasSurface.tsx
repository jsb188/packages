import { cn } from '@jsb188/app/utils/string.ts';
import { COLORS } from '@jsb188/app/constants/app.ts';
import i18n from '@jsb188/app/i18n/index.ts';
import { SHEET_DATA_TABLE_REGION_MAX_ROWS } from '@jsb188/mday/constants/sheet.ts';
import type { SheetRegionGQL } from '@jsb188/mday/types/sheet.d.ts';
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
  getSheetCanvasRowIndexFromId,
  type SheetCanvasCell,
  type SheetCanvasColumn,
} from '../libs/sheet-utils.ts';
import type { DataTableLocalEditorPosition } from '../libs/dataTable-cell-editing.tsx';
import type { SheetHeaderSelectionState } from '../libs/sheet-state.ts';

const SHEET_CANVAS_CELL_PADDING_X = 8;
const SHEET_CANVAS_GRID_LINE_WIDTH = 1;
const SHEET_CANVAS_READ_ONLY_TAG_PADDING_X = 5;
const SHEET_CANVAS_READ_ONLY_TAG_PADDING_Y = 4;
const SHEET_CANVAS_SELECTION_ALPHA = 0.09;
const SHEET_CANVAS_DATA_TABLE_ICON_PATH_CACHE = new Map<string, Path2D[]>();
const SHEET_CANVAS_TEXT_LINE_GAP = 2;

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
	solid: string;
	selectionFill: string;
	selectPillBackgrounds: Record<string, string>;
	styleColors: Record<string, string>;
	tagFontSize: string;
	tagLineHeightPx: number;
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
		regionOutline: getSheetCanvasCSSColor(styles, '--color-darker-bold', active),
		resizeGuide: getSheetCanvasCSSColor(styles, '--color-bg-active', '#e5e7eb'),
		solid: getSheetCanvasCSSColor(styles, '--color-solid', '#ffffff'),
		selectionFill: active,
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
	const inset = SHEET_CANVAS_GRID_LINE_WIDTH;
	const left = Math.round(params.left) + inset;
	const top = Math.round(params.top) + inset;
	const width = Math.max(0, Math.round(params.width) - inset);
	const height = Math.max(0, Math.round(params.height) - inset);

	if (!width || !height) {
		return;
	}

	params.ctx.fillStyle = params.color;
	params.ctx.fillRect(left, top, width, height);
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
 * Draw wrapped cell text while keeping it clipped to the cell rectangle.
 */
function drawSheetCanvasWrappedText(params: {
	color: string;
	ctx: CanvasRenderingContext2D;
	height: number;
	lineHeight: number;
	maxWidth: number;
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
	const firstBaselineY = params.y + Math.max(params.lineHeight, (params.height - totalTextHeight) / 2 + params.lineHeight / 2);

	params.ctx.fillStyle = params.color;
	params.ctx.textAlign = 'left';
	params.ctx.textBaseline = 'middle';

	visibleLines.forEach((line, index) => {
		const baselineY = firstBaselineY + index * (params.lineHeight + SHEET_CANVAS_TEXT_LINE_GAP);

		params.ctx.fillText(line, params.x, baselineY);

		if (params.underline) {
			const underlineY = Math.round(baselineY + 8) + 0.5;
			const textWidth = params.ctx.measureText(line).width;

			params.ctx.beginPath();
			params.ctx.strokeStyle = params.color;
			params.ctx.lineWidth = 1;
			params.ctx.moveTo(params.x, underlineY);
			params.ctx.lineTo(params.x + Math.min(textWidth, params.maxWidth), underlineY);
			params.ctx.stroke();
		}
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
	text: string;
	theme: SheetCanvasTheme;
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
	params.ctx.font = `${params.fontSize || params.theme.fontSize} ${params.fontFamily || params.theme.fontFamily}`;
	params.ctx.textAlign = params.align || 'left';
	params.ctx.textBaseline = 'middle';

	const textX = params.align === 'center'
		? params.x + params.width / 2
		: params.x + SHEET_CANVAS_CELL_PADDING_X;

	if (params.wrap && params.align !== 'center') {
		drawSheetCanvasWrappedText({
			color: params.color,
			ctx: params.ctx,
			height: params.height,
			lineHeight: params.theme.fontLineHeightPx,
			maxWidth: Math.max(0, params.width - SHEET_CANVAS_CELL_PADDING_X * 2),
			text: params.text,
			x: textX,
			y: params.y,
		});
	} else {
		params.ctx.fillText(
			params.text,
			textX,
			params.y + params.height / 2,
		);
	}
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

	const text = i18n.t('form.not_editable');
	const x = Math.round(params.position.left - params.scrollLeft - 1);
	const y = Math.round(params.position.top - params.scrollTop - 1);
	const height = Math.ceil(params.theme.tagLineHeightPx + (SHEET_CANVAS_READ_ONLY_TAG_PADDING_Y * 2));
	const font = `${params.theme.tagFontSize} ${params.theme.fontFamilyMedium}`;

	params.ctx.save();
	params.ctx.font = font;

	const width = Math.ceil(params.ctx.measureText(text).width + (SHEET_CANVAS_READ_ONLY_TAG_PADDING_X * 2));
	if (!sheetCanvasRectIsVisible({ height, left: x, top: y, width }, params.viewportWidth, params.viewportHeight)) {
		params.ctx.restore();
		return;
	}

	params.ctx.fillStyle = params.theme.contrast;
	params.ctx.fillRect(x, y, width, height);
	params.ctx.fillStyle = params.theme.solid;
	params.ctx.font = font;
	params.ctx.textAlign = 'left';
	params.ctx.textBaseline = 'middle';
	params.ctx.fillText(
		text,
		x + SHEET_CANVAS_READ_ONLY_TAG_PADDING_X,
		y + height / 2,
	);
	params.ctx.restore();
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
	height: number;
	maxWidth: number;
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
	params.ctx.font = `${params.theme.fontSize} ${params.theme.fontFamily}`;
	params.ctx.textAlign = 'left';
	params.ctx.textBaseline = 'middle';

	drawSheetCanvasWrappedText({
		color: params.color,
		ctx: params.ctx,
		height: params.height,
		lineHeight: params.theme.fontLineHeightPx,
		maxWidth: params.maxWidth,
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
	height: number;
	theme: SheetCanvasTheme;
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
		params.ctx.font = `${params.theme.fontSize} ${params.theme.fontFamily}`;

		const metrics = params.ctx.measureText(model.text);
		const pillHeight = Math.min(clipHeight, Math.max(0, params.theme.fontLineHeightPx + model.pillPaddingY * 2));
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
		height: clipHeight,
		maxWidth: Math.max(0, contentRight - textX),
		text: model.text,
		theme: params.theme,
		underline: model.canOpen,
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
 * Return the configured one-based end row for one Sheet DataTable region.
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
 * Return whether one rendered Sheet cell belongs to a DataTable-populated region.
 */
function isSheetCanvasDataTableRegionCell(cell?: SheetCanvasCell | null, regions?: SheetRegionGQL[] | null) {
	if (cell?.cell?.sourceType !== 'REGION_GENERATED') {
		return false;
	}

	const regionId = String(cell.cell.region?.regionId || cell.cell.regionId || '');
	if (!regionId) {
		return false;
	}

	return (regions || []).some((region) => {
		return String(region.id || '') === regionId &&
			region.type === 'DATA_TABLE' &&
			Boolean(region.source?.dataTableId);
	});
}

/*
 * Return the active border color for one selected Sheet canvas cell.
 */
function getSheetCanvasActiveBorderColor(cell: SheetCanvasCell | null | undefined, regions: SheetRegionGQL[] | null | undefined, theme: SheetCanvasTheme) {
	if (!isSheetCanvasDataTableRegionCell(cell, regions)) {
		return theme.active;
	}

	return cell?.dataTableDisplay?.canEdit ? theme.main : theme.contrast;
}

/*
 * Return whether the current selection intersects one DataTable region.
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
	(params.regions || []).forEach((region) => {
		if (region.type !== 'DATA_TABLE' || !region.source?.dataTableId || !region.columns?.length) {
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
	theme: SheetCanvasTheme;
	width: number;
	x: number;
	y: number;
}) {
	const backgroundColor = params.cell?.style
		? getSheetCanvasResolvedStyleColor(params.theme, getSheetCanvasStyleColor(params.cell.style, ['backgroundColor', 'fillColor']))
		: null;
	const textColor = params.cell?.style
		? getSheetCanvasResolvedStyleColor(params.theme, getSheetCanvasStyleColor(params.cell.style, ['color', 'textColor']))
		: null;

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
		params.ctx.globalAlpha = SHEET_CANVAS_SELECTION_ALPHA;
		drawSheetCanvasCellFillRect({
			ctx: params.ctx,
			color: params.theme.selectionFill,
			height: params.height,
			left: params.x,
			top: params.y,
			width: params.width,
		});
		params.ctx.restore();
	}

	const contentOpacity = params.cell?.formulaLoading ? 0.5 : 1;

	if (params.cell?.dataTableDisplay) {
		params.ctx.save();
		params.ctx.globalAlpha *= contentOpacity;
		drawSheetCanvasDataTableDisplay({
			cell: params.cell,
			color: textColor || params.theme.bodyText,
			ctx: params.ctx,
			height: params.height,
			theme: params.theme,
			width: params.width,
			x: params.x,
			y: params.y,
		});
		params.ctx.restore();
		return;
	}

	params.ctx.save();
	params.ctx.globalAlpha *= contentOpacity;
	drawSheetCanvasText({
		color: textColor || params.theme.bodyText,
		ctx: params.ctx,
		height: params.height,
		text: params.cell?.displayValue || '',
		theme: params.theme,
		width: params.width,
		wrap: true,
		x: params.x,
		y: params.y,
	});
	params.ctx.restore();
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

	if (params.suppressSelection) {
		params.ctx.fillStyle = params.theme.background;
		params.ctx.fillRect(
			Math.round(rect.left),
			Math.round(rect.top),
			Math.max(0, Math.round(rect.width)),
			Math.max(0, Math.round(rect.height)),
		);
	}

	drawSheetCanvasCell({
		cell,
		ctx: params.ctx,
		height: rect.height,
		isSelected: !params.suppressSelection && Boolean(params.selectedCellKeyMap?.[renderKey] || isActive),
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
	rowRects: SheetCanvasRowRect[];
	selectedCellKeyMap?: SheetUISelectedCellKeyMap | null;
	selectedCellState?: SheetUISelectedCellState | null;
	theme: SheetCanvasTheme;
}): SheetCanvasRect | null {
	let activeCellRect: SheetCanvasRect | null = null;

	params.rowRects.forEach((rowRect) => {
		params.columnRects.forEach((columnRect) => {
			const result = drawSheetCanvasBodyCell({
				cellLookup: params.cellLookup,
				columnRect,
				ctx: params.ctx,
				rowRect,
				selectedCellKeyMap: params.selectedCellKeyMap,
				selectedCellState: params.selectedCellState,
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
 * Repaint sticky Sheet panes above selection overlays and active-cell outlines.
 */
function drawSheetCanvasStickyBodyCells(params: {
	cellLookup: Map<string, SheetCanvasCell>;
	columnRects: SheetCanvasColumnRect[];
	ctx: CanvasRenderingContext2D;
	rowRects: SheetCanvasRowRect[];
	selectedCellKeyMap?: SheetUISelectedCellKeyMap | null;
	selectedCellState?: SheetUISelectedCellState | null;
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

			drawSheetCanvasBodyCell({
				cellLookup: params.cellLookup,
				columnRect,
				ctx: params.ctx,
				rowRect,
				selectedCellKeyMap: params.selectedCellKeyMap,
				selectedCellState: params.selectedCellState,
				suppressSelection: true,
				theme: params.theme,
			});
		});
	});
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
		x: 0,
	});
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
		right: params.viewportWidth,
		seen: fullWidthHorizontalLines,
		y: 0,
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
		rowRects: visibleRowRects,
		selectedCellKeyMap: p.selectedCellKeyMap,
		selectedCellState: p.selectedCellState,
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
		rowRects: visibleRowRects,
		selectedCellKeyMap: p.selectedCellKeyMap,
		selectedCellState: p.selectedCellState,
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

	if (activeCellRect) {
		const activeCell = p.selectedCellState
			? p.cellLookup.get(getSheetCellKey(p.selectedCellState.rowId, p.selectedCellState.cellKey))
			: null;
		drawSheetCanvasCellActiveBorder({
			color: getSheetCanvasActiveBorderColor(activeCell, p.regions, theme),
			ctx,
			height: activeCellRect.height,
			left: activeCellRect.left,
			top: activeCellRect.top,
			theme,
			width: activeCellRect.width,
		});
	}

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

	drawSheetCanvasReadOnlyTag({
		ctx,
		position: p.selectedReadOnlyCellPosition,
		scrollLeft: p.scrollLeft,
		scrollTop: p.scrollTop,
		theme,
		viewportHeight,
		viewportWidth,
	});
}

/*
 * Render the pure canvas Sheet surface and overlay slot.
 */
export const SheetCanvasSurface = memo((p: SheetCanvasSurfaceProps) => {
	const canvasRef = useRef<HTMLCanvasElement | null>(null);

	useEffect(() => {
		const canvas = canvasRef.current;

		if (!canvas) {
			return;
		}

		drawSheetCanvasSurface(canvas, p);
	});

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
	prev.formulaContent === next.formulaContent &&
	prev.headerContent === next.headerContent &&
	sheetCanvasHeaderSelectionsAreEqual(prev.headerSelection, next.headerSelection) &&
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
