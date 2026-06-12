import { cn } from '@jsb188/app/utils/string.ts';
import { Fragment, isValidElement, memo, useMemo, type MouseEvent, type ReactNode } from 'react';
import { useNavigate } from 'react-router';
import type { ReactSpanElement } from '../../types/dom.d';
import {
	TableDataCell,
	TableDataRow,
	TableEmptyCell,
	TableFullWidthRow,
	TableHeaderRow,
} from '../../ui/TableUI';
import { PopOverMoreButton } from '../PopOver';
import type {
	MapTableListOutput,
	ReactiveFragmentFn,
	TableColumnCells,
	TableColumnElement,
	TableListItemProps,
	VZListItemObj,
} from './types';
import { getOrderedTableCellClassNames, getOrderedTableHeaders } from './order';

/**
 * Compare table row props that affect rendered row output.
 */
export function areTableListItemPropsEqual(prev: TableListItemProps, next: TableListItemProps) {
	return (
		prev.cellClassNames === next.cellClassNames &&
		prev.disableOnClickRow === next.disableOnClickRow &&
		prev.i === next.i &&
		prev.item === next.item &&
		prev.mapListData === next.mapListData &&
		prev.nextItem === next.nextItem &&
		prev.onClickRow === next.onClickRow &&
		prev.previousItem === next.previousItem &&
		prev.removeLeftPadding === next.removeLeftPadding &&
		prev.removeRightPadding === next.removeRightPadding &&
		prev.sourceColumns === next.sourceColumns &&
		prev.tableDesign === next.tableDesign &&
		prev.trowClassName === next.trowClassName
	);
}

/**
 * Return true when a click target should keep ownership of the click event.
 */
function shouldIgnoreTableRowClick(event: MouseEvent<HTMLElement>) {
	const target = event.target as HTMLElement | null;
	return Boolean(target?.closest('a,button,input,textarea,select,label,[data-prevent-row-click]'));
}

/**
 * Return whether a mapped cell value is a plain props object.
 */
function isPlainTableCellObject(cell: TableColumnElement) {
	return Boolean(
		cell &&
		typeof cell === 'object' &&
		!Array.isArray(cell) &&
		!isValidElement(cell),
	);
}

/**
 * Normalize an object-style table cell into props consumed by TableDataCell.
 */
function getTableCellProps(cell: TableColumnElement, removeLeftPadding?: boolean, removeRightPadding?: boolean) {
	if (isPlainTableCellObject(cell)) {
		const { removeLeftPadding: rlp, removeRightPadding: rrp, iconName, iconClassName, onClick, ...rest } = cell as any;

		return {
			cellObj: rest as ReactSpanElement,
			iconClassName,
			iconName,
			onClick,
			removeLeftPaddingCell: rlp,
			removeRightPaddingCell: rrp,
		};
	}

	return {
		cellObj: null,
		iconClassName: undefined,
		iconName: undefined,
		onClick: undefined,
		removeLeftPaddingCell: removeLeftPadding,
		removeRightPaddingCell: removeRightPadding,
	};
}

/**
 * Render the content for one table cell.
 */
function renderCellContent(cell: TableColumnElement, cellObj: ReactSpanElement | null) {
	if (cellObj) {
		return <span {...cellObj} />;
	}

	if (cell && isValidElement(cell)) {
		return cell;
	}

	return cell ? String(cell) : null;
}

/**
 * Render route table row actions with the shared more-button cell treatment.
 */
function getTableActionsCell(rowData: MapTableListOutput) {
	if (rowData.__deleted || !rowData.actions?.length) {
		return null;
	}

	return {
		className: 'f h_right',
		children: <PopOverMoreButton editOptions={rowData.actions} />,
	};
}

/**
 * Render one mapped grid table data cell.
 */
