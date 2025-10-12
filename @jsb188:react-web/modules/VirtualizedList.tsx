import { DOM_IDS } from '@jsb188/app/constants/app';
import type { ServerErrorObj } from '@jsb188/app/types/app.d';
import { uniq } from '@jsb188/app/utils/object';
import { cn } from '@jsb188/app/utils/string';
import { loadFragment } from '@jsb188/graphql/cache';
import type { TableHeaderObj } from '@jsb188/react-web/ui/TableListUI';
import { TDCol, THead, TRow } from '@jsb188/react-web/ui/TableListUI';
import type { OpenModalPopUpFn } from '@jsb188/react/states';
import { isValidElement, memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { ReactDivElement, ReactSpanElement } from '../types/dom.d';

/**
 * Logic
 *
 * 1. startOfListItems[]
 * This is where the newest items get pushed into array.
 * For example, "newest data" will get prepended/replaced here.
 */

/**
 * Types
 */

type CursorPositionObj = [
  string | null, // ID of node; gotten from getItemId() // null means scroll to bottom
  string | null, // DOM ID; of top most visible item, used for repositioning
  number, // Top Y position; offset from top of window to top most visible item
  boolean, // Whether the list is fetching before or after the cursor
  number, // Refresh count
];

type FetchMoreFn = (after: boolean, cursor: string | null, limit: number) => Promise<{
  data?: any[];
  error?: ServerErrorObj;
}>;

type RenderItemFn = (
  // This is when you use the groupItems() fn
  // the item will become an array (because of the grouping)
  // (item: any[], i: number, list: any[][]) => React.ReactNode
  (item: any, i: number, list: any[]) => React.ReactNode
) |
(
  // When groupItems() is not used, it will be a normal list map, like so:
  (item: VZListItemObj, i: number, list: VZListItemObj[]) => React.ReactNode
);

export type ReactiveFragmentFn = (id: string, node: any) => any;

type TableColumnElement = string | ReactSpanElement | React.ReactNode | null;

export type MapTableListDataFn = (
  item: VZListItemObj,
  i: number,
  list: VZListItemObj[]
) => {
  __deleted: boolean;
  RowHeaderComponent?: React.ReactNode;
  rowHeaders?: Partial<TableHeaderObj>[] | null;
  columns: TableColumnElement[];
  // This will create another list of rows below the main row
  subRows?: {
    value: any;
    columns: TableColumnElement[]
  }[];
} | null; // Returning "null" hides the row

interface VZReferenceObj {
  mounted: boolean;
  loading?: boolean;
  itemIds: string[] | null;
  startOfListItemId: string | null;
  lastItemIdOnMount: string | null;
  topCursor: [string, string] | null; // [id, cursor]
  bottomCursor: [string, string] | null; // [id, cursor]
}

export interface VZListItemObj {
  item: any;
  otherProps?: any;
  lastItemIdOnMount: string | null;

  // If you use the groupItems() fn, you can add DatePeriodObj and any other props here
  [key: string]: any;
}

interface VirtualizedState {
  cursorPosition: CursorPositionObj | null;
  setCursorPosition: (id: CursorPositionObj | null) => void;
  listData: VZListItemObj[] | null;
  hasMoreTop: boolean;
  hasMoreBottom: boolean;
  referenceObj: React.MutableRefObject<VZReferenceObj>;
  // forceUpdate: () => void;
}

interface VirtualizedListProps extends ReactDivElement {
  // Render props
  MockComponent?: React.ReactNode;
  HeaderComponent?: React.ReactNode;
  FooterComponent?: React.ElementType;
  renderItem: RenderItemFn;
  otherProps?: Record<string, any>;

  // Data props
  loading?: boolean;
  fetchMore?: FetchMoreFn;
  startOfListItems: any[];
  getItemId?: (item: any) => string;
  groupItems?: (items: any[]) => any[]; // Function to group items by date period
  fragmentName: string;

  // Fetch props
  limit: number;
  refreshKey?: string | number; // Use {updatedCount} and/or loading state and/or variables key from useQuery() hook to keep startOfListItems[] up to date
  maxFetchLimit?: number; // Max number of items user can load by scrolling

  // Callbacks & handler props
  openModalPopUp: OpenModalPopUpFn;

  // DOM props
  rootElementQuery?: string; // Scrollable DOM element where the list is contained
}

type VirtualizedListOmit = Omit<VirtualizedListProps, 'renderItem' | 'groupItems' | 'HeaderComponent'>;

/**
 * Static list container with same class name
 */

export function StaticListContainer(p: ReactDivElement) {
  const { className, ...other } = p;
  return <section
    className={cn('px_lg pt_df pb_xl fs', className)}
    {...other}
  />;
}

/**
 * Helper; merge item ids
 */

function mergeItemIds(
  currentObj: VZReferenceObj,
  data: any[],
  mergeFromLastItem: boolean,
  after: boolean,
  p: VirtualizedListProps | VirtualizedListOmit
): string[] {
  const getItemId_ = p.getItemId || ((item: any) => item.id);
  const currentList = currentObj.itemIds || [];

  let newList;
  if (mergeFromLastItem) {
    const lastItemId = currentList[currentList.length - 1];
    const ix = data.findIndex((item) => getItemId_(item) === lastItemId);

    if (after) {
      newList = data.slice(ix + 1).map(getItemId_);
    } else {
      newList = data.slice(0, ix).map(getItemId_);
    }
  } else {
    newList = data.map(getItemId_);
  }

  if (after) {
    return uniq([...newList, ...currentList]);
  }

  return uniq([...currentList, ...newList]);
}

/**
 * Helper; get cursor position
 */

function getCursorPosition(
  id: string | null,
  after: boolean,
  listElement: HTMLDivElement | null,
  p: VirtualizedListProps | VirtualizedListOmit
): CursorPositionObj | null {

  if (id === null) {
    // null means scroll to bottom
    return [null, null, 0, true, Date.now()];
  }

  const rootElementQuery = p.rootElementQuery || `#${DOM_IDS.mainBodyScrollArea}`;
  const rootElement = globalThis?.document.querySelector(rootElementQuery);
  if (!rootElement || !listElement) {
    return null; // Impossible logic
  }

  // This is extra offset to accomodate root element's top offset position
  const rootTop = rootElement.getBoundingClientRect().top;

  // Loop through each element in listElement and get the first visible element
  for (let i = 0; i < listElement.children.length; i++) {
    const msgEl = listElement.children.item(i);
    const rect = msgEl?.getBoundingClientRect();

    // ID of the item
    const itemDomId = msgEl?.id;

    if (rect && rect.top >= 0) {
      return [id, itemDomId!, rect.top + rootTop, after, 0];
    }
  }

  return [id, null, 0, after, 0];
}

/**
 * Scroll to bottom
 */

function scrollToTop(rootElementQuery_: string, instant = false) {
  const rootElementQuery = rootElementQuery_ || `#${DOM_IDS.mainBodyScrollArea}`;

  // requestAnimationFrame() is necessary to prevent a slight difference in scroll position calculation
  if (instant) {
    globalThis?.requestAnimationFrame(() => {
      const rootElement = globalThis?.document.querySelector(rootElementQuery);
      if (rootElement) {
        rootElement.scrollTop = 0;
      }
    });
    return;
  }

  const doScroll = () => {
    globalThis?.requestAnimationFrame(() => {
      const rootElement = globalThis?.document.querySelector(rootElementQuery);
      if (rootElement) {
        // Scroll to bottom of root element
        rootElement.scrollTo({ top: 0, behavior: 'smooth' });
        // listElement.lastElementChild?.scrollIntoView({ block: 'start', inline: 'nearest', behavior: 'smooth' });
      }
    });
  };

  doScroll();

  // When scrolling from a large list, it's possible that the scroll position is not at the bottom
  // So we need to check and scroll twice if necessary.

  // NOTE: There's an issue if you scroll all the way to top of list and send a message,
  // It scrolls half way, delays and scrolls again (using this timeout).
  // It's possible to fix this UI issue, but its not worth the investment.

  setTimeout(() => {
    const rootElement = globalThis?.document.querySelector(rootElementQuery);
    const currentViewHeight = rootElement?.clientHeight || 0;
    const currentScrollPos = (rootElement?.scrollHeight || 0) - (rootElement?.scrollTop || 0) - currentViewHeight;
    const retryThreshold = Math.min(currentViewHeight * .78, 780);
    // console.log('currentViewHeight', currentViewHeight);
    // console.log('currentScrollPos', currentScrollPos);
    // console.log('retryThreshold', retryThreshold);
    // console.log('scroll again?', currentScrollPos > retryThreshold ? 'yes' : 'no');

    if (currentScrollPos > retryThreshold) {
      doScroll();
    }
  }, 550);
}

/**
 * Reposition list to location of DOM element
 */

function repositionList(
  cursorPosition: CursorPositionObj,
  listElement: HTMLDivElement | null,
  p: VirtualizedListProps | VirtualizedListOmit
) {

  const rootElementQuery = p.rootElementQuery || `#${DOM_IDS.mainBodyScrollArea}`;
  const [id, itemDomId, topOffset] = cursorPosition;
  const rootElement = globalThis?.document.querySelector(rootElementQuery);
  if (!id || !rootElement || !listElement) {
    return; // Impossible logic
  }

  const itemElement = itemDomId ? globalThis?.document.getElementById(itemDomId) : listElement;
  if (!itemElement) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Item not found in DOM during Virtualized list repositioning:', cursorPosition[0]);
    }
    return;
  }

  globalThis?.requestAnimationFrame(() => {
    if (itemDomId) {
      console.dev('Scrolling into view: ' + itemDomId);
    } else {
      console.dev('Could not scroll into view! Unless this was intentional, this is a bug and probably will cause an unintentional scrol to top!');
      console.dev('To fix this, add a proper DOM ID (id="..") prop to the entire list item Component.');
    }

    itemElement.scrollIntoView({ block: 'start', inline: 'nearest', behavior: 'instant' });
    itemElement.scrollTop = topOffset;
  });

  // const rootTop = rootElement.getBoundingClientRect().top;
  // const scrollY = itemTop - rootTop;

  // console.log('itemTop', itemTop);
  // console.log('rootTop', rootTop);
  // console.log('scrollY', scrollY);

  // // itemElement.scrollIntoView({ block: 'start', inline: 'nearest', behavior: 'instant' });
  // // rootElement.scrollTo({ top: scrollY, behavior: 'instant' });
  // // rootElement.scrollTop = cursorPosition[1];

  // const scrollTop = itemTop - cursorPosition[1] - rootTop;
  // rootElement.scrollTo({top: scrollTop, behavior: 'instant'});
}

