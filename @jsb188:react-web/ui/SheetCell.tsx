import i18n from '@jsb188/app/i18n/index.ts';
import { cn } from '@jsb188/app/utils/string.ts';
import { memo } from 'react';
import { Icon } from '../svgs/Icon';
import type {
	SheetColumnMetric,
	SheetUICell,
	SheetUIColumn,
	SheetUIColumnReorderDisplacements,
	SheetUIColumnReorderDrag,
	SheetUIColumnReorderGuide,
	SheetUIEditState,
	SheetUIHeaderEditState,
	SheetUIRowSlot,
	SheetUISelectedCellState,
} from './SheetUI';

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

/**
 * Constants; exclusive only to this file
 */

const SHEET_COLUMN_RESIZE_HANDLE_WIDTH = 18;
const SHEET_COLUMN_RESIZE_HANDLE_LEFT_OFFSET = 1;
const SHEET_STICKY_LEFT_Z_INDEX = 34;
const SHEET_STICKY_HEADER_Z_INDEX = 31;
const SHEET_STICKY_LEFT_HEADER_Z_INDEX = 33;
const SHEET_COLUMN_RESIZE_HANDLE_Z_INDEX = 34;
const SHEET_COLUMN_REORDER_GUIDE_Z_INDEX = 35;
const SHEET_COLUMN_REORDER_DRAG_Z_INDEX = 36;
const STICKY_CELL_BG_CSS = 'bg';
const STICKY_SPACER_BG_CSS = 'bg_darker_1';
const CELL_BG_CSS = 'bg';

/*
 * Return whether one visual column should stay pinned to the left edge.
 */

export function isSheetColumnSticky(columnIndex: number, stickyColumnCount?: number | null) {
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
 * Return whether one rendered grid cell is in single-click selected mode.
 */

function isSheetGridCellSelected(p: {
	column: SheetUIColumn;
	rowId?: string | null;
	selectedCellState?: SheetUISelectedCellState | null;
}) {
	return Boolean(p.rowId && p.selectedCellState?.rowId === p.rowId && p.selectedCellState.cellKey === p.column.key);
}

/*
 * Compare selected-cell props only for cells touched by the selected state.
 */

function areSheetGridCellSelectedPropsEqual(
	prev: {
		column: SheetUIColumn;
		rowId?: string | null;
		selectedCellState?: SheetUISelectedCellState | null;
	},
	next: {
		column: SheetUIColumn;
		rowId?: string | null;
		selectedCellState?: SheetUISelectedCellState | null;
	},
) {
	return isSheetGridCellSelected(prev) === isSheetGridCellSelected(next);
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
		prev.editState?.disableInlineEditor === next.editState?.disableInlineEditor &&
		prev.editState?.error === next.editState?.error
	);
}

/*
 * Return whether one row slot is just viewport filler after the data rows.
 */

export function isSheetPlaceholderRowSlot(rowSlot: SheetUIRowSlot) {
	return !rowSlot.rowId && rowSlot.rowNumber === null && !Object.keys(rowSlot.cellsByKey).length;
}

/*
 * Convert an editable hover background class into its selected background class.
 */

function getSheetSingleClickedCellClassName(className: string) {
	return className.split(/\s+/).map((classPart) => {
		if (classPart === 'bg_primary_fd_hv_solid') {
			return 'bg_primary_fd_solid';
		}

		const colorClassMatch = classPart.match(/^bg_(.+)_fd_hv$/);

		if (colorClassMatch) {
			return `bg_${colorClassMatch[1]}_fd`;
		}

		return classPart;
	}).join(' ');
}

/*
 * Return the editable hover background class for one header cell.
 */

function getSheetHeaderEditableClassName() {
	return 'bg_primary_fd_hv_solid';
}

/*
 * Return whether one field type should show the select-style empty placeholder.
 */

function isSheetSelectCellFieldType(fieldType: SheetUIColumn['fieldType']) {
	return (
		fieldType === 'SELECT' ||
		fieldType === 'SELECT_OR_TEXT' ||
		fieldType === 'MULTI_SELECT' ||
		fieldType === 'BOOLEAN'
	);
}

