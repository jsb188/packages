import { cn } from '@jsb188/app/utils/string';
import { memo } from 'react';
import { Icon } from '../svgs/Icon';
import { InlineBlockLabel } from '../ui/Button';
import { TooltipButton } from './PopOver';
/**
 * Types
 */

export type LabelsAndIconsItemProps = Partial<{
  className: string;
  iconName: string;
  tooltipText: string;
  color: string;
  text: string;
}>;

/**
 * Labels and Icons
 * (with support for ToolTip texts)
 */

export const LabelsAndIcons = memo((p: {
  items: LabelsAndIconsItemProps[];
}) => {
  const { items } = p;

  return items.map(({ className, iconName, tooltipText, color, text }, i) => {
    return <TooltipButton
      key={i}
      className={cn('pr_2', className, iconName && color ? `cl_${color}` : text ? 'h_item mx_3' : '')}
      tooltipClassName='a_c max_w_200'
      as='div'
      position='top'
      message={tooltipText}
      offsetX={2} // +2 to adjust for .pr_2 padding-right
      offsetY={iconName ? -6 : -14}
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
  });
});

LabelsAndIcons.displayName = 'LabelsAndIcons';