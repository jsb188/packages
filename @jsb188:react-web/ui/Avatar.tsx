import React, { createElement, useState } from 'react';
import { ActivityDots } from './Loading';
import { Icon } from '../svgs/Icon';
import { cn } from '@jsb188/app/utils/string';
import { makeUploadsUrl } from '@jsb188/app/utils/url_client';

/**
 * Types
 */

type OnlineStatusEnums = 'ONLINE' | 'AWAY' | 'BUSY' | 'APPEAR_OFFLINE' | 'OFFLINE';

export type AvatarSize = 'xtiny' | 'tiny' | 'small' | 'default' | 'medium' | 'large' | 'xlarge';

type AvatarButtonProps = {
  animateGifs?: boolean;
  disabled?: boolean;
  urlPath?: string | null;
  size?: AvatarSize | null;
  text?: string;
  iconName?: string;
  iconClassName?: string;
  className?: string;
  buttonColorClassName?: string;
  radiusClassName?: string;
  IconComponent?: any;
  onClick: () => void;
  onMouseEnter?: (e: React.MouseEvent<HTMLDivElement>) => void;
  onMouseLeave?: (e: React.MouseEvent<HTMLDivElement>) => void;
};

type StatusDotProps = {
  status: OnlineStatusEnums;
  typing?: boolean;
};

/**
 * Helper function; get avatar size class name
 */

function getSizeClassName(
  prefix: 'av' | 'dots',
  size?: AvatarSize,
  doNotAllowExtraSizes?: boolean
) {
  if (!size) {
    return '';
  }

  switch (size) {
    case 'xtiny':
      if (doNotAllowExtraSizes) {
        return `${prefix}_xs`;
      }
      return `${prefix}_xxs`;
    case 'tiny':
      return `${prefix}_xs`;
    case 'small':
      return `${prefix}_sm`;
    case 'medium':
      return `${prefix}_md`;
    case 'large':
      return `${prefix}_lg`;
    case 'xlarge':
      if (doNotAllowExtraSizes) {
        return `${prefix}_lg`;
      }
      return `${prefix}_xl`;
    default:
  }

  return `${prefix}_df`;
}

/**
 * Helper function; get 1 or 2 letters from text
 */

export function getAvatarLetters(text: string) {
  if (!text) {
    return '';
  }
  const nameArr = text.split(' ');
  if (nameArr.length > 1) {
    return nameArr[0].charAt(0) + nameArr[1].charAt(0);
  }
  return text.substring(0, 2);
}

/**
 * Avatar letter
 */

interface AvatarLetterProps {
  displayName: string;
  size?: AvatarSize | null;
  className?: string;
  as?: React.ElementType;
};

function AvatarLetter(p: AvatarLetterProps) {
  const { displayName, className, as } = p;
  const size = p.size!;
  const isLarge = ['large', 'xlarge'].includes(size);
  const sizeClass = getSizeClassName('av', size);

  let fontSize;
  let domElement;
  if (isLarge) {
    // This is ft_lg with <h4 />
    fontSize = 'ft_sm';
    domElement = 'h4';
  } else {

    switch (size) {
      case 'medium':
        fontSize = 'ft_lg';
        domElement = 'strong';
        break;
      case 'default':
        fontSize = 'ft_md';
        domElement = 'strong';
        break;
      case 'small':
        fontSize = 'ft_df';
        domElement = 'span';
        break;
      case 'tiny':
      case 'xtiny':
        fontSize = 'ft_tn';
        domElement = 'span';
        break;
      default:
        fontSize = 'ft_sm';
        domElement = 'span';
    }
  }

  const letters = getAvatarLetters(displayName);

  return createElement(
    as || domElement,
    { className: cn('v_center f p_n r av', sizeClass, fontSize, className) },
    <span className='shift_down unsel'>
      {letters}
    </span>
  );
}

/**
 * Status dot
 */

export function StatusDot(p: StatusDotProps) {
  const { status } = p;
  const size = 14;
  const svgProps = { width: size, height: size, viewBox: `0 0 ${size} ${size}` };

  let maskId;
  let fill;
  switch (status) {
    case 'ONLINE':
      maskId = 'svg-mask-online';
      fill = '#23a55a';
      break;
    case 'APPEAR_OFFLINE':
    case 'OFFLINE':
      maskId = 'svg-mask-offline';
      fill = '#80848e';
      break;
    case 'AWAY':
      maskId = 'svg-mask-away';
      fill = '#f0b232';
      break;
    case 'BUSY':
      maskId = 'svg-mask-busy';
      fill = '#f23f43';
      break;
    default:
  }

  return (
    <svg {...svgProps}>
      <foreignObject x='0' y='0' width={size} height={size} overflow='visible' mask={`url(#${maskId})`}>
        <div style={{ width: '100%', height: '100%', backgroundColor: fill }} />
      </foreignObject>
    </svg>
  );
}

