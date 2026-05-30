import { memo, useMemo, type Ref } from 'react';
import {
	TableHeaderRow,
	TableRoot,
	type TableDesign,
	type TableHeaderObj,
} from '../ui/TableUI';
import {
	TABLE_RESIZE_GUIDE_WIDTH,
	getTableDividerResizeTarget,
} from './table/layout';
import { TableMockClient, TableMockSSR, TablePageMock } from './table/mocks';
import { ReactiveTableListItem, TableListItem } from './table/rows';
import type {
	MapTableListDataFn,
	TableListProps,
	VirtualizedTableBaseProps,
	VZListItemObj,
} from './table/types';
import { useTableGridController } from './table/use-table-grid';
import {
	useVirtualizedDOM,
	useVirtualizedRenderWindow,
	useVirtualizedState,
} from './table/virtualized';

export { TableMockClient, TableMockSSR, TablePageMock };
export type {
	MapTableListDataFn,
	MapTableListOutput,
	ReactiveFragmentFn,
	TableColumnElement,
	VZListItemObj,
} from './table/types';

/**
 * Render a grid table with optional header column resizing.
 */
export const VZTable = memo((p: TableListProps) => {
	const { bodyRef, borderStyle, columnWidths, disableOnClickRow, footerNode, reactiveFragmentFn, onColumnResizeCommit, resizableColumns, tableDesign, headers, listData, cellClassNames, mapListData, onClickRow, removeLeftPadding, removeRightPadding, trowClassName } = p;
	const columns = tableDesign?.columns || [];
	const showColumnDividers = Boolean(tableDesign?.dividers?.columns);
	const showRowDivider = borderStyle === 'BORDER';
	const {
		bodyScrollerRef,
		containerRef,
		guideRef,
		headerScrollerRef,
		headerTableRef,
		onColumnResizePointerCancel,
		onColumnResizePointerDown,
		onColumnResizePointerMove,
		onColumnResizePointerUp,
		renderColumnWidths,
		syncHorizontalScroll,
		tableContentWidthStyle,
		tableGridTemplateColumns,
		tableMinWidthStyle,
		tableRef,
		tableWidthStyle,
	} = useTableGridController({
		columnWidths,
		columns,
		headers,
		listData,
		onColumnResizeCommit,
	});
	const tableRowProps = useMemo(() => ({
		cellClassNames,
		disableOnClickRow,
		mapListData,
		onClickRow,
		removeLeftPadding,
		removeRightPadding,
		tableDesign,
		trowClassName,
	}), [cellClassNames, disableOnClickRow, mapListData, onClickRow, removeLeftPadding, removeRightPadding, tableDesign, trowClassName]);

	return <>
		<div
			ref={containerRef}
			className='w_f rel bd_b_1 bd_lt'
			data-route-table-grid='true'
		>
		<div
			ref={guideRef}
			className='abs bg_primary noclick'
			data-table-column-resize-guide
			style={{
				bottom: 0,
				display: 'none',
				left: 0,
				top: 0,
				width: TABLE_RESIZE_GUIDE_WIDTH,
				zIndex: 8,
			}}
		/>

		{headers && (
			<div
				ref={headerScrollerRef}
				className='w_f table_grid_sticky_header_scroller z4'
				onScroll={() => syncHorizontalScroll(headerScrollerRef.current, bodyScrollerRef.current)}
			>
				<TableRoot
					tableRef={headerTableRef}
					style={{
						gridTemplateColumns: tableGridTemplateColumns,
						minWidth: tableMinWidthStyle,
						width: tableWidthStyle,
					}}
				>
					<TableHeaderRow
						addHorizontalPadding
						borderStyle={borderStyle ?? 'BORDER'}
						cellClassNames={cellClassNames}
						columns={columns}
						headers={headers}
						removeLeftPadding={removeLeftPadding}
						removeRightPadding={removeRightPadding}
						renderHeaderCellOverlay={resizableColumns
							? (column, columnIndex) => {
								const resizeTarget = getTableDividerResizeTarget(columns, columnIndex, renderColumnWidths);
								if (!resizeTarget) {
									return null;
								}

								return <div
									aria-label={`Resize ${resizeTarget.column.header?.text || resizeTarget.column.key}`}
									aria-orientation='vertical'
									className='cs_back hv_area'
									data-table-column-resize-handle={resizeTarget.column.key}
									onPointerCancel={onColumnResizePointerCancel}
									onPointerDown={(event) => onColumnResizePointerDown(event, resizeTarget)}
									onPointerMove={onColumnResizePointerMove}
									onPointerUp={onColumnResizePointerUp}
									role='separator'
									style={{
										bottom: 0,
										cursor: 'col-resize',
										position: 'absolute',
										right: -10,
										top: 0,
										width: 20,
										zIndex: 5,
									}}
								/>;
							}
							: undefined}
						showColumnDividers={showColumnDividers}
						showRowDivider={showRowDivider}
					/>
				</TableRoot>
			</div>
		)}

		<div
			ref={bodyScrollerRef}
			className='w_f rel x_scr'
			onScroll={() => syncHorizontalScroll(bodyScrollerRef.current, headerScrollerRef.current)}
		>
			<TableRoot
				tableRef={tableRef}
				style={{
					gridTemplateColumns: tableGridTemplateColumns,
					minWidth: tableMinWidthStyle,
					width: tableWidthStyle,
				}}
			>
				<div ref={bodyRef} className='table_grid_body'>
					{listData?.map((item: VZListItemObj, i: number, list: VZListItemObj[]) => {
						const previousItem = list[i - 1] || null;
						const nextItem = list[i + 1] || null;

						if (reactiveFragmentFn) {
							return <ReactiveTableListItem
								key={item.item.id}
								{...tableRowProps}
								reactiveFragmentFn={reactiveFragmentFn}
								i={i}
								nextItem={nextItem}
								previousItem={previousItem}
								item={item}
							/>;
						}

						return <TableListItem
							key={item.item.id}
							{...tableRowProps}
							i={i}
							nextItem={nextItem}
							previousItem={previousItem}
							item={item}
						/>;
					})}
				</div>
			</TableRoot>
		</div>
		</div>

		{footerNode && (
			<div
				style={{
					width: tableContentWidthStyle,
				}}
			>
				{footerNode}
			</div>
		)}
	</>;
});

