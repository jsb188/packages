import { cn } from '@jsb188/app/utils/string.ts';
import { memo, type CSSProperties, type HTMLAttributes, type ReactNode, type Ref } from 'react';
import { Icon } from '../svgs/Icon';
import './TableUI.css';

/**
 * Types
 */

export type TableHeaderObj = Partial<{
  mock: boolean;
  iconName: string;
  text: string;
  style: CSSProperties;
  className: string;
  flexClassName: string;
}>;

export type TableColumnWidth = number | string;

export type TableDesignColumn = {
  key: string;
  width: TableColumnWidth;
  header?: TableHeaderObj;
  headerHidden?: boolean;
  cellClassName?: string;
  headerClassName?: string;
};

export type TableDesign = {
  columns: TableDesignColumn[];
  dividers?: {
    columns?: boolean;
    rows?: boolean;
  };
  resizableColumns?: boolean;
};

export type HeaderBorderStyle = 'BORDER' | 'SEPARATOR';

type TableCellBaseProps = {
  addHorizontalPadding?: boolean;
  children?: ReactNode;
  columnIndex: number;
  iconClassName?: string;
  iconName?: string;
  innerClassName?: string;
  isLastColumn?: boolean;
  placeholderText?: string;
  removeLeftPadding?: boolean;
  removeRightPadding?: boolean;
  showColumnDivider?: boolean;
  showRowDivider?: boolean;
  sticky?: boolean;
};

type TableEmptyCellProps = HTMLAttributes<HTMLDivElement> & {
  header?: boolean;
  showColumnDivider?: boolean;
  showRowDivider?: boolean;
  sticky?: boolean;
};

type TableSectionTitleProps = {
  domId?: string;
  text: string;
  className?: string;
  marginClassName?: string;
};

/**
 * Render a compact section title between grouped table rows.
 */

export const TableSectionTitle = memo((p: TableSectionTitleProps) => {
  const { text, domId, className, marginClassName } = p;

  return <div className={cn('table_grid_element rel of pattern_texture active_bf bd_t_1 bd_lt px_20 pt_30 pb_10', marginClassName ?? '', className)} id={domId}>
    {/* <h4 className='ft_normal ft_tn p_n m_n cl_lt rel'> */}
    <div className='ft_medium ft_xl ls_4 rel'>
      {text}
    </div>
  </div>;
});

TableSectionTitle.displayName = 'TableSectionTitle';

/**
 * Return grid root styles while allowing callers to own column tracks.
 */

function getTableRootStyle(style?: CSSProperties): CSSProperties {
  return {
    minWidth: '100%',
    width: '100%',
    ...style,
  };
}

/**
 * Build padding classes for the inner cell content wrapper.
 */

function getTableCellPaddingClassName(p: Pick<TableCellBaseProps, 'addHorizontalPadding' | 'columnIndex' | 'isLastColumn' | 'removeLeftPadding' | 'removeRightPadding'>) {
  const { addHorizontalPadding, columnIndex, isLastColumn, removeLeftPadding, removeRightPadding } = p;
  const regularPadding = !removeLeftPadding && !removeRightPadding
    ? 'px_8'
    : removeLeftPadding
    ? 'pr_8'
    : removeRightPadding
    ? 'pl_8'
    : '';

  return cn(
    regularPadding,
    addHorizontalPadding && columnIndex === 0 && !removeLeftPadding ? 'pl_20' : '',
    addHorizontalPadding && isLastColumn && !removeRightPadding ? 'pr_20' : '',
  );
}

/**
 * Render shared text/icon content inside a grid table cell wrapper.
 */

function renderTableCellInnerContent(p: Pick<TableCellBaseProps, 'children' | 'iconClassName' | 'iconName' | 'placeholderText'>) {
  const { children, iconClassName, iconName, placeholderText = '-' } = p;

  return <>
    {!iconName ? null
    : <span className={cn(iconClassName, children ? 'mr_4' : '')}>
      <Icon name={iconName} />
    </span>}

    {iconName && !children
    ? null
    : children && typeof children !== 'string'
    ? children
    : <span className={cn('shift_down ellip', !children && 'cl_lt')}>
      {children || placeholderText}
    </span>}
  </>;
}