/**
 * SVG status dot
 */

function StatusDotMask(p: StatusDotProps) {
  const { status } = p;

  let maskId;
  let fillClassName;
  switch (status) {
    case 'ONLINE':
      maskId = 'svg-mask-online';
      fillClassName = 's_dot_online';
      // url(#svg-mask-status-online)
      break;
    case 'APPEAR_OFFLINE':
    case 'OFFLINE':
      maskId = 'svg-mask-offline';
      fillClassName = 's_dot_offline';
      // url(#svg-mask-status-offline)

      // if (typing) {
      //   return null;
      // }
      break;
    case 'AWAY':
      maskId = 'svg-mask-away';
      fillClassName = 's_dot_away';
      // url(#svg-mask-status-idle)
      break;
    case 'BUSY':
      maskId = 'svg-mask-busy';
      fillClassName = 's_dot_busy';
      break;
    default:
  }

  // if (typing) {
  //   maskId = 'svg-mask-typing';
  //   if (!fillClassName) {
  //     fillClassName = 's_dot_online';
  //   }
  // }

  return (
    <rect
      // fill={fill}
      mask={`url(#${maskId})`}
      className={cn('s_dot', fillClassName)}
    />
  );
}

/**
 * Avatar
 */

interface AvatarProps {
  status?: OnlineStatusEnums;
  typing?: boolean;
  draggable?: boolean;
  displayName?: string | null;
  size?: AvatarSize | null;
  role?: 'button';
  urlSize?: 'small' | 'medium' | 'large';
  urlPath?: string | null;
  url?: string | null;
  square?: boolean;
  animateGifs?: boolean;
  radiusClassName?: string;
  imageClassName?: string;
  containerClassName?: string;
  className?: string;
  letterClassName?: string;
  children?: any;
  letterAs?: React.ElementType;
}

export function Avatar(p: AvatarProps) {
  const {
    status,
    typing,
    displayName,
    url,
    urlPath,
    imageClassName,
    containerClassName,
    className,
    animateGifs,
    letterAs
  } = p;

  // IMPORTANT NOTE:
  // {radiusClassName} prop does not work for <Avatar /> component
  // Use <AvatarImg /> if you want custom radius <Avatar />

  const size = p.size || 'default';
  const urlSize = p.urlSize || 'small';
  const sizeClass = getSizeClassName('av', size);
  const avatarUrl = url || makeUploadsUrl(urlPath, urlSize, animateGifs);
  const hasImg = !!avatarUrl;
  const hasStatusIcon = !!status || !!typing;

  let mask;
  if (hasStatusIcon) {
    if (size === 'xlarge') {
      mask = typing ? 'url(#svg-mask-small-typing)' : 'url(#svg-mask-xlarge-avatar)';
    } else if (['large', 'medium'].includes(size)) {
      // NOTE: "Big typing" was never finished, and probably never needed
      mask = typing ? 'url(#svg-mask-small-typing)' : 'url(#svg-mask-large-avatar)';
    } else if (size === 'tiny') {
      mask = typing ? 'url(#svg-mask-small-typing)' : 'url(#svg-mask-tiny-avatar)';
    } else {
      mask = typing ? 'url(#svg-mask-small-typing)' : 'url(#svg-mask-small-avatar)';
    }
  }

  return (
    <div className={cn('rel', containerClassName)}>
      <svg
        aria-hidden='true'
        className={cn(
          sizeClass,
          'v_center av main',
          // I noticed that not using .v_center misaligns the typing and status dot SVG
          // hasImg ? '' : 'v_center',
          // !hasImg && displayName && !children ? 'bg_contrast' : '',
          className,
        )}
      >
        <foreignObject x='0' y='0' mask={mask} className='r'>
          <div className={cn('av', sizeClass)} style={{ maskImage: mask }}>
            {!hasImg ? null : (
              <img
                alt={displayName}
                className={cn('img_auto', imageClassName)}
                src={avatarUrl}
              />
            )}
            {hasImg || !displayName ? null : (
              <AvatarLetter
                as={letterAs}
                displayName={displayName}
                size={size}
              />
            )}
          </div>
        </foreignObject>

        {status && !typing ? <StatusDotMask status={status} typing={typing} /> : null}
      </svg>

      {!typing ? null : (
        <span className={cn('s_typing_dots v_center', getSizeClassName('dots', size), status || 'ONLINE')}>
          <ActivityDots size='tn' />
        </span>
      )}
    </div>
  );
}

