import { DOM_IDS } from '@jsb188/app/constants/app';
import i18n from '@jsb188/app/i18n';
import { cn, getTimeBasedUnique } from '@jsb188/app/utils/string';
import { Icon } from '@jsb188/react-web/svgs/Icon';
import { copyTextToClipboard } from '@jsb188/react-web/utils/dom';
import { usePopOver, useSetPopOverIsHover, useTooltip } from '@jsb188/react/states';
import type { ClientRectValues, ClosePopOverFn, POPosition, PopOverIface, PopOverProps, TooltipHookProps, UpdatePopOverFn } from '@jsb188/react/types/PopOver.d';
import React, { memo, useEffect, useReducer, useRef, useState } from 'react';
import { guessTooltipSize, TooltipText } from '../ui/PopOverUI';
import { PopOverCheckList, PopOverLabelsAndValues, PopOverList } from './PopOver-List';
import PopOverImage from './PopOver-ViewImage';

/**
 * Types; Pop over
 */

interface PopOverButtonProps {
  domId?: string;
  id?: string;
  as?: React.ElementType;
  iface: PopOverIface;
  position?: POPosition;
  disabled?: boolean;
  className?: string;
  zClassName?: string;
  linkClassName?: string;
  activeClassName?: string;
  notActiveClassName?: string;
  animationClassName?: string;
  popOverClassName?: string;
  doNotFixToBottom?: boolean;
  doNotTrackHover?: boolean;
  doNotRemoveOnPageEvents?: boolean;
  scrollAreaDOMId?: string | null;
  offsetX?: number;
  offsetY?: number;
  leftEdgeThreshold?: number;
  rightEdgeThreshold?: number;
  leftEdgePosition?: number;
  rightEdgePosition?: number;
  onClick?: (e: React.MouseEvent) => void;
  children: any;
}

/**
 * Pop over button
 */

