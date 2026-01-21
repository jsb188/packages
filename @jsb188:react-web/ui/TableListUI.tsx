import { cn } from '@jsb188/app/utils/string';
import { memo } from 'react';
import { LabelsAndIcons, type LabelsAndIconsItemProps } from '../modules/ListFeatures';
import { Icon } from '../svgs/Icon';
import type { ReactDivElement } from '../types/dom.d';
import { useWaitForClientRender } from '../utils/dom';
import { AvatarImg } from './Avatar';
import './TableListUI.css';

/**
 * Types
 */

export type TableHeaderObj = Partial<{
  mock: boolean;
  iconName: string;
  text: string;
  style: React.CSSProperties;
  className: string;
  flexClassName: string;
}>;

export type TableRowProps = {
  removeBorderLine: boolean;
  gridLayoutStyle: string;
};

/**
 * Table row/head
 */

export function TRow(p: ReactDivElement & Partial<TableRowProps> & {
  __deleted?: boolean;
  thead?: boolean;
  doNotApplyGridToRows?: boolean;
}) {
  const { thead, removeBorderLine, doNotApplyGridToRows, gridLayoutStyle, className, __deleted, ...rest } = p;

  return <div
    className={cn(
      'lh_1',
      !doNotApplyGridToRows && !removeBorderLine ? 'bd_lt bd_t_1' : '',
      !doNotApplyGridToRows ? 'grid gapy_n gapx_5' : 'trow',
      !__deleted && rest.onClick ? 'link bg_primary_fd_hv' : '',
      thead ? 'thead' : '',
      __deleted ? '__deleted' : '',
      className
    )}
    role={rest.onClick ? 'button' : undefined}
    style={!doNotApplyGridToRows ? { gridTemplateColumns: gridLayoutStyle } : undefined}
    {...rest}
  />;
}

/**
 * Table cell
 */

interface TDColProps extends ReactDivElement {
  removeLeftPadding?: boolean;
  removeRightPadding?: boolean;
  // flexClassName?: string;
  placeholderText?: string;
  iconName?: string;
  iconClassName?: string;
}

export const TDCol = memo((p: TDColProps & {
  doNotApplyGridToRows?: boolean;
}) => {
  const { className, doNotApplyGridToRows, removeLeftPadding, removeRightPadding, iconName, iconClassName, children, ...rest } = p;
  const placeholderText = p.placeholderText ?? '-';

  return <div
    className={cn(
      'tdcol',
      className ?? 'py_sm min_h_50',
      !removeLeftPadding && !removeRightPadding ? 'px_xs' : removeLeftPadding ? 'pr_xs' : removeRightPadding ? 'pl_xs' : '',
      // flexClassName || 'h_item',
      doNotApplyGridToRows ? 'bd_lt bd_t_1' : '',
      !children ? 'cl_darker_2' : '',
    )}
    {...rest}
  >
    {!iconName ? null
    : <span className={cn(iconClassName, children ? 'mr_4' : '')}>
      <Icon name={iconName} />
    </span>}

    {iconName && !children
    ? null
    : children && typeof children !== 'string'
    ? children
    : <span className='shift_down ellip'>
      {children || placeholderText}
    </span>}
  </div>
});

TDCol.displayName = 'TDCol';

/**
 * Table header
 */

