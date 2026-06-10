import i18n from '@jsb188/app/i18n/index.ts';
import { cn, getTimeBasedUnique } from '@jsb188/app/utils/string.ts';
import { useTooltip } from '@jsb188/react/states';
import type { TooltipButtonProps, TooltipHookProps, TooltipProps } from '@jsb188/react/types/PopOver.d';
import { copyTextToClipboard } from '@jsb188/react-web/utils/dom';
import { memo, useEffect, useRef, useState } from 'react';
import type { MouseEvent, PointerEvent, ReactNode, SyntheticEvent } from 'react';
import { guessTooltipSize, TooltipText } from '../../ui/PopOverUI';
import { getClientRectValues, getTooltipPosition } from './positioning';

interface TooltipWrapperProps extends TooltipHookProps {
  children: ReactNode;
}

interface TooltipMeasurement {
  height: number;
  id?: string;
  width: number;
}

/**
 * Return a numeric tooltip offset or the fallback when the prop is not finite.
 */
function getTooltipOffset(value: number | undefined, fallback: number): number {
  return Number.isFinite(value) ? Number(value) : fallback;
}

/**
 * Return plain text used for the first tooltip size estimate before DOM measurement.
 */
function getTooltipSizeText(tooltip: TooltipProps): string {
  if (tooltip.message) {
    return tooltip.message;
  }

  if (tooltip.title) {
    return tooltip.title;
  }

  if (tooltip.__html) {
    return tooltip.__html.replace(/<[^>]*>/g, ' ');
  }

  return '';
}

/**
 * Return rounded tooltip dimensions from a measured element.
 */
function getTooltipMeasurement(id: string | undefined, el: HTMLElement): TooltipMeasurement {
  const rect = el.getBoundingClientRect();

  return {
    id,
    width: Math.round(rect.width),
    height: Math.round(rect.height),
  };
}

/**
 * Return true when two tooltip measurements are identical.
 */
function isSameTooltipMeasurement(prev: TooltipMeasurement, next: TooltipMeasurement): boolean {
  return prev.id === next.id && prev.width === next.width && prev.height === next.height;
}

/**
 * Render an element that can show a tooltip on hover or click.
 */
export const TooltipButton = memo((p: TooltipButtonProps) => {
  const { leftIconName, rightIconName, disabled, children, title, message, __html, messageAfterClick, position, absolute, offsetX, offsetY, onClick, onMouseEnter, as, tooltipClassName, fontClassName, closeWhilePointerDown, showDelayMs, ...rest } = p;
  const Element = as || 'button';
  const tooltipDisabled = disabled || (!message && !__html);
  const { tooltip, openTooltip, closeTooltip, updateTooltip } = useTooltip();

  const tooltipButtonRef = useRef<{
    el: HTMLElement | null;
    isHover: boolean;
    isPointerDown: boolean;
    showDelayTimeout: ReturnType<typeof setTimeout> | null;
    unique: string;
  }>({
    el: null,
    isHover: false,
    isPointerDown: false,
    showDelayTimeout: null,
    unique: getTimeBasedUnique(),
  });
  const hasTooltip = !!tooltip && tooltip.id === tooltipButtonRef.current.unique;

  /**
   * Store the rendered tooltip button element used for tooltip positioning.
   */
  const handleTooltipButtonRef = (el: HTMLElement | null) => {
    tooltipButtonRef.current.el = el;
  };

  /**
   * Clear any pending delayed tooltip open for this button.
   */
  const clearShowTooltipTimeout = () => {
    if (tooltipButtonRef.current.showDelayTimeout) {
      clearTimeout(tooltipButtonRef.current.showDelayTimeout);
      tooltipButtonRef.current.showDelayTimeout = null;
    }
  };

  /**
   * Open the tooltip from the current button rectangle.
   */
  const onOpenTooltip = (isTrusted: boolean) => {
    const state = tooltipButtonRef.current;

    if (isTrusted && !tooltipDisabled && !state.isPointerDown && state.unique !== tooltip?.id && state.el) {
      openTooltip({
        id: state.unique,
        title,
        message,
        __html,
        leftIconName,
        rightIconName,
        tooltipClassName,
        fontClassName,
        absolute,
        position,
        offsetX,
        offsetY,
        rect: getClientRectValues(state.el.getBoundingClientRect()),
      });
    }
  };

  /**
   * Open the tooltip immediately or after the configured hover delay.
   */
  const onOpenTooltipWithDelay = (e: SyntheticEvent) => {
    const isTrusted = e.isTrusted;

    clearShowTooltipTimeout();

    if (!showDelayMs || showDelayMs <= 0) {
      onOpenTooltip(isTrusted);
      return;
    }

    tooltipButtonRef.current.showDelayTimeout = setTimeout(() => {
      tooltipButtonRef.current.showDelayTimeout = null;

      if (tooltipButtonRef.current.isHover) {
        onOpenTooltip(isTrusted);
      }
    }, showDelayMs);
  };

  /**
   * Close this button's tooltip and cancel any pending delayed open.
   */
  const onCloseTooltip = (e: SyntheticEvent) => {
    if (e.isTrusted && !tooltipDisabled) {
      clearShowTooltipTimeout();
      closeTooltip(tooltipButtonRef.current.unique);
    }
  };

  const props = {
    disabled: Element === 'button' ? tooltipDisabled : undefined,
    'aria-disabled': Element !== 'button' ? tooltipDisabled : undefined,
    onClick: (e: MouseEvent) => {
      if (closeWhilePointerDown) {
        if (onClick) {
          onClick(e);
        }

        return;
      }

      if (hasTooltip) {
        if (messageAfterClick) {
          tooltipButtonRef.current.unique = getTimeBasedUnique();
          updateTooltip({
            id: tooltipButtonRef.current.unique,
            message: messageAfterClick,
          });
        } else {
          onCloseTooltip(e);
        }
      } else {
        onOpenTooltip(e.isTrusted);
      }

      if (onClick) {
        onClick(e);
      }
    },
    onMouseEnter: (e: MouseEvent) => {
      tooltipButtonRef.current.isHover = true;
      onOpenTooltipWithDelay(e);

      if (onMouseEnter) {
        onMouseEnter(e);
      }
    },
    onMouseLeave: (e: MouseEvent) => {
      tooltipButtonRef.current.isHover = false;
      if (e.isTrusted && !tooltipDisabled) {
        clearShowTooltipTimeout();
        closeTooltip(tooltipButtonRef.current.unique);
      }
    },
    onPointerDown: (e: PointerEvent) => {
      if (closeWhilePointerDown && e.isTrusted && !tooltipDisabled) {
        tooltipButtonRef.current.isPointerDown = true;
        clearShowTooltipTimeout();
        closeTooltip(tooltipButtonRef.current.unique);
      }
    },
    onPointerUp: (e: PointerEvent) => {
      if (closeWhilePointerDown && e.isTrusted && !tooltipDisabled) {
        tooltipButtonRef.current.isPointerDown = false;
        if (tooltipButtonRef.current.isHover) {
          onOpenTooltipWithDelay(e);
        }
      }
    },
    onPointerCancel: () => {
      tooltipButtonRef.current.isPointerDown = false;
    },
  };

  useEffect(() => {
    return () => {
      clearShowTooltipTimeout();
      closeTooltip(tooltipButtonRef.current.unique);
    };
  }, []);

  useEffect(() => {
    if (disabled && hasTooltip) {
      clearShowTooltipTimeout();
      closeTooltip(tooltipButtonRef.current.unique);
    }
  }, [disabled]);

  return (
    <Element {...props} {...rest} ref={handleTooltipButtonRef}>
      {children}
    </Element>
  );
});

