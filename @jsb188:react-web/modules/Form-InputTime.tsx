import { setObject } from '@jsb188/app/utils/object.ts';
import { cn } from '@jsb188/app/utils/string.ts';
import { usePopOverState } from '@jsb188/react/states';
import { DateTime } from 'luxon';
import { useEffect, useState } from 'react';
import { Icon } from '../svgs/Icon';
import type { InputFocusStyle, InputPresetName, LabelType } from '../ui/FormUI';
import { Label, getHtmlFor } from '../ui/FormUI';
import { PopOverButton } from './PopOver';

/**
 * Helper; get date using time zone
 */

function getDateWithTimeZone(value: string | Date, timeZone?: string | null): Date {
  if (timeZone) {
    return DateTime.fromJSDate(value instanceof Date ? value : new Date(value), { zone: timeZone }).toJSDate();
  }
  return new Date(value);
}

/**
 * Check if time value is error
 */

function checkTimeError(value: string, field: TimeFormField): boolean {
  switch (field) {
    case 'hours':
      return value.length > 2 || Number(value) < 0 || Number(value) > 12;
    case 'minutes':
      return value.length > 2 || Number(value) < 0 || Number(value) > 59;
    default:
  }
  return false;
}

/**
 * Input; time (hh:mm)
 */

type TimeFormField = 'hours' | 'minutes' | 'AMPM';

interface InputTimeType {
  id?: string;
  scrollAreaDOMId?: string;
  timeZone?: string | null;
  alertCount?: number;
  autoFocus?: boolean;
  spellCheck?: boolean;
  name: string;
  formValues?: any;
  setFormValues?: (values: any) => void;
  allowClearIfLocked?: boolean;
  locked?: boolean;
  disabled?: boolean;
  focused?: boolean;
  error?: boolean;
  fullWidth?: boolean;
  className?: string;
  inputClassName?: string;
  borderRadiusClassName?: string;
  preset?: InputPresetName;
  focusStyle?: InputFocusStyle;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>, name: string, value: any) => void;
  onKeyDown?: (e: React.KeyboardEvent, name: string, field: TimeFormField) => void;
  onSubmit?: (e: React.MouseEvent, name: string) => void;
  label?: string;
  children?: React.ReactNode;
}

