import i18n from '@jsb188/app/i18n';
import { cn } from '@jsb188/app/utils/string';
import { memo, useCallback, useMemo, useState } from 'react';
import type { CalendarDayObj, DayHoverLabel } from '../ui/CalendarUI';
import { CalendarMonthHeader, CalendarWeekDays, WeekdayLabels } from '../ui/CalendarUI';

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

interface MonthHeaderProps {
  minMonth?: number;
  minYear?: number;
  maxMonth?: number;
  maxYear?: number;
  month: number;
  year: number;
  setCalendarView: (view: CalendarViewObj) => void;
}

const MonthHeader = memo((p: MonthHeaderProps) => {
  const { minMonth, minYear, maxMonth, maxYear, month, year, setCalendarView } = p;
  const date = new Date(year, month - 1, 1); // month is 1-indexed in props
  const monthText = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  let allowNext;
  if (maxMonth && maxYear) {
    allowNext = year < maxYear || (year === maxYear && month < maxMonth);
  } else if (maxYear) {
    allowNext = year < maxYear;
  } else {
    allowNext = true; // No max date, allow next
  }

  let allowPrev;
  if (minMonth && minYear) {
    allowPrev = year > minYear || (year === minYear && month > minMonth);
  } else if (minYear) {
    allowPrev = year > minYear;
  } else {
    allowPrev = true; // No min date, allow previous
  }

  let onClickPrev;
  if (allowPrev) {
    onClickPrev = () => {
      if (month === 1) {
        setCalendarView({ month: 12, year: year - 1 });
      } else {
        setCalendarView({ month: month - 1, year });
      }
    };
  }

  let onClickNext;
  if (allowNext) {
    onClickNext = () => {
      if (month === 12) {
        setCalendarView({ month: 1, year: year + 1 });
      } else {
        setCalendarView({ month: month + 1, year });
      }
    };
  }

  return <CalendarMonthHeader
    text={monthText}
    onClickPrev={onClickPrev}
    onClickNext={onClickNext}
  />;
});

MonthHeader.displayName = 'MonthHeader';

/**
 * Calendar; weeks
 */

interface CalendarWeeksProps {
  maxDateInt?: number;
  selectedInt?: number;
  startDateInt?: number;
  endDateInt?: number;
  month: number;
  year: number;
  hideNextMonthDays?: boolean;
  onClickItem?: OnChangeCalendarDayFn;
  dayHoverLabel?: DayHoverLabel;
}

