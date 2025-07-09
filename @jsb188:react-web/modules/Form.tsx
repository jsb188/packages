import i18n from '@jsb188/app/i18n';

import { getPlatform } from '@jsb188/app/platform';
import type { FormItemIfaceObj } from '@jsb188/app/types/form.d';
import { cn } from '@jsb188/app/utils/string';
import { Icon } from '@jsb188/react-web/icons';
import { TooltipButton } from '@jsb188/react-web/modules/PopOver';
import { Button, InlineBlockLabel } from '@jsb188/react-web/ui/Button';
import { memo, forwardRef, useEffect, useRef, useState } from 'react';

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
  setFormValues?: (values: any) => void;
  allowClearIfLocked?: boolean;
  locked?: boolean;
  disabled?: boolean;
  error?: boolean;
  fullWidth?: boolean;
  className?: string;
  inputClassName?: string;
  borderRadiusClassName?: string;
  preset?: 'none' | 'fill' | 'fill_large' | 'inside_outline' | 'subtle' | string;
  maxLength?: number;
  onFocus?: React.FocusEventHandler<HTMLInputElement>;
  onBlur?: React.FocusEventHandler<HTMLInputElement>;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>, name: string) => void;
  onInput?: (e: React.FormEvent, name: string) => void;
  onKeyDown?: (e: React.KeyboardEvent, name: string) => void;
  onSubmit?: (e: React.MouseEvent, name: string) => void;
  value?: string;
  label?: string;
  placeholder?: string;
  RightIconComponent?: React.ReactNode;
  rightIconName?: string;
  rightIconClassName?: string;
  onClickRight?: (e: React.MouseEvent) => void;
}

type LabelType = Partial<{
  htmlFor?: string;
  labelClassName?: string;
  iconName?: string;
  info?: string;
  children: string;
}>;

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
  type: 'text';
  autoFocus?: boolean;
  autoComplete?: 'on' | 'off' | string;
  spellCheck?: boolean;
  name: string;
  formValues?: any;
  setFormValues?: (values: any) => void;
  allowClearIfLocked?: boolean;
  locked?: boolean;
  disabled?: boolean;
  error?: boolean;
  fullWidth?: boolean;
  className?: string;
  preset?: 'in_modal' | 'in_modal_large' | string;
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
 * Helper; get htlmFor={..}
 */

function getHtmlFor(id?: string, name?: string) {
  return name ? `${name}-${id || 'form'}` : id;
}

/**
 * Form; label
 */

function Label(p: LabelType) {
  const { htmlFor, labelClassName, iconName, info, children } = p;
  return (
    <label
      className={cn('ft_sm ic_sm pt_sm pb_3 h_spread', labelClassName)}
      htmlFor={htmlFor}
    >
      {children}
      {!iconName && !info ? null : (
        <TooltipButton message={info} className='pl_df label_r' position='right'>
          <Icon name={iconName || 'info-circle'} />
        </TooltipButton>
      )}
    </label>
  );
}

/**
 * Form; break
 */

