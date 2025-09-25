import { cn } from '@jsb188/app/utils/string';
import { memo } from 'react';
import type { LabelsAndIconsItemProps } from '../modules/ListFeatures';
import { LabelsAndIcons } from '../modules/ListFeatures';
import { AvatarImg } from './Avatar';
import type { InlineBlockLabelProps } from './Button';
import { InlineBlockLabel } from './Button';

/**
 * Condensed group title
 */

export const CondensedGroupTitle = memo((p: {
  domId?: string;
  text: string;
  className?: string;
  marginClassName?: string;
}) => {
  const { text, domId, className, marginClassName } = p;

  return <div className={cn(marginClassName ?? 'mt_md mb_sm', className)} id={domId}>
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

export const CondensedArticleItem = memo((p: {
  __deleted?: boolean;
  domIdPrefix?: string;
  id?: string;
  preset?: 'modal' | 'card' | 'default';
  rightComponentClassName?: string;
  onClick?: (itemId?: string) => void;
  disabled?: boolean;
  hideSeparator?: boolean;
  RightComponent?: React.ReactNode;
  title?: string;
  description?: string | null;
  descriptionPlaceholder?: string;
  labels?: Partial<InlineBlockLabelProps>[]
  avatarDisplayName?: string | null;
  avatarPhotoUri?: string | null;
  avatarColor?: string | null;
  labelIcons?: LabelsAndIconsItemProps[];
}) => {
  const { __deleted, hideSeparator, preset, domIdPrefix, id, onClick, labelIcons, RightComponent, avatarDisplayName, avatarPhotoUri, avatarColor, title, description, descriptionPlaceholder, labels, rightComponentClassName } = p;
  const disabled = p.disabled || __deleted;
  const hasLink = !!onClick && !disabled;
  const useAltLabelColors = !['modal','card'].includes(preset!);
  const hasDescription = !!(description || descriptionPlaceholder);

  // paddingClassName='px_df -mx_5'

  let linkHoverClassName, xPaddingClassName, yPaddingClassName, addDivSeparator;
  switch (preset) {
    case 'modal':
      addDivSeparator = true;
      linkHoverClassName = 'bg_lighter_hv_4';
      xPaddingClassName = 'px_md -mx_5';
      yPaddingClassName = 'py_sm';
      break;
    case 'card':
      addDivSeparator = false;
      linkHoverClassName = 'bg_lighter_hv_4';
      xPaddingClassName = 'px_xs -mx_xs';
      yPaddingClassName = 'py_xs';
      break;
    default:
      addDivSeparator = false;
      linkHoverClassName = 'bg_primary_hv';
      xPaddingClassName = 'px_xs -mx_xs';
      yPaddingClassName = 'py_sm';
      break;
  }

  return <article
    // style={{height: 750}}
    id={id ? `${domIdPrefix ? domIdPrefix + '_' : ''}${id}` : undefined}
    className={cn(
      'article_item rel',
      !addDivSeparator && !hideSeparator ? 'bd_lt bd_t_1' : undefined,
      xPaddingClassName,
      hasLink ? 'link ' + linkHoverClassName : undefined
    )}
    role={hasLink ? 'button' : undefined}
    onClick={hasLink ? () => onClick(id) : undefined}
  >
    {addDivSeparator && !hideSeparator && (
      <div className='bd_t_1 bd_lt' />
    )}

    <div className={cn('h_item gap_xs', __deleted ? 'op_40' : '')}>

      {(avatarDisplayName || avatarPhotoUri) &&
        <AvatarImg
          className='mr_xs'
          square
          size='tiny'
          urlPath={avatarPhotoUri}
          displayName={avatarDisplayName}
          letterBackgroundClassName={avatarColor ? `bg_${avatarColor}` : undefined}
        />
      }

      {labels?.length && (
        <div className={'h_item f_shrink mr_3 ' + yPaddingClassName}>
          {labels.map((label, i) => (
            <InlineBlockLabel
              key={i}
              as='span'
              outline
              color={useAltLabelColors ? 'alt' : 'bg'}
              // textColorClassName='cl_primary'
              {...label}
            />
          ))}
        </div>
      )}

      {title && <span className={'f_shrink shift_down ' + yPaddingClassName}>{title}</span>}

      {(hasDescription || labelIcons)
      ? (
        <span
          className={cn(
            'ellip f',
            yPaddingClassName,
            labelIcons && 'h_item',
            description ? 'cl_darker_4' : 'cl_darker_2'
          )}
        >
          {hasDescription && (
            <span className='shift_down'>
              {description || descriptionPlaceholder}
            </span>
          )}

          {labelIcons && (
            <span className={cn('h_item gap_2', hasDescription ? 'ml_10' : 'ml_5')}>
              <LabelsAndIcons
                items={labelIcons}
              />
            </span>
          )}
        </span>
      )
      : <span className='f' />}

      {!RightComponent ? null
      : <div className={cn('h_right gap_xs ml_xs', rightComponentClassName)}>
        {RightComponent}
      </div>}
    </div>
  </article>;
});

CondensedArticleItem.displayName = 'CondensedArticleItem';

/**
 * Condensed article item mock
 */

export function CondensedArticleItemMock(p: {
  addSeparator?: boolean;
  index?: number;
}) {
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

/**
 * Artile card container
 */

export function ArticleCard(p: {
  className?: string;
  title?: string;
  children?: React.ReactNode;
}) {
  const { title, children, className } = p;

  return <div className={cn('bg_alt r_df', className)}>
    {title && (
      <div className='py_xs px_xs rt_df bg_active'>
        {title}
      </div>
    )}
    <div className='p_xs'>
      {children}
    </div>
  </div>;
}
