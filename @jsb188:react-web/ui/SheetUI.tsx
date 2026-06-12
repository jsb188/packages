import { COLORS } from '@jsb188/app/constants/app.ts';
import i18n from '@jsb188/app/i18n/index.ts';
import { type CSSProperties, type ReactNode, type Ref } from 'react';
import { Icon } from '../svgs/Icon';
import {
  SHEET_COLUMN_MAX_WIDTH,
  SHEET_COLUMN_MIN_WIDTH,
  SHEET_COLUMN_WIDTH,
  SHEET_HEADER_HEIGHT,
  SHEET_ROW_HEIGHT,
  SHEET_ROW_MAX_HEIGHT,
  SHEET_ROW_MIN_HEIGHT,
  SHEET_ROW_NUMBER_WIDTH,
  SheetCellDisplayValue
} from './SheetCell';
import { SheetSaveButton } from './SheetEditor';

export {
  SHEET_COLUMN_MAX_WIDTH,
  SHEET_COLUMN_MIN_WIDTH,
  SHEET_COLUMN_WIDTH,
  SHEET_HEADER_HEIGHT,
  SHEET_ROW_HEIGHT,
  SHEET_ROW_MAX_HEIGHT,
  SHEET_ROW_MIN_HEIGHT,
  SHEET_ROW_NUMBER_WIDTH,
  SHEET_STICKY_SPACER_SIZE,
  SheetCellDisplayValue
} from './SheetCell';
export {
  SheetSaveButton,
  type SheetSaveButtonProps
} from './SheetEditor';

const SHEET_VISIBLE_ROW_RANGE_MULTIPLIER = 1.5;

/**
 * Types
 */

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
	cellClassName?: string;
	disableReorder?: boolean;
	disableResize?: boolean;
	headerCheckboxEnabled?: boolean;
	headerCheckboxTooltipMessage?: string;
	headerChecked?: boolean;
	headerClassName?: string;
	headerLayoutClassName?: string;
	headerTooltipMessage?: string;
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
	cellStyle?: Pick<CSSProperties, 'backgroundColor' | 'color'>;
	contentClassName?: string;
	displayClassName?: string;
};

export type SheetUIRowSlot = {
	cellsByKey: Record<string, SheetUICell | undefined>;
	checkboxChecked?: boolean | null;
	deleted?: boolean;
	rowId?: string | null;
	rowIndex: number;
	rowKey: string;
	rowNumber?: number | null;
	rowHeight?: number;
	hideBottomBorder?: boolean;
	rowTop: number;
	rowWidth: number;
};

export type SheetUIRowCheckboxes = {
	headerChecked: boolean;
	headerTooltipMessage?: string;
};

export type SheetUIEditorClickSource = 'CELL_LINK' | 'CELL_BACKGROUND';

