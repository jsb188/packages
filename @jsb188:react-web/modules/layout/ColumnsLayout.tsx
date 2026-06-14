import i18n from '@jsb188/app/i18n/index.ts';
import type { ServerErrorObj } from '@jsb188/app/types/app.d.ts';
import { cn } from '@jsb188/app/utils/string.ts';
import { usePopOver } from '@jsb188/react/states';
import type { POListIfaceItem } from '@jsb188/react/types/PopOver.d';
import {
  Fragment,
  memo,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type HTMLAttributes,
  type MouseEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { Icon } from '../../svgs/Icon';
import { SmartLink } from '../../ui/Button';
import { SidebarItem } from '../../ui/SidebarUI';
import { useWaitForClientRender } from '../../utils/dom';
import { TooltipButton } from '../PopOver';
import { getPointerClientRectValues } from '../popover/positioning';
import { lockColumnResizeCursor } from '../table/layout';
import { AppContentArea, ErrorMessage, ErrorMessageContainer } from './MainLayout';

const COLUMNS_LAYOUT_CONTEXT_MENU_ID = 'columns_layout_context_menu';
const COLUMNS_LAYOUT_DEFAULT_COLUMN_WIDTH = 260;
const COLUMNS_LAYOUT_MIN_COLUMN_WIDTH = 240;
const COLUMNS_LAYOUT_MAX_COLUMN_WIDTH = 420;
const COLUMNS_LAYOUT_DIVIDER_HIT_WIDTH = 12;
const COLUMNS_LAYOUT_MOCK_ROW_HEIGHT = 36;
const COLUMNS_LAYOUT_SUBMENU_INDENT_WIDTH = 24;
const COLUMNS_LAYOUT_SUBMENU_GUIDE_OFFSET = 10;
const COLUMNS_LAYOUT_REORDER_DRAG_THRESHOLD = 5;
const COLUMNS_LAYOUT_REORDER_OVERLAP_THRESHOLD = 0.35;

/**
 * Types
 */

export interface ColumnsLayoutColumnObj<T = any> {
  id: string;
  title: string;
  iconName?: string;
  // Nullish items = the column query is still loading, so mock rows render instead
  items?: T[] | null;
  initialWidth?: number;
  itemClassName?: string;
  // Item key to highlight; use this to mark the folder item whose submenu is open
  selectedItemKey?: string | number | null;
  // Nested submenu rendered below the selected folder item while open
  subColumn?: ColumnsLayoutColumnObj | null;
  getItemKey?: (item: T, index: number) => string;
  // Declarative item content used when renderItem is not supplied
  getItemTitle?: (item: T, index: number) => string;
  getItemIconName?: (item: T, index: number) => string | null | undefined;
  getItemTo?: (item: T, index: number) => string | null | undefined;
  // Folder items render a chevron affordance; open their sub column from onClickItem
  getItemIsFolder?: (item: T, index: number) => boolean;
  renderItem?: (item: T, index: number) => React.ReactNode;
  onClickItem?: (item: T, index: number) => void;
  getContextMenuOptions?: (item: T, index: number) => POListIfaceItem[];
  onClickExpand?: (columnId: string) => void;
}

interface ColumnsLayoutColumnResizeState {
  cleanupBodyStyle: () => void;
  columnId: string;
  frame: number | null;
  latestWidth?: number;
  startClientX: number;
  startWidth: number;
}

interface ColumnsLayoutColumnReorderMetric {
  columnId: string;
  columnIndex: number;
  left: number;
  width: number;
}

interface ColumnsLayoutColumnReorderState {
  cleanupBodyStyle?: () => void;
  columnId: string;
  latestClientX: number;
  latestToIndex: number;
  pointerId: number;
  startClientX: number;
  startIndex: number;
  startLeft: number;
  started: boolean;
  width: number;
}

type ColumnsLayoutColumnReorderDisplacements = Record<string, number>;

interface ColumnsLayoutColumnReorderVisualState {
  columnId: string;
  dragOffset: number;
  displacements: ColumnsLayoutColumnReorderDisplacements | null;
}

interface ColumnsLayoutProps {
  domId?: string;
  className?: string;
  columnClassName?: string;
  // Prefix for popover ids so a parent can recognize its own context menu events
  contextMenuId?: string;
  columns: ColumnsLayoutColumnObj[];
  columnOrder?: string[] | null;
  columnWidths?: Record<string, number>;
  error?: ServerErrorObj | null;
  onColumnOrderCommit?: (columnOrder: string[]) => void;
  onColumnResizeCommit?: (columnWidths: Record<string, number>) => void;
  onRefetch?: () => void;
}

/**
 * Clamp one columns layout column width to the allowed range.
 */
function clampColumnsLayoutColumnWidth(width: number) {
  return Math.min(COLUMNS_LAYOUT_MAX_COLUMN_WIDTH, Math.max(COLUMNS_LAYOUT_MIN_COLUMN_WIDTH, Math.round(width)));
}

/**
 * Return true when two columns layout width maps contain the same values.
 */
function areColumnsLayoutColumnWidthsEqual(left: Record<string, number>, right: Record<string, number>) {
  const leftKeys = Object.keys(left);
  const rightKeys = Object.keys(right);

  if (leftKeys.length !== rightKeys.length) {
    return false;
  }

  return leftKeys.every((key) => left[key] === right[key]);
}

/**
 * Return the rendered width for one columns layout column.
 */
function getColumnsLayoutColumnWidth(column: ColumnsLayoutColumnObj, columnWidths: Record<string, number>) {
  return clampColumnsLayoutColumnWidth(
    columnWidths[column.id] ?? column.initialWidth ?? COLUMNS_LAYOUT_DEFAULT_COLUMN_WIDTH,
  );
}

/**
 * Return true when two columns layout column id lists are identical.
 */
function areColumnsLayoutColumnOrdersEqual(left: string[], right: string[]) {
  return left.length === right.length && left.every((columnId, index) => columnId === right[index]);
}

/**
 * Return a complete column id order by applying saved ids before default columns.
 */
function getOrderedColumnsLayoutColumnIds(columns: ColumnsLayoutColumnObj[], columnOrder?: string[] | null) {
  const columnIds = columns.map((column) => column.id);
  const columnIdSet = new Set(columnIds);
  const seenColumnIds = new Set<string>();
  const orderedColumnIds = (columnOrder || []).reduce((acc, columnId) => {
    if (!columnIdSet.has(columnId) || seenColumnIds.has(columnId)) {
      return acc;
    }

    seenColumnIds.add(columnId);
    acc.push(columnId);
    return acc;
  }, [] as string[]);

  columnIds.forEach((columnId) => {
    if (!seenColumnIds.has(columnId)) {
      orderedColumnIds.push(columnId);
    }
  });

  return orderedColumnIds;
}

/**
 * Return columns in the requested visual order.
 */
function getOrderedColumnsLayoutColumns(columns: ColumnsLayoutColumnObj[], columnOrder?: string[] | null) {
  const columnsById = new Map(columns.map((column) => [column.id, column]));

  return getOrderedColumnsLayoutColumnIds(columns, columnOrder).reduce((acc, columnId) => {
    const column = columnsById.get(columnId);

    if (column) {
      acc.push(column);
    }

    return acc;
  }, [] as ColumnsLayoutColumnObj[]);
}

/**
 * Move one column id into a target visual index.
 */
function moveColumnsLayoutColumnOrder(columnIds: string[], columnId: string, toIndex: number) {
  const fromIndex = columnIds.indexOf(columnId);

  if (fromIndex < 0) {
    return columnIds;
  }

  const nextColumnIds = [...columnIds];
  const [columnIdToMove] = nextColumnIds.splice(fromIndex, 1);
  const safeToIndex = Math.min(nextColumnIds.length, Math.max(0, toIndex));

  nextColumnIds.splice(safeToIndex, 0, columnIdToMove);
  return nextColumnIds;
}

/**
 * Return true when two column reorder displacement maps contain the same offsets.
 */
function areColumnsLayoutColumnReorderDisplacementsEqual(
  left: ColumnsLayoutColumnReorderDisplacements | null | undefined,
  right: ColumnsLayoutColumnReorderDisplacements | null | undefined,
) {
  if (!left || !right) {
    return left === right;
  }

  const leftKeys = Object.keys(left);
  const rightKeys = Object.keys(right);

  return leftKeys.length === rightKeys.length && leftKeys.every((columnId) => left[columnId] === right[columnId]);
}

/**
 * Return rendered column header elements keyed by column id.
 */
function getColumnsLayoutColumnHeaderElementsById(rootElement: HTMLDivElement) {
  const headerCells = rootElement.querySelectorAll<HTMLElement>('[data-columns-layout-column-header]');
  const headerElementsById = new Map<string, HTMLElement>();

  headerCells.forEach((cell) => {
    const columnId = cell.dataset.columnsLayoutColumnHeader;

    if (columnId) {
      headerElementsById.set(columnId, cell);
    }
  });

  return headerElementsById;
}

/**
 * Return visible column header metrics in layout content coordinates.
 */
function getColumnsLayoutColumnReorderMetrics(rootElement: HTMLDivElement | null, columns: ColumnsLayoutColumnObj[]) {
  if (!rootElement) {
    return [];
  }

  const rootRect = rootElement.getBoundingClientRect();
  const headerElementsById = getColumnsLayoutColumnHeaderElementsById(rootElement);

  return columns.reduce((acc, column, columnIndex) => {
    const headerElement = headerElementsById.get(column.id);

    if (!headerElement) {
      return acc;
    }

    const headerRect = headerElement.getBoundingClientRect();

    acc.push({
      columnId: column.id,
      columnIndex,
      left: headerRect.left - rootRect.left,
      width: headerRect.width,
    });
    return acc;
  }, [] as ColumnsLayoutColumnReorderMetric[]);
}

/**
 * Return the horizontal rectangle for a dragged column header at one pointer position.
 */
function getColumnsLayoutColumnReorderDraggedRect(state: ColumnsLayoutColumnReorderState, clientX: number) {
  const left = state.startLeft + clientX - state.startClientX;

  return {
    left,
    right: left + state.width,
  };
}

/**
 * Return the target index represented by the current column drag pointer.
 */
function getColumnsLayoutColumnReorderTargetIndex(
  metrics: ColumnsLayoutColumnReorderMetric[],
  state: ColumnsLayoutColumnReorderState,
  clientX: number,
) {
  const draggedRect = getColumnsLayoutColumnReorderDraggedRect(state, clientX);
  const dragDelta = clientX - state.startClientX;
  let targetIndex = state.startIndex;

  if (dragDelta < 0) {
    for (let index = state.startIndex - 1; index >= 0; index -= 1) {
      const metric = metrics[index];

      if (metric && draggedRect.left < metric.left + metric.width - metric.width * COLUMNS_LAYOUT_REORDER_OVERLAP_THRESHOLD) {
        targetIndex = metric.columnIndex;
      }
    }

    return targetIndex;
  }

  if (dragDelta > 0) {
    for (let index = state.startIndex + 1; index < metrics.length; index += 1) {
      const metric = metrics[index];

      if (metric && draggedRect.right > metric.left + metric.width * COLUMNS_LAYOUT_REORDER_OVERLAP_THRESHOLD) {
        targetIndex = metric.columnIndex;
      }
    }
  }

  return targetIndex;
}

/**
 * Return transform offsets that make columns slide aside during a header drag.
 */
function getColumnsLayoutColumnReorderDisplacements(
  metrics: ColumnsLayoutColumnReorderMetric[],
  state: ColumnsLayoutColumnReorderState,
  toIndex: number,
) {
  const columnIds = metrics.map((metric) => metric.columnId);
  const nextColumnIds = moveColumnsLayoutColumnOrder(columnIds, state.columnId, toIndex);

  if (areColumnsLayoutColumnOrdersEqual(columnIds, nextColumnIds)) {
    return null;
  }

  const metricsById = new Map(metrics.map((metric) => [metric.columnId, metric]));
  const currentLefts = new Map(metrics.map((metric) => [metric.columnId, metric.left]));
  const displacements: ColumnsLayoutColumnReorderDisplacements = {};
  let nextLeft = 0;

  nextColumnIds.forEach((columnId) => {
    const metric = metricsById.get(columnId);

    if (!metric) {
      return;
    }

    const currentLeft = currentLefts.get(columnId);
    const displacement = currentLeft === undefined ? 0 : nextLeft - currentLeft;

    if (columnId !== state.columnId && displacement) {
      displacements[columnId] = displacement;
    }

    nextLeft += metric.width;
  });

  return Object.keys(displacements).length ? displacements : null;
}

/**
 * Apply global cursor styles while a column header is being reordered.
 */
function lockColumnsLayoutColumnReorderCursor() {
  const previousCursor = document.body.style.cursor;
  const previousUserSelect = document.body.style.userSelect;

  document.body.style.cursor = 'grabbing';
  document.body.style.userSelect = 'none';

  return () => {
    document.body.style.cursor = previousCursor;
    document.body.style.userSelect = previousUserSelect;
  };
}

/**
 * Return the popover id for one columns layout item context menu.
 */
export function getColumnsLayoutContextMenuId(contextMenuId: string, columnId: string, itemKey: string | number) {
  return `${contextMenuId}:${columnId}:${itemKey}`;
}

/**
 * Return the render key for one columns layout item.
 */
function getColumnsLayoutItemKey<T>(column: ColumnsLayoutColumnObj<T>, item: T, index: number) {
  return column.getItemKey ? column.getItemKey(item, index) : index;
}

/**
 * Return whether one item is the selected item in its column.
 */
function getColumnsLayoutItemIsSelected(column: ColumnsLayoutColumnObj, itemKey: string | number) {
  return column.selectedItemKey != null && String(column.selectedItemKey) === String(itemKey);
}

/**
 * Return whether one item owns the open nested submenu.
 */
function getColumnsLayoutItemHasOpenSubColumn(column: ColumnsLayoutColumnObj, itemKey: string | number) {
  return Boolean(column.subColumn && getColumnsLayoutItemIsSelected(column, itemKey));
}

/**
 * Return the number of mock rows needed to fill the current viewport height.
 */
function getColumnsLayoutMockRowCount() {
  const browserHeight = globalThis?.window?.innerHeight || 800;
  return Math.floor(browserHeight / COLUMNS_LAYOUT_MOCK_ROW_HEIGHT);
}

/**
 * Manage click-drag column resizing for the columns layout.
 */
function useColumnsLayoutResize(p: Pick<ColumnsLayoutProps, 'columnWidths' | 'onColumnResizeCommit'>) {
  const { columnWidths: savedColumnWidths, onColumnResizeCommit } = p;
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>(savedColumnWidths || {});
  const columnWidthsRef = useRef(columnWidths);
  const resizeStateRef = useRef<ColumnsLayoutColumnResizeState | null>(null);

  columnWidthsRef.current = columnWidths;

  /*
   * Sync externally saved widths unless a drag is actively controlling the local width state.
   */
  useLayoutEffect(() => {
    if (resizeStateRef.current) {
      return;
    }

    const nextColumnWidths = savedColumnWidths || {};
    columnWidthsRef.current = nextColumnWidths;
    setColumnWidths((currentColumnWidths) => (
      areColumnsLayoutColumnWidthsEqual(currentColumnWidths, nextColumnWidths) ? currentColumnWidths : nextColumnWidths
    ));
  }, [savedColumnWidths]);

  /*
   * Stop the active drag and release the body cursor lock.
   */
  const finishResize = useCallback((clientX?: number) => {
    const resizeState = resizeStateRef.current;
    if (!resizeState) {
      return;
    }

    if (resizeState.frame !== null) {
      cancelAnimationFrame(resizeState.frame);
    }

    const fallbackWidth = Number.isFinite(clientX)
      ? clampColumnsLayoutColumnWidth(resizeState.startWidth + (Number(clientX) - resizeState.startClientX))
      : resizeState.startWidth;
    const nextWidth = resizeState.latestWidth ?? fallbackWidth;
    const nextColumnWidths = {
      ...columnWidthsRef.current,
      [resizeState.columnId]: nextWidth,
    };

    resizeState.cleanupBodyStyle();
    resizeStateRef.current = null;
    columnWidthsRef.current = nextColumnWidths;
    setColumnWidths((currentColumnWidths) => (
      areColumnsLayoutColumnWidthsEqual(currentColumnWidths, nextColumnWidths) ? currentColumnWidths : nextColumnWidths
    ));

    if (nextWidth !== resizeState.startWidth) {
      onColumnResizeCommit?.(nextColumnWidths);
    }
  }, [onColumnResizeCommit]);

  const onResizePointerDown = useCallback((event: ReactPointerEvent<HTMLDivElement>, columnId: string, startWidth: number) => {
    if (event.button !== 0) {
      return;
    }

    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    resizeStateRef.current?.cleanupBodyStyle();
    resizeStateRef.current = {
      cleanupBodyStyle: lockColumnResizeCursor(),
      columnId,
      frame: null,
      startClientX: event.clientX,
      startWidth,
    };
  }, []);

  const onResizePointerMove = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    const resizeState = resizeStateRef.current;
    if (!resizeState) {
      return;
    }

    if (event.buttons !== 1) {
      finishResize();
      return;
    }

    event.preventDefault();

    const nextWidth = clampColumnsLayoutColumnWidth(resizeState.startWidth + (event.clientX - resizeState.startClientX));
    resizeState.latestWidth = nextWidth;

    if (resizeState.frame !== null) {
      cancelAnimationFrame(resizeState.frame);
    }

    resizeState.frame = requestAnimationFrame(() => {
      resizeState.frame = null;
      setColumnWidths((prev) => {
        const nextColumnWidths = prev[resizeState.columnId] === nextWidth ? prev : {
          ...prev,
          [resizeState.columnId]: nextWidth,
        };

        columnWidthsRef.current = nextColumnWidths;
        return nextColumnWidths;
      });
    });
  }, [finishResize]);

  const onResizePointerUp = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    finishResize(event.clientX);
  }, [finishResize]);

  /*
   * Make sure an interrupted drag never leaves the body cursor locked.
   */
  useEffect(() => {
    return () => {
      resizeStateRef.current?.cleanupBodyStyle();
    };
  }, []);

  return {
    columnWidths,
    onResizePointerDown,
    onResizePointerMove,
    onResizePointerUp,
  };
}