export function InputTimeFromDate(p: InputTimeType & Omit<LabelType, 'children'>) {

  const {
    id,
    scrollAreaDOMId,
    timeZone,
    className,
    alertCount,
    preset,
    focusStyle,
    autoFocus,
    name,
    spellCheck,
    allowClearIfLocked,
    label,
    info,
    onChange,
    onKeyDown,
    formValues,
    setFormValues,
    fullWidth,
    locked,
    disabled,
    focused,
    error,
    labelClassName,
    inputClassName,
    borderRadiusClassName,
    children
  } = p;

  const currentDate = formValues?.[name] || '';
  const htmlFor = getHtmlFor(id, name);

  const { popOver, closePopOver } = usePopOverState();
  const [timeFormValues, setTimeFormValues] = useState<Record<TimeFormField, string>>(() => {
		const d = getDateWithTimeZone(currentDate, timeZone);
    if (isNaN(d.getTime())) {
      return { hours: '', minutes: '', AMPM: '' };
    }

    let hours = d.getHours();
    const minutes = d.getMinutes();
    const AMPM = hours >= 12 ? 'PM' : 'AM';

    if (hours > 12) {
      hours -= 12;
    }

    return { hours: String(hours), minutes: String(minutes), AMPM };
  });

  const [timeErrors, setTimeErrors] = useState<Record<TimeFormField, boolean>>({
    hours: false,
    minutes: false,
    AMPM: false,
  });

  const onChangeTime = (e: React.ChangeEvent<HTMLInputElement>, field: TimeFormField) => {
    const value = e.target.value;

    setTimeFormValues({...timeFormValues, [field]: value });

		let d = getDateWithTimeZone(currentDate, timeZone);
    if (isNaN(d.getTime())) {
      d = new Date();
    }

    switch (field) {
      case 'hours':
        d.setHours(Number(value));
        break;
      case 'minutes':
        d.setMinutes(Number(value));
        break;
      case 'AMPM':
        const currentHours = d.getHours();
        if (value === 'PM' && currentHours < 12) {
          d.setHours(currentHours + 12);
        } else if (value === 'AM' && currentHours >= 12) {
          d.setHours(currentHours - 12);
        }
        break;
    }

    if (checkTimeError(value, field) || isNaN(d.getTime())) {
      setTimeErrors({...timeErrors, [field]: true });
    } else if (setFormValues) {
      setFormValues({...setObject(formValues, name, d)});
    }

    if (onChange) {
      onChange(e, name, d);
    }
  };

  const onBlur = () => {
    if (setFormValues) {
      const isHourError = checkTimeError(timeFormValues.hours, 'hours');
      const isMinuteError = checkTimeError(timeFormValues.minutes, 'minutes');

      if (isHourError || isMinuteError) {
        const d = getDateWithTimeZone(currentDate, timeZone);

        let nextFormValues = {...timeFormValues};
        if (isHourError) {
          nextFormValues.hours = d.getHours().toString();
        }
        if (isMinuteError) {
          nextFormValues.minutes = d.getMinutes().toString();
        }

        setTimeFormValues(nextFormValues);

        setTimeErrors({
          ...timeErrors,
          hours: false,
          minutes: false,
        });
      }
    }
  };

  useEffect(() => {
    if (popOver?.id === `${name}_ampm` && popOver?.action === 'ITEM') {
      onChangeTime({ target: { value: popOver.value } } as React.ChangeEvent<HTMLInputElement>, 'AMPM');
      closePopOver();
    }
  }, [popOver]);

  let labelIconName;
  if (locked && allowClearIfLocked && setFormValues) {
    labelIconName = 'lock';
  }

  return (
    <div
      className={cn(
        'form_el rel',
        preset,
        'focus_' + (focusStyle || 'shadow'),
        fullWidth ? 'fs' : '',
        className,
        error ? 'error' : '',
        focused ? 'focused' : '',
      )}
    >
      {!label ? null : (
        <Label
          htmlFor={htmlFor}
          info={info}
          iconName={labelIconName}
          labelClassName={labelClassName}
        >
          {label}
        </Label>
      )}

      <div className='rel h_item'>
        {(['hours', null, 'minutes'] as (TimeFormField | null)[]).map((field, index) => {
          if (field === null) {
            return <span
              key={index}
              className='mx_5'
            >
              :
            </span>;
          }

          const isHours = field === 'hours';
          return <input
            key={field}
            className={cn(
              'form_input',
              timeErrors[field] ? 'error' : '',
              borderRadiusClassName ?? 'r_sm',
              inputClassName,
              'w_70',
              // Use .cl_md for faded color for "disabled" status,
              // but we're combining "Edit" and "Create" forms together now,
              // So I prefer if everything is not-faded.
              // disabled ? 'disabled cl_md' : '',
              disabled ? 'disabled' : '',
            )}
            id={htmlFor}
            name={`${name}_${field}`}
            type='number'
            min={0}
            max={isHours ? 12 : 59}
            step={1}
            placeholder='--'
            value={timeFormValues[field] || ''}
            disabled={disabled || locked}
            autoFocus={autoFocus}
            autoComplete='off'
            spellCheck={spellCheck}
            maxLength={2}
            onBlur={onBlur}
            // NOTE: In Preact, onInput() is triggered per key press
            // But onChange() is not (in [SchemaForm.tsx], not for direct use).
            // This means, any events that happen inside onChange()
            // will *ONLY* update onBlur()
            onChange={(e) => onChangeTime(e, field as 'hours' | 'minutes')}
            onKeyDown={onKeyDown && ((e) => onKeyDown(e, name, field))}
          />;
        })}

        <PopOverButton
          id={`${name}_ampm`}
          scrollAreaDOMId={scrollAreaDOMId}
          className={cn(
            'form_input h_spread pl_xs fs ml_xs',
            borderRadiusClassName ?? 'r_sm',
            // Use .cl_md for faded color for "disabled" status,
            // but we're combining "Edit" and "Create" forms together now,
            // So I prefer if everything is not-faded.
            // disabled ? 'disabled cl_md' : '',
            disabled ? 'disabled' : '',
          )}
          zClassName='z9'
          position='bottom_left'
          offsetX={0}
          offsetY={7}
          disabled={disabled}
          iface={{
            name: 'PO_LIST',
            variables: {
              designClassName: 'w_60',
              options: [{
                __type: 'LIST_ITEM' as const,
                text: 'AM',
                value: 'AM',
              }, {
                __type: 'LIST_ITEM' as const,
                text: 'PM',
                value: 'PM',
              }]
            }
          }}
        >
          <span>
            {timeFormValues.AMPM || 'AM'}
          </span>
          <span className='cl_lt form_el_r pr_6'>
            <Icon name='caret-down' />
          </span>
        </PopOverButton>

        {!alertCount ? null : (
          <span className='alert_ct bg_err ft_tn v_center unsel r lh_1'>
            {alertCount < 100 ? alertCount : '99+'}
          </span>
        )}
      </div>

      {children}
    </div>
  );
}
