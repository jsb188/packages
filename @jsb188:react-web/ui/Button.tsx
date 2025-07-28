import type { ColorEnum } from '@jsb188/app/types/app.d';
import { cn } from '@jsb188/app/utils/string';
import { Link, type To } from 'react-router';
import React, { memo } from 'react';
import { Icon } from '../svgs/Icon';
import { AvatarImg } from './Avatar';
import { ActivityDots } from './Loading';

/**
 * Types
 */

export type ButtonPresetEnum = 'em' | 'subtle' | 'cl_err' | 'bg' | 'bg_main' | 'bg_primary' | 'bg_secondary' | 'bg_contrast' | 'bg_medium' | 'outline';
export type ButtonSizeEnum = 'sm' | 'md' | 'df' | 'lg';

/**
 * Full width button content
 */

interface FullWidthButtonProps {
  children: React.ReactNode;
  preset: ButtonPresetEnum;
  fullWidth?: boolean;
  className?: string;
  photoUri?: string;
  IconComponent?: React.ComponentType<any>;
  iconName?: string;
  iconClassName?: string;
  textClassName?: string;
  disabled?: boolean;
  loading?: boolean;
  onClick?: (e: React.MouseEvent) => void;
  replace?: boolean;
  to?: string;
}

function FullWidthButtonContent(p: FullWidthButtonProps) {
  const { children, iconName, photoUri, iconClassName, textClassName, loading } = p;
  const hasSides = !!iconName || !!photoUri;
  const IconComponent = p.IconComponent || Icon;

  return <>
    {!hasSides ? null : (
      <span className={cn('bl h_center', iconClassName)}>
        {!iconName || photoUri ? null : (
          <IconComponent
            name={iconName}
          />
        )}

        {!photoUri ? null : (
          <AvatarImg
            className='mr_xs'
            size='xtiny'
            displayName={typeof children === 'string' ? children : ''}
            urlPath={photoUri}
          />
        )}
      </span>
    )}

    {loading ? <ActivityDots /> : (
      <span className={cn('text', textClassName)}>
        {children}
      </span>
    )}

    {hasSides ? <span className='bl' /> : null}
  </>;
}

/**
 * Full width button with centered text, and left icon
 */

export const FullWidthButton = memo((p: FullWidthButtonProps) => {
  const {
    fullWidth,
    className,
    photoUri,
    iconName,
    disabled,
    loading,
    onClick,
    replace,
    to
  } = p;

  // NOTE: Consider "right button" later too
  const hasSides = !!iconName || !!photoUri;
  const preset = p.preset || 'subtle';

  let buttonPreset;
  if (disabled && preset.startsWith('bg_')) {
    buttonPreset = 'subtle';
  } else {
    buttonPreset = preset;
  }

  // This Component does not support <a>, due to design reasons
  // If {href} is needed, use onClick() handler with raw javascript actions

  return (
    <SmartLink
      // type='submit' // Careful when using this, it will submit the form
      className={cn(
        'btn fw',
        hasSides ? 'h_spread' : 'h_center',
        fullWidth === false ? null : 'full',
        buttonPreset,
        'r_sm',
        disabled ? 'disabled' : '',
        // preset === 'r' ? null : 'r_sm',
        className,
      )}
      onClick={onClick}
      disabled={disabled || loading}
      fallbackElement='button'
      replace={replace}
      to={to}
    >
      <FullWidthButtonContent
        {...p}
      />
    </SmartLink>
  );
});

FullWidthButton.displayName = 'FullWidthButton';

/**
 * Same as <FullWidthButton /> but it's a link
 * @deprecated Use <FullWidthButton /> instead
 */

interface FullWidthLinkProps extends FullWidthButtonProps {
  to: string;
  replace?: boolean;
  target?: string;
}

export const FullWidthLink = memo((p: FullWidthLinkProps) => {
  const {
    to,
    replace,
    target,
    fullWidth,
    className,
    photoUri,
    iconName,
    disabled,
    loading,
    onClick,
  } = p;

  // NOTE: Consider "right button" later too
  const hasSides = !!iconName || !!photoUri;
  const preset = p.preset || 'subtle';

  let buttonPreset;
  if (disabled && ['bg_main'].includes(preset)) {
    buttonPreset = 'subtle';
  } else {
    buttonPreset = preset;
  }

  let onClickLink;
  if (onClick) {
    onClickLink = onClick;
  } else if (disabled || loading) {
    onClickLink = (e: React.MouseEvent) => {
      e.preventDefault();
    };
  }

  return (
    <Link
      // type='submit' // Careful when using this, it will submit the form
      className={cn(
        'btn fw link',
        hasSides ? 'h_spread' : 'h_center',
        fullWidth === false ? null : 'full',
        buttonPreset,
        'r_sm',
        disabled ? 'disabled' : '',
        // preset === 'r' ? null : 'r_sm',
        className,
      )}
      to={to}
      replace={replace}
      target={target}
      onClick={onClickLink}
    >
      <FullWidthButtonContent
        {...p}
      />
    </Link>
  );
});

