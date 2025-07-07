import { cn } from '@jsb188/app/utils/string';
import { MockAvatar, MockText } from '@jsb188/react-web/ui/Loading';
import { EmojiWrapper } from '@jsb188/react-web/ui/Markdown';
import { memo } from 'react';
import { Icon } from '../icons/Icon';
import { SmartLink } from './Button';

/**
 * Sidebar header area
 */

export function SidebarHeaderArea(p: any) {
  const { children, ...rest } = p;
  return <div className='shadow_float ft_sm' {...rest}>
    {children}

    <div className='p_2 rel mt_sm bd_t bd_b bd_lt bg_alt'>

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
  // 'mx_xs my_2 py_3 r_sm bl',
  // return <button
  //   disabled={notReady}
  //   className={cn(
  //     'ft_md ls_3 ft_bold cl_df px_sm fs r_sm',
  //     notReady ? '' : 'link bg_active_hv',
  //   )}
  // >
  return <div className='shift_left h_item'>
    {notReady
    ? <>
      <div className='av_w_xs h_center mr_5 lh_1 ic_abs move_left'>
        <MockAvatar
          size='xxs'
          roundedClassName='r_sm'
          className='bg_active'
        />
      </div>

      <MockText fontSizeClassName='ft_md'>
        ......................
      </MockText>
    </>
    : <>
      <div className='av_w_xs h_center mr_5 lh_1 ic_abs move_left'>
        <span className='av_xs v_center r_sm bg_lighter_3 bd_2 bd_lt'>
          <span className='shift_down'>
            <EmojiWrapper>
              {emoji || title?.charAt(0) || '🌟'}
            </EmojiWrapper>
          </span>
        </span>
      </div>

      <div className='ft_df shift_down f ellip'>
        {title}
      </div>

      <span className='ml_xs h_center ft_df cl_md'>
        <Icon name='chevron-down' />
      </span>
    </>}
  </div>;
});

SidebarHeaderNav.displayName = 'SidebarHeaderNav';

/**
 * Sidebar subtitle
 */

interface SidebarSubtitleProps {
  text: string;
  iconName?: string;
  rightIconName?: string;
}

export const SidebarSubtitle = memo((p: SidebarSubtitleProps) => {
  const { text, iconName, rightIconName } = p;

  return <div className='mx_xs px_sm pt_df mt_xs pb_5 cl_md ft_xs h_spread lh_1'>
    {iconName && (
      <span className='av_w_xs h_center mr_5 lh_1 ic_abs move_left'>
        <Icon name={iconName} />
      </span>
    )}

    <strong className={cn('ft_medium f ellip', !iconName && 'shift_left')}>
      {text}
    </strong>

    {rightIconName && (
      <span className='pl_xs shift_up'>
        <Icon name={rightIconName} />
      </span>
    )}
  </div>;
});

SidebarSubtitle.displayName = 'SidebarSubtitle';

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
      'mx_xs my_2 py_3 r_sm bl',
      selected ? 'bg_active disabled cl_df' : 'bg_active_hv cl_bd',
      className
    )}
    disabled={selected}
    to={to}
    onClick={onClick}
  >
    <div className='h_item px_sm py_2 ic_df lh_3'>
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
