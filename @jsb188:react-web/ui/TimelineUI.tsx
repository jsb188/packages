import { cn } from '@jsb188/app/utils/string';
import './TimelineUI.css';
import { memo } from 'react';
import { Icon } from '@jsb188/react-web/svgs/Icon';

/**
 * Types
 */

interface TimelineItem {
  iconName: string;
  selectedIconName?: string;
  text: string;
}

/**
 * Timeline dot item
 */

const TimelineDot = memo((p: TimelineItem & {
  left: number;
  position: 'start' | 'middle' | 'end';
  selected: boolean;
  lastSelected: boolean;
  className?: string;
}) => {
  const { text, left, position, selected, lastSelected, iconName, selectedIconName, className } = p;

  return <span
    style={{ left }}
    className={cn(
      'r rel z1 tl_dot',
      selected ? 'selected' : 'not_selected bg_medium',
      lastSelected ? 'last_selected' : 'not_last_selected',
      position,
      className
    )}
  >
    <span className='tl_icon v_center'>
      <Icon name={lastSelected && selectedIconName ? selectedIconName : iconName} />
    </span>
    <span className={cn('tl_text ft_xs nowrap a_c ellip', selected ? 'cl_bd' : '')}>
      {text}
    </span>
  </span>;
});

TimelineDot.displayName = 'TimelineDot';

/**
 * Horizontal Timeline
 */

export const HorizontalTimeline = memo((p: {
  positionIndex?: number;
  items: TimelineItem[];
  className?: string;
}) => {
  const { items, className } = p;
  const positionIndex = Number(p.positionIndex);
  const len = items.length - 1;

  return <div className={cn('px_15 py_30', className)}>
    <div
      className={cn('rel x_timeline h_6 r')}
    >
      {items.map((item, i) => {
        return <TimelineDot
          key={i}
          left={(i / len) * 100 + '%'}
          position={i === 0 ? 'start' : i === len ? 'end' : 'middle'}
          selected={i <= positionIndex}
          lastSelected={i === positionIndex}
          {...item}
        />;
      })}

      {positionIndex > 0 && <span className='abs tl_progress bg_darker_2' style={{ width: (positionIndex / len) * 100 + '%' }} />}
    </div>
  </div>;
});

HorizontalTimeline.displayName = 'HorizontalTimeline'

/**
 * Smaller timeline with PopOver
 */

export const CompactTimeline = memo((p: {
  positionIndex?: number;
  items: TimelineItem[];
  className?: string;
}) => {
  const { items, className } = p;
  const positionIndex = Number(p.positionIndex);
  const len = items.length - 1;

  return <div className={cn('px_15 py_30', className)}>
    <div
      className={cn('rel x_timeline h_6 r')}
    >
      {items.map((item, i) => {
        return <TimelineDot
          key={i}
          left={(i / len) * 100 + '%'}
          position={i === 0 ? 'start' : i === len ? 'end' : 'middle'}
          selected={i <= positionIndex}
          lastSelected={i === positionIndex}
          {...item}
        />;
      })}

      {positionIndex > 0 && <span className='abs tl_progress bg_darker_2' style={{ width: (positionIndex / len) * 100 + '%' }} />}
    </div>
  </div>;
});

CompactTimeline.displayName = 'CompactTimeline';