/**
 * Virtualized list state
 */

function useVirtualizedState(p: VirtualizedListProps | VirtualizedListOmit): VirtualizedState {
  const { otherProps, fragmentName, refreshKey, limit, loading, maxFetchLimit } = p;
  const [cursorPosition, setCursorPosition] = useState<CursorPositionObj | null>(null);
  // const [, forceUpdate] = useReducer(x => x + 1, 0);
  const referenceObj = useRef<VZReferenceObj>({ loading, startOfListItemId: null, lastItemIdOnMount: null, mounted: true, itemIds: null, topCursor: null, bottomCursor: null });

  // List data

  const itemIds = referenceObj.current.itemIds;
  const listData = useMemo(() => {

    if (itemIds && limit > 0) {
      let viewing: string[];
      if (cursorPosition === null || cursorPosition[0] === null) {
        // console.log(':::::1', itemIds.length, '||', cursorPosition, limit);
        viewing = itemIds.slice(0, limit);
      } else {
        let cursorIndex = itemIds.indexOf(cursorPosition[0]);
        if (cursorIndex === -1) {
          // This cannot happen (impossible logic)
          console.error('Cursor ID not found in itemIds[]:', cursorPosition[0]);
          return null;
        } else if (!cursorPosition[3]) {
          cursorIndex++;
        }

        const start = Math.max(0, cursorIndex - limit);
        const end = Math.min(itemIds.length, cursorIndex + limit);
        // console.log(':::::2', itemIds.length, '||', cursorIndex, limit, cursorPosition, start, end);
        viewing = itemIds.slice(start, end);

        if (process.env.NODE_ENV === 'development') {
          console.dev('start to end:', cursorPosition[3], start, end, '->', viewing.length);
        }
      }

      return viewing.map((id) => {
        const item = loadFragment(`${fragmentName}:${id}`);
        if (!item) {
          console.dev('Error in [VirtualizedList.tsx]; item not found in cache:', 'warning', `${fragmentName}:${id}`);
          return null;
        }

        return {
          item,
          otherProps,
          lastItemIdOnMount: referenceObj.current.lastItemIdOnMount
        };
      }).filter(Boolean) as VZListItemObj[];
    }

    return null;
  }, [itemIds, cursorPosition?.[0], limit, refreshKey]);

  // Keep track of certain props so it can referenced inside memoized functions

  useEffect(() => {
    const top = listData?.[0]?.item;
    const bottom = listData?.[listData.length - 1]?.item;

    referenceObj.current = {
      ...referenceObj.current,
      loading,
      topCursor: top ? [top.id, top.cursor] : null,
      bottomCursor: bottom ? [bottom.id, bottom.cursor] : null
    };
  }, [loading, listData]);

  useEffect(() => {
    // Need this for development purposes
    referenceObj.current.mounted = true;
    // console.dev('Mounted VZ List!');

    return () => {
      referenceObj.current.mounted = false;
      // console.dev('Unmounted VZ List!');
    };
  }, []);

  const { startOfListItemId } = referenceObj.current;
  const isTopOfList = startOfListItemId ? startOfListItemId === listData?.[0]?.item?.id : false;
  const hasMoreTop = !!cursorPosition?.[0] && !!itemIds && !!listData && limit <= itemIds.length && itemIds[0] !== listData[0]?.item?.id;
  // NOTE: Natural bottom limit is limit * 2 because of listData viewing area doubles the limit
  const naturalBottomLimit = (itemIds?.length || 0) > limit ? limit * 2 : limit;
  const hasMoreBottom = listData && !isTopOfList && (!maxFetchLimit || maxFetchLimit >= itemIds!?.length) ? naturalBottomLimit <= listData.length : false;
  // console.log('naturalBottomLimit:', naturalBottomLimit, 'listData:', listData?.length, '??', itemIds?.length);
  // console.log('hasMoreBottom:', hasMoreBottom, '||', isTopOfList, '||', (!maxFetchLimit || maxFetchLimit >= itemIds!?.length), '>>', limit, listData?.length);

  return {
    cursorPosition,
    setCursorPosition,
    listData,
    hasMoreTop,
    hasMoreBottom,
    referenceObj,
  };
}

