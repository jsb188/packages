import { cn } from '@jsb188/app/utils/string';
import { memo } from 'react';
import { Icon } from '../svgs/Icon';
import './TimelineUI.css';

/**
 * Types
 */

export type TimelineDotColor = 'strong' | 'primary' | 'secondary';

export interface TimelineItem {
  iconName: string;
  selectedIconName?: string;
  text: string;
  color: TimelineDotColor | null;
  completed?: boolean;
}

/**
 * Timeline dot item
 */

export const TimelineDot = memo((p: Partial<TimelineItem> & {
  outline?: boolean;
  size: number;
  left?: number | string;
  position: 'start' | 'middle' | 'end';
  selected: boolean;
  lastSelected: boolean;
  className?: string;
  selectedBorderColor?: string;
}) => {
  const { outline, color, selectedBorderColor, size, text, left, position, selected, lastSelected, iconName, selectedIconName, className } = p;
  const dotIconName = lastSelected && selectedIconName ? selectedIconName : iconName;

  return <span
    style={left || left === 0 ? { left } : undefined}
    className={cn(
      'r tl_dot tl_dot_cnt rel z1',
      outline ? 'bd_2' : '',
      outline && !selected ? 'bd_lt' : '',
      size >= 4 || selected ? `w_${size} h_${size}` : 'w_4 h_4',
      selected ? `selected bg_${color} bd_2 bd_${selectedBorderColor ?? 'darker_1'}` : `not_selected ${outline ? 'bg' : 'bg_medium'}`,
      lastSelected ? 'last_selected ' : 'not_last_selected',
      // lastSelected ? 'bd_1 bd_darker_2' : selected ? '' : '',
      position,
      className
    )}
  >
    {dotIconName &&
    <span className='tl_icon v_center'>
      <Icon
        name={dotIconName}
        tryColor={!selectedIconName && lastSelected}
      />
    </span>}
    {text &&
    <span
      className={cn(
        'tl_text ft_xs nowrap a_c ellip',
        selected ? 'cl_bd' : ''
      )}
    >
      {text}
    </span>}
  </span>;
});

TimelineDot.displayName = 'TimelineDot';
