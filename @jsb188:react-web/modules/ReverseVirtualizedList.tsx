import type { ServerErrorObj } from '@jsb188/app/types/app.d';
import { uniq } from '@jsb188/app/utils/object';
import { cn } from '@jsb188/app/utils/string';
import { loadFragment } from '@jsb188/graphql/cache';
import type { OpenModalPopUpFn } from '@jsb188/react/states';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { ReactDivElement } from '../types/dom.d';
import { isScrollAtBottom } from '../utils/dom';

/**
 * Logic
 *
 * 1. endOfListItems[]
 * This is where the newest items get pushed into array.
 * For example, "latest chat messages" will get appended here.
 *
 * 2. endOfListItems[].length
 * Total length of endOfListItems[] is used to check
 * when a new activity has occured.
 * When this happens, there are useLayoutEffect() hooks that
 * reposition the list, among other things.
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
  data?: Record<string, any>[];
  error?: ServerErrorObj;
}>;

interface VZReferenceObj {
  mounted: boolean;
  loading?: boolean;
  itemIds: string[] | null;
  startOfListItemId: string | null;
  lastItemIdOnMount: string | null;
  topCursor: [string, string] | null; // [id, cursor]
  bottomCursor: [string, string] | null; // [id, cursor]
}

interface VZListItemObj {
  item: any;
  otherProps?: any;
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

interface ReverseVZListProps extends ReactDivElement {
  // Render props
  MockComponent?: React.ReactNode;
  HeaderComponent?: React.ReactNode;
  FooterComponent?: React.ReactNode;
  renderItem: (item: VZListItemObj, i: number, list: VZListItemObj[]) => React.ReactNode;
  otherProps?: Record<string, any>;

  // Data props
  loading?: boolean;
  fetchMore?: FetchMoreFn;
  endOfListItems: Record<string, any>[];
  getItemId?: (item: Record<string, any>) => string;
  fragmentName: string;

  // Fetch props
  limit: number;

  // Callbacks & handler props
  openModalPopUp: OpenModalPopUpFn;

  // DOM props
  rootElementQuery: string; // Scrollable DOM element where the list is contained
  scrollBottomThreshold?: number; // Positon from bottom to be considered "scrolled to bottom" // If decimals (.25), then it's % of clientHeight of scrollable DOM
}

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
  data: Record<string, any>[],
  mergeFromLastItem: boolean,
  after: boolean,
  p: ReverseVZListProps
): string[] {
  const getItemId_ = p.getItemId || ((item: Record<string, any>) => item.id);
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
    return uniq([...currentList, ...newList]);
  }

  return uniq([...newList, ...currentList]);
}

/**
 * Helper; get cursor position
 */

