import { cn } from '@jsb188/app/utils/string';
import type { ClosePopOverFn, POListItemObj, PONavAvatarItemObj, PONListSubtitleObj, POTextObj, TooltipProps } from '@jsb188/react/types/PopOver.d';
import { forwardRef, memo, useRef } from 'react';
import { Icon } from '../svgs/Icon';
import type { ReactDivElement } from '../types/dom.d';
import { useOnClickOutside } from '../utils/dom';
import { AvatarImg } from './Avatar';
import { SmartLink } from './Button';
import { ActivityDots, BigLoading } from './Loading';

/**
 * Types
 */

export interface PONavItemBase {
  onClickItem: (name: string | null, value: string | boolean | null) => void;
  saving: boolean;
  selected?: boolean;
  disabled?: boolean;
}

/**
 * Calculate tooltip width
 * NOTE: Keep this value in sync with CSS
 */

interface PopOverSize {
  name: 'default' | 'small';
  assumedWidth: number;
}

export function guessTooltipSize(message: string): PopOverSize {
  const assumedLetterWidth = 14;
  const len = message.length;
  const assumedWidth = (len + 2) * assumedLetterWidth; // +2 for padding and extra buffer

  return {
    name: assumedWidth > 150 ? 'default' : 'small',
    assumedWidth: assumedWidth > 150 ? 250 : 150,
  };
}

/**
 * Tooltip
 */

export const TooltipText = memo((p: TooltipProps) => {
  const { title, message, tooltipClassName } = p;
  return (
    <div
      className={cn(
        'tooltip ft_xs lh_3 bg_contrast r_sm',
        tooltipClassName && /\bmax_w_/.test(tooltipClassName) && 'w_override',
        tooltipClassName
      )}
    >
      {!title ? null : (
        <p className='shift_up'>
          <strong>
            {title}
          </strong>
        </p>
      )}
      <p className='shift_up'>
        {message}
      </p>
    </div>
  );
});

TooltipText.displayName = 'TooltipText';

/**
 * Popover container
 */

interface PopOverContainerProps {
  themeName?: string;
  lightMode?: 'LIGHT' | 'DARK';
  notReady?: boolean;
  visible: 0 | .5 | 1 | 2;
  children: any;
  backgroundClassName?: string;
  closePopOver: ClosePopOverFn;
}

export function PopOverContainer(p: PopOverContainerProps) {
  const { notReady, children, visible, closePopOver, backgroundClassName, themeName, lightMode } = p;
  const el = useRef<HTMLDivElement>(null);

  useOnClickOutside(el, true, false, 'ignore_outside_click', () => closePopOver());

  return (
    <div
      ref={el}
      data-theme={themeName ? `${themeName}_${lightMode || 'light'}`.toLowerCase() : undefined}
      className={cn(
        'po_container r_df anim anim_drop_down main_content ft_sm',
        visible >= 2 ? 'visible' : '',
        notReady || !backgroundClassName ? 'bg' : 'bg_primary',
      )}
    >
      <div className={cn('inside r_df', notReady ? 'v_center' : '')}>
        {notReady ? <BigLoading color='alt' /> : children}
      </div>
    </div>
  );
}

/**
 * Pop over list subtitle
 */

interface POListSubtitleProps {
  item: PONListSubtitleObj;
}

export const POListSubtitle = memo((p: POListSubtitleProps) => {
  const { item: { text, textClassName, colorIndicator } } = p;

  return (
    <div className='po_subtitle bd_b_1 bd_lt ft_xs h_item bg z2 shadow_bg rel'>
      {/* This <div> makes sticky position work with proper padding */}
      <div className='po_subtitle_cover bg' />
      {colorIndicator && <span className={`indicator f_shrink mr_5 shift_up bg_${colorIndicator}`} />}
      <strong className={cn('ft_medium', textClassName)}>{text}</strong>
    </div>
  );
});

POListSubtitle.displayName = 'POListSubtitle';

/**
 * Pop over list break
 */

export const POListBreak = memo(() => {
  return <div className='po_list_break bd_lt' />;
});

POListBreak.displayName = 'POListBreak';

/**
 * Pop over text item
 */

interface POTextProps {
  item: POTextObj;
}

export const POText = memo((p: POTextProps) => {
  const { item } = p;
  const { text, className, designClassName } = item;

  return <p className={cn('po_opt text_item ft_sm', className, designClassName || 'cl_md')}>
    {text}
  </p>
});

/**
 * Pop over option item
 */

interface POListItemProps extends PONavItemBase {
  name: string | null;
  item: POListItemObj;
}

