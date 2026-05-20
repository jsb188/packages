import { cn } from '@jsb188/app/utils/string.ts';
import { memo, type CSSProperties, type ReactNode, type Ref } from 'react';
import './SheetUI.css';

/**
 * Constants
 */

export const SHEET_COLUMN_WIDTH = 160;
export const SHEET_COLUMN_MIN_WIDTH = 72;
export const SHEET_COLUMN_MAX_WIDTH = 640;
export const SHEET_ROW_NUMBER_WIDTH = 44;
export const SHEET_ROW_HEIGHT = 32;
export const SHEET_HEADER_HEIGHT = 32;
export const SHEET_STICKY_SPACER_SIZE = 4;
const SHEET_COLUMN_RESIZE_HANDLE_WIDTH = 18;
const SHEET_COLUMN_RESIZE_HANDLE_LEFT_OFFSET = 1;

/**
 * Constants; exclusive only to this file
 */

const STICKY_CELL_BG_CSS = 'bg';
const STICKY_SPACER_BG_CSS = 'bg_darker_1';
const CELL_BG_CSS = 'bg';

/**
 * Types
 */

export type SheetCellKey = `${string}:${string}`;

export type SheetUIFieldType =
	| 'TEXT'
	| 'NUMBER'
	| 'BOOLEAN'
	| 'DATE'
	| 'DATETIME'
	| 'SELECT'
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
	options?: SheetUIOption[];
	openLink?: boolean | null;
	humansCannotEdit?: boolean | null;
};

export type SheetUICell = {
	cellKey: string;
	displayValue: string;
	draftValue: string;
	canEdit?: boolean;
	canOpen?: boolean;
};

export type SheetUIRowSlot = {
	cellsByKey: Record<string, SheetUICell | undefined>;
	rowId?: string | null;
	rowIndex: number;
	rowKey: string;
	rowNumber: number;
	rowTop: number;
	rowWidth: number;
};

