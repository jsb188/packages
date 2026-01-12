import { COLORS } from '@jsb188/app/constants/app';
import { cn } from '@jsb188/app/utils/string';
import { memo } from 'react';
import { TooltipButton } from '../modules/PopOver';
import { Icon } from '../svgs/Icon';

/**
 * Types
 */

export type InputPresetName = 'none' | 'fill' | 'fill_large' | 'inside_outline' | 'subtle' | 'lighter';
export type InputFocusStyle = 'outline' | 'shadow';

/**
 * Container with label and any form element inside
 */

interface FormElementProps {
  htmlFor?: string;
  label: string;
  children: React.ReactNode;
  className?: string;
  labelClassName?: string;
  forceClickId?: string;
}

export const FormElement = memo((p: FormElementProps) => {
  const { htmlFor, label, children, className, labelClassName, forceClickId } = p;

  return <label
    htmlFor={htmlFor}
    className={cn('h_spread mb_xs', className)}
    onClick={!forceClickId ? undefined : () => {
      const input = document.getElementById(forceClickId) as HTMLInputElement | null;
      if (input) {
        input.click();
      }
    }}
  >
    {/* <span className={cn('ft_bold cl_lt', labelClassName)}> */}
    <span className={cn(labelClassName, 'ellip')}>
      {label}
    </span>
    {children}
  </label>
});

FormElement.displayName = 'FormElement';

/**
 * Helper; get htlmFor={..}
 */

export function getHtmlFor(id?: string, name?: string) {
  return name ? `${name}-${id || 'form'}` : id;
}

/**
 * Form; label
 */

export type LabelType = Partial<{
  htmlFor?: string;
  paddingClassName?: string;
  labelClassName?: string;
  iconName?: string;
  info?: string;
  children: string;
}>;

export function Label(p: LabelType) {
  const { htmlFor, paddingClassName, labelClassName, iconName, info, children } = p;
  return (
    <label
      className={cn('ft_sm ic_sm h_item', paddingClassName ?? 'pt_sm pb_3', labelClassName)}
      htmlFor={htmlFor}
    >
      {children}
      {!iconName && !info ? null : (
        <TooltipButton message={info} className='pl_5 shift_up label_r' position='right' offsetY={-9}>
          <Icon name={iconName || 'info-circle'} />
        </TooltipButton>
      )}
    </label>
  );
}

/**
 * List of colors
 */

export function ColorItems(p: {
  selectedValue: string;
  onClickItem: (value: string) => void
}) {
  const { selectedValue, onClickItem } = p;

  return (
    <div className='h_left f_wrap gap_5'>
      {COLORS.map(color => (
        <div key={color} className={`ic_xs v_center av av_xxxs r bg_${color}`} onClick={() => onClickItem(color)}>
          {color === selectedValue && <Icon name='check-filled' />}
        </div>
      ))}
    </div>
  );
}

/**
 * Form section title
 */

export function FormSectionTitle(p: {
  title?: string;
  description?: string;
}) {
  const { title, description } = p;
  return <div className='mt_md cl_lt'>
    {title &&
    <p className='ft_xl ls_4'>
      {title}
    </p>}
    {description &&
    <p className='-mt_5 pb_10 lh_3'>
      {description}
    </p>}
  </div>;
}

/**
 * Form break
 */

export const FormBreak = memo((p: {
  children?: string;
  className?: string;
  heightClassName?: string;
  colorClassName?: string;
}) => {
  const { children, className, heightClassName, colorClassName } = p;
  return (
    <div
      className={cn(
        'pattern_texture rel h_center',
        colorClassName ?? 'strong_bf',
        heightClassName ?? 'h_10',
        className,
      )}
    >
      {children ? <span className='text ft_sm bg rel z2 px_xs lh_1 cl_bd'>{children}</span> : null}
    </div>
  );
});

FormBreak.displayName = 'FormBreak';

/**
 * Form toolbar
 */

// export const FormToolbar = memo((p: {

// }) => {
//   return <nav className='pattern_texture rel texture_bf p_sm'>
//     <Button
//       className='rel bg'
//       preset='outline_subtle'
//       text='Submit'
//     />
//   </nav>;
// });

// FormToolbar.displayName = 'FormToolbar';
