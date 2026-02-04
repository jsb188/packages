import { cn } from '@jsb188/app/utils/string.ts';
import { memo } from 'react';
import type { LabelsAndIconsItemProps } from '../modules/ListFeatures';
import { LabelsAndIcons } from '../modules/ListFeatures';
import { AvatarImg } from './Avatar';
import type { InlineBlockLabelProps } from './Button';
import { InlineBlockLabel } from './Button';
import { Icon } from '@jsb188/react-web/svgs/Icon';
import i18n from '@jsb188/app/i18n/index.ts';

/**
 * Constants
 */

const NO_SEPARATOR_Y_PADDING = 'py_10';

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
    <h4 className='ft_normal ft_xs p_n m_n cl_darker_2'>
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
  voided?: boolean;
  domIdPrefix?: string;
  id?: string;
  preset?: 'modal' | 'card' | 'default' | 'default_spaced';
  rightComponentClassName?: string;
  onClick?: ((itemId?: string) => void) | null;
  disabled?: boolean;
  hideSeparator?: boolean;
  addDivSeparator?: boolean;
  RightComponent?: React.ReactNode;
  title?: string;
  description?: string | null;
  descriptionPlaceholder?: string;
  labelsClassName?: string;
  rightIconsClassName?: string;
  labels?: Partial<InlineBlockLabelProps>[]
  avatarDisplayName?: string | null;
  avatarPhotoUri?: string | null;
  avatarColor?: string | null;
  rightIcons?: LabelsAndIconsItemProps[];
}) => {
  const { __deleted, voided, hideSeparator, preset, domIdPrefix, id, onClick, rightIcons, RightComponent, labelsClassName, rightIconsClassName, avatarDisplayName, avatarPhotoUri, avatarColor, title, description, descriptionPlaceholder, labels, rightComponentClassName } = p;
  const disabled = p.disabled || __deleted;
  const hasLink = !!onClick && !disabled;
  const useAltLabelColors = !['modal','card'].includes(preset!);
  const hasDescription = !!(description || descriptionPlaceholder);
  const hasDescriptionOrRightIcons = hasDescription || (rightIcons && rightIcons?.length > 0);

  // paddingClassName='px_df -mx_5'

  let linkHoverClassName, xPaddingClassName, yPaddingClassName, addDivSeparator;
  switch (preset) {
    case 'modal':
      addDivSeparator = true;
      linkHoverClassName = 'bg_lighter_hv_4';
      xPaddingClassName = 'px_md -mx_5';
      yPaddingClassName = hideSeparator ? NO_SEPARATOR_Y_PADDING : 'py_sm';
      break;
    case 'card':
      addDivSeparator = false;
      linkHoverClassName = 'bg_lighter_hv_4';
      xPaddingClassName = 'px_sm -mx_sm';
      yPaddingClassName = 'py_xs';
      break;
    case 'default_spaced':
      addDivSeparator = false;
      linkHoverClassName = 'bg_primary_fd_hv';
      xPaddingClassName = 'px_20 -mx_20';
      yPaddingClassName = hideSeparator ? NO_SEPARATOR_Y_PADDING : 'py_sm';
      break;
    default:
      addDivSeparator = false;
      linkHoverClassName = 'bg_primary_fd_hv';
      xPaddingClassName = 'px_xs -mx_xs';
      yPaddingClassName = hideSeparator ? NO_SEPARATOR_Y_PADDING : 'py_sm';
      break;
  }

  if (typeof p.addDivSeparator === 'boolean') {
    addDivSeparator = p.addDivSeparator;
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

    <div className={cn('h_item gap_xs', __deleted ? '__deleted' : '')}>

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
        <div className={cn('h_item f_shrink mr_3', yPaddingClassName, labelsClassName)}>
          {labels.map((label, i) => (
            <InlineBlockLabel
              key={i}
              as='span'
              outline
              color={useAltLabelColors ? 'alt' : 'bg'}
              // className='red_light_bf'
              // textColorClassName='cl_primary'
              {...label}
            />
          ))}
        </div>
      )}

      {title && !hasDescriptionOrRightIcons && <span className={cn('f f_shrink shift_down', yPaddingClassName)}>
        <span className='ellip'>
          {title}
        </span>
      </span>}

      {hasDescriptionOrRightIcons
      ? (
        <span
          className={cn(
            'f',
            yPaddingClassName,
            rightIcons && 'h_item',
            description ? 'cl_lt' : 'cl_darker_2'
          )}
        >
          {hasDescription ? (
            <span className='shift_down ib ellip'>
              {title && (
                <span className={cn('mr_xs cl_df', voided ? 'strikethrough' : undefined)}>
                  {title}
                </span>
              )}

              {/* Need a double strikethrough here because of CSS color mismatch */}
              <span className={__deleted || voided ? 'strikethrough' : undefined}>
                {description || descriptionPlaceholder}
              </span>
            </span>
          ) : title ? (
            <span className='shift_down ib ellip cl_df'>
              {title}
            </span>
          ) : null}

          {rightIcons && (
            <span className={cn('h_item gap_2 cl_lt', rightIconsClassName, hasDescription ? 'ml_10' : 'ml_5')}>
              <LabelsAndIcons
                items={rightIcons}
              />
            </span>
          )}
        </span>
      )
      : !title
      ? <span className='f' />
      : null}

      {!RightComponent ? null
      : <div className={cn('h_right gap_xs ml_xs f_shrink', rightComponentClassName)}>
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
  addColorIndicator?: boolean;
  separatorStyle?: 'none' | 'element' | 'border'; // defaults to "none"
  index?: number;
}) {
  const { index, separatorStyle } = p;
  const separatorHidden = !separatorStyle || separatorStyle === 'none';
  const addColorIndicator = p.addColorIndicator !== false;
  const modulus = index !== undefined ? index % 3 : 0;

  const description = (
    '.... .... .... .... .... .... .... .... .... .... .... .... .... ....' +
    [...Array(3 - modulus)].map(_ => ' ..').join('')
  );

  return <article
    className={cn(
      'article_item rel',
      separatorStyle === 'border' ? 'bd_lt bd_t_1' : undefined,
    )}
  >
    {separatorStyle === 'element' && (
      <div className='bd_t_1 bd_lt' />
    )}

    <div className='h_item gap_xs'>
      <div className={cn('h_item f_shrink mr_3', separatorHidden ? NO_SEPARATOR_Y_PADDING : 'py_sm')}>
        <InlineBlockLabel
          as='span'
          outline
          color='alt'
          colorIndicator={addColorIndicator ? 'active' : undefined}
          text={
            <span className={cn('mock active', addColorIndicator ? 'mr_2' : 'mx_2')}>
              ....... .......
            </span>
          }
        />
      </div>

      <span className={cn('f_shrink shift_down', separatorHidden ? NO_SEPARATOR_Y_PADDING : 'py_sm')}>
        <span className='mock alt'>
          ...... ...... ......
        </span>
      </span>

      <span className={cn('ellip f shift_down', separatorHidden ? NO_SEPARATOR_Y_PADDING : 'py_sm')}>
        <span className='mock alt'>
          {description}
        </span>
      </span>
    </div>
  </article>;
}