/**
 * Manage header pointer drag interactions for columns layout reordering.
 */
function useColumnsLayoutColumnReorder(p: {
  columns: ColumnsLayoutColumnObj[];
  rootRef: React.RefObject<HTMLDivElement | null>;
  onColumnOrderCommit?: (columnOrder: string[]) => void;
}) {
  const { columns, rootRef, onColumnOrderCommit } = p;
  const frameRef = useRef<number | null>(null);
  const metricsRef = useRef<ColumnsLayoutColumnReorderMetric[]>([]);
  const stateRef = useRef<ColumnsLayoutColumnReorderState | null>(null);
  const [visualState, setVisualState] = useState<ColumnsLayoutColumnReorderVisualState | null>(null);
  const canReorderColumns = Boolean(onColumnOrderCommit && columns.length > 1);

  /*
   * Schedule the visible column displacement update.
   */
  const scheduleVisualStateUpdate = useCallback(() => {
    const state = stateRef.current;
    const metrics = metricsRef.current;

    if (!state?.started || !metrics.length) {
      return;
    }

    if (frameRef.current !== null) {
      cancelAnimationFrame(frameRef.current);
    }

    frameRef.current = requestAnimationFrame(() => {
      const latestState = stateRef.current;
      const latestMetrics = metricsRef.current;

      frameRef.current = null;

      if (!latestState?.started || !latestMetrics.length) {
        return;
      }

      const nextDisplacements = getColumnsLayoutColumnReorderDisplacements(latestMetrics, latestState, latestState.latestToIndex);

      setVisualState((currentState) => {
        const stableDisplacements = areColumnsLayoutColumnReorderDisplacementsEqual(currentState?.displacements, nextDisplacements)
          ? currentState?.displacements || null
          : nextDisplacements;
        const dragOffset = latestState.latestClientX - latestState.startClientX;
        const nextState = {
          columnId: latestState.columnId,
          dragOffset,
          displacements: stableDisplacements,
        };

        if (
          currentState?.columnId === nextState.columnId &&
          currentState?.dragOffset === nextState.dragOffset &&
          currentState?.displacements === nextState.displacements
        ) {
          return currentState;
        }

        return nextState;
      });
    });
  }, []);

  /*
   * Clear any active column reorder state and visual affordances.
   */
  const clearColumnReorderState = useCallback(() => {
    if (frameRef.current !== null) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }

    stateRef.current?.cleanupBodyStyle?.();
    stateRef.current = null;
    metricsRef.current = [];
    setVisualState(null);
  }, []);

  /*
   * Finish the current column reorder interaction and commit the new order.
   */
  const finishColumnReorder = useCallback((clientX?: number) => {
    const state = stateRef.current;
    const metrics = metricsRef.current;

    if (state?.started && metrics.length) {
      const latestClientX = Number.isFinite(clientX) ? Number(clientX) : state.latestClientX;
      const toIndex = getColumnsLayoutColumnReorderTargetIndex(metrics, state, latestClientX);
      const columnIds = columns.map((column) => column.id);
      const nextColumnOrder = moveColumnsLayoutColumnOrder(columnIds, state.columnId, toIndex);

      if (!areColumnsLayoutColumnOrdersEqual(columnIds, nextColumnOrder)) {
        onColumnOrderCommit?.(nextColumnOrder);
      }
    }

    clearColumnReorderState();
  }, [clearColumnReorderState, columns, onColumnOrderCommit]);

  /*
   * Start tracking one header pointer as a potential reorder drag.
   */
  const onColumnReorderPointerDown = useCallback((
    event: ReactPointerEvent<HTMLElement>,
    column: ColumnsLayoutColumnObj,
    columnIndex: number,
  ) => {
    if (!canReorderColumns || event.button !== 0) {
      return;
    }

    const target = event.target as HTMLElement | null;
    if (target?.closest('button, a, [data-columns-layout-header-action]')) {
      return;
    }

    const metrics = getColumnsLayoutColumnReorderMetrics(rootRef.current, columns);
    const metric = metrics.find((item) => item.columnId === column.id);

    if (!metric) {
      return;
    }

    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    metricsRef.current = metrics;
    stateRef.current?.cleanupBodyStyle?.();
    stateRef.current = {
      columnId: column.id,
      latestClientX: event.clientX,
      latestToIndex: columnIndex,
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startIndex: metric.columnIndex,
      startLeft: metric.left,
      started: false,
      width: metric.width,
    };
  }, [canReorderColumns, columns, rootRef]);

  /*
   * Update the reorder target while the active pointer moves.
   */
  const onColumnReorderPointerMove = useCallback((event: ReactPointerEvent<HTMLElement>) => {
    const state = stateRef.current;
    const metrics = metricsRef.current;

    if (!state || state.pointerId !== event.pointerId) {
      return;
    }

    if (event.buttons !== 1) {
      finishColumnReorder(event.clientX);
      return;
    }

    const distance = Math.abs(event.clientX - state.startClientX);

    if (!state.started && distance < COLUMNS_LAYOUT_REORDER_DRAG_THRESHOLD) {
      return;
    }

    event.preventDefault();

    if (!state.started) {
      state.started = true;
      state.cleanupBodyStyle = lockColumnsLayoutColumnReorderCursor();
    }

    state.latestClientX = event.clientX;
    state.latestToIndex = getColumnsLayoutColumnReorderTargetIndex(metrics, state, event.clientX);
    scheduleVisualStateUpdate();
  }, [finishColumnReorder, scheduleVisualStateUpdate]);

  /*
   * Release pointer capture and commit the current reorder interaction.
   */
  const onColumnReorderPointerUp = useCallback((event: ReactPointerEvent<HTMLElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    finishColumnReorder(event.clientX);
  }, [finishColumnReorder]);

  /*
   * Cancel pointer capture and discard the current reorder interaction.
   */
  const onColumnReorderPointerCancel = useCallback((event: ReactPointerEvent<HTMLElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    clearColumnReorderState();
  }, [clearColumnReorderState]);

  /*
   * Return pointer props for a reorderable column header.
   */
  const getColumnHeaderReorderProps = useCallback((column: ColumnsLayoutColumnObj, columnIndex: number) => {
    if (!canReorderColumns) {
      return undefined;
    }

    return {
      'aria-grabbed': visualState?.columnId === column.id ? true : undefined,
      className: 'cs_grab bg_alt_hv trans_color spd_1',
      onPointerCancel: onColumnReorderPointerCancel,
      onPointerDown: (event: ReactPointerEvent<HTMLElement>) => onColumnReorderPointerDown(event, column, columnIndex),
      onPointerMove: onColumnReorderPointerMove,
      onPointerUp: onColumnReorderPointerUp,
    } satisfies HTMLAttributes<HTMLElement>;
  }, [
    canReorderColumns,
    onColumnReorderPointerCancel,
    onColumnReorderPointerDown,
    onColumnReorderPointerMove,
    onColumnReorderPointerUp,
    visualState?.columnId,
  ]);

  /*
   * Return a visual transform style for a column frame during reordering.
   */
  const getColumnFrameReorderStyle = useCallback((columnId: string) => {
    if (!visualState) {
      return undefined;
    }

    const transform = visualState.columnId === columnId
      ? `translateX(${visualState.dragOffset}px)`
      : visualState.displacements?.[columnId]
      ? `translateX(${visualState.displacements[columnId]}px)`
      : undefined;

    if (!transform && visualState.columnId !== columnId) {
      return undefined;
    }

    return {
      transform,
      transition: visualState.columnId !== columnId ? 'transform 120ms ease' : undefined,
      zIndex: visualState.columnId === columnId ? 7 : undefined,
    } satisfies CSSProperties;
  }, [visualState]);

  /*
   * Return the active dragged column frame affordance classes.
   */
  const getColumnFrameReorderClassName = useCallback((columnId: string) => (
    visualState?.columnId === columnId ? 'bd_l_1 bd_active' : undefined
  ), [visualState?.columnId]);

  useEffect(() => {
    return () => {
      clearColumnReorderState();
    };
  }, [clearColumnReorderState]);

  return {
    getColumnFrameReorderClassName,
    getColumnFrameReorderStyle,
    getColumnHeaderReorderProps,
  };
}

