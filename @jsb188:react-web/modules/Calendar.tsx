import { memo, useMemo, useState, useEffect, useCallback } from 'react';
import { cn } from '@jsb188/app/utils/string';
import { Icon } from '../icons/Icon';

/**
 * Helpers; get unique calendar int identifier from day/month/year
 *
 * @param day - The day of the month (1-31).
 * @param month - The month of the year (1-12).
 * @param year - The year (e.g., 2023).
 * @returns A unique integer representing the date.
 */

function getCalendarInt(day: number, month: number, year: number): number {
  return day + (month * 100) + (year * 10000);
}

/**
 * Helpers; get day/month/year from date
 *
 * @param date - The date to extract the calendar selector from.
 * @returns An object containing the day, month, and year.
 */

function getCalendarSelector(date?: CalendarSelectedObj | Date | string | number | null): CalendarSelectedObj | null {

  if (date instanceof Date) {

    const calDateObj = {
      day: date.getDate(),
      month: date.getMonth() + 1, // Months are zero-indexed
      year: date.getFullYear()
    };

    return {
      int: getCalendarInt(calDateObj.day, calDateObj.month, calDateObj.year),
      ...calDateObj,
    };
  }

  if (
    date &&
    typeof date === 'object' &&
    date.int && date.day && date.month && date.year
  ) {
    // This is already CalendarSelectedObj
    return date;
  }

  // Convert string or number to Date
  const value = String(date);
  if (!isNaN(Number(value)) && value.length === 8) {
    // This is 8 digit YYYYMMDD CalDate
    const year = Number(value.slice(0, 4));
    const month = Number(value.slice(4, 6));
    const day = Number(value.slice(6, 8));

    return {
      int: getCalendarInt(day, month, year),
      day,
      month,
      year
    }
  }

  return null;
}

/**
 * Month labels
 */

interface MonthLabelsProps {
  month: number;
  year: number;
}

const MonthLabels = memo((p: MonthLabelsProps) => {
  const { month, year } = p;
  const date = new Date(year, month - 1, 1); // month is 1-indexed in props
  const monthText = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return (
    <div className='h_spread a_c ft_xs lh_1 r bg_alt'>
      <button className='f_stretch v_center av_w_xs ml_3 hv_left'>
        <span className='target trans_transform'>
          <Icon name='arrow-left' />
        </span>
      </button>
      <span className='py_xs'>
        {monthText}
      </span>
      <button className='f_stretch v_center av_w_xs mr_3 hv_right'>
        <span className='target trans_transform'>
          <Icon name='arrow-right' />
        </span>
      </button>
    </div>
  );
});

MonthLabels.displayName = 'MonthLabels';

/**
 * Weekday labels
 */