function renderDataCell(p: {
	cell: TableColumnElement;
	cellClassNames?: string | (string | undefined)[];
	column: any;
	columnIndex: number;
	columnCount: number;
	removeLeftPadding?: boolean;
	removeRightPadding?: boolean;
	showColumnDividers?: boolean;
	showRowDivider?: boolean;
}) {
	const { cell, cellClassNames, column, columnCount, columnIndex, removeLeftPadding, removeRightPadding, showColumnDividers, showRowDivider } = p;
	const { cellObj, iconClassName, iconName, onClick, removeLeftPaddingCell, removeRightPaddingCell } = getTableCellProps(cell, removeLeftPadding, removeRightPadding);

	return <TableDataCell
		key={column?.key || columnIndex}
		addHorizontalPadding
		className={cn(
			column?.cellClassName,
			typeof cellClassNames === 'string' ? cellClassNames : cellClassNames?.[columnIndex],
		)}
		columnIndex={columnIndex}
		iconClassName={iconClassName}
		iconName={iconName}
		isLastColumn={columnIndex === columnCount - 1}
		onClick={onClick
			? (event) => {
				event.stopPropagation();
				onClick(event);
			}
			: undefined}
		removeLeftPadding={removeLeftPaddingCell}
		removeRightPadding={removeRightPaddingCell}
		showColumnDivider={Boolean(showColumnDividers && columnIndex > 0)}
		showRowDivider={showRowDivider}
	>
		{renderCellContent(cell, cellObj)}
	</TableDataCell>;
}

/**
 * Render the trailing empty cell required by the shared grid template.
 */
export function renderTrailingEmptyCell(p: {
	actionCell?: TableColumnElement;
	showColumnDividers?: boolean;
	showRowDivider?: boolean;
}) {
	const { actionCell, showColumnDividers, showRowDivider } = p;
	const { cellObj } = getTableCellProps(actionCell || null);

	return <TableEmptyCell
		key='table_trailing_empty_cell'
		showColumnDivider={showColumnDividers}
		showRowDivider={showRowDivider}
	>
		{actionCell ? renderCellContent(actionCell, cellObj) : null}
	</TableEmptyCell>;
}

/**
 * Render a full-width row when a table mapper returns arbitrary React content.
 */
function renderFullWidthTableContent(key: string, children: ReactNode, columnCount: number) {
	return <TableFullWidthRow
		key={key}
		colSpan={columnCount}
	>
		{children}
	</TableFullWidthRow>;
}

/**
 * Return a source-positioned row cell for one rendered column.
 */
function getRowColumnCell(p: {
	columnIndex: number;
	columnKey: string;
	rowCells?: TableColumnCells;
	rowColumns?: TableColumnElement[];
	sourceIndexByColumnKey: Map<string, number>;
}) {
	const { columnIndex, columnKey, rowCells, rowColumns, sourceIndexByColumnKey } = p;
	const sourceIndex = sourceIndexByColumnKey.get(columnKey);

	return rowCells?.[columnKey] ?? rowColumns?.[sourceIndex ?? columnIndex] ?? null;
}

/**
 * Render one item from a route table as one or more grid table rows.
 */
