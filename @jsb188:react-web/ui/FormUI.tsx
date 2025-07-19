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
}

export const FormElement = memo((p: FormElementProps) => {
  const { htmlFor, label, children, className, labelClassName } = p;

  return <label
    htmlFor={htmlFor}
    className={cn('h_spread mb_xs', className)}
  >
    {/* <span className={cn('ft_bold cl_lt', labelClassName)}> */}
    <span className={labelClassName}>
      {label}
    </span>
    {children}
  </label>
});

FormElement.displayName = 'FormElement';