TooltipButton.displayName = 'TooltipButton';

/**
 * Render a tooltip button that copies text and shows a copied status.
 */
export const TooltipClickToCopy = memo((p: Omit<TooltipButtonProps, 'message' | 'onClick'> & {
  textToCopy: string;
}) => {
  const { textToCopy, className, ...rest } = p;

  /**
   * Copy the configured text without bubbling to parent click handlers.
   */
  const onClickToCopy = (e: MouseEvent) => {
    e.stopPropagation();
    copyTextToClipboard(textToCopy);
  };

  return <TooltipButton
    className={cn('pointer', className)}
    {...rest}
    message={i18n.t('form.copy_to_clipboard')}
    messageAfterClick={i18n.t('form.copied_')}
    onClick={onClickToCopy}
  />;
});

TooltipClickToCopy.displayName = 'TooltipClickToCopy';

/**
 * Render the positioned tooltip shell around the tooltip content.
 */
function TooltipWrapper(p: TooltipWrapperProps) {
  const { children, tooltip, closeTooltip, updateTooltip } = p;
  const tt = tooltip || {};
  const { id, className } = tt;
  const offsetX = getTooltipOffset(tt.offsetX, 7);
  const offsetY = getTooltipOffset(tt.offsetY, -7);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [measurement, setMeasurement] = useState<TooltipMeasurement>({
    width: 0,
    height: 0,
  });
  const measuredWidth = measurement.id === id ? measurement.width : 0;
  const measuredHeight = measurement.id === id ? measurement.height : 0;
  const notReady = !measuredWidth || !measuredHeight;
  const size = guessTooltipSize(getTooltipSizeText(tt));
  const tooltipWidth = measuredWidth || size.assumedWidth;
  const style = getTooltipPosition({
    absolute: tt.absolute,
    leftEdgePosition: 8,
    leftEdgeThreshold: 8,
    offsetX,
    offsetY,
    position: tt.position,
    rect: tt.rect,
    rightEdgePosition: 8,
    rightEdgeThreshold: 8,
    tooltipHeight: measuredHeight,
    tooltipWidth,
    windowHeight: globalThis.window.innerHeight,
    windowWidth: globalThis.window.innerWidth,
  });

  /**
   * Close the tooltip when any scrollable ancestor scrolls.
   */
  useEffect(() => {
    if (id) {
      const handleScroll = () => {
        closeTooltip(id);
      };

      globalThis.document.addEventListener('scroll', handleScroll, true);
      return () => {
        globalThis.document.removeEventListener('scroll', handleScroll, true);
      };
    }
  }, [id]);

  /**
   * Observe tooltip size changes so positioning can react to real content dimensions.
   */
  useEffect(() => {
    const el = tooltipRef.current;

    if (!id || !el) {
      return;
    }

    const updateMeasurement = () => {
      const next = getTooltipMeasurement(id, el);
      setMeasurement((prev) => isSameTooltipMeasurement(prev, next) ? prev : next);
    };

    updateMeasurement();

    if (!globalThis.ResizeObserver) {
      return;
    }

    const resizeObserver = new ResizeObserver(updateMeasurement);
    resizeObserver.observe(el);

    return () => resizeObserver.disconnect();
  }, [id]);

  /**
   * Set tooltip hover state while the pointer is over the tooltip shell.
   */
  const onMouseEnter = () => {
    if (!id) {
      return;
    }

    updateTooltip({
      id,
      hover: true,
    });
  };

  /**
   * Clear tooltip hover state when the pointer leaves the tooltip shell.
   */
  const onMouseLeave = () => {
    if (!id) {
      return;
    }

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
    >
      {children}
    </div>
  );
}

/**
 * Render the globally active tooltip unless another overlay is open.
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
