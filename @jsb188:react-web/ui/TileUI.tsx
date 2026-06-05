import { cn } from '@jsb188/app/utils/string.ts';
import { memo } from 'react';
import type { To } from 'react-router';
import { Icon } from '../svgs/Icon';
import { SmartLink } from './Button';

const TILE_SECTION_MOCK_TILE_KEYS = ['1', '2', '3', '4'];

/**
 * Render one compact workspace-style tile item.
 */
export const TileItem = memo((p: {
  className?: string;
  description?: React.ReactNode;
  iconName: string;
  title: React.ReactNode;
  to?: To | string;
  onClick?: (e: React.MouseEvent) => void;
}) => {
  const { className, description, iconName, title, to, onClick } = p;

  return <SmartLink
    to={to}
    onClick={onClick}
    buttonElement='div'
    fallbackElement='div'
    className={cn(
      // 'bg_fade bg_alt_hv r_sm min_w_0 pattern_speckle bg_bf rel bd_1 bd_lt',
      'bg bg_fade_hv r_sm min_w_0 bd_1 bd_lt bd_primary_hv',
      'w_275 h_115 h_left gap_sm p_df',
      (to || onClick) && 'link trans_link',
      className,
    )}
  >
    <span className='h_100_pc bg_fade pattern_dot active_bf shadow_line_alt v_center r_sm ic_md no_shrink rel ap_1'>
      <span className='rel'>
        <Icon
          name={iconName}
          backupName='file'
          tryColor
        />
      </span>
    </span>

    <div className='v_item pt_xs'>
      <span className='medium_bf ellip_dbl cl_df'>
        {title}
      </span>

      {!description ? null : (
        <span className='ft_sm cl_md ellip'>
          {description}
        </span>
      )}
    </div>
  </SmartLink>;
});

TileItem.displayName = 'TileItem';

/**
 * Render one loading mock tile using the same dimensions as tile items.
 */
const TileSectionMockItem = memo(() => {
  return <div
    className='bg bg_fade_hv r_sm min_w_0 bd_1 bd_lt bd_primary_hv w_275 h_115 h_left gap_sm p_df'
  >
    <span
      className='h_100_pc bg_alt v_center r_sm no_shrink rel ap_1'
    />

    <span className='v_item gap_xs min_w_0 pt_xs'>
      <span className='w_100 h_16 bg_alt r' />
      <span className='w_150 h_12 bg_alt r' />
    </span>
  </div>;
});

TileSectionMockItem.displayName = 'TileSectionMockItem';

/**
 * Render a titled tile section with wrapping horizontal items or mock tiles.
 */
export const TileSection = memo((p: {
  children?: React.ReactNode;
  className?: string;
  mocked: boolean;
  title: React.ReactNode;
}) => {
  const { children, className, mocked, title } = p;

  return <section className={cn('v_item', className)}>
    <div className='ft_medium ft_xl ls_4 rel mb_sm'>
      {mocked ? <div className='w_200 h_25 bg_alt r' /> : title}
    </div>

    <div className='h_left f_wrap gap_df'>
      {mocked ? TILE_SECTION_MOCK_TILE_KEYS.map((key) => (
        <TileSectionMockItem key={key} />
      )) : children}
    </div>
  </section>;
});

TileSection.displayName = 'TileSection';
