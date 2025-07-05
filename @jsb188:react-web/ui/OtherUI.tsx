import { platformShortcut } from '../utils/dom';

/**
 * Shorcut key
 */

export function ShortcutKey(p: any) {
  const { letter } = p;
  return (
    <span className='shortcut ft_tn'>
      {platformShortcut(letter)}
    </span>
  );
}

/**
 * Simple Video element
 */

type VideoMimeType = 'video/mp4' | 'video/webm' | 'video/ogg' | 'video/quicktime' | 'video/x-msvideo' | 'video/x-flv' | 'video/x-matroska' | 'video/3gpp' | 'video/3gpp2';

interface VideoProps {
  source: [string, VideoMimeType][];
  width?: number | string;
  height?: number | string;
  controls?: boolean;
  autoPlay?: boolean;
  muted?: boolean;
  loop?: boolean;
  poster?: string; // Thumbnail image for the video before playing
}

export function Video(p: VideoProps) {
  const { source, autoPlay, muted, ...other } = p;

  return <video
    {...other}
    autoPlay={autoPlay}
    muted={muted === true || autoPlay} // Chrome *only* allows autoplay if video is muted
  >
    {source.map((src, index) => (
      <source key={index} src={src[0]} type={src[1]} />
    ))}
    Your browser does not support the video tag.
  </video>;
}

/**
 * Simple, responsive Image element
 */

type ImageMimeType = 'image/jpeg' | 'image/png' | 'image/gif' | 'image/avif' | 'image/webp' | 'image/svg+xml' | 'image/bmp' | 'image/tiff';

type ImageSrcObj = [
  string, // Image URL
  (string | number)?, // media query (number defaults to min-width in pixels)
  ImageMimeType? // Optional: MIME type (e.g., "image/jpeg", "image/png", etc.)
]

interface ImageProps {
  srcSet?: ImageSrcObj[];
  src: string; // Fallback image source
}

export function Image(p: ImageProps) {
  const { srcSet, src, ...other } = p;

  return <picture>
    {srcSet?.map((src, index) => {
      const [url, minWidth, mimeType_] = src;
      const mediaQuery = typeof minWidth === 'number' ? `(min-width: ${minWidth}px)` : minWidth;

      let mimeType = mimeType_;
      if (!mimeType) {
        // If MIME type is not provided, browser will load the image slightly to infer it.
        const ext = url.match(/\.(\w+)$/)?.[1]?.toLowerCase();
        mimeType = ext ? `image/${ext}` as ImageMimeType : undefined;
      }

      return (
        <source
          key={index}
          srcSet={url}
          media={mediaQuery}
          type={mimeType}
        />
      );
    })}

    <img src={src} {...other} />
  </picture>;
}