/**
 * Render a grid table root with one shared column template for all rows.
 */

export const TableRoot = memo((p: HTMLAttributes<HTMLDivElement> & {
  tableRef?: Ref<HTMLDivElement>;
}) => {
  const { className, style, tableRef, ...rest } = p;

  return <div
    ref={tableRef}
    className={cn('w_f table_grid_root', className)}
    role='table'
    style={getTableRootStyle(style)}
    {...rest}
  />;
});

TableRoot.displayName = 'TableRoot';

/**
 * Render one grid table header row.
 */

export const TableHeaderRow = memo((p: {
  addHorizontalPadding?: boolean;
  borderStyle?: HeaderBorderStyle;
  cellClassNames?: string | (string | undefined)[];
  className?: string;
  columns: TableDesignColumn[];
  headers?: Partial<TableHeaderObj>[] | null;
  removeLeftPadding?: boolean;
  removeRightPadding?: boolean;
  renderHeaderCellOverlay?: (column: TableDesignColumn, columnIndex: number) => ReactNode;
  showColumnDividers?: boolean;
  showRowDivider?: boolean;
  sticky?: boolean;
}) => {
  const { addHorizontalPadding, cellClassNames, className, columns, headers, removeLeftPadding, removeRightPadding, renderHeaderCellOverlay, showColumnDividers, showRowDivider, sticky } = p;

  return <div className={cn('lh_1 thead table_grid_row', className)} role='row'>
    {columns.map((column, i) => {
      const header = {
        ...column.header,
        ...(headers?.[i] || {}),
        className: cn(column.headerClassName, column.header?.className, headers?.[i]?.className),
        text: column.headerHidden ? '' : (headers?.[i]?.text ?? column.header?.text),
      };

      return <TableHeaderCell
        key={column.key || i}
        addHorizontalPadding={addHorizontalPadding}
        className={cn(
          column.cellClassName,
          typeof cellClassNames === 'string' ? cellClassNames : cellClassNames?.[i],
          header.className,
        )}
        columnIndex={i}
        data-table-column-key={column.key}
        iconName={header.iconName}
        isLastColumn={i === columns.length - 1}
        mock={header.mock}
        removeLeftPadding={removeLeftPadding}
        removeRightPadding={removeRightPadding}
        showColumnDivider={Boolean(showColumnDividers && i > 0)}
        showRowDivider={showRowDivider}
        sticky={sticky}
        style={header.style}
        text={header.text}
      >
        {renderHeaderCellOverlay?.(column, i)}
      </TableHeaderCell>;
    })}

    <TableEmptyCell
      header
      showColumnDivider={Boolean(showColumnDividers && columns.length)}
      showRowDivider={showRowDivider}
      sticky={sticky}
    />
  </div>;
});

TableHeaderRow.displayName = 'TableHeaderRow';

/**
 * Render one grid table header cell.
 */

export const TableHeaderCell = memo((p: HTMLAttributes<HTMLDivElement> & TableCellBaseProps & {
  mock?: boolean;
  text?: string;
}) => {
  const { addHorizontalPadding, children, className, columnIndex, iconClassName: _iconClassName, iconName, innerClassName, isLastColumn, mock, placeholderText: _placeholderText, removeLeftPadding, removeRightPadding, showColumnDivider, showRowDivider: _showRowDivider, sticky, style, text, ...rest } = p;

  return <div
    className={cn('p_n table_grid_cell table_grid_item bd_t_1 bd_b_1 bd_lt', sticky ? 'table_grid_sticky_header_cell' : '', showColumnDivider ? 'bd_l_1' : '')}
    role='columnheader'
    style={{
      fontWeight: 'inherit',
      padding: 0,
      position: 'relative',
      textAlign: 'left',
      ...style,
    }}
    {...rest}
  >
    <div
      className={cn(
        'tdcol py_sm min_h_50 cl_md rel',
        getTableCellPaddingClassName({ addHorizontalPadding, columnIndex, isLastColumn, removeLeftPadding, removeRightPadding }),
        className,
        innerClassName,
      )}
    >
      {iconName && <Icon name={iconName} />}
      <span className={cn('ellip shift_down ft_medium', mock ? 'mock alt ft_md' : '')}>
        {text}
      </span>
      {children}
    </div>
  </div>;
});

