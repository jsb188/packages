import i18n from '@jsb188/app/i18n';

import { getPlatform } from '@jsb188/app/platform';
import type { FormItemIfaceObj } from '@jsb188/app/types/form.d';
import { getObject, setObject } from '@jsb188/app/utils/object';
import { cn } from '@jsb188/app/utils/string';
import { Button, InlineBlockLabel } from '@jsb188/react-web/ui/Button';
import { createElement, forwardRef, memo, useEffect, useRef, useState } from 'react';
import { Icon } from '../svgs/Icon';
import type { InputFocusStyle, InputPresetName, LabelType } from '../ui/FormUI';
import { Label, getHtmlFor } from '../ui/FormUI';
import { InputTimeFromDate } from './Form-InputTime';
import { PopOverButton } from './PopOver';

// const cssPath = '/css/form.css';

/**
 * Types
 */

interface InputType {
  id?: string;
  type?: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url' | string;
  alertCount?: number;
  autoFocus?: boolean;
  autoComplete?: 'on' | 'off' | string;
  spellCheck?: boolean;
  name: string;
  formValues?: any;
  step?: number;
  min?: number;
  max?: number;
  getter?: (value?: any) => string;
  setFormValues?: (values: any) => void;
  allowClearIfLocked?: boolean;
  locked?: boolean;
  disabled?: boolean;
  editable?: boolean;
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
  onChange?: (e: React.ChangeEvent<HTMLInputElement>, name: string) => void;
  onInput?: (e: React.FormEvent, name: string) => void;
  onKeyDown?: (e: React.KeyboardEvent, name: string) => void;
  onClick?: (e: React.MouseEvent, name: string) => void;
  onSubmit?: (e: React.MouseEvent, name: string) => void;
  value?: string;
  label?: string;
  placeholder?: string;
  RightIconComponent?: React.ReactNode;
  rightIconName?: string;
  rightIconClassName?: string;
  onClickRight?: (e: React.MouseEvent) => void;
  children?: React.ReactNode;
}

type FormBreakType = {
  children?: string;
  className?: string;
};

type OptionType = {
  disabled?: boolean;
  checked?: boolean;
  value?: string | number | null;
  text?: string;
  iconName?: string;
  className?: string;
  hideCheckIcon?: boolean;
  rightLabel?: string;
  rightLabelColor?: string;
  name: string;
  index: number;
  onChange: (e: React.MouseEvent, name: string, value: string | number | null) => void;
};

type OptionsType = {
  id?: string;
  name: string;
  value?: string | number | null;
  options: Partial<OptionType>[];
  className?: string;
  label?: string;
  labelClassName?: string;
  info?: string;
  disabled?: boolean;
  locked?: boolean;
  onChange: (e: React.MouseEvent, name: string, value: string | number | null) => void;
};

type TextareaType = {
  id?: string;
  autoFocus?: boolean;
  autoComplete?: 'on' | 'off' | string;
  spellCheck?: boolean;
  minHeight?: number;
  focusStyle?: InputFocusStyle;
  name: string;
  formValues?: any;
  setFormValues?: (values: any) => void;
  allowClearIfLocked?: boolean;
  locked?: boolean;
  disabled?: boolean;
  error?: boolean;
  fullWidth?: boolean;
  className?: string;
  borderRadiusClassName?: string;
  textareaClassName?: string;
  preset?: InputPresetName;
  onFocus?: React.FocusEventHandler<HTMLTextAreaElement>;
  onBlur?: React.FocusEventHandler<HTMLTextAreaElement>;
  onChange?: (e: React.ChangeEvent<HTMLTextAreaElement>, name: string) => void;
  onInput?: (e: React.FormEvent, name: string) => void;
  onKeyDown?: (e: React.KeyboardEvent, name: string) => void;
  onSubmit?: (e: React.MouseEvent, name: string) => void;
  value?: string;
  label?: string;
  placeholder?: string;
};

type SideInputButtonProps = {
  href?: string;
  className?: string;
  iconName?: string;
  alertCount?: number;
  text?: string;
  offsetRight?: boolean;
  disabled?: boolean;
  selected?: boolean;
  onClick?: (e: any) => void;
};

/**
 * Form; break
 */

export function FormBreak(p: FormBreakType) {
  const { children, className } = p;
  return (
    <div className={cn('pattern_texture secondary_bf rel h_10 h_center', className)}>
      {children ? <span className='text ft_sm bg rel z2 px_xs lh_1 cl_bd'>{children}</span> : null}
    </div>
  );
}

