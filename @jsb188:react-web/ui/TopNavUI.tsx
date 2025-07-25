import { cn } from '@jsb188/app/utils/string';
import { memo } from 'react';
import { SmartLink } from './Button';

/**
 * Top nav item link
 */

export interface TopNavLink {
  designClassName?: string;
  text: string;
  to: string;
  target?: string;
  iconName?: string;
}

interface TopNavItemProps extends TopNavLink {
  something?: string;
}

export const TopNavItem = memo((p: TopNavItemProps) => {
  const { text, to, target, designClassName } = p;

  return <SmartLink
    to={to}
    target={target}
    className={cn('px_sm py_xs cl_bd r_smw lh_1 nowrap', designClassName || 'bg_alt_hv')}
  >
    {text}
  </SmartLink>;
});

TopNavItem.displayName = 'TopNavItem';