/**
 * Re-position list as needed
 */

function useVirtualizedDOM(p: VirtualizedListProps | VirtualizedListOmit, vzState: VirtualizedState) {
  const { listData, hasMoreTop, hasMoreBottom, cursorPosition, setCursorPosition, referenceObj } = vzState;
  const { limit, fetchMore, openModalPopUp } = p;
  const rootElementQuery = p.rootElementQuery || `#${DOM_IDS.mainBodyScrollArea}`;
  const listRef = useRef<HTMLDivElement | null>(null);
  const topRef = useRef<HTMLDivElement | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const [startOfListItems, setStartOfListItems] = useState<any[]>(p.startOfListItems || null);
  const eolLen = startOfListItems.length;

  useEffect(() => {
    if (!startOfListItems && p.startOfListItems) {
      // startOfListItems[] is the initial snapshot of data when the Virtualized List is loaded.
      // Sometimes, startOfListItems[] changes even though its never suppose to change.
      // This fixes that.
      setStartOfListItems(p.startOfListItems);
    }
  }, [p.startOfListItems]);

  // fetchMore() logic for infinite scroll

  const fetchMoreList = useCallback(async(after: boolean) => {
    if (fetchMore && !referenceObj.current.loading) {
      const position = after ? referenceObj.current.topCursor : referenceObj.current.bottomCursor;

      if (
        position &&
        ((after && hasMoreBottom) || (!after || hasMoreTop))
      ) {

        // Check if there's enough (limit) data from memory in itemIds array

        const ix = referenceObj.current.itemIds?.indexOf(position[0]);
        if (typeof ix === 'number' && ix >= 0) {
          const listLen = referenceObj.current.itemIds!.length;
          if (after && (ix - limit) >= limit) {
            console.dev('REPOSITIONING AFTER', ix, limit, listLen);
            setCursorPosition( getCursorPosition(position[0], after, listRef.current, p) );
            return;
          // } else if (!after && ((ix + limit) < listLen || listLen === (ix + 1))) {
          } else if (!after && (ix + limit) < listLen) {
            console.dev('REPOSITIONING BEFORE', ix, limit, listLen);
            setCursorPosition( getCursorPosition(position[0], after, listRef.current, p) );
            return;
          } else {
            // console.dev('NOT REPOSITIONING ' + (after ? 'AFTER' : 'BEFORE'), ix, limit, listLen);
          }
        }

        const { data, error } = await fetchMore(after, position[1], limit);

        if (referenceObj.current.mounted) {

          if (process.env.NODE_ENV === 'development') {
            console.dev(`FETCHED: ${limit} ${after ? 'ABOVE' : 'BELOW'} ${position[1] || "no cursor"}`, 'em', data);
          }

          if (Array.isArray(data) && data.length) {

            referenceObj.current.itemIds = mergeItemIds(referenceObj.current, data, false, after, p);
            if (!after && data.length < limit) {
              referenceObj.current.startOfListItemId = referenceObj.current.itemIds[0];
            }

            setCursorPosition( getCursorPosition(position[0], after, listRef.current, p) );
          }

          if (error) {
            openModalPopUp(null, error);
          }
        } else if (process.env.NODE_ENV === 'development') {
          console.dev('FETCHED: ' + (after ? 'BELOW' : 'ABOVE'), 'BUT COMPONENT IS *NOT* MOUNTED');
        }
      }
    }
    // "fetchMore" is not a dependency-- on purpose
  }, [hasMoreTop, hasMoreBottom, limit, openModalPopUp]);

  // On mount with data

  useLayoutEffect(() => {
    if (listData) {
      console.dev('SCROLLING TO TOP (1)', 'em');
      scrollToTop(rootElementQuery, true);
    }
  }, [!!listData, rootElementQuery]);

  // useEffect(() => {
  //   console.log('MOUNTED YO!!!!')
  //   return () => {
  //     console.log('UNMOUNTED YO!!!!')
  //   }
  // }, []);

  // On new list item appended

  useLayoutEffect(() => {
    if (eolLen) {
      if (listData) {
        referenceObj.current.itemIds = mergeItemIds(referenceObj.current, startOfListItems, true, true, p);
      } else {
        // This is for the first time the list is loaded
        const getItemId = p.getItemId || ((item: any) => item.id);
        referenceObj.current.itemIds = mergeItemIds(referenceObj.current, startOfListItems, false, true, p);
        referenceObj.current.lastItemIdOnMount = getItemId(startOfListItems[startOfListItems.length - 1]);
      }
      setCursorPosition( getCursorPosition(null, true, listRef.current, p) );
    }

    // Don't change this or add startOfListItems as a dependency here
    // If you do, infinite scroll will not work.
  }, [eolLen, rootElementQuery]);

  // Reposition list when the current cursorPosition updates

  useLayoutEffect(() => {
      if (cursorPosition?.[0] && listData) {
        repositionList(cursorPosition, listRef.current, p);
      }
    }, [cursorPosition?.[0], cursorPosition?.[4]]);


  // Use IntersectionObserver to detect when the topRef and bottomRef are in view

  useEffect(() => {
    const rootElement = globalThis?.document.querySelector(rootElementQuery);

    if (rootElement && (hasMoreTop || hasMoreBottom)) {
      const intersectionMargin = Math.max(rootElement.clientHeight * .7, 780);
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const before = !!bottomRef.current && !!cursorPosition && entry.target === bottomRef.current;
            const after = !!topRef.current && !before;

            // console.log('cursorPosition', cursorPosition);
            // console.log('before', before, hasMoreBottom);
            // console.log('after', after, hasMoreTop);

            if (before && hasMoreBottom) {
              fetchMoreList(false);
            } else if (after && hasMoreTop) {
              fetchMoreList(true);
            }
          }
        });
      }, {
        root: rootElement,
        rootMargin: `${intersectionMargin}px`,
        threshold: 0
      });

      observer.observe(topRef.current!);
      observer.observe(bottomRef.current!);

      // div mutation observer
      // const div = document.getElementById("yourDivId");
      // const observer = new MutationObserver(() => {
      //   div.scrollTo({ top: div.scrollHeight, behavior: "smooth" });
      // });
      // observer.observe(div, { childList: true });

      return () => {
        observer.disconnect();
      };
    }

    // fetchMoreList contains more dependencies such as [hasMoreTop, hasMoreBottom]
  }, [fetchMoreList, !!cursorPosition, referenceObj.current.startOfListItemId]);

  return [listRef, topRef, bottomRef];
}

