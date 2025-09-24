import { cn } from '@jsb188/app/utils/string';
import { memo } from 'react';
import { LabelsAndIcons, type LabelsAndIconsItemProps } from '../modules/ListFeatures';
import { Icon } from '../svgs/Icon';
import type { ReactDivElement } from '../types/dom.d';
import { AvatarImg } from './Avatar';

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

/**
 * Table row/head
 */

export function TRow(p: ReactDivElement & Partial<{
  thead: boolean;
  removeBorderLine: boolean;
  applyGridToRows: boolean;
  gridLayoutStyle: string;
}>) {
  const { thead, removeBorderLine, applyGridToRows, gridLayoutStyle, className, ...rest } = p;
  return <div
    className={cn(
      'lh_1',
      applyGridToRows && !removeBorderLine ? 'bd_lt bd_b_1' : '',
      applyGridToRows ? 'grid gap_n' : 'trow',
      rest.onClick ? 'link bg_primary_hv' : '',
      thead ? 'thead ft_medium cl_md' : '',
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
}) => {
  const { className, flexClassName, applyGridToRows, children, ...rest } = p;
  return <div
    className={cn(
      'tdcol px_xs py_sm min_h_50',
      flexClassName || 'h_item',
      applyGridToRows ? '' : 'bd_lt bd_b_1',
      className
    )}
    {...rest}
  >
    {typeof children === 'string' ? <span className='shift_down ellip'>{children}</span> : children}
  </div>
});


/**
 * Table header
 */

export const THead = memo((p: ReactDivElement & {
  cellClassNames?: (string | undefined)[];
  removeBorderLine?: boolean;
  applyGridToRows?: boolean;
  gridLayoutStyle?: string;
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
  iconName: string;
  avatarDisplayName: string;
  labelIcons: LabelsAndIconsItemProps[];
}>) => {
  const { iconName, avatarDisplayName, title, labelIcons } = p;
  const hasAvatar = !!(iconName || avatarDisplayName);

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

    {title && (
      <span className='ellip shift_down'>
        {title}
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