export const TableListItem = memo((p: TableListItemProps) => {
	const { disableOnClickRow, item, i, mapListData, nextItem, previousItem, sourceColumns: sourceColumnsProp, tableDesign, trowClassName, removeLeftPadding, removeRightPadding, onClickRow } = p;
	const navigate = useNavigate();
	const list = useMemo(() => {
		const rowList: VZListItemObj[] = [];

		if (previousItem) {
			rowList[i - 1] = previousItem;
		}
		rowList[i] = item;
		if (nextItem) {
			rowList[i + 1] = nextItem;
		}

		return rowList;
	}, [i, item, nextItem, previousItem]);
	const rowData = mapListData(item, i, list);
	const columns = tableDesign?.columns || [];
	const columnCount = Math.max(columns.length, 1);

	if (isValidElement(rowData)) {
		return renderFullWidthTableContent(`tlist_item_${item.item.id}_custom`, rowData, columnCount);
	}

	if (!rowData || typeof rowData !== 'object') {
		return null;
	}

	const sourceColumns = sourceColumnsProp || columns;
	const sourceIndexByColumnKey = new Map(sourceColumns.map((column, index) => [column.key, index]));
	const cellClassNames = getOrderedTableCellClassNames(rowData.cellClassNames || p.cellClassNames, sourceColumns, columns);
	const rowColumns = columns.length
		? columns.map((column, j) => getRowColumnCell({
			columnIndex: j,
			columnKey: column.key,
			rowCells: rowData.cells,
			rowColumns: rowData.columns,
			sourceIndexByColumnKey,
		}))
		: rowData.columns || [];
	const actionCell = rowData.cells?.actions ?? getTableActionsCell(rowData);
	const showColumnDividers = Boolean(tableDesign?.dividers?.columns);
	const showRowDivider = Boolean(tableDesign?.dividers?.rows);
	const clickable = !rowData.__deleted && !disableOnClickRow && Boolean(rowData.to || onClickRow);

	const onClickMainRow = (event: MouseEvent<HTMLDivElement>) => {
		if (!clickable || shouldIgnoreTableRowClick(event)) {
			return;
		}

		if (rowData.to) {
			navigate(rowData.to);
			return;
		}

		onClickRow?.(item, null, rowData.onClickProps);
	};

	return <Fragment>
		{rowData.RowHeaderComponent && renderFullWidthTableContent(`tlist_item_${item.item.id}_row_header`, rowData.RowHeaderComponent, columnCount)}

		{rowData.rowHeaders && (
			<TableHeaderRow
				addHorizontalPadding
				className={trowClassName}
				columns={columns}
				headers={getOrderedTableHeaders(rowData.rowHeaders, sourceColumns, columns)}
				removeLeftPadding={removeLeftPadding}
				removeRightPadding={removeRightPadding}
				showColumnDividers={showColumnDividers}
				showRowDivider
			/>
		)}

		{!rowColumns.length ? null :
			<TableDataRow
				__deleted={rowData.__deleted}
				className={trowClassName}
				clickable={clickable}
				id={`tlist_item_${item.item.id}`}
				onClick={clickable ? onClickMainRow : undefined}
			>
				{rowColumns.map((cell, columnIndex) => renderDataCell({
					cell,
					cellClassNames,
					column: columns[columnIndex],
					columnCount,
					columnIndex,
					removeLeftPadding,
					removeRightPadding,
					showColumnDividers,
					showRowDivider,
				}))}
				{renderTrailingEmptyCell({
					actionCell,
					showColumnDividers,
					showRowDivider,
				})}
			</TableDataRow>
		}

		{rowData.subRows && Array.isArray(rowData.subRows)
			? rowData.subRows.map((subRowItem: any, k: number) => {
				const onClickSubRow = (event: MouseEvent<HTMLDivElement>) => {
					if (!onClickRow || disableOnClickRow || shouldIgnoreTableRowClick(event)) {
						return;
					}

					onClickRow(item, subRowItem.value, subRowItem.onClickProps);
				};

				return <TableDataRow
					key={k}
					className={cn('rel z1', trowClassName)}
					clickable={Boolean(onClickRow && !disableOnClickRow)}
					onClick={onClickRow && !disableOnClickRow ? onClickSubRow : undefined}
				>
					{columns.map((column, columnIndex) => renderDataCell({
						cell: getRowColumnCell({
							columnIndex,
							columnKey: column.key,
							rowColumns: subRowItem.columns,
							sourceIndexByColumnKey,
						}),
						cellClassNames,
						column,
						columnCount,
						columnIndex,
						removeLeftPadding,
						removeRightPadding,
						showColumnDividers,
						showRowDivider: Boolean(k),
					}))}
					{renderTrailingEmptyCell({
						showColumnDividers,
						showRowDivider: Boolean(k),
					})}
				</TableDataRow>;
			})
			: rowData.subRows
			? renderFullWidthTableContent(`tlist_item_${item.item.id}_subrow`, rowData.subRows, columnCount)
			: null}
	</Fragment>;
}, areTableListItemPropsEqual);

TableListItem.displayName = 'TableListItem';

/**
 * Render one reactive route table row group.
 */
export const ReactiveTableListItem = memo((p: TableListItemProps & {
	reactiveFragmentFn: ReactiveFragmentFn;
}) => {
	const { reactiveFragmentFn, item } = p;
	const reactiveItem = reactiveFragmentFn(item?.item?.id, item?.item);
	return <TableListItem
		{...p}
		item={{
			...item,
			item: reactiveItem,
		}}
	/>;
}, (prev, next) => (
	prev.reactiveFragmentFn === next.reactiveFragmentFn &&
	areTableListItemPropsEqual(prev, next)
));

ReactiveTableListItem.displayName = 'ReactiveTableListItem';
