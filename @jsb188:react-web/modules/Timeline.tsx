import { cn } from '@jsb188/app/utils/string';
import { Icon } from '@jsb188/react-web/svgs/Icon';
import { memo } from 'react';
import type { TimelineItem } from '../ui/TimelineUI';
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
  color?: string;
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
 * Calculate last line gradient
 */

const LastLineGradient = memo((p: {
  errored?: boolean;
  isSingle?: boolean;
  positionIndex: number;
  lastIndex: number;
  fromColor: string;
}) => {
  const { errored, isSingle, positionIndex, lastIndex, fromColor } = p;
  if (!errored && positionIndex === -1 && lastIndex === 0) {
    return <span
      className='abs tl_progress medium_to_none'
      style={{
        left: '0%',
        width: '70%'
      }}
    />;
  }

  if (
    positionIndex < 0 ||
    (positionIndex === lastIndex && (!isSingle || positionIndex > 0))
    // (positionIndex === lastIndex && (positionIndex || lastIndex))
  ) {
    return null;
  }

  let leftStart;
  if (lastIndex === 0) {
    leftStart = 0;
  } else {
    leftStart = (positionIndex / lastIndex) * 100;
  }

  const isReversed = !positionIndex && !lastIndex;
  const gradientClassName = isReversed ? `bg_none_to_${fromColor}` : `bg_${fromColor}_to_none`;
  const width = Math.min(50, 100 - leftStart);

  // return '>>> ' + positionIndex + ' / ' + lastIndex + ' > ' + leftStart + '% ---- ' + gradientClassName + ' > ' + width + '%';

  return <span
    className={`abs tl_progress ${gradientClassName}`}
    style={{
      left: isReversed ? (100 - width) + '%' : leftStart + '%',
      width: width + '%'
    }}
  />;
});

LastLineGradient.displayName = 'LastLineGradient';

/**
 * Smaller timeline with PopOver
 */

export const CompactTimeline = memo((p: {
  positionIndex?: number;
  items: Partial<TimelineItem>[];
  lastIconName?: string;
  className?: string;
  notStarted?: boolean;
  errored?: boolean;
}) => {
  const { items, className, notStarted, errored, lastIconName } = p;
  const lineColor = 'pass';
  const positionIndex = Number(p.positionIndex);
  const linePositionIx = positionIndex - (errored ? 1 : 0);
  const lastIndex = items.length - 1;
  const showNotStartedDash = notStarted && lastIndex <= 0;
  const isSingle = !showNotStartedDash && lastIndex === 0;

  // const lastCompletedIx = items.findIndex((item) => !item.completed) - 1;
  // const lastItemIx = lastCompletedIx + (errored ? 1 : 0)

  // if (p.isTest) {
  //   console.log(p);
  //   console.log('showNotStartedDash', showNotStartedDash, notStarted, lastIndex);
  // }

  const itemColors = items.map((item, i) => {
    const selected = i <= positionIndex;
    const completed = item.completed && !notStarted;
    const errorAndNotCompleted = errored && selected && !completed;
    return showNotStartedDash ? null : errorAndNotCompleted ? 'err' : 'pass';
  });

  return <div className={cn('rel x_timeline compact h_item h_1 r mx_4', !showNotStartedDash && 'bg_active', className)}>
    {items.map((item, i) => {
      const isFinished = i <= positionIndex && i === lastIndex && !notStarted;
      const selected = i <= positionIndex;
      const completed = item.completed && !notStarted;
      const errorAndNotCompleted = errored && selected && !completed;
      const outline = (showNotStartedDash || !completed) && !errorAndNotCompleted;

      return <TooltipButton
        key={i}
        style={{ left: isSingle ? '100%' : (i / lastIndex) * 100 + '%' }}
        className='tl_dot_cnt v_center rel z1 w_25 h_25'
        rightIconName={(isFinished && errored) || !item.completed ? undefined : 'circle-check'}
        tooltipClassName='a_c'
        as='div'
        position='top'
        message={item.text}
        offsetX={2} // +2 to adjust for .pr_2 padding-right
        offsetY={-3}
      >
        {/* {!errored && (isFinished || completed)
        ? <span className={`cl_${color} ic_sm bg r move_left`}>
          <Icon name='circle-check-filled' />
        </span> */}
        {i === lastIndex && lastIconName
        ? <span className={`cl_${positionIndex < i ? 'lt' : errored ? 'err' : completed ? 'pass' : 'lt'} bg r move_left`}>
          <Icon name={lastIconName} />
        </span>
        : <TimelineDot
          outline={outline}
          position={i === 0 ? 'start' : i === lastIndex ? 'end' : 'middle'}
          selected={selected && !notStarted}
          lastSelected={selected && !notStarted}
          size={outline ? 8 : 6}
          color={itemColors[i]}
          selectedBorderColor={errorAndNotCompleted ? 'err' : 'pass'}
        />}
      </TooltipButton>;
    })}

    {
    !notStarted && (
      linePositionIx > 0
      // ||
      // (isSingle && linePositionIx === 0)
    ) && (
      <span
        className={`abs tl_progress bg_${lineColor}`}
        style={{ width: (isSingle ? 100 : Math.min(100, (linePositionIx / lastIndex) * 100)) + '%' }}
      />
    )}

    <LastLineGradient
      errored={errored}
      isSingle={isSingle}
      positionIndex={linePositionIx}
      lastIndex={lastIndex}
      fromColor={itemColors[errored ? linePositionIx : lastIndex] || 'none'}
      // toColor={itemColors[errored ? positionIndex : lastIndex + 1] || 'none'}
    />
  </div>;
});

CompactTimeline.displayName = 'CompactTimeline';
