import { cn } from '@jsb188/app/utils/string';
import { memo } from 'react';

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
    <span
      className={labelClassName}
    >
      {label}
    </span>
    {children}
  </label>
});

FormElement.displayName = 'FormElement';
