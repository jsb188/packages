import { cn } from '@jsb188/app/utils/string.ts';
import { Children, memo, type MouseEvent } from 'react';
import './Carousel.css';

/**
 * Horizontal carousel module with infinite auto-scroll that pauses on hover.
 */

interface HorizontalCarouselProps {
  as?: React.ElementType;
  children: React.ReactNode;
  onMouseEnterItem?: (i: number, e: MouseEvent) => void;
  onMouseLeaveItem?: (i: number, e: MouseEvent) => void;
  className?: string;
  trackClassName?: string;
  slideClassName?: string;
  disableMouseOver?: boolean;
  allowOverflow?: boolean;
  doNotAnimate?: boolean;
}

export const HorizontalCarousel = memo((p: HorizontalCarouselProps) => {
  const {
    children,
    className,
    trackClassName,
    slideClassName,
    disableMouseOver,
    allowOverflow,
    doNotAnimate,
    onMouseEnterItem,
    onMouseLeaveItem
  } = p;
  const slides = Children.toArray(children);
  const Element = p.as || 'div';

  if (!slides.length) {
    return null;
  }

  return <Element className={cn(
    'horizontal_carousel w_f',
    !allowOverflow && 'of',
    disableMouseOver && 'horizontal_carousel_disable_mouse_over',
    className
  )}>
    <div className={cn(
      'horizontal_carousel_track',
      doNotAnimate && 'horizontal_carousel_track_no_animation',
      trackClassName
    )}>
      <div className='horizontal_carousel_group'>
        {slides.map((slide, index) => {
          return <div
            className={cn('horizontal_carousel_slide', slideClassName)}
            key={`carousel_slide_${index}`}
            onMouseEnter={onMouseEnterItem ? (e) => onMouseEnterItem(index, e) : undefined}
            onMouseLeave={onMouseLeaveItem ? (e) => onMouseLeaveItem(index, e) : undefined}
          >
            {slide}
          </div>;
        })}
      </div>

      {!doNotAnimate && <div className='horizontal_carousel_group' aria-hidden>
        {slides.map((slide, index) => {
          return <div
            className={cn('horizontal_carousel_slide', slideClassName)}
            key={`carousel_clone_slide_${index}`}
            onMouseEnter={onMouseEnterItem ? (e) => onMouseEnterItem(index, e) : undefined}
            onMouseLeave={onMouseLeaveItem ? (e) => onMouseLeaveItem(index, e) : undefined}
          >
            {slide}
          </div>;
        })}
      </div>}
    </div>
  </Element>;
});

HorizontalCarousel.displayName = 'HorizontalCarousel';
