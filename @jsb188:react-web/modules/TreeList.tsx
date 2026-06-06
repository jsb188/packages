import { cn } from '@jsb188/app/utils/string.ts';
import { memo, useMemo, useState, type Dispatch, type MouseEvent, type ReactNode, type SetStateAction } from 'react';
import {
  TreeListGroupUI,
  TreeListRootUI,
  TreeListRowUI,
  type TreeListLineageState,
} from '@jsb188/react-web/ui/TreeListUI';

/**
 * Types
 */

export type TreeListItem = {
  className?: string;
  disabled?: boolean;
  iconClassName?: string;
  iconName?: string;
  id: string;
  items?: TreeListItem[];
  label: ReactNode;
  labelClassName?: string;
  selected?: boolean;
};

export type TreeListProps = {
  className?: string;
  defaultExpandedItemIds?: string[];
  disableExpandCollapse?: boolean;
  expandedItemIds?: string[];
  items: TreeListItem[];
  selectedItemId?: string;
  onClickItem?: (item: TreeListItem, e: MouseEvent<HTMLDivElement>) => void;
  onToggleItem?: (item: TreeListItem, expanded: boolean, e: MouseEvent<HTMLButtonElement>) => void;
};

export type TreeListNodeProps = {
  controlledExpansion: boolean;
  depth: number;
  disableExpandCollapse?: boolean;
  expandedItemIdSet: Set<string>;
  item: TreeListItem;
  lineage: TreeListLineageState[];
  selectedItemId?: string;
  setLocalExpandedItemIds: Dispatch<SetStateAction<string[]>>;
  isLast: boolean;
  onClickItem?: TreeListProps['onClickItem'];
  onToggleItem?: TreeListProps['onToggleItem'];
};

/*
 * Return item ids with duplicates removed while preserving caller order.
 */
function getUniqueTreeListItemIds(itemIds?: string[]) {
  return itemIds ? [...new Set(itemIds)] : [];
}

/*
 * Return a Set for quick expanded-item lookups during recursive rendering.
 */
function getTreeListExpandedItemIdSet(itemIds?: string[]) {
  return new Set(getUniqueTreeListItemIds(itemIds));
}

/*
 * Return the next expanded id list after toggling one item.
 */
function getNextTreeListExpandedItemIds(itemIds: string[], itemId: string, expanded: boolean) {
  const nextItemIdSet = getTreeListExpandedItemIdSet(itemIds);

  if (expanded) {
    nextItemIdSet.add(itemId);
  } else {
    nextItemIdSet.delete(itemId);
  }

  return [...nextItemIdSet];
}

/*
 * Return whether a tree item has an explicit child list and can be expanded.
 */
function isTreeListItemExpandable(item: TreeListItem) {
  return Array.isArray(item.items);
}

/*
 * Return whether a tree item should render as selected.
 */
function isTreeListItemSelected(item: TreeListItem, selectedItemId?: string) {
  return item.selected || selectedItemId === item.id;
}

/*
 * Render one tree item and recursively render its expanded children.
 */
export const TreeListNode = memo((p: TreeListNodeProps) => {
  const {
    controlledExpansion,
    depth,
    disableExpandCollapse,
    expandedItemIdSet,
    item,
    lineage,
    selectedItemId,
    setLocalExpandedItemIds,
    isLast,
    onClickItem,
    onToggleItem,
  } = p;
  const children = item.items || [];
  const expandable = isTreeListItemExpandable(item);
  const expanded = expandedItemIdSet.has(item.id);
  const rowLineage = depth ? [...lineage, { isLast }] : [];

  /*
   * Toggle this item's expansion state in controlled or uncontrolled mode.
   */
  const onToggle = (e: MouseEvent<HTMLButtonElement>) => {
    if (disableExpandCollapse) {
      return;
    }

    const nextExpanded = !expanded;

    if (!controlledExpansion) {
      setLocalExpandedItemIds((currentItemIds) => (
        getNextTreeListExpandedItemIds(currentItemIds, item.id, nextExpanded)
      ));
    }

    onToggleItem?.(item, nextExpanded, e);
  };

  /*
   * Notify callers when a row is selected or activated.
   */
  const onClick = (e: MouseEvent<HTMLDivElement>) => {
    onClickItem?.(item, e);
  };

  return <>
    <TreeListRowUI
      className={item.className}
      depth={depth}
      disabled={item.disabled}
      disableExpandCollapse={disableExpandCollapse}
      expanded={expanded}
      expandable={expandable}
      hasItems={!!children.length}
      iconClassName={item.iconClassName}
      iconName={item.iconName}
      label={item.label}
      labelClassName={item.labelClassName}
      lineage={rowLineage}
      selected={isTreeListItemSelected(item, selectedItemId)}
      onClick={onClickItem ? onClick : undefined}
      onToggle={onToggle}
    />

    {expanded && !!children.length && (
      <TreeListGroupUI>
        {children.map((childItem, i) => (
          <TreeListNode
            key={childItem.id}
            controlledExpansion={controlledExpansion}
            depth={depth + 1}
            disableExpandCollapse={disableExpandCollapse}
            expandedItemIdSet={expandedItemIdSet}
            item={childItem}
            lineage={rowLineage}
            selectedItemId={selectedItemId}
            setLocalExpandedItemIds={setLocalExpandedItemIds}
            isLast={i === children.length - 1}
            onClickItem={onClickItem}
            onToggleItem={onToggleItem}
          />
        ))}
      </TreeListGroupUI>
    )}
  </>;
});

TreeListNode.displayName = 'TreeListNode';

/*
 * Render a recursive tree list with controlled or uncontrolled expansion.
 */
export const TreeList = memo((p: TreeListProps) => {
  const {
    className,
    defaultExpandedItemIds,
    disableExpandCollapse,
    expandedItemIds,
    items,
    selectedItemId,
    onClickItem,
    onToggleItem,
  } = p;
  const controlledExpansion = !!expandedItemIds;
  const [localExpandedItemIds, setLocalExpandedItemIds] = useState(() => (
    getUniqueTreeListItemIds(defaultExpandedItemIds)
  ));
  const visibleExpandedItemIds = controlledExpansion ? expandedItemIds : localExpandedItemIds;
  const expandedItemIdSet = useMemo(() => (
    getTreeListExpandedItemIdSet(visibleExpandedItemIds)
  ), [visibleExpandedItemIds]);

  return <TreeListRootUI className={cn(className)}>
    {items.map((item, i) => (
      <TreeListNode
        key={item.id}
        controlledExpansion={controlledExpansion}
        depth={0}
        disableExpandCollapse={disableExpandCollapse}
        expandedItemIdSet={expandedItemIdSet}
        item={item}
        lineage={[]}
        selectedItemId={selectedItemId}
        setLocalExpandedItemIds={setLocalExpandedItemIds}
        isLast={i === items.length - 1}
        onClickItem={onClickItem}
        onToggleItem={onToggleItem}
      />
    ))}
  </TreeListRootUI>;
});

TreeList.displayName = 'TreeList';
