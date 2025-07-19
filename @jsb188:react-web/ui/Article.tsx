import { cn } from '@jsb188/app/utils/string';
import { memo } from 'react';
import type { InlineBlockLabelProps } from './Button';
import { InlineBlockLabel } from './Button';

/**
 * Types
 */

interface CondensedGroupTitleProps {
  text: string;
}

/**
 * Condensed group title
 */

export const CondensedGroupTitle = memo((p: CondensedGroupTitleProps) => {
  const { text } = p;

  return <div className='mt_md'>
    <h4 className='ft_condensed_heading ft_xs p_n m_n cl_darker_2'>
      {text}
    </h4>
  </div>
});

CondensedGroupTitle.displayName = 'CondensedGroupTitle';

/**
 * Condensed article list item
 */

interface CondensedArticleItemProps {
  id?: string;
  preset?: 'modal' | 'default';
  onClick?: (itemId?: string) => void;
  RightComponent?: React.ReactNode;
  title: string;
  description: string | null;
  descriptionPlaceholder?: string;
  labels: Partial<InlineBlockLabelProps>[]
}

export const CondensedArticleItem = memo((p: CondensedArticleItemProps) => {
  const { preset, id, onClick, RightComponent, title, description, descriptionPlaceholder, labels } = p;
  const hasLink = !!onClick;

  // paddingClassName='px_df -mx_5'

  let linkHoverClassName, paddingClassName, addSeparator;
  switch (preset) {
    case 'modal':
      addSeparator = true;
      linkHoverClassName = 'bg_lighter_hv';
      paddingClassName = 'px_df -mx_5';
      break;
    default:
      addSeparator = false;
      linkHoverClassName = 'bg_primary_hv';
      paddingClassName = 'px_xs -mx_xs';
  }

  return <article
    className={cn(
      'article_item rel',
      !addSeparator ? 'bd_lt bd_t_1' : undefined,
      paddingClassName,
      hasLink ? 'link ' + linkHoverClassName : undefined
    )}
    role={hasLink ? 'button' : undefined}
    onClick={hasLink ? () => onClick(id) : undefined}
  >
    {addSeparator && (
      <div className='bd_t_1 bd_lt' />
    )}

    <div className='h_item gap_xs'>
      <div className='h_item f_shrink mr_3 py_sm'>
        {labels.map((label, i) => (
          <InlineBlockLabel
            key={i}
            as='span'
            outline
            color='alt'
            // textColorClassName='cl_primary'
            {...label}
          />
        ))}
      </div>

      {title && <span className='f_shrink py_sm'>{title}</span>}

      {description || descriptionPlaceholder ? (
        <span className={cn('ellip py_sm f', description ? 'cl_md' : 'cl_lt')}>
          {description || descriptionPlaceholder}
        </span>
      ) : <span className='f' />}

      {!RightComponent ? null
      : <div className='h_right gap_xs'>
        {RightComponent}
      </div>}

      {/* <div className='f h_right'>
        <AvatarImg
          size='xtiny'
          displayName='BE'
        />
      </div> */}

      {/* {labels && (
        <div className='h_item pt_sm pb_xs shift_up'>
          {labels.map(label => (
            <InlineBlockLabel
              as='span'
              outline
              color='alt'
              // textColorClassName='cl_primary'
              {...label}
            />
          ))}
        </div>
      )} */}
    </div>
  </article>;

  // return <article className='h_item mb_md gap_md'>
  //   <div className='bg_alt av_md r v_center a_c'>
  //     Dec 4<br />
  //     <span className='ft_tn'>
  //     10:00 AM
  //     </span>

  //   </div>

  //   <div>
  //     {/* <div className='h_item'>
  //       <strong className='bg_active py_xs px_xs r'>
  //         Corn
  //       </strong>
  //     </div> */}
  //     <p className='h_item gap_xs'>
  //       <strong className='bg_active py_xs px_xs r'>
  //         Harvested
  //       </strong>
  //       <span className='bg_active py_xs px_xs r'>
  //         Corn (10 bags)
  //       </span>
  //       </p>
  //     <p>
  //       {description}
  //     </p>
  //   </div>
  // </article>;
});

CondensedArticleItem.displayName = 'CondensedArticleItem';
