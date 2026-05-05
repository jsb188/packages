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
      'f_stretch h_item px_sm lh_1 no_wrap link ic_md',
      // designClassName || 'cl_lighter_5 bg_contrast_hv cl_solid_hv',
      designClassName || 'cl_df',
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

interface TopNavCTAItemProps extends TopNavItemProps {
  highlighted?: boolean;
}

/**
 * Top nav call-to-action pill link
 */

export const TopNavCTAItem = memo((p: TopNavCTAItemProps) => {
  const { text, to, target, leftIconName, rightIconName, className, designClassName, highlighted } = p;

  return <SmartLink
    to={to}
    target={target}
    linkClassName='trans_link'
    className={cn(
      'r h_36 px_10 h_item lh_1 no_wrap ic_md spd_2 bd_1',
      designClassName || (highlighted ? 'bg_primary bd_invis' : 'bd_contrast cl_df bd_primary_hv bg_primary_hv'),
      // designClassName || (highlighted ? 'bg_primary bd_invis' : 'bg cl_df bd_sky_lt bd_primary_hv'),
      // designClassName || (highlighted ? 'bg_primary bd_invis' : 'bg cl_df bd_sky_lt bg_sky_md_hv'),
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

TopNavCTAItem.displayName = 'TopNavCTAItem';