export const POListItem = memo((p: POListItemProps) => {
  const { name, item, saving } = p;
  const { colorIndicator, preset, className, textClassName, disabled, allowDisabledOnClick, to, text, value, iconName, rightIconName, rightIconClassName, photoUri, avatarDisplayName, selected } = item;
  const hasAvatar = !!photoUri || !!avatarDisplayName;
  // const hasLink = !!(to || !undefinedValue);
  const hasRightComponent = saving || !!rightIconName || !!selected;
  const undefinedValue = value === undefined;

  // Allow override from item props
  const onClickItem = item.onClick || p.onClickItem;

  let presetClassName = '';
  switch (preset) {
    case 'small':
      presetClassName = 'ft_tn ft_bold preset_small cl_md';
      break;
    case 'default':
    default:
      presetClassName = 'cl_df';
  }

  return (
    <SmartLink
      Component={item.LinkComponent}
      to={to}
      disabled={disabled}
      className={cn('po_opt bg_link h_item gap_xs lh_1', preset || 'default', presetClassName, disabled ? 'op_50' : '', className)}
      onClick={undefinedValue || (disabled && !allowDisabledOnClick) ? undefined : () => onClickItem(name, value)}
    >
      {!hasAvatar ? null : (
        <AvatarImg
          size='xtiny'
          urlPath={photoUri}
          displayName={avatarDisplayName}
        />
      )}

      {!iconName || hasAvatar ? null : (
        <span>
          <Icon name={iconName} />
        </span>
      )}

      {colorIndicator && <span className={`indicator f_shrink bg_${colorIndicator}`} />}

      <span className={cn('f', textClassName || 'shift_down', !hasRightComponent && 'pr_xs')}>
        {text}
      </span>

      {hasRightComponent && (
        <span className='saving_area ml_sm'>
          {saving ? <ActivityDots size='tn' /> : null}
          {saving || (!selected && !rightIconName) ? null : (
            <span className={cn('bl shift_right', rightIconClassName ?? 'cl_lt')}>
              <Icon name={rightIconName || 'check'} />
            </span>
          )}
        </span>
      )}
    </SmartLink>
  );
});

POListItem.displayName = 'POListItem';

/**
 * Pop over avatar item
 */

interface PONavAvatarItemProps extends PONavItemBase {
  name: string | null;
  item: PONavAvatarItemObj;
}

export const PONavAvatarItem = memo((p: PONavAvatarItemProps) => {
  const { name, item, onClickItem, saving, selected } = p;
  const { className, disabled, square, allowDisabledOnClick, to, text, label, value, rightIconName, photoUri, avatarDisplayName } = item;
  const undefinedValue = value === undefined;
  const hasRightComponent = saving || selected || !!rightIconName;

  return (
    <SmartLink
      Component={item.LinkComponent}
      to={to}
      disabled={disabled}
      className={cn('po_opt bg_link h_item gap_sm av_item', disabled ? 'op_50' : '', className)}
      onClick={undefinedValue || (disabled && !allowDisabledOnClick) ? undefined : () => onClickItem(name, value)}
    >
      <AvatarImg
        square={square}
        size='small'
        urlPath={photoUri}
        displayName={avatarDisplayName}
      />

      <span className={cn('f lh_2 pt_2', !hasRightComponent && 'pr_xs')}>
        <strong className='bl ellip'>{text}</strong>
        <span className='ft_xs cl_md bl ellip'>
          {label}
        </span>
      </span>

      {hasRightComponent && (
        <span className='saving_area ml_xs'>
          {saving ? <ActivityDots size='tn' /> : null}
          {!saving && selected ? <Icon name='check' /> : null}
          {!saving && !selected && rightIconName ? <Icon name={rightIconName} /> : null}
        </span>
      )}
    </SmartLink>
  );
});

PONavAvatarItem.displayName = 'PONavAvatarItem';

/**
 * Container for design consistency
 */

export const PopOverListContainer = forwardRef((
  p: ReactDivElement,
  ref: React.ForwardedRef<HTMLDivElement>
) => {
  const { className, ...other } = p;
  return <div
    ref={ref}
    className={cn(
      'po_list shadow bg of',
      className || 'ft_sm',
    )}
    {...other}
  />
});

/**
 * Button for pop over list footer
 */

interface PopOverListFooterButtonProps {
  text: string;
  onClick: () => void;
}

export const PopOverListFooterButton = memo((p: PopOverListFooterButtonProps) => {
  const { text, onClick } = p;
  return <div className='sticky_bottom p_xs bg bd_t_1 bd_lt'>
    <button
      type='button'
      className='btn bl w_f a_c r_sm p_5 bg_contrast'
      onClick={onClick}
    >
      {text}
    </button>
  </div>;

});

PopOverListFooterButton.displayName = 'PopOverListFooterButton';
