import { cn } from '@jsb188/app/utils/string.ts';
import { getAvatarLetters } from '@jsb188/react-web/ui/Avatar';
import { MockAvatar, MockText } from '@jsb188/react-web/ui/Loading';
import { EmojiWrapper } from '@jsb188/react-web/ui/Markdown';
import { memo, useState, type MouseEvent } from 'react';
import { Icon } from '../svgs/Icon';
import { SmartLink } from './Button';

const SIDEBAR_AVATAR_CLASSNAME = 'w_28 h_center mr_4 lh_1 ic_abs move_left';

/*
 * Check whether a sidebar item should be selected for the current pathname.
 */

export function isSidebarItemSelected(currentPath?: string, to?: string) {
  if (!currentPath || !to) {
    return false;
  }

  if (currentPath === to) {
    return true;
  }

  if (to === '/app') {
    return false;
  }

  const pathPrefix = to.endsWith('/') ? to : `${to}/`;
  return currentPath.startsWith(pathPrefix);
}

/**
 * Sidebar header area
 */

export function SidebarHeaderArea(p: any) {
  const { children, ...rest } = p;
  return <div className='shadow_float hv_area' {...rest}>
    {children}

    <div className='p_2 rel mt_sm bd_t_1 bd_b_1 bd_lt bg_alt'>

    </div>
  </div>;
}

/**
 * Sidebar header nav (top title area)
 */

interface SidebarHeaderNavProps {
  notReady?: boolean;
  title?: string;
  emoji?: string;
}

export const SidebarHeaderNav = memo((p: SidebarHeaderNavProps) => {
  const { notReady, title, emoji } = p;
  return <div className='shift_left h_item'>
    {notReady
    ? <>
      <div className={SIDEBAR_AVATAR_CLASSNAME}>
        <MockAvatar
          size='xxs'
          roundedClassName='r_xs'
          className='bg_active'
        />
      </div>

      <MockText fontSizeClassName='ft_md'>
        ......................
      </MockText>
    </>
    : <>
      <div className={SIDEBAR_AVATAR_CLASSNAME}>
        <span
          className='w_26 h_26 v_center r_xs ft_normal'
          // If .bg_fade or .bg_darker_2 colors ever change, you have to change this hex too
          style={{backgroundColor: '#E9E8E8'}}
        >
          <span className='shift_down ft_xs'>
            <EmojiWrapper>
              {emoji || getAvatarLetters(title!) || '🌟'}
            </EmojiWrapper>
          </span>
        </span>
      </div>

      <div className='ft_df shift_down ellip'>
        {title}
      </div>

      {/* <span className='ml_6 h_center ic_xs cl_md no_shrink'>
        <Icon name='chevron-right-filled' />
      </span> */}
    </>}
  </div>;
});

SidebarHeaderNav.displayName = 'SidebarHeaderNav';

/**
 * Sidebar subtitle
 */

export const SidebarSubtitle = memo((p: {
  paddingClassName?: string;
  marginClassName?: string;
  text: string;
  iconName?: string;
  rightIconName?: string;
  rightIconClassName?: string;
  onClick?: (e: any) => void;
  onContextMenu?: (e: MouseEvent<HTMLDivElement>) => void;
}) => {
  const { text, iconName, rightIconName, rightIconClassName, onClick, onContextMenu, paddingClassName, marginClassName } = p;

  return <div
    role={onClick ? 'button' : undefined}
    onClick={onClick}
    onContextMenu={onContextMenu}
    data-sidebar-context-target={onContextMenu ? 'true' : undefined}
    className={cn(
      'cl_md ft_xs h_item lh_1 r_xs',
      paddingClassName ?? 'px_12 py_5',
      marginClassName ?? 'mx_6',
      onClick && 'bg_darker_2_hv link'
    )}
  >
    {iconName && (
      <span className={SIDEBAR_AVATAR_CLASSNAME}>
        <Icon name={iconName} />
      </span>
    )}

    <strong className={cn('ft_medium ellip', !iconName && 'shift_left')}>
      {text}
    </strong>

    {rightIconName && (
      <span className={cn('pl_4 ic_sm', rightIconClassName)}>
        <Icon name={rightIconName} />
      </span>
    )}
  </div>;
});

