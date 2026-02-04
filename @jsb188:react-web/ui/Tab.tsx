import { memo } from 'react';
import { cn } from '@jsb188/app/utils/string.ts';
import { Icon } from '../svgs/Icon';
import './Tab.css';

/**
 * Tabs container (for horizontal scroller)
 */

interface HorizontalScrollContainerProps {
  className?: string;
  addMarginOffset?: boolean;
  children: React.ReactNode;
}

export function HorizontalScrollContainer(p: HorizontalScrollContainerProps) {
  const { className, addMarginOffset, children } = p;
  return <div className={cn('horizontal_scroll rel', addMarginOffset ? 'w_offset' : '', className)}>
    <div className='fade_left z2' />
    <div
      className='inside h_item gap_xs x_scr_hidden'
    >
      {children}
    </div>
    <div className='fade_right z2' />
  </div>;
}

/**
 * Tab item
 */

export interface TabProps {
  value?: string | number | null;
  text: string;
  iconName?: string;
  selected?: boolean;
  onClick?: (value?: string | number | null) => void;
}

export const Tab = memo((p: TabProps) => {
  const { text, iconName, value, onClick, selected } = p;
  const hasLink = !!onClick;

  return <div
    role={onClick ? 'button' : ''}
    onClick={onClick && (() => onClick(value))}
    className={cn(
      'r_df p_sm bg_alt f_shrink w_150 h_70 bd_1 rel of',
      hasLink && !selected ? 'link' : '',
      selected ? '' : 'bd_invis cl_md',
      ''
    )}
  >
    {text}

    {iconName && (
      <span className={cn('ic_lg tab_ic trans_link', selected ? 'cl_bd' : 'cl_lt')}>
        <Icon
          name={iconName}
        />
      </span>
    )}
  </div>
});

Tab.displayName = 'Tab';
