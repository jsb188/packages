import { COLORS } from '@jsb188/app/constants/app.ts';
import i18n from '@jsb188/app/i18n/index.ts';
import { cn } from '@jsb188/app/utils/string.ts';
import { memo, type CSSProperties, type ReactNode, type Ref } from 'react';
import { Icon } from '../svgs/Icon';
import { SheetSaveButton } from './SheetEditor';
import {
	SHEET_COLUMN_MAX_WIDTH,
	SHEET_COLUMN_MIN_WIDTH,
	SHEET_COLUMN_WIDTH,
	SHEET_HEADER_HEIGHT,
	SHEET_ROW_HEIGHT,
	SHEET_ROW_NUMBER_WIDTH,
	SHEET_STICKY_SPACER_SIZE,
	SheetCellDisplayValue,
	SheetGridCell,
	SheetHeaderArea,
	SheetPlaceholderRowFillCell,
	SheetRowNumberSlot,
	SheetStickyColumnSpacerSlot,
	SheetTopLeftRowNumberSlot,
	isSheetColumnSticky,
	isSheetPlaceholderRowSlot,
} from './SheetCell';
import './SheetUI.css';

export {
	SHEET_COLUMN_MAX_WIDTH,
	SHEET_COLUMN_MIN_WIDTH,
	SHEET_COLUMN_WIDTH,
	SHEET_HEADER_HEIGHT,
	SHEET_ROW_HEIGHT,
	SHEET_ROW_NUMBER_WIDTH,
	SHEET_STICKY_SPACER_SIZE,
	SheetCellDisplayValue,
} from './SheetCell';
export {
	SheetSaveButton,
	type SheetSaveButtonProps,
} from './SheetEditor';

/**
 * Types
 */

const SHEET_COLUMN_RESIZE_GUIDE_Z_INDEX = 44;

export type SheetCellKey = `${string}:${string}`;

export type SheetUIFieldType =
	| 'TEXT'
	| 'ID'
	| 'NUMBER'
	| 'PRICE'
	| 'BOOLEAN'
	| 'DATE'
	| 'WEEK_OF_MON'
	| 'WEEK_OF_SUN'
	| 'DATETIME'
	| 'SELECT'
	| 'SELECT_OR_TEXT'
	| 'MULTI_SELECT'
	| 'JSON';

export type SheetUIOption = {
	label: string;
	value: string;
	color?: string | null;
};

export type SheetUIColumn = {
	id: string;
	key: string;
	label: string;
	fieldType: SheetUIFieldType;
	humanFieldType?: SheetUIFieldType | null;
	options?: SheetUIOption[];
	openLink?: boolean | null;
	humansCannotEdit?: boolean | null;
};

export type SheetUICell = {
	cellKey: string;
	displayValue: string;
	draftValue: string;
	iconName?: string | null;
	canEdit?: boolean;
	canOpen?: boolean;
	cellClassName?: string;
	displayClassName?: string;
};

export type SheetUIRowSlot = {
	cellsByKey: Record<string, SheetUICell | undefined>;
	deleted?: boolean;
	rowId?: string | null;
	rowIndex: number;
	rowKey: string;
	rowNumber?: number | null;
	rowHeight?: number;
	rowTop: number;
	rowWidth: number;
};

export type SheetUIEditorClickSource = 'CELL_LINK' | 'CELL_BACKGROUND';

export type SheetUIEditState = {
	rowId: string;
	cellKey: string;
	draftValue: string;
	clickSource?: SheetUIEditorClickSource;
	error?: string | null;
	disableInlineEditor?: boolean;
};

export type SheetUISelectedCellState = {
	rowId: string;
	cellKey: string;
};

export type SheetUISelectedCellKeyMap = Record<string, true>;

export type SheetUIHeaderEditState = {
	cellKey: string;
	draftValue: string;
	error?: string | null;
};

export type SheetColumnMetric = {
	column: SheetUIColumn;
	columnIndex: number;
	left: number;
	width: number;
};

export type SheetColumnWidths = Record<string, number>;

