import { memo } from 'react';
import type { ReactDivElement } from '@jsb188/react-web/types/dom.d';
import { cn } from '@jsb188/app/utils/string';

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
 * Table cel
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

