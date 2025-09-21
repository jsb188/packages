import { cn } from '@jsb188/app/utils/string';
import { TooltipButton } from '@jsb188/react-web/modules/PopOver';
import { Icon } from '@jsb188/react-web/svgs/Icon';
import type { ReactDivElement } from '@jsb188/react-web/types/dom.d';
import { memo } from 'react';
import { AvatarImg } from './Avatar';
import { InlineBlockLabel } from './Button';

/**
 * Types
 */

export type TableHeaderObj = Partial<{
  mock: boolean;
  iconName: string;
  text: string;
  style: React.CSSProperties;
  className: string;
}>;

/**
 * Table row/head
 */

export function TRow(p: ReactDivElement & Partial<{
  thead: boolean;
  applyGridToRows: boolean;
  gridLayoutStyle: string;
}>) {
  const { thead, applyGridToRows, gridLayoutStyle, className, ...rest } = p;
  return <div
    className={cn(
      'lh_1',
      applyGridToRows ? 'bd_lt bd_b_1' : '',
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
}) => {
  const { className, applyGridToRows, ...rest } = p;
  return <div
    className={cn(
      'tdcol px_xs py_sm min_h_50 h_item',
      applyGridToRows ? '' : 'bd_lt bd_b_1',
      className
    )}
    {...rest}
  />
});


/**
 * Table header
 */

export const THead = memo((p: ReactDivElement & {
  cellClassNames?: (string | undefined)[];
  applyGridToRows?: boolean;
  gridLayoutStyle?: string;
  headers: TableHeaderObj[];
}) => {
  const { applyGridToRows, gridLayoutStyle, className, cellClassNames, headers } = p;
  return <TRow
    className={className}
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
        <span className={cn('ellip', mock ? 'mock alt ft_md' : '')}>
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

export const TDColMain = memo((p: {
  title: string;
  iconName?: string;
  labelIcons?: Partial<{
    iconName: string;
    tooltipText: string;
    color: string;
    text: string;
  }>[];
}) => {
  const { iconName, title, labelIcons } = p;

  return <span className='h_item'>
    <AvatarImg
      className='mr_sm'
      // letterBackgroundClassName='bg_primary_fd'
      letterBackgroundClassName='bg'
      square outline
      size='tiny'
      // urlPath={photoUri}
    >
      <span className='v_center f p_n r av av_xs ft_xs ft_bold'>
        {iconName && (
          <Icon
            name={iconName}
          />
        )}
      </span>
    </AvatarImg>

    <span className='ellip'>
      {title}
    </span>

    {labelIcons && (
      <span className='f_shrink h_item ml_sm ft_tn gap_2'>
        {labelIcons.map(({ iconName, tooltipText, color, text }, i) => {
          return <TooltipButton
            key={i}
            className={iconName && color ? `cl_${color}` : text ? 'h_item mx_3' : ''}
            as='div'
            position='top'
            message={tooltipText}
            offsetX={0}
            offsetY={-5}
          >
            {iconName
            ? <Icon name={iconName} />
            : text
            ? <InlineBlockLabel
                text={text}
                color={color}
                textColorClassName={color}
              />
            : null}
          </TooltipButton>
        })}
      </span>
    )}
  </span>;
});

TDColMain.displayName = 'TDColMain';