export function PopOverButton(p: PopOverButtonProps) {
  const { domId, id, disabled, iface, children, className, zClassName, activeClassName, notActiveClassName, animationClassName, popOverClassName, position, offsetX, offsetY, leftEdgeThreshold, rightEdgeThreshold, leftEdgePosition, rightEdgePosition, doNotFixToBottom, doNotTrackHover, doNotRemoveOnPageEvents, scrollAreaDOMId } = p;
  const { name, variables } = iface;
  const { popOver, openPopOver, closePopOver } = usePopOver();
  const DomEl = p.as || 'div';
  const linkClassName = p.linkClassName ?? 'link';

  const unique = useRef(id || getTimeBasedUnique());
  const el = useRef<HTMLElement>(null);
  const active = popOver?.id === unique.current;

  const onClick = (e: React.MouseEvent) => {

    // Allow non-trusted clicks to work,
    // This is necessary to allow clicks to be controlled by JS from outside of this Component
    // if (e.isTrusted) {

    e.preventDefault(); // This is used to stop href and default button events
    e.stopPropagation();

    if (active) {
      closePopOver();
    } else if (el.current) {
      // Can't use this because e.target sometimes returns inner element, which causes incorrect positioning
      // const rect = e.target.getBoundingClientRect();
      const rect = el.current.getBoundingClientRect();

      openPopOver({
        name,
        id: unique.current,
        doNotTrackHover,
        doNotRemoveOnPageEvents,
        scrollAreaDOMId: scrollAreaDOMId || DOM_IDS.mainBodyScrollArea,
        className: popOverClassName,
        zClassName,
        animationClassName,
        variables,
        position,
        offsetX,
        offsetY,
        doNotFixToBottom,
        leftEdgeThreshold,
        rightEdgeThreshold,
        leftEdgePosition,
        rightEdgePosition,
        rect: {
          width: rect.width,
          height: rect.height,
          left: rect.left,
          right: rect.right,
          top: rect.top,
          bottom: rect.bottom,
          x: rect.x,
          y: rect.y,
        },
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
 * Re-usable "more" button for pop over
 */

function PopOverMoreButton(p: {
  editOptions: any[];
  disabled?: boolean;
  zClassName?: string;
}) {
  const { editOptions, disabled, zClassName } = p;
  return <PopOverButton
    // doNotTrackHover
    disabled={disabled}
    className='av av_xxs r v_center'
    zClassName={zClassName}
    linkClassName='' // This disables double :active state
    notActiveClassName='bg_active_hv bd_1 bd_invis bd_lt_hv'
    activeClassName='bg_active bd_1 bd_lt'
    animationClassName='anim_dropdown_top_right on_mount'
    // doNotRemoveOnPageEvents
    iface={{
      name: 'PO_LIST',
      variables: {
        options: editOptions as any[],
      }
    }}
    position='bottom_right'
    offsetX={0}
    offsetY={5}
  >
    <Icon name='dots' />
  </PopOverButton>
};

/**
 * Always render pop over using this wrapper
 */

export function PopOverWrapper(p: PopOverProps & {
  children: React.ReactNode;
  zClassName?: string;
  pathname: string;
  updatePopOver: UpdatePopOverFn;
  closePopOver: ClosePopOverFn;
}) {
  const {
    id,
    // name,
    pathname,
    children,
    position,
    // popOverWidth,
    popOverHeight,
    className,
    zClassName,
    animationClassName,
    doNotTrackHover,
    doNotRemoveOnPageEvents,
    doNotFixToBottom,
    scrollAreaDOMId,
    closing,
    updatePopOver,
    closePopOver
  } = p;

  // Use this instead of the context value,
  // When the same pop over is clicked from a different place,
  // it will cause brief blink.
  // By using this state, the content height will be carried over,
  // Thus removing the blink.

  const setPopOverIsHover = useSetPopOverIsHover();
  const [contentDimensions, setContentDimensions] = useState([0, popOverHeight || 0]);
  const popOverRef = useRef<HTMLDivElement>(null);

  const offsetX = p.offsetX ?? 7;
  const offsetY = p.offsetY ?? -7;
  const leftEdgeThreshold = p.leftEdgeThreshold ?? 10;
  const rightEdgeThreshold = p.rightEdgeThreshold ?? 10;
  const leftEdgePosition = p.leftEdgePosition ?? 10;
  const rightEdgePosition = p.rightEdgePosition ?? 10;

  const notReady = (contentDimensions[1] || -1) < 0;
  const windowWidth = globalThis.window.innerWidth;
  const windowHeight = globalThis.window.innerHeight;

  // let left: number | string = rect.x + rect.width + (offsetX ?? 0);
  let left: number | string;
  let right: number | string;
  let top: number | string;
  let bottom: number | string;

  let rect = p.rect as ClientRectValues;
  if (!rect) {
    rect = { x: 0, y: 0, width: 0, height: 0, left: 0, right: 0, top: 0, bottom: 0 };
  }

  switch (position) {
    case 'top':
      left = rect.x - (rect.width / 2) + offsetX;
      right = 'auto';
      top = 'auto';
      bottom = globalThis.window.innerHeight - rect.y + (offsetY || 0);
      break;
    case 'bottom':
      left = rect.x - rect.width / 2 + offsetX;
      right = 'auto';
      top = rect.y + (offsetY || 0) + rect.height;
      bottom = 'auto';
      break;
    case 'bottom_left':
      left = rect.x + offsetX;
      right = 'auto';
      top = rect.y + (offsetY || 0) + rect.height;
      bottom = 'auto';
      break;
    case 'bottom_right':
      left = rect.x - contentDimensions[0] + rect.width +  offsetX;
      right = 'auto';
      top = rect.y + (offsetY || 0) + rect.height;
      bottom = 'auto';
      break;
    case 'left':
      left = 'auto';
      // right = rect.x + rect.width + offsetX;
      right = globalThis?.window.innerWidth - rect.left + offsetX;
      top = rect.y + (offsetY || 0);
      bottom = 'auto';
      break;
    case 'right':
    default:
      left = rect.x + rect.width + offsetX;
      right = 'auto';
      top = rect.y + (offsetY || 0);
      bottom = 'auto';
  }

  // const leftOffset = (left as number + 50) - windowWidth;
  const isLeftEdge = (left as number - 50) < (leftEdgeThreshold || 0);
  const rightOffset = (left as number) + (contentDimensions[0] as number / 2);
  const isRightEdge = (rightOffset + (rightEdgeThreshold || 0)) > windowWidth;

  if (isRightEdge) {
    left = 'auto';
    right = rightEdgePosition || 0;
  } else if (isLeftEdge) {
    left = leftEdgePosition || 0;
    right = 'auto';
  }

  // console.log(rect);
  // console.log(windowWidth);
  // console.log(leftOffset);
  // console.log(left + leftOffset);

  let remainingHeight: number | undefined;
  if (!notReady && contentDimensions[1]) {

    if (doNotFixToBottom) {
      const nextRemainingHeight = windowHeight - (typeof top === 'number' ? top : 0) - 10;
      if (contentDimensions[1] > 200 && contentDimensions[1] > nextRemainingHeight) {
        remainingHeight = Math.max(200, nextRemainingHeight);
      }


    } else if (bottom === 'auto') {
      const domBottomPos = contentDimensions[1] + rect.top;
      // console.log('domBottomPos', domBottomPos, contentHeight, '::', (globalThis?.window.innerHeight - domBottomPos));
      if ((windowHeight - domBottomPos) < 10) {
        bottom = 10;
        top = 'auto';
      }
    }

    if (position === 'bottom' && !isNaN(Number(left))) {
      left = Number(left) - (contentDimensions[0] / 2);
    }
  }

  const style = {
    left,
    right,
    top,
    bottom,
  };

  // Remove on route changes

  const popOverIsVisible = contentDimensions[0] > 0;
  useEffect(() => {
    if (!doNotRemoveOnPageEvents && popOverIsVisible) {
      closePopOver();
    }
  }, [pathname]);

  // Remove on scroll

  useEffect(() => {
    if (!doNotRemoveOnPageEvents && popOverIsVisible) {
      let domEl;
      if (scrollAreaDOMId) {
        domEl = globalThis.document.getElementById(scrollAreaDOMId);
      } else {
        domEl = globalThis;
      }

      if (domEl) {
        const handleScroll = () => {
          closePopOver();
        };

        domEl.addEventListener('scroll', handleScroll, { passive: true });
        return () => {
          domEl.removeEventListener('scroll', handleScroll);
        };
      } else {
        console.dev('PopOverWrapper: scrollAreaDOMId not found, make sure it exists:', 'warning', scrollAreaDOMId);
      }
    }
  }, [popOverIsVisible]);

  // Wait for animation before closing

  useEffect(() => {
    if (closing) {
      const timer = setTimeout(() => {
        closePopOver();
      }, /\breverse\b/.test(animationClassName || '') ? 175 : 50);

      return () => {
        clearTimeout(timer);
      };
    }
  }, [closing, animationClassName]);

  // Observe popover size changes for proper positioning

  useEffect(() => {
    if (remainingHeight) {
      // If height is forced, we have to stop the observer, to prevent infinite loop
      // Update pop over with new remaining height, and let the children Component handle the rest
      updatePopOver({
        ...p.variables,
        name: p.name,
        remainingHeight
      });
    } else if (popOverRef.current) {
      const resizeObserver = new ResizeObserver((observed) => {
        const contentRect = observed[0]?.contentRect;
        setContentDimensions([contentRect?.width || 0, contentRect?.height || 0]);
      });

      resizeObserver.observe(popOverRef.current);
      return () => resizeObserver.disconnect();
    }
  }, [id, remainingHeight]);

  // Hoever state event handlers, in case you need it

  const onMouseEnter = () => {
    setPopOverIsHover(true);
  };

  let onMouseLeave;
  if (!doNotTrackHover) {
    onMouseLeave = () => {
      setPopOverIsHover(false);
    };
  }

  return (
    <div
      ref={popOverRef}
      key={id}
      className={cn(
        'popover',
        zClassName || 'z6',
        className,
        notReady ? 'invis' : animationClassName ? `${animationClassName} visible` : ''
      )}
      style={style}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {children}
    </div>
  );
}

// # # # # # # # # # # # # # # # # # //
// # # # # # # # # # # # # # # # # # //
// # # # # # # # # # # # # # # # # # //
// # # # # # # # # # # # # # # # # # //
// # # # # # # #       # # # # # # # //
// # # # # # # #       # # # # # # # //
// # # # # # # #       # # # # # # # //
// # #                           # # //
// #    Below is Tooltip Module    # //
// # #                           # # //
// # # #                       # # # //
// # # # #                   # # # # //
// # # # # #               # # # # # //
// # # # # # #           # # # # # # //
// # # # # # # #       # # # # # # # //
// # # # # # # # #   # # # # # # # # //
// # # # # # # # # # # # # # # # # # //

/**
 * Types; Tooltip
 */

interface TooltipWrapperProps extends TooltipHookProps {
  children: React.ReactNode;
}

type TooltipButtonProps = {
  as?: React.ElementType;
  position?: POPosition;
  title?: string;
  message?: string;
  messageAfterClick?: string;
  leftIconName?: string;
  rightIconName?: string;
  tooltipClassName?: string;
  disabled?: boolean;
  className?: string;
  style?: React.CSSProperties;
  children: any;
  offsetX?: number;
  offsetY?: number;
  onClick?: (e: React.MouseEvent) => void;
  onMouseEnter?: (e: React.MouseEvent) => void;
};

/**
 * Tooltip component
 */

export const TooltipButton = memo((p: TooltipButtonProps) => {
  const { leftIconName, rightIconName, disabled, children, title, message, messageAfterClick, position, offsetX, offsetY, onClick, as, tooltipClassName, ...rest } = p;
  const Element = as || 'button';
  const tooltipDisabled = disabled || !message;
  const { tooltip, openTooltip, closeTooltip, updateTooltip } = useTooltip();

  const unique = useRef<string>(getTimeBasedUnique());
  const el = useRef<HTMLDivElement>(null);
  const hasTooltip = !!tooltip && tooltip.id === unique.current;

  const onOpenTooltip = (e: React.MouseEvent) => {
    if (e.isTrusted && !tooltipDisabled && unique.current !== tooltip?.id) {
      // Can't use this because e.target sometimes returns inner element, which causes incorrect positioning
      // const rect = e.target.getBoundingClientRect();
      const rect = el.current!.getBoundingClientRect();

      openTooltip({
        id: unique.current,
        title,
        message,
        leftIconName,
        rightIconName,
        tooltipClassName,
        position,
        offsetX,
        offsetY,
        rect: {
          width: rect.width,
          height: rect.height,
          left: rect.left,
          right: rect.right,
          top: rect.top,
          bottom: rect.bottom,
          x: rect.x,
          y: rect.y,
        },
      });
    }
  };

  const onCloseTooltip = (e: React.MouseEvent) => {
    if (e.isTrusted && !tooltipDisabled) {
      closeTooltip(unique.current);
    }
  };

  const props = {
    onClick: (e: React.MouseEvent) => {
      if (hasTooltip) {
        if (messageAfterClick) {
          unique.current = getTimeBasedUnique();
          updateTooltip({
            id: unique.current,
            message: messageAfterClick,
          });
        } else {
          onCloseTooltip(e);
        }
      } else {
        onOpenTooltip(e);
      }

      if (onClick) {
        onClick(e);
      }
    },
    onMouseEnter: (e: React.MouseEvent) => {
      onOpenTooltip(e);
    },
    onMouseLeave: (e: React.MouseEvent) => {
      if (e.isTrusted && !tooltipDisabled) {
        closeTooltip(unique.current);
      }
    }
  };

  useEffect(() => {
    if (hasTooltip) {
      return () => {
        closeTooltip(unique.current);
      };
    }
  }, [hasTooltip]);

  useEffect(() => {
    if (disabled && hasTooltip) {
      closeTooltip(unique.current);
    }
  }, [disabled]);

  return (
    <Element {...props} {...rest} ref={el}>
      {children}
    </Element>
  );
});

TooltipButton.displayName = 'TooltipButton';

/**
 * Tooltip, click-to-copy button
 */

export const TooltipClickToCopy = memo((p: Omit<TooltipButtonProps, 'message' | 'onClick'> & {
  textToCopy: string;
}) => {

  const { textToCopy, ...rest } = p;
  const onClickToCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    copyTextToClipboard(textToCopy);
  };

  return <TooltipButton
    {...rest}
    message={i18n.t('form.copy_to_clipboard')}
    messageAfterClick={i18n.t('form.copied_')}
    onClick={onClickToCopy}
  />;
});

TooltipClickToCopy.displayName = 'TooltipClickToCopy';

/**
 * Render tooltip
 */

function TooltipWrapper(p: TooltipWrapperProps) {
  const { children, tooltip, updateTooltip } = p;
  const tt = tooltip || {};

  const {
    id,
    message,
    position,
    // popOverWidth,
    popOverHeight,
    className
  } = tt;

  const offsetX = tt.offsetX !== undefined && !isNaN(Number(tt.offsetX)) ? tt.offsetX : 7;
  const offsetY = tt.offsetY !== undefined && !isNaN(Number(tt.offsetY)) ? tt.offsetY : -7;
  const leftEdgeThreshold = 10;
  const rightEdgeThreshold = 10;
  const leftEdgePosition = 10;
  const rightEdgePosition = 10;

  const tooltipRef = useRef<HTMLDivElement>(null);
  const [, forceUpdate] = useReducer(x => x + 1, 0);
  const notReady = (popOverHeight || -1) < 0 || tooltipRef.current?.offsetWidth === undefined;
  const windowWidth = globalThis.window.innerWidth;
  const size = guessTooltipSize(message || '');
  const tooltipWidth = tooltipRef.current?.offsetWidth || size?.assumedWidth || 100;

  // let left: number | string = rect.x + rect.width + offsetX;
  let left: number | string;
  let right: number | string;
  let top: number | string;
  let bottom: number | string;

  let rect = tt.rect as ClientRectValues;
  if (!rect) {
    rect = { x: 0, y: 0, width: 0, height: 0, left: 0, right: 0, top: 0, bottom: 0 };
  }

  switch (position) {
    case 'top':
      left = rect.x + (rect.width / 2) - (tooltipWidth / 2);
      right = 'auto';
      top = 'auto';
      bottom = globalThis.window.innerHeight - rect.y - offsetY;
      break;
    case 'bottom':
      left = rect.x + (rect.width / 2) + (offsetX || 0) - (tooltipWidth / 2);
      right = 'auto';
      top = rect.y + (offsetY || 0) + rect.height;
      bottom = 'auto';
      break;
    case 'left':
      left = 'auto';
      // right = rect.x + rect.width + (offsetX || 0);
      right = globalThis?.window.innerWidth - rect.left + (offsetX || 0);
      // left = rect.left + (size?.assumedWidth || 100);
      top = rect.y + (offsetY || 0);
      bottom = 'auto';
      break;
    case 'right':
    default:
      left = rect.x + rect.width + (offsetX || 0);
      right = 'auto';
      top = rect.y + (offsetY || 0);
      bottom = 'auto';
  }

  // const leftOffset = (left + (tooltipWidth / 2)) - windowWidth;
  const leftNum = typeof left === 'string' ? 0 : left;
  const leftOffset = (leftNum + tooltipWidth) - windowWidth;
  const isRightEdge = leftOffset > -(rightEdgeThreshold || 0);
  const isLeftEdge = position !== 'right' && (leftNum - (tooltipWidth / 2)) < (leftEdgeThreshold || 0);

  // console.log('leftOffset', leftOffset, size?.assumedWidth, tooltipRef.current?.offsetWidth);
  // console.log('left', left, '->', rect.x, rect.width);
  // console.log('l/r edge', isLeftEdge, isRightEdge);
  // console.log('isRightEdge', isRightEdge, leftOffset, rightEdgeThreshold);

  if (isRightEdge) {
    left = 'auto';
    right = rightEdgePosition || 0;
  } else if (isLeftEdge) {
    left = leftEdgePosition || 0;
    right = 'auto';
  }

  if (bottom === 'auto' && tooltipRef.current?.offsetHeight) {
    const domBottomPos = tooltipRef.current?.offsetHeight + rect.top;
    if ((globalThis?.window.innerHeight - domBottomPos) < 10) {
      bottom = 10;
      top = 'auto';
    }
  }

  const style = {
    left,
    right,
    top,
    bottom,
  };

  useEffect(() => {
    if (id) {
      const value = Math.round(tooltipRef.current?.offsetHeight || 0);
      if (popOverHeight !== value) {
        updateTooltip({
          id,
          popOverHeight: value,
        });
      } else {
        forceUpdate();
      }
    }
  }, [id]);

  const onMouseEnter = () => {
    updateTooltip({
      id,
      hover: true,
    });
  };

  const onMouseLeave = () => {
    updateTooltip({
      id,
      hover: false,
    });
  };

  return (
    <div
      ref={tooltipRef}
      className={cn('popover z9', className, notReady ? 'invis' : '', size?.name)}
      style={style}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      // className={`emoji-p xtiny tt-text ft-tiny size-${size}${isRightEdge || isLeftEdge ? '' : ' centered'}${notReady ? ' invis' : ''}${className ? ' ' + className : ''}`}
    >
      {children}
    </div>
  );
}

/**
 * Tooltip module
 */

export function TooltipModule(p: {
  hasModalScreen: boolean;
  hasPopOver: boolean;
}) {
  const tooltipHookProps = useTooltip();
  const { tooltip, closeTooltip } = tooltipHookProps;
  const { hasModalScreen, hasPopOver } = p;
  const hasOverlay = hasModalScreen || hasPopOver;

  useEffect(() => {
    if (hasOverlay && tooltip?.id) {
      closeTooltip(tooltip.id);
    }
  }, [hasOverlay]);

  if (!tooltip?.id) {
    return null;
  }

  return (
    <TooltipWrapper {...tooltipHookProps} >
      <TooltipText {...tooltip} />
    </TooltipWrapper>
  );
}

export { PopOverCheckList, PopOverImage, PopOverLabelsAndValues, PopOverList, PopOverMoreButton };

