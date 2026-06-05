import { cn } from '@jsb188/app/utils/string.ts';
import { memo, useSyncExternalStore, type CSSProperties } from 'react';
import { TooltipButton } from '../modules/PopOver';
import { Icon } from '../svgs/Icon';
import type {
	SheetColumnMetric,
	SheetUICell,
	SheetUIColumn,
	SheetUIColumnReorderDisplacements,
	SheetUIColumnReorderDrag,
	SheetUIColumnReorderGuide,
	SheetUIEditState,
	SheetUICellRenderStore,
	SheetUIHeaderEditState,
	SheetUIRowSlot,
	SheetUISelectedCellKeyMap,
	SheetUISelectedCellState,
} from './SheetUI';

/**
 * Constants
 */

export const SHEET_COLUMN_WIDTH = 160;
export const SHEET_COLUMN_MIN_WIDTH = 72;
export const SHEET_COLUMN_MAX_WIDTH = 640;
export const SHEET_ROW_NUMBER_WIDTH = 38;
export const SHEET_ROW_HEIGHT = 32;
export const SHEET_ROW_MIN_HEIGHT = 22;
export const SHEET_ROW_MAX_HEIGHT = 240;
export const SHEET_HEADER_HEIGHT = 28;
export const SHEET_STICKY_SPACER_SIZE = 4;

/**
 * Constants; exclusive only to this file
 */

const SHEET_COLUMN_RESIZE_HANDLE_WIDTH = 18;
const SHEET_COLUMN_RESIZE_HANDLE_LEFT_OFFSET = 1;
const SHEET_ROW_RESIZE_HANDLE_HEIGHT = 12;
const SHEET_ROW_RESIZE_HANDLE_TOP_OFFSET = 1;
const SHEET_STICKY_LEFT_Z_INDEX = 34;
const SHEET_STICKY_HEADER_Z_INDEX = 31;
const SHEET_STICKY_LEFT_HEADER_Z_INDEX = 32;
const SHEET_ACTIVE_HEADER_Z_INDEX = 33;
const SHEET_COLUMN_RESIZE_HANDLE_Z_INDEX = 34;
const SHEET_ROW_RESIZE_HANDLE_Z_INDEX = 34;
const SHEET_COLUMN_REORDER_GUIDE_Z_INDEX = 35;
const SHEET_COLUMN_REORDER_DRAG_Z_INDEX = 36;
const STICKY_CELL_BG_CSS = 'bg';
const STICKY_SPACER_BG_CSS = 'bg_darker_1';
const CELL_BG_CSS = 'bg';
const SHEET_DEFAULT_CELL_CLASS_NAME = 'bg_main_fd_hv';
const SHEET_SELECT_DEFAULT_CELL_CLASS_NAME = 'bg_zinc_fd_hv';

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
 * Return whether one rendered grid cell is included in the selected range.
 */

function isSheetGridCellSelected(p: {
	column: SheetUIColumn;
	rowId?: string | null;
	selectedCellKeyMap?: SheetUISelectedCellKeyMap | null;
	selectedCellState?: SheetUISelectedCellState | null;
}) {
	const cellRenderKey = p.rowId ? `${p.rowId}:${p.column.key}` : '';

	return Boolean(
		p.rowId &&
		(
			p.selectedCellKeyMap?.[cellRenderKey] ||
			(p.selectedCellState?.rowId === p.rowId && p.selectedCellState.cellKey === p.column.key)
		),
	);
}

/*
 * Return whether one rendered grid cell is the active selected cell.
 */

