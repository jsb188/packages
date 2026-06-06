import { cn } from '@jsb188/app/utils/string.ts';
import { memo, type HTMLAttributes, type MouseEvent, type ReactNode } from 'react';
import { COMMON_ICON_NAMES, Icon } from '../svgs/Icon';

const TREE_LIST_INDENT_WIDTH = 24;
const TREE_LIST_GUIDE_OFFSET = 10;
const TREE_LIST_LEAF_INDENT_REDUCTION = 12;

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
  onToggle?: (e: MouseEvent<HTMLButtonElement>) => void;
};

/*
 * Return the default folder icon for an expandable tree row.
 */
export function getTreeListFolderIconName(p: {
  expanded?: boolean;
  hasItems?: boolean;
}) {
  const { expanded, hasItems } = p;

  if (!expanded) {
    return 'folder';
  }

  return hasItems ? 'folder-open' : 'folder-empty';
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
 * Render the vertical and horizontal branch guide lines for one row.
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
      const left = (i * TREE_LIST_INDENT_WIDTH) + TREE_LIST_GUIDE_OFFSET;

      if (!isCurrentDepth && lineageItem.isLast) {
        return null;
      }

      return <span key={i}>
        <span
          aria-hidden='true'
          className='abs bd_l_1 bd_lt'
          style={{
            bottom: isCurrentDepth && lineageItem.isLast ? '50%' : 0,
            left,
            top: 0,
          }}
        />

        {isCurrentDepth && (
          <span
            aria-hidden='true'
            className='abs bd_t_1 bd_lt'
            style={{
              left,
              top: '50%',
              width: TREE_LIST_INDENT_WIDTH,
            }}
          />
        )}
      </span>;
    })}
  </>;
});

TreeListIndentGuideUI.displayName = 'TreeListIndentGuideUI';

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
  const displayIconName = iconName || (expandable ? getTreeListFolderIconName({ expanded, hasItems }) : undefined);
  const paddingLeft = Math.max(
    0,
    (depth * TREE_LIST_INDENT_WIDTH) - (expandable ? 0 : TREE_LIST_LEAF_INDENT_REDUCTION),
  );

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
    onClick={disabled ? undefined : onClick}
    className={cn(
      'rel w_f min_w_0 min_h_30 h_item r_xs lh_1',
      selected ? 'bg_primary_fd cl_primary' : 'bg_primary_fd_hv',
      !disabled && (onClick || canToggle) ? 'link' : '',
      disabled ? 'disabled' : '',
      className,
    )}
    {...rest}
  >
    <TreeListIndentGuideUI lineage={lineage} />

    <div
      className='h_item min_w_0 py_3 pr_8'
      style={{ paddingLeft }}
    >
      {expandable ? (
        <button
          type='button'
          aria-label={expanded ? 'Collapse tree item' : 'Expand tree item'}
          aria-expanded={!!expanded}
          disabled={disableExpandCollapse || disabled}
          className={cn(
            'h_center w_20 h_20 p_n no_shrink ic_xs cl_md',
            canToggle ? 'link' : 'disabled',
          )}
          onClick={onClickToggle}
        >
          <Icon name={expanded ? COMMON_ICON_NAMES.expanded_chevron : COMMON_ICON_NAMES.link_chevron} />
        </button>
      ) : (
        <span
          aria-hidden='true'
          className='w_20 h_20 no_shrink'
          style={{ display: 'inline-block' }}
        />
      )}

      {displayIconName && (
        <span className={cn('w_24 h_center no_shrink ic_sm', selected ? 'cl_primary' : 'cl_md', iconClassName)}>
          <Icon name={displayIconName} />
        </span>
      )}

      <span className={cn('ellip shift_down min_w_0', displayIconName ? 'ml_4' : '', selected ? 'ft_semibold' : '', labelClassName)}>
        {label}
      </span>
    </div>
  </div>;
});

TreeListRowUI.displayName = 'TreeListRowUI';