/**
 * Render one mock loading row.
 */
function ColumnsLayoutItemMock(p: {
  index: number;
}) {
  const { index } = p;
  const modulus = (index % 4) * 15;

  return <div
    className='h_item px_sm'
    style={{ height: COLUMNS_LAYOUT_MOCK_ROW_HEIGHT }}
  >
    <span className='mock alt min_w_20' style={{ width: `${90 - modulus}%` }}>
      ....
    </span>
  </div>;
}

/**
 * Render the client-only mock rows for one loading column.
 */
const ColumnsLayoutColumnMocks = memo(() => {
  // Mock count depends on the browser height, so wait for the client render to avoid a hydration mismatch
  const didWaitForClient = useWaitForClientRender();
  if (!didWaitForClient) {
    return null;
  }

  return <>
    {[...Array(getColumnsLayoutMockRowCount())].map((_, i) => (
      <ColumnsLayoutItemMock key={i} index={i} />
    ))}
  </>;
});

ColumnsLayoutColumnMocks.displayName = 'ColumnsLayoutColumnMocks';

/**
 * Render one column item with its own right-click context menu.
 */
const ColumnsLayoutItem = memo((p: {
  column: ColumnsLayoutColumnObj;
  contextMenuId: string;
  index: number;
  item: any;
  itemKey: string | number;
}) => {
  const { column, contextMenuId, index, item, itemKey } = p;
  const { openPopOver, popOver } = usePopOver();
  const popOverId = getColumnsLayoutContextMenuId(contextMenuId, column.id, itemKey);
  const active = popOver?.id === popOverId;
  const { getContextMenuOptions, getItemTo, onClickItem } = column;
  const itemTo = getItemTo?.(item, index) || undefined;
  const selected = getColumnsLayoutItemIsSelected(column, itemKey);
  const hasOpenSubColumn = getColumnsLayoutItemHasOpenSubColumn(column, itemKey);
  const rightIconName = column.getItemIsFolder?.(item, index)
    ? hasOpenSubColumn ? 'chevron-down' : 'chevron-right'
    : undefined;

  /*
   * Notify the parent that this item was clicked.
   */
  const onClick = useCallback(() => {
    onClickItem?.(item, index);
  }, [index, item, onClickItem]);

  /*
   * Open the item context menu at the pointer location.
   */
  const onContextMenu = useCallback((e: MouseEvent<HTMLElement>) => {
    if (!getContextMenuOptions) {
      return;
    }

    e.preventDefault();
    e.stopPropagation();

    openPopOver({
      name: 'PO_LIST',
      id: popOverId,
      animationClassName: 'anim_dropdown_top on_mount',
      position: 'bottom_left',
      offsetX: 0,
      offsetY: 0,
      rect: getPointerClientRectValues(e.clientX, e.clientY),
      variables: {
        options: getContextMenuOptions(item, index),
        shadowClassName: 'shadow_md',
      },
      zClassName: 'z8',
    });
  }, [getContextMenuOptions, index, item, openPopOver, popOverId]);

  if (column.renderItem) {
    return <SmartLink
      buttonElement='div'
      fallbackElement='div'
      to={itemTo}
      className={cn('w_f', (active || selected) && 'bg_alt', (itemTo || onClickItem) && 'bg_alt_hv link', column.itemClassName)}
      onClick={onClickItem ? onClick : undefined}
      onContextMenu={getContextMenuOptions ? onContextMenu : undefined}
      role={!itemTo && onClickItem ? 'button' : undefined}
    >
      {column.renderItem(item, index)}
    </SmartLink>;
  }

  // Same UI as the app sidebar items; folder items show a chevron as the right icon
  return <SidebarItem
    className={column.itemClassName}
    selected={active || selected}
    text={column.getItemTitle?.(item, index) || ''}
    iconName={column.getItemIconName?.(item, index) || undefined}
    rightIconName={rightIconName}
    renderButtonAsDiv
    to={itemTo}
    onClick={onClickItem ? onClick : undefined}
    onContextMenu={getContextMenuOptions ? onContextMenu : undefined}
  />;
});