export type SheetVisibleRange = {
	rowStart: number;
	rowEnd: number;
	columnStart: number;
	columnEnd: number;
};

export type SheetUIResizeGuide = {
	columnKey: string;
	height: number;
	left: number;
};

export type SheetUIColumnReorderGuide = {
	columnKey: string;
	height: number;
	left: number;
};

export type SheetUIColumnReorderDrag = {
	columnKey: string;
	label: string;
	left: number;
	width: number;
};

export type SheetUIColumnReorderDisplacements = Record<string, number>;

export type SheetUICellRenderSnapshot = {
	active?: boolean;
	cell?: SheetUICell;
	editState?: SheetUIEditState | null;
	selected?: boolean;
};

export type SheetUICellRenderStore = {
	getSnapshot: (rowId: string, cellKey: string) => SheetUICellRenderSnapshot;
	subscribe: (rowId: string, cellKey: string, listener: () => void) => () => void;
};

export interface SheetSelectEditorProps {
	clickSource?: SheetUIEditorClickSource;
	editState: SheetUIEditState;
	fieldType: SheetUIFieldType;
	options: SheetUIOption[];
}

export interface SheetUIProps {
	canvasHeight: number;
	canvasWidth: number;
	cellCount: number;
	cellStore?: SheetUICellRenderStore;
	columnReorderDrag?: SheetUIColumnReorderDrag | null;
	columnReorderDisplacements?: SheetUIColumnReorderDisplacements | null;
	columnReorderEnabled?: boolean;
	columnReorderGuide?: SheetUIColumnReorderGuide | null;
	columnCount: number;
	columns: SheetColumnMetric[];
	editState?: SheetUIEditState | null;
	headerCellsEditable?: boolean;
	headerContent?: ReactNode;
	headerEditState?: SheetUIHeaderEditState | null;
	selectedHeaderCellKey?: string | null;
	headerSpacerWidth?: number;
	headerWidth: number;
	resizeGuide?: SheetUIResizeGuide | null;
	rows: SheetUIRowSlot[];
	scrollLeft: number;
	scrollRef?: Ref<HTMLDivElement>;
	selectedCellKeyMap?: SheetUISelectedCellKeyMap | null;
	selectedCellState?: SheetUISelectedCellState | null;
	sheetSurfaceHeight?: number;
	sheetSurfaceTop?: number;
	stickyColumnEndLeft?: number;
	stickyColumnCount?: number | null;
	className?: string;
	id?: string;
	cellRenderCallback?: (rowId: string | null, cellKey: string) => void;
	overlayContent?: ReactNode;
	style?: CSSProperties;
}

/*
 * Build the stable string key used for a visual sheet cell.
 */

export function getSheetCellKey(rowId: string, cellKey: string): SheetCellKey {
	return `${rowId}:${cellKey}`;
}

/*
 * Keep a user-resized column width inside the usable spreadsheet range.
 */

export function clampSheetColumnWidth(width: number) {
	return Math.min(SHEET_COLUMN_MAX_WIDTH, Math.max(SHEET_COLUMN_MIN_WIDTH, Math.round(width)));
}

/*
 * Return translated UI text when translations are loaded, with a stable fallback for tests.
 */

function getSheetTranslatedText(key: string, fallback: string) {
	return i18n.has(key) ? i18n.t(key) : fallback;
}

/*
 * Return a safe sheet option color name for a select-style display pill.
 */

export function getValidSheetOptionColor(color?: string | null) {
	return typeof color === 'string' && COLORS.includes(color as any) ? color : 'zinc';
}

/*
 * Return the selected value set from one multi-select editor draft string.
 */

export function getSheetMultiSelectEditorValueSet(draftValue: string) {
	const trimmedValue = draftValue.trim();
	let values: string[] = [];

	if (!trimmedValue) {
		return new Set<string>();
	}

	if (trimmedValue.startsWith('[')) {
		try {
			const parsedValue = JSON.parse(trimmedValue);
			values = Array.isArray(parsedValue) ? parsedValue.map((item) => String(item)) : [];
		} catch {
			values = [];
		}
	} else {
		values = trimmedValue.split(',').map((item) => item.trim()).filter(Boolean);
	}

	return new Set(values);
}