TableHeaderCell.displayName = 'TableHeaderCell';

/**
 * Render one grid table body row.
 */

export const TableDataRow = memo((p: HTMLAttributes<HTMLDivElement> & {
  __deleted?: boolean;
  clickable?: boolean;
}) => {
  const { __deleted, children, className, clickable, ...rest } = p;

  return <div
    className={cn(
      'lh_1 table_grid_row',
      // clickable ? 'link bg_zinc_fd_hv' : '',
      clickable ? 'link bg_primary_fd_solid_hv' : '',
      __deleted ? '__deleted' : '',
      className,
    )}
    role={clickable ? 'button' : 'row'}
    {...rest}
  >
    {children}
  </div>;
});

TableDataRow.displayName = 'TableDataRow';

/**
 * Render one grid table data cell.
 */

export const TableDataCell = memo((p: HTMLAttributes<HTMLDivElement> & TableCellBaseProps) => {
  const { addHorizontalPadding, children, className, columnIndex, iconClassName, iconName, innerClassName, isLastColumn, placeholderText, removeLeftPadding, removeRightPadding, showColumnDivider, showRowDivider, style, ...rest } = p;

  return <div
    className={cn('p_n table_grid_cell table_grid_item', showRowDivider ? 'bd_t_1 bd_lt' : '', showColumnDivider ? 'bd_l_1 bd_lt' : '')}
    role='cell'
    style={{
      padding: 0,
      ...style,
    }}
    {...rest}
  >
    <div
      className={cn(
        'tdcol py_5 min_h_38 of',
        getTableCellPaddingClassName({ addHorizontalPadding, columnIndex, isLastColumn, removeLeftPadding, removeRightPadding }),
        className,
        innerClassName,
      )}
    >
      {renderTableCellInnerContent({ children, iconClassName, iconName, placeholderText })}
    </div>
  </div>;
});

TableDataCell.displayName = 'TableDataCell';

/**
 * Render one trailing empty grid cell so every row occupies every grid track.
 */

export const TableEmptyCell = memo((p: TableEmptyCellProps) => {
  const { children, className, header, showColumnDivider, showRowDivider, sticky, style, ...rest } = p;

  return <div
    aria-hidden={children ? undefined : 'true'}
    className={cn('p_n table_grid_cell table_grid_empty_cell pattern_texture rel active_bf', sticky ? 'table_grid_sticky_header_cell' : '', header ? 'bd_t_1 bd_b_2 bd_lt' : showRowDivider ? 'bd_t_1 bd_lt' : '', showColumnDivider ? 'bd_l_1 bd_lt' : '', className)}
    data-prevent-row-click
    role={children ? 'cell' : 'presentation'}
    style={{
      padding: 0,
      ...style,
    }}
    {...rest}
  >
    <div
      className={cn('tdcol w_34 h_center rel', header ? 'min_h_50' : 'min_h_38')}
    >
      {children}
    </div>
  </div>;
});

TableEmptyCell.displayName = 'TableEmptyCell';

/**
 * Render a full-width grid row for row groups, section titles, and custom subrows.
 */

export const TableFullWidthRow = memo((p: HTMLAttributes<HTMLDivElement> & {
  cellClassName?: string;
  colSpan: number;
}) => {
  const { cellClassName, children, className, colSpan: _colSpan, ...rest } = p;

  return <div className={cn('table_grid_row', className)} role='row' {...rest}>
    <div
      className={cn('p_n table_grid_cell table_grid_item table_grid_full_width', cellClassName)}
      role='cell'
      style={{ padding: 0 }}
    >
      {children}
    </div>
  </div>;
});

TableFullWidthRow.displayName = 'TableFullWidthRow';
