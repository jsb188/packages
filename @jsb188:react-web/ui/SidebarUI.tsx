import { cn } from '@jsb188/app/utils/string';
import { MockAvatar, MockText } from '@jsb188/react-web/ui/Loading';
import { getAvatarLetters } from '@jsb188/react-web/ui/Avatar';
import { EmojiWrapper } from '@jsb188/react-web/ui/Markdown';
import { memo, useState } from 'react';
import { Icon } from '../svgs/Icon';
import { SmartLink } from './Button';

/**
 * Sidebar header area
 */

export function SidebarHeaderArea(p: any) {
  const { children, ...rest } = p;
  return <div className='shadow_float ft_sm hv_area' {...rest}>
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
      <div className='av_w_xs h_center mr_5 lh_1 ic_abs move_left'>
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
      <div className='av_w_xs h_center mr_5 lh_1 ic_abs move_left'>
        <span className='av_xs v_center r_xs bg_lighter_3 bd_2 bd_lt'>
          <span className='shift_down ft_df'>
            <EmojiWrapper>
              {emoji || getAvatarLetters(title!) || '🌟'}
            </EmojiWrapper>
          </span>
        </span>
      </div>

      <div className='ft_df shift_down ellip'>
        {title}
      </div>

      <span className='ml_xs h_center ic_xs cl_md f_shrink'>
        <Icon name='chevron-right-filled' />
      </span>
    </>}

    {/* When you are ready, add "collapse sidebar" button here */}
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
}) => {
  const { text, iconName, rightIconName, rightIconClassName, onClick, paddingClassName, marginClassName } = p;

  return <div
    role={onClick ? 'button' : undefined}
    onClick={onClick}
    className={cn(
      'cl_md ft_xs h_item lh_1 r_xs',
      paddingClassName ?? 'px_sm py_5',
      marginClassName ?? 'mx_xs',
      onClick && 'bg_active_hv link'
    )}
  >
    {iconName && (
      <span className='av_w_xs h_center mr_5 lh_1 ic_abs move_left'>
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
  initialExpanded?: boolean;
}) => {
  const { text, navList, currentPath, initialExpanded } = p;
  const [expanded, setExpanded] = useState(initialExpanded !== false);

  return <>
    <SidebarSubtitle
      // rightIconClassName={cn('trans_op spd_1 target op_0', !expanded && 'shift_left')}
      rightIconClassName={cn('trans_op spd_1', expanded ? 'target op_0' : 'shift_left')}
      // paddingClassName=''
      marginClassName='mx_xs my_2'
      text={text}
      rightIconName={expanded ? 'chevron-down-filled' : 'chevron-right-filled'}
      onClick={() => setExpanded(!expanded)}
    />

    {expanded &&
    <div className='mb_10'>
      {navList.map((item, i) => (
        item.break
        ? <SidebarBreak key={i} />
        : <SidebarItem
          key={i}
          selected={currentPath === item.to}
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
  to?: string;
  onClick?: (e: any) => void;
  text: string;
  iconName?: string;
  rightIconName?: string;
}

export const SidebarItem = memo((p: SidebarItemProps) => {
  const { text, iconName, rightIconName, to, selected, onClick, className } = p;

  return <SmartLink
    className={cn(
      'mx_xs my_2 py_3 r_xs bl cl_df',
      selected ? 'bg_active disabled' : 'bg_active_hv',
      className
    )}
    disabled={selected}
    to={to}
    onClick={onClick}
  >
    {/* <div className='h_item px_sm py_2 ic_df lh_3'> */}
    <div className='h_item px_sm pt_3 pb_2 ic_df lh_2'>
      {iconName && <div className='av_w_xs h_center mr_5 lh_1 ic_abs move_left'>
        <Icon name={iconName} />
      </div>}

      <div className='f ellip'>
        <EmojiWrapper>
          {text}
        </EmojiWrapper>
      </div>

      {rightIconName && (
        <div className='px_xs h_center lh_1 ic_abs ic_sm cl_darker_4'>
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