VZTable.displayName = 'VZTable';

/**
 * Render a virtualized grid route table.
 */
export function VirtualizedTable(p: VirtualizedTableBaseProps & {
	columnWidths?: Record<string, number>;
	disableOnClickRow?: boolean;
	onClickRow?: (vzItem?: VZListItemObj, subRowItemValue?: any, onClickProps?: any) => void;
	onColumnResizeCommit?: (columnWidths: Record<string, number>) => void;
	resizableColumns?: boolean;
	tableDesign?: TableDesign;
	trowClassName?: string;
	cellClassNames?: string | (string | undefined)[];
	headers?: Partial<TableHeaderObj>[] | null;
	mapListData: MapTableListDataFn;
}) {
	const { columnWidths, disableOnClickRow, HeaderComponent, FooterComponent, MockComponent, className, endOfListMessage, headers, cellClassNames, onColumnResizeCommit, reactiveFragmentFn, resizableColumns, mapListData, tableDesign, trowClassName, onClickRow, maxFetchLimit } = p;
	const vzState = useVirtualizedState(p);
	const { listData: nextListData, hasMoreTop, hasMoreBottom } = vzState;
	const { listData, renderIsDeferred } = useVirtualizedRenderWindow(nextListData, !hasMoreTop);
	const [listRef, topRef, bottomRef] = useVirtualizedDOM(p, vzState, renderIsDeferred);
	const footerNode = !hasMoreBottom && !renderIsDeferred && FooterComponent
		? <FooterComponent
			endOfListMessage={endOfListMessage}
			maxFetchLimit={maxFetchLimit}
			loadedDataSize={vzState.itemIds?.length}
		/>
		: null;

	return <div className={className}>
		<div ref={topRef}>
			{hasMoreTop || renderIsDeferred ? MockComponent : HeaderComponent}
		</div>

		<VZTable
			bodyRef={listRef as Ref<HTMLDivElement>}
			cellClassNames={cellClassNames}
			columnWidths={columnWidths}
			disableOnClickRow={disableOnClickRow}
			footerNode={footerNode}
			headers={headers}
			listData={listData}
			mapListData={mapListData}
			onClickRow={onClickRow}
			onColumnResizeCommit={onColumnResizeCommit}
			reactiveFragmentFn={reactiveFragmentFn}
			resizableColumns={resizableColumns}
			tableDesign={tableDesign}
			trowClassName={trowClassName}
		/>

		<div ref={bottomRef}>
			{(hasMoreBottom || renderIsDeferred) && MockComponent}
		</div>
	</div>;
}