export function FormBreak(p: FormBreakType) {
  const { children, className } = p;
  return (
    <div className={cn('form_break h_center', className)}>
      {children ? <span className='text ft_sm'>{children}</span> : <span className='line' />}
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

export function Input(p: Partial<InputType> & LabelType) {
  const {
    id,
    className,
    alertCount,
    preset,
    autoFocus,
    name,
    type,
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
    setFormValues,
    fullWidth,
    locked,
    disabled,
    error,
    RightIconComponent,
    labelClassName,
    inputClassName,
    rightIconClassName,
    borderRadiusClassName,
    maxLength,
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
    onClickRight = () => setFormValues({ ...formValues, [name!]: '' });
    rightIconName = 'circle-x';
    labelIconName = 'lock';
  } else if (p.rightIconName) {
    rightIconName = p.rightIconName;
    onClickRight = p.onClickRight;
  }

  const hasRight = !!(rightIconName || RightIconComponent);
  const isLarge = preset === 'fill_large';

  return (
    <div
      className={cn(
        'form_el',
        preset,
        fullWidth ? 'fs' : '',
        hasRight ? 'has_r' : '',
        className,
        error ? 'error' : '',
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
        <input
          className={cn(
            'w_f',
            borderRadiusClassName || 'r_sm',
            inputClassName,
            disabled ? 'disabled' : ''
          )}
          id={htmlFor}
          name={name}
          type={type || 'text'}
          placeholder={placeholder}
          value={value || ''}
          disabled={disabled || locked}
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

        {!rightIconName ? RightIconComponent : (
          <button className={cn('btn form_el_r v_center', isLarge ? 'ic_df' : '', rightIconClassName)} onClick={onClickRight}>
            <Icon
              name={rightIconName}
            />
          </button>
        )}

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

const FVInput = composeFormInput(Input);

/**
 * Password input
 */

function FVPasswordInput(p: InputType & LabelType) {
  const [inputType, setInputType] = useState('password');

  return (
    <FVInput
      {...p}
      type={inputType}
    >
      <p>
        <button
          className='btn ft_xs cl_md mt_3 h_item non_link'
          onClick={(e: React.MouseEvent) => {
            // Must preventDefault() to prevent HTML <form> submission
            e.preventDefault();
            setInputType(inputType === 'password' ? 'text' : 'password');
          }}
        >
          <span className='shift_up mr_3'>
            <Icon name={inputType === 'password' ? 'square' : 'square-check-filled'} />
          </span>
          {i18n.t('user.show_password')}
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
    preset,
    autoFocus,
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
  } = p;

  const virtualizerRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(150);
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
          style={{ height }}
          className={cn('r_sm of', disabled ? 'disabled' : '')}
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
 */

export function FormItem(p: FormItemIfaceObj) {
  const { __type, item, disabled, ...other } = p;

  switch (__type) {
    case 'group': {
      const { label, items } = item;

      return (
        <div className={`form_el group size-${items.length}`}>
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
    case 'password':
      return <FVPasswordInput disabled={disabled} {...item} {...other} />;
    case 'textarea':
      return <FVTextarea disabled={disabled} {...item} {...other} />;
    case 'select':
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
          setFormValues({ ...formValues, [name_]: value });
        },
      };
    } else if (platform === 'MOBILE') {
      platformAgnosticProps = {
        onChangeText: function (value: string, name_: string) {
          if (onChangeText) {
            onChangeText(value, name_);
          }
          setFormValues({ ...formValues, [name_]: value });
        },
      };
    } else {
      platformAgnosticProps = {
        onKeyDown,
        onChange: (e: React.ChangeEvent<HTMLInputElement>, name_: string) => {
          if (onChange) {
            onChange(e, name_);
          }
          setFormValues({ ...formValues, [name_]: e.target?.value });
        },
      };
    }

    return (
      <Component
        {...p}
        {...platformAgnosticProps}
        value={formValues[name]}
        error={formValues.__errorFields?.includes(name)}
      />
    );
  };
}

/**
 * Content editable elements must never re-render because content is controlled by the browser.
 * To make it easier, use this Component to prevent re-renders.
 */

interface ContentEditableProps {
  domId?: string;
  role?: string;
  tabIndex?: number;
  className?: string;
  disabled?: boolean;
  htmlText: string;
  onKeyDown: (e: React.KeyboardEvent<HTMLDivElement>) => void;
  onKeyUp: (e: React.KeyboardEvent<HTMLDivElement>) => void;
  onInput: (e: React.FormEvent<HTMLDivElement>) => void;
  onPaste: (e: React.ClipboardEvent<HTMLDivElement>) => void;
  onFocus?: (e: React.FocusEvent<HTMLDivElement>) => void;
  onBlur?: (e: React.FocusEvent<HTMLDivElement>) => void;
}

export const ContentEditable = memo(forwardRef((
  p: ContentEditableProps,
  ref: React.ForwardedRef<HTMLDivElement>
) => {

  const { domId, role, tabIndex, className, disabled, htmlText, onKeyDown, onKeyUp, onInput, onPaste, onFocus, onBlur } = p;

  return <div
    ref={ref}
    id={domId}
    className={className}
    role={role ?? 'textbox'}
    tabIndex={tabIndex ?? 0}
    contentEditable={disabled ? 'false' : 'true'}
    data-placeholder={i18n.t('ai_chat.placeholder', { name : '@AI' })}
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
