import { useRef, memo, useEffect } from 'react';

/**
 * Add class when element is at top of scroll area
 */

export interface ScrollAwareProps {
  as?: React.ElementType;
  children: React.ReactNode;
  className?: string;
  scrollAreaDOMId?: string;
}

export const ScrollAware = memo((p: ScrollAwareProps) => {
  const { as, scrollAreaDOMId, className, ...rest } = p;
  const elementRef = useRef<HTMLDivElement>(null);
  const Element = as || 'div';

  useEffect(() => {
    // Check the scroll position of elementRef inside scrollAreaDOMId
    const scrollAreaDOM = scrollAreaDOMId && document.getElementById(scrollAreaDOMId);

    if (scrollAreaDOM && elementRef.current) {
      const handleScroll = () => {
        const rect = elementRef.current?.getBoundingClientRect();
        if (rect) {
          const isAtTop = rect.top >= scrollAreaDOM.getBoundingClientRect().top;
          if (isAtTop) {
            // console.log('AT TOP:', rect.top, scrollAreaDOM.getBoundingClientRect().top);
            // elementRef.current?.classList.add('at-top');
          } else {
            // console.log('NOT AT TOP:', rect.top, scrollAreaDOM.getBoundingClientRect().top);
            // elementRef.current?.classList.remove('at-top');
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
  }, [scrollAreaDOMId]);

  return <Element
    ref={elementRef}
    className={className}
    {...rest}
  />;
});

ScrollAware.displayName = 'ScrollAware';