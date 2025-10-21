import { cn } from '@jsb188/app/utils/string';
import { Icon } from '@jsb188/react-web/svgs/Icon';
import { memo } from 'react';
import type { TimelineDotColor, TimelineItem } from '../ui/TimelineUI';
import { TimelineDot } from '../ui/TimelineUI';
import { TooltipButton } from './PopOver';

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
      className={cn('rel x_timeline horizontal bg_alt h_8 r')}
    >
      {items.map((item, i) => {
        return <TimelineDot
          key={i}
          left={(i / len) * 100 + '%'}
          position={i === 0 ? 'start' : i === len ? 'end' : 'middle'}
          selected={i <= positionIndex}
          lastSelected={i === positionIndex}
          size={10}
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
  notStarted?: boolean;
  errored?: boolean;
}) => {
  const { items, className, notStarted, errored } = p;
  const color = p.color || 'primary';
  const positionIndex = Number(p.positionIndex);
  const len = items.length - 1;
  const showNotStartedDash = notStarted && len <= 0;

  return <div className={cn('rel x_timeline compact h_item h_1 r mx_4', !showNotStartedDash && 'bg_active', className)}>
    {items.map((item, i) => {
      const isFinished = i <= positionIndex && i === len;
      const selected = i <= positionIndex;
      const completed = item.completed;
      const errorAndNotCompleted = errored && selected && !completed;

      return <TooltipButton
        key={i}
        style={{ left: (i / len) * 100 + '%' }}
        className='tl_dot_cnt v_center rel z1 w_25 h_25'
        rightIconName={(isFinished && errored) || !item.completed ? undefined : 'circle-check'}
        tooltipClassName='a_c'
        as='div'
        position='top'
        message={item.text}
        offsetX={2} // +2 to adjust for .pr_2 padding-right
        offsetY={-3}
      >
        {!errored && (isFinished || completed)
        ? <span className={`cl_${color} ic_sm bg r move_left`}>
          <Icon name='circle-check-filled' />
        </span>
        : <TimelineDot
          outline={showNotStartedDash || (errored && isFinished)}
          position={i === 0 ? 'start' : i === len ? 'end' : 'middle'}
          selected={selected}
          lastSelected={selected}
          size={8}
          color={showNotStartedDash || errorAndNotCompleted ? null : color}
          selectedBorderColor={errorAndNotCompleted ? 'red' : 'primary'}
        />}
      </TooltipButton>;
    })}

    {showNotStartedDash && <>
      <span className='x_timeline_not_started w_40 f_stretch bg_active' />
      <span className='x_timeline_not_started w_40 op_70 f_stretch bg_active' />
      <span className='x_timeline_not_started w_40 op_50 f_stretch bg_active' />
      <span className='x_timeline_not_started w_40 op_30 f_stretch bg_active' />
    </>}

    {positionIndex > 0 && (
      <span
        className={`abs tl_progress bg_${errored ? 'strong' : color}`}
        style={{ width: Math.min(100, (positionIndex / len) * 100) + '%' }}
      />
    )}
  </div>;
});

CompactTimeline.displayName = 'CompactTimeline';
