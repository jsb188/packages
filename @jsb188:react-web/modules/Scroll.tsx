import i18n from '@jsb188/app/i18n/index.ts';
import { cn } from '@jsb188/app/utils/string.ts';
import { useAnimationVisibility } from '@jsb188/react/hooks';
import { memo, useEffect, useRef, useState } from 'react';

/**
 * Add class when element is at top of scroll area
 */

export interface ScrollAwareProps {
  as?: React.ElementType;
  children: React.ReactNode;
  className?: string;
  atTopClassName?: string;
  notAtTopClassName?: string;
  scrollAreaDOMId?: string;
  hideIfNotTop?: boolean;
  offset?: number; // NOTE: This will make this Component *not* work if the element is {position: sticky}
}

export const ScrollAware = memo((p: ScrollAwareProps) => {
  const { children, as, scrollAreaDOMId, className, hideIfNotTop, offset, atTopClassName: atTopClassName_, notAtTopClassName: notAtTopClassName_, ...rest } = p;
  const atTopClassName = atTopClassName_ ?? 'at_top';
  const notAtTopClassName = notAtTopClassName_ ?? 'not_at_top';
  const elementRef = useRef<HTMLDivElement>(null);
  const [atTop, setAtTop] = useState(false);
  const [ , visible] = useAnimationVisibility(atTop);
  const Element = as || 'div';

  useEffect(() => {
    // Check the scroll position of elementRef inside scrollAreaDOMId
    const scrollAreaDOM = scrollAreaDOMId && document.getElementById(scrollAreaDOMId);

    if (scrollAreaDOM && elementRef.current) {
      const handleScroll = () => {
        const elemRect = elementRef.current?.getBoundingClientRect();
        if (elemRect) {

          const scrollAreaRect = scrollAreaDOM.getBoundingClientRect();
          const isAtTop = elemRect.top <= (scrollAreaRect.top - (offset || 0));

          if (isAtTop !== atTop) {
            setAtTop(isAtTop);
          }
        }
      };

      scrollAreaDOM.addEventListener('scroll', handleScroll);

      // Initial check
      handleScroll();

      return () => {
        scrollAreaDOM.removeEventListener('scroll', handleScroll);
      };
    }
  }, [scrollAreaDOMId, atTop]);

  return <Element
    ref={elementRef}
    className={cn(className, atTop ? atTopClassName : notAtTopClassName)}
    {...rest}
  >
    {!visible && hideIfNotTop ? null : children}
  </Element>;
});

ScrollAware.displayName = 'ScrollAware';

export interface MoreBelowScrollAreaProps {
  children: React.ReactNode;
  scrollClassName?: string;
  moreBelowText?: string;
  className?: string;
}

/*
 * Scroll area with a small bottom affordance that disappears once the user scrolls.
 */

export const MoreBelowScrollArea = memo((p: MoreBelowScrollAreaProps) => {
  const { children, className, scrollClassName = 'y_scr_hidden', moreBelowText = i18n.t('form.scroll_for_more') } = p;
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const [hasMoreBelow, setHasMoreBelow] = useState(false);
  const [didScrollPastStart, setDidScrollPastStart] = useState(false);

  useEffect(() => {
    const scrollArea = scrollAreaRef.current;
    if (!scrollArea) {
      return;
    }

    /*
     * Measure whether the scroll area has content below the visible frame.
     */

    const checkForMoreBelow = () => {
      const nextHasMoreBelow = scrollArea.scrollHeight > scrollArea.clientHeight;

      setHasMoreBelow((currentHasMoreBelow) => {
        return currentHasMoreBelow === nextHasMoreBelow ? currentHasMoreBelow : nextHasMoreBelow;
      });

      if (!nextHasMoreBelow) {
        setDidScrollPastStart(false);
      }
    };

    checkForMoreBelow();

    if (!globalThis.ResizeObserver) {
      return;
    }

    const resizeObserver = new ResizeObserver(checkForMoreBelow);
    resizeObserver.observe(scrollArea);

    Array.from(scrollArea.children).forEach((childElement) => {
      resizeObserver.observe(childElement);
    });

    return () => {
      resizeObserver.disconnect();
    };
  }, [children, scrollClassName]);

  useEffect(() => {
    const scrollArea = scrollAreaRef.current;
    if (!scrollArea || !hasMoreBelow) {
      return;
    }

    /*
     * Hide the affordance once the user intentionally starts scrolling.
     */

    const handleScroll = () => {
      const nextDidScrollPastStart = scrollArea.scrollTop >= 10;

      setDidScrollPastStart((currentDidScrollPastStart) => {
        return currentDidScrollPastStart === nextDidScrollPastStart ? currentDidScrollPastStart : nextDidScrollPastStart;
      });
    };

    scrollArea.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => {
      scrollArea.removeEventListener('scroll', handleScroll);
    };
  }, [hasMoreBelow]);

  /*
   * Nudge the scroll area downward when the affordance is clicked.
   */

  const handleScrollMore = () => {
    scrollAreaRef.current?.scrollBy({
      top: 30,
      behavior: 'smooth',
    });
  };

  const showMoreBelowButton = hasMoreBelow && !didScrollPastStart;

  return <div className='rel fs' style={{ minHeight: 0 }}>
    <div ref={scrollAreaRef} className={cn(className, scrollClassName)}>
      {children}
    </div>

    {!hasMoreBelow ? null : (
      <button
        type='button'
        className={cn('h_36 r px_14 h_center bg shadow_bg_lg bd_2 bd_md ft_xs rel pattern_texture medium_bf of pointer trans_transform_opacity spd_2 z2', showMoreBelowButton ? 'op_100' : 'op_0 noclick')}
        style={{
          position: 'absolute',
          left: '50%',
          bottom: 4,
          transform: showMoreBelowButton ? 'translate(-50%, 0)' : 'translate(-50%, 10px)',
        }}
        aria-hidden={!showMoreBelowButton}
        disabled={!showMoreBelowButton}
        onClick={handleScrollMore}
      >
        <span className='rel'>
          {moreBelowText}
        </span>
      </button>
    )}
  </div>;
});

MoreBelowScrollArea.displayName = 'MoreBelowScrollArea';
