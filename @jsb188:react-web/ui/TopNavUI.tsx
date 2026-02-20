import { cn } from '@jsb188/app/utils/string.ts';
import { Icon } from '@jsb188/react-web/svgs/Icon';
import { memo } from 'react';
import { SmartLink } from './Button';

/**
 * Top nav item link
 */

export interface TopNavLink {
  className?: string;
  designClassName?: string;
  text: string;
  to: string;
  target?: string;
  leftIconName?: string;
  rightIconName?: string;
}

interface TopNavItemProps extends TopNavLink {
  something?: string;
}

export const TopNavItem = memo((p: TopNavItemProps) => {
  const { text, to, target, leftIconName, rightIconName, className, designClassName } = p;

  return <SmartLink
    to={to}
    target={target}
    className={cn(
      'h_40 h_item px_sm lh_1 nowrap link ic_md',
      designClassName || 'cl_lighter_5 bg_contrast_hv cl_solid_hv',
      className
    )}
  >
    {leftIconName && <Icon name={leftIconName} />}
    <span className={cn(
      leftIconName && 'ml_xs',
      rightIconName && 'mr_xs',
    )}>
      {text}
    </span>
    {rightIconName && <Icon name={rightIconName} />}
  </SmartLink>;
});

TopNavItem.displayName = 'TopNavItem';
