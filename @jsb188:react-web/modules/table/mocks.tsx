import { cn } from '@jsb188/app/utils/string.ts';
import { memo } from 'react';
import { AvatarImg } from '../../ui/Avatar';
import {
	TableDataCell,
	TableDataRow,
	TableHeaderRow,
	TableRoot,
	type TableDesign,
	type TableDesignColumn,
} from '../../ui/TableUI';
import { useWaitForClientRender } from '../../utils/dom';
import {
	getResolvedTableColumnWidths,
	getTableGridTemplateColumns,
	getTableWidthStyle,
} from './layout';
import { getOrderedTableColumns } from './order';
import { renderTrailingEmptyCell } from './rows';

type TableMockProps = {
	browserHeightRatio?: number;
	cellClassNames?: string | (string | undefined)[];
	columnOrder?: string[] | null;
	columnWidths?: Record<string, number>;
	isInnerContent?: boolean;
	isSmallerRows?: boolean;
	mockHeaderRows?: boolean;
	removeAvatarElement?: boolean;
	removeBorderLine?: boolean;
	removeHorizontalPadding?: boolean;
	tableDesign?: TableDesign;
};

/**
 * Build fallback mock columns when a table design is not available.
 */
function getMockTableColumns(tableDesign?: TableDesign, columnOrder?: string[] | null): TableDesignColumn[] {
	if (tableDesign?.columns.length) {
		return getOrderedTableColumns(tableDesign.columns, columnOrder);
	}

	return [{
		key: 'mock_1',
		width: 300,
	}, {
		key: 'mock_2',
		width: 140,
	}, {
		key: 'mock_3',
		width: 140,
	}];
}

/**
 * Return the number of mock rows needed for the current viewport.
 */
function getMockTableRowCount(browserHeightRatio?: number) {
	const browserHeight = globalThis?.window?.innerHeight || 800;
	const hasRatio = browserHeightRatio && browserHeightRatio > 0;
	return Math.floor(browserHeight * (hasRatio ? browserHeightRatio : 1) / 40);
}

/**
 * Render one grid mock table row.
 */
function renderMockTableRow(columns: TableDesignColumn[], p: {
	cellClassNames?: string | (string | undefined)[];
	index: number;
	isSmallerRows?: boolean;
	removeAvatarElement?: boolean;
	removeBorderLine?: boolean;
	showColumnDividers?: boolean;
}) {
	const { cellClassNames, index, isSmallerRows, removeAvatarElement, removeBorderLine, showColumnDividers } = p;
	const modulus = (index % 4) * 10;

	return <TableDataRow key={index}>
		{columns.map((column, columnIndex) => (
			<TableDataCell
				key={column.key}
				addHorizontalPadding
				className={cn(isSmallerRows && 'min_h_40', column.cellClassName, typeof cellClassNames === 'string' ? cellClassNames : cellClassNames?.[columnIndex])}
				columnIndex={columnIndex}
				isLastColumn={columnIndex === columns.length - 1}
				showColumnDivider={Boolean(showColumnDividers && columnIndex > 0)}
				showRowDivider={!removeBorderLine}
			>
				{columnIndex || removeAvatarElement
					? <span className='mock alt min_w_20' style={{ width: (100 - modulus * columnIndex) + '%' }}>
						....
					</span>
					: <>
						<AvatarImg
							className='mr_sm bg_alt'
							square
							size='tiny'
						/>
						<span className='mock alt f'>
							....
						</span>
					</>}
			</TableDataCell>
		))}
		{renderTrailingEmptyCell({
			showColumnDividers,
			showRowDivider: !removeBorderLine,
		})}
	</TableDataRow>;
}

/**
 * Render a client-only grid table loading mock.
 */
export const TableMockClient = memo((p: TableMockProps) => {
	const { browserHeightRatio, cellClassNames, columnOrder, columnWidths: resizedColumnWidths, isInnerContent, isSmallerRows, mockHeaderRows, removeAvatarElement, removeBorderLine, removeHorizontalPadding, tableDesign } = p;
	const columns = getMockTableColumns(tableDesign, columnOrder);
	const mockCount = getMockTableRowCount(browserHeightRatio);
	const columnWidths = getResolvedTableColumnWidths(columns, resizedColumnWidths || {});
	const tableWidthStyle = getTableWidthStyle(columns, columnWidths);
	const tableGridTemplateColumns = getTableGridTemplateColumns(columns, columnWidths);

	return <div className={cn(removeHorizontalPadding && '-mx_8', isInnerContent ? undefined : 'py_25')}>
		<div className='w_f rel x_scr'>
			<TableRoot
				style={{
					gridTemplateColumns: tableGridTemplateColumns,
					width: tableWidthStyle,
				}}
			>
				{mockHeaderRows && (
					<TableHeaderRow
						addHorizontalPadding={!removeHorizontalPadding}
						columns={columns}
						headers={columns.map(() => ({
							mock: true,
							text: '....',
						}))}
						showColumnDividers={tableDesign?.dividers?.columns}
					/>
				)}

				<div className='table_grid_body'>
					{[...Array(mockCount)].map((_, i) => renderMockTableRow(columns, {
						cellClassNames,
						index: i,
						isSmallerRows,
						removeAvatarElement,
						removeBorderLine: removeBorderLine || (!isInnerContent && i === 0),
						showColumnDividers: tableDesign?.dividers?.columns,
					}))}
				</div>
			</TableRoot>
		</div>
	</div>;
});

TableMockClient.displayName = 'TableMockClient';

/**
 * Render a grid table loading mock after client hydration.
 */
export const TableMockSSR = memo((p: TableMockProps) => {
	const didWaitForClient = useWaitForClientRender();
	if (!didWaitForClient) {
		return null;
	}
	return <TableMockClient {...p} />;
});

TableMockSSR.displayName = 'TableMockSSR';

/**
 * Render a route table page loading mock.
 */
export const TablePageMock = memo((p: TableMockProps) => {
	return <TableMockSSR
		mockHeaderRows={p.mockHeaderRows ?? true}
		isSmallerRows={p.isSmallerRows ?? true}
		removeBorderLine={p.removeBorderLine ?? true}
		browserHeightRatio={p.browserHeightRatio || 1}
		cellClassNames={p.cellClassNames}
		columnWidths={p.columnWidths}
		tableDesign={p.tableDesign}
	/>;
});

TablePageMock.displayName = 'TablePageMock';