/*
 * Return whether one field type should show the date-style empty placeholder.
 */

function isSheetDateCellFieldType(fieldType: SheetUIColumn['fieldType']) {
	return fieldType === 'DATE' || fieldType === 'DATETIME';
}

/*
 * Return whether one field type should show a picker chevron when selected.
 */

function isSheetChevronCellFieldType(fieldType: SheetUIColumn['fieldType']) {
	return (
		fieldType === 'SELECT' ||
		fieldType === 'SELECT_OR_TEXT' ||
		fieldType === 'MULTI_SELECT' ||
		fieldType === 'BOOLEAN' ||
		fieldType === 'DATE' ||
		fieldType === 'DATETIME'
	);
}

/*
 * Return the visual field type that should drive non-editing cell display.
 */

function getSheetColumnHumanFieldType(column: SheetUIColumn) {
	return column.humanFieldType || column.fieldType;
}

/*
 * Return the display value and muted class for empty picker-style cells.
 */

function getSheetPickerCellDisplayValue(fieldType: SheetUIColumn['fieldType'], displayValue: string) {
	const hasValue = Boolean(displayValue);

	if (hasValue) {
		return {
			className: '',
			value: displayValue,
		};
	}

	if (isSheetDateCellFieldType(fieldType)) {
		return {
			className: 'cl_lt',
			value: i18n.t('form.n_a'),
		};
	}

	return {
		className: isSheetSelectCellFieldType(fieldType) ? 'cl_darker_2' : '',
		value: isSheetSelectCellFieldType(fieldType) ? i18n.t('form.n_a') : displayValue,
	};
}

/*
 * Render the sticky top-left corner cell.
 */

export const SheetCornerCell = memo(() => {
	return <div
		className={cn('sheet_ui_corner abs bd_r_1 bd_b_1 bd_lt sticky z10', STICKY_CELL_BG_CSS)}
		data-sheet-corner-cell='true'
		style={{
			height: SHEET_HEADER_HEIGHT,
			left: 0,
			position: 'sticky',
			top: 0,
			width: SHEET_ROW_NUMBER_WIDTH,
			zIndex: SHEET_STICKY_LEFT_HEADER_Z_INDEX,
		}}
	/>;
});

SheetCornerCell.displayName = 'SheetCornerCell';

/*
 * Render one sheet header cell.
 */

