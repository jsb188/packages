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