FullWidthLink.displayName = 'FullWidthLink';

/**
 * Normal button, normal size
 */

interface NormalButtonProps {
  text: string;
  preset: ButtonPresetEnum;
  size?: ButtonSizeEnum;
  leftIconClassName?: string;
  leftIconName?: string | null;
  rightIconClassName?: string;
  rightIconName?: string | null;
  className?: string;
  disabled?: boolean;
  to?: string;
  onClick?: (e: React.MouseEvent) => void;
}

export function Button(p: NormalButtonProps) {
  const { to, size, preset, text, disabled, className, onClick, leftIconName, rightIconName, leftIconClassName, rightIconClassName } = p;
  return (
    <SmartLink
      className={cn(
        'btn h_center',
        className,
        preset,
        !disabled && 'link',
        size || 'df'
      )}
      to={to}
      onClick={onClick}
      disabled={disabled}
      fallbackElement='button'
    >
      {!leftIconName ? null : (
        <span className={leftIconClassName || 'mr_3'}>
          <Icon name={leftIconName} />
        </span>
      )}

      {text}

      {!rightIconName ? null : (
        <span className={rightIconClassName || 'ml_3'}>
          <Icon name={rightIconName} />
        </span>
      )}
    </SmartLink>
  );
}

/**
 * Simpler, smaller button, meant to be inline
 */

export function InlineButton(p: NormalButtonProps) {
  const { preset, text, disabled, className, leftIconName, onClick } = p;
  return (
    <button
      className={cn('btn il h_item ic_sm', className, preset)}
      onClick={onClick}
      disabled={disabled}
    >
      {!leftIconName ? null : (
        <span className='mr_3'>
          <Icon name={leftIconName} />
        </span>
      )}

      {text}
    </button>
  );
}

/**
 * Same as <InlineButton /> but it's a link
 */

interface NormalButtonLinkProps {
  to: string;
  target: string;
  text: string;
  preset: ButtonPresetEnum;
  iconSizeClassName?: string;
  leftIconName?: string;
  rightIconName?: string;
  className?: string;
  onClick?: (e: React.MouseEvent) => void;
}

export function InlineButtonLink(p: NormalButtonLinkProps) {
  const { preset, text, iconSizeClassName, className, leftIconName, onClick, to, target } = p;
  return (
    <Link
      className={cn('btn il h_item', iconSizeClassName || 'ic_sm', className, preset)}
      to={to}
      target={target}
      onClick={onClick}
    >
      {!leftIconName ? null : (
        <span className='mr_3'>
          <Icon name={leftIconName} />
        </span>
      )}

      {text}
    </Link>
  );
}

/**
 * Simple label component that can be used in various ways
 * NOTE: This won't effect line heights when used inside a sentence
 */

export interface InlineBlockLabelProps {
  as?: React.ElementType;
  color?: 'bg' | 'alt' | 'active' | 'primary' | 'secondary';
  iconSizeClassName?: string;
  className?: string;
  textColorClassName?: string;
  iconName?: string;
  text?: string;
  fillTextColor?: boolean;
  outline?: boolean;
  colorIndicator?: ColorEnum;
}

export const InlineBlockLabel = memo((p: InlineBlockLabelProps) => {
  const { color, iconSizeClassName, iconName, text, className, fillTextColor, textColorClassName, colorIndicator, outline } = p;
  const El = p.as || 'strong';
  const isLightBackground = ['bg', 'alt', 'active'].includes(String(color));

  return <El className={cn('ib_label f_shrink', outline && 'outline', !fillTextColor && (color && `${color}_bf`), className)}>
    <span
      className={cn(
        'rel z2 h_item ft_xs',
        textColorClassName ?? (fillTextColor && color ? `cl_${color.charAt(0)}` : color ? isLightBackground ? 'cl_df' : 'cl_solid' : ''),
        iconSizeClassName
      )}
    >
      {colorIndicator && <span className={`indicator f_shrink bg_${colorIndicator}`} />}
      {iconName ? <Icon name={iconName} /> : null}
      {text}
    </span>
  </El>;
});

