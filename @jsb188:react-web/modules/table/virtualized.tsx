import { DOM_IDS } from '@jsb188/app/constants/app.ts';
import { uniq } from '@jsb188/app/utils/object.ts';
import { loadFragment } from '@jsb188/graphql/cache';
import { useCallback, useDeferredValue, useEffect, useLayoutEffect, useMemo, useReducer, useRef, useState, type RefObject } from 'react';
import { getTableRowLayoutElement } from './layout';
import type {
	CursorPositionObj,
	VirtualizedDataState,
	VirtualizedRenderWindow,
	VirtualizedState,
	VirtualizedTableBaseProps,
	VZListItemObj,
	VZReferenceObj,
} from './types';

type VirtualizedAction =
	| { type: 'SET_CURSOR_POSITION'; cursorPosition: CursorPositionObj | null }
	| { type: 'RESET_ITEMS'; itemIds: string[] | null; lastItemIdOnMount: string | null }
	| { type: 'MERGE_ITEMS'; itemIds: string[]; mergeFromLastItem: boolean; after: boolean }
	| { type: 'PREPEND_ITEMS'; itemIds: string[] }
	| { type: 'SET_END_OF_LIST_ITEM_ID'; itemId: string | null }
	| { type: 'SET_START_OF_LIST_ITEM_ID'; itemId: string | null };

/**
 * Return the id for one backing data item.
 */
function getVirtualizedItemId(p: VirtualizedTableBaseProps, item: any) {
	const getItemId = p.getItemId || ((itm: any) => itm.id);
	return getItemId(item);
}

/**
 * Merge item id lists while keeping order and uniqueness.
 */
function mergeItemIdLists(
	currentList: string[] | null,
	newItemIds: string[],
	mergeFromLastItem: boolean,
	after: boolean,
): string[] {
	const existingList = currentList || [];
	let newList;

	if (mergeFromLastItem) {
		const lastItemId = existingList[existingList.length - 1];
		const ix = newItemIds.findIndex((itemId) => itemId === lastItemId);

		if (after) {
			newList = newItemIds.slice(ix + 1);
		} else {
			newList = newItemIds.slice(0, ix);
		}
	} else {
		newList = newItemIds;
	}

	if (after) {
		return uniq([...newList, ...existingList]);
	}

	return uniq([...existingList, ...newList]);
}

/**
 * Merge backing data items into an ordered id list.
 */
function mergeItemIds(
	currentList: string[] | null,
	data: any[],
	mergeFromLastItem: boolean,
	after: boolean,
	p: VirtualizedTableBaseProps,
): string[] {
	return mergeItemIdLists(
		currentList,
		data.map((item) => getVirtualizedItemId(p, item)),
		mergeFromLastItem,
		after,
	);
}

/**
 * Reuse the render wrapper for a loaded row when its visible inputs are unchanged.
 */
function getStableVirtualizedListItem(
	cache: Map<string, VZListItemObj>,
	id: string,
	item: any,
	otherProps: Record<string, any> | undefined,
	lastItemIdOnMount: string | null,
): VZListItemObj {
	const cachedItem = cache.get(id);

	if (
		cachedItem &&
		cachedItem.item === item &&
		cachedItem.otherProps === otherProps &&
		cachedItem.lastItemIdOnMount === lastItemIdOnMount
	) {
		return cachedItem;
	}

	return {
		item,
		otherProps,
		lastItemIdOnMount,
	};
}

/**
 * Reduce render-driving virtualized table state.
 */
