import { cn } from '@jsb188/app/utils/string.ts';
import { makeUploadsUrl } from '@jsb188/app/utils/url_client.ts';
import { useOnClickOutside } from '@jsb188/react-web/utils/dom';
import type { POImageIface, PopOverHandlerProps } from '@jsb188/react/types/PopOver.d';
import { useEffect, useRef, useState } from 'react';

/**
 * Types; Image popover
 */

interface PopOverViewImageProps extends PopOverHandlerProps {
  variables: POImageIface['variables'];
}

/**
 * Image popover
 */

function PopOverViewImage(p: PopOverViewImageProps) {

  const { variables: { imageUri, alt, rect }, closePopOver } = p;
  const cntRef = useRef<HTMLDivElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [style, setStyle] = useState<undefined | Record<string, string>>();

  useOnClickOutside(cntRef, true, false, 'ignore_outside_click', () => closePopOver());

  useEffect(() => {
    const resizeObserver = new ResizeObserver((observed) => {
      const contentRect = observed[0]?.contentRect;
      const width = contentRect?.width;

      if (width) {
        setStyle({
          // +10 is hard coded in CSS
          transform: `translateX(-${width / 2 + 10 - ((rect?.width || 0) / 1)}px)`
        });
      }
    });

    resizeObserver.observe(imgRef.current as HTMLImageElement);
    return () => resizeObserver.disconnect();
  }, []);

  // transform: translate(-210px, -10px);

  return <div
    ref={cntRef}
    className={cn('pu_img_cnt r_df bg_medium shadow_light unsel', style ? '' : 'invis')}
    style={style || { transform: 'translateX(-210px)' }}
  >
    <img
      ref={imgRef}
      className='pu_img r_df bl'
      src={makeUploadsUrl(imageUri, 'tiny', true)}
      alt={alt}

    />

  </div>;
}

export default PopOverViewImage;