export const SheetHeaderCell = memo((p: {
	column: SheetUIColumn;
	columnIndex: number;
	headerCellsEditable?: boolean;
	headerEditState?: SheetUIHeaderEditState | null;
	headerLeft: number;
	columnWidth: number;
	isStickyLeft: boolean;
	columnReorderEnabled?: boolean;
	columnReorderOffset?: number;
	hasColumnReorderTransition?: boolean;
	isColumnReorderDragging?: boolean;
}) => {
	const isEditing = p.headerEditState?.cellKey === p.column.key;
	const isEditable = Boolean(p.headerCellsEditable && !p.column.humansCannotEdit);
	const isReorderable = Boolean(p.columnReorderEnabled && !isEditing);
	const reorderOffset = p.columnReorderOffset || 0;

	return <div
		className={cn(
			'sheet_ui_header_cell of abs bd_r_1 bd_b_1 bd_lt h_item ft_medium cl_md no_wrap z3',
			isEditable ? getSheetHeaderEditableClassName() : '',
			isEditing ? 'active' : 'px_8',
			!isEditing ? 'unsel' : '',
			STICKY_CELL_BG_CSS,
			p.isColumnReorderDragging ? 'bg' : '',
		)}
		data-cell-key={p.column.key}
		data-sheet-header-cell='true'
		data-sheet-header-editable={isEditable ? 'true' : undefined}
		data-sheet-header-reorderable={isReorderable ? 'true' : undefined}
		style={{
			cursor: isReorderable ? 'grab' : undefined,
			height: SHEET_HEADER_HEIGHT,
			left: p.headerLeft,
			opacity: p.isColumnReorderDragging ? 0.35 : undefined,
			top: 0,
			transform: reorderOffset ? `translateX(${reorderOffset}px)` : undefined,
			transition: p.hasColumnReorderTransition ? 'transform 120ms ease' : undefined,
			width: p.columnWidth,
			zIndex: p.isStickyLeft ? SHEET_STICKY_LEFT_HEADER_Z_INDEX : undefined,
		}}
	>
		{isEditing
			? <input
				autoFocus
				className={cn('sheet_ui_editor bg stock px_8 ft_xs ft_normal', p.headerEditState?.error ? 'error' : '')}
				data-cell-key={p.column.key}
				data-sheet-header-editor='true'
				defaultValue={p.headerEditState?.draftValue || ''}
				type='text'
			/>
			: <span className='ellip'>{p.column.label}</span>}
	</div>;
}, (prev, next) => (
	prev.column.id === next.column.id &&
	prev.column.key === next.column.key &&
	prev.column.label === next.column.label &&
	prev.column.humansCannotEdit === next.column.humansCannotEdit &&
	prev.columnIndex === next.columnIndex &&
	prev.columnReorderEnabled === next.columnReorderEnabled &&
	prev.columnReorderOffset === next.columnReorderOffset &&
	prev.headerCellsEditable === next.headerCellsEditable &&
	prev.headerEditState?.cellKey === next.headerEditState?.cellKey &&
	prev.headerEditState?.draftValue === next.headerEditState?.draftValue &&
	prev.headerEditState?.error === next.headerEditState?.error &&
	prev.headerLeft === next.headerLeft &&
	prev.columnWidth === next.columnWidth &&
	prev.hasColumnReorderTransition === next.hasColumnReorderTransition &&
	prev.isStickyLeft === next.isStickyLeft &&
	prev.isColumnReorderDragging === next.isColumnReorderDragging
));

SheetHeaderCell.displayName = 'SheetHeaderCell';

/*
 * Render one column resize handle outside the header cell stacking context.
 */

export const SheetColumnResizeHandle = memo((p: {
	column: SheetUIColumn;
	columnIndex: number;
	columnWidth: number;
	disabled?: boolean;
	handleLeft: number;
}) => {
	return <div
		aria-label={`Resize ${p.column.label}`}
		aria-orientation='vertical'
		className={cn('abs', p.disabled ? '' : 'cs_back hv_area')}
		data-sheet-column-resize-handle={p.column.key}
		role='separator'
		style={{
			cursor: 'col-resize',
			height: SHEET_HEADER_HEIGHT,
			left: p.handleLeft,
			pointerEvents: p.disabled ? 'none' : 'auto',
			top: 0,
			visibility: p.disabled ? 'hidden' : undefined,
				width: SHEET_COLUMN_RESIZE_HANDLE_WIDTH,
				zIndex: SHEET_COLUMN_RESIZE_HANDLE_Z_INDEX,
		}}
	/>;
}, (prev, next) => (
	prev.column.id === next.column.id &&
	prev.column.key === next.column.key &&
	prev.column.label === next.column.label &&
	prev.columnIndex === next.columnIndex &&
	prev.columnWidth === next.columnWidth &&
	prev.disabled === next.disabled &&
	prev.handleLeft === next.handleLeft
));

SheetColumnResizeHandle.displayName = 'SheetColumnResizeHandle';

/*
 * Render the live column reorder insertion guide.
 */

export const SheetColumnReorderGuide = memo((p: {
	guide: SheetUIColumnReorderGuide;
}) => {
	return <div
		className='bg_active noclick'
		data-sheet-column-reorder-guide={p.guide.columnKey}
		style={{
			height: p.guide.height,
			left: p.guide.left,
			position: 'absolute',
			top: 0,
				width: 2,
				zIndex: SHEET_COLUMN_REORDER_GUIDE_Z_INDEX,
		}}
	/>;
}, (prev, next) => (
	prev.guide.columnKey === next.guide.columnKey &&
	prev.guide.height === next.guide.height &&
	prev.guide.left === next.guide.left
));