const WeekdayLabels = memo(() => {
  const weekdays = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(1970, 0, 4 + i); // Jan 4, 1970 is a Sunday
    return date.toLocaleDateString('en-US', { weekday: 'short' }).charAt(0);
  });

  return (
    <div className='grid size_7 gap_n a_c ft_xs bd_b bd_lt py_xs mt_xs'>
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
 * Calendar; single day item
 */

interface CalendarDayObj {
  int: number;
  day: number;
  month: number;
  year: number;
  isOtherMonth: boolean;
}

interface CalendarDayProps extends CalendarDayObj {
  selected: boolean;
  onClickItem?: OnClickCalendaryDayFn;
}

const CalendarDay = memo((p: CalendarDayProps) => {
  const { int, day, month, year, isOtherMonth, selected, onClickItem } = p;

  return (
    <div className={cn('v_center', isOtherMonth && 'cl_lt')}>
      {int && (
        <button
          className={cn('trans_color av_xs r v_center bg_alt_hv link bd_1', selected ? '' : 'bd_invis bd_md_hv')}
          onClick={onClickItem ? () => onClickItem({ int, day, month, year }) : undefined}
        >
          {day}
        </button>
      )}
    </div>
  );
});

CalendarDay.displayName = 'CalendarDay';

/**
 * Calendar; days
 */

interface CalendarDaysProps {
  selectedInt?: number;
  month: number;
  year: number;
  displayNextMonthDays?: boolean;
  onClickItem?: OnClickCalendaryDayFn;
}

const CalendarDays = memo((p: CalendarDaysProps) => {
  const { selectedInt, month, year, displayNextMonthDays, onClickItem } = p;

  // Create an array for the calendar days
  const daysArr = useMemo(() => {
    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0);
    const daysInMonth = lastDay.getDate();
    const firstWeekday = firstDay.getDay(); // 0 = Sunday

    const daysList: CalendarDayObj[] = [];

    // Get previous month
    const prevMonth = month === 1 ? 12 : month - 1;
    const prevYear = month === 1 ? year - 1 : year;
    const prevMonthLastDay = new Date(prevYear, prevMonth, 0).getDate();

    // Fill leading days from previous month
    for (let i = firstWeekday - 1; i >= 0; i--) {
      const day = prevMonthLastDay - i;
      daysList.push({
        int: getCalendarInt(day, prevMonth, prevYear),
        day,
        month: prevMonth,
        year: prevYear,
        isOtherMonth: true,
      });
    }

    // Fill current month
    for (let day = 1; day <= daysInMonth; day++) {
      daysList.push({
        int: getCalendarInt(day, month, year),
        day,
        month,
        year,
        isOtherMonth: false,
      });
    }

    if (displayNextMonthDays) {
      // Fill trailing days from next month to make total 42 (6 weeks)
      const totalCells = 42;
      const remainingCells = totalCells - daysList.length;
      const nextMonth = month === 12 ? 1 : month + 1;
      const nextYear = month === 12 ? year + 1 : year;

      for (let day = 1; day <= remainingCells; day++) {
        daysList.push({
          int: getCalendarInt(day, nextMonth, nextYear),
          day,
          month: nextMonth,
          year: nextYear,
          isOtherMonth: true,
        });
      }
    }

    return daysList;
  }, [month, year]);

  return (
    <div className='grid size_7 gap_n a_c ft_xs py_xs'>
      {daysArr.map((dayObj, index) => (
        <CalendarDay
          key={dayObj?.int || `empty_${index}`}
          {...dayObj}
          selected={dayObj?.int === selectedInt}
          onClickItem={onClickItem}
        />
      ))}
    </div>
  );
});

CalendarDays.displayName = 'CalendarDays';

/**
 * Calendar; main
 */

type OnClickCalendaryDayFn = (value: CalendarSelectedObj | null) => void;

export type OnChangeCalendarDayFn = (name: string, value: CalendarSelectedObj | null) => void;

interface CalendarProps {
  name: string; // Form name; ie. for start/end date
  value?: CalendarSelectedObj | string | number | null;
  className?: string;
  initialDate?: Date;
  displayNextMonthDays?: boolean;
  onChange?: OnChangeCalendarDayFn;
}

export interface CalendarSelectedObj {
  int: number;
  day: number;
  month: number;
  year: number;
}

interface CalendarViewObj {
  month: number;
  year: number;
}

const CalendarMain = memo((p: CalendarProps) => {
  const { name, initialDate, className, displayNextMonthDays, onChange } = p;
  const value = getCalendarSelector(p.value);
  // const [selected, setSelected] = useState<CalendarSelectedObj | null>(() => getCalendarSelector(initialDate));
  const [calendarView, setCalendarView] = useState<CalendarViewObj>(() => {
    const obj = value || getCalendarSelector(new Date());
    return { month: obj!.month, year: obj!.year };
  });

  const onClickItem = useCallback((value: CalendarSelectedObj | null) => {
    // setSelected(value);
    onChange?.(name, value);
  }, []);

  // useEffect(() => {
  //   if (onChange) {
  //     onChange(name, selected);
  //   }
  // }, [selected]);

  return <section className={cn('calendar_cnt', className)}>
    <MonthLabels
      month={calendarView.month}
      year={calendarView.year}
    />
    <WeekdayLabels />
    <CalendarDays
      {...calendarView}
      displayNextMonthDays={displayNextMonthDays}
      selectedInt={value?.int}
      onClickItem={onClickItem}
    />
  </section>;
});

CalendarMain.displayName = 'CalendarMain';

export default CalendarMain;
