import i18n from '@jsb188/app/i18n/index.ts';
import { cn } from '@jsb188/app/utils/string.ts';
import { SmartLink } from '@jsb188/react-web/ui/Button';
import { FilterPillButton } from '@jsb188/react-web/ui/PageFiltersUI';
import { usePopOverState } from '@jsb188/react/states';
import type { POListIfaceItem } from '@jsb188/react/types/PopOver.d';
import React, { memo, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';
import { Icon } from '../svgs/Icon';

/**
 * App layout toolbar title
 */

// * Toolbar title breadcrumb item

export interface BreadcrumbItemObj {
  loading?: boolean;
  to?: string | null;
  text: string;
  iconName?: string | null;
  tryColoredIcon?: boolean;
}

/**
 * Toolbar breadcrumb item
 */

const BreadcrumbItem = memo((p: BreadcrumbItemObj & {
  addBreak: boolean;
  isFirstItem?: boolean;
  isLastItem?: boolean;
}) => {
  const { loading, to, iconName, tryColoredIcon, text, addBreak, isFirstItem, isLastItem } = p;

  return <>
    {addBreak ? null : (
      <span className='mx_xs shift_up cl_darker_2'>
        /
      </span>
    )}
    <SmartLink
      to={isLastItem ? undefined : to!}
      className={cn('h_item gap_9', isFirstItem ? 'ft_medium cl_df' : 'cl_md')}
    >
      {iconName && (
        <span className='shift_up ft_sm ic_df'>
          <Icon
            name={iconName}
            tryColor={tryColoredIcon !== false}
          />
        </span>
      )}

      {loading
      ? text.split(' ').map((str, i) => <span key={i} className='mock alt'>
        {str}
      </span>)
      : text}
    </SmartLink>
  </>;
});

BreadcrumbItem.displayName = 'BreadcrumbItem';

/**
 * App toolbar "right-side" content area
 */

export function ToolbarContent(p: { children: React.ReactNode }) {
  const { children } = p;
  return <nav
    id='app_toolbar_right'
    className='h_right pl_sm pr_20 gap_10'
  >
    {children}
  </nav>;
}

export interface ToolbarItemObj {
  id: string;
  text: string;
  hasValue?: boolean;
  alwaysSelected?: boolean;
  hideClearIcon?: boolean;
  popOverClassName?: string;
  popOverName?: 'PO_LIST' | 'PO_CHECK_LIST';
  options?: POListIfaceItem[];
  initialState?: any;
  disablePopOverButton?: boolean;
  footerButtonText?: string;
  to?: string | null;
  clearTo?: string | null;
  getItemTo?: (value: any) => string | null;
  getSubmitTo?: (value: any) => string | null;
}

/**
 * Render a single shared toolbar filter pill
 */

const ToolbarItem = memo((p: {
  item: ToolbarItemObj;
  open: boolean;
  filterPrefix: string;
  onNavigate: (to?: string | null) => void;
}) => {
  const { item, open, filterPrefix, onNavigate } = p;
  const { id, text, hasValue, alwaysSelected, hideClearIcon, popOverClassName, popOverName, options, initialState, disablePopOverButton, footerButtonText, to, clearTo } = item;

  const onClickLeftIcon = clearTo ? (e: React.MouseEvent) => {
    e.stopPropagation();
    onNavigate(clearTo);
  } : undefined;

  const onClickPill = !options && to ? (_e: React.MouseEvent) => {
    onNavigate(to);
  } : undefined;

  return <FilterPillButton
    id={`${filterPrefix}${id}`}
    open={open}
    hasValue={hasValue}
    alwaysSelected={alwaysSelected}
    hideClearIcon={hideClearIcon}
    text={text}
    popOverClassName={popOverClassName}
    popOverName={popOverName}
    options={options}
    initialState={initialState}
    disablePopOverButton={disablePopOverButton}
    footerButtonText={footerButtonText || i18n.t('form.apply_filters')}
    onClickLeftIcon={onClickLeftIcon || onClickPill}
  />;
});

ToolbarItem.displayName = 'ToolbarItem';

/* Render a shared toolbar filter row that navigates with search-param routes. */
export const ToolbarItems = memo((p: {
  items: ToolbarItemObj[];
  flexClassName?: string;
  className?: string;
  filterPrefix?: string;
}) => {
  const { items, flexClassName, className, filterPrefix = 'toolbar_filter_' } = p;
  const navigate = useNavigate();
  const { popOver, closePopOver } = usePopOverState();
  const itemsRef = useRef(items);
  const filterPrefixRef = useRef(filterPrefix);
  const handledPopOverRef = useRef<typeof popOver | null>(null);

  useEffect(() => {
    itemsRef.current = items;
    filterPrefixRef.current = filterPrefix;
  }, [filterPrefix, items]);

  useEffect(() => {
    if (!popOver) {
      handledPopOverRef.current = null;
      return;
    }

    if (handledPopOverRef.current === popOver) {
      return;
    }

    const toolbarItem = itemsRef.current.find((item) => `${filterPrefixRef.current}${item.id}` === popOver.id);
    if (!toolbarItem) {
      return;
    }

    let nextTo: string | null | undefined;
    if (popOver?.action === 'ITEM') {
      nextTo = toolbarItem.getItemTo?.(popOver.value);
    } else if (popOver?.action === 'SUBMIT') {
      nextTo = toolbarItem.getSubmitTo?.(popOver.value);
    }

    if (!nextTo) {
      return;
    }

    handledPopOverRef.current = popOver;
    closePopOver();
    navigate(nextTo, {
      preventScrollReset: true,
    });
  }, [closePopOver, navigate, popOver]);

  if (!items.length) {
    return null;
  }

  return <div className={cn('gap_8', flexClassName ?? 'h_left', className)}>
    {items.map((item) => {
      const navigateTo = (to?: string | null) => {
        if (!to) {
          return;
        }

        closePopOver();
        navigate(to, {
          preventScrollReset: true,
        });
      };

      return <ToolbarItem
        key={item.id}
        item={item}
        open={popOver?.id === `${filterPrefix}${item.id}`}
        filterPrefix={filterPrefix}
        onNavigate={navigateTo}
      />;
    })}
  </div>;
});

ToolbarItems.displayName = 'ToolbarItems';

/**
 * App toolbar
 */

const AppToolbar = memo((p: {
  breadcrumbs?: BreadcrumbItemObj[] | null;
  options?: ToolbarItemObj[] | null;
  shadowStyle?: string;
}) => {
  // const { shadowStyle = 'shadow_line_alt' } = p;
  const { options, shadowStyle = 'shadow_bg_drop_lg' } = p;
  const breadcrumbs = p.breadcrumbs || [{ text: '.............. ..............', loading: true }];
  const lastIx = breadcrumbs.length - 1;

  return <div className={cn('bg rel z4', shadowStyle)}>
    <div className='h_toolbar h_item no_shrink px_24'>
      {breadcrumbs?.map((item, i) => {
        return <BreadcrumbItem
          key={i}
          {...item}
          addBreak={i <= 0}
          isFirstItem={i === 0}
          isLastItem={lastIx === i}
        />;
      })}
    </div>

    {!options?.length ? null : (
      <ToolbarItems
        // className='h_toolbar h_item h_40__ -mt_2_______ px_20 ft_xs'
        // x-padding should be .px_24 but for visual offset, I'm using .px_22
        className='h_40 px_22 ft_xs'
        filterPrefix='app_toolbar_filter_'
        items={options}
      />
    )}
  </div>;
});

AppToolbar.displayName = 'AppToolbar';

export default AppToolbar;
