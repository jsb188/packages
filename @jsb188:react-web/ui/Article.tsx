import { cn } from '@jsb188/app/utils/string';
import { memo } from 'react';
import type { InlineBlockLabelProps } from './Button';
import { InlineBlockLabel } from './Button';

/**
 * Types
 */

interface CondensedGroupTitleProps {
  domId?: string;
  text: string;
}

/**
 * Condensed group title
 */

export const CondensedGroupTitle = memo((p: CondensedGroupTitleProps) => {
  const { text, domId } = p;

  return <div className='mt_md mb_sm' id={domId}>
    <h4 className='ft_normal ft_xs p_n m_n cl_darker_2 ls_2'>
      {text}
    </h4>
  </div>
});

CondensedGroupTitle.displayName = 'CondensedGroupTitle';

/**
 * Condensed group title mock
 */

export function CondensedGroupTitleMock() {
  return <div className='mt_md mb_sm'>
    <h4 className='ft_normal ft_xs p_n m_n cl_invis'>
      ....
    </h4>
  </div>;
}

/**
 * Condensed article list item
 */

interface CondensedArticleItemProps {
  __deleted?: boolean;
  domIdPrefix?: string;
  id?: string;
  preset?: 'modal' | 'default';
  onClick?: (itemId?: string) => void;
  disabled?: boolean;
  RightComponent?: React.ReactNode;
  title: string;
  description: string | null;
  descriptionPlaceholder?: string;
  labels?: Partial<InlineBlockLabelProps>[]
}

export const CondensedArticleItem = memo((p: CondensedArticleItemProps) => {
  const { __deleted, preset, domIdPrefix, id, onClick, RightComponent, title, description, descriptionPlaceholder, labels } = p;
  const disabled = p.disabled || __deleted;
  const hasLink = !!onClick && !disabled;
  const isModalPreset = preset === 'modal';

  // paddingClassName='px_df -mx_5'

  let linkHoverClassName, paddingClassName, addSeparator;
  switch (preset) {
    case 'modal':
      addSeparator = true;
      linkHoverClassName = 'bg_lighter_hv_4';
      paddingClassName = 'px_md -mx_5';
      break;
    default:
      addSeparator = false;
      linkHoverClassName = 'bg_primary_hv';
      paddingClassName = 'px_xs -mx_xs';
  }

  return <article
    // style={{height: 750}}
    id={`${domIdPrefix ? domIdPrefix + '_' : ''}${id}`}
    className={cn(
      'article_item rel',
      __deleted ? 'op_40' : '',
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
      {labels?.length && (
        <div className='h_item f_shrink mr_3 py_sm'>
          {labels.map((label, i) => (
            <InlineBlockLabel
              key={i}
              as='span'
              outline
              color={isModalPreset ? 'bg' : 'alt'}
              // textColorClassName='cl_primary'
              {...label}
            />
          ))}
        </div>
      )}

      {title && <span className='f_shrink py_sm shift_down'>{title}</span>}

      {description || descriptionPlaceholder ? (
        <span className={cn('ellip py_sm f shift_down', description ? 'cl_md' : 'cl_lt')}>
          {description || descriptionPlaceholder}
        </span>
      ) : <span className='f' />}

      {!RightComponent ? null
      : <div className='h_right gap_xs ml_xs'>
        {RightComponent}
      </div>}
    </div>
  </article>;
});

CondensedArticleItem.displayName = 'CondensedArticleItem';

/**
 * Condensed article item mock
 */

interface CondensedArticleItemMockProps {
  addSeparator?: boolean;
  index?: number;
}

export function CondensedArticleItemMock(p: CondensedArticleItemMockProps) {
  const { addSeparator, index } = p;
  const modulus = index !== undefined ? index % 3 : 0;

  const description = (
    '.... .... .... .... .... .... .... .... .... .... .... .... .... ....' +
    [...Array(3 - modulus)].map(_ => ' ..').join('')
  )

  return <article
    className={cn(
      'article_item rel',
      !addSeparator ? 'bd_lt bd_t_1' : undefined,
    )}
  >
    {addSeparator && (
      <div className='bd_t_1 bd_lt' />
    )}

    <div className='h_item gap_xs'>
      <div className='h_item f_shrink mr_3 py_sm'>
          <InlineBlockLabel
            as='span'
            outline
            color='alt'
            textColorClassName='cl_primary'

            // @ts-ignore - adding class name to color indicator
            colorIndicator='active'
            text={
              <span className='mock active strong mr_2'>
                ....... .......
              </span>
            }
          />
      </div>

      <span className='f_shrink py_sm shift_down'>
        <span className='mock alt'>
          ...... ...... ......
        </span>
      </span>

      <span className='ellip py_sm f shift_down'>
        <span className='mock alt'>
          {description}
        </span>
      </span>
    </div>
  </article>;
}
