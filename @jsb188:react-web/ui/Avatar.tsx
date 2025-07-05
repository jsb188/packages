import React, { createElement, useState } from 'react';
import { ActivityDots } from './Loading';
import { Icon } from '../icons/Icon';
import { cn } from '@jsb188/app/utils/string';
import { makeUploadsUrl } from '@jsb188/app/utils/url_client';

/**
 * Types
 */

type OnlineStatusEnums = 'ONLINE' | 'AWAY' | 'BUSY' | 'APPEAR_OFFLINE' | 'OFFLINE';

export type AvatarSize = 'xtiny' | 'tiny' | 'small' | 'default' | 'medium' | 'large' | 'xlarge';

type AvatarProps = {
  status?: OnlineStatusEnums;
  typing?: boolean;
  draggable?: boolean;
  displayName?: string;
  size?: AvatarSize | null;
  role?: 'button';
  urlSize?: 'small' | 'medium' | 'large';
  urlPath?: string | null;
  url?: string | null;
  animateGifs?: boolean;
  radiusClassName?: string;
  imageClassName?: string;
  containerClassName?: string;
  className?: string;
  letterClassName?: string;
  children?: any;
};

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

type PillProps = Partial<{
  LinkComponent: any;
  loading: boolean;
  addLoadingIndicator: boolean;
  href: string;
  title: string;
  children: any;
  size: 'small' | 'default' | 'medium' | 'large' | null;
  className: string;
  onClick: (e: React.MouseEvent<HTMLDivElement>) => void;
}>;

type StatusDotProps = {
  status: OnlineStatusEnums;
  typing?: boolean;
};

type AvatarLetterProps = {
  displayName: string;
  size?: AvatarSize | null;
  className?: string;
};

/**
 * Helper function; get avatar size class name
 */

function getSizeClassName(
  prefix: 'av' | 'dots' | 'pill',
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
 * Avatar letter
 */

function AvatarLetter(p: AvatarLetterProps) {
  const { displayName, className } = p;
  const size = p.size!;
  const isLarge = ['large', 'xlarge'].includes(size);
  const sizeClass = getSizeClassName('av', size);

  let fontSize;
  let domElement;
  if (isLarge) {
    // This is ft_lg with <h4 />
    fontSize = 'ft_lg';
    domElement = 'h4';
  } else if (size === 'medium') {
    // This is ft_lg with <strong />
    fontSize = 'ft_lg';
    domElement = 'strong';
  } else if (['medium', 'default'].includes(size)) {
    fontSize = 'ft_md';
    domElement = 'strong';
  } else if (['xtiny','tiny'].includes(size)) {
    fontSize = 'ft_tn';
    domElement = 'span';
  } else {
    fontSize = 'ft_sm';
    domElement = 'span';
  }

  let initialLetters;
  const nameArr = displayName.split(' ');
  if (nameArr.length > 1) {
    initialLetters = nameArr[0].charAt(0) + nameArr[1].charAt(0);
  } else {
    initialLetters = displayName.substring(0, 2);
  }

  return createElement(
    domElement,
    { className: cn('v_center f p_n r av', sizeClass, fontSize, className) },
    <span className='shift_down'>
      {initialLetters}
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
          <ActivityDots size='tiny' />
        </span>
      )}
    </div>
  );
}

/**
 * Avatar
 */

export function AvatarImg(p: AvatarProps) {
  const {
    children,
    draggable,
    displayName,
    role,
    url,
    urlPath,
    className,
    radiusClassName,
    imageClassName,
    letterClassName,
    animateGifs,
  } = p;

  const size = p.size || 'default';
  const urlSize = p.urlSize || 'small';
  const sizeClass = getSizeClassName('av', size);
  const avatarUrl = url || makeUploadsUrl(urlPath, urlSize, animateGifs);
  const hasImg = !!avatarUrl;

  return (
    <figure
      role={role}
      className={cn(
        sizeClass,
        'av main',
        radiusClassName || 'r',
        hasImg ? '' : 'v_center',
        !hasImg && displayName ? 'bg_active cl_bd' : '',
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

/**
 * Pill
 */

export function Pill(p: PillProps) {
  const { loading, addLoadingIndicator, href, onClick, title, children } = p;
  const size = p.size || 'default';
  const className = p.className || 'bg_active';
  const sizeClass = `pill ${getSizeClassName('pill', size, true)}`;
  const LinkComponent = p.LinkComponent || 'a';

  let onClick_;
  if (loading) {
    onClick_ = (e: React.MouseEvent<HTMLDivElement>) => e.preventDefault();
  } else {
    onClick_ = onClick;
  }

  return (
    <LinkComponent
      href={href}
      onClick={onClick_}
      title={title}
      className={cn(
        'r h_center',
        loading && !addLoadingIndicator ? 'is_loading' : '',
        loading && addLoadingIndicator ? 'with_loading_indicator' : '',
        sizeClass,
        className,
      )}
    >
      {!loading || !addLoadingIndicator ? null : (
        <span className='abs_full v_center'>
          <ActivityDots size={['large', 'xlarge'].includes(size || '') ? 'large' : 'medium'} />
        </span>
      )}
      {children}
    </LinkComponent>
  );
}
