
import { setObject } from '@jsb188/app/utils/object';
import { cn } from '@jsb188/app/utils/string';
import { createElement, useState } from 'react';
import { Icon } from '../svgs/Icon';
import type { InputPresetName, InputFocusStyle, LabelType } from '../ui/FormUI';
import { Label, getHtmlFor } from '../ui/FormUI';

/**
 * Input; time (hh:mm)
 */

interface InputTimeType {
  id?: string;
  alertCount?: number;
  autoFocus?: boolean;
  spellCheck?: boolean;
  name: string;
  formValues?: any;
  getter?: (value?: any) => string;
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
  maxLength?: number;
  onFocus?: React.FocusEventHandler<HTMLInputElement>;
  onBlur?: React.FocusEventHandler<HTMLInputElement>;
  onKeyDown?: (e: React.KeyboardEvent, name: string) => void;
  onSubmit?: (e: React.MouseEvent, name: string) => void;
  value?: string;
  label?: string;
  RightIconComponent?: React.ReactNode;
  rightIconName?: string;
  rightIconClassName?: string;
  onClickRight?: (e: React.MouseEvent) => void;
  children?: React.ReactNode;
}

export function InputTime(p: InputTimeType & Omit<LabelType, 'children'>) {

  const {
    id,
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
    onInput,
    onKeyDown,
    onFocus,
    onBlur,
    value,
    formValues,
    setFormValues,
    fullWidth,
    locked,
    disabled,
    focused,
    error,
    RightIconComponent,
    labelClassName,
    inputClassName,
    rightIconClassName,
    borderRadiusClassName,
    maxLength,
    getter,
    children
  } = p;

  const [timeFormValues, setTimeFormValues] = useState({ hours: '12', minutes: '00', AMPM: 'AM' });
  const htmlFor = getHtmlFor(id, name);

  // If any entire fromValues is passed to Input,
  // I would not need to create a new onSubmit/onInput/onChange every time.
  // This is potentially powerful.
  // Because, then, I would never need to rewrite the same logic twice.
  // This could also be shared in mobile_iap.

  let onClickRight;
  let rightIconName;
  let labelIconName;

  if (locked && allowClearIfLocked && setFormValues) {
    onClickRight = () => setFormValues({ ...setObject(formValues, String(name), '') });
    rightIconName = 'circle-x';
    labelIconName = 'lock';
  } else if (p.rightIconName) {
    rightIconName = p.rightIconName;
    onClickRight = p.onClickRight;
  }

  const hasRight = !!(rightIconName || RightIconComponent);
  const isLarge = preset === 'fill_large';

  const onChangeTime = (e: React.ChangeEvent<HTMLInputElement>, field: 'hours' | 'minutes') => {
    const changeValue = e.target.value;
    setTimeFormValues({...timeFormValues, [field]: changeValue });
    console.log('InputTime.onChange', name, changeValue);
  };

  return (
    <div
      className={cn(
        'form_el rel',
        preset,
        'focus_' + (focusStyle || 'shadow'),
        fullWidth ? 'fs' : '',
        hasRight ? 'has_r' : '',
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
        {['hours', 'minutes'].map((field, index) => {
          const isHours = field === 'hours';
          return <input
            className={cn(
              borderRadiusClassName || 'r_sm',
              inputClassName,
              'w_40',
              disabled ? 'disabled' : '',
            )}
            id={htmlFor}
            name={`${name}_hh`}
            type='number'
            min={0}
            max={12}
            placeholder='-'
            value={(getter ? getter(value) : value) || ''}
            disabled={disabled || locked}
            autoFocus={autoFocus}
            autoComplete='off'
            spellCheck={spellCheck}
            maxLength={2}
            onFocus={onFocus}
            onBlur={onBlur}
            // NOTE: In Preact, onInput() is triggered per key press
            // But onChange() is not (in [SchemaForm.tsx], not for direct use).
            // This means, any events that happen inside onChange()
            // will *ONLY* update onBlur()
            onChange={(e) => onChangeTime(e, 'hours')}
            // onInput={onInput && ((e) => onInput(e, name))}
            // onKeyDown={onKeyDown && ((e) => onKeyDown(e, name))}
          />;
        })}

        {!rightIconName ? RightIconComponent :
        createElement(onClickRight ? 'button' : 'span', {
          className: cn(
            'form_el_r cl_md v_center',
            borderRadiusClassName || 'r_sm',
            onClickRight ? 'btn' : '',
            isLarge ? 'ic_df' : '',
            rightIconClassName
          ),
          onClick: onClickRight,
        }, (
          <Icon
            name={rightIconName}
          />
        ))}

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