/**
 * Virtualized list
 */

export function VirtualizedList(p: VirtualizedListProps) {
  const { renderItem, MockComponent, HeaderComponent, FooterComponent, groupItems, maxFetchLimit } = p;
  const vzState = useVirtualizedState(p);
  const [listRef, topRef, bottomRef] = useVirtualizedDOM(p, vzState);
  const { listData, hasMoreTop, hasMoreBottom, referenceObj } = vzState;

  const renderListData = useMemo(() => {
    if (groupItems && listData) {
      return groupItems(listData);
    }
    return listData;
  }, [groupItems, listData]);

  return <>
    <div ref={topRef}>
      {hasMoreTop ? MockComponent : HeaderComponent}
    </div>

    <div ref={listRef}>
      {renderListData?.map(renderItem)}
    </div>

    <div ref={bottomRef}>
      {hasMoreBottom && MockComponent}
    </div>

    {!hasMoreBottom && FooterComponent &&
      <FooterComponent
        maxFetchLimit={maxFetchLimit}
        loadedDataSize={referenceObj.current.itemIds!?.length}
      />
    }
  </>;
}

/**
 * Table list item
 */

const TableListItem = (p: TableListProps & {
  item: VZListItemObj;
  i: number;
  list: VZListItemObj[];
}) => {
  const { item, i, list, gridLayoutStyle, mapListData, cellClassNames, doNotApplyGridToRows, removeHorizontalPadding, onClickRow } = p;
  const rowData = mapListData(item, i, list);
  if (!rowData) {
    return null;
  }

  const renderCell = (cell: TableColumnElement, j: number) => {
    return <TDCol
      key={j}
      className={cellClassNames?.[i]}
      doNotApplyGridToRows={doNotApplyGridToRows}
    >
      {cell && isValidElement(cell) ? cell : cell &&typeof cell === 'object' ? <span {...cell as ReactSpanElement} /> : cell}
    </TDCol>;
  };

  return <div id={`tlist_item_${item.item.id}`} key={item.item.id}>
    {rowData.RowHeaderComponent}

    {rowData.rowHeaders && (
      <THead
        removeHorizontalPadding={removeHorizontalPadding}
        doNotApplyGridToRows={doNotApplyGridToRows}
        gridLayoutStyle={doNotApplyGridToRows ? undefined : gridLayoutStyle}
        headers={rowData.rowHeaders}
        cellClassNames={cellClassNames}
      />
    )}

    <TRow
      __deleted={rowData.__deleted}
      onClick={rowData.__deleted ? undefined : () => onClickRow?.(item)}
      doNotApplyGridToRows={doNotApplyGridToRows}
      gridLayoutStyle={doNotApplyGridToRows ? undefined : gridLayoutStyle}
    >
      {rowData.columns.map(renderCell)}
    </TRow>

    <div className='rel pattern_texture primary_bf bd_l_4 bd_primary -ml_4'>
      {rowData.subRows?.map((subRowItem: any, k: number) => {
        return <TRow
          key={k}
          className='rel z1'
          onClick={() => onClickRow?.(item, subRowItem.value)}
          doNotApplyGridToRows={doNotApplyGridToRows}
          gridLayoutStyle={doNotApplyGridToRows ? undefined : gridLayoutStyle}
        >
          {subRowItem.columns.map(renderCell)}
        </TRow>;
      })}
    </div>
  </div>;
};