function isSheetGridCellActiveSelected(p: {
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
		selectedCellKeyMap?: SheetUISelectedCellKeyMap | null;
		selectedCellState?: SheetUISelectedCellState | null;
	},
	next: {
		column: SheetUIColumn;
		rowId?: string | null;
		selectedCellKeyMap?: SheetUISelectedCellKeyMap | null;
		selectedCellState?: SheetUISelectedCellState | null;
	},
) {
	return (
		isSheetGridCellSelected(prev) === isSheetGridCellSelected(next) &&
		isSheetGridCellActiveSelected(prev) === isSheetGridCellActiveSelected(next)
	);
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
 * Return the per-cell render snapshot from the optional Sheet render store.
 */

function useSheetGridCellRenderSnapshot(p: {
	cell?: SheetUICell;
	cellStore?: SheetUICellRenderStore;
	column: SheetUIColumn;
	editState?: SheetUIEditState | null;
	rowId?: string | null;
	selectedCellKeyMap?: SheetUISelectedCellKeyMap | null;
	selectedCellState?: SheetUISelectedCellState | null;
}) {
	const rowId = p.rowId || '';
	const cellKey = p.column.key;
	const fallbackSnapshot = {
		active: isSheetGridCellActiveSelected(p),
		cell: p.cell,
		editState: isSheetGridCellEditing(p) ? p.editState : null,
		selected: isSheetGridCellSelected(p),
	};

	return useSyncExternalStore(
		(listener) => {
			if (!p.cellStore || !rowId) {
				return () => {};
			}

			return p.cellStore.subscribe(rowId, cellKey, listener);
		},
		() => {
			if (!p.cellStore || !rowId) {
				return fallbackSnapshot;
			}

			return p.cellStore.getSnapshot(rowId, cellKey);
		},
		() => fallbackSnapshot,
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
		const colorClassMatch = classPart.match(/^(bg_.+_fd(?:_solid)?)_hv$/);

		if (colorClassMatch) {
			return colorClassMatch[1];
		}

		return classPart;
	}).join(' ');
}

/*
 * Return cell classes that will not override an inline custom background color.
 */

function getSheetCustomBackgroundCellClassName(className: string) {
	return className.split(/\s+/).filter((classPart) => !/^bg_/.test(classPart)).join(' ');
}

/*
 * Return the fallback hover background for a sheet cell without a custom color.
 */

function getSheetDefaultCellClassName(fieldType: SheetUIColumn['fieldType']) {
	return fieldType === 'SELECT' || fieldType === 'SELECT_OR_TEXT'
		? SHEET_SELECT_DEFAULT_CELL_CLASS_NAME
		: SHEET_DEFAULT_CELL_CLASS_NAME;
}

/*
 * Return the editable hover background class for one header cell.
 */

function getSheetHeaderEditableClassName() {
	return 'bg_alt_hv';
}

/*
 * Remove hover utility classes from header class names so edit access owns hover behavior.
 */

