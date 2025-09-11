import { memo } from 'react';
import type { ReactDivElement } from '@jsb188/react-web/types/dom.d';
import { cn } from '@jsb188/app/utils/string';

/**
 * Table row/head
 */

export function TRow(p: ReactDivElement & {
  thead?: boolean;
}) {
  const { thead, ...rest } = p;
  return <div
    className={cn(
      'trow',
      'bd_lt bd_b_1',
      thead ? 'thead ft_medium cl_md' : '',
    )}
    {...rest}
  />;
}

/**
 * Table cel
 */

export const TDCol = memo((p: ReactDivElement & {
}) => {
  const { className, ...rest } = p;
  return <div className={cn('tdcol px_xs py_sm bd_lt bd_b_1', className)} {...rest} />
});

