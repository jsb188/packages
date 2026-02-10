import type { ColorEnum } from '@jsb188/app/types/app.d.ts';
import { cn } from '@jsb188/app/utils/string.ts';
import { memo } from 'react';
import type { To } from 'react-router';
import { Icon } from '../svgs/Icon';
import { SmartLink } from './Button';

/**
 * Card item
 */

export const GradientCardItem = memo((p: {
  className?: string;
  titleEllipsisStyle?: 'single' | 'double' | 'none';
  title: string;
  label?: React.ReactNode;
  description?: React.ReactNode;
  iconName?: string;
  color: ColorEnum;
  to?: To | string;
  onClick?: (e: React.MouseEvent) => void;
  children?: React.ReactNode;
}) => {
  const { className, titleEllipsisStyle, label, title, description, iconName, color, to, onClick, children } = p;
  const gradientColor = color || 'lime';
  const gradientClassName = `gr_${gradientColor}_1`;

  return <div
    className={cn(
      'v_spread r_dfw shadow_line',
      (onClick || to) && 'link_float',
      gradientClassName,
      className
    )}
  >
    <SmartLink
      to={to}
      onClick={onClick}
      buttonElement='button'
      fallbackElement='div'
      className='f px_20 py_20 rb_dfw cl_contrast v_left'
    >
      {/* {label &&
      <div className='h_item mt_8 mb_4'>
        <span className='r_xs h_item ft_medium bg_lighter_2 ft_sm px_6 py_5'>
          <Icon name={iconName} />
          <span className='ml_8'>
            {label}
          </span>
        </span>
      </div>} */}
      {(label || iconName)&&
      <div className='h_bottom mt_4 ic_df'>
        {iconName && <Icon name={iconName} />}
        {label && <span className='r_xs ft_medium ml_10 -mb_2'>
          {label}
        </span>}
      </div>}

      <div className='v_spread f'>
        <h4 className='ft_semibold ft_3 lh_1'>
          <span className='ellip_dbl'>
            {title}
          </span>
        </h4>

        <p className={description ? 'cl_darker_4 pt_30' : 'h_30'}>
          {description}
        </p>
      </div>
    </SmartLink>
  </div>;
});

GradientCardItem.displayName = 'GradientCardItem';

// yellow
// green
