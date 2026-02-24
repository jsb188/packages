import { cn } from '@jsb188/app/utils/string.ts';
import { Children, memo } from 'react';
import './Carousel.css';

/**
 * Horizontal carousel module with infinite auto-scroll that pauses on hover.
 */

interface HorizontalCarouselProps {
  as?: React.ElementType;
  children: React.ReactNode;
  className?: string;
  trackClassName?: string;
  slideClassName?: string;
  disableMouseOver?: boolean;
}

export const HorizontalCarousel = memo((p: HorizontalCarouselProps) => {
  const { children, className, trackClassName, slideClassName, disableMouseOver } = p;
  const slides = Children.toArray(children);
  const Element = p.as || 'div';

  if (!slides.length) {
    return null;
  }

  return <Element className={cn(
    'horizontal_carousel',
    disableMouseOver && 'horizontal_carousel_disable_mouse_over',
    className
  )}>
    <div className={cn('horizontal_carousel_track', trackClassName)}>
      <div className='horizontal_carousel_group'>
        {slides.map((slide, index) => {
          return <div
            className={cn('horizontal_carousel_slide', slideClassName)}
            key={`carousel_slide_${index}`}
          >
            {slide}
          </div>;
        })}
      </div>

      <div className='horizontal_carousel_group' aria-hidden>
        {slides.map((slide, index) => {
          return <div
            className={cn('horizontal_carousel_slide', slideClassName)}
            key={`carousel_clone_slide_${index}`}
          >
            {slide}
          </div>;
        })}
      </div>
    </div>
  </Element>;
});

HorizontalCarousel.displayName = 'HorizontalCarousel';
