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
  useRef,
  useState,
  type MouseEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { Icon } from '../../svgs/Icon';
import { useWaitForClientRender } from '../../utils/dom';
import { TooltipButton } from '../PopOver';
import { getPointerClientRectValues } from '../popover/positioning';
import { lockColumnResizeCursor } from '../table/layout';
import { AppContentArea, ErrorMessage, ErrorMessageContainer } from './MainLayout';

const COLUMNS_LAYOUT_CONTEXT_MENU_ID = 'columns_layout_context_menu';
const COLUMNS_LAYOUT_DEFAULT_COLUMN_WIDTH = 260;
const COLUMNS_LAYOUT_MIN_COLUMN_WIDTH = 150;
const COLUMNS_LAYOUT_MAX_COLUMN_WIDTH = 800;
const COLUMNS_LAYOUT_DIVIDER_HIT_WIDTH = 7;
const COLUMNS_LAYOUT_MOCK_ROW_HEIGHT = 36;

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
  getItemKey?: (item: T, index: number) => string;
  renderItem: (item: T, index: number) => React.ReactNode;
  getContextMenuOptions?: (item: T, index: number) => POListIfaceItem[];
  onClickExpand?: (columnId: string) => void;
}

interface ColumnsLayoutColumnResizeState {
  cleanupBodyStyle: () => void;
  columnId: string;
  frame: number | null;
  startClientX: number;
  startWidth: number;
}

interface ColumnsLayoutProps {
  domId?: string;
  className?: string;
  columnClassName?: string;
  // Prefix for popover ids so a parent can recognize its own context menu events
  contextMenuId?: string;
  columns: ColumnsLayoutColumnObj[];
  error?: ServerErrorObj | null;
  onRefetch?: () => void;
}

/**
 * Clamp one columns layout column width to the allowed range.
 */
function clampColumnsLayoutColumnWidth(width: number) {
  return Math.min(COLUMNS_LAYOUT_MAX_COLUMN_WIDTH, Math.max(COLUMNS_LAYOUT_MIN_COLUMN_WIDTH, Math.round(width)));
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
 * Return the number of mock rows needed to fill the current viewport height.
 */
function getColumnsLayoutMockRowCount() {
  const browserHeight = globalThis?.window?.innerHeight || 800;
  return Math.floor(browserHeight / COLUMNS_LAYOUT_MOCK_ROW_HEIGHT);
}

/**
 * Manage click-drag column resizing for the columns layout.
 */
function useColumnsLayoutResize() {
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({});
  const resizeStateRef = useRef<ColumnsLayoutColumnResizeState | null>(null);

  /*
   * Stop the active drag and release the body cursor lock.
   */
  const finishResize = useCallback(() => {
    const resizeState = resizeStateRef.current;
    if (!resizeState) {
      return;
    }

    if (resizeState.frame !== null) {
      cancelAnimationFrame(resizeState.frame);
    }

    resizeState.cleanupBodyStyle();
    resizeStateRef.current = null;
  }, []);

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

    if (resizeState.frame !== null) {
      cancelAnimationFrame(resizeState.frame);
    }

    resizeState.frame = requestAnimationFrame(() => {
      resizeState.frame = null;
      setColumnWidths((prev) => (
        prev[resizeState.columnId] === nextWidth ? prev : {
          ...prev,
          [resizeState.columnId]: nextWidth,
        }
      ));
    });
  }, [finishResize]);

  const onResizePointerUp = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    finishResize();
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
  const { getContextMenuOptions } = column;

  /*
   * Open the item context menu at the pointer location.
   */
  const onContextMenu = useCallback((e: MouseEvent<Element>) => {
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

  return <div
    className={cn('w_f', active && 'bg_alt', column.itemClassName)}
    onContextMenu={getContextMenuOptions ? onContextMenu : undefined}
  >
    {column.renderItem(item, index)}
  </div>;
});

ColumnsLayoutItem.displayName = 'ColumnsLayoutItem';

/**
 * Render one column with its title header and vertical-scrolling item list.
 */
const ColumnsLayoutColumn = memo((p: {
  className?: string;
  column: ColumnsLayoutColumnObj;
  contextMenuId: string;
  width: number;
}) => {
  const { className, column, contextMenuId, width } = p;
  const { items, onClickExpand } = column;

  /*
   * Notify the parent that this column should expand.
   */
  const onClickExpandButton = useCallback(() => {
    onClickExpand?.(column.id);
  }, [column.id, onClickExpand]);

  return <section
    className={cn('v_stretch h_f no_shrink bd_r_1 bd_lt', className)}
    style={{ width }}
  >
    <header className='h_spread no_shrink gap_sm px_sm py_xs bd_b_1 bd_lt'>
      <span className='h_item gap_xs min_w_0 ft_sm'>
        {column.iconName && (
          <span className='v_center no_shrink cl_md'>
            <Icon tryColor name={column.iconName} />
          </span>
        )}
        <span className='ellip ft_medium'>
          {column.title}
        </span>
      </span>

      {onClickExpand && (
        <TooltipButton
          message={i18n.t('form.expand')}
          position='bottom'
          offsetY={5}
          className='av_xs v_center no_shrink r_xs cl_md bg_alt_hv link'
          onClick={onClickExpandButton}
        >
          <Icon name='chevron-right' />
        </TooltipButton>
      )}
    </header>

    <div className='f y_scr w_f py_xs'>
      {!items
      ? <ColumnsLayoutColumnMocks />
      : items.map((item, i) => {
        const itemKey = getColumnsLayoutItemKey(column, item, i);

        return <ColumnsLayoutItem
          key={itemKey}
          column={column}
          contextMenuId={contextMenuId}
          index={i}
          item={item}
          itemKey={itemKey}
        />;
      })}
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
    className='no_shrink h_f rel z2'
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
  />;
}

/**
 * Data-agnostic Mac Finder column-view style layout.
 * Fills the route content area; each column scrolls vertically and the layout scrolls horizontally.
 */
function ColumnsLayout(p: ColumnsLayoutProps) {
  const { className, columnClassName, columns, domId, error, onRefetch } = p;
  const contextMenuId = p.contextMenuId || COLUMNS_LAYOUT_CONTEXT_MENU_ID;
  const { closePopOver } = usePopOver();
  const {
    columnWidths,
    onResizePointerDown,
    onResizePointerMove,
    onResizePointerUp,
  } = useColumnsLayoutResize();

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
    <div id={domId} className='h_left h_f'>
      {columns.map((column) => {
        const width = columnWidths[column.id] ?? column.initialWidth ?? COLUMNS_LAYOUT_DEFAULT_COLUMN_WIDTH;

        return <Fragment key={column.id}>
          <ColumnsLayoutColumn
            className={columnClassName}
            column={column}
            contextMenuId={contextMenuId}
            width={width}
          />
          <ColumnsLayoutDivider
            ariaLabel={`Resize ${column.title}`}
            columnWidth={width}
            onPointerDown={(event) => onResizePointerDown(event, column.id, width)}
            onPointerMove={onResizePointerMove}
            onPointerUp={onResizePointerUp}
          />
        </Fragment>;
      })}
    </div>
  </AppContentArea>;
}

export default ColumnsLayout;