function virtualizedDataReducer(state: VirtualizedDataState, action: VirtualizedAction): VirtualizedDataState {
	switch (action.type) {
		case 'SET_CURSOR_POSITION':
			return {
				...state,
				cursorPosition: action.cursorPosition,
			};
		case 'RESET_ITEMS':
			return {
				cursorPosition: state.cursorPosition,
				itemIds: action.itemIds,
				startOfListItemId: null,
				endOfListItemId: undefined,
				lastItemIdOnMount: action.lastItemIdOnMount,
			};
		case 'MERGE_ITEMS':
			return {
				...state,
				itemIds: mergeItemIdLists(state.itemIds, action.itemIds, action.mergeFromLastItem, action.after),
			};
		case 'PREPEND_ITEMS':
			return {
				...state,
				itemIds: uniq([...action.itemIds, ...(state.itemIds || [])]),
			};
		case 'SET_END_OF_LIST_ITEM_ID':
			return {
				...state,
				endOfListItemId: action.itemId,
			};
		case 'SET_START_OF_LIST_ITEM_ID':
			return {
				...state,
				startOfListItemId: action.itemId,
			};
		default:
			return state;
	}
}

/**
 * Return the cursor position for scroll restoration.
 */
function getCursorPosition(
	id: string | null,
	after: boolean,
	listElement: HTMLElement | null,
	p: VirtualizedTableBaseProps,
	nextRefreshCount: number = 0,
): CursorPositionObj | null {
	if (id === null) {
		return [null, null, 0, true, Date.now()];
	}

	const rootElementQuery = p.rootElementQuery || `#${DOM_IDS.mainBodyScrollArea}`;
	const rootElement = globalThis?.document.querySelector(rootElementQuery);
	if (!rootElement || !listElement) {
		return null;
	}

	const rootTop = rootElement.getBoundingClientRect().top;

	for (let i = 0; i < listElement.children.length; i++) {
		const msgEl = listElement.children.item(i);
		const layoutElement = getTableRowLayoutElement(msgEl);
		const rect = layoutElement?.getBoundingClientRect();
		const itemDomId = msgEl?.id;

		if (rect && rect.top >= 0 && itemDomId) {
			return [id, itemDomId, rect.top + rootTop, after, nextRefreshCount];
		}
	}

	return [id, null, 0, after, nextRefreshCount];
}

/**
 * Scroll the route table list to the top.
 */
function scrollToTop(rootElementQuery_: string, instant = false) {
	const rootElementQuery = rootElementQuery_ || `#${DOM_IDS.mainBodyScrollArea}`;

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
				rootElement.scrollTo({ top: 0, behavior: 'smooth' });
			}
		});
	};

	doScroll();

	setTimeout(() => {
		const rootElement = globalThis?.document.querySelector(rootElementQuery);
		const currentViewHeight = rootElement?.clientHeight || 0;
		const currentScrollPos = (rootElement?.scrollHeight || 0) - (rootElement?.scrollTop || 0) - currentViewHeight;
		const retryThreshold = Math.min(currentViewHeight * .78, 780);

		if (currentScrollPos > retryThreshold) {
			doScroll();
		}
	}, 550);
}

/**
 * Return whether the target element is the first rendered list item element.
 */
function isFirstListItemElement(
	itemElement: HTMLElement,
	listElement: HTMLElement,
): boolean {
	const firstListItemElement = Array.from(listElement.children).find((child) => {
		return !!child.id;
	});

	return firstListItemElement === itemElement;
}

/**
 * Reposition the route table list to a remembered DOM row.
 */
function repositionList(
	cursorPosition: CursorPositionObj,
	listElement: HTMLElement | null,
	p: VirtualizedTableBaseProps,
	backupScrollRef?: RefObject<HTMLDivElement | null>,
) {
	const rootElementQuery = p.rootElementQuery || `#${DOM_IDS.mainBodyScrollArea}`;
	const [id, itemDomId, topOffset] = cursorPosition;
	const rootElement = globalThis?.document.querySelector(rootElementQuery);
	if (!id || !rootElement || !listElement) {
		return;
	}

	const itemElement = itemDomId ? globalThis?.document.getElementById(itemDomId) : listElement;
	if (!itemElement) {
		console.error('Item not found in DOM during Virtualized table repositioning:', cursorPosition[0]);
		return;
	}

	globalThis?.requestAnimationFrame(() => {
		if (!itemDomId) {
			const backupScrollEl = backupScrollRef?.current;
			if (backupScrollEl) {
				rootElement.scrollTo({ top: rootElement.scrollHeight - (backupScrollEl.clientHeight || 0) * 2, behavior: 'instant' });
			}

			return;
		}

		if (isFirstListItemElement(itemElement, listElement)) {
			return;
		}

		const layoutElement = getTableRowLayoutElement(itemElement) || itemElement;

		layoutElement.scrollIntoView({ block: 'start', inline: 'nearest', behavior: 'instant' });
		layoutElement.scrollTop = topOffset;
	});
}

