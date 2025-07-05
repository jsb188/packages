import { cn } from '@jsb188/app/utils/string';
import { makeUploadsUrl } from '@jsb188/app/utils/url_client';
import { memo } from 'react';
import { Icon } from '../icons/Icon';
import { Avatar, AvatarImg } from './Avatar';
import type { AvatarSize } from './Avatar';
import { InlineButton } from './Button';
import { EmojiWrapper } from './Markdown';

/**
 * Types
 */

type ListSubtitleProps = {
  HiddenTitleComponent?: React.ReactNode;
  iconName?: string;
  className?: string;
  children: any;
};

type ListItemProps = {
  sidebarLinkProps?: any;
  SidebarLinkComponent?: any;
  id?: string;
  preset?: 'em' | 'small' | 'tiny' | 'xtiny';
  status?: 'ONLINE' | 'OFFLINE' | 'AWAY' | 'BUSY';
  typing?: boolean;
  unread?: boolean;
  title: string;
  description?: string;
  iconName?: string;
  rightIconName?: string | null;
  chevronIconName?: string | null;
  chevronClassName?: string;
  selected?: boolean;
  addChevron?: boolean;
  first?: boolean;
  last?: boolean;
  onClick?: (e: React.MouseEvent) => void;
  href?: string;
  to?: string;
  photoUri?: string;
  displayName?: string;
  TitleComponent?: React.ReactNode;
  OptionsComponent?: any;
  LinkComponent?: any;
  linkProps?: object;
  children?: any;
};

type ListMockProps = {
  size: number;
  first?: boolean;
  last?: boolean;
  preset?: 'em';
  addSubtitle?: boolean;
};

type ListGroupContainerProps = {
  className?: string;
  addSidebarLine: boolean;
  children: React.ReactNode;
};

type LineListItemProps = Partial<{
  preset: 'normal' | 'em';
  LinkComponent?: any;
  first: boolean;
  last: boolean;
  unread: boolean;
  addChevron: boolean;
  className: string;
  title: string;
  description: string;
  titleIconName: string;
  displayName: string;
  iconName: string;
  photoUri: string;
  avatarContainerClassName: string;
  textClassName: string;
  onClick: (e: React.MouseEvent) => void;
  onClickButton: (e: React.MouseEvent) => void;
  buttonText: string;
  linkProps: object;
}>;

type ThumbnailItemProps = {
  urlSize: 'small' | 'medium';
  alt?: string;
  photoUri?: string;
  text?: string;
};

type StickyFooterAreaProps = Partial<{
  className: string;
  sticky: boolean;
  children: React.ReactNode;
}>;

/**
 * List group
 */

export function ListGroupContainer(p: ListGroupContainerProps) {
  const { className, addSidebarLine, children, ...other } = p;
  return <div className={cn('li_group bg_alt', className)} {...other}>
    {children}
    {addSidebarLine ? <div className='li_group_line r' /> : null}
  </div>;
}

/**
 * List item
 */

export const ListItem = memo((p: ListItemProps) => {
  const {
    status,
    typing,
    iconName,
    rightIconName,
    selected,
    unread,
    chevronIconName,
    addChevron,
    first,
    last,
    title,
    description,
    photoUri,
    displayName,
    onClick,
    href,
    to,
    preset,
    OptionsComponent,
    children,
    linkProps,
    chevronClassName,
  } = p;

  const hasAvatar = photoUri || displayName;

  let LinkComponent;
  if (p.LinkComponent) {
    LinkComponent = p.LinkComponent;
  } else if (onClick) {
    LinkComponent = 'button';
  } else {
    LinkComponent = 'span';
  }

  let TitleComponent: React.ReactNode = 'strong';
  let AvatarComponent = Avatar;
  let avatarSize: AvatarSize = 'default';
  let chevronSizeClassName = 'ft_md';

  switch (preset) {
    case 'small':
      avatarSize = 'small';
      break;
    case 'tiny':
      TitleComponent = 'span';
      AvatarComponent = AvatarImg;
      avatarSize = 'tiny';
      chevronSizeClassName = 'ic_sm';
      break;
    case 'xtiny':
      TitleComponent = 'span';
      AvatarComponent = AvatarImg;
      avatarSize = 'xtiny';
      chevronSizeClassName = 'ic_sm';
      break;
    default:
  }

  if (p.TitleComponent) {
    TitleComponent = p.TitleComponent;
  }

  return (
    <div className={cn('li_item', selected ? 'selected' : '', preset || 'default', first ? 'first' : '', last ? 'last' : '')}>
      <LinkComponent
        href={href}
        to={to}
        onClick={onClick}
        className='h_item content p_li normal rel'
        {...linkProps}
      >
        {!hasAvatar ? null : (
          <AvatarComponent
            typing={typing}
            status={status}
            className='mr_sm'
            urlSize='small'
            size={avatarSize}
            urlPath={photoUri}
            displayName={displayName || title}
          />
        )}

        {!iconName || hasAvatar ? null : (
          <span className='av_df r mr_sm v_center ic_md bg'>
            <Icon
              name={iconName}
            />
          </span>
        )}

        <div className={cn('li_item_body ellip_cnt f', avatarSize === 'default' ? 'lh_4' : 'lh_3')}>
          <TitleComponent className='ellip'>
            <EmojiWrapper>
              {title}
            </EmojiWrapper>
          </TitleComponent>
          {!description ? null : (
            <div className='h_item cl_bd ft_sm'>
              <div className='ellip'>
                <EmojiWrapper>
                  {description}
                </EmojiWrapper>
              </div>
            </div>
          )}
        </div>

        {!addChevron ? null : (
          <div className={cn('link ml_xs', chevronSizeClassName, chevronClassName || 'cl_lt')}>
            <Icon name={chevronIconName || 'chevron-right'} />
          </div>
        )}

        {!unread && !rightIconName ? null : (
          <div className='li_right h_center av_sm r'>
            {unread ? <span className='unread_dot bg_main' /> : null}
            {rightIconName ? <Icon name={rightIconName} /> : null}
          </div>
        )}

        {OptionsComponent}
      </LinkComponent>

      {children}
    </div>
  );
});