/*
 * Calculate the minimum number of body rows needed to fill one sheet viewport.
 */

export function getSheetMinimumRowCount(containerHeight: number, headerHeight = SHEET_HEADER_HEIGHT) {
	return Math.max(0, Math.ceil(Math.max(0, containerHeight - headerHeight) / SHEET_ROW_HEIGHT));
}

/*
 * Convert column widths into stable offsets for variable-width virtualization.
 */

export function getSheetColumnMetrics(columns: SheetUIColumn[], columnWidths: SheetColumnWidths = {}) {
	const metrics: SheetColumnMetric[] = [];
	const offsets = [0];
	let totalWidth = 0;

	columns.forEach((column, columnIndex) => {
		const width = clampSheetColumnWidth(columnWidths[column.id] || SHEET_COLUMN_WIDTH);

		metrics.push({
			column,
			columnIndex,
			left: totalWidth,
			width,
		});

		totalWidth += width;
		offsets.push(totalWidth);
	});

	return {
		metrics,
		offsets,
		totalWidth,
	};
}

/*
 * Return whether one option already represents a draft select editor value.
 */

function isSheetSelectEditorOptionMatch(option: SheetUIOption, draftValue: string) {
	const normalizedDraftValue = draftValue.toLowerCase();

	return String(option.value).toLowerCase() === normalizedDraftValue ||
		String(option.label).toLowerCase() === normalizedDraftValue;
}

/*
 * Return the custom text editor value for one SELECT_OR_TEXT draft.
 */

function getSheetSelectEditorCustomInputValue(draftValue: string, options: SheetUIOption[]) {
	const option = options.find((item) => isSheetSelectEditorOptionMatch(item, draftValue));

	return option ? '' : draftValue;
}

/*
 * Return the option list plus a visible custom value row when needed.
 */

function getSheetSelectEditorVisibleOptions(p: SheetSelectEditorProps) {
	if (
		(p.fieldType !== 'SELECT' && p.fieldType !== 'SELECT_OR_TEXT') ||
		!p.editState.draftValue ||
		p.options.some((option) => isSheetSelectEditorOptionMatch(option, p.editState.draftValue))
	) {
		return p.options;
	}

	return p.options.concat([{
		color: null,
		label: p.editState.draftValue,
		value: p.editState.draftValue,
	}]);
}

/*
 * Render the select-style editor menu used by sheets for option cells.
 */

export function SheetSelectEditor(p: SheetSelectEditorProps) {
	const visibleOptions = getSheetSelectEditorVisibleOptions(p);
  const len = visibleOptions.length;
  const lastLen = len - 1;
	const selectedValues = p.fieldType === 'MULTI_SELECT'
		? getSheetMultiSelectEditorValueSet(p.editState.draftValue)
		: new Set([p.editState.draftValue]);

	return <div
		className='sheet_overlay_editor bg bd_2 bd_lt ft_xs w_f max_h_300'
		data-sheet-click-source={p.clickSource}
		data-sheet-select-editor='true'
	>
    {/* You always need a <div> here because the options.map(..) elements have negative Y margins; use this for top/bottom padding */}
    <div className='h_8' />
			{len
				? visibleOptions.map((option) => {
				const selected = selectedValues.has(String(option.value));
				const optionDisplayClassName = [
					'ellip',
					'px_5',
					'py_2',
					'r_4',
					`bg_${getValidSheetOptionColor(option.color)}_md`,
				].join(' ');

				return <button
					key={option.value}
					className={`h_item w_f px_6 py_5 -my_2 cl_df bg_${getValidSheetOptionColor(option.color)}_fd_hv`}
					data-sheet-select-editor-option={option.value}
					style={{
						textAlign: 'left',
					}}
					type='button'
				>
					<SheetCellDisplayValue
						displayClassName={optionDisplayClassName}
						displayValue={option.label || String(option.value)}
						fill
					/>
					<span className='ic_sm no_shrink ml_6'>
						{selected ? <Icon name='check' /> : null}
					</span>
				</button>;
			})
			: <div
				className='px_8 py_8 cl_md'
				data-sheet-select-editor-empty='true'
			>
				{getSheetTranslatedText('form.no_results', 'No results')}
			</div>}
    <div className='h_8' />

		{p.fieldType === 'SELECT_OR_TEXT'
			? <form
        // we need -mb_2 here because of the overlay editor container's padding
				className='h_item gap_6 p_6 bd_t_2 bd_lt'
				data-sheet-select-editor-custom='true'
			>
				<input
					className='f stock ft_xs px_5 py_4 bd_0 bg_alt'
					defaultValue={getSheetSelectEditorCustomInputValue(p.editState.draftValue, p.options)}
					name='customValue'
					placeholder='...'
					type='text'
				/>
				<SheetSaveButton />
			</form>
			: null}
	</div>;
}