function getSheetHeaderClassNameWithoutHoverUtilities(className?: string | null) {
	return (className || '').split(/\s+/).filter((classPart) => classPart && !/_hv$/.test(classPart)).join(' ');
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
	return fieldType === 'DATE' || fieldType === 'WEEK_OF_MON' || fieldType === 'WEEK_OF_SUN' || fieldType === 'DATETIME';
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
		fieldType === 'WEEK_OF_MON' ||
		fieldType === 'WEEK_OF_SUN' ||
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
			hasValue,
			value: displayValue,
		};
	}

	if (isSheetDateCellFieldType(fieldType)) {
		return {
			className: 'cl_lt',
			hasValue,
			value: '',
		};
	}

	return {
		className: isSheetSelectCellFieldType(fieldType) ? 'cl_darker_2' : '',
		hasValue,
		value: displayValue,
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
	isColumnResizeDragging?: boolean;
	selectedHeaderCellKey?: string | null;
	cursorClassName?: string;
	tooltipClosesWhilePointerDown?: boolean;
}) => {
	const isEditing = p.headerEditState?.cellKey === p.column.key;
	const isSelected = !isEditing && p.selectedHeaderCellKey === p.column.key;
	const isEditable = Boolean(p.headerCellsEditable);
	const isReorderable = Boolean(p.columnReorderEnabled && !isEditing);
	const reorderOffset = p.columnReorderOffset || 0;
	const defaultCellClassName = getSheetHeaderEditableClassName();
	const defaultSelectedCellClassName = 'bg_alt';
	const headerLayoutClassName = p.column.headerLayoutClassName || 'h_item';

	const displayContent = <>
		{p.column.headerCheckboxEnabled
			? <input
				aria-label={p.column.label}
				checked={Boolean(p.column.headerChecked)}
				className='no_shrink mr_6'
				data-cell-key={p.column.key}
				data-sheet-header-checkbox='true'
				onChange={() => {}}
				onClick={(event) => {
					event.stopPropagation();
				}}
				onPointerDown={(event) => {
					event.stopPropagation();
				}}
				readOnly
				type='checkbox'
			/>
			: null}
		<span className='ellip'>{p.column.label}</span>
	</>;

	return <div
		className={cn(
			'sheet_ui_header_cell of abs bd_r_1 bd_b_1 bd_lt ft_xs ft_medium cl_md no_wrap z3',
			headerLayoutClassName,
			getSheetHeaderClassNameWithoutHoverUtilities(p.column.headerClassName),
			isReorderable ? (p.cursorClassName ?? 'cs_default_to_grabing') : '',
			isEditable ? defaultCellClassName : '',
			isEditing ? 'active' : 'px_8',
			isSelected ? `single_clicked ${defaultSelectedCellClassName}` : isEditing ? '' : 'bg',
			!isEditing ? 'unsel' : '',
			p.isColumnResizeDragging ? 'sheet_ui_header_resize_active' : '',
			STICKY_CELL_BG_CSS,
			// p.isColumnReorderDragging ? 'bg' : '',
		)}
		data-cell-key={p.column.key}
		data-sheet-header-cell='true'
		data-sheet-header-editable={isEditable ? 'true' : undefined}
		data-sheet-header-reorderable={isReorderable ? 'true' : undefined}
		data-sheet-header-checkbox-enabled={p.column.headerCheckboxEnabled ? 'true' : undefined}
		style={{
			height: SHEET_HEADER_HEIGHT,
			left: p.headerLeft,
			opacity: p.isColumnReorderDragging ? 0.35 : undefined,
			top: 0,
			transform: reorderOffset ? `translateX(${reorderOffset}px)` : undefined,
			transition: p.hasColumnReorderTransition ? 'transform 120ms ease' : undefined,
			width: p.columnWidth,
			zIndex: isEditing ? SHEET_ACTIVE_HEADER_Z_INDEX : p.isStickyLeft ? SHEET_STICKY_LEFT_HEADER_Z_INDEX : undefined,
		}}
	>
		{isEditing
			? <input
				autoFocus
				className={cn('sheet_ui_editor stock px_8 ft_xs ft_normal', defaultSelectedCellClassName, p.headerEditState?.error ? 'error' : '')}
				data-cell-key={p.column.key}
				data-sheet-header-editor='true'
				defaultValue={p.headerEditState?.draftValue || ''}
				type='text'
			/>
			: p.column.headerTooltipMessage
				? <TooltipButton
					as='div'
					className='h_item min_w_0 w_f h_f'
					closeWhilePointerDown={p.tooltipClosesWhilePointerDown}
					message={p.column.headerTooltipMessage}
					position='top'
				>
					{displayContent}
				</TooltipButton>
				: displayContent}
	</div>;
}, (prev, next) => (
	prev.column.id === next.column.id &&
	prev.column.key === next.column.key &&
	prev.column.label === next.column.label &&
	prev.column.headerCheckboxEnabled === next.column.headerCheckboxEnabled &&
	prev.column.headerChecked === next.column.headerChecked &&
	prev.column.headerClassName === next.column.headerClassName &&
	prev.column.headerLayoutClassName === next.column.headerLayoutClassName &&
	prev.column.headerTooltipMessage === next.column.headerTooltipMessage &&
	prev.column.humansCannotEdit === next.column.humansCannotEdit &&
	prev.columnIndex === next.columnIndex &&
	prev.columnReorderEnabled === next.columnReorderEnabled &&
	prev.columnReorderOffset === next.columnReorderOffset &&
	prev.cursorClassName === next.cursorClassName &&
	prev.headerCellsEditable === next.headerCellsEditable &&
	prev.tooltipClosesWhilePointerDown === next.tooltipClosesWhilePointerDown &&
	prev.headerEditState?.cellKey === next.headerEditState?.cellKey &&
	prev.headerEditState?.draftValue === next.headerEditState?.draftValue &&
	prev.headerEditState?.error === next.headerEditState?.error &&
	prev.selectedHeaderCellKey === next.selectedHeaderCellKey &&
	prev.headerLeft === next.headerLeft &&
	prev.columnWidth === next.columnWidth &&
	prev.hasColumnReorderTransition === next.hasColumnReorderTransition &&
	prev.isStickyLeft === next.isStickyLeft &&
	prev.isColumnReorderDragging === next.isColumnReorderDragging &&
	prev.isColumnResizeDragging === next.isColumnResizeDragging
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
		data-sheet-column-resize-handle={p.column.id}
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
			'sheet_ui_header_cell of abs bd_1 bd_lt h_item px_8 ft_xs ft_medium cl_md no_wrap bg shadow_line_alt unsel noclick',
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
		className={cn('sheet_ui_header_cell of abs sticky w_4 z4', STICKY_SPACER_BG_CSS)}
		data-sheet-sticky-column-header-spacer='true'
		style={{
			height: SHEET_HEADER_HEIGHT,
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
	headerCursorClassName?: string;
	headerTooltipClosesWhilePointerDown?: boolean;
	headerEditState?: SheetUIHeaderEditState | null;
	selectedHeaderCellKey?: string | null;
	headerSpacerWidth: number;
	headerWidth: number;
	scrollLeft: number;
	isColumnResizeDragging?: boolean;
	stickyColumnEndLeft: number;
	stickyColumnCount?: number | null;
	rowHeaderWidth?: number;
	showRowNumbers?: boolean;
}) => {
	const rowHeaderWidth = p.rowHeaderWidth ?? SHEET_ROW_NUMBER_WIDTH;
	const showRowNumbers = p.showRowNumbers !== false;

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
			{showRowNumbers ? <SheetCornerCell /> : null}

			<SheetStickyColumnHeaderSpacer
				left={p.stickyColumnEndLeft}
			/>

			{p.columns.map((columnMetric) => {
				const isStickyLeft = isSheetColumnSticky(columnMetric.columnIndex, p.stickyColumnCount);
				const isColumnReorderDragging = p.columnReorderDrag?.columnKey === columnMetric.column.key;
				const headerLeft = (isStickyLeft ? p.scrollLeft : 0) +
					rowHeaderWidth +
					columnMetric.left;

				return <SheetHeaderCell
					key={columnMetric.column.id}
					column={columnMetric.column}
					columnIndex={columnMetric.columnIndex}
					columnReorderEnabled={p.columnReorderEnabled}
					columnReorderOffset={p.columnReorderDisplacements?.[columnMetric.column.key] || 0}
					headerCellsEditable={p.headerCellsEditable}
					cursorClassName={p.headerCursorClassName}
					tooltipClosesWhilePointerDown={p.headerTooltipClosesWhilePointerDown}
					headerEditState={p.headerEditState}
					selectedHeaderCellKey={p.selectedHeaderCellKey}
					headerLeft={headerLeft}
					columnWidth={columnMetric.width}
					hasColumnReorderTransition={Boolean(p.columnReorderDrag && !isColumnReorderDragging)}
					isStickyLeft={isStickyLeft}
					isColumnReorderDragging={isColumnReorderDragging}
					isColumnResizeDragging={p.isColumnResizeDragging}
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
						rowHeaderWidth +
						columnMetric.left +
						columnMetric.width -
						SHEET_COLUMN_RESIZE_HANDLE_WIDTH / 2 -
						SHEET_COLUMN_RESIZE_HANDLE_LEFT_OFFSET;

					return <SheetColumnResizeHandle
						key={columnMetric.column.id}
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
	prev.headerCursorClassName === next.headerCursorClassName &&
	prev.headerTooltipClosesWhilePointerDown === next.headerTooltipClosesWhilePointerDown &&
	prev.headerEditState?.cellKey === next.headerEditState?.cellKey &&
	prev.headerEditState?.draftValue === next.headerEditState?.draftValue &&
	prev.headerEditState?.error === next.headerEditState?.error &&
	prev.selectedHeaderCellKey === next.selectedHeaderCellKey &&
	prev.headerSpacerWidth === next.headerSpacerWidth &&
	prev.headerWidth === next.headerWidth &&
	prev.isColumnResizeDragging === next.isColumnResizeDragging &&
	prev.scrollLeft === next.scrollLeft &&
	prev.rowHeaderWidth === next.rowHeaderWidth &&
	prev.showRowNumbers === next.showRowNumbers &&
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
	deleted?: boolean;
	left: number;
	rowId?: string | null;
	rowHeight?: number;
	rowTop: number;
	rowWidth: number;
}) => {
	return <div
		className={cn('abs', p.deleted ? '__deleted' : '')}
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
		prev.deleted === next.deleted &&
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
	deleted?: boolean;
	isPlaceholderRow?: boolean;
	rowContentHeight?: number;
	rowId?: string | null;
	rowIndex: number;
	rowNumber?: number | null;
	rowHeight?: number;
	rowResizeEnabled?: boolean;
}) => {
	const rowContentHeight = p.rowContentHeight ?? p.rowHeight ?? SHEET_ROW_HEIGHT;

	return <div
		className={cn(
				'sheet_ui_row_number of abs sticky h_center ft_xs cl_md no_sel z2',
				'bd_lt',
				p.deleted ? '__deleted' : '',
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
		prev.deleted === next.deleted &&
		prev.isPlaceholderRow === next.isPlaceholderRow &&
	prev.rowContentHeight === next.rowContentHeight &&
	prev.rowId === next.rowId &&
	prev.rowIndex === next.rowIndex &&
	prev.rowNumber === next.rowNumber &&
	prev.rowHeight === next.rowHeight &&
	prev.rowResizeEnabled === next.rowResizeEnabled
));

SheetRowNumberCell.displayName = 'SheetRowNumberCell';

/*
 * Render one row resize handle outside the row number cell stacking context.
 */

export const SheetRowResizeHandle = memo((p: {
	disabled?: boolean;
	rowHeight: number;
	rowId?: string | null;
	rowIndex: number;
	rowTop: number;
	rowWidth: number;
}) => {
	return <div
		aria-label={`Resize row ${p.rowIndex + 1}`}
		aria-orientation='horizontal'
		className={cn('abs', p.disabled ? '' : 'cs_back hv_area')}
		data-row-id={p.rowId || undefined}
		data-row-index={p.rowIndex}
		data-sheet-row-resize-handle={p.rowId || String(p.rowIndex)}
		role='separator'
		style={{
			cursor: 'row-resize',
			height: SHEET_ROW_RESIZE_HANDLE_HEIGHT,
			left: 0,
			pointerEvents: p.disabled ? 'none' : 'auto',
			top: p.rowTop + p.rowHeight - SHEET_ROW_RESIZE_HANDLE_HEIGHT / 2 - SHEET_ROW_RESIZE_HANDLE_TOP_OFFSET,
			visibility: p.disabled ? 'hidden' : undefined,
			width: p.rowWidth,
			zIndex: SHEET_ROW_RESIZE_HANDLE_Z_INDEX,
		}}
	/>;
}, (prev, next) => (
	prev.disabled === next.disabled &&
	prev.rowHeight === next.rowHeight &&
	prev.rowId === next.rowId &&
	prev.rowIndex === next.rowIndex &&
	prev.rowTop === next.rowTop &&
	prev.rowWidth === next.rowWidth
));

SheetRowResizeHandle.displayName = 'SheetRowResizeHandle';

/*
 * Position one virtual row number while letting the browser handle sticky-left.
 */

export const SheetRowNumberSlot = memo((p: {
	deleted?: boolean;
	isPlaceholderRow?: boolean;
	rowId?: string | null;
	rowIndex: number;
	rowNumber?: number | null;
	rowHeight?: number;
	rowResizeEnabled?: boolean;
	rowTop: number;
	rowWidth: number;
}) => {
	const rowHeight = p.rowHeight ?? SHEET_ROW_HEIGHT;

	return <div
		className={cn('abs', p.deleted ? '__deleted' : '')}
		data-sheet-row-number-slot='true'
		style={{
			height: rowHeight,
			left: 0,
			top: p.rowTop,
			width: p.rowWidth,
		}}
	>
		<SheetRowNumberCell
			deleted={p.deleted}
			isPlaceholderRow={p.isPlaceholderRow}
			rowContentHeight={rowHeight}
			rowId={p.rowId}
			rowIndex={p.rowIndex}
			rowNumber={p.rowNumber}
			rowHeight={rowHeight}
			rowResizeEnabled={p.rowResizeEnabled}
		/>

		{p.rowResizeEnabled
			? <SheetRowResizeHandle
				rowHeight={rowHeight}
				rowId={p.rowId}
				rowIndex={p.rowIndex}
				rowTop={0}
				rowWidth={SHEET_ROW_NUMBER_WIDTH}
			/>
			: null}
	</div>;
	}, (prev, next) => (
		prev.deleted === next.deleted &&
		prev.isPlaceholderRow === next.isPlaceholderRow &&
	prev.rowId === next.rowId &&
	prev.rowIndex === next.rowIndex &&
	prev.rowNumber === next.rowNumber &&
	prev.rowHeight === next.rowHeight &&
	prev.rowResizeEnabled === next.rowResizeEnabled &&
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
				'sheet_ui_row_number of abs sticky h_center ft_xs cl_md no_sel z2',
				'',
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
	isCellActive?: boolean;
	showSelectChevron?: boolean;
}) => {
	const valueClassName = p.displayClassName || '';
	const clippedValueStyle: CSSProperties = {
		maxWidth: '100%',
		minWidth: 0,
		overflow: 'hidden',
		textOverflow: 'clip',
		whiteSpace: 'nowrap',
	};
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
				style={clippedValueStyle}
				{...openProps}
			>
				<span className='ic_sm mr_5 no_shrink'>
					<Icon name={p.iconName} />
				</span>
				<span className={valueClassName} style={clippedValueStyle}>{p.displayValue}</span>
			</span>
			: <span
				className={cn(p.fill && 'g_fill', valueClassName, p.canOpen && 'link u', p.className)}
				style={clippedValueStyle}
				{...openProps}
			>{p.displayValue}</span>}

		{p.showSelectChevron
			? <span className={cn('ic_sm no_shrink ml_4 cl_darker_3', p.isCellActive && 'target op_0')}>
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
	const editorClassName = cn('sheet_ui_editor bg stock px_8 ft_xs ft_normal', p.error ? 'error' : '');
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
		p.column.fieldType === 'WEEK_OF_MON' ||
		p.column.fieldType === 'WEEK_OF_SUN' ||
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
          isCellActive
					iconName={iconName}
					showSelectChevron={pickerDisplay.hasValue}
				/>
			</div>;
		}

	if (p.column.fieldType === 'JSON') {
		return <textarea
			{...sharedProps}
			defaultValue={p.draftValue}
		/>;
	}

	const inputType = p.column.fieldType === 'NUMBER' || p.column.fieldType === 'PRICE'
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
	cellStore?: SheetUICellRenderStore;
	cellLeft: number;
	column: SheetUIColumn;
	columnIndex: number;
	columnWidth: number;
	editState?: SheetUIEditState | null;
	isPlaceholderRow?: boolean;
	isStickyLeft: boolean;
	rowHeight?: number;
	rowDeleted?: boolean;
	rowId?: string | null;
	rowIndex: number;
	rowTop: number;
	selectedCellKeyMap?: SheetUISelectedCellKeyMap | null;
	selectedCellState?: SheetUISelectedCellState | null;
	renderCallback?: (rowId: string | null, cellKey: string) => void;
}) => {
	p.renderCallback?.(p.rowId || null, p.column.key);

	const cellSnapshot = useSheetGridCellRenderSnapshot(p);
	const cell = cellSnapshot.cell;
	const editState = cellSnapshot.editState || null;
	const isEditable = !p.rowDeleted && cell?.canEdit;
	const isEditing = Boolean(editState);
	const shouldRenderInlineEditor = isEditing && !editState?.disableInlineEditor;
	const isInlineEditing = shouldRenderInlineEditor && !!p.rowId;
	const isSelected = !isEditing && Boolean(cellSnapshot.selected);
	const isSelectionActive = isSelected && Boolean(cellSnapshot.active);
	const isCellActive = isEditing || (isSelectionActive && !isEditable);
	const displayValue = cell?.displayValue || '';
	const displayFieldType = getSheetColumnHumanFieldType(p.column);
	const pickerDisplay = getSheetPickerCellDisplayValue(displayFieldType, displayValue);
	const iconName = cell?.iconName || '';
	const cellStyle = cell?.cellStyle || {};
	const hasCustomCellBackground = Boolean(cellStyle.backgroundColor);
	const showCustomBackgroundSelectedOverlay = hasCustomCellBackground && isSelected && isSelectionActive && !isEditing;
	const isReadOnlyCell = Boolean(p.rowId && cell && !isEditable);
	const defaultCellClassName = getSheetDefaultCellClassName(p.column.fieldType);
	const selectedCellClassName = hasCustomCellBackground
		? getSheetCustomBackgroundCellClassName(cell?.cellClassName || '')
		: getSheetSingleClickedCellClassName(cell?.cellClassName || defaultCellClassName);
	const isSingleClicked = (isEditable || isReadOnlyCell) && isSelected && isSelectionActive;
	const editableContentClassName = isEditable
		? isSelected
			? selectedCellClassName
			: cell?.cellClassName || defaultCellClassName
		: '';
	const selectedReadOnlyContentClassName = isReadOnlyCell && isSelected
		? selectedCellClassName
		: '';
	const borderClassName = p.isPlaceholderRow
		? ''
    : 'bd_r_1 bd_b_1 bd_lt';
		// : isSelected
		// 	? 'bd_r_1bd_b_1'
		// 	: 'bd_r_1 bd_b_1 bd_lt';

	const cellClassName = cn(
		'sheet_ui_cell of abs',
		borderClassName,
		p.column.cellClassName,
		isCellActive ? 'active z4 hv_area' : '',
		isSingleClicked ? 'single_clicked' : '',
		isEditable && isSelected && !isEditing ? 'pointer' : '',
		// p.cell?.canOpen ? 'link' : '', // Don't use .link class
    !p.rowId ? 'noclick' : '',
    isReadOnlyCell ? 'not_editable' : '',
    p.rowDeleted ? '__deleted' : '',
		p.isStickyLeft ? STICKY_CELL_BG_CSS : CELL_BG_CSS,
	);
	const cellContentClassName = cn(
		'fs h_item cl_df',
		cell?.contentClassName,
		editableContentClassName,
		selectedReadOnlyContentClassName,
		showCustomBackgroundSelectedOverlay ? 'bg_main_fd' : '',
		!isInlineEditing ? 'px_6 unsel' : '',
		!displayValue && !isSheetDateCellFieldType(displayFieldType) ? 'cl_darker_2' : '',
	);

	return <div
		className={cellClassName}
		data-cell-key={p.column.key}
		data-row-id={p.rowId || undefined}
		data-sheet-cell='true'
		data-sheet-cell-editable={isEditable ? 'true' : undefined}
		data-sheet-cell-open-link={cell?.canOpen ? 'true' : undefined}
		style={{
			color: cellStyle.color,
			height: p.rowHeight ?? SHEET_ROW_HEIGHT,
			left: p.cellLeft,
			top: p.rowTop,
			width: p.columnWidth,
			zIndex: p.isStickyLeft ? SHEET_STICKY_LEFT_Z_INDEX : undefined,
		}}
	>
		<div
			className={cn('h_item h_f w_f', cellContentClassName)}
			style={{
				backgroundColor: showCustomBackgroundSelectedOverlay ? undefined : cellStyle.backgroundColor,
			}}
		>
			{isInlineEditing
				? <SheetCellEditor
					cell={cell}
					cellKey={p.column.key}
					column={p.column}
					draftValue={editState?.draftValue || ''}
					error={editState?.error}
					rowId={p.rowId!}
					/>
				: showCustomBackgroundSelectedOverlay
					? <span className='rel z2 h_item f'>
						<SheetCellDisplayValue
							canOpen={cell?.canOpen}
							className={pickerDisplay.className}
							displayClassName={cell?.displayClassName}
							displayValue={pickerDisplay.value}
							iconName={iconName}
							isCellActive={isCellActive}
							showSelectChevron={isEditable && isSelected && pickerDisplay.hasValue && isSheetChevronCellFieldType(p.column.fieldType)}
						/>
					</span>
					: <SheetCellDisplayValue
						canOpen={cell?.canOpen}
						className={pickerDisplay.className}
						displayClassName={cell?.displayClassName}
						displayValue={pickerDisplay.value}
						iconName={iconName}
						isCellActive={isCellActive}
						showSelectChevron={isEditable && isSelected && pickerDisplay.hasValue && isSheetChevronCellFieldType(p.column.fieldType)}
					/>}
		</div>
	</div>;
}, (prev, next) => (
	prev.cell === next.cell &&
	prev.cellStore === next.cellStore &&
	prev.cellLeft === next.cellLeft &&
	prev.column.id === next.column.id &&
	prev.column.key === next.column.key &&
	prev.column.label === next.column.label &&
	prev.column.fieldType === next.column.fieldType &&
	prev.column.cellClassName === next.column.cellClassName &&
	prev.column.humanFieldType === next.column.humanFieldType &&
	prev.columnIndex === next.columnIndex &&
	prev.columnWidth === next.columnWidth &&
	(prev.cellStore ? true : areSheetGridCellEditPropsEqual(prev, next)) &&
	(prev.cellStore ? true : areSheetGridCellSelectedPropsEqual(prev, next)) &&
	prev.isPlaceholderRow === next.isPlaceholderRow &&
	prev.isStickyLeft === next.isStickyLeft &&
		prev.renderCallback === next.renderCallback &&
		prev.rowHeight === next.rowHeight &&
		prev.rowDeleted === next.rowDeleted &&
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
	left?: number;
	rowHeight?: number;
	rowTop: number;
	rowWidth: number;
}) => {
	const left = p.left ?? SHEET_ROW_NUMBER_WIDTH;
	const fillWidth = Math.max(0, (p.contentWidth ?? p.rowWidth) - left);

	return <div
		className={cn('sheet_ui_cell of abs bd_r_1 bd_b_1 bd_lt h_item px_6 cl_df bg_zinc_fd_hv noclick', CELL_BG_CSS)}
		data-sheet-cell='true'
		data-sheet-placeholder-row-fill-cell='true'
		style={{
			height: p.rowHeight ?? SHEET_ROW_HEIGHT,
			left,
			top: p.rowTop,
			width: fillWidth,
		}}
	/>;
}, (prev, next) => (
	prev.contentWidth === next.contentWidth &&
	prev.left === next.left &&
	prev.rowHeight === next.rowHeight &&
	prev.rowTop === next.rowTop &&
	prev.rowWidth === next.rowWidth
));

SheetPlaceholderRowFillCell.displayName = 'SheetPlaceholderRowFillCell';