export const THead = memo((p: ReactDivElement & Partial<TableRowProps> & {
  addHeaderBorder?: boolean;
  removeLeftPadding?: boolean;
  removeRightPadding?: boolean;
  cellClassNames?: string | (string | undefined)[];
  doNotApplyGridToRows?: boolean;
  headers: TableHeaderObj[];
}) => {
  const { addHeaderBorder, removeLeftPadding, removeRightPadding, doNotApplyGridToRows, gridLayoutStyle, className, cellClassNames, headers } = p;

  return <TRow
    className={cn(addHeaderBorder && 'bd_b_1 bd_lt mb_6', className)}
    removeBorderLine
    doNotApplyGridToRows={doNotApplyGridToRows}
    gridLayoutStyle={doNotApplyGridToRows ? undefined : gridLayoutStyle}
    thead
  >
    {headers.map(({iconName, text, mock, className, ...rest}, i) => (
      <TDCol
        key={i}
        removeLeftPadding={removeLeftPadding}
        removeRightPadding={removeRightPadding}
        doNotApplyGridToRows={doNotApplyGridToRows}
        className={cn('py_sm min_h_50 ft_medium cl_lt', typeof cellClassNames === 'string' ? cellClassNames : cellClassNames?.[i], className)}
        {...rest}
      >
        {iconName && <Icon name={iconName} />}
        <span className={cn('ellip shift_down', mock ? 'mock alt ft_md' : '')}>
          {text}
        </span>
      </TDCol>
    ))}
  </TRow>;
});

THead.displayName = 'THead';

/**
 * Table main cell
 */

export const TDColMain = memo((p: Partial<{
  __deleted: boolean;
  className: string;
  title: string;
  titleClassName: string;
  iconName: string;
  avatarColor?: string;
  avatarDisplayName: string;
  placeholderText?: string;
  labelIcons: LabelsAndIconsItemProps[];
}>) => {
  const { __deleted, title, iconName, avatarColor, avatarDisplayName, titleClassName, labelIcons, className } = p;
  const hasAvatar = !!(iconName || avatarDisplayName);

  const placeholderText = p.placeholderText ?? '-';
  const showPlaceholder = !p.title && !!placeholderText && !labelIcons;

  return <span className={cn('h_item', className)}>
    {hasAvatar && (
      <AvatarImg
        className='mr_sm'
        // letterBackgroundClassName='bg_primary_fd'
        displayName={iconName ? undefined : avatarDisplayName}
        letterBackgroundClassName={'bg' + (avatarColor ? '_' + avatarColor : '')}
        square outline
        size='tiny'
        // urlPath={photoUri}
      >
        {iconName &&
        <span className='v_center f p_n r av av_xs ft_xs ft_bold'>
          {<Icon name={iconName} />}
        </span>}
      </AvatarImg>
    )}

    {(title || showPlaceholder) && (
      <span className={cn('ellip shift_down', !title && 'cl_darker_2', titleClassName)}>
        {title || placeholderText}
      </span>
    )}

    {labelIcons && (
      <span className={cn('f_shrink h_item gap_1', hasAvatar || title || showPlaceholder ? 'ml_10' : undefined)}>
        <LabelsAndIcons
          items={labelIcons}
        />
      </span>
    )}
  </span>;
});

TDColMain.displayName = 'TDColMain';

/**
 * Table list mock item
 */