/*
 * Find the variable-width column index at one horizontal scroll offset.
 */

export function getSheetColumnIndexAtOffset(columnOffsets: number[], offset: number) {
	const lastColumnIndex = Math.max(0, columnOffsets.length - 2);
	let low = 0;
	let high = lastColumnIndex;
	let result = 0;

	while (low <= high) {
		const mid = Math.floor((low + high) / 2);

		if ((columnOffsets[mid] || 0) <= offset) {
			result = mid;
			low = mid + 1;
		} else {
			high = mid - 1;
		}
	}

	return Math.min(result, lastColumnIndex);
}

/*
 * Calculate the rows and columns that should be rendered for one viewport.
 */

export function getSheetVisibleRange(params: {
	bufferColumns: number;
	bufferRows: number;
	columnOffsets?: number[];
	columnCount: number;
	containerHeight: number;
	containerWidth: number;
	headerHeight?: number;
	rowCount: number;
	scrollLeft: number;
	scrollTop: number;
}): SheetVisibleRange {
	const {
		bufferColumns,
		bufferRows,
		columnOffsets,
		columnCount,
		containerHeight,
		containerWidth,
		headerHeight = SHEET_HEADER_HEIGHT,
		rowCount,
		scrollLeft,
		scrollTop,
	} = params;

	const bodyScrollTop = Math.max(0, scrollTop - headerHeight);
	const bodyScrollLeft = Math.max(0, scrollLeft - SHEET_ROW_NUMBER_WIDTH);
	const bodyScrollRight = Math.max(bodyScrollLeft, bodyScrollLeft + containerWidth - 1);
	const visibleRowCount = Math.ceil(Math.max(0, containerHeight - headerHeight) / SHEET_ROW_HEIGHT);
	const rowStart = Math.max(0, Math.floor(bodyScrollTop / SHEET_ROW_HEIGHT) - bufferRows);
	const firstVisibleColumnIndex = columnOffsets?.length
		? getSheetColumnIndexAtOffset(columnOffsets, bodyScrollLeft)
		: Math.floor(bodyScrollLeft / SHEET_COLUMN_WIDTH);
	const lastVisibleColumnIndex = columnOffsets?.length
		? getSheetColumnIndexAtOffset(columnOffsets, bodyScrollRight)
		: Math.floor(bodyScrollRight / SHEET_COLUMN_WIDTH);
	const columnStart = Math.max(0, firstVisibleColumnIndex - bufferColumns);

	return {
		rowStart,
		rowEnd: Math.min(rowCount, rowStart + visibleRowCount + bufferRows * 2),
		columnStart,
		columnEnd: Math.min(columnCount, lastVisibleColumnIndex + 1 + bufferColumns),
	};
}

/*
 * Render a virtualized spreadsheet grid from already-computed UI props.
 */