ColumnsLayoutItem.displayName = 'ColumnsLayoutItem';

/**
 * Render one column's items and any open nested submenu.
 */
const ColumnsLayoutColumnItems = memo((p: {
  column: ColumnsLayoutColumnObj;
  contextMenuId: string;
}) => {
  const { column, contextMenuId } = p;
  const { items } = column;

  if (!items) {
    return <ColumnsLayoutColumnMocks />;
  }

  return <>
    {items.map((item, i) => {
      const itemKey = getColumnsLayoutItemKey(column, item, i);
      const subColumn = getColumnsLayoutItemHasOpenSubColumn(column, itemKey)
        ? column.subColumn
        : null;

      return <Fragment key={itemKey}>
        <ColumnsLayoutItem
          column={column}
          contextMenuId={contextMenuId}
          index={i}
          item={item}
          itemKey={itemKey}
        />

        {subColumn && (
          <div
            role='group'
            className='v_item w_f rel'
            style={{ paddingLeft: COLUMNS_LAYOUT_SUBMENU_INDENT_WIDTH }}
          >
            <span
              aria-hidden='true'
              className='abs bd_l_2 bd_active'
              style={{
                bottom: 0,
                left: COLUMNS_LAYOUT_SUBMENU_GUIDE_OFFSET,
                top: 0,
              }}
            />
            <ColumnsLayoutColumnItems
              column={subColumn}
              contextMenuId={contextMenuId}
            />
          </div>
        )}
      </Fragment>;
    })}
  </>;
});

