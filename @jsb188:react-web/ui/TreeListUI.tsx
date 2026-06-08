import i18n from '@jsb188/app/i18n/index.ts';
import { cn } from '@jsb188/app/utils/string.ts';
import { memo, type HTMLAttributes, type MouseEvent, type ReactNode } from 'react';
import { Icon } from '../svgs/Icon';

const TREE_LIST_INDENT_WIDTH = 24;
const TREE_LIST_GUIDE_OFFSET = 10;

/**
 * Types
 */

export type TreeListLineageState = {
  isLast: boolean;
};

export type TreeListRowUIProps = Omit<HTMLAttributes<HTMLDivElement>, 'children' | 'onClick' | 'onToggle'> & {
  className?: string;
  depth: number;
  disabled?: boolean;
  disableExpandCollapse?: boolean;
  expanded?: boolean;
  expandable?: boolean;
  hasItems?: boolean;
  iconClassName?: string;
  iconName?: string;
  label: ReactNode;
  labelClassName?: string;
  lineage: TreeListLineageState[];
  selected?: boolean;
  onClick?: (e: MouseEvent<HTMLDivElement>) => void;
  onToggle?: (e: MouseEvent<HTMLElement>) => void;
};

/*
 * Return the default folder icon for an expandable tree row.
 */
export function getTreeListFolderIconName(p: {
  expanded?: boolean;
  hasItems?: boolean;
}) {
  const { expanded, hasItems } = p;
  return !expanded ? 'folder' : hasItems ? 'folder-open' : 'folder-dash';
}

/*
 * Return the right-side chevron icon for an expandable tree row.
 */
export function getTreeListChevronIconName(p: {
  expanded?: boolean;
}) {
  return p.expanded ? 'chevron-down' : 'chevron-right';
}

/*
 * Return the visible icon for one tree row.
 */
export function getTreeListDisplayIconName(p: {
  expandable?: boolean;
  expanded?: boolean;
  hasItems?: boolean;
  iconName?: string;
}) {
  const { expandable, expanded, hasItems, iconName } = p;
  return iconName || (expandable ? getTreeListFolderIconName({ expanded, hasItems }) : undefined);
}

/*
 * Return the translated accessibility label for a tree toggle button.
 */
function getTreeListToggleAriaLabel(p: {
  expanded?: boolean;
}) {
  return i18n.t(p.expanded ? 'form.collapse_tree_item' : 'form.expand_tree_item');
}

/*
 * Render the root tree container around all tree rows.
 */
export const TreeListRootUI = memo((p: HTMLAttributes<HTMLDivElement>) => {
  const { children, className, ...rest } = p;

  return <div
    role='tree'
    className={cn('v_item w_f ft_sm cl_df', className)}
    {...rest}
  >
    {children}
  </div>;
});

TreeListRootUI.displayName = 'TreeListRootUI';

/*
 * Render a child group for nested tree rows.
 */
export const TreeListGroupUI = memo((p: HTMLAttributes<HTMLDivElement>) => {
  const { children, className, ...rest } = p;

  return <div
    role='group'
    className={cn('v_item w_f', className)}
    {...rest}
  >
    {children}
  </div>;
});

TreeListGroupUI.displayName = 'TreeListGroupUI';

/*
 * Render vertical guide lines for nested rows without branch turns.
 */
export const TreeListIndentGuideUI = memo((p: {
  lineage: TreeListLineageState[];
}) => {
  const { lineage } = p;

  if (!lineage.length) {
    return null;
  }

  return <>
    {lineage.map((lineageItem, i) => {
      const isCurrentDepth = i === lineage.length - 1;

      if (!isCurrentDepth && lineageItem.isLast) {
        return null;
      }

      return <span
        key={i}
        aria-hidden='true'
        className='abs bd_l_2 bd_active'
        style={{
          bottom: isCurrentDepth && lineageItem.isLast ? '50%' : 0,
          left: (i * TREE_LIST_INDENT_WIDTH) + TREE_LIST_GUIDE_OFFSET,
          top: 0,
        }}
      />;
    })}
  </>;
});

