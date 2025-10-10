import { cn } from '@jsb188/app/utils/string';
import { memo } from 'react';
import { LabelsAndIcons, type LabelsAndIconsItemProps } from '../modules/ListFeatures';
import { Icon } from '../svgs/Icon';
import type { ReactDivElement } from '../types/dom.d';
import { AvatarImg } from './Avatar';
import { useWaitForClientRender } from '../utils/dom';

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
  applyGridToRows: boolean;
  gridLayoutStyle: string;
};

/**
 * Table row/head
 */

export function TRow(p: ReactDivElement & Partial<TableRowProps> & {
  thead?: boolean;
  __deleted?: boolean;
}) {
  const { thead, removeBorderLine, applyGridToRows, gridLayoutStyle, className, __deleted, ...rest } = p;
  return <div
    className={cn(
      'lh_1',
      applyGridToRows && !removeBorderLine ? 'bd_lt bd_b_1' : '',
      applyGridToRows ? 'grid gap_n' : 'trow',
      !__deleted && rest.onClick ? 'link bg_primary_hv' : '',
      thead ? 'thead ft_medium cl_md' : '',
      __deleted ? 'op_40' : '',
      className
    )}
    role={rest.onClick ? 'button' : undefined}
    style={applyGridToRows ? { gridTemplateColumns: gridLayoutStyle } : undefined}
    {...rest}
  />;
}

/**
 * Table cell
 */

export const TDCol = memo((p: ReactDivElement & {
  applyGridToRows?: boolean;
  flexClassName?: string;
  placeholderText?: string;
}) => {
  const { className, flexClassName, applyGridToRows, children, ...rest } = p;
  const placeholderText = p.placeholderText ?? '-';

  return <div
    className={cn(
      'tdcol px_xs py_sm min_h_50',
      flexClassName || 'h_item',
      applyGridToRows ? '' : 'bd_lt bd_b_1',
      !children ? 'cl_darker_2' : '',
      className
    )}
    {...rest}
  >
    {children && typeof children !== 'string' ? children
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
  cellClassNames?: (string | undefined)[];
  headers: TableHeaderObj[];
}) => {
  const { removeBorderLine, applyGridToRows, gridLayoutStyle, className, cellClassNames, headers } = p;
  return <TRow
    className={className}
    removeBorderLine={removeBorderLine}
    applyGridToRows={applyGridToRows}
    gridLayoutStyle={applyGridToRows ? gridLayoutStyle : undefined}
    thead
  >
    {headers.map(({iconName, text, mock, className, ...rest}, i) => (
      <TDCol
        key={i}
        applyGridToRows={applyGridToRows}
        className={cn('ft_medium cl_md', cellClassNames?.[i], className)}
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
  title: string;
  titleClassName: string;
  iconName: string;
  avatarDisplayName: string;
  placeholderText?: string;
  labelIcons: LabelsAndIconsItemProps[];
}>) => {
  const { iconName, avatarDisplayName, title, titleClassName, labelIcons } = p;
  const hasAvatar = !!(iconName || avatarDisplayName);
  const placeholderText = p.placeholderText ?? '-';

  return <span className='h_item'>
    {hasAvatar && (
      <AvatarImg
        className='mr_sm'
        // letterBackgroundClassName='bg_primary_fd'
        letterBackgroundClassName='bg'
        square outline
        size='tiny'
        // urlPath={photoUri}
      >
        <span className='v_center f p_n r av av_xs ft_xs ft_bold'>
          {iconName && <Icon name={iconName} />}
        </span>
      </AvatarImg>
    )}

    {(title || placeholderText) && (
      <span className={cn('ellip shift_down', !title && 'cl_darker_2', titleClassName)}>
        {title || placeholderText}
      </span>
    )}

    {labelIcons && (
      <span className={cn('f_shrink h_item gap_1', hasAvatar || title ? 'ml_10' : undefined)}>
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
}) {
  const { index, ...rest } = p;
  const colCount = (rest.gridLayoutStyle?.split(' ') || []).length || 3;
  const modulus = index !== undefined ? (index % 4) * 10 : 0;

  return <TRow
    {...rest}
    applyGridToRows
  >
    {[...Array(colCount)].map((_, colIx) => (
      <TDCol
        key={colIx}
        // className={cellClassNames?.[i]}
        applyGridToRows
      >
        {
        colIx
        ? <span className='mock alt' style={{width: (100 - modulus * colIx) + '%'}}>
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
  browserHeightRatio?: number;
}

export const TableListMockClient = memo((p: TableListMockProps) => {
  const { browserHeightRatio, ...rest } = p;
  const browserHeight = globalThis?.window?.innerHeight || 800; // Fallback to 800 if window is not available
  const hasRatio = browserHeightRatio && browserHeightRatio > 0;

  // NOTE:
  // With <AvatarImg>, item height is 57px
  // Without <AvatarImg>, item height is 51px
  const mockCount = Math.floor(browserHeight * (hasRatio ? browserHeightRatio : 1) / 57);

  return <div className='-mx_xs py_md'>
    <div className='w_f rel table'>
      {[...Array(mockCount)].map((_, i) => (
        <TableListItemMock
          key={i}
          index={i}
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

export const TablePageMock = memo((p: { gridLayoutStyle: string }) => {
  const { gridLayoutStyle } = p;
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
      gridLayoutStyle={gridLayoutStyle}
      browserHeightRatio={.85}
    />
  </>;
});

TablePageMock.displayName = 'TablePageMock';
