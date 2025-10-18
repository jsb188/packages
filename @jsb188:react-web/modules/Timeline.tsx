import { cn } from '@jsb188/app/utils/string';
import { memo } from 'react';
import type { TimelineItem, TimelineDotColor } from '../ui/TimelineUI';
import { TimelineDot } from '../ui/TimelineUI';
import { TooltipButton } from './PopOver';
import { Icon } from '@jsb188/react-web/svgs/Icon';

/**
 * Horizontal Timeline
 */

export const HorizontalTimeline = memo((p: {
  removeLine?: boolean;
  positionIndex?: number;
  items: Partial<TimelineItem>[];
  className?: string;
  color?: TimelineDotColor;
}) => {
  const { removeLine, items, className } = p;
  const color = p.color || 'strong';
  const positionIndex = Number(p.positionIndex);
  const len = items.length - 1;

  return <div className={cn('px_15 py_30', className)}>
    <div
      className={cn('rel x_timeline horizontal h_8 r')}
    >
      {items.map((item, i) => {
        return <TimelineDot
          key={i}
          left={(i / len) * 100 + '%'}
          position={i === 0 ? 'start' : i === len ? 'end' : 'middle'}
          selected={i <= positionIndex}
          lastSelected={i === positionIndex}
          size={8}
          color={color}
          {...item}
        />;
      })}

      {!removeLine && positionIndex > 0 && (
        <span
          className={`abs tl_progress bg_${color}`}
          style={{ width: Math.min(100, (positionIndex / len) * 100) + '%' }}
        />
      )}
    </div>
  </div>;
});

HorizontalTimeline.displayName = 'HorizontalTimeline'

/**
 * Smaller timeline with PopOver
 */

export const CompactTimeline = memo((p: {
  positionIndex?: number;
  items: Partial<TimelineItem>[];
  className?: string;
  color?: TimelineDotColor;
}) => {
  const { items, className } = p;
  const color = p.color || 'primary';
  const positionIndex = Number(p.positionIndex);
  const len = items.length - 1;

  return <div className={cn('rel x_timeline compact h_1 r mx_4', className)}>
    {items.map((item, i) => {
      const isFinished = i < positionIndex && i === len;
      return <TooltipButton
        key={i}
        style={{ left: (i / len) * 100 + '%' }}
        className='tl_dot_cnt tl_dot_hv v_center rel z1 w_25 h_25'
        tooltipClassName='a_c'
        as='div'
        position='top'
        message={item.text}
        offsetX={2} // +2 to adjust for .pr_2 padding-right
        offsetY={-5}
      >
        {isFinished
        ? <span className={`cl_${color} ft_sm`}>
          <Icon name='circle-check-filled' />
        </span>
        : <TimelineDot
          position={i === 0 ? 'start' : i === len ? 'end' : 'middle'}
          selected={i <= positionIndex}
          lastSelected={i <= positionIndex}
          size={2}
          color={color}
          selectedBorderColor='primary'
        />}
      </TooltipButton>;
    })}

    {positionIndex > 0 && (
      <span
        className={`abs tl_progress bg_${color}`}
        style={{ width: Math.min(100, (positionIndex / len) * 100) + '%' }}
      />
    )}
  </div>;
});

CompactTimeline.displayName = 'CompactTimeline';