SheetColumnReorderGuide.displayName = 'SheetColumnReorderGuide';

/*
 * Render the lightweight header preview shown while a column is dragged.
 */

export const SheetColumnReorderDragPreview = memo((p: {
	drag: SheetUIColumnReorderDrag;
}) => {
	return <div
		className={cn(
			'sheet_ui_header_cell of abs bd_1 bd_lt h_item px_8 ft_medium cl_md no_wrap bg shadow_line_alt unsel noclick',
		)}
		data-sheet-column-reorder-drag={p.drag.columnKey}
		style={{
			height: SHEET_HEADER_HEIGHT,
			left: p.drag.left,
			top: 0,
				width: p.drag.width,
				zIndex: SHEET_COLUMN_REORDER_DRAG_Z_INDEX,
		}}
	>
		<span className='ellip'>{p.drag.label}</span>
	</div>;
}, (prev, next) => (
	prev.drag.columnKey === next.drag.columnKey &&
	prev.drag.label === next.drag.label &&
	prev.drag.left === next.drag.left &&
	prev.drag.width === next.drag.width
));

SheetColumnReorderDragPreview.displayName = 'SheetColumnReorderDragPreview';

/*
 * Render the empty sticky spacer header cell after the left sticky columns.
 */

export const SheetStickyColumnHeaderSpacer = memo((p: {
	left: number;
}) => {
	return <div
		className={cn('sheet_ui_header_cell of abs sticky w_4 h_32 z3', STICKY_SPACER_BG_CSS)}
		data-sheet-sticky-column-header-spacer='true'
		style={{
			left: p.left,
			position: 'sticky',
			top: 0,
			zIndex: SHEET_STICKY_LEFT_HEADER_Z_INDEX,
		}}
	/>;
}, (prev, next) => (
	prev.left === next.left
));

SheetStickyColumnHeaderSpacer.displayName = 'SheetStickyColumnHeaderSpacer';

/*
 * Render the sticky top region and visible column labels.
 */

