import { cn } from '@jsb188/app/utils/string.ts';
import { useSetPopOverIsHover } from '@jsb188/react/states';
import type { ClosePopOverFn, PopOverProps, UpdatePopOverFn } from '@jsb188/react/types/PopOver.d';
import type { ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';
import { getPopOverPosition } from './positioning';

export type PopOverWrapperProps = PopOverProps & {
  children: ReactNode;
  closePopOver: ClosePopOverFn;
  pathname: string;
  updatePopOver: UpdatePopOverFn;
  zClassName?: string;
};

/**
 * Render the positioned shell around the active popover content.
 */
export function PopOverWrapper(p: PopOverWrapperProps) {
  const {
    animationClassName,
    children,
    className,
    closePopOver,
    closing,
    dismissOnExternalScroll,
    doNotFixToBottom,
    doNotRemoveOnPageEvents,
    doNotTrackHover,
    id,
    pathname,
    popOverHeight,
    scrollAreaDOMId,
    updatePopOver,
    zClassName,
  } = p;

  // Keep local dimensions so reopening the same popover from a different place does not visibly blink.
  const setPopOverIsHover = useSetPopOverIsHover();
  const [contentDimensions, setContentDimensions] = useState<[number, number]>([0, popOverHeight || 0]);
  const popOverRef = useRef<HTMLDivElement>(null);
  const externalScrollDismissedRef = useRef(false);
  const { remainingHeight, style } = getPopOverPosition({
    contentDimensions,
    doNotFixToBottom,
    leftEdgePosition: p.leftEdgePosition ?? 10,
    leftEdgeThreshold: p.leftEdgeThreshold ?? 10,
    offsetX: p.offsetX ?? 7,
    offsetY: p.offsetY ?? -7,
    position: p.position,
    rect: p.rect,
    rightEdgePosition: p.rightEdgePosition ?? 10,
    rightEdgeThreshold: p.rightEdgeThreshold ?? 10,
    windowHeight: globalThis.window.innerHeight,
    windowWidth: globalThis.window.innerWidth,
  });
  const notReady = (contentDimensions[1] || -1) < 0;
  const popOverIsVisible = contentDimensions[0] > 0;

  /**
   * Close the popover when the route changes.
   */
  useEffect(() => {
    if (!doNotRemoveOnPageEvents && popOverIsVisible) {
      closePopOver();
    }
  }, [pathname]);

  /**
   * Close the popover when its scroll container scrolls.
   */
  useEffect(() => {
    if (!doNotRemoveOnPageEvents && popOverIsVisible) {
      let domEl: HTMLElement | Window | null;
      if (scrollAreaDOMId) {
        domEl = globalThis.document.getElementById(scrollAreaDOMId);
      } else {
        domEl = globalThis.window;
      }

      if (domEl) {
        const handleScroll = () => {
          closePopOver();
        };

        domEl.addEventListener('scroll', handleScroll, { passive: true });
        return () => {
          domEl.removeEventListener('scroll', handleScroll);
        };
      }

      console.dev('PopOverWrapper: scrollAreaDOMId not found, make sure it exists:', 'warning', scrollAreaDOMId);
    }
  }, [popOverIsVisible]);

  /**
   * Close the popover when a scroll event starts outside this popover.
   */
  useEffect(() => {
    if (!dismissOnExternalScroll || !popOverIsVisible || closing) {
      return;
    }

    externalScrollDismissedRef.current = false;

    const handleExternalScroll = (event: Event) => {
      const target = event.target;

      if (externalScrollDismissedRef.current) {
        return;
      }

      if (target instanceof Node && popOverRef.current?.contains(target)) {
        return;
      }

      externalScrollDismissedRef.current = true;
      closePopOver();
    };

    globalThis.document.addEventListener('scroll', handleExternalScroll, true);
    return () => {
      globalThis.document.removeEventListener('scroll', handleExternalScroll, true);
    };
  }, [closePopOver, closing, dismissOnExternalScroll, popOverIsVisible]);

  /**
   * Wait for the reverse animation before removing the popover state.
   */
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

  /**
   * Observe popover size changes so positioning can react to real content dimensions.
   */
  useEffect(() => {
    if (remainingHeight) {
      updatePopOver({
        ...(p.variables || {}),
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

  /**
   * Mark the global hover state when the pointer enters the popover.
   */
  const onMouseEnter = () => {
    setPopOverIsHover(true);
  };

  /**
   * Clear the global hover state when the pointer leaves tracked popovers.
   */
  const onMouseLeave = !doNotTrackHover
    ? () => {
      setPopOverIsHover(false);
    }
    : undefined;

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
