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
    <h4 className='ft_condensed_bold ls_4 ft_xs p_n m_n cl_darker_2'>
      {text}
    </h4>
  </div>
});

CondensedGroupTitle.displayName = 'CondensedGroupTitle';

/**
 * Condensed article list item
 */

interface CondensedArticleItemProps {
  RightComponent?: React.ReactNode;
  title: string;
  description: string | null;
  descriptionPlaceholder?: string;
  labels: Partial<InlineBlockLabelProps>[]
}

export const CondensedArticleItem = memo((p: CondensedArticleItemProps) => {
  const { RightComponent, title, description, descriptionPlaceholder, labels } = p;

  return <article className='article_item h_item gap_xs bd_t bd_lt rel'>
    <div className='h_item f_shrink mr_3 py_sm'>
      {labels.map((label, i) => (
        <InlineBlockLabel
          key={i}
          El='span'
          outline
          color='bg_alt'
          // textColorClassName='cl_primary'
          {...label}
        />
      ))}
    </div>

    {title && <span className='f_shrink py_sm'>{title}</span>}

    {(description || descriptionPlaceholder) && (
      <span className={cn('ellip py_sm f', description ? 'cl_md' : 'cl_lt')}>
        {description || descriptionPlaceholder}
      </span>
    )}

    {RightComponent && <div className='v_center'>
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
            El='span'
            outline
            color='bg_alt'
            // textColorClassName='cl_primary'
            {...label}
          />
        ))}
      </div>
    )} */}
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