export type SheetUIEditState = {
	rowId: string;
	cellKey: string;
	draftValue: string;
	selectAllOnFocus?: boolean;
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
export type SheetRowHeights = Record<string, number>;

export type SheetRowMetric = {
	height: number;
	rowIndex: number;
	rowKey: string;
	top: number;
};

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

export type SheetUIRowResizeGuide = {
	rowKey: string;
	top: number;
	width: number;
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
	canvasClassName?: string;
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
	headerCursorClassName?: string;
	headerTooltipClosesWhilePointerDown?: boolean;
	headerContent?: ReactNode;
	headerEditState?: SheetUIHeaderEditState | null;
	selectedHeaderCellKey?: string | null;
	headerSpacerWidth?: number;
	headerWidth: number;
	rowHeaderWidth?: number;
	resizeGuide?: SheetUIResizeGuide | null;
	rowCheckboxes?: SheetUIRowCheckboxes | null;
	rowResizeEnabled?: boolean;
	rowResizeGuide?: SheetUIRowResizeGuide | null;
	rows: SheetUIRowSlot[];
	scrollClassName?: string;
	scrollFill?: boolean;
	scrollLeft: number;
	scrollRef?: Ref<HTMLDivElement>;
	scrollStyle?: CSSProperties;
	selectedCellKeyMap?: SheetUISelectedCellKeyMap | null;
	selectedCellState?: SheetUISelectedCellState | null;
	sheetSurfaceHeight?: number;
	sheetSurfaceTop?: number;
	hideStickyColumnSpacer?: boolean;
	showRowNumbers?: boolean;
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
 * Keep a user-resized row height inside the usable spreadsheet range.
 */

export function clampSheetRowHeight(height: number) {
	return Math.min(SHEET_ROW_MAX_HEIGHT, Math.max(SHEET_ROW_MIN_HEIGHT, Math.round(height)));
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
 * Convert row heights into stable offsets for variable-height virtualization.
 */

export function getSheetRowMetrics(rowKeys: string[], rowHeights: SheetRowHeights = {}) {
	const metrics: SheetRowMetric[] = [];
	const offsets = [0];
	let totalHeight = 0;

	rowKeys.forEach((rowKey, rowIndex) => {
		const height = clampSheetRowHeight(rowHeights[rowKey] || SHEET_ROW_HEIGHT);

		metrics.push({
			height,
			rowIndex,
			rowKey,
			top: totalHeight,
		});

		totalHeight += height;
		offsets.push(totalHeight);
	});

	return {
		metrics,
		offsets,
		totalHeight,
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
		className='sheet_overlay_editor bg shadow_light ft_xs w_f max_h_300'
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
					className={`h_item w_f px_8 py_5 -my_2 cl_df bg_${getValidSheetOptionColor(option.color)}_fd_hv`}
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
				className='h_item gap_6 px_8 py_6 bd_t_1 bd_lt'
				data-sheet-select-editor-custom='true'
			>
				<input
					className='f stock ft_xs px_5 py_3 bd_0 bg_alt'
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
 * Find the variable-height row index at one vertical scroll offset.
 */

export function getSheetRowIndexAtOffset(rowOffsets: number[], offset: number) {
	const lastRowIndex = Math.max(0, rowOffsets.length - 2);
	let low = 0;
	let high = lastRowIndex;
	let result = 0;

	while (low <= high) {
		const mid = Math.floor((low + high) / 2);

		if ((rowOffsets[mid] || 0) <= offset) {
			result = mid;
			low = mid + 1;
		} else {
			high = mid - 1;
		}
	}

	return Math.min(result, lastRowIndex);
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
	rowOffsets?: number[];
	rowCount: number;
	rowRangeMultiplier?: number;
	rowHeaderWidth?: number;
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
		rowOffsets,
	rowCount,
	rowRangeMultiplier = SHEET_VISIBLE_ROW_RANGE_MULTIPLIER,
	rowHeaderWidth = SHEET_ROW_NUMBER_WIDTH,
	scrollLeft,
		scrollTop,
	} = params;

	const bodyScrollTop = Math.max(0, scrollTop - headerHeight);
	const bodyScrollLeft = Math.max(0, scrollLeft - rowHeaderWidth);
	const bodyScrollRight = Math.max(bodyScrollLeft, bodyScrollLeft + containerWidth - 1);
	const visibleBodyHeight = Math.max(0, containerHeight - headerHeight);
	const visibleRowCount = Math.ceil(visibleBodyHeight / SHEET_ROW_HEIGHT);
	const bodyScrollBottom = Math.max(bodyScrollTop, bodyScrollTop + visibleBodyHeight - 1);
	const firstVisibleRowIndex = rowOffsets?.length
		? getSheetRowIndexAtOffset(rowOffsets, bodyScrollTop)
		: Math.floor(bodyScrollTop / SHEET_ROW_HEIGHT);
	const lastVisibleRowIndex = rowOffsets?.length
		? getSheetRowIndexAtOffset(rowOffsets, bodyScrollBottom)
		: Math.floor(bodyScrollBottom / SHEET_ROW_HEIGHT);
	const rowStart = Math.max(0, firstVisibleRowIndex - bufferRows);
	const firstVisibleColumnIndex = columnOffsets?.length
		? getSheetColumnIndexAtOffset(columnOffsets, bodyScrollLeft)
		: Math.floor(bodyScrollLeft / SHEET_COLUMN_WIDTH);
	const lastVisibleColumnIndex = columnOffsets?.length
		? getSheetColumnIndexAtOffset(columnOffsets, bodyScrollRight)
		: Math.floor(bodyScrollRight / SHEET_COLUMN_WIDTH);
	const columnStart = Math.max(0, firstVisibleColumnIndex - bufferColumns);
	const baseRowEnd = Math.min(rowCount, rowOffsets?.length ? lastVisibleRowIndex + 1 + bufferRows : rowStart + visibleRowCount + bufferRows * 2);
	const baseLoadedRowCount = Math.max(0, baseRowEnd - rowStart);
	const extraLoadedRowCount = Math.ceil(baseLoadedRowCount * (Math.max(1, rowRangeMultiplier) - 1));

	return {
		rowStart,
		rowEnd: Math.min(rowCount, baseRowEnd + extraLoadedRowCount),
		columnStart,
		columnEnd: Math.min(columnCount, lastVisibleColumnIndex + 1 + bufferColumns),
	};
}