export const SheetUI = memo((p: SheetUIProps) => {
	const sheetSurfaceHeight = p.sheetSurfaceHeight ?? p.canvasHeight;
	const sheetSurfaceTop = p.sheetSurfaceTop ?? 0;
	const stickyColumnEndLeft = p.stickyColumnEndLeft ?? SHEET_ROW_NUMBER_WIDTH;

	return <div
		id={p.id}
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

		<div
			ref={p.scrollRef}
			className='sheet_ui_scroll f w_f rel bg_fade ft_xs'
			data-sheet-scroll-viewport='true'
		>
			<div
				className='sheet_ui_canvas w_f h_f rel bg_fade'
				data-cell-count={p.cellCount}
				style={{
					height: p.canvasHeight,
					width: p.canvasWidth,
				}}
			>
				<SheetHeaderArea
					columnReorderDrag={p.columnReorderDrag}
					columnReorderDisplacements={p.columnReorderDisplacements}
					columnReorderEnabled={p.columnReorderEnabled}
					columnReorderGuide={p.columnReorderGuide}
					columnCount={p.columnCount}
					columns={p.columns}
					headerCellsEditable={p.headerCellsEditable}
					headerEditState={p.headerEditState}
					selectedHeaderCellKey={p.selectedHeaderCellKey}
					headerSpacerWidth={p.headerSpacerWidth ?? p.headerWidth}
					headerWidth={p.headerWidth}
					scrollLeft={p.scrollLeft}
					stickyColumnEndLeft={stickyColumnEndLeft}
					stickyColumnCount={p.stickyColumnCount}
				/>

				{p.resizeGuide
					? <div
						className='abs noclick'
						data-sheet-resize-guide-layer='true'
						style={{
							height: sheetSurfaceHeight,
							left: 0,
							overflow: 'hidden',
							top: sheetSurfaceTop,
							width: p.canvasWidth,
							zIndex: SHEET_COLUMN_RESIZE_GUIDE_Z_INDEX,
						}}
					>
						<div className='rel h_f w_f'>
							<div
								className='bg_primary noclick'
								data-sheet-column-resize-guide={p.resizeGuide.columnKey}
								style={{
									height: p.resizeGuide.height,
									left: p.resizeGuide.left - 1.5,
									position: 'absolute',
									top: 0,
									width: 3,
									zIndex: SHEET_COLUMN_RESIZE_GUIDE_Z_INDEX,
								}}
							/>
						</div>
					</div>
					: null}

				<SheetTopLeftRowNumberSlot rowWidth={Math.max(p.headerSpacerWidth ?? p.headerWidth, p.canvasWidth)} />

				{p.rows.map((rowSlot) => {
					return <SheetRowNumberSlot
						key={rowSlot.rowKey}
							isPlaceholderRow={isSheetPlaceholderRowSlot(rowSlot)}
							deleted={rowSlot.deleted}
							rowId={rowSlot.rowId}
							rowIndex={rowSlot.rowIndex}
						rowNumber={rowSlot.rowNumber}
						rowHeight={rowSlot.rowHeight}
						rowTop={rowSlot.rowTop}
						rowWidth={rowSlot.rowWidth}
					/>;
				})}

				{p.rows.map((rowSlot) => {
					return <SheetStickyColumnSpacerSlot
						key={`${rowSlot.rowKey}:sticky-column-spacer`}
							left={stickyColumnEndLeft}
							deleted={rowSlot.deleted}
							rowId={rowSlot.rowId}
							rowHeight={rowSlot.rowHeight}
						rowTop={rowSlot.rowTop}
						rowWidth={rowSlot.rowWidth}
					/>;
				})}

				{p.rows.map((rowSlot) => {
					const isPlaceholderRow = isSheetPlaceholderRowSlot(rowSlot);

					if (isPlaceholderRow) {
						return <SheetPlaceholderRowFillCell
							key={`${rowSlot.rowKey}:placeholder-row-fill`}
							contentWidth={p.headerSpacerWidth}
							rowHeight={rowSlot.rowHeight}
							rowTop={rowSlot.rowTop}
							rowWidth={rowSlot.rowWidth}
						/>;
					}

					return p.columns.map((columnMetric) => {
						const isStickyLeft = isSheetColumnSticky(columnMetric.columnIndex, p.stickyColumnCount);
						const cellLeft = (isStickyLeft ? p.scrollLeft : 0) +
							SHEET_ROW_NUMBER_WIDTH +
							columnMetric.left;

						return <SheetGridCell
							key={`${rowSlot.rowKey}:${columnMetric.column.key}`}
							cell={rowSlot.cellsByKey[columnMetric.column.key]}
							cellStore={p.cellStore}
							cellLeft={cellLeft}
							column={columnMetric.column}
							columnIndex={columnMetric.columnIndex}
							columnWidth={columnMetric.width}
							editState={p.editState}
								isPlaceholderRow={isPlaceholderRow}
								isStickyLeft={isStickyLeft}
								rowDeleted={rowSlot.deleted}
								renderCallback={p.cellRenderCallback}
							rowHeight={rowSlot.rowHeight}
							rowId={rowSlot.rowId}
							rowIndex={rowSlot.rowIndex}
							rowTop={rowSlot.rowTop}
							selectedCellKeyMap={p.selectedCellKeyMap}
							selectedCellState={p.selectedCellState}
						/>;
					});
				})}

				{p.overlayContent}
			</div>
		</div>
	</div>;
}, (prev, next) => (
	prev.canvasHeight === next.canvasHeight &&
	prev.canvasWidth === next.canvasWidth &&
	prev.cellCount === next.cellCount &&
	prev.cellStore === next.cellStore &&
	prev.className === next.className &&
	prev.columnReorderDrag?.columnKey === next.columnReorderDrag?.columnKey &&
	prev.columnReorderDrag?.label === next.columnReorderDrag?.label &&
	prev.columnReorderDrag?.left === next.columnReorderDrag?.left &&
	prev.columnReorderDrag?.width === next.columnReorderDrag?.width &&
	prev.columnReorderDisplacements === next.columnReorderDisplacements &&
	prev.columnReorderEnabled === next.columnReorderEnabled &&
	prev.columnReorderGuide?.columnKey === next.columnReorderGuide?.columnKey &&
	prev.columnReorderGuide?.height === next.columnReorderGuide?.height &&
	prev.columnReorderGuide?.left === next.columnReorderGuide?.left &&
	prev.columnCount === next.columnCount &&
	prev.columns === next.columns &&
	prev.editState?.rowId === next.editState?.rowId &&
	prev.editState?.cellKey === next.editState?.cellKey &&
	prev.editState?.draftValue === next.editState?.draftValue &&
	prev.editState?.disableInlineEditor === next.editState?.disableInlineEditor &&
	prev.editState?.error === next.editState?.error &&
	prev.headerCellsEditable === next.headerCellsEditable &&
	prev.headerContent === next.headerContent &&
	prev.headerEditState?.cellKey === next.headerEditState?.cellKey &&
	prev.headerEditState?.draftValue === next.headerEditState?.draftValue &&
	prev.headerEditState?.error === next.headerEditState?.error &&
	prev.selectedHeaderCellKey === next.selectedHeaderCellKey &&
	prev.headerSpacerWidth === next.headerSpacerWidth &&
	prev.headerWidth === next.headerWidth &&
	prev.id === next.id &&
	prev.cellRenderCallback === next.cellRenderCallback &&
	prev.overlayContent === next.overlayContent &&
	prev.resizeGuide?.columnKey === next.resizeGuide?.columnKey &&
	prev.resizeGuide?.height === next.resizeGuide?.height &&
	prev.resizeGuide?.left === next.resizeGuide?.left &&
	prev.rows === next.rows &&
	prev.scrollLeft === next.scrollLeft &&
	prev.scrollRef === next.scrollRef &&
	prev.selectedCellKeyMap === next.selectedCellKeyMap &&
	prev.selectedCellState?.rowId === next.selectedCellState?.rowId &&
	prev.selectedCellState?.cellKey === next.selectedCellState?.cellKey &&
	prev.sheetSurfaceHeight === next.sheetSurfaceHeight &&
	prev.sheetSurfaceTop === next.sheetSurfaceTop &&
	prev.stickyColumnEndLeft === next.stickyColumnEndLeft &&
	prev.stickyColumnCount === next.stickyColumnCount &&
	prev.style === next.style
));

SheetUI.displayName = 'SheetUI';

export default SheetUI;
