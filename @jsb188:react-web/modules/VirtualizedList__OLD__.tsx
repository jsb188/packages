import { cn, getTimeBasedUnique } from '@jsb188/app/utils/string';
import { setTimeoutPriority } from '@jsb188/react-web/utils/pto';
import { memo, useEffect, useLayoutEffect, useMemo, useReducer, useRef } from 'react';

/**
 * Types
 */

interface Item {
  id: string;
}

type VirtualizedListProps = {
  children: any;
  virtualized: any;
  forceUpdate: () => void;
  refreshKey?: [string, boolean, boolean, number | undefined]; // timestamp, isLive, forceRefetch, random float
  fetchSize: number;
  refreshCount: number;
  hasAfter: boolean;
  loading?: boolean;
  ready: boolean;
  data: Item[];
  refetch: () => Promise<void>;
  fetchMore: (options: object) => Promise<void>;
  fetchDataFromCache: (itemWithCursor: object | null, after: boolean, limit: number) => object | null;
  renderItem: (tem: Item, index: number, isLast: boolean) => React.ReactNode;
  className?: string;
  bodyClassName?: string;
  MockComponent: React.ComponentType;
};

type VirtualizedPlaceholderProps = {
  domId: string;
  top?: boolean;
  hasMore: boolean;
  fetchSize: number;
  itemHeight: number;
  MockComponent: React.ComponentType;
  bodyClassName?: string;
};

/**
 * Virtualized placeholder area
 */

const VirtualizedPlaceholder = memo((p: VirtualizedPlaceholderProps) => {
  const { domId, bodyClassName, top, hasMore, itemHeight } = p;
  const MockComponent = p.MockComponent || 'div';
  const windowHeight = globalThis?.innerHeight;
  // console.log(top ? '   top' : 'bottom', fetchSize, hasMore, fetchSize, hasMore ? 0 : (fetchSize * itemHeight));

  return (
    <div
      id={domId}
      hidden={!hasMore}
      className={cn('vl_ph of li_body', bodyClassName, top ? 'top' : 'bottom')}
      // style={{height: hasMore ? (fetchSize * itemHeight) : 0}}
      style={hasMore ? { height: windowHeight } : undefined}
    >
      {hasMore
        ? (
          <MockComponent
            size={Math.max(1, Math.floor(windowHeight / (itemHeight || 40)))}
          />
        )
        : null}
      {/* {!hasMore ? null : [...Array(fetchSize)].map((_, i) => <MockComponent key={i} />)} */}
    </div>
  );
});

VirtualizedPlaceholder.displayName = 'VirtualizedPlaceholder';

/**
 * Helper; intersection observer for virtualized placeholder
 */

function useVirtualizedInteractionObserver(
  p: VirtualizedListProps,
  virtualized: any,
  forceUpdate: () => void,
  after: boolean,
  rootId: string,
  domId: string,
) {
  const { fetchMore, fetchSize, fetchDataFromCache } = p;
  const { hasAfter, hasBefore } = virtualized.current;
  const hasMore = after ? hasAfter : hasBefore;

  useEffect(() => {
    if (hasMore) {
      const root = document.querySelector(`#${rootId}`);
      const domEl = document.querySelector(`#${domId}`);
      const windowSize = Math.max(globalThis?.innerHeight, 1400);
      const rootMargin = `${windowSize / 2}px`;

      let intrObserver: IntersectionObserver;
      if (root && domEl) {
        const onIntersectChange = async (
          entries: IntersectionObserverEntry[],
        ) => {
          const entry = entries[0];
          const data = virtualized.current.data;

          if (entry?.isIntersecting && !virtualized.current.skipInfiniteScroll && data.length) {
            const item = after ? data[data.length - 1] : data[0];

            let cacheData;
            if (item) {
              // console.log('FETCH 0', after, item.cursor, hasMore, virtualized.current);
              cacheData = fetchDataFromCache(item, after, fetchSize, true);

              if (!cacheData) {
                await fetchMore({
                  variables: {
                    cursor: item.cursor,
                    after,
                    limit: fetchSize,
                  },
                });

                cacheData = fetchDataFromCache(item, after, fetchSize);
              }
            }

            const items = root.getElementsByClassName('li_item');

            let inViewEl;
            let inViewPos;
            if (items.length) {
              for (let i = 0; i < items.length; i++) {
                const msgEl = items.item(i);
                const rect = msgEl?.getBoundingClientRect();

                if (rect && rect.top >= 0) {
                  inViewEl = msgEl;
                  inViewPos = rect.top;
                  break;
                }
              }

              // if (inViewEl) {
              //   console.log(inViewEl.id);
              //   console.log(inViewEl.innerText);
              //   console.log(inViewPos);
              // }
            }

            if (cacheData) {
              // console.log("SET::::", cacheData.data.length, cacheData.data[cacheData.data.length - 1]?.userStatus?.id);
              // console.log(inViewEl ? [inViewEl.id, inViewPos] : 'NO VIEW');

              virtualized.current = {
                ...virtualized.current,
                ...cacheData,
                nextPosition: inViewEl ? [inViewEl.id, inViewPos] : null,
              };
              forceUpdate();
            }
          }
        };

        intrObserver = new IntersectionObserver(onIntersectChange, {
          rootMargin,
          root,
        });
        intrObserver.observe(domEl);

        return () => {
          intrObserver.disconnect();
        };
      }
    }
  }, [hasMore]);
}

