import { cn } from '@jsb188/app/utils/string.ts';
import {
  TreeListGroupUI,
  TreeListRootUI,
  TreeListRowUI,
  type TreeListLineageState,
} from '@jsb188/react-web/ui/TreeListUI';
import { memo, useCallback, useMemo, useState, type Dispatch, type MouseEvent, type ReactNode, type SetStateAction } from 'react';

const ROOT_TREE_LIST_LINEAGE: TreeListLineageState[] = [];

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
  onToggleItem?: (item: TreeListItem, expanded: boolean, e: MouseEvent<HTMLElement>) => void;
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
  const nextItemIdSet = new Set(itemIds);

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
 * Return the lineage state for the row currently being rendered.
 */
function getTreeListRowLineage(p: {
  depth: number;
  isLast: boolean;
  lineage: TreeListLineageState[];
}) {
  const { depth, isLast, lineage } = p;

  return depth ? [...lineage, { isLast }] : ROOT_TREE_LIST_LINEAGE;
}

/*
 * Return whether this node should attach a row click handler.
 */
function canClickTreeListItem(p: {
  disableExpandCollapse?: boolean;
  expandable: boolean;
  onClickItem?: TreeListProps['onClickItem'];
}) {
  const { disableExpandCollapse, expandable, onClickItem } = p;

  return !!onClickItem || (expandable && !disableExpandCollapse);
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
  const hasChildren = !!children.length;
  const rowLineage = useMemo(() => (
    getTreeListRowLineage({ depth, isLast, lineage })
  ), [depth, isLast, lineage]);
  const clickable = canClickTreeListItem({
    disableExpandCollapse,
    expandable,
    onClickItem,
  });

  /*
   * Toggle this item's expansion state in controlled or uncontrolled mode.
   */
  const onToggle = useCallback((e: MouseEvent<HTMLElement>) => {
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
  }, [controlledExpansion, disableExpandCollapse, expanded, item, onToggleItem, setLocalExpandedItemIds]);

  /*
   * Notify callers when a row is selected or activated and toggle expandable rows.
   */
  const onClick = useCallback((e: MouseEvent<HTMLDivElement>) => {
    if (expandable) {
      onToggle(e);
    }

    onClickItem?.(item, e);
  }, [expandable, item, onClickItem, onToggle]);

  return <>
    <TreeListRowUI
      className={item.className}
      depth={depth}
      disabled={item.disabled}
      disableExpandCollapse={disableExpandCollapse}
      expanded={expanded}
      expandable={expandable}
      hasItems={hasChildren}
      iconClassName={item.iconClassName}
      iconName={item.iconName}
      label={item.label}
      labelClassName={item.labelClassName}
      lineage={rowLineage}
      selected={isTreeListItemSelected(item, selectedItemId)}
      onClick={clickable ? onClick : undefined}
      onToggle={onToggle}
    />

    {expanded && hasChildren && (
      <TreeListGroupUI className='mb_6 gap_1'>
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
            isLast={i === children.length - 1}
            setLocalExpandedItemIds={setLocalExpandedItemIds}
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
  const controlledExpansion = Array.isArray(expandedItemIds);
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
        lineage={ROOT_TREE_LIST_LINEAGE}
        selectedItemId={selectedItemId}
        isLast={i === items.length - 1}
        setLocalExpandedItemIds={setLocalExpandedItemIds}
        onClickItem={onClickItem}
        onToggleItem={onToggleItem}
      />
    ))}
  </TreeListRootUI>;
});

TreeList.displayName = 'TreeList';