/**
 * Condensed article block for full width clickable area with padding + separator
 */

export const CondensedArticleBlock = memo((p: {
  __deleted?: boolean;
  id?: string;
  hideSeparator?: boolean;
  domIdPrefix?: string;
  paddingSize: 'sm' | 'df' | 'md';
  className?: string;
  contentClassName?: string;
  onClick?: ((itemId?: string) => void) | null;
  disabled?: boolean;
  children?: React.ReactNode;
}) => {
  const { __deleted, hideSeparator, className, contentClassName, paddingSize, domIdPrefix, id, onClick, children } = p;
  const disabled = p.disabled || __deleted;
  const hasLink = !!onClick && !disabled;

  return <article
    id={id ? `${domIdPrefix ? domIdPrefix + '_' : ''}${id}` : undefined}
    className={cn(
      'article_item rel z2',
      `px_${paddingSize}`,
      hasLink ? 'link bg_lighter_hv_4' : undefined,
      className
    )}
    role={hasLink ? 'button' : undefined}
    onClick={hasLink ? () => onClick(id) : undefined}
  >
    {!hideSeparator && (
      <div className='bd_t_1 bd_lt' />
    )}

    <div className={cn(contentClassName ?? 'py_df h_left gap_sm', __deleted ? 'op_40' : '')}>
      {children}
    </div>
  </article>;
});

CondensedArticleBlock.displayName = 'CondensedArticleBlock';

/**
 * Article card container
 */

export function ArticleCard(p: {
  className?: string;
  title?: string;
  TitleComponent?: React.ReactNode;
  titleStyle?: React.CSSProperties;
  titleClassName?: string;
  contentClassName?: string;
  designClassName?: string;
  children?: React.ReactNode;
}) {
  const { title, TitleComponent, children, designClassName, className, titleClassName, titleStyle, contentClassName } = p;

  return <div className={cn('r_sm', designClassName ?? 'bg_alt', className)}>
    {(title || TitleComponent) && (
      <div className={cn('py_9 px_sm rt_sm', titleClassName ?? 'bg_active')} style={titleStyle}>
        {TitleComponent || title}
      </div>
    )}
    <div className={contentClassName ?? 'pt_4 pb_sm px_sm'}>
      {children}
    </div>
  </div>;
}

/**
 * Article pagination block
 */

export const ArticlePagination = memo((p: {
  notReady?: boolean;
  className?: string;
  text: string;
  pageNumber: number;
  pageTotal: number;
  onChangePageNumber: (pageNumber: number) => void;
}) => {
  const { notReady, className, text, pageNumber, pageTotal, onChangePageNumber } = p;
  const prevDisabled = pageNumber <= 1;
  const nextDisabled = pageNumber >= pageTotal;

  return <nav className={cn('p_sm h_spread gap_10 rel of pattern_texture texture_bf -mx_xs', className)}>
    {notReady
    ? <span className='rel mock'>
      ....................................
    </span>
    : <span className='rel'>
      {text}
    </span>}

    <div className='h_right gap_sm'>
      {notReady
      ? <>
        <span className='rel mock'>
          ......................
        </span>
        <span className='av av_xs bg rel r' />
      </>
      : <>
        {!prevDisabled &&
        <button
          className='av av_xs bg rel r bd_1 bd_lt v_center'
          disabled={pageNumber <= 1}
          onClick={() => onChangePageNumber(pageNumber - 1)}
        >
          <Icon name='arrow-left' />
        </button>}
        <span className='rel'>
          {i18n.t('form.page_of', { number: pageNumber, total: pageTotal })}
        </span>
        {nextDisabled
        ? <span />
        : <button
          className='av av_xs bg rel r bd_1 bd_lt v_center'
          disabled={pageNumber >= pageTotal}
          onClick={() => onChangePageNumber(pageNumber + 1)}
        >
          <Icon name='arrow-right' />
        </button>}
      </>}
    </div>
  </nav>;
});

ArticlePagination.displayName = 'ArticlePagination';