export const SheetHeaderArea = memo((p: {
	columnReorderDrag?: SheetUIColumnReorderDrag | null;
	columnReorderDisplacements?: SheetUIColumnReorderDisplacements | null;
	columnReorderEnabled?: boolean;
	columnReorderGuide?: SheetUIColumnReorderGuide | null;
	columnCount: number;
	columns: SheetColumnMetric[];
	headerCellsEditable?: boolean;
	headerEditState?: SheetUIHeaderEditState | null;
	headerSpacerWidth: number;
	headerWidth: number;
	scrollLeft: number;
	stickyColumnEndLeft: number;
	stickyColumnCount?: number | null;
}) => {
	return <div
		className='sticky'
		data-sheet-sticky-header='true'
		style={{
			top: 0,
				width: p.headerWidth,
				zIndex: SHEET_STICKY_HEADER_Z_INDEX,
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
				const isColumnReorderDragging = p.columnReorderDrag?.columnKey === columnMetric.column.key;
				const headerLeft = (isStickyLeft ? p.scrollLeft : 0) +
					SHEET_ROW_NUMBER_WIDTH +
					columnMetric.left;

				return <SheetHeaderCell
					key={columnMetric.column.key}
					column={columnMetric.column}
					columnIndex={columnMetric.columnIndex}
					columnReorderEnabled={p.columnReorderEnabled}
					columnReorderOffset={p.columnReorderDisplacements?.[columnMetric.column.key] || 0}
					headerCellsEditable={p.headerCellsEditable}
					headerEditState={p.headerEditState}
					headerLeft={headerLeft}
					columnWidth={columnMetric.width}
					hasColumnReorderTransition={Boolean(p.columnReorderDrag && !isColumnReorderDragging)}
					isStickyLeft={isStickyLeft}
					isColumnReorderDragging={isColumnReorderDragging}
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
						zIndex: SHEET_COLUMN_RESIZE_HANDLE_Z_INDEX,
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
						disabled={Boolean(p.columnReorderDrag)}
						handleLeft={handleLeft}
					/>;
				})}
			</div>

			{p.columnReorderGuide
				? <SheetColumnReorderGuide guide={p.columnReorderGuide} />
				: null}

			{p.columnReorderDrag
				? <SheetColumnReorderDragPreview drag={p.columnReorderDrag} />
				: null}
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
	prev.headerCellsEditable === next.headerCellsEditable &&
	prev.headerEditState?.cellKey === next.headerEditState?.cellKey &&
	prev.headerEditState?.draftValue === next.headerEditState?.draftValue &&
	prev.headerEditState?.error === next.headerEditState?.error &&
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

export const SheetStickyColumnSpacerCell = memo((p: {
	isPlaceholderRow?: boolean;
	left: number;
	rowId?: string | null;
	rowHeight?: number;
}) => {
	return <div
		className={cn(
			'sheet_ui_cell of abs w_4 h_32 z2',
			STICKY_SPACER_BG_CSS,
		)}
		data-sheet-sticky-column-spacer='true'
		style={{
			height: p.rowHeight ?? SHEET_ROW_HEIGHT,
			left: p.left,
			position: 'sticky',
			zIndex: SHEET_STICKY_LEFT_Z_INDEX,
		}}
	/>;
}, (prev, next) => (
	prev.isPlaceholderRow === next.isPlaceholderRow &&
	prev.left === next.left &&
	prev.rowId === next.rowId &&
	prev.rowHeight === next.rowHeight
));

SheetStickyColumnSpacerCell.displayName = 'SheetStickyColumnSpacerCell';

/*
 * Position one spacer row while letting the browser handle sticky-left.
 */

export const SheetStickyColumnSpacerSlot = memo((p: {
	left: number;
	rowId?: string | null;
	rowHeight?: number;
	rowTop: number;
	rowWidth: number;
}) => {
	return <div
		className='abs'
		data-sheet-sticky-column-spacer-slot='true'
		style={{
			height: p.rowHeight ?? SHEET_ROW_HEIGHT,
			left: 0,
			top: p.rowTop,
			width: p.rowWidth,
		}}
	>
		<SheetStickyColumnSpacerCell
			left={p.left}
			rowId={p.rowId}
			rowHeight={p.rowHeight}
		/>
	</div>;
}, (prev, next) => (
	prev.left === next.left &&
	prev.rowId === next.rowId &&
	prev.rowHeight === next.rowHeight &&
	prev.rowTop === next.rowTop &&
	prev.rowWidth === next.rowWidth
));

SheetStickyColumnSpacerSlot.displayName = 'SheetStickyColumnSpacerSlot';

/*
 * Render one sticky row number cell.
 */

export const SheetRowNumberCell = memo((p: {
	isPlaceholderRow?: boolean;
	rowContentHeight?: number;
	rowId?: string | null;
	rowIndex: number;
	rowNumber?: number | null;
	rowHeight?: number;
}) => {
	const rowContentHeight = p.rowContentHeight ?? p.rowHeight ?? SHEET_ROW_HEIGHT;

	return <div
		className={cn(
			'sheet_ui_row_number of abs sticky h_center cl_md no_sel z2',
			'bd_r_1 bd_b_1 bd_lt',
			STICKY_CELL_BG_CSS,
		)}
		style={{
			height: p.rowHeight ?? SHEET_ROW_HEIGHT,
			left: 0,
			position: 'sticky',
			width: SHEET_ROW_NUMBER_WIDTH,
			zIndex: SHEET_STICKY_LEFT_Z_INDEX,
			alignItems: p.rowIndex === 0 ? 'flex-end' : undefined,
		}}
	>
		<span
			className='h_center w_f'
			style={{
				height: rowContentHeight,
			}}
		>
			{p.rowNumber ?? null}
		</span>
	</div>;
}, (prev, next) => (
	prev.isPlaceholderRow === next.isPlaceholderRow &&
	prev.rowContentHeight === next.rowContentHeight &&
	prev.rowId === next.rowId &&
	prev.rowIndex === next.rowIndex &&
	prev.rowNumber === next.rowNumber &&
	prev.rowHeight === next.rowHeight
));

SheetRowNumberCell.displayName = 'SheetRowNumberCell';

/*
 * Position one virtual row number while letting the browser handle sticky-left.
 */

export const SheetRowNumberSlot = memo((p: {
	isPlaceholderRow?: boolean;
	rowId?: string | null;
	rowIndex: number;
	rowNumber?: number | null;
	rowHeight?: number;
	rowTop: number;
	rowWidth: number;
}) => {
	const rowHeight = p.rowHeight ?? SHEET_ROW_HEIGHT;
	const slotHeight = p.rowIndex === 0 ? p.rowTop + rowHeight : rowHeight;
	const slotTop = p.rowIndex === 0 ? 0 : p.rowTop;

	return <div
		className='abs'
		data-sheet-row-number-slot='true'
		style={{
			height: slotHeight,
			left: 0,
			top: slotTop,
			width: p.rowWidth,
		}}
	>
		<SheetRowNumberCell
			isPlaceholderRow={p.isPlaceholderRow}
			rowContentHeight={rowHeight}
			rowId={p.rowId}
			rowIndex={p.rowIndex}
			rowNumber={p.rowNumber}
			rowHeight={slotHeight}
		/>
	</div>;
}, (prev, next) => (
	prev.isPlaceholderRow === next.isPlaceholderRow &&
	prev.rowId === next.rowId &&
	prev.rowIndex === next.rowIndex &&
	prev.rowNumber === next.rowNumber &&
	prev.rowHeight === next.rowHeight &&
	prev.rowTop === next.rowTop &&
	prev.rowWidth === next.rowWidth
));

SheetRowNumberSlot.displayName = 'SheetRowNumberSlot';

/*
 * Render the left-sticky cover cell for the top-left header and spacer band.
 */

export const SheetTopLeftRowNumberSlot = memo((p: {
	rowWidth: number;
}) => {
	const rowHeight = SHEET_HEADER_HEIGHT + SHEET_STICKY_SPACER_SIZE;

	return <div
		className='abs'
		data-sheet-row-number-slot='true'
		style={{
			height: rowHeight,
			left: 0,
			top: 0,
			width: p.rowWidth,
		}}
	>
		<div
			className={cn(
				'sheet_ui_row_number of abs sticky h_center cl_md no_sel z2',
				'bd_r_1 bd_lt',
				STICKY_CELL_BG_CSS,
			)}
			style={{
				height: rowHeight,
				left: 0,
				position: 'sticky',
				width: SHEET_ROW_NUMBER_WIDTH,
				zIndex: SHEET_STICKY_LEFT_Z_INDEX,
			}}
		/>
	</div>;
}, (prev, next) => (
	prev.rowWidth === next.rowWidth
));

SheetTopLeftRowNumberSlot.displayName = 'SheetTopLeftRowNumberSlot';

/*
 * Render a sheet cell value with a consistent icon, text, and picker affordance.
 */

export const SheetCellDisplayValue = memo((p: {
	canOpen?: boolean;
	className?: string;
	displayClassName?: string;
	displayValue: string;
	fill?: boolean;
	iconName?: string | null;
	showSelectChevron?: boolean;
}) => {
	const valueClassName = p.displayClassName || 'ellip';
	const openProps = p.canOpen
		? {
			'data-sheet-cell-open-trigger': 'true',
			role: 'button',
			tabIndex: 0,
		}
		: {};

	return <>
		{p.iconName
			? <span
				className={cn('h_item ellip', p.fill && 'g_fill', p.canOpen && 'link u', p.className)}
				{...openProps}
			>
				<span className='ic_sm mr_5 no_shrink'>
					<Icon name={p.iconName} />
				</span>
				<span className={valueClassName}>{p.displayValue}</span>
			</span>
			: <span
				className={cn(p.fill && 'g_fill', valueClassName, p.canOpen && 'link u', p.className)}
				{...openProps}
			>{p.displayValue}</span>}

		{p.showSelectChevron
			? <span className='ic_sm no_shrink ml_4 cl_darker_3'>
				<Icon name='chevron-down' />
			</span>
			: null}
	</>;
});

SheetCellDisplayValue.displayName = 'SheetCellDisplayValue';

/*
 * Render the inline editor for one active cell.
 */

export const SheetCellEditor = memo((p: {
	cell?: SheetUICell;
	cellKey: string;
	column: SheetUIColumn;
	draftValue: string;
	error?: string | null;
	rowId: string;
}) => {
	const editorClassName = cn('sheet_ui_editor bg stock px_6 ft_xs ft_normal', p.error ? 'error' : '');
	const sharedProps = {
		autoFocus: true,
		className: editorClassName,
		'data-cell-key': p.cellKey,
		'data-field-type': p.column.fieldType,
		'data-row-id': p.rowId,
		'data-sheet-editor': 'true',
	};

	if (
		p.column.fieldType === 'SELECT' ||
		p.column.fieldType === 'SELECT_OR_TEXT' ||
		p.column.fieldType === 'MULTI_SELECT' ||
		p.column.fieldType === 'BOOLEAN' ||
		p.column.fieldType === 'DATE' ||
		p.column.fieldType === 'DATETIME'
	) {
		const displayValue = p.cell?.displayValue || p.draftValue;
		const pickerDisplay = getSheetPickerCellDisplayValue(p.column.fieldType, displayValue);
		const iconName = p.cell?.iconName || '';

		return <div
			className='h_item w_f px_6 unsel'
			data-cell-key={p.cellKey}
			data-field-type={p.column.fieldType}
			data-row-id={p.rowId}
			data-sheet-editor='true'
			onClick={() => {}}
			tabIndex={0}
			>
				<SheetCellDisplayValue
					canOpen={p.cell?.canOpen}
					className={pickerDisplay.className}
					displayClassName={p.cell?.displayClassName}
					displayValue={pickerDisplay.value}
					fill
					iconName={iconName}
					showSelectChevron
				/>
			</div>;
		}

	if (p.column.fieldType === 'JSON') {
		return <textarea
			{...sharedProps}
			defaultValue={p.draftValue}
		/>;
	}

	const inputType = p.column.fieldType === 'NUMBER'
		? 'number'
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

export const SheetGridCell = memo((p: {
	cell?: SheetUICell;
	cellLeft: number;
	column: SheetUIColumn;
	columnIndex: number;
	columnWidth: number;
	editState?: SheetUIEditState | null;
	isPlaceholderRow?: boolean;
	isStickyLeft: boolean;
	rowHeight?: number;
	rowId?: string | null;
	rowIndex: number;
	rowTop: number;
	selectedCellState?: SheetUISelectedCellState | null;
}) => {

	const isEditable = p.cell?.canEdit;
	const isEditing = isSheetGridCellEditing(p);
	const shouldRenderInlineEditor = isEditing && !p.editState?.disableInlineEditor;
  const isInlineEditing = shouldRenderInlineEditor && !!p.rowId;
	const isSelected = !isEditing && isSheetGridCellSelected(p);
	const displayValue = p.cell?.displayValue || '';
	const displayFieldType = getSheetColumnHumanFieldType(p.column);
	const pickerDisplay = getSheetPickerCellDisplayValue(displayFieldType, displayValue);
	const iconName = p.cell?.iconName || '';
	const isReadOnlyCell = Boolean(p.rowId && p.cell && !isEditable);
	const editableCellClassName = isEditable
		? isSelected
			? getSheetSingleClickedCellClassName(p.cell?.cellClassName || 'bg_primary_fd_hv_solid')
			: p.cell?.cellClassName || 'bg_primary_fd_hv_solid'
		: '';
	const cellClassName = cn(
		'sheet_ui_cell of abs h_item cl_df',
		editableCellClassName,
		p.isPlaceholderRow ? '' : 'bd_r_1 bd_b_1 bd_lt',
		isEditing || (isSelected && !isEditable) ? 'active z4' : '',
		// !isEditing || !isInlineEditing ? 'px_6 unsel' : '',
		!isInlineEditing ? 'px_6 unsel' : '',
		isEditable && isSelected && !isEditing ? 'pointer' : '',
		// p.cell?.canOpen ? 'link' : '', // Don't use .link class
		!p.rowId ? 'noclick' : '',
		isReadOnlyCell ? 'not_editable' : '',
		!displayValue && !isSheetDateCellFieldType(displayFieldType) ? 'cl_darker_2' : '',
		p.isStickyLeft ? STICKY_CELL_BG_CSS : CELL_BG_CSS,
	);

	return <div
		className={cellClassName}
		data-cell-key={p.column.key}
		data-row-id={p.rowId || undefined}
		data-sheet-cell='true'
		data-sheet-cell-editable={isEditable ? 'true' : undefined}
		data-sheet-cell-open-link={p.cell?.canOpen ? 'true' : undefined}
		style={{
			height: p.rowHeight ?? SHEET_ROW_HEIGHT,
			left: p.cellLeft,
			top: p.rowTop,
			width: p.columnWidth,
			zIndex: p.isStickyLeft ? SHEET_STICKY_LEFT_Z_INDEX : undefined,
		}}
	>
		{isInlineEditing
			? <SheetCellEditor
				cell={p.cell}
				cellKey={p.column.key}
				column={p.column}
				draftValue={p.editState?.draftValue || ''}
				error={p.editState?.error}
				rowId={p.rowId!}
				/>
				: <SheetCellDisplayValue
					canOpen={p.cell?.canOpen}
					className={pickerDisplay.className}
					displayClassName={p.cell?.displayClassName}
					displayValue={pickerDisplay.value}
					iconName={iconName}
					showSelectChevron={isSelected && isSheetChevronCellFieldType(p.column.fieldType)}
				/>}
	</div>;
}, (prev, next) => (
	prev.cell === next.cell &&
	prev.cellLeft === next.cellLeft &&
	prev.column.id === next.column.id &&
	prev.column.key === next.column.key &&
	prev.column.label === next.column.label &&
	prev.column.fieldType === next.column.fieldType &&
	prev.column.humanFieldType === next.column.humanFieldType &&
	prev.columnIndex === next.columnIndex &&
	prev.columnWidth === next.columnWidth &&
	areSheetGridCellEditPropsEqual(prev, next) &&
	areSheetGridCellSelectedPropsEqual(prev, next) &&
	prev.isPlaceholderRow === next.isPlaceholderRow &&
	prev.isStickyLeft === next.isStickyLeft &&
	prev.rowHeight === next.rowHeight &&
	prev.rowId === next.rowId &&
	prev.rowIndex === next.rowIndex &&
	prev.rowTop === next.rowTop
));

SheetGridCell.displayName = 'SheetGridCell';

/*
 * Render one blank filler cell for a placeholder row after the row number.
 */

export const SheetPlaceholderRowFillCell = memo((p: {
	contentWidth?: number;
	rowHeight?: number;
	rowTop: number;
	rowWidth: number;
}) => {
	const fillWidth = Math.max(0, (p.contentWidth ?? p.rowWidth) - SHEET_ROW_NUMBER_WIDTH);

	return <div
		className={cn('sheet_ui_cell of abs bd_r_1 bd_b_1 bd_lt h_item px_6 cl_df bg_primary_fd_hv_solid noclick', CELL_BG_CSS)}
		data-sheet-cell='true'
		data-sheet-placeholder-row-fill-cell='true'
		style={{
			height: p.rowHeight ?? SHEET_ROW_HEIGHT,
			left: SHEET_ROW_NUMBER_WIDTH,
			top: p.rowTop,
			width: fillWidth,
		}}
	/>;
}, (prev, next) => (
	prev.contentWidth === next.contentWidth &&
	prev.rowHeight === next.rowHeight &&
	prev.rowTop === next.rowTop &&
	prev.rowWidth === next.rowWidth
));

SheetPlaceholderRowFillCell.displayName = 'SheetPlaceholderRowFillCell';