/**
 * Render item; memoized so it's efficient
 */

const RenderItemMemo = memo((p: any) => {
  const { item, index, lastIndex, renderItem } = p;
  return renderItem(item, index, index === lastIndex);
});

RenderItemMemo.displayName = 'RenderItemMemo';

/**
 * Virtualized list for fixed height items
 */

const VirtualizedListMemo = memo((p: VirtualizedListProps) => {
  const {
    loading,
    fetchSize,
    renderItem,
    className,
    bodyClassName,
    MockComponent,
    virtualized,
    forceUpdate,
    children,
  } = p;

  const { id, data, hasBefore, hasAfter } = virtualized.current;
  // console.log(data);

  // const firstCursor = data[1][0]?.id;
  // const lastCursor = data[1][data[1].length - 1]?.id;
  // const firstCursor = p.data[0]?.id;
  // const lastCursor = p.data[p.data?.length - 1]?.id;

  const rootId = id;
  const headId = `${id}-head`;
  const bodyId = `${id}-body`;
  const footId = `${id}-foot`;

  const layout = useMemo(() => {
    const height = virtualized.current.nextHeight;
    const size = virtualized.current.data.reduce((acc, d) => acc + d.length, 0,);
    return { height, size };
  }, [virtualized.current.nextHeight, virtualized.current.data]);

  // Keep track of loading status to prevent "double" fetch

  useEffect(() => {
    if (loading) {
      virtualized.current = {
        ...virtualized.current,
        skipInfiniteScroll: true,
      };
      forceUpdate();
    } else {
      const timer = setTimeoutPriority(() => {
        virtualized.current = {
          ...virtualized.current,
          skipInfiniteScroll: false,
        };
        forceUpdate();
      }, 78);
      return () => clearTimeout(timer);
    }
  }, [loading]);

  // Observe body

  useEffect(() => {
    const bodyEl = document.querySelector(`#${bodyId}`);

    let bodyObserver: ResizeObserver;
    if (bodyEl) {
      const onBodyChange = (entries: ResizeObserverEntry[]) => {
        const entry = entries[0];
        if (entry) {
          // console.log(entry.target?.offsetHeight);
          virtualized.current = {
            ...virtualized.current,
            nextHeight: entry.contentRect.height,
          };
          forceUpdate();
        }
      };

      bodyObserver = new ResizeObserver(onBodyChange);
      bodyObserver.observe(bodyEl);

      return () => {
        bodyObserver.disconnect();
      };
    }
  }, []);

  // Intersection observers

  useVirtualizedInteractionObserver(p, virtualized, forceUpdate, false, rootId, headId);
  useVirtualizedInteractionObserver(p, virtualized, forceUpdate, true, rootId, footId);

  // Reposition whenever data changes

  useLayoutEffect(() => {
    if (virtualized.current.nextPosition) {
      const [id, pos] = virtualized.current.nextPosition;
      const el = document.getElementById(id);
      if (el) {
        el.scrollIntoView({ block: 'start', inline: 'nearest', behavior: 'instant' });
        el.scrollTop = pos;
      }
      virtualized.current.nextPosition = null;
    }
  }, [virtualized.current.data]);

  const itemHeight = layout.height / layout.size;
  const lastPos = data.length - 1;

  return (
    <div className={cn('vl_list', className)} id={rootId}>
      <div className={cn('li_body', bodyClassName)} id={bodyId}>
        <VirtualizedPlaceholder
          domId={headId}
          bodyClassName={bodyClassName}
          top
          hasMore={hasBefore}
          fetchSize={fetchSize}
          itemHeight={itemHeight}
          MockComponent={MockComponent}
        />

        {hasBefore ? null : children}

        {data.map((item: any, i: number) => <RenderItemMemo
          key={item.id}
          item={item}
          index={i}
          lastIndex={lastPos}
          renderItem={renderItem}
        />)}

        <VirtualizedPlaceholder
          domId={footId}
          hasMore={hasAfter}
          fetchSize={fetchSize}
          itemHeight={itemHeight}
          MockComponent={MockComponent}
        />
      </div>
    </div>
  );
});

