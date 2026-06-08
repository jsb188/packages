import { cn } from '@jsb188/app/utils/string.ts';
import { memo, type ReactNode } from 'react';
import {
	SHEET_ROW_NUMBER_WIDTH,
	SheetGridCell as DataTableGridCell,
	SheetHeaderArea as DataTableHeaderArea,
	SheetPlaceholderRowFillCell as DataTablePlaceholderRowFillCell,
	SheetRowNumberSlot as DataTableRowNumberSlot,
	SheetStickyColumnSpacerSlot as DataTableStickyColumnSpacerSlot,
	SheetTopLeftRowNumberSlot as DataTableTopLeftRowNumberSlot,
	isSheetColumnSticky,
	isSheetPlaceholderRowSlot,
} from './SheetCell';
import type { SheetUIProps } from './SheetUI';
import './SheetUI.css';

const SHEET_COLUMN_RESIZE_GUIDE_Z_INDEX = 44;
const SHEET_ROW_RESIZE_GUIDE_Z_INDEX = 44;

export type DataTableGridSurfaceProps = SheetUIProps;

/*
 * Render one absolute overlay layer for resize guides.
 */

function DataTableResizeGuideLayer(p: {
	children: ReactNode;
	dataAttribute: 'data-sheet-resize-guide-layer' | 'data-sheet-row-resize-guide-layer';
	height: number;
	top: number;
	width: number;
	zIndex: number;
}) {
	return <div
		className='abs noclick'
		{...{ [p.dataAttribute]: 'true' }}
		style={{
			height: p.height,
			left: 0,
			overflow: 'hidden',
			top: p.top,
			width: p.width,
			zIndex: p.zIndex,
		}}
	>
		<div className='rel h_f w_f'>
			{p.children}
		</div>
	</div>;
}

/*
 * Render the DataTable-owned virtualized spreadsheet-like DOM grid surface.
 */