InlineBlockLabel.displayName = 'InlineBlockLabel';

/**
 * Link/button/span helper Component
 */

interface SmartLinkProps {
  Component?: React.ElementType;
  buttonElement?: React.ElementType;
  fallbackElement?: React.ElementType;
  to?: To | string | null;
  replace?: boolean;
  onClick?: (e: React.MouseEvent) => void;
  [key: string]: any;
}

export function SmartLink(p: SmartLinkProps) {
  const { Component, buttonElement, fallbackElement, className, replace, ...other } = p;
  const { to, onClick, disabled } = p;
  const cnStr = cn(className, to || onClick ? 'link trans_link' : '');

  if (Component) {
    return <Component {...other} className={cnStr} />;
  } else if (to) {
    return <Link
      to={to}
      replace={replace}
      {...other}
      className={cnStr}
      onClick={disabled && !onClick ? (e: React.MouseEvent) => e.preventDefault() : onClick}
    />;
  } else if (onClick) {
    // Use this to avoid situations where <button> is nested inside another <button>
    const ButtonEl = buttonElement || 'button';
    return <ButtonEl {...other} onClick={onClick} className={cnStr} />;
  }

  const SpanEl = fallbackElement || 'span';
  return <SpanEl className={cnStr} {...other} />;
}

/**
 * Pill button
 */

interface PillButtonProps extends Omit<NormalButtonProps, 'preset'> {
  preset: 'sm' | 'xs';
  designClassName?: string;
  leftIconClassName?: string;
  onClickLeftIcon?: (e: React.MouseEvent) => void;
}

export const PillButton = memo((p: PillButtonProps) => {
  const { to, preset, text, disabled, designClassName, className, onClick, leftIconClassName, onClickLeftIcon, leftIconName, rightIconName } = p;

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'r h_item py_3 rel',
        `pill_${preset}`,
        preset === 'sm' ? '' : 'ft_sm',
        designClassName || 'bd_1',
        className
      )}
    >
      {!leftIconName ? null : (
        <SmartLink
          buttonElement='span'
          className={cn('move_left mr_2', leftIconClassName)}
          to={to}
          onClick={onClickLeftIcon}
        >
          <Icon name={leftIconName} />
        </SmartLink>
      )}

      <span className={leftIconName && !rightIconName ? 'shift_left' : !leftIconName && rightIconName ? 'shift_right' : ''}>
        {text}
      </span>

      {!rightIconName ? null : (
        <span className='move_right'>
          <Icon name={rightIconName} />
        </span>
      )}
    </button>
  );
});

PillButton.displayName = 'PillButton';

/**
 * Pill
 */

interface PillProps {
  as: React.ElementType;
  loading: boolean;
  addLoadingIndicator: boolean;
  to: string;
  href: string;
  title: string;
  children: any;
  size: 'sm' | 'df' | 'md' | 'lg' | null;
  className: string;
  onClick: (e: React.MouseEvent<HTMLDivElement>) => void;
}

export function Pill(p: Partial<PillProps>) {
  const { loading, addLoadingIndicator, to, href, onClick, title, children } = p;
  const size = p.size || 'default';
  const className = p.className || 'bg_active';
  const LinkComponent = p.as || (to ? Link : 'a');
  const sizeClassName = `pill pill_${size || 'df'} `;

  let onClick_;
  if (loading) {
    onClick_ = (e: React.MouseEvent) => e.preventDefault();
  } else {
    onClick_ = onClick;
  }

  return (
    <SmartLink
      Component={LinkComponent}
      to={to}
      href={href}
      // @ts-ignore
      onClick={onClick_}
      title={title}
      className={cn(
        'r h_center',
        loading && !addLoadingIndicator ? 'is_loading' : '',
        loading && addLoadingIndicator ? 'with_loading_indicator' : '',
        sizeClassName,
        className,
      )}
    >
      {!loading || !addLoadingIndicator ? null : (
        <span className='abs_full v_center'>
          <ActivityDots size={['large', 'xlarge'].includes(size || '') ? 'large' : 'medium'} />
        </span>
      )}
      {children}
    </SmartLink>
  );
}