function getCursorPosition(
  id: string | null,
  after: boolean,
  listElement: HTMLDivElement | null,
  p: ReverseVZListProps
): CursorPositionObj | null {

  if (id === null) {
    // null means scroll to bottom
    return [null, null, 0, true, Date.now()];
  }

  const { rootElementQuery } = p;
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

function scrollToBottom(rootElementQuery: string, instant = false) {
  // requestAnimationFrame() is necessary to prevent a slight difference in scroll position calculation
  if (instant) {
    globalThis?.requestAnimationFrame(() => {
      const rootElement = globalThis?.document.querySelector(rootElementQuery);
      if (rootElement) {
        rootElement.scrollTop = rootElement.scrollHeight;
      }
    });
    return;
  }

  const doScroll = () => {
    globalThis?.requestAnimationFrame(() => {
      const rootElement = globalThis?.document.querySelector(rootElementQuery);
      if (rootElement) {
        // Scroll to bottom of root element
        rootElement.scrollTo({ top: rootElement.scrollHeight, behavior: 'smooth' });
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
  p: ReverseVZListProps
) {
  const { rootElementQuery } = p;
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

function useVirtualizedState(p: ReverseVZListProps): VirtualizedState {
  const { otherProps, fragmentName, limit, loading } = p;
  const [cursorPosition, setCursorPosition] = useState<CursorPositionObj | null>(null);
  // const [, forceUpdate] = useReducer(x => x + 1, 0);
  const referenceObj = useRef<VZReferenceObj>({ loading, startOfListItemId: null, lastItemIdOnMount: null, mounted: true, itemIds: null, topCursor: null, bottomCursor: null });

  // List data

  const itemIds = referenceObj.current.itemIds;
  const listData = useMemo(() => {
    if (itemIds && limit > 0) {

      let viewing: string[];
      if (cursorPosition === null || cursorPosition[0] === null) {
        viewing = itemIds.slice(-limit);
      } else {
        let cursorIndex = itemIds.indexOf(cursorPosition[0]);
        if (cursorIndex === -1) {
          // This cannot happen (impossible logic)
          console.error('Cursor ID not found in itemIds[]:', cursorPosition[0]);
          return null;
        } else if (cursorPosition[3]) {
          cursorIndex++;
        }

        const start = Math.max(0, cursorIndex - limit);
        const end = Math.min(itemIds.length, cursorIndex + limit);
        viewing = itemIds.slice(start, end);

        if (process.env.NODE_ENV === 'development') {
          console.dev('start to end:', cursorPosition[3], start, end, '->', viewing.length);
        }
      }

      return viewing.map((id) => {
        const item = loadFragment(`${fragmentName}:${id}`);
        if (!item) {
          console.dev('Error in [ReverseVirtualizedList.tsx]; item not found in cache:', 'warning', id);
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
  }, [itemIds, cursorPosition?.[0], limit]);

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
    return () => {
      referenceObj.current.mounted = false;
    };
  }, []);

  const { startOfListItemId } = referenceObj.current;
  const isTopOfList = startOfListItemId ? startOfListItemId === listData?.[0]?.item?.id : false;
  const hasMoreTop = listData && !isTopOfList ? limit <= listData.length : false;
  const hasMoreBottom = !!cursorPosition?.[0] && !!itemIds && !!listData && limit <= itemIds.length && itemIds[itemIds.length - 1] !== listData[listData.length - 1]?.item?.id;

  // console.log('hasMoreTop', hasMoreTop);
  // console.log('isTopOfList', isTopOfList);
  // console.log('limit', limit, listData?.length);

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

function useVirtualizedDOM(p: ReverseVZListProps, vzState: VirtualizedState) {
  const { listData, hasMoreTop, hasMoreBottom, cursorPosition, setCursorPosition, referenceObj } = vzState;
  const { endOfListItems, rootElementQuery, scrollBottomThreshold, limit, fetchMore, openModalPopUp } = p;
  const listRef = useRef<HTMLDivElement | null>(null);
  const topRef = useRef<HTMLDivElement | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const eolLen = endOfListItems.length;

  // fetchMore() logic for infinite scroll

  const fetchMoreList = useCallback(async(after: boolean) => {
    if (fetchMore && !referenceObj.current.loading) {
      const position = after ? referenceObj.current.bottomCursor : referenceObj.current.topCursor;
      // console.log('--->', after, hasMoreBottom, hasMoreTop, '??', (after || hasMoreBottom), (!after || hasMoreTop));

      if (
        position &&
        ((after && hasMoreBottom) || (!after || hasMoreTop))
      ) {

        // Check if there's enough (limit) data from memory in itemIds array

        const ix = referenceObj.current.itemIds?.indexOf(position[0]);
        if (typeof ix === 'number' && ix >= 0) {
          const listLen = referenceObj.current.itemIds!.length;
          if (
            after &&
            ((ix + limit) < listLen || listLen === (ix + 1))
          ) {
            // console.dev('REPOSITIONING AFTER', ix, limit, listLen);
            setCursorPosition( getCursorPosition(position[0], after, listRef.current, p) );
            return;
          } else if (!after && (ix - limit) >= limit) {
            // console.dev('REPOSITIONING BEFORE', ix, limit, listLen);
            setCursorPosition( getCursorPosition(position[0], after, listRef.current, p) );
            return;
          } else {
            // console.dev('NOT REPOSITIONING ' + (after ? 'AFTER' : 'BEFORE'), ix, limit, listLen);
          }
        }

        const { data, error } = await fetchMore(after, position[1], limit);
        if (referenceObj.current.mounted) {

          if (process.env.NODE_ENV === 'development') {
            console.dev('FETCHED: ' + (after ? 'BELOW' : 'ABOVE'), 'em', data);
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
          console.log('FETCHED: ' + (after ? 'BELOW' : 'ABOVE'), 'BUT COMPONENT IS *NOT* MOUNTED');
        }
      }
    }
    // "fetchMore" is not a dependency-- on purpose
  }, [hasMoreTop, hasMoreBottom, limit, openModalPopUp]);

  // On mount with data

  useLayoutEffect(() => {
    if (listData) {
      console.dev('SCROLLING TO BOTTOM (1)', 'em');
      scrollToBottom(rootElementQuery, true);
    }
  }, [!!listData, rootElementQuery]);

  // On new list item appended

  useLayoutEffect(() => {
    if (eolLen && listData) {
      referenceObj.current.itemIds = mergeItemIds(referenceObj.current, endOfListItems, true, true, p);

      if (scrollBottomThreshold && scrollBottomThreshold > 0) {
        const rootElement = globalThis?.document.querySelector(rootElementQuery);
        const scrolledToBottom = isScrollAtBottom(rootElement, scrollBottomThreshold);

        if (scrolledToBottom) {
          setCursorPosition( getCursorPosition(null, true, listRef.current, p) );
        }
      } else {
        setCursorPosition( getCursorPosition(null, true, listRef.current, p) );
      }
    } else if (eolLen) {
      // This is for the first time the list is loaded
      const getItemId = p.getItemId || ((item: Record<string, any>) => item.id);
      referenceObj.current.itemIds = mergeItemIds(referenceObj.current, endOfListItems, false, true, p);
      referenceObj.current.lastItemIdOnMount = getItemId(endOfListItems[endOfListItems.length - 1]);

    }
  }, [eolLen, rootElementQuery]);

  // Reposition list when the current cursorPosition updates

  useLayoutEffect(() => {
    if (cursorPosition && listData) {
      if (cursorPosition[0] === null) {
        console.dev('SCROLLING TO BOTTOM (2)', 'em');
        scrollToBottom(rootElementQuery, false);
      } else {
        console.dev('REPOSITION LIST');

        repositionList(cursorPosition, listRef.current, p);
      }
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
            const before = !!topRef.current && entry.target === topRef.current;
            const after = !!bottomRef.current && !!cursorPosition && !before;

            if (before && hasMoreTop) {
              fetchMoreList(false);
            } else if (after && hasMoreBottom) {
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

function ReverseVZList(p: ReverseVZListProps) {
  const { renderItem, MockComponent, HeaderComponent, FooterComponent, className } = p;
  const vzState = useVirtualizedState(p);
  const [listRef, topRef, bottomRef] = useVirtualizedDOM(p, vzState);
  const { listData, hasMoreTop, hasMoreBottom } = vzState;

  // For performance tests
  // const [counter, setCounter] = useState(0);
  // useEffect(() => {
  //   const timer = setTimeout(() => {
  //     setCounter(prev => prev + 1);
  //   }, 1000);
  //   return () => clearTimeout(timer);
  // }, [counter]);

  return <section
    className={cn('px_lg pt_df pb_xl fs', className)}
  >
    <div ref={topRef}>
      {hasMoreTop ? MockComponent : HeaderComponent}
    </div>

    <div ref={listRef}>
      {listData?.map(renderItem)}
    </div>

    <div ref={bottomRef}>
      {hasMoreBottom && MockComponent}
    </div>
    {FooterComponent}
  </section>;
}

export default ReverseVZList;