export type SheetUIEditState = {
	rowId: string;
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

export interface SheetUIProps {
	canvasHeight: number;
	canvasWidth: number;
	cellCount: number;
	columnCount: number;
	columns: SheetColumnMetric[];
	editState?: SheetUIEditState | null;
	headerContent?: ReactNode;
	headerSpacerWidth?: number;
	headerWidth: number;
	resizeGuide?: SheetUIResizeGuide | null;
	rows: SheetUIRowSlot[];
	scrollLeft: number;
	scrollRef?: Ref<HTMLDivElement>;
	sheetSurfaceHeight?: number;
	sheetSurfaceTop?: number;
	stickyColumnEndLeft?: number;
	stickyColumnCount?: number | null;
	className?: string;
	id?: string;
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
		const width = clampSheetColumnWidth(columnWidths[column.key] || SHEET_COLUMN_WIDTH);

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
	const visibleRowCount = Math.ceil(containerHeight / SHEET_ROW_HEIGHT);
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
 * Return whether one visual column should stay pinned to the left edge.
 */

function isSheetColumnSticky(columnIndex: number, stickyColumnCount?: number | null) {
	return columnIndex < (stickyColumnCount || 0);
}

/*
 * Return whether one rendered grid cell is currently in editor mode.
 */

function isSheetGridCellEditing(p: {
	column: SheetUIColumn;
	editState?: SheetUIEditState | null;
	rowId?: string | null;
}) {
	return Boolean(p.rowId && p.editState?.rowId === p.rowId && p.editState.cellKey === p.column.key);
}

/*
 * Compare editor props only for the grid cells touched by edit state.
 */

function areSheetGridCellEditPropsEqual(
	prev: {
		column: SheetUIColumn;
		editState?: SheetUIEditState | null;
		rowId?: string | null;
	},
	next: {
		column: SheetUIColumn;
		editState?: SheetUIEditState | null;
		rowId?: string | null;
	},
) {
	const prevEditing = isSheetGridCellEditing(prev);
	const nextEditing = isSheetGridCellEditing(next);

	if (prevEditing !== nextEditing) {
		return false;
	}

	if (!nextEditing) {
		return true;
	}

	return (
		prev.editState?.draftValue === next.editState?.draftValue &&
		prev.editState?.error === next.editState?.error
	);
}

/*
 * Render the sticky top-left corner cell.
 */

const SheetCornerCell = memo(() => {
	return <div
		className={cn('sheet_ui_corner abs bd_r_1 bd_b_1 bd_lt sticky z10', STICKY_CELL_BG_CSS)}
		data-sheet-corner-cell='true'
		style={{
			height: SHEET_HEADER_HEIGHT,
			left: 0,
			position: 'sticky',
			top: 0,
			width: SHEET_ROW_NUMBER_WIDTH,
		}}
	/>;
});

SheetCornerCell.displayName = 'SheetCornerCell';

/*
 * Render one sheet header cell.
 */

const SheetHeaderCell = memo((p: {
	column: SheetUIColumn;
	columnIndex: number;
	headerLeft: number;
	columnWidth: number;
	isStickyLeft: boolean;
}) => {
	return <div
		className={cn(
			'sheet_ui_header_cell of abs bd_r_1 bd_b_1 bd_lt h_item px_8 ft_medium cl_md no_wrap z3',
			STICKY_CELL_BG_CSS,
		)}
		data-sheet-header-cell='true'
		style={{
			height: SHEET_HEADER_HEIGHT,
			left: p.headerLeft,
			top: 0,
			width: p.columnWidth,
			zIndex: p.isStickyLeft ? 40 : undefined,
		}}
	>
		<span className='ellip'>{p.column.label}</span>
	</div>;
}, (prev, next) => (
	prev.column.id === next.column.id &&
	prev.column.key === next.column.key &&
	prev.column.label === next.column.label &&
	prev.columnIndex === next.columnIndex &&
	prev.headerLeft === next.headerLeft &&
	prev.columnWidth === next.columnWidth &&
	prev.isStickyLeft === next.isStickyLeft
));

SheetHeaderCell.displayName = 'SheetHeaderCell';

/*
 * Render one column resize handle outside the header cell stacking context.
 */

const SheetColumnResizeHandle = memo((p: {
	column: SheetUIColumn;
	columnIndex: number;
	columnWidth: number;
	handleLeft: number;
}) => {
	return <div
		aria-label={`Resize ${p.column.label}`}
		aria-orientation='vertical'
		className='abs cs_back hv_area'
		data-sheet-column-resize-handle={p.column.key}
		role='separator'
		style={{
			cursor: 'col-resize',
			height: SHEET_HEADER_HEIGHT,
			left: p.handleLeft,
			pointerEvents: 'auto',
			top: 0,
			width: SHEET_COLUMN_RESIZE_HANDLE_WIDTH,
			zIndex: 110,
		}}
	/>;
}, (prev, next) => (
	prev.column.id === next.column.id &&
	prev.column.key === next.column.key &&
	prev.column.label === next.column.label &&
	prev.columnIndex === next.columnIndex &&
	prev.columnWidth === next.columnWidth &&
	prev.handleLeft === next.handleLeft
));

SheetColumnResizeHandle.displayName = 'SheetColumnResizeHandle';

/*
 * Render the empty sticky spacer header cell after the left sticky columns.
 */

const SheetStickyColumnHeaderSpacer = memo((p: {
	left: number;
}) => {
	return <div
		className={cn('sheet_ui_header_cell of abs sticky w_4 h_32 z3', STICKY_SPACER_BG_CSS)}
		data-sheet-sticky-column-header-spacer='true'
		style={{
			left: p.left,
			position: 'sticky',
			top: 0,
			zIndex: 45,
		}}
	/>;
}, (prev, next) => (
	prev.left === next.left
));

SheetStickyColumnHeaderSpacer.displayName = 'SheetStickyColumnHeaderSpacer';

/*
 * Render the sticky top region and visible column labels.
 */

const SheetHeaderArea = memo((p: {
	columnCount: number;
	columns: SheetColumnMetric[];
	headerSpacerWidth: number;
	headerWidth: number;
	scrollLeft: number;
	stickyColumnEndLeft: number;
	stickyColumnCount?: number | null;
}) => {
	return <div
		className='sticky z5'
		data-sheet-sticky-header='true'
		style={{
			top: 0,
			width: p.headerWidth,
		}}
	>
		<div
			className='rel h_left'
			data-sheet-header-row='true'
			style={{
				height: SHEET_HEADER_HEIGHT,
				width: p.headerWidth,
			}}
		>
			<SheetCornerCell />

			<SheetStickyColumnHeaderSpacer
				left={p.stickyColumnEndLeft}
			/>

			{p.columns.map((columnMetric) => {
				const isStickyLeft = isSheetColumnSticky(columnMetric.columnIndex, p.stickyColumnCount);
				const headerLeft = (isStickyLeft ? p.scrollLeft : 0) +
					SHEET_ROW_NUMBER_WIDTH +
					columnMetric.left;

				return <SheetHeaderCell
					key={columnMetric.column.key}
					column={columnMetric.column}
					columnIndex={columnMetric.columnIndex}
					headerLeft={headerLeft}
					columnWidth={columnMetric.width}
					isStickyLeft={isStickyLeft}
				/>;
			})}

			<div
				className='abs'
				data-sheet-column-resize-handle-layer='true'
				style={{
					height: SHEET_HEADER_HEIGHT,
					left: 0,
					pointerEvents: 'none',
					top: 0,
					width: p.headerWidth,
					zIndex: 110,
				}}
			>
				{p.columns.map((columnMetric) => {
					const isStickyLeft = isSheetColumnSticky(columnMetric.columnIndex, p.stickyColumnCount);
					const handleLeft = (isStickyLeft ? p.scrollLeft : 0) +
						SHEET_ROW_NUMBER_WIDTH +
						columnMetric.left +
						columnMetric.width -
						SHEET_COLUMN_RESIZE_HANDLE_WIDTH / 2 -
						SHEET_COLUMN_RESIZE_HANDLE_LEFT_OFFSET;

					return <SheetColumnResizeHandle
						key={columnMetric.column.key}
						column={columnMetric.column}
						columnIndex={columnMetric.columnIndex}
						columnWidth={columnMetric.width}
						handleLeft={handleLeft}
					/>;
				})}
			</div>
		</div>

			<div
				className={cn('h_4', STICKY_SPACER_BG_CSS)}
				data-sheet-sticky-header-spacer='true'
				style={{
					width: p.headerSpacerWidth,
				}}
			/>
		</div>;
	}, (prev, next) => (
	prev.columnCount === next.columnCount &&
	prev.columns === next.columns &&
	prev.headerSpacerWidth === next.headerSpacerWidth &&
	prev.headerWidth === next.headerWidth &&
	prev.scrollLeft === next.scrollLeft &&
	prev.stickyColumnEndLeft === next.stickyColumnEndLeft &&
	prev.stickyColumnCount === next.stickyColumnCount
));

SheetHeaderArea.displayName = 'SheetHeaderArea';

/*
 * Render one empty sticky spacer cell after the left sticky columns.
 */

const SheetStickyColumnSpacerCell = memo((p: {
	left: number;
	rowId?: string | null;
}) => {
	return <div
		className={cn('sheet_ui_cell of abs w_4 h_32 z2', STICKY_SPACER_BG_CSS)}
		data-sheet-sticky-column-spacer='true'
		style={{
			left: p.left,
			position: 'sticky',
			zIndex: 30,
		}}
	/>;
}, (prev, next) => (
	prev.left === next.left &&
	prev.rowId === next.rowId
));

SheetStickyColumnSpacerCell.displayName = 'SheetStickyColumnSpacerCell';

/*
 * Position one spacer row while letting the browser handle sticky-left.
 */

const SheetStickyColumnSpacerSlot = memo((p: {
	left: number;
	rowId?: string | null;
	rowTop: number;
	rowWidth: number;
}) => {
	return <div
		className='abs'
		data-sheet-sticky-column-spacer-slot='true'
		style={{
			height: SHEET_ROW_HEIGHT,
			left: 0,
			top: p.rowTop,
			width: p.rowWidth,
		}}
	>
		<SheetStickyColumnSpacerCell
			left={p.left}
			rowId={p.rowId}
		/>
	</div>;
}, (prev, next) => (
	prev.left === next.left &&
	prev.rowId === next.rowId &&
	prev.rowTop === next.rowTop &&
	prev.rowWidth === next.rowWidth
));

SheetStickyColumnSpacerSlot.displayName = 'SheetStickyColumnSpacerSlot';

/*
 * Render one sticky row number cell.
 */

const SheetRowNumberCell = memo((p: {
	rowId?: string | null;
	rowIndex: number;
	rowNumber: number;
}) => {
	return <div
		className={cn('sheet_ui_row_number of abs bd_r_1 bd_b_1 bd_lt sticky h_center cl_md no_sel z2', STICKY_CELL_BG_CSS)}
		style={{
			height: SHEET_ROW_HEIGHT,
			left: 0,
			position: 'sticky',
			width: SHEET_ROW_NUMBER_WIDTH,
		}}
	>
		{p.rowNumber}
	</div>;
}, (prev, next) => (
	prev.rowId === next.rowId &&
	prev.rowIndex === next.rowIndex &&
	prev.rowNumber === next.rowNumber
));

SheetRowNumberCell.displayName = 'SheetRowNumberCell';

/*
 * Position one virtual row number while letting the browser handle sticky-left.
 */

const SheetRowNumberSlot = memo((p: {
	rowId?: string | null;
	rowIndex: number;
	rowNumber: number;
	rowTop: number;
	rowWidth: number;
}) => {
	return <div
		className='abs'
		data-sheet-row-number-slot='true'
		style={{
			height: SHEET_ROW_HEIGHT,
			left: 0,
			top: p.rowTop,
			width: p.rowWidth,
		}}
	>
		<SheetRowNumberCell
			rowId={p.rowId}
			rowIndex={p.rowIndex}
			rowNumber={p.rowNumber}
		/>
	</div>;
}, (prev, next) => (
	prev.rowId === next.rowId &&
	prev.rowIndex === next.rowIndex &&
	prev.rowNumber === next.rowNumber &&
	prev.rowTop === next.rowTop &&
	prev.rowWidth === next.rowWidth
));

SheetRowNumberSlot.displayName = 'SheetRowNumberSlot';

/*
 * Render the inline editor for one active cell.
 */

const SheetCellEditor = memo((p: {
	cellKey: string;
	column: SheetUIColumn;
	draftValue: string;
	error?: string | null;
	rowId: string;
}) => {
	const editorClassName = cn('sheet_ui_editor bg stock px_6', p.error ? 'error' : '');
	const sharedProps = {
		autoFocus: true,
		className: editorClassName,
		'data-cell-key': p.cellKey,
		'data-field-type': p.column.fieldType,
		'data-row-id': p.rowId,
		'data-sheet-editor': 'true',
	};

	if (p.column.fieldType === 'BOOLEAN') {
		return <select
			{...sharedProps}
			defaultValue={p.draftValue}
		>
			<option value=''></option>
			<option value='true'>TRUE</option>
			<option value='false'>FALSE</option>
		</select>;
	}

	if (p.column.fieldType === 'SELECT') {
		return <select
			{...sharedProps}
			defaultValue={p.draftValue}
		>
			<option value=''></option>
			{p.column.options?.map((option) => (
				<option key={option.value} value={option.value}>
					{option.label}
				</option>
			))}
		</select>;
	}

	if (p.column.fieldType === 'JSON') {
		return <textarea
			{...sharedProps}
			defaultValue={p.draftValue}
		/>;
	}

	const inputType = p.column.fieldType === 'NUMBER'
		? 'number'
		: p.column.fieldType === 'DATE'
			? 'date'
			: p.column.fieldType === 'DATETIME'
				? 'datetime-local'
				: 'text';

	return <input
		{...sharedProps}
		defaultValue={p.draftValue}
		type={inputType}
	/>;
});

SheetCellEditor.displayName = 'SheetCellEditor';

/*
 * Render one visible data cell.
 */

const SheetGridCell = memo((p: {
	cell?: SheetUICell;
	cellLeft: number;
	column: SheetUIColumn;
	columnIndex: number;
	columnWidth: number;
	editState?: SheetUIEditState | null;
	isStickyLeft: boolean;
	rowId?: string | null;
	rowIndex: number;
	rowTop: number;
}) => {
	const isEditing = isSheetGridCellEditing(p);
	const displayValue = p.cell?.displayValue || '';
	const cellClassName = cn(
		'sheet_ui_cell of abs bd_r_1 bd_b_1 bd_lt h_item px_6 cl_df bg_primary_fd_hv_solid',
		isEditing ? 'active' : '',
		p.cell?.canOpen ? 'link cl_primary' : '',
		!p.rowId ? 'noclick' : '',
		!displayValue ? 'cl_darker_2' : '',
		p.isStickyLeft ? STICKY_CELL_BG_CSS : CELL_BG_CSS,
	);

	return <div
		className={cellClassName}
		data-cell-key={p.column.key}
		data-row-id={p.rowId || undefined}
		data-sheet-cell='true'
		data-sheet-cell-editable={p.cell?.canEdit ? 'true' : undefined}
		data-sheet-cell-open-link={p.cell?.canOpen ? 'true' : undefined}
		style={{
			height: SHEET_ROW_HEIGHT,
			left: p.cellLeft,
			top: p.rowTop,
			width: p.columnWidth,
			zIndex: p.isStickyLeft ? 30 : undefined,
		}}
	>
		{isEditing && p.rowId
			? <SheetCellEditor
				cellKey={p.column.key}
				column={p.column}
				draftValue={p.editState?.draftValue || ''}
				error={p.editState?.error}
				rowId={p.rowId}
			/>
			: <span className='ellip'>{displayValue}</span>}
	</div>;
}, (prev, next) => (
	prev.cell === next.cell &&
	prev.cellLeft === next.cellLeft &&
	prev.column.id === next.column.id &&
	prev.column.key === next.column.key &&
	prev.column.label === next.column.label &&
	prev.column.fieldType === next.column.fieldType &&
	prev.columnIndex === next.columnIndex &&
	prev.columnWidth === next.columnWidth &&
	areSheetGridCellEditPropsEqual(prev, next) &&
	prev.isStickyLeft === next.isStickyLeft &&
	prev.rowId === next.rowId &&
	prev.rowIndex === next.rowIndex &&
	prev.rowTop === next.rowTop
));

SheetGridCell.displayName = 'SheetGridCell';

/*
 * Render a virtualized spreadsheet grid from already-computed UI props.
 */

export const SheetUI = memo((p: SheetUIProps) => {
	const sheetSurfaceHeight = p.sheetSurfaceHeight ?? p.canvasHeight;
	const sheetSurfaceTop = p.sheetSurfaceTop ?? 0;

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
			className='sheet_ui_scroll f w_f rel bg ft_xs'
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
					columnCount={p.columnCount}
					columns={p.columns}
					headerSpacerWidth={p.headerSpacerWidth ?? p.headerWidth}
					headerWidth={p.headerWidth}
					scrollLeft={p.scrollLeft}
					stickyColumnEndLeft={p.stickyColumnEndLeft ?? SHEET_ROW_NUMBER_WIDTH}
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
							zIndex: 110,
						}}
					>
						<div className='rel h_f w_f'>
							<div
								className='bg_main noclick'
								data-sheet-column-resize-guide={p.resizeGuide.columnKey}
								style={{
									height: p.resizeGuide.height,
									left: p.resizeGuide.left,
									position: 'absolute',
									top: 0,
									width: 1,
									zIndex: 110,
								}}
							/>
						</div>
					</div>
					: null}

				{p.rows.map((rowSlot) => {
					return <SheetRowNumberSlot
						key={rowSlot.rowKey}
						rowId={rowSlot.rowId}
						rowIndex={rowSlot.rowIndex}
						rowNumber={rowSlot.rowNumber}
						rowTop={rowSlot.rowTop}
						rowWidth={rowSlot.rowWidth}
					/>;
				})}

				{p.rows.map((rowSlot) => {
					return <SheetStickyColumnSpacerSlot
						key={`${rowSlot.rowKey}:sticky-column-spacer`}
						left={p.stickyColumnEndLeft ?? SHEET_ROW_NUMBER_WIDTH}
						rowId={rowSlot.rowId}
						rowTop={rowSlot.rowTop}
						rowWidth={rowSlot.rowWidth}
					/>;
				})}

				{p.rows.map((rowSlot) => {
					return p.columns.map((columnMetric) => {
						const isStickyLeft = isSheetColumnSticky(columnMetric.columnIndex, p.stickyColumnCount);
						const cellLeft = (isStickyLeft ? p.scrollLeft : 0) +
							SHEET_ROW_NUMBER_WIDTH +
							columnMetric.left;

						return <SheetGridCell
							key={`${rowSlot.rowKey}:${columnMetric.column.key}`}
							cell={rowSlot.cellsByKey[columnMetric.column.key]}
							cellLeft={cellLeft}
							column={columnMetric.column}
							columnIndex={columnMetric.columnIndex}
							columnWidth={columnMetric.width}
							editState={p.editState}
							isStickyLeft={isStickyLeft}
							rowId={rowSlot.rowId}
							rowIndex={rowSlot.rowIndex}
							rowTop={rowSlot.rowTop}
						/>;
					});
				})}
			</div>
		</div>
	</div>;
}, (prev, next) => (
	prev.canvasHeight === next.canvasHeight &&
	prev.canvasWidth === next.canvasWidth &&
	prev.cellCount === next.cellCount &&
	prev.className === next.className &&
	prev.columnCount === next.columnCount &&
	prev.columns === next.columns &&
	prev.editState?.rowId === next.editState?.rowId &&
	prev.editState?.cellKey === next.editState?.cellKey &&
	prev.editState?.draftValue === next.editState?.draftValue &&
	prev.editState?.error === next.editState?.error &&
	prev.headerContent === next.headerContent &&
	prev.headerSpacerWidth === next.headerSpacerWidth &&
	prev.headerWidth === next.headerWidth &&
	prev.id === next.id &&
	prev.resizeGuide?.columnKey === next.resizeGuide?.columnKey &&
	prev.resizeGuide?.height === next.resizeGuide?.height &&
	prev.resizeGuide?.left === next.resizeGuide?.left &&
	prev.rows === next.rows &&
	prev.scrollLeft === next.scrollLeft &&
	prev.scrollRef === next.scrollRef &&
	prev.sheetSurfaceHeight === next.sheetSurfaceHeight &&
	prev.sheetSurfaceTop === next.sheetSurfaceTop &&
	prev.stickyColumnEndLeft === next.stickyColumnEndLeft &&
	prev.stickyColumnCount === next.stickyColumnCount &&
	prev.style === next.style
));

SheetUI.displayName = 'SheetUI';

export default SheetUI;