VirtualizedListMemo.displayName = 'VirtualizedListMemo';

/**
 * Virtualized list; initial render with data
 */

function VirtualizedList(p: VirtualizedListProps) {
  const { refreshKey, loading, ready, fetchDataFromCache, refetch, fetchSize } = p;

  const [refreshCount, forceUpdate] = useReducer((x) => x + 1, 0);
  const virtualized = useRef({
    id: getTimeBasedUnique(),
    data: null,
    after: false,
    cursor: null,
    hasBefore: false,
    hasAfter: false,
    lastUpdatedCount: 0,
    nextPosition: null,
    skipInfiniteScroll: false,
    // beginningOfListCursor: p.data[0]?.id,
    // firstCursor: p.data[0]?.id,
    // nextHeight: 0,
    // after: null,
  });

  // Keep track of loading status to prevent "double" fetch

  useEffect(() => {
    if (loading) {
      virtualized.current = {
        ...virtualized.current,
        skipInfiniteScroll: true,
      };
      forceUpdate();
    } else {
      const timer = setTimeoutPriority(() => {
        virtualized.current = {
          ...virtualized.current,
          skipInfiniteScroll: false,
        };
        forceUpdate();
      }, 125);
      return () => clearTimeout(timer);
    }
  }, [loading]);

  // Refresh, if a change is triggered and "only" if the list is at top

  useEffect(() => {
    const updateVirtualizedListData = async () => {
      if (refreshKey && virtualized.current.data && !virtualized.current.hasBefore) {
        if (refreshKey[1]) {
          // Force refetch
          await refetch();
        }

        // Update data from cache
        const fetchedFromCache = fetchDataFromCache(null, false, fetchSize);
        if (fetchedFromCache?.data) {
          virtualized.current = {
            ...virtualized.current,
            ...fetchedFromCache,
          };
          forceUpdate();
        }
      }
    };

    updateVirtualizedListData();
  }, [
    refreshKey?.[0] +
    String(refreshKey?.[3] || '')
  ]);

  // Fetch initial data on mount

  useLayoutEffect(() => {
    if (
      ready &&
      !virtualized.current.skipInfiniteScroll &&
      !virtualized.current.data
    ) {
      const onFinish = (cacheData: any) => {
        if (cacheData?.data) {
          virtualized.current = {
            ...virtualized.current,
            ...cacheData,
          };
          forceUpdate();
        } else {
          refetch();
        }
      };

      const fetchedFromCache = fetchDataFromCache(null, false, fetchSize);
      if (fetchedFromCache?.retry) {
        const timer = setTimeoutPriority(() => onFinish(fetchedFromCache), 10);
        return () => clearTimeout(timer);
      } else {
        onFinish(fetchedFromCache);
      }
    }
  }, [ready, virtualized.current.skipInfiniteScroll]);

  if (ready && virtualized.current.data) {
    return (
      <VirtualizedListMemo
        {...p}
        refreshCount={refreshCount}
        virtualized={virtualized}
        forceUpdate={forceUpdate}
      />
    );
  }

  const { MockComponent } = p;
  if (MockComponent) {
    return (
      <div className={cn('vl_list', p.className)}>
        <div className={cn('li_body', p.bodyClassName)}>
          <MockComponent size={20} />;
        </div>
      </div>
    );
  }

  return <div />;
}

export default VirtualizedList;
