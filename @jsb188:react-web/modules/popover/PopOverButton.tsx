import { DOM_IDS } from '@jsb188/app/constants/app.ts';
import { cn, getTimeBasedUnique } from '@jsb188/app/utils/string.ts';
import { usePopOver } from '@jsb188/react/states';
import type { PopOverButtonProps, PopOverMoreButtonProps } from '@jsb188/react/types/PopOver.d';
import { useRef } from 'react';
import type { MouseEvent } from 'react';
import { Icon } from '../../svgs/Icon';
import { getClientRectValues } from './positioning';

/**
 * Render a trigger element that opens and closes one popover.
 */
export function PopOverButton(p: PopOverButtonProps) {
  const {
    activeClassName,
    animationClassName,
    children,
    className,
    disabled,
    dismissOnExternalScroll,
    doNotFixToBottom,
    doNotRemoveOnPageEvents,
    doNotTrackHover,
    domId,
    id,
    iface,
    leftEdgePosition,
    leftEdgeThreshold,
    notActiveClassName,
    offsetX,
    offsetY,
    popOverClassName,
    position,
    rightEdgePosition,
    rightEdgeThreshold,
    scrollAreaDOMId,
    zClassName,
  } = p;
  const { popOver, openPopOver, closePopOver } = usePopOver();
  const DomEl = p.as || 'div';
  const linkClassName = p.linkClassName ?? 'link';

  const unique = useRef(id || getTimeBasedUnique());
  const el = useRef<HTMLElement>(null);
  const active = popOver?.id === unique.current;

  /**
   * Toggle this trigger's popover using the trigger element rectangle.
   */
  const onClick = (e: MouseEvent) => {
    // Allow non-trusted clicks to work for JS-controlled popover triggers.
    e.preventDefault();
    e.stopPropagation();

    if (active) {
      closePopOver();
    } else if (el.current) {
      openPopOver({
        ...iface,
        id: unique.current,
        dismissOnExternalScroll,
        doNotTrackHover,
        doNotRemoveOnPageEvents,
        scrollAreaDOMId: scrollAreaDOMId || DOM_IDS.mainBodyScrollArea,
        className: popOverClassName,
        zClassName,
        animationClassName,
        position,
        offsetX,
        offsetY,
        doNotFixToBottom,
        leftEdgeThreshold,
        rightEdgeThreshold,
        leftEdgePosition,
        rightEdgePosition,
        rect: getClientRectValues(el.current.getBoundingClientRect()),
      });
    }

    if (p.onClick) {
      p.onClick(e);
    }
  };

  return (
    <DomEl
      ref={el}
      id={domId}
      role='button'
      tabIndex={0}
      className={cn(
        className,
        'ignore_outside_click',
        disabled ? '' : active ? 'pointer' : linkClassName,
        active ? (activeClassName || 'active') : notActiveClassName,
      )}
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
    >
      {children}
    </DomEl>
  );
}

/**
 * Render the standard compact menu trigger for PO_LIST actions.
 */
export function PopOverMoreButton(p: PopOverMoreButtonProps) {
  const { editOptions, disabled, zClassName, allowActiveTransform } = p;

  return <PopOverButton
    disabled={disabled}
    className='av av_xxs r v_center bg rel bd_1 bd_lt'
    zClassName={zClassName}
    linkClassName={cn('link', !allowActiveTransform && 'non_link')}
    notActiveClassName='bg_active_hv bd_1 bd_invis bd_lt_hv'
    activeClassName='bg_active bd_1 bd_lt'
    animationClassName='anim_dropdown_top_right on_mount'
    iface={{
      name: 'PO_LIST',
      variables: {
        options: editOptions,
      }
    }}
    position='bottom_right'
    offsetX={0}
    offsetY={5}
  >
    <Icon name='dots' />
  </PopOverButton>;
}