ColumnsLayoutColumnItems.displayName = 'ColumnsLayoutColumnItems';

/**
 * Render one column with its title header and vertical-scrolling item list.
 */
const ColumnsLayoutColumn = memo((p: {
  className?: string;
  column: ColumnsLayoutColumnObj;
  contextMenuId: string;
  headerReorderProps?: HTMLAttributes<HTMLElement>;
  width: number;
}) => {
  const { className, column, contextMenuId, headerReorderProps, width } = p;
  const { onClickExpand } = column;
  const {
    className: headerReorderClassName,
    ...headerReorderRest
  } = headerReorderProps || {};

  /*
   * Notify the parent that this column should expand.
   */
  const onClickExpandButton = useCallback(() => {
    onClickExpand?.(column.id);
  }, [column.id, onClickExpand]);

  return <section
    className={cn('v_stretch h_f no_shrink bd_r_1 bd_lt rel bg', className)}
    style={{ width }}
  >
    <header
      {...headerReorderRest}
      className={cn('h_spread no_shrink gap_sm px_df bd_b_1 bd_lt h_toolbar', headerReorderClassName)}
      data-columns-layout-column-header={column.id}
    >
      <span className='h_item ft_medium cl_df min_w_0'>
        {column.iconName && (
          <span className='shift_up ft_sm ic_df no_shrink mr_11'>
            <Icon tryColor name={column.iconName} />
          </span>
        )}
        <span className='ellip'>
          {column.title}
        </span>
      </span>

      {onClickExpand && (
        <TooltipButton
          message={i18n.t('form.expand')}
          position='bottom'
          offsetY={5}
          className='av_xs v_center no_shrink r_xs cl_md bg_alt_hv link'
          data-columns-layout-header-action='true'
          onClick={onClickExpandButton}
        >
          <Icon name='chevron-right' />
        </TooltipButton>
      )}
    </header>

    <div className='f y_scr w_f py_sm'>
      <ColumnsLayoutColumnItems
        column={column}
        contextMenuId={contextMenuId}
      />
    </div>
  </section>;
});