TableListItem.displayName = 'TableListItem';

/**
 * Table list reactive item
 */

const TableListReactiveItem = (p: any) => {
  const { reactiveFragmentFn, item } = p;
  const reactiveItem = reactiveFragmentFn(item?.item?.id, item?.item);
  return <TableListItem
    {...p}
    item={{
      ...item,
      item: reactiveItem
    }}
  />;
};

/**
 * Table list
 */

interface TableListProps {
  reactiveFragmentFn?: ReactiveFragmentFn;
  gridLayoutStyle?: string;
  cellClassNames?: (string | undefined)[];
  removeHorizontalPadding?: boolean;
  doNotApplyGridToRows?: boolean;
  headers?: Partial<TableHeaderObj>[];
  listData: VZListItemObj[] | null;
  mapListData: MapTableListDataFn;
  onClickRow?: (vzItem?: VZListItemObj, subRowItemValue?: any) => void;
}

export const TableList = memo((p: TableListProps) => {
  const { reactiveFragmentFn, gridLayoutStyle, headers, listData, mapListData, cellClassNames, doNotApplyGridToRows, removeHorizontalPadding, onClickRow } = p;
  return <>
    {headers && (
      <THead
        removeHorizontalPadding={removeHorizontalPadding}
        doNotApplyGridToRows={doNotApplyGridToRows}
        gridLayoutStyle={doNotApplyGridToRows ? undefined : gridLayoutStyle}
        headers={headers}
        cellClassNames={cellClassNames}
      />
    )}
    {listData?.map((item: VZListItemObj, i: number, list: any[]) => {
      if (reactiveFragmentFn) {
        // Doing this avoids "different number of hooks rendered" rules error
        return <TableListReactiveItem
          key={item.item.id}
          {...p}
          item={item}
          i={i}
          list={list}
        />;
      }

      return <TableListItem
        key={item.item.id}
        {...p}
        item={item}
        i={i}
        list={list}
      />;
    })}
  </>;
});

