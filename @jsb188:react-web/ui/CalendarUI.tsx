import { cn } from '@jsb188/app/utils/string';
import { memo } from 'react';
import { Icon } from '../svgs/Icon';
import './CalendarUI.css';

/**
 * Types
 */

export interface CalendarDayObj {
  int: number;
  day: number;
  month: number;
  year: number;
  isOtherMonth: boolean;
}

/**
 * Calendar; single day item
 */

export type DayHoverLabel = string | ((dayInt: number, startInt?: number, endInt?: number) => string | undefined);

interface CalendarDayProps extends CalendarDayObj {
  dayState?: 'START' | 'END' | 'SELECTED';
  inRange?: boolean;
  disabled?: boolean;
  onClickItem?: (value: any, startInt?: number, endInt?: number) => void;
  dayHoverLabel?: DayHoverLabel;
  startDateInt?: number;
  endDateInt?: number;
}

export const CalendarDay = memo((p: CalendarDayProps) => {
  const { int, day, month, year, inRange, isOtherMonth, disabled, dayState, startDateInt, endDateInt, dayHoverLabel, onClickItem } = p;
  const selected = !!dayState;

  let dayLabel;
  if (dayHoverLabel && !disabled) {
    dayLabel = typeof dayHoverLabel === 'function' ? dayHoverLabel(int, startDateInt, endDateInt) : dayHoverLabel;
  }

  return (
    <div className={cn('v_center', disabled ? 'cl_darker_2' : isOtherMonth && !inRange ? 'cl_md' : '')}>
      {int && (
        <button
          className={cn(
            'cal_day trans_color av_xs r v_center rel',
            selected ? 'bg z2' : '',
            selected || disabled ? '' : 'bd_invis bd_md_hv',
            disabled && !selected ? '' : 'bd_1 bg_hv link'
          )}
          onClick={onClickItem ? () => onClickItem({ int, day, month, year }, startDateInt, endDateInt) : undefined}
          disabled={disabled}
          data-label={dayLabel}
        >
          <span className='shift_down'>
            {day}
          </span>
        </button>
      )}
    </div>
  );
});

CalendarDay.displayName = 'CalendarDay';

/**
 * Calendar; days in week
 */

interface CalendarWeekDaysProps {
  week: CalendarDayObj[];
  startDateInt?: number;
  endDateInt?: number;
  selectedInt?: number;
  maxDateInt?: number;
  onClickItem?: (value: any, startInt?: number, endInt?: number) => void;
  dayHoverLabel?: DayHoverLabel;
}

export const CalendarWeekDays = memo((p: CalendarWeekDaysProps) => {
  const { week, maxDateInt, startDateInt, endDateInt, selectedInt, dayHoverLabel, onClickItem } = p;
  const weekStartInt = week[0]?.int;
  const weekEndInt = week[week.length - 1]?.int;

  let rangeStartIx = null, rangeEndIx = null;
  if (
    startDateInt && endDateInt && weekStartInt &&
    (weekStartInt >= startDateInt || startDateInt <= weekEndInt) &&
    (!endDateInt || weekStartInt <= endDateInt)
  ) {
    rangeStartIx = week.findIndex(dayObj => dayObj.int >= startDateInt);
    rangeStartIx = rangeStartIx === -1 ? null : week[rangeStartIx].int > startDateInt ? 0 : rangeStartIx + 1;
    rangeEndIx = endDateInt ? week.findIndex(dayObj => dayObj.int >= endDateInt) : null;

    if (rangeEndIx === -1) {
      rangeEndIx = endDateInt ? 8 : null;
    } else {
      rangeEndIx = rangeEndIx === 6 && week[rangeEndIx].int < endDateInt! ? 8 : rangeEndIx! + 1;
    }
  }

  const isDateRange = rangeStartIx !== null && rangeEndIx !== null;

  return <div className='cal_week grid size_7 gap_n rel py_1 rel'>
    {rangeStartIx === null && rangeEndIx === null ? null
    : <div
      className={cn('cal_week_range',
        rangeStartIx !== null ? `start_${rangeStartIx}` : '',
        rangeEndIx !== null ? `end_${rangeEndIx}` : ''
      )}
    />}

    {week.map((dayObj, ix) => {
      const dayInt = dayObj?.int || 0;
      return <CalendarDay
        key={dayObj?.int || `empty_${ix}`}
        {...dayObj}
        inRange={isDateRange && ix >= rangeStartIx! && ix < rangeEndIx!}
        dayState={dayInt === startDateInt ? 'START' : dayInt === endDateInt ? 'END' : dayInt === selectedInt ? 'SELECTED' : undefined}
        dayHoverLabel={dayHoverLabel}
        startDateInt={startDateInt}
        endDateInt={endDateInt}
        disabled={!!maxDateInt && dayObj.int > maxDateInt}
        onClickItem={onClickItem}
      />;
    })}
  </div>;
});

CalendarWeekDays.displayName = 'CalendarWeekDays';

/**
 * Weekday labels
 */

export const WeekdayLabels = memo(() => {
  const weekdays = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(1970, 0, 4 + i); // Jan 4, 1970 is a Sunday
    return date.toLocaleDateString('en-US', { weekday: 'short' }).charAt(0);
  });

  return (
    <div className='grid size_7 gap_n a_c ft_xs bd_b_1 bd_lt py_xs mt_xs cl_md'>
      {weekdays.map((day, index) => (
        <div key={index} className='weekday_label'>
          {day}
        </div>
      ))}
    </div>
  );
});

WeekdayLabels.displayName = 'WeekdayLabels';

/**
 * Calendar; month header
 */

interface CalendarMonthHeaderProps {
  onClickPrev?: () => void;
  onClickNext?: () => void;
  text?: string;
}

export const CalendarMonthHeader = memo((p: CalendarMonthHeaderProps) => {
  const { onClickPrev, onClickNext, text } = p;

  return <div className='h_spread a_c ft_xs lh_1 r bg_alt'>
    {onClickPrev
    ? <button
      className='f_stretch v_center av_w_xs ml_3 link'
      onClick={onClickPrev}
    >
      <span className='target trans_transform'>
        <Icon name='arrow-left' />
      </span>
    </button>
    : <span className='f_stretch v_center av_w_xs ml_3' />}

    <span className='py_xs'>
      {text}
    </span>

    {onClickNext
    ? <button
      className='f_stretch v_center av_w_xs mr_3 link'
      onClick={onClickNext}
    >
      <span className='target trans_transform'>
        <Icon name='arrow-right' />
      </span>
    </button>
    : <span className='f_stretch v_center av_w_xs mr_3' />}
  </div>;
});

CalendarMonthHeader.displayName = 'CalendarMonthHeader';
