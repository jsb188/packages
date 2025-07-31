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
    className={cn('px_sm py_xs r_smw lh_1 nowrap', designClassName || 'bg_lighter_hv_1 cl_contrast')}
  >
    {text}
  </SmartLink>;
});

TopNavItem.displayName = 'TopNavItem';