export function TableListItemMock(p: Partial<TableRowProps> & {
  index?: number;
  className?: string;
}) {
  const { removeBorderLine, index, className, ...rest } = p;
  const colCount = (rest.gridLayoutStyle?.split(' ') || []).length || 3;
  const modulus = index !== undefined ? (index % 4) * 10 : 0;

  return <TRow
    {...rest}
    removeBorderLine={removeBorderLine}
  >
    {[...Array(colCount)].map((_, colIx) => (
      <TDCol
        key={colIx}
        className={className}
        // className={cellClassNames?.[i]}
      >
        {
        colIx
        ? <span className='mock alt min_w_20' style={{width: (100 - modulus * colIx) + '%'}}>
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
      </TDCol>
    ))}
  </TRow>;
}

/**
 * Table list mock (client)
 * NOTE: This cannot be used in SSR due to globalThis object - it will fail the hydration test
 */

interface TableListMockProps extends Partial<TableRowProps> {
  isInnerContent?: boolean;
  cellClassNames?: string | (string | undefined)[];
  browserHeightRatio?: number;
}

export const TableListMockClient = memo((p: TableListMockProps) => {
  const { browserHeightRatio, cellClassNames, isInnerContent, ...rest } = p;
  const browserHeight = globalThis?.window?.innerHeight || 800; // Fallback to 800 if window is not available
  const hasRatio = browserHeightRatio && browserHeightRatio > 0;

  // NOTE:
  // With <AvatarImg>, item height is 57px
  // Without <AvatarImg>, item height is 51px
  const mockCount = Math.floor(browserHeight * (hasRatio ? browserHeightRatio : 1) / 57);

  return <div className={isInnerContent ? undefined : '-mx_xs py_md'}>
    <div className='w_f rel table'>
      {[...Array(mockCount)].map((_, i) => (
        <TableListItemMock
          key={i}
          index={i}
          className={typeof cellClassNames === 'string' ? cellClassNames : cellClassNames?.[i]}
          removeBorderLine={!isInnerContent && i === 0}
          {...rest}
        />
      ))}
    </div>
  </div>;
});

TableListMockClient.displayName = 'TableListMockClient';

/**
 * Table list mock (SSR allowed)
 */

export const TableListMockSSR = memo((p: TableListMockProps) => {
  const didWaitForClient = useWaitForClientRender();
  if (!didWaitForClient) {
    return null;
  }
  return <TableListMockClient {...p} />;
});

TableListMockSSR.displayName = 'TableListMockSSR';

/**
 * Table page mock
 */

export const TablePageMock = memo((p: {
  gridLayoutStyle: string,
  cellClassNames?: string | (string | undefined)[]
  browserHeightRatio?: number;
}) => {
  const { gridLayoutStyle, browserHeightRatio, cellClassNames } = p;
  return <>
    <div className='pb_xs h_item gap_5'>
      <span className='r h_item py_3 rel pill_xs ft_sm bg_alt'>
        <span className='mock alt ft_tn'>
          ... ... ... ... ... ... ... ... .
        </span>
      </span>

      <span className='r h_item py_3 rel pill_xs ft_sm bg_alt'>
        <span className='mock alt ft_tn'>
          ... ... ... ... ... ... ... ... .
        </span>
      </span>
    </div>

    {/* <CondensedGroupTitleMock /> */}

    <TableListMockSSR
      cellClassNames={cellClassNames}
      gridLayoutStyle={gridLayoutStyle}
      browserHeightRatio={browserHeightRatio || .85}
    />
  </>;
});

TablePageMock.displayName = 'TablePageMock';

/**
 * Simpler, staic table list without any mapping or reactivity;
 * If either is desired, use <VZTable />
 */

export const TableList = memo((p: {
  gridLayoutStyle: string;
  headers?: TableHeaderObj[];
  removeLeftPadding?: boolean;
  removeRightPadding?: boolean;
  rows: Partial<Omit<TableRowProps, 'removeLeftPadding' | 'removeRightPadding'>> & {
    __deleted?: boolean;
    columns: Omit<TDColProps, 'removeLeftPadding' | 'removeRightPadding'>[];
  }[];
}) => {
  const { headers, rows, gridLayoutStyle, removeLeftPadding, removeRightPadding } = p;

  return <>
    {headers && (
      <THead
        removeLeftPadding={removeLeftPadding}
        removeRightPadding={removeRightPadding}
        gridLayoutStyle={gridLayoutStyle}
        headers={headers}
        // cellClassNames={cellClassNames}
      />
    )}

    {rows.map((row, i) => {
      const { columns, ...rest } = row;
      return <TRow
        key={i}
        gridLayoutStyle={gridLayoutStyle}
        // removeBorderLine={i !== 0}
        {...rest}
      >
        {columns.map((col, ii) => {
          return <TDCol
            key={ii}
            removeLeftPadding={removeLeftPadding}
            removeRightPadding={removeRightPadding}
            // className='h_45 py_xs'
            {...col}
          />;
        })}
      </TRow>;
    })}
  </>;
});

TableList.displayName = 'TableList';