/**
 * Track virtualized table item ids and the visible render window.
 */
export function useVirtualizedState(p: VirtualizedTableBaseProps): VirtualizedState {
	const { disableInfiniteScroll, otherProps, fragmentName, limit, loading, maxFetchLimit } = p;
	const [state, dispatch] = useReducer(virtualizedDataReducer, {
		cursorPosition: null,
		itemIds: null,
		startOfListItemId: null,
		endOfListItemId: undefined,
		lastItemIdOnMount: null,
	});
	const referenceObj = useRef<VZReferenceObj>({ loading, fetchingTop: false, fetchingBottom: false, blockedTopCursor: null, blockedBottomCursor: null, mounted: true, topCursor: null, bottomCursor: null });
	const listItemCacheRef = useRef<Map<string, VZListItemObj>>(new Map());
	const { cursorPosition, itemIds } = state;

	const listData = useMemo(() => {
		if (itemIds && limit > 0) {
			const size = limit * 2;
			let viewing: string[];

			if (cursorPosition === null || cursorPosition[0] === null) {
				viewing = itemIds.slice(0, size);
			} else {
				let cursorIndex = itemIds.indexOf(cursorPosition[0]);
				if (cursorIndex === -1) {
					console.error('Cursor ID not found in itemIds[]:', cursorPosition[0]);
					return null;
				} else if (!cursorPosition[3]) {
					cursorIndex++;
				}

				const start = Math.max(0, cursorIndex - size);
				const end = Math.min(itemIds.length, cursorIndex + size);
				viewing = itemIds.slice(start, end);
			}

			const nextListItemCache = new Map<string, VZListItemObj>();
			const listItems = viewing.map((id) => {
				const item = loadFragment(`${fragmentName}:${id}`);
				if (!item) {
					console.dev('Error in [Table.tsx]; item not found in cache:', 'warning', `${fragmentName}:${id}`);
					return null;
				}

				const listItem = getStableVirtualizedListItem(
					listItemCacheRef.current,
					id,
					item,
					otherProps,
					state.lastItemIdOnMount,
				);

				nextListItemCache.set(id, listItem);
				return listItem;
			}).filter(Boolean) as VZListItemObj[];

			listItemCacheRef.current = nextListItemCache;
			return listItems;
		} else if (limit <= 0) {
			console.warn('VirtualizedTable: limit is set to 0 or negative, which means no items will be rendered. Set a positive limit to render items.');
		}

		return null;
	}, [itemIds, cursorPosition?.[0], cursorPosition?.[4], fragmentName, limit, otherProps, state.lastItemIdOnMount]);

	const nextEndOfListItemId = state.endOfListItemId === undefined && listData
		? listData.length > limit * 2 ? listData[limit - 1]?.item?.id : null
		: state.endOfListItemId;

	useEffect(() => {
		if (state.endOfListItemId === undefined && nextEndOfListItemId !== undefined) {
			dispatch({ type: 'SET_END_OF_LIST_ITEM_ID', itemId: nextEndOfListItemId });
		}
	}, [nextEndOfListItemId, state.endOfListItemId]);

	useEffect(() => {
		const top = listData?.[0]?.item;
		const bottom = listData?.[listData.length - 1]?.item;

		referenceObj.current = {
			...referenceObj.current,
			loading,
			topCursor: top ? [top.id, top.cursor] : null,
			bottomCursor: bottom ? [bottom.id, bottom.cursor] : null,
		};
	}, [loading, listData]);

	useEffect(() => {
		referenceObj.current.mounted = true;

		return () => {
			referenceObj.current.mounted = false;
		};
	}, []);

	const isTopOfList = state.startOfListItemId ? state.startOfListItemId === listData?.[0]?.item?.id : false;
	const hasMoreTop = !disableInfiniteScroll && !!cursorPosition?.[0] && !!itemIds && !!listData && limit <= itemIds.length && itemIds[0] !== listData[0]?.item?.id;

	let hasMoreBottom;
	if (!disableInfiniteScroll && listData && !isTopOfList) {
		if (nextEndOfListItemId) {
			hasMoreBottom = (!maxFetchLimit || maxFetchLimit >= itemIds!?.length) ? !listData.some(d => d.item.id === nextEndOfListItemId) : false;
		} else {
			hasMoreBottom = (!maxFetchLimit || maxFetchLimit >= itemIds!?.length) ? limit <= listData.length : false;
		}
	} else {
		hasMoreBottom = false;
	}

	const setCursorPosition = useCallback((cursor: CursorPositionObj | null) => {
		dispatch({ type: 'SET_CURSOR_POSITION', cursorPosition: cursor });
	}, []);

	const resetVirtualizedItems = useCallback((items: any[] | null) => {
		const itemIds = items?.length ? mergeItemIds(null, items, false, true, p) : null;
		const lastItemIdOnMount = items?.length ? getVirtualizedItemId(p, items[items.length - 1]) : null;
		dispatch({ type: 'RESET_ITEMS', itemIds, lastItemIdOnMount });
	}, [p.getItemId]);

	const mergeStartOfListItems = useCallback((items: any[], mergeFromLastItem: boolean) => {
		dispatch({
			type: 'MERGE_ITEMS',
			itemIds: items.map((item) => getVirtualizedItemId(p, item)),
			mergeFromLastItem,
			after: true,
		});
	}, [p.getItemId]);

	const prependMissingStartItems = useCallback((items: any[]) => {
		const itemIds = items.map((item) => getVirtualizedItemId(p, item));
		dispatch({ type: 'PREPEND_ITEMS', itemIds });
	}, [p.getItemId]);

	const mergeFetchedItems = useCallback((items: any[], after: boolean) => {
		dispatch({
			type: 'MERGE_ITEMS',
			itemIds: items.map((item) => getVirtualizedItemId(p, item)),
			mergeFromLastItem: false,
			after,
		});
	}, [p.getItemId]);

	const setEndOfListItemId = useCallback((itemId: string | null) => {
		dispatch({ type: 'SET_END_OF_LIST_ITEM_ID', itemId });
	}, []);

	const setStartOfListItemId = useCallback((itemId: string | null) => {
		dispatch({ type: 'SET_START_OF_LIST_ITEM_ID', itemId });
	}, []);

	return {
		...state,
		endOfListItemId: nextEndOfListItemId,
		setCursorPosition,
		resetVirtualizedItems,
		mergeStartOfListItems,
		prependMissingStartItems,
		mergeFetchedItems,
		setEndOfListItemId,
		setStartOfListItemId,
		listData,
		hasMoreTop,
		hasMoreBottom,
		referenceObj,
	};
}

