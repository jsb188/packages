import i18n from '@jsb188/app/i18n/index.ts';
import { cn } from '@jsb188/app/utils/string.ts';
import { makeUploadsUrl } from '@jsb188/app/utils/url_client.ts';
import type { ModalProps } from '@jsb188/react/states';
import { useOpenModalPopUp } from '@jsb188/react/states';
import { memo } from 'react';
import { Icon } from '../svgs/Icon';
import { SmartLink } from '../ui/Button';
import Markdown from '@jsb188/react-web/ui/Markdown';

/**
 * Switch case interface for <AsideNav />
 */

interface AsideListBlockObj {
  __type: 'ASIDE_LIST';
  title: string;
  nullText?: string;
  items: {
    label?: string;
    text: string;
    rightIconName?: string;
    rightIconClassName?: string;
    rightIconClassNameSelected?: string;
    to?: string;
    anchor?: string;
  }[] | null;
}

interface AsideGalleryBlockObj {
  __type: 'ASIDE_GALLERY';
  title: string;
  items: {
    uri: string;
    name: string;
    modalVariables?: ModalProps | null;
  }[] | null;
}

export type AsideBlock = AsideListBlockObj | AsideGalleryBlockObj;

/**
 * Aside component; basic list
 */

export const AsideListBlock = memo((p: AsideListBlockObj & {
  pathname?: string;
}) => {
  const { pathname, title, nullText, items } = p;

  return <nav className='pb_10 mx_10 landscape:-mx_10 my_25 ft_sm bd_1 bd_lt bg r_sm of'>
    {/* <div className='h_40' /> */}
    {/* <div className='pattern_texture texture_bf rel my_df h_4' /> */}
    {/* <div className='bd_t_2 bd_lt my_df h_6' /> */}

    {(title || title === undefined) &&
    <div className='bd_b_1 bd_lt bg_fade cl_md h_item h_50 px_df mb_12'>
      <span className='shift_down'>
        {title ?? i18n.t('form.table_of_contents')}
      </span>
    </div>}

    {items?.map((navItem, i) => {
      const { label, text, to, anchor, rightIconName, rightIconClassName, rightIconClassNameSelected } = navItem;
      const hasLabel = !!label || label === '';
      const textClassName = cn(!text ? 'cl_lt' : hasLabel ? 'cl_df' : '');
      const selected = !!(pathname && pathname === to);
      const lineText = text || nullText;
      const hasMarkdown = /\[(.*?)##(.*?)\]|\*]/.test(lineText || '');

      return <SmartLink
        key={i}
        // className={cn('bl mb_df h_left', selected ? 'cl_df' : 'cl_lt')}
        className={cn('bl px_df py_4 h_left', selected ? 'cl_df' : 'cl_bd')}
        to={to}
        // onClick={onClickItem ? () => onClickItem(navItem) : undefined}
        buttonElement='div'
        role='button'
      >
        {rightIconName
        ? <div className='h_spread f pr_20'>
          {hasLabel &&
          <span className='bl'>
            {label}:
          </span>}
          {hasMarkdown
          ? <Markdown
            as='span'
            preset='label'
            className={textClassName}
          >
            {lineText}
          </Markdown>
          : <span className={textClassName}>
            {lineText}
          </span>}

          <span className={cn('-mr_2 abs_r_center', selected ? rightIconClassNameSelected : rightIconClassName)}>
            <Icon name={rightIconName} />
          </span>
        </div>
        : <div className='h_spread f'>
          {hasLabel &&
          <span className='bl'>
            {label}:
          </span>}
          {hasMarkdown
          ? <Markdown
            as='span'
            preset='label'
            className={textClassName}
          >
            {lineText}
          </Markdown>
          : <span className={textClassName}>
            {lineText}
          </span>}
        </div>}
      </SmartLink>;
    })}
  </nav>;
});

AsideListBlock.displayName = 'AsideListBlock';

/**
 * Aside component; gallery list
 */

export const AsideGalleryBlock = memo((p: AsideGalleryBlockObj & {
  pathname?: string;
}) => {
  const { title, items } = p;
  const openModalPopUp = useOpenModalPopUp();
  const MAX_ASIDE_GALLERY_ITEMS = 16;

  let visibleItems, overflowCount;
  if (!items?.length) {
    visibleItems = items;
    overflowCount = 0;
  } else {
    visibleItems = items.slice(0, MAX_ASIDE_GALLERY_ITEMS);
    overflowCount = Math.max(0, items.length - MAX_ASIDE_GALLERY_ITEMS);
  }

  return <nav className='mx_10 landscape:-mx_10 my_25 ft_sm bd_1 bd_lt bg r_sm of'>

    {(title || title === undefined) &&
    <div className='bd_b_1 bd_lt bg_fade cl_md h_item h_50 px_df'>
      <span className='shift_down'>
        {title ?? i18n.t('form.table_of_contents')}
      </span>
    </div>}

    <div className='grid size_4 gap_5 p_5'>
      {visibleItems?.map((item, i) => {
        const imageUrl = makeUploadsUrl(item.uri, 'tiny');
        const showOverflowCount = !!overflowCount && i === visibleItems.length - 1;

        return <SmartLink
          key={i}
          className={cn('bl', item.modalVariables ? 'pointer' : '')}
          buttonElement='span'
          onClick={item.modalVariables ? () => openModalPopUp(item.modalVariables!) : undefined}
        >
          <figure className='th_item r_sm bg_alt rel of'>
            {!imageUrl || showOverflowCount ? null : <img
              alt={item.name || 'gallery image'}
              className='abs_full r_sm img_auto'
              src={imageUrl}
            />}
            {!showOverflowCount ? null : <>
              {!imageUrl ? null : <img
                alt={item.name || 'gallery image'}
                className='abs_full r_sm img_auto op_40'
                src={imageUrl}
              />}
              <span className='abs_full v_center ft_semibold cl_df'>
                <span className='r bg v_center w_35 h_35'>
                  +{overflowCount}
                </span>
              </span>
            </>}
          </figure>
        </SmartLink>;
      })}
    </div>
  </nav>;
});

AsideGalleryBlock.displayName = 'AsideGalleryBlock';

/**
 * Aside block renderer
 */

export function AsideBlocks(p: {
  pathname?: string;
  blocks: AsideBlock[] | null;
}) {
  const { blocks, ...rest } = p;
  if (!blocks) {
    return <AsideNavMock />;
  }

  return blocks.map((block: any, i: number) => {
    switch (block.__type) {
      case 'ASIDE_GALLERY':
        return <AsideGalleryBlock
          key={`block_${i}`}
          {...rest}
          {...block}
        />;
      case 'ASIDE_LIST':
      default:
    }

    return <AsideListBlock
      key={`block_${i}`}
      {...rest}
      {...block}
    />;
  });
}

/**
 * Mock component; for aside scroll indicator
 */

export function AsideNavMock() {
  return <nav className='pb_10 mx_10 landscape:-mx_10 my_25 ft_sm bd_1 bd_lt bg r_sm'>
    {/* <div className='h_40' /> */}
    {/* <div className='pattern_texture texture_bf rel my_df h_4' /> */}
    {/* <div className='bd_t_2 bd_lt my_df h_6' /> */}

    <p className='ft_semibold cl_md px_df pt_df pb_xs'>
      <span className='mock active'>
        .... .... .... .... ... ...
      </span>
    </p>
    {[...Array(6)].map((_, i) => {
      return <span
        // @ts-ignore -- this is just a mock component, so we don't care about the missing "to" prop
        key={i}
        className={cn('bl px_df py_xs h_left cl_lt')}
      >
        <span className='mock alt h_20 -mt_3'>
          {i % 2 ? '.... .... .... ....' : '.... .... .... .... .... .... ....'}
        </span>
      </span>;
    })}
  </nav>;
}