const CalendarWeeks = memo((p: CalendarWeeksProps) => {
  const { dayHoverLabel, maxDateInt, selectedInt, startDateInt, endDateInt, month, year, hideNextMonthDays, onClickItem } = p;

  // Create an array for the calendar days
  const weeksArr = useMemo(() => {
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

    if (!hideNextMonthDays) {
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

    const daysByWeek = daysList.reduce((acc, dayObj, index) => {
      const weekIndex = Math.floor(index / 7);
      if (!acc[weekIndex]) {
        acc[weekIndex] = [];
      }
      acc[weekIndex].push(dayObj);
      return acc;
    }, [] as CalendarDayObj[][]);

    // return daysList;
    return daysByWeek;
  }, [month, year]);

  return (
    <div className='a_c ft_xs py_xs'>
      {weeksArr.map((week, index) =>
        <CalendarWeekDays
          key={`week_${index}`}
          week={week}
          dayHoverLabel={dayHoverLabel}
          startDateInt={startDateInt}
          endDateInt={endDateInt}
          selectedInt={selectedInt}
          maxDateInt={maxDateInt}
          onClickItem={onClickItem}
        />
      )}
    </div>
  );
});

CalendarWeeks.displayName = 'CalendarWeeks';

/**
 * Calendar; main
 */

export type OnChangeCalendarDayFn = (value: CalendarSelectedObj | null, startInt?: number, endInt?: number) => void;

type AnyDateValue = Date | CalendarSelectedObj | string | number;

interface CalendarProps {
  name: string; // Form name; ie. for start/end date
  startDate?: AnyDateValue | null;
  endDate?: AnyDateValue | null;
  value?: AnyDateValue | null;
  initialCalendarViewDate?: AnyDateValue | null; // Initial date to set calendar view
  className?: string;
  maxDate?: AnyDateValue | null;
  minDate?: AnyDateValue | null;
  hideNextMonthDays?: boolean;
  onChange?: OnChangeCalendarDayFn;
  dayHoverLabel?: DayHoverLabel;
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

export const Calendar = memo((p: CalendarProps) => {
  const { name, className, dayHoverLabel, hideNextMonthDays, initialCalendarViewDate, maxDate, minDate, onChange } = p;

  const value = useMemo(() => {
    return getCalendarSelector(p.value);
  }, [p.value]);

  const startDate = useMemo(() => {
    return getCalendarSelector(p.startDate);
  }, [p.startDate]);

  const endDate = useMemo(() => {
    return getCalendarSelector(p.endDate);
  }, [p.endDate]);

  const [calendarView, setCalendarView] = useState<CalendarViewObj>(() => {
    let obj;
    if (initialCalendarViewDate) {
      obj = getCalendarSelector(initialCalendarViewDate);
    } else {
      obj = value || startDate || endDate || getCalendarSelector(new Date());
    }
    return { month: obj!.month, year: obj!.year };
  });

  const maxDateObj = useMemo(() => {
    if (!maxDate) {
      return;
    }
    return getCalendarSelector(maxDate);
  }, [maxDate]);

  const minDateObj = useMemo(() => {
    if (!minDate) {
      return;
    }
    return getCalendarSelector(minDate);
  }, [minDate]);

  return <section className={cn('calendar_cnt', className)}>
    <MonthHeader
      minMonth={minDateObj?.month}
      minYear={minDateObj?.year}
      maxMonth={maxDateObj?.month}
      maxYear={maxDateObj?.year}
      month={calendarView.month}
      year={calendarView.year}
      setCalendarView={setCalendarView}
    />
    <WeekdayLabels />
    <CalendarWeeks
      {...calendarView}
      dayHoverLabel={dayHoverLabel}
      maxDateInt={maxDateObj?.int}
      hideNextMonthDays={hideNextMonthDays}
      selectedInt={value?.int}
      startDateInt={startDate?.int}
      endDateInt={endDate?.int}
      onClickItem={onChange}
    />
  </section>;
});

Calendar.displayName = 'Calendar';

/**
 * Calendar date range selector
 */

interface CalendarDateRangeProps extends Omit<CalendarProps, 'onChange'> {
  onChange?: (value: CalendarSelectedObj | null, isStart: boolean) => void;
}

export const CalendarDateRange = memo((p: CalendarDateRangeProps) => {
  const { value, onChange, ...rest } = p;

  const dayHoverLabel = useCallback((dayInt: number, startInt?: number, endInt?: number) => {
    if (!startInt && !endInt) {
      return undefined; // No range selected
    }

    if (startInt && dayInt <= startInt) {
      return i18n.t('form.start');
    }

    if (endInt && dayInt >= endInt) {
      return i18n.t('form.end');
    }

    return i18n.t(startInt ? 'form.end' : 'form.start');
  }, []);

  const onChangeDay = (value: CalendarSelectedObj | null, startInt?: number, endInt?: number) => {
    const dayInt = value?.int;

    if (dayInt === startInt) {
      onChange?.(null, true);
      return;
    } else if (dayInt === endInt) {
      onChange?.(null, false);
      return;
    }

    let isStart = false;
    if (!startInt && !endInt) {
      isStart = true;
    } else if (startInt && dayInt! <= startInt) {
      isStart = true;
    } else if (endInt && dayInt! >= endInt) {
      isStart = false;
    } else {
      isStart = !startInt;
    }

    onChange?.(value, isStart);
  };

  return <Calendar
    {...rest}
    dayHoverLabel={dayHoverLabel}
    onChange={onChangeDay}
  />;
});

CalendarDateRange.displayName = 'CalendarDateRange';