SidebarSubtitle.displayName = 'SidebarSubtitle';

/**
 * Sidebar collapsible nav
 */

export const SidebarNestedNavItem = memo((p: {
  text: string;
  navList: (SidebarItemProps & { break?: boolean })[];
  currentPath?: string;
  currentPathPrefix?: string;
  initialExpanded?: boolean;
  onOpenLinkContextMenu?: (e: MouseEvent<HTMLElement>, to?: string | null) => void;
  onOpenContextMenu?: (e: MouseEvent<HTMLElement>, p: {
    expanded: boolean;
    setExpanded: (expanded: boolean) => void;
  }) => void;
}) => {
  const { text, navList, currentPath, initialExpanded, onOpenLinkContextMenu, onOpenContextMenu } = p;
  const [expanded, setExpanded] = useState(initialExpanded !== false);

  return <>
    <SidebarSubtitle
      // rightIconClassName={cn('trans_op spd_1 target op_0', !expanded && 'shift_left')}
      rightIconClassName={cn('trans_op spd_1', expanded ? 'target op_0' : 'shift_left')}
      // paddingClassName=''
      marginClassName='mx_6 my_2'
      text={text}
      rightIconName={expanded ? 'chevron-down-filled' : 'chevron-right-filled'}
      onClick={() => setExpanded(!expanded)}
      onContextMenu={(e) => onOpenContextMenu?.(e, {
        expanded,
        setExpanded,
      })}
    />

    {expanded &&
    <div className='mb_10'>
      {navList.map((item, i) => (
        item.break
        ? <SidebarBreak key={i} />
        : <SidebarItem
          key={i}
          currentPath={currentPath}
          selected={isSidebarItemSelected(currentPath, item.to)}
          onContextMenu={(e) => onOpenLinkContextMenu?.(e, item.to)}
          {...item}
        />
      ))}
    </div>}
  </>;
});

SidebarNestedNavItem.displayName = 'SidebarNestedNavItem';

/**
 * Sidebar item
 */

interface SidebarItemProps {
  className?: string;
  selected?: boolean;
  currentPath?: string;
  to?: string;
  onClick?: (e: any) => void;
  onContextMenu?: (e: MouseEvent<HTMLElement>) => void;
  text: string;
  iconName?: string;
  rightIconName?: string;
}

export const SidebarItem = memo((p: SidebarItemProps) => {
  const { text, iconName, rightIconName, currentPath, to, selected, onClick, onContextMenu, className } = p;
  return <SmartLink
    className={cn(
      'mx_6 my_2 py_3 r_xs bl ft_sm cl_df',
      selected ? 'bg_darker_2 disabled' : 'bg_darker_2_hv',
      className
    )}
    data-sidebar-context-target={onContextMenu ? 'true' : undefined}
    disabled={currentPath === to}
    to={to}
    onClick={onClick}
    onContextMenu={onContextMenu}
  >
    {/* <div className='h_item px_12 py_2 ic_df lh_3'> */}
    <div className='h_item px_11 pt_3 pb_2 ic_df lh_2'>
      {iconName && <div className={SIDEBAR_AVATAR_CLASSNAME}>
        <Icon name={iconName} />
      </div>}

      <div className='f ellip'>
        <EmojiWrapper>
          {text}
        </EmojiWrapper>
      </div>

      {rightIconName && (
        <div className='px_6 h_center lh_1 ic_abs ic_sm cl_darker_4'>
          <Icon name={rightIconName} />
        </div>
      )}
    </div>
  </SmartLink>;
});

SidebarItem.displayName = 'SidebarItem';

/**
 * Sidebar break
 */

export const SidebarBreak = memo(() => {
  return <div className='py_8 mx_df'>
    <div className='h_4 rel pattern_texture texture_bf' />
  </div>;
});

SidebarBreak.displayName = 'SidebarBreak';