export const DataTableGridSurface = memo((p: DataTableGridSurfaceProps) => {
	const sheetSurfaceHeight = p.sheetSurfaceHeight ?? p.canvasHeight;
	const sheetSurfaceTop = p.sheetSurfaceTop ?? 0;
	const showRowNumbers = p.showRowNumbers !== false;
	const hideStickyColumnSpacer = p.hideStickyColumnSpacer === true;
	const rowHeaderWidth = p.rowHeaderWidth ?? (showRowNumbers ? SHEET_ROW_NUMBER_WIDTH : 0);
	const stickyColumnEndLeft = p.stickyColumnEndLeft ?? rowHeaderWidth;

	return <div
		id={p.id}
		className={cn('v_stretch h_f w_f max_w_f rel bg', p.className)}
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
			className={cn('sheet_ui_scroll app_scr of_x w_f rel bg_fade ft_xs', p.scrollFill !== false && 'f', p.scrollClassName)}
			data-sheet-scroll-viewport='true'
			style={{
				maxWidth: '100%',
				minWidth: 0,
				overflowAnchor: 'none',
				width: '100%',
				...p.scrollStyle,
			}}
		>
			<div
				className={cn('sheet_ui_canvas w_f h_f rel', p.canvasClassName || 'bg_fade')}
				data-cell-count={p.cellCount}
				style={{
					height: p.canvasHeight,
					width: p.canvasWidth,
				}}
			>
				<DataTableHeaderArea
					columnReorderDrag={p.columnReorderDrag}
					columnReorderDisplacements={p.columnReorderDisplacements}
					columnReorderEnabled={p.columnReorderEnabled}
					columnReorderGuide={p.columnReorderGuide}
					columnCount={p.columnCount}
					columns={p.columns}
					headerCellsEditable={p.headerCellsEditable}
					headerCursorClassName={p.headerCursorClassName}
					headerTooltipClosesWhilePointerDown={p.headerTooltipClosesWhilePointerDown}
					headerEditState={p.headerEditState}
					hideStickyColumnSpacer={hideStickyColumnSpacer}
					selectedHeaderCellKey={p.selectedHeaderCellKey}
					headerSpacerWidth={p.headerSpacerWidth ?? p.headerWidth}
					headerWidth={p.headerWidth}
					isColumnResizeDragging={Boolean(p.resizeGuide)}
					rowHeaderWidth={rowHeaderWidth}
					scrollLeft={p.scrollLeft}
					showRowNumbers={showRowNumbers}
					stickyColumnEndLeft={stickyColumnEndLeft}
					stickyColumnCount={p.stickyColumnCount}
				/>

				{p.resizeGuide
					? <DataTableResizeGuideLayer
						dataAttribute='data-sheet-resize-guide-layer'
						height={sheetSurfaceHeight}
						top={sheetSurfaceTop}
						width={p.canvasWidth}
						zIndex={SHEET_COLUMN_RESIZE_GUIDE_Z_INDEX}
					>
						<div
					className='bg_active noclick'
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
					</DataTableResizeGuideLayer>
					: null}

				{p.rowResizeGuide
					? <DataTableResizeGuideLayer
						dataAttribute='data-sheet-row-resize-guide-layer'
						height={sheetSurfaceHeight}
						top={sheetSurfaceTop}
						width={p.canvasWidth}
						zIndex={SHEET_ROW_RESIZE_GUIDE_Z_INDEX}
					>
						<div
					className='bg_active noclick'
							data-sheet-row-resize-guide={p.rowResizeGuide.rowKey}
							style={{
								height: 3,
								left: 0,
								position: 'absolute',
								top: p.rowResizeGuide.top - 1.5,
								width: p.rowResizeGuide.width,
								zIndex: SHEET_ROW_RESIZE_GUIDE_Z_INDEX,
							}}
						/>
					</DataTableResizeGuideLayer>
					: null}

				{showRowNumbers
					? <DataTableTopLeftRowNumberSlot rowWidth={Math.max(p.headerSpacerWidth ?? p.headerWidth, p.canvasWidth)} />
					: null}

				{showRowNumbers ? p.rows.map((rowSlot) => {
					return <DataTableRowNumberSlot
						key={rowSlot.rowKey}
						isPlaceholderRow={isSheetPlaceholderRowSlot(rowSlot)}
						deleted={rowSlot.deleted}
						rowId={rowSlot.rowId}
						rowIndex={rowSlot.rowIndex}
						rowNumber={rowSlot.rowNumber}
						rowHeight={rowSlot.rowHeight}
						rowResizeEnabled={p.rowResizeEnabled}
						rowTop={rowSlot.rowTop}
						rowWidth={rowSlot.rowWidth}
					/>;
				}) : null}

				{!hideStickyColumnSpacer ? p.rows.map((rowSlot) => {
					return <DataTableStickyColumnSpacerSlot
						key={`${rowSlot.rowKey}:sticky-column-spacer`}
						left={stickyColumnEndLeft}
						deleted={rowSlot.deleted}
						rowId={rowSlot.rowId}
						rowHeight={rowSlot.rowHeight}
						rowTop={rowSlot.rowTop}
						rowWidth={rowSlot.rowWidth}
					/>;
				}) : null}

				{p.rows.map((rowSlot) => {
					const isPlaceholderRow = isSheetPlaceholderRowSlot(rowSlot);

					if (isPlaceholderRow) {
						return <DataTablePlaceholderRowFillCell
							key={`${rowSlot.rowKey}:placeholder-row-fill`}
							contentWidth={p.headerSpacerWidth}
							hideBottomBorder={rowSlot.hideBottomBorder}
							left={rowHeaderWidth}
							rowHeight={rowSlot.rowHeight}
							rowTop={rowSlot.rowTop}
							rowWidth={rowSlot.rowWidth}
						/>;
					}

					return p.columns.map((columnMetric) => {
						const isStickyLeft = isSheetColumnSticky(columnMetric.columnIndex, p.stickyColumnCount);
						const cellLeft = (isStickyLeft ? p.scrollLeft : 0) +
							rowHeaderWidth +
							columnMetric.left;

						return <DataTableGridCell
							key={`${rowSlot.rowKey}:${columnMetric.column.key}`}
							cell={rowSlot.cellsByKey[columnMetric.column.key]}
							cellStore={p.cellStore}
							cellLeft={cellLeft}
							column={columnMetric.column}
							columnIndex={columnMetric.columnIndex}
							columnWidth={columnMetric.width}
							editState={p.editState}
							hideBottomBorder={rowSlot.hideBottomBorder}
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
	prev.canvasClassName === next.canvasClassName &&
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
	prev.headerCursorClassName === next.headerCursorClassName &&
	prev.headerTooltipClosesWhilePointerDown === next.headerTooltipClosesWhilePointerDown &&
	prev.headerContent === next.headerContent &&
	prev.headerEditState?.cellKey === next.headerEditState?.cellKey &&
	prev.headerEditState?.draftValue === next.headerEditState?.draftValue &&
	prev.headerEditState?.error === next.headerEditState?.error &&
	prev.hideStickyColumnSpacer === next.hideStickyColumnSpacer &&
	prev.selectedHeaderCellKey === next.selectedHeaderCellKey &&
	prev.headerSpacerWidth === next.headerSpacerWidth &&
	prev.headerWidth === next.headerWidth &&
	prev.id === next.id &&
	prev.cellRenderCallback === next.cellRenderCallback &&
	prev.overlayContent === next.overlayContent &&
	prev.resizeGuide?.columnKey === next.resizeGuide?.columnKey &&
	prev.resizeGuide?.height === next.resizeGuide?.height &&
	prev.resizeGuide?.left === next.resizeGuide?.left &&
	prev.rowHeaderWidth === next.rowHeaderWidth &&
	prev.rowResizeEnabled === next.rowResizeEnabled &&
	prev.rowResizeGuide?.rowKey === next.rowResizeGuide?.rowKey &&
	prev.rowResizeGuide?.top === next.rowResizeGuide?.top &&
	prev.rowResizeGuide?.width === next.rowResizeGuide?.width &&
	prev.rows === next.rows &&
	prev.scrollClassName === next.scrollClassName &&
	prev.scrollFill === next.scrollFill &&
	prev.scrollLeft === next.scrollLeft &&
	prev.scrollRef === next.scrollRef &&
	prev.scrollStyle === next.scrollStyle &&
	prev.selectedCellKeyMap === next.selectedCellKeyMap &&
	prev.selectedCellState?.rowId === next.selectedCellState?.rowId &&
	prev.selectedCellState?.cellKey === next.selectedCellState?.cellKey &&
	prev.sheetSurfaceHeight === next.sheetSurfaceHeight &&
	prev.sheetSurfaceTop === next.sheetSurfaceTop &&
	prev.showRowNumbers === next.showRowNumbers &&
	prev.stickyColumnEndLeft === next.stickyColumnEndLeft &&
	prev.stickyColumnCount === next.stickyColumnCount &&
	prev.style === next.style
));

DataTableGridSurface.displayName = 'DataTableGridSurface';

export default DataTableGridSurface;