ListItem.displayName = 'ListItem';

/**
 * List item; but has a double avatar on the right, which is meant to be hidden in a Sidebar
 */

export const ListItemSidebar = memo((p: ListItemProps) => {
  const {
    status,
    typing,
    title,
    photoUri,
    displayName,
    onClick,
    href,
    to
  } = p;

  const { sidebarLinkProps, SidebarLinkComponent: SidebarLinkComponent_, ...other } = p;
  const hasAvatar = photoUri || displayName;
  const SidebarLinkComponent = SidebarLinkComponent_ || 'a';

  return (
    <ListItem {...other}>
      <SidebarLinkComponent
        href={href}
        to={to}
        onClick={onClick}
        className='li_sidebar_hidden v_center'
        {...sidebarLinkProps}
      >
        {!hasAvatar ? null : (
          <Avatar
            typing={typing}
            status={status}
            urlSize='small'
            size='default'
            urlPath={photoUri}
            displayName={displayName || title}
          />
        )}
      </SidebarLinkComponent>
    </ListItem>
  );
});

ListItemSidebar.displayName = 'ListItemSidebar';

/**
 * List item; with hidden title for non-expanded state
 */

export const ListSubtitleSidebar = memo((p: ListSubtitleProps) => {
  const { iconName, className, HiddenTitleComponent, children } = p;

  return (
    <div className={cn('subtitle p_li rel', className)}>
      <div className='content h_item ft_sm cl_md'>
        {!iconName ? null : (
          <span className='icon_cnt'>
            <Icon name={iconName} />
          </span>
        )}

        {children}
      </div>

      {!HiddenTitleComponent ? null
        : <div className='li_sidebar_hidden subtitle p_li h_center ft_sm'>
          {HiddenTitleComponent}
        </div>}
    </div>
  );
});

ListSubtitleSidebar.displayName = 'ListSubtitleSidebar';

/**
 * List mock
 */

export const ListMockComponent = memo((p: ListMockProps) => {
  const { addSubtitle, preset, size, first, last } = p;

  return (
    <>
      {!addSubtitle ? null : (
        <div className='subtitle p_li'>
          <div className='content h_spread ft_sm cl_md'>
            <span className='mock mr_xs f'>
              ... ... ... ... ... ... ... ... ...
            </span>
            <span className='mock mr_xs'>
              .. ..
            </span>
            <span className='mock mr_xs'>
              .. ..
            </span>
          </div>
        </div>
      )}

      {[...Array(size)].map((_, i) => (
        <div key={i} className={cn('li_item', preset, first ? 'first' : '', last ? 'last' : '')}>
          <div className='h_item content p_li normal'>
            <div className='av_df r mr_sm mock_av' />
            <div className='li_item_body'>
              <strong className='mock'>
                ... ... ... ... ... ...
              </strong>
              <br />
              <span className='mock'>
                ... ... ... ... ... ... ... ... ... ...
              </span>
            </div>
          </div>
        </div>
      ))}
    </>
  );
});

ListMockComponent.displayName = 'ListMockComponent';

/**
 * Small list mock
 */

export const SmallListMockItem = memo(() => {
  return (
    <div className='li_item xtiny'>
      <div className='h_item content p_li normal'>
        <div className='av_xxs r mr_sm mock_av' />
        <div className='li_item_body'>
          <span className='mock'>
            ... ... ... ... ... ...
          </span>
        </div>
      </div>
    </div>
  );
});

SmallListMockItem.displayName = 'SmallListMockItem';

/**
 * List subtitle
 */

export const ListSubtitle = memo((p: ListSubtitleProps) => {
  const { iconName, className, children } = p;

  return (
    <div className={cn('subtitle p_li', className)}>
      <div className='content h_item ft_sm cl_md'>
        {!iconName ? null : (
          <span className='icon_cnt'>
            <Icon name={iconName} />
          </span>
        )}

        {children}
      </div>
    </div>
  );
});