/**
 * Avatar
 */

export function AvatarImg(p: AvatarProps & {
  outline?: boolean;
  square?: boolean;
  letterBackgroundClassName?: string;
}) {
  const {
    children,
    draggable,
    displayName,
    role,
    url,
    urlPath,
    className,
    imageClassName,
    animateGifs,
    square,
    outline,
    letterAs
  } = p;

  const size = p.size || 'default';
  const urlSize = p.urlSize || 'small';
  const sizeClass = getSizeClassName('av', size);
  const avatarUrl = url || makeUploadsUrl(urlPath, urlSize, animateGifs);
  const hasImg = !!avatarUrl;

  let radiusClassName, letterClassName, letterBackgroundClassName;
  if (square) {
    radiusClassName = p.radiusClassName || 'r_sm';
    letterBackgroundClassName = (p.letterBackgroundClassName ?? 'bg_lighter_3') + ' bd_2 bd_lt';

    if (p.letterBackgroundClassName && !['bg','bg_alt','bg_active'].includes(p.letterBackgroundClassName)) {
      letterClassName = p.letterClassName ?? 'ft_bold';
    } else {
      letterClassName = p.letterClassName ?? 'cl_df ft_bold';
    }
  } else {
    radiusClassName = p.radiusClassName || 'r';
    letterBackgroundClassName = p.letterBackgroundClassName ?? 'bg_alt';

    if (!p.letterBackgroundClassName || ['bg','bg_alt','bg_active'].includes(p.letterBackgroundClassName)) {
      letterClassName = p.letterClassName ?? 'cl_bd';
    }
  }

  return (
    <figure
      role={role}
      className={cn(
        sizeClass,
        'av main',
        radiusClassName,
        outline || (!hasImg && displayName) ? letterBackgroundClassName : '',
        hasImg ? '' : 'v_center',
        className,
      )}
    >
      {!hasImg ? null : (
        <img
          alt={displayName}
          draggable={draggable}
          className={cn('img_auto', radiusClassName, imageClassName)}
          src={avatarUrl}
        />
      )}
      {hasImg || typeof displayName !== 'string' ? null : (
        <AvatarLetter
          as={letterAs}
          displayName={displayName}
          size={size}
          className={letterClassName}
        />
      )}
      {children}
    </figure>
  );
}

/**
 * Avatar button
 */

export function AvatarButton(p: AvatarButtonProps) {
  const { animateGifs, urlPath, size, text, disabled, className, iconName, radiusClassName, buttonColorClassName, onClick, onMouseEnter, onMouseLeave } = p;
  const IconComponent = p.IconComponent || Icon;
  const isBig = ['large', 'xlarge'].includes(size!);

  let iconClassName;
  if (p.iconClassName) {
    iconClassName = p.iconClassName;
  } else if (isBig) {
    iconClassName = 'ic_lg';
  } else {
    iconClassName = 'ic_md';
  }

  // Using <button> made "tab" to next item focus break
  // Only way I could avoid it is using <div>
  return (
    <div
      role='button'
      tabIndex={0}
      className={cn('rel av_btn', disabled ? 'disabled' : 'link', className)}
      onClick={disabled ? undefined : onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <AvatarImg
        radiusClassName={radiusClassName}
        animateGifs={animateGifs}
        size={size}
        urlPath={urlPath}
      />

      {disabled ? null
        : <div
          className={cn(
            'abs_full v_center',
            radiusClassName || 'r',
            !isBig && text ? 'av_btn_text_shift' : '',
            urlPath ? 'click_hover' : 'link bg_alt',
            urlPath ? 'invis' : '',
            iconClassName,
            text ? 'w_text' : '',
          )}
        >
          <IconComponent
            name={iconName || 'photo-up'}
          />
        </div>}

      {!text ? null : (
        <span
          className={cn(
            'pill r h_center',
            isBig ? 'pill_sm' : 'pill_xs',
            buttonColorClassName || 'bg_primary',
          )}
        >
          {text}
        </span>
      )}
    </div>
  );
}

/**
 * Avatar button but with hover for gif animate
 */

export function AvatarButtonGif(p: AvatarButtonProps) {
  const [animateGifs, setAnimateGifs] = useState(false);

  return (
    <AvatarButton
      {...p}
      animateGifs={animateGifs}
      onMouseEnter={() => setAnimateGifs(true)}
      onMouseLeave={() => setAnimateGifs(false)}
    />
  );
}