ColumnsLayoutColumn.displayName = 'ColumnsLayoutColumn';

/**
 * Render one click-draggable divider that resizes the column on its left.
 */
function ColumnsLayoutDivider(p: {
  ariaLabel: string;
  columnWidth: number;
  onPointerDown: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onPointerMove: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onPointerUp: (event: ReactPointerEvent<HTMLDivElement>) => void;
}) {
  const { ariaLabel, columnWidth, onPointerDown, onPointerMove, onPointerUp } = p;

  return <div
    role='separator'
    aria-orientation='vertical'
    aria-label={ariaLabel}
    aria-valuenow={columnWidth}
    className='no_shrink h_f rel z2 hv_area h_center'
    style={{
      width: COLUMNS_LAYOUT_DIVIDER_HIT_WIDTH,
      marginLeft: -Math.ceil(COLUMNS_LAYOUT_DIVIDER_HIT_WIDTH / 2),
      marginRight: -Math.floor(COLUMNS_LAYOUT_DIVIDER_HIT_WIDTH / 2),
      cursor: 'col-resize',
      touchAction: 'none',
    }}
    onPointerDown={onPointerDown}
    onPointerMove={onPointerMove}
    onPointerUp={onPointerUp}
    onPointerCancel={onPointerUp}
  >
    <div className='w_6 h_f bg_active target op_0' aria-hidden />
  </div>;
}