/**
 * Side button meant to be placed next to an input (e.g. search bar)
 */

export function SideInputButton(p: SideInputButtonProps) {
  const { href, className, alertCount, iconName, text, onClick, selected, disabled, offsetRight } = p;
  return (
    <a
      role={href ? undefined : 'button'}
      className={cn('v_center mt_df mb_sm r_sm form_input_btn', className, selected ? 'bg_main' : 'cl_md', offsetRight ? 'r' : '')}
      href={href}
      onClick={disabled ? undefined : onClick}
    >
      {iconName ? <Icon name={iconName} /> : null}
      {text ? <strong>{text}</strong> : null}
      {!alertCount ? null : (
        <span className='alert_ct bg_err ft_tn v_center unsel r lh_1'>
          {alertCount < 100 ? alertCount : '99+'}
        </span>
      )}
    </a>
  );
}

/**
 * Inline button meant to be placed inside <Input /> on the right;
 * e.g. "Enter with arrow" button in a large search input.
 */

export function InputRightButton(p: any) {
  return (
    <Button
      {...p}
      className='form_el_inline_btn'
    />
  );
}

/**
 * Form; input
 */

export function Input(p: Partial<InputType> & Omit<LabelType, 'children'>) {
  const {
    id,
    className,
    alertCount,
    preset,
    focusStyle,
    autoFocus,
    name,
    type,
    autoComplete,
    spellCheck,
    allowClearIfLocked,
    label,
    placeholder,
    info,
    step,
    min,
    max,
    onChange,
    onInput,
    onKeyDown,
    onFocus,
    onBlur,
    onClick,
    value,
    formValues,
    setFormValues,
    fullWidth,
    locked,
    disabled,
    editable,
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
  } else if (locked) {
    rightIconName = 'locked';
  }

  const hasRight = !!(rightIconName || RightIconComponent);
  const isLarge = preset === 'fill_large';
  const onClickItem = onClick ? (e: React.MouseEvent) => onClick(e, name!) : undefined;

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
        disabled || locked ? 'disabled' : '',
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
      <div className={cn('rel', onClick ? 'link' : '')} onClick={onClickItem}>
        <input
          className={cn(
            'w_f form_input',
            borderRadiusClassName ?? 'r_sm',
            inputClassName,
            // Use .cl_md for faded color for "disabled" status,
            // but we're combining "Edit" and "Create" forms together now,
            // So I prefer if everything is not-faded.
            // disabled ? 'disabled cl_md' : '',
            editable === false ? 'cl_md' : disabled ? 'disabled' : '',
          )}
          id={htmlFor}
          name={name}
          type={type || 'text'}
          step={step}
          min={min}
          max={max}
          placeholder={placeholder || ''}
          value={(getter ? getter(value) : value) || ''}
          disabled={disabled || locked || editable === false}
          autoFocus={autoFocus}
          autoComplete={autoComplete || 'off'}
          spellCheck={spellCheck}
          maxLength={maxLength}
          onFocus={onFocus}
          onBlur={onBlur}
          // NOTE: In Preact, onInput() is triggered per key press
          // But onChange() is not (in [SchemaForm.tsx], not for direct use).
          // This means, any events that happen inside onChange()
          // will *ONLY* update onBlur()
          onInput={onInput && ((e) => onInput(e, name!))}
          onChange={onChange && ((e) => onChange(e, name!))}
          onKeyDown={onKeyDown && ((e) => onKeyDown(e, name!))}
        />

        {!rightIconName ? RightIconComponent :
        createElement(onClickRight ? 'button' : 'span', {
          className: cn(
            'form_el_r cl_lt v_center',
            borderRadiusClassName ?? 'r_sm',
            onClickRight ? 'btn' : '',
            isLarge ? 'ic_df' : onClick ? 'pointer' : '',
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

        {onClickItem && (
          // This prevents <input> from disabling click handlers;
          // thus allowing entire input + right icon to be a clickable area as one.
          <div className='abs_full pointer' />
        )}
      </div>

      {children}
    </div>
  );
}

const FVInput = composeFormInput(Input);

/**
 * Input with button at right
 */

export function InputWithButton(p: FormInputProps & {
  buttonText?: string;
  onClickButton: (e: React.MouseEvent) => void;
}) {
  const { buttonText, onClickButton, ...rest } = p;

  return <FVInput
    {...rest}
    RightIconComponent={
      <div className='abs_r_center mr_5'>
        <button
          className='btn link bg_active lh_1 ft_xs ft_medium p_xs r_sm'
          onClick={onClickButton}
        >
          {buttonText}
        </button>
      </div>
    }
  >
  </FVInput>;
}

/**
 * Input but only allow clicks
 */

function InputClick(p: InputType & Omit<LabelType, 'children'> & { popOverProps: any }) {
  const { formValues, name, className, inputClassName, disabled, locked } = p;
  const { popOverProps, ...rest } = p;
  const isDisabled = disabled || locked;

  return <Input
    {...rest}
    // as={popOverProps ? PopOverButton : undefined}
    locked
    value={getObject(formValues, name)}
    inputClassName={isDisabled ? inputClassName : cn('pointer', inputClassName)}
    rightIconName={locked ? 'locked' : 'caret-down'}
    className={cn(className, popOverProps ? 'link' : '')}
  >
    {popOverProps ? (
      <PopOverButton
        {...popOverProps}
        domId={'input_click_' + name}
        className='abs_full'
        disabled={isDisabled}
      />
    ) : undefined}
  </Input>;
}

/**
 * Password input
 */

function FVPasswordInput(p: InputType & Omit<LabelType, 'children'>) {
  const [inputType, setInputType] = useState('password');

  return (
    // @ts-expect-error - complicated typing
    <FVInput
      {...p}
      type={inputType}
    >
      <p>
        <button
          className='btn ft_xs cl_lt mt_3 h_item non_link'
          onClick={(e: React.MouseEvent) => {
            // Must preventDefault() to prevent HTML <form> submission
            e.preventDefault();
            setInputType(inputType === 'password' ? 'text' : 'password');
          }}
        >
          <span className='shift_up mr_3'>
            <Icon name={inputType === 'password' ? 'square' : 'square-check-filled'} />
          </span>
          {i18n.t('account.show_password')}
        </button>
      </p>
    </FVInput>
  );
}

/**
 * Form; textarea
 */

export function Textarea(p: TextareaType & LabelType) {
  const {
    id,
    className,
    borderRadiusClassName,
    preset,
    autoFocus,
    focusStyle,
    name,
    autoComplete,
    spellCheck,
    allowClearIfLocked,
    label,
    placeholder,
    info,
    onChange,
    onInput,
    onKeyDown,
    onFocus,
    onBlur,
    value,
    formValues,
    fullWidth,
    locked,
    disabled,
    error,
    labelClassName,
    textareaClassName,
  } = p;

  const minHeight = p.minHeight ?? 150; // Default minimum height
  const virtualizerRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(minHeight);
  const htmlFor = getHtmlFor(id, name);

  // If any entire fromValues is passed to Input,
  // I would not need to create a new onSubmit/onInput/onChange every time.
  // This is potentially powerful.
  // Because, then, I would never need to rewrite the same logic twice.
  // This could also be shared in mobile_iap.

  let labelIconName;
  if (locked && allowClearIfLocked && formValues) {
    labelIconName = 'lock';
  }

  useEffect(() => {
    if (virtualizerRef.current) {
      const resizeObserver = new ResizeObserver(() => {
        if (virtualizerRef.current) {
          setHeight(virtualizerRef.current.clientHeight);
        }
      });
      resizeObserver.observe(virtualizerRef.current);
      return () => resizeObserver.disconnect();
    }
  }, []);

  return (
    <div
      className={cn(
        'form_el',
        fullWidth ? 'fs' : '',
        preset,
        className,
        error ? 'error' : '',
        'focus_' + (focusStyle || 'shadow'),
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

      <div className='rel'>
        <div
          ref={virtualizerRef}
          className='tx_virtualizer'
          dangerouslySetInnerHTML={{ __html: (value || '').replace(/(?:\r\n|\r|\n)/g, '<br>') }}
        />
        <textarea
          style={{ height, minHeight }}
          className={cn(
            'form_input of rel w_f',
            borderRadiusClassName ?? 'r_sm',
            disabled ? 'disabled' : '',
            textareaClassName
          )}
          id={htmlFor}
          name={name}
          placeholder={placeholder}
          value={value || ''}
          disabled={disabled || locked}
          autoFocus={autoFocus}
          autoComplete={autoComplete}
          spellCheck={spellCheck}
          onFocus={onFocus}
          onBlur={onBlur}
          // NOTE: In Preact, onInput() is triggered per key press
          // But onChange() is not (in [SchemaForm.tsx], not for direct use).
          // This means, any events that happen inside onChange()
          // will *ONLY* update onBlur()
          onInput={onInput && ((e) => onInput(e, name))}
          onChange={onChange && ((e) => onChange(e, name))}
          onKeyDown={onKeyDown && ((e) => onKeyDown(e, name))}
        />
      </div>
    </div>
  );
}

const FVTextarea = composeFormInput(Textarea, true);

/**
 * Form options; item
 */

const FormOptionItem = memo((p: OptionType) => {
  const { value, text, className, iconName, name, index, checked, disabled, hideCheckIcon, rightLabel, rightLabelColor, onChange } = p;
  const htmlFor = getHtmlFor(index?.toString(), name);

  return (
    <div
      role='button'
      tabIndex={0}
      className={cn('form_opt r_sm h_item', disabled ? '' : 'link', checked ? 'cl_df' : 'cl_md', className)}
      onClick={(e: React.MouseEvent<HTMLDivElement>) => onChange(e, name, value!)}
    >
      <label className='h_item f' htmlFor={htmlFor}>
        <input
          id={htmlFor}
          type='radio'
          value={value || '?'}
          defaultChecked={checked}
        />
        {!iconName ? null : (
          <span className='ic_cnt mr_xs h_center'>
            <Icon name={iconName} />
          </span>
        )}
        {text}
      </label>

      {!rightLabel ? null
        : <InlineBlockLabel
          as='span'
          // @ts-expect-error assume the color is one of the correct enums
          color={rightLabelColor}
          text={rightLabel}
        />}

      {checked && !hideCheckIcon ? <Icon name='check' /> : null}
    </div>
  );
});

FormOptionItem.displayName = 'FormOptionItem';

/**
 * Form options
 */

export function FormOptions(p: OptionsType) {
  const { className, name, locked, label, labelClassName, info, options, value, disabled, onChange } = p;
  // const htmlFor = getHtmlFor(id, name);

  let labelIconName;
  if (locked) {
    labelIconName = 'lock';
  }

  return (
    <fieldset className={className}>
      {!label ? null : (
        <Label
          // htmlFor={htmlFor}
          info={info}
          iconName={labelIconName}
          labelClassName={labelClassName}
        >
          {label}
        </Label>
      )}

      <div className='form_cnt outline form_el r_sm'>
        {options.map((option, i) => (
          <FormOptionItem
            key={option.value}
            {...option}
            name={name}
            index={i}
            disabled={disabled || locked}
            checked={value === option.value}
            onChange={onChange}
          />
        ))}
      </div>
    </fieldset>
  );
}

/**
 * Form; item
 * Correct type for FormItem is {FormItemIfaceObj}, however, this Component is usually
 * mapped by <SchemaForm /> which mutates incorrect types to correct values.
 * Example: {FormItemIfaceObj} allows locked: () => boolean, but <SchemaForm /> will
 * mutate it to locked: boolean.
 *
 * When this Component is used without <SchemaForm />, you can't rely on the function
 * mutators, so you have to make sure the correct non-function types are passed.
 */

export function FormItem(p: any) {
  const { __type, item, disabled, ...other } = p;

  switch (__type) {
    case 'subtitle': {
      return (
        <strong className='bl ft_md mt_df pt_xs cl_lt'>
          {item.text}
        </strong>
      );
    }
    case 'group': {
      const { label, items } = item;
      return (
        <div className={`grid gapx_xs size_${items.length}`}>
          {label
            ? (
              <Label htmlFor={getHtmlFor(items?.[0]?.id, items?.[0]?.name)} labelClassName={other.labelClassName}>
                {label}
              </Label>
            )
            : null}
          {items.map((subItem: FormItemIfaceObj, i: number) => <FormItem key={i} disabled={disabled} {...subItem} {...other} />)}
        </div>
      );
    }
    case 'input':
      return <FVInput disabled={disabled} {...item} {...other} />;
    case 'input_w_button':
      return <InputWithButton disabled={disabled} {...item} {...other} />;
    case 'input_click':
      return <InputClick disabled={disabled} {...item} {...other} />;
    case 'input_time_from_date':
      return <InputTimeFromDate disabled={disabled} {...item} {...other} />;
    case 'password':
      return <FVPasswordInput disabled={disabled} {...item} {...other} />;
    case 'textarea':
      return <FVTextarea disabled={disabled} {...item} {...other} />;
    case 'none':
      // I'm using this iface as a custom element switch
      return null;
    default:
      console.warn('Unknown schema form __type:', __type);
  }

  return null;
}

FormItem.displayName = 'FormItem';

/**
 * Platform agnostic composer for form input components
 */

interface FormInputProps extends InputType {
  name: string;
  formValues: any;
  setFormValues: (formValues: any) => void;
  // Used when the form needs to listen to changes.
  listenToInput?: boolean;
  onChangeText?: (value: string, name: string) => void;
  setter?: (value: any) => any; // Used to transform the value before setting it in formValues
}

export function composeFormInput(Component: React.FC<any>, isTextarea?: boolean) {
  return function FormInputCmp(p: FormInputProps) {
    const {
      name,
      listenToInput,
      onInput,
      onChange,
      onChangeText,
      onSubmit,
      formValues,
      setFormValues,
      setter,
    } = p;

    const platform = getPlatform();

    let onKeyDown;
    if (platform !== 'MOBILE' && (onSubmit || onKeyDown)) {
      onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, name_: string) => {
        if (p.onKeyDown) {
          p.onKeyDown(e, name_);
        }

        if (onSubmit && !isTextarea && e.key === 'Enter') {
          e.preventDefault();
          // @ts-expect-error - allow both click and keyboard events
          onSubmit(e, name_);
        }
      };
    }

    let platformAgnosticProps;
    if (listenToInput) {
      // NOTE: In Preact, onInput() is triggered per key press
      // But onChange() is not.
      // This means, any events that happen inside onChange()
      // will *ONLY* update onBlur()
      platformAgnosticProps = {
        onKeyDown,
        onInput: function (e: React.FormEvent, name_: string) {
          if (onInput) {
            onInput(e, name_);
          }
          const value = platform === 'WEB' ? (e.target as HTMLInputElement)?.value : e;
          setFormValues({ ...setObject(formValues, String(name_), setter ? setter(value) : value) });
        },
      };
    } else if (platform === 'MOBILE') {
      platformAgnosticProps = {
        onChangeText: function (value: string, name_: string) {
          if (onChangeText) {
            onChangeText(value, name_);
          }
          setFormValues({ ...setObject(formValues, String(name_), setter ? setter(value) : value) });
        },
      };
    } else {
      platformAgnosticProps = {
        onKeyDown,
        onChange: (e: React.ChangeEvent<HTMLInputElement>, name_: string) => {
          if (onChange) {
            onChange(e, name_);
          }
          setFormValues({ ...setObject(formValues, String(name_), setter ? setter(e.target?.value) : e.target?.value) });
        },
      };
    }

    return (
      <Component
        {...p}
        {...platformAgnosticProps}
        value={getObject(formValues, name)}
        error={formValues.__errorFields?.includes(name)}
      />
    );
  };
}

/**
 * Content editable elements must never re-render because content is controlled by the browser.
 * To make it easier, use this Component to prevent re-renders.
 */

export const ContentEditable = memo(forwardRef((
  p: {
    domId?: string;
    role?: string;
    tabIndex?: number;
    className?: string;
    disabled?: boolean;
    htmlText: string;
    placeholder?: string;
    onKeyDown: (e: React.KeyboardEvent<HTMLDivElement>) => void;
    onKeyUp: (e: React.KeyboardEvent<HTMLDivElement>) => void;
    onInput: (e: React.FormEvent<HTMLDivElement>) => void;
    onPaste: (e: React.ClipboardEvent<HTMLDivElement>) => void;
    onFocus?: (e: React.FocusEvent<HTMLDivElement>) => void;
    onBlur?: (e: React.FocusEvent<HTMLDivElement>) => void;
  },
  ref: React.ForwardedRef<HTMLDivElement>
) => {

  const { domId, role, tabIndex, className, disabled, placeholder, htmlText, onKeyDown, onKeyUp, onInput, onPaste, onFocus, onBlur } = p;

  return <div
    ref={ref}
    id={domId}
    className={className}
    role={role ?? 'textbox'}
    tabIndex={tabIndex ?? 0}
    contentEditable={disabled ? 'false' : 'true'}
    data-placeholder={placeholder}
    onKeyDown={onKeyDown}
    onKeyUp={onKeyUp}
    onInput={onInput}
    onPaste={onPaste}
    onFocus={onFocus}
    onBlur={onBlur}
    dangerouslySetInnerHTML={{ __html: htmlText }}
  />;

// IMPORTANT NOTE:
// <ContentEditable /> works by making it only render when it absolutely has to.
// If you re-render every time there's a text change, there will be issues.
// If you *do* see issues, use checkPropsDiff() to figure out which prop is triggering re-render.
// }), globalThis.checkPropsDiff);
}));

// Exports from other files

export { InputTime };