/**
 * Keep the last committed row window visible while React prepares a heavier next window.
 */
export function useVirtualizedRenderWindow(
	listData: VZListItemObj[] | null,
	skipDeferredRender = false,
): VirtualizedRenderWindow {
	const deferredListData = useDeferredValue(listData);
	const renderListData = skipDeferredRender ? listData : deferredListData;

	return {
		listData: renderListData,
		renderIsDeferred: !skipDeferredRender && !!listData && deferredListData !== listData,
	};
}

/**
 * Reposition the route table DOM and observe top/bottom sentinels for fetching.
 */
export function useVirtualizedDOM(p: VirtualizedTableBaseProps, vzState: VirtualizedState, renderIsDeferred = false) {
	const {
		listData,
		hasMoreTop,
		hasMoreBottom,
		cursorPosition,
		itemIds,
		setCursorPosition,
		resetVirtualizedItems,
		mergeStartOfListItems,
		prependMissingStartItems,
		mergeFetchedItems,
		setEndOfListItemId,
		setStartOfListItemId,
		referenceObj,
	} = vzState;
	const { refreshKey, resetKey, limit, fetchMore, openModalPopUp } = p;
	const rootElementQuery = p.rootElementQuery || `#${DOM_IDS.mainBodyScrollArea}`;
	const listRef = useRef<HTMLElement | null>(null);
	const topRef = useRef<HTMLDivElement | null>(null);
	const bottomRef = useRef<HTMLDivElement | null>(null);
	const [startOfListItems, setStartOfListItems] = useState<any[] | undefined | null>(p.startOfListItems || null);
	const eolLen = startOfListItems?.length;

	useLayoutEffect(() => {
		if (typeof resetKey === 'undefined') {
			return;
		}

		const nextStartOfListItems = p.startOfListItems || null;
		setStartOfListItems(nextStartOfListItems);
		referenceObj.current.fetchingTop = false;
		referenceObj.current.fetchingBottom = false;
		referenceObj.current.blockedTopCursor = null;
		referenceObj.current.blockedBottomCursor = null;
		referenceObj.current.topCursor = null;
		referenceObj.current.bottomCursor = null;
		resetVirtualizedItems(nextStartOfListItems);
		setCursorPosition(getCursorPosition(null, true, listRef.current, p));
	}, [resetKey]);

	useEffect(() => {
		if (!startOfListItems && p.startOfListItems) {
			setStartOfListItems(p.startOfListItems);
		}
	}, [p.startOfListItems]);

	const fetchMoreList = useCallback(async(after: boolean) => {
		if (!fetchMore || referenceObj.current.loading) {
			return;
		}

		const fetchingKey = after ? 'fetchingTop' : 'fetchingBottom';
		const blockedCursorKey = after ? 'blockedTopCursor' : 'blockedBottomCursor';
		if (referenceObj.current[fetchingKey]) {
			return;
		}

		const position = after ? referenceObj.current.topCursor : referenceObj.current.bottomCursor;
		const canFetch = after ? hasMoreTop : hasMoreBottom;

		if (!position || !canFetch) {
			return;
		}

		if (referenceObj.current[blockedCursorKey] === position[1]) {
			return;
		}

		const ix = itemIds?.indexOf(position[0]);
		if (typeof ix === 'number' && ix >= 0) {
			const listLen = itemIds!.length;
			if (after && (ix - limit) >= limit) {
				console.dev('REPOSITION AFTER', ix, limit, listLen);
				setCursorPosition(getCursorPosition(position[0], after, listRef.current, p));
				return;
			} else if (!after && (ix + limit) < listLen) {
				console.dev('REPOSITION BEFORE', ix, limit, listLen);
				setCursorPosition(getCursorPosition(position[0], after, listRef.current, p));
				return;
			}
		}

		referenceObj.current[fetchingKey] = true;

		try {
			const { data, error } = await fetchMore(after, position[1], limit);

			if (referenceObj.current.mounted) {
				console.dev(`FETCHED: ${limit} ${after ? 'ABOVE' : 'BELOW'} ${position[1] || 'no cursor'}`, 'em', {
					count: Array.isArray(data) ? data.length : 0,
					cursor: position[1],
				});

				if (Array.isArray(data)) {
					if (!after && limit > data.length) {
						const nextEndOfListItemId = data[data.length - 1]?.id || itemIds?.[itemIds.length - 1] || listData?.[listData.length - 1]?.item?.id;

						if (nextEndOfListItemId) {
							setEndOfListItemId(nextEndOfListItemId);
						}
					}

					if (data.length) {
						const currentItemIds = itemIds || [];
						const hasNewItems = data.some((item) => !currentItemIds.includes(getVirtualizedItemId(p, item)));

						if (!hasNewItems) {
							referenceObj.current[blockedCursorKey] = position[1];
							if (after) {
								setStartOfListItemId(currentItemIds[0] || position[0]);
							} else {
								setEndOfListItemId(currentItemIds[currentItemIds.length - 1] || position[0]);
							}
							return;
						}

						referenceObj.current[blockedCursorKey] = null;
						mergeFetchedItems(data, after);
						if (data.length < limit) {
							const nextItemIds = mergeItemIds(itemIds, data, false, after, p);
							if (after) {
								setStartOfListItemId(nextItemIds[0]);
							} else {
								setEndOfListItemId(nextItemIds[nextItemIds.length - 1]);
							}
						}

						console.dev('REPOSITION ON FETCH');
						setCursorPosition(getCursorPosition(position[0], after, listRef.current, p));
					} else {
						referenceObj.current[blockedCursorKey] = position[1];
						if (after) {
							setStartOfListItemId(itemIds?.[0] || position[0]);
						} else {
							setEndOfListItemId(itemIds?.[itemIds.length - 1] || position[0]);
						}
					}
				}

				if (error) {
					openModalPopUp(null, error);
				}
			}
		} finally {
			referenceObj.current[fetchingKey] = false;
		}
	}, [fetchMore, referenceObj, hasMoreTop, hasMoreBottom, itemIds, limit, setCursorPosition, p.getItemId, p.rootElementQuery, openModalPopUp, listData, mergeFetchedItems, setEndOfListItemId, setStartOfListItemId]);

	useLayoutEffect(() => {
		if (listData) {
			console.dev('SCROLLING TO TOP (1)', 'em');
			scrollToTop(rootElementQuery, true);
		}
	}, [!!listData, rootElementQuery]);

	useLayoutEffect(() => {
		if (eolLen) {
			mergeStartOfListItems(startOfListItems, Boolean(listData));
			setCursorPosition(getCursorPosition(null, true, listRef.current, p));
		}
	}, [eolLen, rootElementQuery]);

	useLayoutEffect(() => {
		if (itemIds && p.startOfListItems && refreshKey) {
			const notIncludedItems = p.startOfListItems.filter((item) => {
				const itemId = getVirtualizedItemId(p, item);
				return !itemIds.includes(itemId);
			});

			if (notIncludedItems.length) {
				prependMissingStartItems(notIncludedItems);
				setCursorPosition(getCursorPosition(null, true, listRef.current, p));
			}
		}
	}, [refreshKey]);

	useLayoutEffect(() => {
		if (renderIsDeferred) {
			return;
		}

		if (cursorPosition?.[0] && listData) {
			const [cPosId, cDomId,, cAfter, cRefresh] = cursorPosition;
			if (cDomId) {
				repositionList(cursorPosition, listRef.current, p);
			} else {
				console.dev(`cursorPosition?.[1] is null, for id "${cPosId}"`, 'em');

				if (cPosId && cRefresh === 0) {
					setCursorPosition(getCursorPosition(cPosId, cAfter, listRef.current, p, 1));
				} else if (cPosId && cRefresh === 1) {
					const timer = setTimeout(() => {
						repositionList(cursorPosition, listRef.current, p, cAfter ? topRef : bottomRef);
					}, 750);

					return () => {
						clearTimeout(timer);
					};
				}
			}
		}
	}, [cursorPosition?.[0], cursorPosition?.[1], cursorPosition?.[4], cursorPosition?.[4] !== 1, renderIsDeferred]);

	useEffect(() => {
		const rootElement = globalThis?.document.querySelector(rootElementQuery);

		if (rootElement && (hasMoreTop || hasMoreBottom) && topRef.current && bottomRef.current) {
			const intersectionMargin = Math.max(rootElement.clientHeight * .7, 780);
			const observer = new IntersectionObserver((entries) => {
				entries.forEach(entry => {
					if (entry.isIntersecting) {
						const before = entry.target === bottomRef.current;
						const after = entry.target === topRef.current;

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
				threshold: 0,
			});

			observer.observe(topRef.current);
			observer.observe(bottomRef.current);

			return () => {
				observer.disconnect();
			};
		}
	}, [fetchMoreList, hasMoreTop, hasMoreBottom, rootElementQuery]);

	return [listRef, topRef, bottomRef] as const;
}