/**
 * Data-agnostic column-view style layout.
 * Fills the route content area; top-level columns scroll horizontally and open sub columns render inline.
 */
function ColumnsLayout(p: ColumnsLayoutProps) {
  const {
    className,
    columnClassName,
    columns,
    columnOrder,
    columnWidths: savedColumnWidths,
    domId,
    error,
    onColumnOrderCommit,
    onColumnResizeCommit,
    onRefetch,
  } = p;
  const contextMenuId = p.contextMenuId || COLUMNS_LAYOUT_CONTEXT_MENU_ID;
  const { closePopOver } = usePopOver();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const orderedColumns = useMemo(() => getOrderedColumnsLayoutColumns(columns, columnOrder), [columnOrder, columns]);
  const {
    columnWidths,
    onResizePointerDown,
    onResizePointerMove,
    onResizePointerUp,
  } = useColumnsLayoutResize({
    columnWidths: savedColumnWidths,
    onColumnResizeCommit,
  });
  const {
    getColumnFrameReorderClassName,
    getColumnFrameReorderStyle,
    getColumnHeaderReorderProps,
  } = useColumnsLayoutColumnReorder({
    columns: orderedColumns,
    rootRef,
    onColumnOrderCommit,
  });

  /*
   * Each parent must always handle its own unmount-popover logic;
   * this module owns the context menus, so it closes them on unmount.
   */
  useEffect(() => {
    return () => {
      closePopOver();
    };
  }, []);

  if (error) {
    return <AppContentArea className={cn('hide_y', className)}>
      <ErrorMessageContainer>
        <ErrorMessage
          {...error}
          hideButtonIfNotRetriable
          onClickButton={onRefetch}
        />
      </ErrorMessageContainer>
    </AppContentArea>;
  }

  return <AppContentArea className={cn('hide_y', className)}>
    <div ref={rootRef} id={domId} className='h_left h_f w_max_content min_w_100_pc bg_fade'>
      {orderedColumns.map((column, columnIndex) => {
        const width = getColumnsLayoutColumnWidth(column, columnWidths);

        return <div
          key={column.id}
          className={cn('h_left h_f no_shrink rel', getColumnFrameReorderClassName(column.id))}
          style={getColumnFrameReorderStyle(column.id)}
        >
          <ColumnsLayoutColumn
            className={columnClassName}
            column={column}
            contextMenuId={contextMenuId}
            headerReorderProps={getColumnHeaderReorderProps(column, columnIndex)}
            width={width}
          />
          <ColumnsLayoutDivider
            ariaLabel={`Resize ${column.title}`}
            columnWidth={width}
            onPointerDown={(event) => onResizePointerDown(event, column.id, width)}
            onPointerMove={onResizePointerMove}
            onPointerUp={onResizePointerUp}
          />
        </div>;
      })}

      {orderedColumns.length > 0 && <div className='fs min_w_60 no_shrink h_f bg_fade pattern_texture rel active_bf' aria-hidden />}
    </div>
  </AppContentArea>;
}

export default ColumnsLayout;