TreeListIndentGuideUI.displayName = 'TreeListIndentGuideUI';

/*
 * Render the horizontal leaf branch guide in the same slot used by expandable controls.
 */
export const TreeListLeafControlGuideUI = memo(() => (
  <span
    aria-hidden='true'
    className='rel w_20 f_stretch no_shrink'
  >
    <span
      className='abs bd_t_2 bd_active'
      style={{
        left: TREE_LIST_GUIDE_OFFSET,
        top: '50%',
        width: 10,
      }}
    />
  </span>
));

TreeListLeafControlGuideUI.displayName = 'TreeListLeafControlGuideUI';

/*
 * Render a single tree row with optional toggle, icon, selection state, and label.
 */
export const TreeListRowUI = memo((p: TreeListRowUIProps) => {
  const {
    className,
    depth,
    disabled,
    disableExpandCollapse,
    expanded,
    expandable,
    hasItems,
    iconClassName,
    iconName,
    label,
    labelClassName,
    lineage,
    selected,
    onClick,
    onToggle,
    ...rest
  } = p;
  const canToggle = !!expandable && !disableExpandCollapse && !disabled;
  const displayIconName = getTreeListDisplayIconName({ expandable, expanded, hasItems, iconName });
  const iconSizeClassName = 'w_26';
  const iconToneClassName = selected ? 'cl_primary' : 'cl_md';
  const hasLeafControlGuide = !expandable && !!lineage.length;
  const canActivateRow = !disabled && (onClick || canToggle);

  /*
   * Keep toggle clicks from also selecting or opening the row.
   */

  const onClickToggle = (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();

    if (canToggle) {
      onToggle?.(e);
    }
  };

  return <div
    role='treeitem'
    aria-disabled={disabled || undefined}
    aria-expanded={expandable ? !!expanded : undefined}
    aria-level={depth + 1}
    aria-selected={selected || undefined}
    tabIndex={disabled ? -1 : 0}
    className={cn(
      'rel w_f min_w_0 h_28 h_item lh_1 a_l',
      disabled ? 'disabled' : '',
      className,
    )}
    {...rest}
  >
    <TreeListIndentGuideUI lineage={lineage} />

    {hasLeafControlGuide && (
      <TreeListLeafControlGuideUI />
    )}

    <div
      role='button'
      onClick={disabled ? undefined : onClick}
      className={cn(
        'h_item f min_w_0 py_3 pl_4 pr_6 r_sm h_28',
        selected ? 'bg_alt' : 'bg_alt_hv',
        canActivateRow ? 'link' : '',
      )}
    >
      {expandable ? (
        <button
          type='button'
          aria-label={getTreeListToggleAriaLabel({ expanded })}
          aria-expanded={!!expanded}
          disabled={disableExpandCollapse || disabled}
          className={cn(
            'h_center pb_3 no_shrink',
            iconSizeClassName,
            iconToneClassName,
            // canToggle ? 'link' : 'disabled',
            iconClassName,
          )}
          onClick={onClickToggle}
        >
          {displayIconName && <Icon name={displayIconName} tryColor />}
        </button>
      ) : !hasLeafControlGuide ? (
        <span
          aria-hidden='true'
          className={cn(iconSizeClassName, 'no_shrink')}
          style={{ display: 'inline-block' }}
        />
      ) : null}

      {displayIconName && !expandable && (
        <span className={cn('h_center no_shrink', iconToneClassName, iconSizeClassName, canActivateRow ? 'link' : '', iconClassName)}>
          <Icon name={displayIconName} tryColor />
        </span>
      )}

      <span
        className={cn(
          'ellip shift_down min_w_0 f',
          displayIconName ? 'ml_6' : '',
          labelClassName
        )}
      >
        {label}
      </span>

      {expandable && (
        <span
          aria-hidden='true'
          className={cn('h_center no_shrink ic_sm ml_6', iconToneClassName)}
        >
          <Icon name={getTreeListChevronIconName({ expanded })} />
        </span>
      )}
    </div>
  </div>;
});

TreeListRowUI.displayName = 'TreeListRowUI';