TableList.displayName = 'TableList';

/**
 * Virtualized table list
 */

export function VirtualizedTableList(p: VirtualizedListOmit & {
  onClickRow?: (vzItem?: VZListItemObj) => void;
  reactiveFragmentFn?: ReactiveFragmentFn;
  doNotApplyGridToRows?: boolean;
  gridLayoutStyle?: string;
  cellClassNames?: (string | undefined)[];
  headers?: Partial<TableHeaderObj>[];
  // Use this to map list data to table row cells data
  mapListData: MapTableListDataFn;
}) {
  const { FooterComponent, MockComponent, className, headers, cellClassNames, reactiveFragmentFn, mapListData, doNotApplyGridToRows, gridLayoutStyle, onClickRow, maxFetchLimit } = p;
  const vzState = useVirtualizedState(p);
  const [listRef, topRef, bottomRef] = useVirtualizedDOM(p, vzState);
  const { listData, hasMoreTop, hasMoreBottom, referenceObj } = vzState;
  const numColumns = headers?.length || 1;

  // useEffect(() => {
  //   console.log('MOUNTED VirtualizedTableList');
  // }, []);

  // ".-mt_xs" is used to make this Table exactly same sizing/offset as the List for Logs page
  return <>
    <div className={cn('-mx_xs', className)}>
      <div ref={topRef}>
        {hasMoreTop ? MockComponent : null}
      </div>

      <div
        ref={listRef}
        style={doNotApplyGridToRows && gridLayoutStyle ? { gridTemplateColumns: gridLayoutStyle } : undefined}
        className={cn('w_f rel table', !gridLayoutStyle && 'size_' + numColumns)}
      >
        <TableList
          reactiveFragmentFn={reactiveFragmentFn}
          gridLayoutStyle={gridLayoutStyle}
          doNotApplyGridToRows={doNotApplyGridToRows}
          listData={listData}
          mapListData={mapListData}
          headers={headers}
          cellClassNames={cellClassNames}
          onClickRow={onClickRow}
        />
      </div>

      <div ref={bottomRef}>
        {hasMoreBottom && MockComponent}
      </div>

      {!hasMoreBottom && FooterComponent &&
        <FooterComponent
          maxFetchLimit={maxFetchLimit}
          loadedDataSize={referenceObj.current.itemIds!?.length}
        />
      }
    </div>
  </>;
}