ListSubtitle.displayName = 'ListSubtitle';

/**
 * Line list item
 */

export const LineListItem = memo((p: LineListItemProps) => {
  const {
    linkProps,
    preset,
    unread,
    first,
    last,
    textClassName,
    title,
    description,
    displayName,
    photoUri,
    avatarContainerClassName,
    iconName,
    titleIconName,
    addChevron,
    className,
    onClick,
    onClickButton,
    buttonText,
  } = p;

  let LinkComponent;
  if (p.LinkComponent) {
    LinkComponent = p.LinkComponent;
  } else {
    LinkComponent = 'div';
  }

  return (
    <LinkComponent
      className={cn('ln_item h_item', className, first ? 'first' : '', last ? 'last' : '', preset || 'normal', onClick ? 'link' : '')}
      role={onClick ? 'button' : undefined}
      onClick={onClick}
      {...linkProps}
    >
      <div className={cn('f_shrink av_w_df h_center', avatarContainerClassName)}>
        {!photoUri && !displayName ? null : (
          <AvatarImg
            size='tiny'
            urlPath={photoUri}
            displayName={displayName}
          />
        )}

        {!iconName ? null : (
          <Icon
            name={iconName}
          />
        )}
      </div>

      <div className={cn('h_item ellip_cnt ic_sm f', textClassName)}>
        <span className='ellip'>
          {title}
        </span>
        {!titleIconName ? null : (
          <span className='ml_3'>
            <Icon
              name={titleIconName}
            />
          </span>
        )}

        {!description ? description : (
          <span className='cl_md ml_xs ellip'>
            {description}
          </span>
        )}
      </div>

      {!onClickButton && !buttonText ? null : (
        <InlineButton
          preset={!onClickButton ? 'subtle' : 'bg_secondary'}
          className={cn('mx_sm', onClickButton ? '' : 'bg_alt cl_md')}
          text={buttonText || ''}
          onClick={onClickButton}
          disabled={!onClickButton}
        />
      )}

      {!addChevron && !unread ? null : (
        <div className='ml_xs mr_df ft_md cl_lt h_center'>
          {unread ? <span className='unread_dot bg_main' /> : null}
          {addChevron ? <Icon name='chevron-right' /> : null}
        </div>
      )}
    </LinkComponent>
  );
});

LineListItem.displayName = 'LineListItem';

/**
 * Line list mock item
 */

export function LineListMockItem(p: any) {
  const { textClassName } = p;
  return (
    <div className='ln_item h_item'>
      <div className='f_shrink av_w_df h_center'>
        <span className='av av_xs r mock_av' />
      </div>

      <div className={cn('h_item ellip_cnt ic_sm ml_xs', textClassName)}>
        <strong className='mock ft_md'>
          .. .. .. .. .. .. .. ..
        </strong>
        <strong className='mock ft_md ml_xs'>
          .. .. .. .. ..
        </strong>
      </div>
    </div>
  );
}

/**
 * Line list subtitle
 */

export const LineSubtitle = memo((p: LineListItemProps) => {
  const { title, iconName, photoUri, avatarContainerClassName, className, textClassName } = p;
  const hasNoAsset = !iconName && !photoUri;

  return (
    <div className={cn('ln_item h_item subtitle', hasNoAsset ? 'mb_xs' : '', className)}>
      {hasNoAsset ? null
        : <div className={cn('h_center av_w_df ic_df', avatarContainerClassName)}>
          {!photoUri ? null : (
            <AvatarImg
              size='tiny'
              urlPath={photoUri}
            />
          )}
          {!iconName || photoUri ? null : (
            <Icon
              name={iconName}
            />
          )}
        </div>}

      <strong className={textClassName}>
        {title}
      </strong>
    </div>
  );
});

LineSubtitle.displayName = 'LineSubtitle';

/**
 * Thumbnail list item
 */

export const ThumbnailItem = memo((p: ThumbnailItemProps) => {
  const { urlSize, photoUri, text, alt } = p;
  const thumbUrl = photoUri && makeUploadsUrl(photoUri, urlSize) as string;

  return (
    <figure className={cn('th_item r_sm', photoUri ? '' : 'bg_alt')}>
      {!thumbUrl ? null : (
        <img
          alt={alt || 'thumbnail item'}
          className='abs_full r_sm img_auto'
          src={thumbUrl}
        />
      )}
      {photoUri || !text ? null : (
        <span className='abs_full v_center cl_md ft_tn'>
          {text}
        </span>
      )}
    </figure>
  );
});

ThumbnailItem.displayName = 'ThumbnailItem';

/**
 * Sticky footer area; for buttons, or whatever
 */

export const StickyFooterArea = memo((p: StickyFooterAreaProps) => {
  const { sticky, children, className, ...other } = p;
  return (
    <div className={cn('btn_area fs z2', sticky !== false ? 'sticky' : '', className)} {...other}>
      {children}
    </div>
  );
});

StickyFooterArea.displayName = 'StickyFooterArea';
